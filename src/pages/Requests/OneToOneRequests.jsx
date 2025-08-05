import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/App';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  updateDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { db } from '@/config/firebase';

const OneToOneRequests = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const [userProfiles, setUserProfiles] = useState({}); // Cache for user profiles

  // Determine filter from URL
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/pending')) setFilter('pending');
    else if (path.includes('/accepted')) setFilter('accepted');
    else if (path.includes('/archived')) setFilter('archived');
    else setFilter('all');
  }, [location.pathname]);

  // Load user profiles for request creators
  const loadUserProfile = async (userId) => {
    if (userProfiles[userId]) return userProfiles[userId];

    try {
      // Try userProfiles collection first (public data)
      const publicProfileQuery = query(
        collection(db, 'userProfiles'),
        where('uid', '==', userId)
      );
      const publicSnapshot = await getDocs(publicProfileQuery);

      let profile = null;
      if (!publicSnapshot.empty) {
        profile = { id: publicSnapshot.docs[0].id, ...publicSnapshot.docs[0].data() };
      } else {
        // Fallback to users collection
        const usersQuery = query(
          collection(db, 'users'),
          where('uid', '==', userId)
        );
        const usersSnapshot = await getDocs(usersQuery);

        if (!usersSnapshot.empty) {
          const userData = usersSnapshot.docs[0].data();
          profile = {
            id: usersSnapshot.docs[0].id,
            displayName: userData.displayName || userData.name || 'User',
            avatar: userData.avatar || userData.photoURL || `https://ui-avatars.com/api/?name=${userData.email}&background=3b82f6&color=fff`,
            bio: userData.bio || 'No bio available',
            role: userData.role || 'Student',
            rating: userData.stats?.averageRating || 4.5,
            completedSessions: userData.stats?.completedSessions || 0
          };
        }
      }

      if (profile) {
        setUserProfiles(prev => ({ ...prev, [userId]: profile }));
        return profile;
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }

    // Return default profile if loading fails
    const defaultProfile = {
      displayName: 'User',
      avatar: `https://ui-avatars.com/api/?name=User&background=3b82f6&color=fff`,
      bio: 'No bio available',
      role: 'Student',
      rating: 4.5,
      completedSessions: 0
    };
    setUserProfiles(prev => ({ ...prev, [userId]: defaultProfile }));
    return defaultProfile;
  };

  // Load requests from Firestore
  useEffect(() => {
    if (!user?.id) return;

    const fetchRequests = async () => {
      try {
        setLoading(true);

        // Get all requests from other users that are open/pending
        const requestsRef = collection(db, 'requests');
        const requestsQuery = query(
          requestsRef,
          where('userId', '!=', user.id),
          where('status', 'in', ['open', 'pending', 'active']),
          orderBy('createdAt', 'desc')
        );

        // Real-time listener for requests
        const unsubscribe = onSnapshot(requestsQuery, async (snapshot) => {
          const fetchedRequests = [];

          for (const docSnap of snapshot.docs) {
            const requestData = {
              id: docSnap.id,
              ...docSnap.data(),
              createdAt: docSnap.data().createdAt?.toDate() || new Date()
            };

            // Load user profile for the request creator
            const profile = await loadUserProfile(requestData.userId);

            // Transform data to match component expectations
            const transformedRequest = {
              id: requestData.id,
              name: profile.displayName,
              avatar: profile.avatar,
              title: requestData.topic || requestData.title,
              message: requestData.description,
              rate: requestData.paymentAmount ? `Rs.${requestData.paymentAmount}/session` : null,
              time: formatTimeAgo(requestData.createdAt),
              status: requestData.status === 'open' ? 'pending' : requestData.status,
              category: requestData.status === 'open' ? 'pending' : requestData.status,
              subject: requestData.subject,
              scheduledDate: requestData.preferredDate,
              scheduledTime: requestData.preferredTime,
              duration: `${requestData.duration || 60} minutes`,
              tags: requestData.tags || [],
              createdAt: requestData.createdAt,
              originalData: requestData,
              profile: {
                username: `@${profile.displayName?.toLowerCase().replace(/\s+/g, '_')}`,
                role: profile.role,
                bio: profile.bio,
                company: profile.company || 'Student',
                rating: profile.rating,
                completedSessions: profile.completedSessions
              }
            };

            fetchedRequests.push(transformedRequest);
          }

          setRequests(fetchedRequests);
          if (fetchedRequests.length > 0 && !selected) {
            setSelected(fetchedRequests[0]);
          }
          setLoading(false);
        }, (error) => {
          console.error('Error fetching requests:', error);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error setting up requests listener:', error);
        setLoading(false);
      }
    };

    fetchRequests();
  }, [user, selected]);

  // Filter requests based on current filter
  const filteredRequests = requests.filter(req => {
    if (filter === 'all') return true;
    return req.category === filter || req.status === filter;
  });

  // Update selected request when filter changes
  useEffect(() => {
    if (!filteredRequests.find(req => req.id === selected?.id) && filteredRequests.length > 0) {
      setSelected(filteredRequests[0]);
    }
  }, [filter, filteredRequests, selected?.id]);

  // Handle status change for requests
  const handleStatusChange = async (requestId, newStatus) => {
    try {
      // Create a response/application record
      const responseData = {
        requestId,
        responderId: user.id,
        responderName: user.displayName || user.name,
        responderEmail: user.email,
        status: newStatus,
        createdAt: serverTimestamp(),
        message: newStatus === 'accepted' ? 'Request accepted' : 'Request declined'
      };

      // Add response to requestResponses collection
      await addDoc(collection(db, 'requestResponses'), responseData);

      // Update local state
      setRequests(prev => prev.map(req =>
        req.id === requestId ? { ...req, status: newStatus, category: newStatus } : req
      ));

      // Update selected request if it's the one being changed
      if (selected?.id === requestId) {
        setSelected({ ...selected, status: newStatus, category: newStatus });
      }

      // Show success message
      const messages = {
        accepted: 'Request accepted successfully! The requester will be notified.',
        archived: 'Request archived successfully!',
        declined: 'Request declined successfully!'
      };
      alert(messages[newStatus] || 'Status updated successfully!');

    } catch (error) {
      console.error('Error updating request status:', error);
      alert('Failed to update request status. Please try again.');
    }
  };

  // Get page title and subtitle based on filter
  const getPageTitle = () => {
    switch (filter) {
      case 'pending': return 'Pending Offers';
      case 'accepted': return 'Accepted Requests';
      case 'archived': return 'Archived Requests';
      default: return 'All Received Requests';
    }
  };

  const getPageSubtitle = () => {
    switch (filter) {
      case 'pending': return 'Requests waiting for your response';
      case 'accepted': return 'Requests you have accepted';
      case 'archived': return 'Completed and archived requests';
      default: return 'Browse and manage requests from other users';
    }
  };

  // Render action buttons based on request status
  const renderActionButtons = (request) => {
    switch (request.status) {
      case 'pending':
        return (
          <div className="flex gap-2 mt-4">
            <button
              className="bg-red-100 text-red-700 rounded px-4 py-2 font-medium text-sm hover:bg-red-200 transition-colors"
              onClick={() => handleStatusChange(request.id, 'declined')}
            >
              Decline
            </button>
            <button
              className="bg-green-600 text-white rounded px-4 py-2 font-medium text-sm hover:bg-green-700 transition-colors"
              onClick={() => handleStatusChange(request.id, 'accepted')}
            >
              Accept
            </button>
          </div>
        );
      case 'accepted':
        return (
          <div className="bg-green-50 text-green-700 rounded px-4 py-2 text-sm text-center mt-4 flex items-center justify-center gap-2">
            <span>✅</span>
            <span>Request Accepted</span>
          </div>
        );
      case 'archived':
      case 'declined':
        return (
          <div className="bg-gray-50 text-gray-600 rounded px-4 py-2 text-sm text-center mt-4 flex items-center justify-center gap-2">
            <span>📁</span>
            <span>Archived Request</span>
          </div>
        );
      default:
        return (
          <div className="flex gap-2 mt-4">
            <button
              className="bg-gray-100 rounded px-4 py-2 text-gray-700 font-medium text-sm hover:bg-gray-200 transition-colors"
              onClick={() => handleStatusChange(request.id, 'declined')}
            >
              Not Interested
            </button>
            <button
              className="bg-blue-600 text-white rounded px-4 py-2 font-medium text-sm hover:bg-blue-700 transition-colors"
              onClick={() => handleStatusChange(request.id, 'accepted')}
            >
              Accept Offer
            </button>
          </div>
        );
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const badgeClasses = {
      pending: 'bg-yellow-100 text-yellow-700',
      accepted: 'bg-green-100 text-green-700',
      archived: 'bg-gray-100 text-gray-700',
      declined: 'bg-red-100 text-red-700',
      active: 'bg-blue-100 text-blue-700'
    };

    const labels = {
      pending: 'Pending',
      accepted: 'Accepted',
      archived: 'Archived',
      declined: 'Declined',
      active: 'New'
    };

    return (
      <span className={`text-xs px-2 py-0.5 rounded font-medium ${badgeClasses[status] || badgeClasses.active}`}>
        {labels[status] || status}
      </span>
    );
  };

  // Format time ago
  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading requests...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{getPageTitle()}</h1>
        <p className="text-gray-600">{getPageSubtitle()}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-blue-500">
          <div className="text-lg font-bold text-blue-600">{requests.length}</div>
          <div className="text-gray-500 text-sm">Total Requests</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-yellow-500">
          <div className="text-lg font-bold text-yellow-600">
            {requests.filter(r => r.status === 'pending').length}
          </div>
          <div className="text-gray-500 text-sm">Pending</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-green-500">
          <div className="text-lg font-bold text-green-600">
            {requests.filter(r => r.status === 'accepted').length}
          </div>
          <div className="text-gray-500 text-sm">Accepted</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-gray-500">
          <div className="text-lg font-bold text-gray-600">
            {requests.filter(r => r.status === 'archived' || r.status === 'declined').length}
          </div>
          <div className="text-gray-500 text-sm">Archived</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Request Feed */}
        <section className="flex-1 bg-white rounded-lg shadow-sm p-6 min-h-[600px]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-xl">
              {getPageTitle()} ({filteredRequests.length})
            </h2>
            <div className="flex gap-2">
              <select className="border border-gray-200 rounded-lg px-3 py-1 text-sm">
                <option>Sort by: Recent</option>
                <option>Sort by: Payment</option>
                <option>Sort by: Subject</option>
              </select>
            </div>
          </div>

          {filteredRequests.length > 0 ? (
            <div className="flex flex-col gap-2">
              {filteredRequests.map((req) => (
                <div
                  key={req.id}
                  className={`flex items-start gap-3 p-3 rounded cursor-pointer border transition-colors ${
                    selected?.id === req.id 
                      ? 'border-blue-400 bg-blue-50' 
                      : 'border-transparent hover:bg-gray-50'
                  }`}
                  onClick={() => setSelected(req)}
                >
                  <img src={req.avatar} alt={req.name} className="w-10 h-10 rounded-full object-cover" />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{req.name}</div>
                    <div className="text-gray-500 text-sm">{req.title}</div>
                    <div className="text-gray-500 text-xs truncate max-w-xs">{req.message}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400">📚 {req.subject}</span>
                      <span className="text-xs text-gray-400">⏰ {req.duration}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-gray-400">{req.time}</span>
                    {req.rate && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-medium">
                        {req.rate}
                      </span>
                    )}
                    {getStatusBadge(req.status)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">📝</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No {filter !== 'all' ? filter : ''} requests found
              </h3>
              <p className="text-gray-500">
                {filter === 'all'
                  ? "No requests from other users available at the moment."
                  : `No requests in the ${filter} category.`
                }
              </p>
            </div>
          )}
        </section>

        {/* Request Details */}
        {selected && (
          <aside className="w-[400px] bg-white rounded-lg shadow-sm p-6 border border-gray-200 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <img src={selected.avatar} alt={selected.name} className="w-14 h-14 rounded-full object-cover" />
              <div className="flex-1">
                <div className="font-bold text-lg">{selected.name}</div>
                <div className="text-gray-500 text-sm">{selected.profile?.role || 'Student'}</div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>⭐ {selected.profile?.rating || '4.5'}</span>
                  <span>•</span>
                  <span>{selected.profile?.completedSessions || '0'} sessions</span>
                </div>
                <div className="text-blue-600 text-xs font-medium cursor-pointer hover:underline">
                  View Full Profile
                </div>
              </div>
            </div>

            {/* Request Details */}
            <div className="border-t border-gray-100 pt-4">
              <div className="font-semibold text-gray-900 mb-2">{selected.title}</div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-600">📚 Subject:</span>
                  <span className="text-gray-700">{selected.subject}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-600">📅 Date:</span>
                  <span className="text-gray-700">{selected.scheduledDate || 'Not specified'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-600">⏰ Time:</span>
                  <span className="text-gray-700">{selected.scheduledTime || 'Not specified'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-600">⏱️ Duration:</span>
                  <span className="text-gray-700">{selected.duration}</span>
                </div>
                {selected.rate && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-600">💰 Payment:</span>
                    <span className="text-green-600 font-semibold">{selected.rate}</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {selected.tags && selected.tags.length > 0 && (
                <div className="mb-4">
                  <span className="font-medium text-gray-600 text-sm block mb-2">Tags:</span>
                  <div className="flex flex-wrap gap-1">
                    {selected.tags.map((tag, index) => (
                      <span key={index} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Message */}
              <div className="mb-4">
                <span className="font-medium text-gray-600 text-sm block mb-2">Description:</span>
                <div className="text-gray-700 text-sm bg-gray-50 rounded p-3 border whitespace-pre-line">
                  {selected.message}
                </div>
              </div>

              {/* User Profile Info */}
              {selected.profile && (
                <div className="bg-blue-50 rounded-lg p-3 mb-4">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900 mb-1">About {selected.name}</div>
                    <div className="text-gray-600 text-xs mb-2">{selected.profile.bio}</div>
                    {selected.profile.company && (
                      <div className="text-xs text-gray-500">
                        🏢 {selected.profile.company}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {renderActionButtons(selected)}

              {/* Report Option */}
              <div className="text-gray-400 text-xs mt-4 cursor-pointer hover:text-red-500 transition-colors text-center border-t border-gray-100 pt-4">
                🚩 Report Request
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default OneToOneRequests;
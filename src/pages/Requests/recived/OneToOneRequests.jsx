import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import databaseService from '@/services/databaseService';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '@/config/firebase';

// Add CSS for line-clamp utility
const lineClampStyles = `
  .line-clamp-1 {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
  }
  .line-clamp-2 {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
`;

const OneToOneRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [userProfiles, setUserProfiles] = useState({});
  const [responseLoading, setResponseLoading] = useState({});
  const [userResponses, setUserResponses] = useState({});
  
  // Filter state management
  const [activeFilters, setActiveFilters] = useState({
    status: 'all',
    subject: 'all',
    payment: 'all',
    urgency: 'all'
  });
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  // Load user profiles for request creators
  const loadUserProfile = async (userId) => {
    if (userProfiles[userId]) return userProfiles[userId];

    try {
      // Try users collection first
      const userDoc = await getDoc(doc(db, 'users', userId));
      let profile = null;

      if (userDoc.exists()) {
        const userData = userDoc.data();
        profile = {
          id: userDoc.id,
          displayName: userData.displayName || userData.name || 'User',
          avatar: userData.avatar || userData.photoURL || `https://ui-avatars.com/api/?name=${userData.email}&background=3b82f6&color=fff`,
          bio: userData.bio || 'No bio available',
          role: userData.role || 'Student',
          rating: userData.stats?.averageRating || 4.5,
          completedSessions: userData.stats?.completedSessions || 0
        };
      } else {
        // Fallback to userProfiles collection
        const publicProfileQuery = query(
            collection(db, 'userProfiles'),
            where('uid', '==', userId)
        );
        const publicSnapshot = await getDocs(publicProfileQuery);

        if (!publicSnapshot.empty) {
          const publicData = publicSnapshot.docs[0].data();
          profile = {
            id: publicSnapshot.docs[0].id,
            displayName: publicData.displayName || 'User',
            avatar: publicData.avatar || `https://ui-avatars.com/api/?name=${publicData.displayName}&background=3b82f6&color=fff`,
            bio: publicData.bio || 'No bio available',
            role: 'Student',
            rating: publicData.stats?.averageRating || 4.5,
            completedSessions: 0
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

  // Load available requests from other users
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log('⏰ Loading timeout reached, setting loading to false');
        setLoading(false);
        setError('Loading timeout. Please refresh the page.');
      }
    }, 10000); // 10 second timeout

    const fetchRequests = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get all open requests from other users
        const requestsRef = collection(db, 'requests');
        const requestsQuery = query(
            requestsRef,
            where('status', 'in', ['open', 'active']),
            orderBy('createdAt', 'desc')
        );

        // Set up real-time listener
        const unsubscribe = onSnapshot(requestsQuery, async (snapshot) => {
          try {
            const fetchedRequests = [];

            for (const docSnap of snapshot.docs) {
              const requestData = {
                id: docSnap.id,
                ...docSnap.data(),
                createdAt: docSnap.data().createdAt?.toDate() || new Date()
              };

              // Skip own requests
              const requestUserId = requestData.userId || requestData.createdBy;
              if (requestUserId === user.id) {
                continue;
              }

              // Load user profile for the request creator
              const profile = await loadUserProfile(requestUserId);

              // Transform data to match component expectations
              const transformedRequest = {
                id: requestData.id,
                title: requestData.topic || requestData.title || 'Untitled Request',
                description: requestData.description || '',
                subject: requestData.subject || 'General',
                userName: profile.displayName,
                userAvatar: profile.avatar,
                userId: requestUserId,
                status: requestData.status,
                paymentAmount: requestData.paymentAmount,
                duration: requestData.duration || '60',
                preferredDate: requestData.preferredDate,
                preferredTime: requestData.preferredTime,
                tags: requestData.tags || [],
                views: requestData.views || 0,
                participants: requestData.participants || [],
                createdAt: requestData.createdAt,
                type: 'one-to-one',
                hasResponded: false // Will be updated below
              };

              fetchedRequests.push(transformedRequest);
            }

            setRequests(fetchedRequests);
            if (fetchedRequests.length > 0 && !selected) {
              setSelected(fetchedRequests[0]);
            }
            setLoading(false);
            clearTimeout(timeoutId); // Clear timeout on success
          } catch (error) {
            console.error('❌ Error processing snapshot:', error);
            setError('Error processing requests. Please try again.');
            setLoading(false);
            clearTimeout(timeoutId);
          }
        });

        return () => {
          unsubscribe();
          clearTimeout(timeoutId);
        };
      } catch (error) {
        console.error('❌ Error loading requests:', error);
        setError('Failed to load requests. Please try again.');
        setLoading(false);
        clearTimeout(timeoutId);
      }
    };

    fetchRequests();

    return () => clearTimeout(timeoutId);
  }, [user?.id]);

  // Load user's responses to track which requests they've already responded to
  useEffect(() => {
    if (!user?.id) return;

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log('⏰ User responses loading timeout reached');
    }, 8000); // 8 second timeout

    const unsubscribe = databaseService.getUserResponses(user.id, null, (responses) => {
      try {
        const responseMap = {};
        responses.forEach(response => {
          responseMap[response.requestId] = response.status;
        });
        setUserResponses(responseMap);

        // Update requests with response status
        setRequests(prevRequests =>
            prevRequests.map(request => ({
              ...request,
              hasResponded: !!responseMap[request.id],
              responseStatus: responseMap[request.id]
            }))
        );
        clearTimeout(timeoutId); // Clear timeout on success
      } catch (error) {
        console.error('❌ Error processing user responses:', error);
        clearTimeout(timeoutId);
      }
    });

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
      clearTimeout(timeoutId);
    };
  }, [user?.id]);

  // Handle request selection
  const handleRequestClick = (request, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    console.log('🎯 Request selected:', request.id);
    setSelected(request);
  };

  // Handle response actions
  const handleResponse = async (requestId, status, message = '') => {
    if (!user?.id) {
      alert('Please log in to respond to requests.');
      return;
    }

    setResponseLoading(prev => ({ ...prev, [requestId]: status }));

    try {
      const responseData = {
        status,
        message,
        responderName: user.displayName || user.name || 'Unknown',
        responderEmail: user.email || ''
      };

              const result = await databaseService.respondToRequest(requestId, responseData, user.id);

      if (result.success) {
        alert(result.message);

        // If accepted and meeting created, show meeting info
        if (status === 'accepted' && result.meetingUrl) {
          const openMeeting = window.confirm(
              'Meeting scheduled successfully! Would you like to open the meeting room now?'
          );
          if (openMeeting) {
            window.open(result.meetingUrl, '_blank');
          }
        }

        // Update the request in the list to show it's been responded to
        setRequests(prevRequests =>
            prevRequests.map(req =>
                req.id === requestId
                    ? { ...req, hasResponded: true, responseStatus: status }
                    : req
            )
        );
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error responding to request:', error);
      alert('Failed to respond to request. Please try again.');
    } finally {
      setResponseLoading(prev => ({ ...prev, [requestId]: null }));
    }
  };

  // Utility functions
  const formatTimeAgo = (date) => {
    if (!date) return 'Unknown';
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
  };

  const getStatusBadge = (status) => {
    const badgeClasses = {
      open: 'bg-green-100 text-green-700',
      active: 'bg-blue-100 text-blue-700',
      pending: 'bg-yellow-100 text-yellow-700'
    };

    const labels = {
      open: 'Open',
      active: 'Active',
      pending: 'Pending'
    };

    return (
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${badgeClasses[status] || badgeClasses.open}`}>
                {labels[status] || status}
            </span>
    );
  };

  // Filter and categorize requests
  const categorizeRequests = () => {
    const categories = {
      urgent: requests.filter(req => {
        if (!req.preferredDate) return false;
        const requestDate = new Date(req.preferredDate);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return requestDate <= tomorrow;
      }),
      thisWeek: requests.filter(req => {
        if (!req.preferredDate) return false;
        const requestDate = new Date(req.preferredDate);
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        return requestDate <= nextWeek;
      }),
      highPaying: requests.filter(req => parseFloat(req.paymentAmount || 0) >= 1000),
      subjects: {}
    };

    // Group by subjects
    requests.forEach(req => {
      if (!categories.subjects[req.subject]) {
        categories.subjects[req.subject] = [];
      }
      categories.subjects[req.subject].push(req);
    });

    return categories;
  };

  // Apply filters to requests
  const applyFilters = () => {
    let filtered = [...requests];

    if (activeFilters.status !== 'all') {
      filtered = filtered.filter(req => req.status === activeFilters.status);
    }

    if (activeFilters.subject !== 'all') {
      filtered = filtered.filter(req => req.subject === activeFilters.subject);
    }

    if (activeFilters.payment !== 'all') {
      if (activeFilters.payment === 'high') {
        filtered = filtered.filter(req => parseFloat(req.paymentAmount || 0) >= 1000);
      } else if (activeFilters.payment === 'low') {
        filtered = filtered.filter(req => parseFloat(req.paymentAmount || 0) < 1000 && parseFloat(req.paymentAmount || 0) > 0);
      } else if (activeFilters.payment === 'free') {
        filtered = filtered.filter(req => !req.paymentAmount || parseFloat(req.paymentAmount || 0) === 0);
      }
    }

    if (activeFilters.urgency !== 'all') {
      if (activeFilters.urgency === 'urgent') {
        filtered = filtered.filter(req => {
          if (!req.preferredDate) return false;
          const requestDate = new Date(req.preferredDate);
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          return requestDate <= tomorrow;
        });
      } else if (activeFilters.urgency === 'thisWeek') {
        filtered = filtered.filter(req => {
          if (!req.preferredDate) return false;
          const requestDate = new Date(req.preferredDate);
          const nextWeek = new Date();
          nextWeek.setDate(nextWeek.getDate() + 7);
          return requestDate <= nextWeek;
        });
      }
    }

    setFilteredRequests(filtered);
  };

  // Update filters when activeFilters change
  useEffect(() => {
    applyFilters();
  }, [activeFilters, requests]);

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setActiveFilters({
      status: 'all',
      subject: 'all',
      payment: 'all',
      urgency: 'all'
    });
  };

  // Get unique subjects for filter dropdown
  const getUniqueSubjects = () => {
    return [...new Set(requests.map(req => req.subject))];
  };

  const categories = categorizeRequests();

  if (loading) {
    return (
        <div className="p-8 bg-[#1A202C]">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4299E1] mx-auto"></div>
              <p className="mt-4 text-[#A0AEC0]">Loading available requests...</p>
            </div>
          </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="p-8 bg-[#1A202C]">
          <div className="bg-red-900 border border-red-700 rounded-lg p-6 text-center">
            <div className="text-red-400 text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-red-300 mb-2">Error Loading Requests</h3>
            <p className="text-red-400 mb-4">{error}</p>
            <button
                onClick={() => window.location.reload()}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700"
            >
              Reload Page
            </button>
          </div>
        </div>
    );
  }

  return (
      <div className="p-8 bg-[#1A202C]">
        {/* Add CSS for line-clamp utility */}
        <style>{lineClampStyles}</style>
        
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">One-to-One Learning Requests</h1>
          <p className="text-[#A0AEC0]">Browse and respond to individual learning requests from other students</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card-dark rounded-lg p-4 shadow-sm border-l-4 border-[#4299E1]">
            <div className="text-lg font-bold text-[#4299E1]">{filteredRequests.length}</div>
            <div className="text-[#A0AEC0] text-sm">Available Requests</div>
          </div>
          <div className="card-dark rounded-lg p-4 shadow-sm border-l-4 border-red-500">
            <div className="text-lg font-bold text-red-400">{categories.urgent.length}</div>
            <div className="text-[#A0AEC0] text-sm">Urgent (Tomorrow)</div>
          </div>
          <div className="card-dark rounded-lg p-4 shadow-sm border-l-4 border-green-500">
            <div className="text-lg font-bold text-green-400">{categories.highPaying.length}</div>
            <div className="text-[#A0AEC0] text-sm">High Paying (₹1000+)</div>
          </div>
          <div className="card-dark rounded-lg p-4 shadow-sm border-l-4 border-purple-500">
            <div className="text-lg font-bold text-purple-400">{Object.keys(categories.subjects).length}</div>
            <div className="text-[#A0AEC0] text-sm">Different Subjects</div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="card-dark rounded-lg shadow-sm p-4 mb-6 border border-[#4A5568]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Filters</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-[#4299E1] hover:text-[#00BFFF] transition-colors text-sm"
              >
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
              <button
                onClick={clearFilters}
                className="text-[#A0AEC0] hover:text-white transition-colors text-sm"
              >
                Clear All
              </button>
            </div>
          </div>
          
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-[#A0AEC0] mb-2">Status</label>
                <select
                  value={activeFilters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="input-dark border border-[#4A5568] rounded-lg px-3 py-2 text-sm w-full"
                >
                  <option value="all">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Subject Filter */}
              <div>
                <label className="block text-sm font-medium text-[#A0AEC0] mb-2">Subject</label>
                <select
                  value={activeFilters.subject}
                  onChange={(e) => handleFilterChange('subject', e.target.value)}
                  className="input-dark border border-[#4A5568] rounded-lg px-3 py-2 text-sm w-full"
                >
                  <option value="all">All Subjects</option>
                  {getUniqueSubjects().map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>

              {/* Payment Filter */}
              <div>
                <label className="block text-sm font-medium text-[#A0AEC0] mb-2">Payment</label>
                <select
                  value={activeFilters.payment}
                  onChange={(e) => handleFilterChange('payment', e.target.value)}
                  className="input-dark border border-[#4A5568] rounded-lg px-3 py-2 text-sm w-full"
                >
                  <option value="all">All Payments</option>
                  <option value="high">High (₹1000+)</option>
                  <option value="low">Low (&lt;₹1000)</option>
                  <option value="free">Free</option>
                </select>
              </div>

              {/* Urgency Filter */}
              <div>
                <label className="block text-sm font-medium text-[#A0AEC0] mb-2">Urgency</label>
                <select
                  value={activeFilters.urgency}
                  onChange={(e) => handleFilterChange('urgency', e.target.value)}
                  className="input-dark border border-[#4A5568] rounded-lg px-3 py-2 text-sm w-full"
                >
                  <option value="all">All Urgencies</option>
                  <option value="urgent">Urgent (Tomorrow)</option>
                  <option value="thisWeek">This Week</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex gap-6">
          {/* Request Feed */}
          <section className="flex-1 card-dark rounded-lg shadow-sm p-6 min-h-[600px]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-xl text-white">
                Available Requests ({filteredRequests.length})
              </h2>
              <div className="flex gap-2">
                <select className="input-dark border border-[#4A5568] rounded-lg px-3 py-1 text-sm">
                  <option>Sort by: Recent</option>
                  <option>Sort by: Payment</option>
                  <option>Sort by: Subject</option>
                  <option>Sort by: Urgency</option>
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
                                  ? 'border-[#4299E1] bg-[#2D3748]'
                                  : 'border-[#4A5568] hover:border-[#4299E1] hover:bg-[#2D3748]'
                          }`}
                          onClick={(e) => handleRequestClick(req, e)}
                      >
                          {/* Request content */}
                          <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                  <h3 className="font-semibold text-white line-clamp-1">
                                      {req.title || req.topic}
                                  </h3>
                                  <div className="flex items-center gap-2">
                                      {getStatusBadge(req.status)}
                                      {req.paymentAmount && (
                                          <span className="bg-green-900 text-green-300 text-xs px-2 py-1 rounded border border-green-700">
                                              ₹{req.paymentAmount}
                                          </span>
                                      )}
                                  </div>
                              </div>
                              <div className="text-sm text-[#A0AEC0] mb-2">
                                  <span>📚 {req.subject}</span>
                                  {req.preferredDate && (
                                      <>
                                          <span className="mx-2">•</span>
                                          <span>📅 {new Date(req.preferredDate).toLocaleDateString()}</span>
                                      </>
                                  )}
                                  {req.preferredTime && (
                                      <>
                                          <span className="mx-2">•</span>
                                          <span>⏰ {req.preferredTime}</span>
                                      </>
                                  )}
                              </div>
                              <p className="text-[#E0E0E0] text-sm line-clamp-2">
                                  {req.description}
                              </p>
                              <div className="flex items-center justify-between mt-3">
                                  <div className="flex items-center gap-2 text-xs text-[#A0AEC0]">
                                      <span>👤 {req.userName}</span>
                                      <span>•</span>
                                      <span>{formatTimeAgo(req.createdAt)}</span>
                                  </div>
                                  {req.tags && req.tags.length > 0 && (
                                      <div className="flex gap-1">
                                          {req.tags.slice(0, 2).map((tag, index) => (
                                              <span key={index} className="bg-[#2D3748] text-[#A0AEC0] px-2 py-1 rounded text-xs border border-[#4A5568]">
                                                  {tag}
                                              </span>
                                          ))}
                                          {req.tags.length > 2 && (
                                              <span className="bg-[#2D3748] text-[#A0AEC0] px-2 py-1 rounded text-xs border border-[#4A5568]">
                                                  +{req.tags.length - 2}
                                              </span>
                                          )}
                                      </div>
                                  )}
                              </div>
                          </div>
                      </div>
                  ))}
                </div>
            ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {requests.length === 0 ? 'No requests available' : 'No requests match your filters'}
                  </h3>
                  <p className="text-[#A0AEC0] mb-4">
                    {requests.length === 0 
                      ? 'Check back later for new learning requests from other students.'
                      : 'Try adjusting your filters or clear them to see all available requests.'
                    }
                  </p>
                  {requests.length > 0 && (
                    <button
                      onClick={clearFilters}
                      className="text-[#4299E1] hover:text-[#00BFFF] transition-colors text-sm underline"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
            )}
          </section>

          {/* Request Details */}
          {selected && (
              <aside className="w-[400px] card-dark rounded-lg shadow-sm p-6 border border-[#4A5568] flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <img
                      src={selected.userAvatar}
                      alt={selected.userName}
                      className="w-14 h-14 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-lg text-white">{selected.userName}</div>
                    <div className="text-[#A0AEC0] text-sm">Student</div>
                    <div className="text-xs text-[#A0AEC0]">
                      Request created {formatTimeAgo(selected.createdAt)}
                    </div>
                  </div>
                </div>

                {/* Request Details */}
                <div className="border-t border-[#4A5568] pt-4">
                  <div className="font-semibold text-white mb-2">{selected.title}</div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#A0AEC0]">📚 Subject:</span>
                      <span className="text-[#E0E0E0]">{selected.subject}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#A0AEC0]">📅 Date:</span>
                      <span className="text-[#E0E0E0]">
                                        {selected.preferredDate ? new Date(selected.preferredDate).toLocaleDateString() : 'Not specified'}
                                    </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#A0AEC0]">⏰ Time:</span>
                      <span className="text-[#E0E0E0]">{selected.preferredTime || 'Not specified'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#A0AEC0]">⏱️ Duration:</span>
                      <span className="text-[#E0E0E0]">{selected.duration} minutes</span>
                    </div>
                    {selected.paymentAmount && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[#A0AEC0]">💰 Payment:</span>
                          <span className="text-green-400 font-semibold">Rs.{selected.paymentAmount}</span>
                        </div>
                    )}
                  </div>

                  {/* Tags */}
                  {selected.tags && selected.tags.length > 0 && (
                      <div className="mb-4">
                        <span className="font-medium text-[#A0AEC0] text-sm block mb-2">Tags:</span>
                        <div className="flex flex-wrap gap-1">
                          {selected.tags.map((tag, index) => (
                              <span key={index} className="bg-[#2D3748] text-[#A0AEC0] px-2 py-1 rounded text-xs border border-[#4A5568]">
                                                {tag}
                                            </span>
                          ))}
                        </div>
                      </div>
                  )}

                  {/* Description */}
                  <div className="mb-4">
                    <span className="font-medium text-[#A0AEC0] text-sm block mb-2">Description:</span>
                    <div className="text-[#E0E0E0] text-sm bg-[#2D3748] rounded p-3 border border-[#4A5568] whitespace-pre-line">
                      {selected.description}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {!selected.hasResponded ? (
                      <div className="flex gap-2 mt-4">
                        <button
                            onClick={() => handleResponse(selected.id, 'declined', 'Not interested at this time')}
                            disabled={responseLoading[selected.id] === 'declined'}
                            className="bg-red-900 text-red-300 rounded px-4 py-2 font-medium text-sm hover:bg-red-800 transition-colors disabled:opacity-50"
                        >
                          {responseLoading[selected.id] === 'declined' ? 'Declining...' : 'Not Interested'}
                        </button>
                        <button
                            onClick={() => handleResponse(selected.id, 'accepted', 'I would like to help with this request')}
                            disabled={responseLoading[selected.id] === 'accepted'}
                            className="bg-green-600 text-white rounded px-4 py-2 font-medium text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {responseLoading[selected.id] === 'accepted' ? 'Accepting...' : 'Accept Request'}
                        </button>
                      </div>
                  ) : (
                      <div className={`rounded px-4 py-2 text-sm text-center mt-4 flex items-center justify-center gap-2 border ${
                          selected.responseStatus === 'accepted'
                              ? 'bg-green-900 text-green-300 border-green-700'
                              : selected.responseStatus === 'declined'
                                  ? 'bg-red-900 text-red-300 border-red-700'
                                  : 'bg-[#2D3748] text-[#4299E1] border-[#4A5568]'
                      }`}>
                                    <span>
                                        {selected.responseStatus === 'accepted' ? '✅' :
                                            selected.responseStatus === 'declined' ? '❌' : '⏳'}
                                    </span>
                        <span>
                                        {selected.responseStatus === 'accepted' ? 'Request Accepted' :
                                            selected.responseStatus === 'declined' ? 'Request Declined' : 'Response Pending'}
                                    </span>
                      </div>
                  )}

                  {/* Contact Options */}
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button
                        className="bg-[#2D3748] text-[#4299E1] rounded px-3 py-2 text-sm hover:bg-[#4A5568] transition-colors border border-[#4A5568]"
                        onClick={() => alert('Messaging feature coming soon!')}
                    >
                      💬 Message
                    </button>
                    <button
                        className="bg-[#2D3748] text-purple-400 rounded px-3 py-2 text-sm hover:bg-[#4A5568] transition-colors border border-[#4A5568]"
                        onClick={() => alert('Profile view feature coming soon!')}
                    >
                      👤 View Profile
                    </button>
                  </div>

                  {/* Report Option */}
                  <div
                      className="text-[#A0AEC0] text-xs mt-4 cursor-pointer hover:text-red-400 transition-colors text-center border-t border-[#4A5568] pt-4"
                      onClick={() => alert('Report feature coming soon!')}
                  >
                    🚩 Report Request
                  </div>
                </div>
              </aside>
          )}
        </div>

        {/* Quick Categories */}
        {requests.length > 0 && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Urgent Requests */}
              {categories.urgent.length > 0 && (
                  <div className="bg-red-900 rounded-lg p-4 border border-red-700">
                    <h3 className="font-semibold text-red-300 mb-3">⚡ Urgent Requests</h3>
                    <div className="space-y-2">
                      {categories.urgent.slice(0, 3).map(req => (
                          <div
                              key={req.id}
                              className="text-sm cursor-pointer hover:bg-red-800 p-2 rounded"
                              onClick={() => setSelected(req)}
                          >
                            <div className="font-medium text-red-200">{req.title}</div>
                            <div className="text-red-400 text-xs">{req.subject} • {new Date(req.preferredDate).toLocaleDateString()}</div>
                          </div>
                      ))}
                    </div>
                  </div>
              )}

              {/* High Paying */}
              {categories.highPaying.length > 0 && (
                  <div className="bg-green-900 rounded-lg p-4 border border-green-700">
                    <h3 className="font-semibold text-green-300 mb-3">💰 High Paying</h3>
                    <div className="space-y-2">
                      {categories.highPaying.slice(0, 3).map(req => (
                          <div
                              key={req.id}
                              className="text-sm cursor-pointer hover:bg-green-800 p-2 rounded"
                              onClick={() => setSelected(req)}
                          >
                            <div className="font-medium text-green-200">{req.title}</div>
                            <div className="text-green-400 text-xs">{req.subject} • Rs.{req.paymentAmount}</div>
                          </div>
                      ))}
                    </div>
                  </div>
              )}

              {/* Popular Subjects */}
              <div className="bg-[#2D3748] rounded-lg p-4 border border-[#4A5568]">
                <h3 className="font-semibold text-[#4299E1] mb-3">📚 Popular Subjects</h3>
                <div className="space-y-2">
                  {Object.entries(categories.subjects)
                      .sort(([,a], [,b]) => b.length - a.length)
                      .slice(0, 5)
                      .map(([subject, reqs]) => (
                          <div key={subject} className="text-sm">
                            <span className="font-medium text-[#4299E1]">{subject}</span>
                            <span className="text-[#A0AEC0] text-xs ml-2">({reqs.length} requests)</span>
                          </div>
                      ))
                  }
                </div>
              </div>
            </div>
        )}
      </div>
  );
};

export default OneToOneRequests;
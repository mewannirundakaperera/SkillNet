import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/App';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/config/firebase';

const MyRequests = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState({});

  // Determine filter from URL
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/draft')) setFilter('draft');
    else if (path.includes('/active')) setFilter('active');
    else if (path.includes('/completed')) setFilter('completed');
    else setFilter('all');
  }, [location.pathname]);

  // Load requests from Firestore with real-time updates
  useEffect(() => {
    if (!user?.id) return;

    const fetchRequests = async () => {
      try {
        setLoading(true);

        // Query for user's requests
        const requestsRef = collection(db, 'requests');
        const requestsQuery = query(
          requestsRef,
          where('userId', '==', user.id),
          orderBy('createdAt', 'desc')
        );

        // Set up real-time listener
        const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
          const fetchedRequests = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              title: data.topic || data.title || 'Untitled Request',
              description: data.description || '',
              subject: data.subject || 'General',
              preferredDate: data.preferredDate || data.scheduledDate,
              preferredTime: data.preferredTime || data.scheduledTime,
              paymentAmount: data.paymentAmount || '0.00',
              status: data.status || 'draft',
              visibility: data.visibility || 'public',
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
              tags: data.tags || [],
              participants: data.participants || [],
              maxParticipants: data.maxParticipants || 5,
              duration: data.duration || '60',
              // Additional fields that might be useful
              views: data.views || 0,
              likes: data.likes || 0,
              featured: data.featured || false
            };
          });

          setRequests(fetchedRequests);
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
  }, [user]);

  // Filter requests based on current filter
  const filteredRequests = requests.filter(req => {
    if (filter === 'all') return true;
    return req.status === filter;
  });

  // Get page title and description
  const getPageInfo = () => {
    switch (filter) {
      case 'draft': return {
        title: 'Draft Requests',
        description: 'Requests you\'ve started but haven\'t published yet'
      };
      case 'active': return {
        title: 'Active Requests',
        description: 'Your currently published and ongoing requests'
      };
      case 'completed': return {
        title: 'Completed Requests',
        description: 'Successfully completed learning sessions'
      };
      default: return {
        title: 'My Requests',
        description: 'Manage all your created requests'
      };
    }
  };

  // Handle request actions
  const handleDeleteRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to delete this request? This action cannot be undone.')) {
      return;
    }

    setActionLoading(prev => ({ ...prev, [requestId]: 'deleting' }));

    try {
      await deleteDoc(doc(db, 'requests', requestId));
      // Request will be automatically removed from state due to the real-time listener
      alert('Request deleted successfully');
    } catch (error) {
      console.error('Error deleting request:', error);
      alert('Failed to delete request. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [requestId]: null }));
    }
  };

  const handlePublishDraft = async (requestId) => {
    setActionLoading(prev => ({ ...prev, [requestId]: 'publishing' }));

    try {
      await updateDoc(doc(db, 'requests', requestId), {
        status: 'active',
        updatedAt: serverTimestamp()
      });
      // Request will be automatically updated in state due to the real-time listener
      alert('Request published successfully');
    } catch (error) {
      console.error('Error publishing request:', error);
      alert('Failed to publish request. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [requestId]: null }));
    }
  };

  const handleMarkCompleted = async (requestId) => {
    if (!window.confirm('Mark this request as completed?')) {
      return;
    }

    setActionLoading(prev => ({ ...prev, [requestId]: 'completing' }));

    try {
      await updateDoc(doc(db, 'requests', requestId), {
        status: 'completed',
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      alert('Request marked as completed');
    } catch (error) {
      console.error('Error marking request as completed:', error);
      alert('Failed to update request status. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [requestId]: null }));
    }
  };

  const handleArchiveRequest = async (requestId) => {
    if (!window.confirm('Archive this request?')) {
      return;
    }

    setActionLoading(prev => ({ ...prev, [requestId]: 'archiving' }));

    try {
      await updateDoc(doc(db, 'requests', requestId), {
        status: 'archived',
        archivedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      alert('Request archived successfully');
    } catch (error) {
      console.error('Error archiving request:', error);
      alert('Failed to archive request. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [requestId]: null }));
    }
  };

  // Utility functions
  const formatDate = (date) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTimeAgo = (date) => {
    if (!date) return 'Unknown';
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-700',
      active: 'bg-green-100 text-green-700',
      completed: 'bg-blue-100 text-blue-700',
      cancelled: 'bg-red-100 text-red-700',
      archived: 'bg-purple-100 text-purple-700'
    };
    return colors[status] || colors.draft;
  };

  const getStatusIcon = (status) => {
    const icons = {
      draft: '📝',
      active: '🟢',
      completed: '✅',
      cancelled: '❌',
      archived: '📁'
    };
    return icons[status] || '📄';
  };

  const pageInfo = getPageInfo();

  // Calculate stats
  const statsData = {
    total: requests.length,
    draft: requests.filter(r => r.status === 'draft').length,
    active: requests.filter(r => r.status === 'active').length,
    completed: requests.filter(r => r.status === 'completed').length,
    archived: requests.filter(r => r.status === 'archived').length
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your requests...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{pageInfo.title}</h1>
          <p className="text-gray-600">{pageInfo.description}</p>
        </div>
        <Link
          to="/requests/create"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          + Create New Request
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-gray-400">
          <div className="text-lg font-bold text-gray-700">{statsData.total}</div>
          <div className="text-gray-500 text-sm">Total Requests</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-gray-500">
          <div className="text-lg font-bold text-gray-600">{statsData.draft}</div>
          <div className="text-gray-500 text-sm">Draft</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-green-500">
          <div className="text-lg font-bold text-green-600">{statsData.active}</div>
          <div className="text-gray-500 text-sm">Active</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-blue-500">
          <div className="text-lg font-bold text-blue-600">{statsData.completed}</div>
          <div className="text-gray-500 text-sm">Completed</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-purple-500">
          <div className="text-lg font-bold text-purple-600">{statsData.archived}</div>
          <div className="text-gray-500 text-sm">Archived</div>
        </div>
      </div>

      {/* Requests List */}
      {filteredRequests.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold">
              {pageInfo.title} ({filteredRequests.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {filteredRequests.map((request) => (
              <div key={request.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xl">{getStatusIcon(request.status)}</span>
                      <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                      {request.featured && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                          ⭐ Featured
                        </span>
                      )}
                    </div>

                    <p className="text-gray-600 mb-3 line-clamp-2">{request.description}</p>

                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                      <span>📚 {request.subject}</span>
                      <span>📅 {formatDate(request.preferredDate)}</span>
                      <span>⏰ {request.preferredTime || 'Not set'}</span>
                      <span>💰 Rs.{request.paymentAmount}</span>
                      <span>⏱️ {request.duration} min</span>
                      {request.status === 'active' && (
                        <span>👥 {request.participants?.length || 0}/{request.maxParticipants} participants</span>
                      )}
                      {request.views > 0 && (
                        <span>👀 {request.views} views</span>
                      )}
                    </div>

                    {request.tags && request.tags.length > 0 && (
                      <div className="flex gap-2 mb-3">
                        {request.tags.map((tag, index) => (
                          <span key={index} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="text-xs text-gray-400">
                      Created {formatTimeAgo(request.createdAt)}
                      {request.updatedAt && request.updatedAt > request.createdAt && (
                        <span> • Updated {formatTimeAgo(request.updatedAt)}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <Link
                      to={`/requests/details/${request.id}`}
                      className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm font-medium hover:bg-gray-200 transition-colors text-center"
                    >
                      View Details
                    </Link>

                    {request.status === 'draft' && (
                      <>
                        <button
                          onClick={() => handlePublishDraft(request.id)}
                          disabled={actionLoading[request.id] === 'publishing'}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {actionLoading[request.id] === 'publishing' ? 'Publishing...' : 'Publish'}
                        </button>
                        <Link
                          to={`/requests/edit/${request.id}`}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-700 transition-colors text-center"
                        >
                          Edit
                        </Link>
                      </>
                    )}

                    {request.status === 'active' && (
                      <>
                        <Link
                          to={`/requests/edit/${request.id}`}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-700 transition-colors text-center"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleMarkCompleted(request.id)}
                          disabled={actionLoading[request.id] === 'completing'}
                          className="bg-purple-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                        >
                          {actionLoading[request.id] === 'completing' ? 'Completing...' : 'Mark Complete'}
                        </button>
                        <button
                          onClick={() => handleArchiveRequest(request.id)}
                          disabled={actionLoading[request.id] === 'archiving'}
                          className="bg-gray-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
                        >
                          {actionLoading[request.id] === 'archiving' ? 'Archiving...' : 'Archive'}
                        </button>
                      </>
                    )}

                    {(request.status === 'draft' || request.status === 'completed' || request.status === 'archived') && (
                      <button
                        onClick={() => handleDeleteRequest(request.id)}
                        disabled={actionLoading[request.id] === 'deleting'}
                        className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
                      >
                        {actionLoading[request.id] === 'deleting' ? 'Deleting...' : 'Delete'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="text-gray-400 text-4xl mb-4">📝</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No {filter !== 'all' ? filter : ''} requests found
          </h3>
          <p className="text-gray-500 mb-6">
            {filter === 'draft'
              ? "You don't have any draft requests."
              : filter === 'active'
              ? "You don't have any active requests."
              : filter === 'completed'
              ? "You haven't completed any requests yet."
              : filter === 'archived'
              ? "No archived requests found."
              : "You haven't created any requests yet."
            }
          </p>
          <Link
            to="/requests/create"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Create Your First Request
          </Link>
        </div>
      )}
    </div>
  );
};

export default MyRequests;
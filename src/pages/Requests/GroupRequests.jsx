import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { groupRequestService } from "@/services/groupRequestService";
import RequestCard from "../Group/components/RequestCard";

// Rest of the GroupRequests component
const GroupRequests = () => {
  const { user } = useAuth();
  const [groupRequests, setGroupRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  // Load all group requests from user's groups (not just their own requests)
  useEffect(() => {
    const loadGroupRequests = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log('🔄 Loading all group requests from user\'s groups...');

        // Get all group requests from groups where user is a member
        const requests = await groupRequestService.getAllGroupRequests({
          userId: user.id,
          isAdmin: false // Regular user, not admin-specific view
        });

        console.log('✅ Group requests from user\'s groups loaded:', requests.length);

        // Process and format the requests
        const formattedRequests = requests.map((request) => {
          return {
            ...request,
            // Ensure required fields exist
            votes: request.votes || [],
            participants: request.participants || [],
            paidParticipants: request.paidParticipants || [],
            skills: request.skills || [],
            // ✅ FIXED: Use correct field names that RequestCard expects
            createdByName: request.createdByName || request.userName || 'Unknown User',
            createdByAvatar: request.createdByAvatar || request.userAvatar || `https://ui-avatars.com/api/?name=${request.createdByName}&background=3b82f6&color=fff`,
            description: request.description || request.message || '',
            // Ensure status exists
            status: request.status || 'pending',
            voteCount: request.voteCount || request.votes?.length || 0,
            participantCount: request.participantCount || request.participants?.length || 0
          };
        });

        setGroupRequests(formattedRequests);

      } catch (error) {
        console.error('❌ Error loading user group requests:', error);

        let errorMessage = 'Failed to load your group requests';
        if (error.code === 'permission-denied') {
          errorMessage = 'Permission denied. Please check your authentication.';
        } else if (error.code === 'unavailable') {
          errorMessage = 'Database temporarily unavailable. Please try again later.';
        } else if (error.message) {
          errorMessage = error.message;
        }

        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadGroupRequests();
  }, [user]);

  // Handle request updates
  const handleRequestUpdate = (requestId, updatedRequest) => {
    setGroupRequests(prevRequests =>
        prevRequests.map(request =>
            request.id === requestId ? { ...request, ...updatedRequest } : request
        )
    );
  };

  // Get unique categories and statuses
  const categories = ['all', ...new Set(groupRequests.map(req => req.category?.toLowerCase()).filter(Boolean))];
  const statuses = [
    'all',
    'pending',
    'voting_open',
    'accepted',
    'payment_complete',
    'in_progress',
    'completed',
    'cancelled'
  ];

  // Filter requests
  const filteredRequests = groupRequests.filter(request => {
    const matchesCategory = selectedCategory === 'all' || request.category?.toLowerCase() === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || request.status === selectedStatus;
    const matchesSearch = searchQuery === '' ||
        request.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.groupName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.skills?.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesStatus && matchesSearch;
  });

  // Get status statistics
  const getStatusStats = () => {
    const stats = {};
    statuses.forEach(status => {
      if (status === 'all') {
        stats[status] = groupRequests.length;
      } else {
        stats[status] = groupRequests.filter(req => req.status === status).length;
      }
    });
    return stats;
  };

  const statusStats = getStatusStats();

  if (loading) {
    return (
        <div className="p-8 bg-slate-900">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-slate-300">Loading your group requests...</p>
            </div>
          </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="p-8 bg-slate-900">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <h2 className="text-xl font-semibold text-white mb-2">Error Loading Requests</h2>
              <p className="text-slate-300 mb-4">{error}</p>
              <div className="flex gap-2 justify-center">
                <button
                    onClick={() => window.location.reload()}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Try Again
                </button>
                <Link
                    to="/groups"
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Browse Groups
                </Link>
              </div>
            </div>
          </div>
        </div>
    );
  }

  return (
      <div className="p-8 bg-slate-900 min-h-screen">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Group Requests</h1>
              <p className="mt-2 text-sm text-slate-300">
                Browse and participate in group learning requests from your communities
              </p>
            </div>
            <Link
                to="/group/create-group-request"
                className="bg-blue-600 text-white rounded-lg px-6 py-3 font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Group Request
            </Link>
          </div>
        </div>

        {/* Status Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
          {[
            { key: 'all', label: 'Total', color: 'bg-slate-700 text-slate-200' },
            { key: 'pending', label: 'Pending', color: 'bg-yellow-900 text-yellow-200' },
            { key: 'voting_open', label: 'Voting', color: 'bg-orange-900 text-orange-200' },
            { key: 'accepted', label: 'Accepted', color: 'bg-green-900 text-green-200' },
            { key: 'payment_complete', label: 'Ready', color: 'bg-yellow-800 text-yellow-100' },
            { key: 'in_progress', label: 'Live', color: 'bg-blue-900 text-blue-200' },
            { key: 'completed', label: 'Done', color: 'bg-slate-600 text-slate-100' },
            { key: 'cancelled', label: 'Cancelled', color: 'bg-red-900 text-red-200' }
          ].map(({ key, label, color }) => (
              <button
                  key={key}
                  onClick={() => setSelectedStatus(key)}
                  className={`p-3 rounded-lg text-center transition-colors ${
                      selectedStatus === key ? `${color} ring-2 ring-blue-500` : `${color} hover:opacity-75`
                  }`}
              >
                <div className="text-lg font-bold">{statusStats[key] || 0}</div>
                <div className="text-xs">{label}</div>
              </button>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Search</label>
              <input
                  type="text"
                  placeholder="Search requests, skills, or groups..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border border-slate-600 rounded-lg px-3 py-2 bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-500"
              />
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Category</label>
              <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border border-slate-600 rounded-lg px-3 py-2 bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-500"
              >
                {categories.map(category => (
                    <option key={category} value={category}>
                      {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Status</label>
              <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full border border-slate-600 rounded-lg px-3 py-2 bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-500"
              >
                {statuses.map(status => (
                    <option key={status} value={status}>
                      {groupRequestService.getStatusDisplay(status).label}
                    </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-sm text-slate-300">
            Showing {filteredRequests.length} of {groupRequests.length} requests
          </p>
        </div>

        {/* Requests Grid - 3 cards per row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRequests.map((request) => (
              <RequestCard
                  key={request.id}
                  request={request}
                  currentUserId={user?.id}
                  onRequestUpdate={handleRequestUpdate}
              />
          ))}
        </div>

        {/* Empty State */}
        {filteredRequests.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-slate-400 text-6xl mb-4">
                {groupRequests.length === 0 ? '📚' : '🔍'}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {groupRequests.length === 0 ? 'No group requests yet' : 'No requests found'}
              </h3>
              <p className="text-slate-300 mb-4">
                {groupRequests.length === 0
                    ? "No group requests available in your communities yet. Join more groups or create the first request!"
                    : "Try adjusting your filters or search query to find more requests."
                }
              </p>
              <div className="flex gap-2 justify-center">
                {groupRequests.length > 0 && (
                    <button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategory('all');
                          setSelectedStatus('all');
                        }}
                        className="text-blue-400 hover:text-blue-300 font-medium"
                    >
                      Clear all filters
                    </button>
                )}
                <Link
                    to="/group/create-group-request"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  {groupRequests.length === 0 ? 'Create First Request' : 'Create New Request'}
                </Link>
                {groupRequests.length === 0 && (
                    <Link
                        to="/groups"
                        className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
                    >
                      Browse Groups
                    </Link>
                )}
              </div>
            </div>
        )}
      </div>
  );
};

export default GroupRequests;
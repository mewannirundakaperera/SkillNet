import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { groupRequestService } from "@/services/groupRequestService";
import { collection, getDocs, limit, query, doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase";

// Enhanced Group Request Card Component (Same as before)
const EnhancedGroupRequestCard = ({ request, currentUserId, onRequestUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [timeUntilSession, setTimeUntilSession] = useState(null);
  const [conferenceLink, setConferenceLink] = useState(null);

  // Calculate time until session starts
  useEffect(() => {
    if (request.scheduledDateTime && (request.status === 'payment_complete' || request.status === 'in_progress')) {
      const interval = setInterval(() => {
        const now = new Date();
        const sessionTime = new Date(request.scheduledDateTime);
        const diffMs = sessionTime - now;

        if (diffMs > 0) {
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          setTimeUntilSession({ hours, minutes, total: diffMs });

          // Create conference link 10 minutes before
          if (diffMs <= 10 * 60 * 1000 && !conferenceLink) {
            generateConferenceLink();
          }
        } else {
          setTimeUntilSession(null);
          if (request.status === 'payment_complete') {
            updateRequestStatus('in_progress');
          }
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [request.scheduledDateTime, request.status, conferenceLink]);

  // Generate conference link
  const generateConferenceLink = async () => {
    try {
      const mockLink = `https://meet.skillnet.com/session/${request.id}`;
      setConferenceLink(mockLink);

      await groupRequestService.updateGroupRequest(request.id, {
        conferenceLink: mockLink
      }, currentUserId);
    } catch (error) {
      console.error('Error generating conference link:', error);
    }
  };

  // Update request status using service
  const updateRequestStatus = async (newStatus, reason = null) => {
    try {
      setLoading(true);
      const updateData = { status: newStatus };
      if (reason) {
        updateData.cancellationReason = reason;
      }

      const result = await groupRequestService.updateGroupRequest(request.id, updateData, currentUserId);
      if (result.success) {
        onRequestUpdate?.(request.id, { ...request, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating request status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle voting using service
  const handleVote = async () => {
    if (!currentUserId || loading) return;

    try {
      setLoading(true);
      const hasVoted = request.votes?.includes(currentUserId);

      let newVotes;
      if (hasVoted) {
        newVotes = request.votes?.filter(id => id !== currentUserId) || [];
      } else {
        newVotes = [...(request.votes || []), currentUserId];
      }

      const updateData = {
        votes: newVotes,
        voteCount: newVotes.length
      };

      // Auto-transition to voting_open if enough votes
      if (newVotes.length >= 5 && request.status === 'pending') {
        updateData.status = 'voting_open';
      }

      const result = await groupRequestService.updateGroupRequest(request.id, updateData, currentUserId);
      if (result.success) {
        onRequestUpdate?.(request.id, {
          ...request,
          votes: newVotes,
          voteCount: newVotes.length,
          status: updateData.status || request.status
        });
      }
    } catch (error) {
      console.error('Error handling vote:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle participation using service
  const handleParticipation = async () => {
    if (!currentUserId || loading) return;

    try {
      setLoading(true);
      const isParticipating = request.participants?.includes(currentUserId);

      let newParticipants;
      if (isParticipating) {
        newParticipants = request.participants?.filter(id => id !== currentUserId) || [];
      } else {
        newParticipants = [...(request.participants || []), currentUserId];
      }

      const updateData = {
        participants: newParticipants,
        participantCount: newParticipants.length
      };

      // Auto-approve if enough participants
      if (newParticipants.length >= (request.minParticipants || 3) && request.status === 'voting_open') {
        updateData.status = 'accepted';
      }

      const result = await groupRequestService.updateGroupRequest(request.id, updateData, currentUserId);
      if (result.success) {
        onRequestUpdate?.(request.id, {
          ...request,
          participants: newParticipants,
          participantCount: newParticipants.length,
          status: updateData.status || request.status
        });
      }
    } catch (error) {
      console.error('Error handling participation:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle payment (mock implementation)
  const handlePayment = async () => {
    if (!currentUserId || loading) return;

    try {
      setLoading(true);
      const paymentAmount = parseFloat(request.rate?.replace(/[^0-9.-]+/g,"") || "25");

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newPaidParticipants = [...(request.paidParticipants || []), currentUserId];
      const updateData = {
        paidParticipants: newPaidParticipants,
        totalPaid: (request.totalPaid || 0) + paymentAmount
      };

      // Check if payment is complete
      if (newPaidParticipants.length >= (request.participantCount || 1)) {
        updateData.status = 'payment_complete';
        // Schedule session for 1 hour from now (for demo)
        updateData.scheduledDateTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      }

      const result = await groupRequestService.updateGroupRequest(request.id, updateData, currentUserId);
      if (result.success) {
        onRequestUpdate?.(request.id, {
          ...request,
          paidParticipants: newPaidParticipants,
          totalPaid: updateData.totalPaid,
          status: updateData.status || request.status,
          scheduledDateTime: updateData.scheduledDateTime || request.scheduledDateTime
        });
        alert('Payment successful!');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get card styling based on status
  const getCardStyling = () => {
    switch (request.status) {
      case 'pending':
        return {
          borderColor: 'border-yellow-300',
          bgColor: 'bg-yellow-50',
          statusColor: 'bg-yellow-100 text-yellow-800'
        };
      case 'voting_open':
        return {
          borderColor: 'border-orange-300',
          bgColor: 'bg-orange-50',
          statusColor: 'bg-orange-100 text-orange-800'
        };
      case 'accepted':
        return {
          borderColor: 'border-green-300',
          bgColor: 'bg-green-50',
          statusColor: 'bg-green-100 text-green-800'
        };
      case 'payment_complete':
        return {
          borderColor: 'border-yellow-400',
          bgColor: 'bg-gradient-to-br from-yellow-100 to-yellow-200',
          statusColor: 'bg-yellow-200 text-yellow-900'
        };
      case 'in_progress':
        return {
          borderColor: 'border-blue-400',
          bgColor: 'bg-blue-50',
          statusColor: 'bg-blue-100 text-blue-800'
        };
      case 'completed':
        return {
          borderColor: 'border-gray-600',
          bgColor: 'bg-gray-900 text-white',
          statusColor: 'bg-gray-700 text-gray-200'
        };
      case 'cancelled':
        return {
          borderColor: 'border-red-400',
          bgColor: 'bg-red-50',
          statusColor: 'bg-red-100 text-red-800'
        };
      default:
        return {
          borderColor: 'border-gray-200',
          bgColor: 'bg-white',
          statusColor: 'bg-gray-100 text-gray-700'
        };
    }
  };

  const styling = getCardStyling();
  const voteCount = request.voteCount || request.votes?.length || 0;
  const participantCount = request.participantCount || request.participants?.length || 0;
  const paidCount = request.paidParticipants?.length || 0;
  const hasVoted = request.votes?.includes(currentUserId);
  const isParticipating = request.participants?.includes(currentUserId);
  const hasPaid = request.paidParticipants?.includes(currentUserId);
  const isOwner = request.createdBy === currentUserId || request.userId === currentUserId;

  return (
      <div className={`rounded-lg shadow-sm border-2 p-4 hover:shadow-md transition-all h-full flex flex-col ${styling.borderColor} ${styling.bgColor}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-2">
            <img
                src={request.createdByAvatar || request.avatar}
                alt={request.createdByName || request.name}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h3 className={`font-semibold text-base line-clamp-1 ${request.status === 'completed' ? 'text-white' : 'text-gray-900'}`}>
                {request.title}
              </h3>
              <p className={`text-xs ${request.status === 'completed' ? 'text-gray-300' : 'text-gray-600'}`}>
                {isOwner ? '👑 Your Request' : request.createdByName || request.name}
              </p>
              <p className={`text-xs ${request.status === 'completed' ? 'text-gray-400' : 'text-gray-500'}`}>
                in {request.groupName}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {request.rate && (
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-medium">
              {request.rate}
            </span>
            )}
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${styling.statusColor}`}>
            {groupRequestService.getStatusDisplay(request.status).label}
          </span>
            {isOwner && (
                <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">
              Owner
            </span>
            )}
          </div>
        </div>

        {/* Description */}
        <p className={`text-sm mb-3 line-clamp-2 ${request.status === 'completed' ? 'text-gray-300' : 'text-gray-700'}`}>
          {request.description}
        </p>

        {/* Skills */}
        {request.skills && request.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {request.skills.slice(0, 3).map((skill, index) => (
                  <span
                      key={index}
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                          request.status === 'completed'
                              ? 'bg-gray-800 text-gray-300 border-gray-600'
                              : 'bg-white text-gray-700 border-gray-200'
                      }`}
                  >
              {skill}
            </span>
              ))}
              {request.skills.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{request.skills.length - 3} more
                  </span>
              )}
            </div>
        )}

        {/* State-specific content based on status and ownership */}
        {request.status === 'pending' && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">
                  {isOwner ? 'Awaiting votes' : 'Needs votes'}
                </span>
                <span className="text-xs text-gray-600">{voteCount}/5</span>
              </div>
              <div className="w-full bg-yellow-200 rounded-full h-1.5 mb-2">
                <div
                    className="bg-yellow-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((voteCount / 5) * 100, 100)}%` }}
                />
              </div>
              {!isOwner && groupRequestService.canUserVote(request, currentUserId) && (
                  <button
                      onClick={handleVote}
                      disabled={loading}
                      className={`w-full py-1.5 px-3 rounded-lg font-medium text-xs transition-colors ${
                          hasVoted
                              ? 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300'
                              : 'bg-yellow-500 text-white hover:bg-yellow-600'
                      } disabled:opacity-50`}
                  >
                    {loading ? 'Processing...' : hasVoted ? '✓ Voted' : 'Vote to Approve'}
                  </button>
              )}
              {isOwner && (
                  <div className="bg-yellow-100 text-yellow-700 py-1.5 px-3 rounded-lg text-center text-xs font-medium">
                    ⏳ Waiting for approval ({voteCount}/5)
                  </div>
              )}
            </div>
        )}

        {request.status === 'voting_open' && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">
                  {isOwner ? 'Participants' : 'Join session'}
                </span>
                <span className="text-xs text-gray-600">{participantCount} joined</span>
              </div>
              <div className="flex gap-1">
                {!isOwner && groupRequestService.canUserVote(request, currentUserId) && (
                    <button
                        onClick={handleVote}
                        disabled={loading}
                        className={`flex-1 py-1.5 px-2 rounded-lg font-medium text-xs transition-colors ${
                            hasVoted
                                ? 'bg-orange-200 text-orange-800 hover:bg-orange-300'
                                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                        } disabled:opacity-50`}
                    >
                      {hasVoted ? `❤️ ${voteCount}` : `👍 ${voteCount}`}
                    </button>
                )}
                {!isOwner && groupRequestService.canUserParticipate(request, currentUserId) && (
                    <button
                        onClick={handleParticipation}
                        disabled={loading}
                        className={`flex-1 py-1.5 px-2 rounded-lg font-medium text-xs transition-colors ${
                            isParticipating
                                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                : 'bg-orange-500 text-white hover:bg-orange-600'
                        } disabled:opacity-50`}
                    >
                      {loading ? '...' : isParticipating ? 'Leave' : 'Join'}
                    </button>
                )}
                {isOwner && (
                    <div className="w-full bg-orange-100 text-orange-700 py-1.5 px-2 rounded-lg text-center text-xs font-medium">
                      👥 {participantCount} joined
                    </div>
                )}
              </div>
            </div>
        )}

        {request.status === 'accepted' && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">
                  {isOwner ? 'Payment' : 'Payment required'}
                </span>
                <span className="text-xs text-gray-600">{paidCount}/{participantCount}</span>
              </div>
              <div className="w-full bg-green-200 rounded-full h-1.5 mb-2">
                <div
                    className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${participantCount > 0 ? (paidCount / participantCount) * 100 : 0}%` }}
                />
              </div>
              {!isOwner && isParticipating && !hasPaid && (
                  <button
                      onClick={handlePayment}
                      disabled={loading}
                      className="w-full bg-green-600 text-white py-1.5 px-3 rounded-lg font-medium text-xs hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : `Pay ${request.rate || 'Now'}`}
                  </button>
              )}
              {!isOwner && hasPaid && (
                  <div className="w-full bg-green-100 text-green-700 py-1.5 px-3 rounded-lg text-center text-xs font-medium">
                    ✓ Paid - Waiting for others
                  </div>
              )}
              {isOwner && (
                  <div className="w-full bg-green-100 text-green-700 py-1.5 px-3 rounded-lg text-center text-xs font-medium">
                    💰 Collecting ({paidCount}/{participantCount})
                  </div>
              )}
            </div>
        )}

        {/* Additional status blocks (payment_complete, in_progress, completed, cancelled) remain the same... */}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
          <div className={`text-xs ${request.status === 'completed' ? 'text-gray-400' : 'text-gray-500'}`}>
            {new Date(request.createdAt?.toDate?.() || request.createdAt).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-1">
            <Link
                to={`/requests/details/${request.id}`}
                className={`text-xs font-medium hover:underline ${
                    request.status === 'completed'
                        ? 'text-gray-300 hover:text-white'
                        : 'text-blue-600 hover:text-blue-800'
                }`}
            >
              Details
            </Link>
            {isOwner && ['pending', 'voting_open', 'accepted'].includes(request.status) && (
                <Link
                    to={`/requests/edit-group/${request.id}`}
                    className="text-xs font-medium text-purple-600 hover:text-purple-800 hover:underline ml-2"
                >
                  Edit
                </Link>
            )}
          </div>
        </div>
      </div>
  );
};

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
            // Compatibility fields
            name: request.createdByName || request.userName || 'Unknown User',
            avatar: request.createdByAvatar || request.userAvatar || `https://ui-avatars.com/api/?name=${request.createdByName}&background=3b82f6&color=fff`,
            message: request.description || request.message || '',
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
        <div className="p-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading your group requests...</p>
            </div>
          </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="p-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Error Loading Requests</h2>
              <p className="text-gray-600 mb-4">{error}</p>
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
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Group Requests</h1>
              <p className="mt-2 text-sm text-gray-600">
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
            { key: 'all', label: 'Total', color: 'bg-gray-100 text-gray-700' },
            { key: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
            { key: 'voting_open', label: 'Voting', color: 'bg-orange-100 text-orange-700' },
            { key: 'accepted', label: 'Accepted', color: 'bg-green-100 text-green-700' },
            { key: 'payment_complete', label: 'Ready', color: 'bg-yellow-200 text-yellow-800' },
            { key: 'in_progress', label: 'Live', color: 'bg-blue-100 text-blue-700' },
            { key: 'completed', label: 'Done', color: 'bg-gray-200 text-gray-800' },
            { key: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-700' }
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                  type="text"
                  placeholder="Search requests, skills, or groups..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          <p className="text-sm text-gray-600">
            Showing {filteredRequests.length} of {groupRequests.length} requests
          </p>
        </div>

        {/* Requests Grid - 3 cards per row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRequests.map((request) => (
              <EnhancedGroupRequestCard
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
              <div className="text-gray-400 text-6xl mb-4">
                {groupRequests.length === 0 ? '📚' : '🔍'}
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                {groupRequests.length === 0 ? 'No group requests yet' : 'No requests found'}
              </h3>
              <p className="text-gray-500 mb-4">
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
                        className="text-blue-600 hover:text-blue-800 font-medium"
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
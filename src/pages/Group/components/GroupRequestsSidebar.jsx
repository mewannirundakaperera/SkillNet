import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
  getDocs
} from "firebase/firestore";
import { db } from "@/config/firebase";

const GroupRequestsSidebar = ({ currentGroupId = null }) => {
  const { user } = useAuth();
  const [topRequests, setTopRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load top 3 group requests
  useEffect(() => {
    const fetchTopRequests = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const requestsRef = collection(db, 'grouprequests');
        const requestsQuery = query(
            requestsRef,
            orderBy('updatedAt', 'desc'),
            limit(10) // Get more to filter later
        );

        const unsubscribe = onSnapshot(requestsQuery, async (snapshot) => {
          const allRequests = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              name: data.createdByName || data.userName || 'Unknown User',
              avatar: data.createdByAvatar || data.userAvatar || `https://ui-avatars.com/api/?name=${data.createdByName}&background=3b82f6&color=fff`,
              status: data.status || 'pending',
              voteCount: data.voteCount || data.votes?.length || 0,
              participantCount: data.participantCount || data.participants?.length || 0
            };
          });

          // Filter requests based on user's group memberships
          const filteredRequests = await filterRequestsByGroupMembership(allRequests, user.id);

          // Get top 3 most recent
          const top3 = filteredRequests.slice(0, 3);
          setTopRequests(top3);
          setLoading(false);
        }, (error) => {
          console.error('Error fetching top requests:', error);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error setting up top requests listener:', error);
        setLoading(false);
      }
    };

    fetchTopRequests();
  }, [user]);

  // Filter requests based on group membership
  const filterRequestsByGroupMembership = async (requests, userId) => {
    try {
      // Get user's group memberships
      const userGroupsRef = collection(db, 'groups');
      const userGroupsQuery = query(
          userGroupsRef,
          where('members', 'array-contains', userId)
      );
      const userGroupsSnapshot = await getDocs(userGroupsQuery);
      const userGroupIds = userGroupsSnapshot.docs.map(doc => doc.id);

      // Filter requests where user is member of the target group OR the request creator
      const visibleRequests = requests.filter(request => {
        // Show if user created the request
        if (request.userId === userId || request.createdBy === userId) {
          return true;
        }

        // Show if user is member of the target group
        if (userGroupIds.includes(request.targetGroupId || request.groupId)) {
          return true;
        }

        return false;
      });

      return visibleRequests;
    } catch (error) {
      console.error('Error filtering requests by group membership:', error);
      return requests;
    }
  };

  // Get status styling
  const getStatusStyling = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'voting_open':
        return 'bg-orange-100 text-orange-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'payment_complete':
        return 'bg-yellow-200 text-yellow-900';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-200 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Format time ago
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Unknown time';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
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
        <aside className="w-80 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0 bg-white" style={{ minHeight: '76px' }}>
            <div className="flex items-center justify-between h-full w-full">
              <div className="flex flex-col justify-center">
                <h3 className="font-semibold text-lg mb-1">Recent Group Requests</h3>
                <p className="text-xs text-gray-500">Loading requests...</p>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    </div>
                  </div>
              ))}
            </div>
          </div>
        </aside>
    );
  }

  return (
      <aside className="w-80 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden">
        {/* Fixed Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0 bg-white" style={{ minHeight: '76px' }}>
          <div className="flex items-center justify-between h-full w-full">
            <div className="flex flex-col justify-center">
              <h3 className="font-semibold text-lg mb-1">Recent Group Requests</h3>
              <p className="text-xs text-gray-500">Latest learning requests from groups</p>
            </div>
            <Link
                to={`/group/create-group-request${currentGroupId ? `?groupId=${currentGroupId}` : ''}`}
                className="bg-blue-600 text-white rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1 flex-shrink-0"
                title="Create new group request"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create
            </Link>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {topRequests.length > 0 ? (
              <div className="space-y-4">
                {topRequests.map((request) => (
                    <div key={request.id} className="border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <img
                            src={request.avatar}
                            alt={request.name}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-gray-900 line-clamp-1">
                            {request.title}
                          </h4>
                          <p className="text-xs text-gray-600 mb-1">
                            by {request.name} • {formatTimeAgo(request.updatedAt || request.createdAt)}
                          </p>
                          <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                            {request.description || request.message}
                          </p>

                          <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusStyling(request.status)}`}>
                        {request.status === 'voting_open' ? 'Voting Open' :
                            request.status === 'payment_complete' ? 'Ready' :
                                request.status === 'in_progress' ? 'Live' :
                                    request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>

                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              {request.status === 'pending' && (
                                  <span>🗳️ {request.voteCount}/5</span>
                              )}
                              {(request.status === 'voting_open' || request.status === 'accepted') && (
                                  <span>👥 {request.participantCount}</span>
                              )}
                            </div>
                          </div>

                          <Link
                              to={`/groups/requests/${request.id}`}
                              className="inline-block mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View Details →
                          </Link>
                        </div>
                      </div>
                    </div>
                ))}
              </div>
          ) : (
              <div className="text-center py-6">
                <div className="text-gray-400 text-2xl mb-2">📚</div>
                <p className="text-sm text-gray-500 mb-3">No group requests available</p>
                <p className="text-xs text-gray-400">
                  Join more groups to see learning requests
                </p>
              </div>
          )}
        </div>

        {/* Fixed Footer - Simplified with main action only */}
        <div className="p-6 border-t border-gray-200 flex-shrink-0">
          <div className="flex flex-col gap-3">
            <Link
                to="/groups/requests"
                className="text-center py-2 px-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
            >
              Browse All Requests
            </Link>

            <Link
                to="/groups"
                className="text-center py-2 px-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
            >
              Explore Groups
            </Link>
          </div>

          {/* Stats Section */}
          {topRequests.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2">
                    <div className="text-lg font-bold text-yellow-600">
                      {topRequests.filter(r => r.status === 'pending').length}
                    </div>
                    <div className="text-xs text-gray-500">Pending</div>
                  </div>
                  <div className="p-2">
                    <div className="text-lg font-bold text-orange-600">
                      {topRequests.filter(r => r.status === 'voting_open').length}
                    </div>
                    <div className="text-xs text-gray-500">Active</div>
                  </div>
                  <div className="p-2">
                    <div className="text-lg font-bold text-blue-600">
                      {topRequests.filter(r => r.status === 'in_progress').length}
                    </div>
                    <div className="text-xs text-gray-500">Live</div>
                  </div>
                </div>
              </div>
          )}
        </div>
      </aside>
  );
};

export default GroupRequestsSidebar;
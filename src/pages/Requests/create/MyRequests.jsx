import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { requestService } from '@/services/requestService';
import { groupRequestService } from '@/services/groupRequestService';

const MyRequests = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [groupRequests, setGroupRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState({});
    const [selectedTab, setSelectedTab] = useState('all'); // all, one-to-one, group
    const [selectedStatus, setSelectedStatus] = useState('all'); // all, draft, active, completed, etc.

    // Load all user's requests
    useEffect(() => {
        if (!user?.id) return;

        setLoading(true);

        // Load one-to-one requests
        const unsubscribeOneToOne = requestService.getAllUserRequests(user.id, (oneToOneRequests) => {
            console.log('📝 Loaded one-to-one requests:', oneToOneRequests.length);
            setRequests(oneToOneRequests);
            setLoading(false);
        });

        // Load group requests
        const loadGroupRequests = async () => {
            try {
                const userGroupRequests = await groupRequestService.getUserGroupRequests(user.id);
                console.log('👥 Loaded group requests:', userGroupRequests.length);
                setGroupRequests(userGroupRequests);
            } catch (error) {
                console.error('❌ Error loading group requests:', error);
                setGroupRequests([]);
            }
        };

        loadGroupRequests();

        return () => {
            if (unsubscribeOneToOne) {
                unsubscribeOneToOne();
            }
        };
    }, [user]);

    // Handle request actions
    const handleRequestAction = async (requestId, action, requestType = 'one-to-one') => {
        setActionLoading(prev => ({ ...prev, [requestId]: action }));

        try {
            let result;

            if (requestType === 'group') {
                switch (action) {
                    case 'publish':
                        result = await groupRequestService.changeRequestStatus(requestId, 'active', user.id);
                        break;
                    case 'complete':
                        result = await groupRequestService.completeSession(requestId, user.id);
                        break;
                    case 'cancel':
                        result = await groupRequestService.cancelGroupRequest(requestId, 'Cancelled by user', user.id);
                        break;
                    case 'delete':
                        result = await groupRequestService.deleteGroupRequest(requestId, user.id);
                        break;
                    default:
                        result = { success: false, message: 'Unknown action' };
                }
            } else {
                switch (action) {
                    case 'publish':
                        result = await requestService.publishDraft(requestId, user.id);
                        break;
                    case 'complete':
                        result = await requestService.changeRequestStatus(requestId, 'completed', user.id);
                        break;
                    case 'archive':
                        result = await requestService.changeRequestStatus(requestId, 'archived', user.id);
                        break;
                    case 'delete':
                        result = await requestService.deleteRequest(requestId, user.id);
                        break;
                    default:
                        result = { success: false, message: 'Unknown action' };
                }
            }

            if (result.success) {
                alert(result.message);
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error(`❌ Error ${action}ing request:`, error);
            alert(`Failed to ${action} request. Please try again.`);
        } finally {
            setActionLoading(prev => ({ ...prev, [requestId]: null }));
        }
    };

    // Combine and filter requests
    const getCombinedRequests = () => {
        let combined = [];

        // Add one-to-one requests
        if (selectedTab === 'all' || selectedTab === 'one-to-one') {
            const oneToOneFormatted = requests.map(req => ({
                ...req,
                type: 'one-to-one',
                title: req.topic || req.title || 'Untitled Request'
            }));
            combined = [...combined, ...oneToOneFormatted];
        }

        // Add group requests
        if (selectedTab === 'all' || selectedTab === 'group') {
            const groupFormatted = groupRequests.map(req => ({
                ...req,
                type: 'group',
                title: req.title || 'Untitled Group Request',
                topic: req.title // For consistency
            }));
            combined = [...combined, ...groupFormatted];
        }

        // Filter by status
        if (selectedStatus !== 'all') {
            combined = combined.filter(req => req.status === selectedStatus);
        }

        // Sort by updated date
        combined.sort((a, b) => {
            const aTime = a.updatedAt || a.createdAt || new Date(0);
            const bTime = b.updatedAt || b.createdAt || new Date(0);
            return bTime - aTime;
        });

        return combined;
    };

    const combinedRequests = getCombinedRequests();

    // Utility functions
    const formatDate = (date) => {
        if (!date) return 'Not set';
        const dateObj = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
        return dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatTimeAgo = (date) => {
        if (!date) return 'Unknown';
        const dateObj = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
        const now = new Date();
        const diffMs = now - dateObj;
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
            open: 'bg-green-100 text-green-700',
            active: 'bg-blue-100 text-blue-700',
            pending: 'bg-yellow-100 text-yellow-700',
            accepted: 'bg-green-100 text-green-700',
            completed: 'bg-gray-100 text-gray-700',
            cancelled: 'bg-red-100 text-red-700',
            archived: 'bg-purple-100 text-purple-700',
            voting_open: 'bg-orange-100 text-orange-700'
        };
        return colors[status] || colors.draft;
    };

    const getStatusIcon = (status) => {
        const icons = {
            draft: '📝',
            open: '🟢',
            active: '🔵',
            pending: '⏳',
            accepted: '✅',
            completed: '✅',
            cancelled: '❌',
            archived: '📁',
            voting_open: '🗳️'
        };
        return icons[status] || '📄';
    };

    // Calculate stats
    const statsData = {
        total: combinedRequests.length,
        oneToOne: requests.length,
        group: groupRequests.length,
        draft: combinedRequests.filter(r => r.status === 'draft').length,
        active: combinedRequests.filter(r => ['open', 'active', 'pending', 'voting_open'].includes(r.status)).length,
        completed: combinedRequests.filter(r => r.status === 'completed').length,
        archived: combinedRequests.filter(r => ['archived', 'cancelled'].includes(r.status)).length
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
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">My Requests</h1>
                    <p className="text-gray-600">Manage all your created requests</p>
                </div>
                <div className="flex gap-3">
                    <Link
                        to="/requests/create"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                        + Create 1:1 Request
                    </Link>
                    <Link
                        to="/requests/create-group"
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                    >
                        + Create Group Request
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-6 gap-4 mb-8">
                <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-gray-400">
                    <div className="text-lg font-bold text-gray-700">{statsData.total}</div>
                    <div className="text-gray-500 text-sm">Total</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-blue-500">
                    <div className="text-lg font-bold text-blue-600">{statsData.oneToOne}</div>
                    <div className="text-gray-500 text-sm">One-to-One</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-purple-500">
                    <div className="text-lg font-bold text-purple-600">{statsData.group}</div>
                    <div className="text-gray-500 text-sm">Group</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-gray-500">
                    <div className="text-lg font-bold text-gray-600">{statsData.draft}</div>
                    <div className="text-gray-500 text-sm">Draft</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-green-500">
                    <div className="text-lg font-bold text-green-600">{statsData.active}</div>
                    <div className="text-gray-500 text-sm">Active</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-orange-500">
                    <div className="text-lg font-bold text-orange-600">{statsData.completed}</div>
                    <div className="text-gray-500 text-sm">Completed</div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <div className="flex flex-wrap gap-4 items-center">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Request Type</label>
                        <select
                            value={selectedTab}
                            onChange={(e) => setSelectedTab(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="all">All Types</option>
                            <option value="one-to-one">One-to-One</option>
                            <option value="group">Group</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="all">All Statuses</option>
                            <option value="draft">Draft</option>
                            <option value="open">Open</option>
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                            <option value="accepted">Accepted</option>
                            <option value="completed">Completed</option>
                            <option value="archived">Archived</option>
                        </select>
                    </div>
                    <div className="ml-auto">
                        <p className="text-sm text-gray-600">
                            Showing {combinedRequests.length} of {statsData.total} requests
                        </p>
                    </div>
                </div>
            </div>

            {/* Requests List */}
            {combinedRequests.length > 0 ? (
                <div className="bg-white rounded-lg shadow-sm">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold">
                            All Requests ({combinedRequests.length})
                        </h2>
                    </div>

                    <div className="divide-y divide-gray-200">
                        {combinedRequests.map((request) => (
                            <div key={`${request.type}-${request.id}`} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-xl">{getStatusIcon(request.status)}</span>
                                            <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(request.status)}`}>
                                                {request.status}
                                            </span>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                request.type === 'group' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                {request.type === 'group' ? '👥 Group' : '👤 1:1'}
                                            </span>
                                            {request.featured && (
                                                <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                                                    ⭐ Featured
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-gray-600 mb-3 line-clamp-2">{request.description}</p>

                                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                                            {request.type === 'one-to-one' && (
                                                <>
                                                    <span>📚 {request.subject}</span>
                                                    <span>📅 {formatDate(request.preferredDate)}</span>
                                                    <span>⏰ {request.preferredTime || 'Not set'}</span>
                                                    <span>💰 Rs.{request.paymentAmount || '0'}</span>
                                                    <span>⏱️ {request.duration || '60'} min</span>
                                                    <span>👥 {request.participants?.length || 0} participants</span>
                                                </>
                                            )}
                                            {request.type === 'group' && (
                                                <>
                                                    <span>🏷️ {request.category}</span>
                                                    <span>👍 {request.voteCount || 0} votes</span>
                                                    <span>👥 {request.participantCount || 0} participants</span>
                                                    {request.rate && <span>💰 {request.rate}</span>}
                                                    {request.deadline && <span>📅 {formatDate(request.deadline)}</span>}
                                                </>
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

                                        {request.skills && request.skills.length > 0 && (
                                            <div className="flex gap-2 mb-3">
                                                {request.skills.map((skill, index) => (
                                                    <span key={index} className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">
                                                        {skill}
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
                                            to={`/requests/details/${request.id}?type=${request.type}`}
                                            className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm font-medium hover:bg-gray-200 transition-colors text-center"
                                        >
                                            View Details
                                        </Link>

                                        {request.status === 'draft' && (
                                            <>
                                                <button
                                                    onClick={() => handleRequestAction(request.id, 'publish', request.type)}
                                                    disabled={actionLoading[request.id] === 'publish'}
                                                    className="bg-green-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                                                >
                                                    {actionLoading[request.id] === 'publish' ? 'Publishing...' : 'Publish'}
                                                </button>
                                                <Link
                                                    to={`/requests/edit/${request.id}?type=${request.type}`}
                                                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-700 transition-colors text-center"
                                                >
                                                    Edit
                                                </Link>
                                            </>
                                        )}

                                        {['open', 'active', 'pending', 'voting_open', 'accepted'].includes(request.status) && (
                                            <>
                                                <Link
                                                    to={`/requests/edit/${request.id}?type=${request.type}`}
                                                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-700 transition-colors text-center"
                                                >
                                                    Edit
                                                </Link>
                                                <button
                                                    onClick={() => handleRequestAction(request.id, 'complete', request.type)}
                                                    disabled={actionLoading[request.id] === 'complete'}
                                                    className="bg-purple-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                                                >
                                                    {actionLoading[request.id] === 'complete' ? 'Completing...' : 'Complete'}
                                                </button>
                                            </>
                                        )}

                                        {['draft', 'completed', 'archived', 'cancelled'].includes(request.status) && (
                                            <button
                                                onClick={() => handleRequestAction(request.id, 'delete', request.type)}
                                                disabled={actionLoading[request.id] === 'delete'}
                                                className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
                                            >
                                                {actionLoading[request.id] === 'delete' ? 'Deleting...' : 'Delete'}
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
                        {statsData.total === 0 ? 'No requests found' : 'No requests match your filters'}
                    </h3>
                    <p className="text-gray-500 mb-6">
                        {statsData.total === 0
                            ? "You haven't created any requests yet."
                            : "Try adjusting your filters to see more requests."
                        }
                    </p>
                    <div className="flex gap-3 justify-center">
                        {statsData.total > 0 && (
                            <button
                                onClick={() => {
                                    setSelectedTab('all');
                                    setSelectedStatus('all');
                                }}
                                className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Clear Filters
                            </button>
                        )}
                        <Link
                            to="/requests/create"
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                        >
                            Create Your First Request
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyRequests;
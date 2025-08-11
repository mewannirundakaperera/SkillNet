import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import databaseService from '@/services/databaseService';
import { groupRequestService } from '@/services/groupRequestService';

const MyRequests = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [groupRequests, setGroupRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState({});
    const [selectedTab, setSelectedTab] = useState('all'); // all, one-to-one, group
    const [selectedStatus, setSelectedStatus] = useState('all'); // all, draft, active, completed, etc.

    // Load all user's requests
    useEffect(() => {
        if (!user?.id) return;

        setLoading(true);
        setError(null);

        // Add timeout to prevent infinite loading
        const loadingTimeout = setTimeout(() => {
            console.warn('⏰ Loading timeout reached, setting loading to false');
            setLoading(false);
        }, 10000); // 10 seconds timeout

        // Load one-to-one requests using databaseService
        const unsubscribeOneToOne = databaseService.getUserRequests(user.id, null, (userRequests, errorInfo) => {
            console.log('📝 Loaded one-to-one requests:', userRequests?.length || 0);
            console.log('📝 Request details:', userRequests);
            
            if (errorInfo) {
                console.error('❌ Error from databaseService:', errorInfo);
                if (errorInfo.error === 'missing_index') {
                    setError('Firebase index required. Please create the composite index for requests collection. Check console for details.');
                } else {
                    setError(`Failed to load requests: ${errorInfo.details}`);
                }
                setLoading(false);
                return;
            }
            
            clearTimeout(loadingTimeout);
            setRequests(userRequests);
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

        // Cleanup subscription and timeout
        return () => {
            clearTimeout(loadingTimeout);
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
                        result = await groupRequestService.changeRequestStatus(requestId, 'pending', user.id);
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
                // Use databaseService for one-to-one requests
                switch (action) {
                    case 'publish':
                        result = await databaseService.publishDraft(requestId, user.id);
                        break;
                    case 'complete':
                        result = await databaseService.completeRequest(requestId, user.id);
                        break;
                    case 'archive':
                        result = await databaseService.archiveRequest(requestId, user.id);
                        break;
                    case 'delete':
                        result = await databaseService.deleteRequest(requestId, user.id);
                        break;
                    default:
                        result = { success: false, message: 'Unknown action' };
                }
            }

            if (result.success) {
                alert(result.message);
                
                // Update local state immediately for better UX
                if (requestType === 'one-to-one') {
                    // For one-to-one requests, remove from local state immediately
                    // The onSnapshot listener will also update, but immediate removal provides instant feedback
                    if (action === 'delete') {
                        setRequests(prev => prev.filter(req => req.id !== requestId));
                    }
                } else {
                    // For group requests, reload the list to get updated data
                    try {
                        const userGroupRequests = await groupRequestService.getUserGroupRequests(user.id);
                        setGroupRequests(userGroupRequests);
                    } catch (error) {
                        console.error('Error reloading group requests after action:', error);
                        // Fallback: remove from local state if reload fails
                        if (action === 'delete') {
                            setGroupRequests(prev => prev.filter(req => req.id !== requestId));
                        }
                    }
                }
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

    // Helper function to update local state immediately
    const updateLocalState = (requestId, action, requestType) => {
        if (action === 'delete') {
            if (requestType === 'group') {
                setGroupRequests(prev => prev.filter(req => req.id !== requestId));
            } else {
                setRequests(prev => prev.filter(req => req.id !== requestId));
            }
        } else if (action === 'publish') {
            // Update status to 'open' for published drafts
            if (requestType === 'group') {
                setGroupRequests(prev => prev.map(req => 
                    req.id === requestId ? { ...req, status: 'pending' } : req
                ));
            } else {
                setRequests(prev => prev.map(req => 
                    req.id === requestId ? { ...req, status: 'open' } : req
                ));
            }
        } else if (action === 'complete') {
            // Update status to 'completed'
            if (requestType === 'group') {
                setGroupRequests(prev => prev.map(req => 
                    req.id === requestId ? { ...req, status: 'completed' } : req
                ));
            } else {
                setRequests(prev => prev.map(req => 
                    req.id === requestId ? { ...req, status: 'completed' } : req
                ));
            }
        }
    };

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

    const getStatusDescription = (status) => {
        const descriptions = {
            draft: 'Draft - Not published yet',
            open: 'Open - Waiting for responses',
            active: 'Active - In progress',
            pending: 'Pending - Under review',
            accepted: 'Accepted - Session confirmed',
            completed: 'Completed - Session finished',
            cancelled: 'Cancelled - Request cancelled',
            archived: 'Archived - Request archived',
            voting_open: 'Voting - Group voting in progress'
        };
        return descriptions[status] || 'Unknown status';
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
        open: combinedRequests.filter(r => r.status === 'open').length,
        active: combinedRequests.filter(r => ['active', 'pending', 'voting_open'].includes(r.status)).length,
        accepted: combinedRequests.filter(r => r.status === 'accepted').length,
        completed: combinedRequests.filter(r => r.status === 'completed').length,
        archived: combinedRequests.filter(r => ['archived', 'cancelled'].includes(r.status)).length
    };

    if (loading) {
        return (
            <div className="p-8 bg-slate-900 min-h-screen">
                <div className="flex items-center justify-center min-h-96">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-slate-300">Loading your requests...</p>
                        <p className="mt-2 text-slate-400 text-sm">
                            This may take a moment. If loading continues, check the console for index requirements.
                        </p>
                        <div className="mt-4 text-slate-500 text-xs">
                            <div>⏰ Loading timeout: 10 seconds</div>
                            <div>🔍 Check browser console for any errors</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 bg-slate-900 min-h-screen">
                <div className="flex items-center justify-center min-h-96">
                    <div className="text-center max-w-2xl">
                        <div className="text-red-400 text-6xl mb-4">⚠️</div>
                        <h2 className="text-2xl font-bold text-red-400 mb-4">Error Loading Requests</h2>
                        <p className="text-slate-300 mb-6">{error}</p>
                        
                        {error.includes('Firebase index required') && (
                            <div className="bg-red-800 border border-red-600 rounded-lg p-4 mb-6 text-left">
                                <h4 className="font-semibold text-red-200 mb-2">🔧 Firebase Index Required</h4>
                                <p className="text-red-300 text-sm mb-3">
                                    This error occurs because the database needs a composite index to efficiently query requests.
                                </p>
                                <div className="text-red-400 text-xs space-y-1">
                                    <div>• Check the browser console for the index creation URL</div>
                                    <div>• Click the URL to go to Firebase Console</div>
                                    <div>• Create the composite index for the requests collection</div>
                                    <div>• Wait for the index to build (may take a few minutes)</div>
                                </div>
                            </div>
                        )}
                        
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => window.location.reload()}
                                className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700"
                            >
                                Reload Page
                            </button>
                            {error.includes('Firebase index required') && (
                                <button
                                    onClick={() => {
                                        setError(null);
                                        setLoading(true);
                                    }}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700"
                                >
                                    Retry
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 bg-slate-900 min-h-screen">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">My Requests</h1>
                    <p className="text-slate-300">Manage all your created requests</p>
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
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                        + Create Group Request
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-7 gap-4 mb-8">
                <div className="bg-slate-800 rounded-lg p-4 shadow-sm border-l-4 border-gray-400">
                    <div className="text-lg font-bold text-white">{statsData.total}</div>
                    <div className="text-slate-300 text-sm">Total</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 shadow-sm border-l-4 border-blue-500">
                    <div className="text-lg font-bold text-blue-400">{statsData.oneToOne}</div>
                    <div className="text-slate-300 text-sm">One-to-One</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 shadow-sm border-l-4 border-purple-500">
                    <div className="text-lg font-bold text-purple-400">{statsData.group}</div>
                    <div className="text-slate-300 text-sm">Group</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 shadow-sm border-l-4 border-gray-500">
                    <div className="text-lg font-bold text-slate-300">{statsData.draft}</div>
                    <div className="text-slate-300 text-sm">Draft</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 shadow-sm border-l-4 border-green-500">
                    <div className="text-lg font-bold text-green-400">{statsData.open}</div>
                    <div className="text-slate-300 text-sm">Open</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 shadow-sm border-l-4 border-blue-500">
                    <div className="text-lg font-bold text-blue-400">{statsData.accepted}</div>
                    <div className="text-slate-300 text-sm">Accepted</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 shadow-sm border-l-4 border-orange-500">
                    <div className="text-lg font-bold text-orange-400">{statsData.completed}</div>
                    <div className="text-slate-300 text-sm">Completed</div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-slate-800 rounded-lg shadow-sm p-6 mb-6">
                <div className="flex flex-wrap gap-4 items-center">
                    <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">Request Type</label>
                        <select
                            value={selectedTab}
                            onChange={(e) => setSelectedTab(e.target.value)}
                            className="border border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-900 focus:border-transparent bg-slate-700 text-white"
                        >
                            <option value="all">All Types</option>
                            <option value="one-to-one">One-to-One</option>
                            <option value="group">Group</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">Status</label>
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="border border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-900 focus:border-transparent bg-slate-700 text-white"
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
                        <p className="text-sm text-slate-300">
                            Showing {combinedRequests.length} of {statsData.total} requests
                        </p>
                    </div>
                </div>
            </div>

            {/* Requests List */}
            {combinedRequests.length > 0 ? (
                <div className="bg-slate-800 rounded-lg shadow-sm">
                    <div className="p-6 border-b border-slate-700">
                        <h2 className="text-lg font-semibold text-white">
                            All Requests ({combinedRequests.length})
                        </h2>
                    </div>

                    <div className="divide-y divide-slate-700">
                        {combinedRequests.map((request) => (
                            <div key={`${request.type}-${request.id}`} className="p-6 hover:bg-slate-700 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-xl">{getStatusIcon(request.status)}</span>
                                            <h3 className="text-lg font-semibold text-white">{request.title}</h3>
                                            <span 
                                                className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(request.status)} cursor-help`}
                                                title={getStatusDescription(request.status)}
                                            >
                                                {request.status}
                                            </span>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                request.type === 'group' ? 'bg-purple-900 text-purple-200' : 'bg-blue-900 text-blue-200'
                                            }`}>
                                                {request.type === 'group' ? '👥 Group' : '👤 1:1'}
                                            </span>
                                            {request.featured && (
                                                <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-900 text-yellow-200">
                                                    ⭐ Featured
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-slate-300 mb-3 line-clamp-2">{request.description}</p>

                                        <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
                                            {request.type === 'one-to-one' && (
                                                <>
                                                    <span>📚 {request.subject}</span>
                                                    <span>📅 {formatDate(request.preferredDate)}</span>
                                                    <span>⏰ {request.preferredTime || 'Not set'}</span>
                                                                                                         <span>💰 {request.currency || 'Rs.'}{request.paymentAmount || '0'}</span>
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
                                                    <span key={index} className="bg-slate-700 text-slate-200 px-2 py-1 rounded text-xs">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {request.skills && request.skills.length > 0 && (
                                            <div className="flex gap-2 mb-3">
                                                {request.skills.map((skill, index) => (
                                                    <span key={index} className="bg-purple-900 text-purple-200 px-2 py-1 rounded text-xs">
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        <div className="text-xs text-slate-500">
                                            Created {formatTimeAgo(request.createdAt)}
                                            {request.updatedAt && request.updatedAt > request.createdAt && (
                                                <span> • Updated {formatTimeAgo(request.updatedAt)}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 ml-4">
                                        <Link
                                            to={`/requests/details/${request.id}?type=${request.type}`}
                                            className="bg-slate-700 text-slate-200 px-3 py-1 rounded text-sm font-medium hover:bg-slate-600 transition-colors text-center"
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

                                        {['open', 'active', 'pending', 'voting_open'].includes(request.status) && (
                                            <>
                                                <Link
                                                    to={`/requests/edit/${request.id}?type=${request.type}`}
                                                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-700 transition-colors text-center"
                                                >
                                                    Edit
                                                </Link>
                                                <button
                                                    onClick={() => handleRequestAction(request.id, 'delete', request.type)}
                                                    disabled={actionLoading[request.id] === 'delete'}
                                                    className="bg-red-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                                                >
                                                    {actionLoading[request.id] === 'delete' ? 'Deleting...' : 'Delete'}
                                                </button>
                                            </>
                                        )}

                                        {request.status === 'accepted' && (
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
                                                    className="bg-green-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
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
                <div className="bg-slate-800 rounded-lg shadow-sm p-12 text-center">
                    <div className="text-slate-400 text-4xl mb-4">📝</div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                        {statsData.total === 0 ? 'No requests found' : 'No requests match your filters'}
                    </h3>
                    <p className="text-slate-300 mb-6">
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
                                className="text-blue-400 hover:text-blue-300 font-medium"
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
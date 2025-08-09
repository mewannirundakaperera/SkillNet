import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { requestService } from '@/services/requestService';
import { groupRequestService } from '@/services/groupRequestService';

const DraftRequests = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [groupRequests, setGroupRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState({});

    // Load draft requests from both collections
    useEffect(() => {
        if (!user?.id) return;

        const fetchRequests = async () => {
            try {
                setLoading(true);

                // Load one-to-one draft requests
                const unsubscribeOneToOne = requestService.getUserRequestsByStatus(user.id, 'draft', (draftRequests) => {
                    console.log('📝 Loaded one-to-one drafts:', draftRequests.length);
                    setRequests(draftRequests);
                });

                // Load group draft requests
                const loadGroupDrafts = async () => {
                    try {
                        const userGroupRequests = await groupRequestService.getUserGroupRequests(user.id, 'draft');
                        console.log('👥 Loaded group drafts:', userGroupRequests.length);
                        setGroupRequests(userGroupRequests);
                    } catch (error) {
                        console.error('❌ Error loading group drafts:', error);
                        setGroupRequests([]);
                    }
                };

                await loadGroupDrafts();
                setLoading(false);

                return () => {
                    if (unsubscribeOneToOne) {
                        unsubscribeOneToOne();
                    }
                };
            } catch (error) {
                console.error('❌ Error setting up draft requests listener:', error);
                setLoading(false);
            }
        };

        fetchRequests();
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

    // Combine and format requests
    const getCombinedDrafts = () => {
        let combined = [];

        // Add one-to-one requests
        const oneToOneFormatted = requests.map(req => ({
            ...req,
            type: 'one-to-one',
            title: req.topic || req.title || 'Untitled Request'
        }));
        combined = [...combined, ...oneToOneFormatted];

        // Add group requests
        const groupFormatted = groupRequests.map(req => ({
            ...req,
            type: 'group',
            title: req.title || 'Untitled Group Request',
            topic: req.title // For consistency
        }));
        combined = [...combined, ...groupFormatted];

        // Sort by updated date
        combined.sort((a, b) => {
            const aTime = a.updatedAt || a.createdAt || new Date(0);
            const bTime = b.updatedAt || b.createdAt || new Date(0);
            return bTime - aTime;
        });

        return combined;
    };

    const allDrafts = getCombinedDrafts();

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

    const getStatusColor = () => {
        return 'bg-gray-100 text-gray-700';
    };

    const getStatusIcon = () => {
        return '📝';
    };

    // Calculate stats
    const statsData = {
        total: requests.length + groupRequests.length,
        oneToOne: requests.length,
        group: groupRequests.length,
        draft: allDrafts.length,
        active: 0,
        completed: 0,
        archived: 0
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="flex items-center justify-center min-h-96">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading your draft requests...</p>
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
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Draft Requests</h1>
                    <p className="text-gray-600">Requests you've started but haven't published yet</p>
                </div>
                <div className="flex gap-3">
                    <Link
                        to="/requests/create"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                        + New 1:1 Request
                    </Link>
                    <Link
                        to="/requests/create-group"
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                    >
                        + New Group Request
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-gray-500">
                    <div className="text-lg font-bold text-gray-600">{statsData.total}</div>
                    <div className="text-gray-500 text-sm">Total Drafts</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-blue-500">
                    <div className="text-lg font-bold text-blue-600">{statsData.oneToOne}</div>
                    <div className="text-gray-500 text-sm">One-to-One</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-purple-500">
                    <div className="text-lg font-bold text-purple-600">{statsData.group}</div>
                    <div className="text-gray-500 text-sm">Group</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-green-500">
                    <div className="text-lg font-bold text-green-600">0</div>
                    <div className="text-gray-500 text-sm">Ready to Publish</div>
                </div>
            </div>

            {/* Draft Requests List */}
            {allDrafts.length > 0 ? (
                <div className="bg-white rounded-lg shadow-sm">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold">
                            Draft Requests ({allDrafts.length})
                        </h2>
                    </div>

                    <div className="divide-y divide-gray-200">
                        {allDrafts.map((request) => (
                            <div key={`${request.type}-${request.id}`} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-xl">{getStatusIcon()}</span>
                                            <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor()}`}>
                                                draft
                                            </span>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                request.type === 'group' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                {request.type === 'group' ? '👥 Group' : '👤 1:1'}
                                            </span>
                                        </div>

                                        <p className="text-gray-600 mb-3 line-clamp-2">{request.description || 'No description yet...'}</p>

                                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                                            {request.type === 'one-to-one' && (
                                                <>
                                                    <span>📚 {request.subject || 'No subject'}</span>
                                                    <span>📅 {formatDate(request.preferredDate)}</span>
                                                    <span>⏰ {request.preferredTime || 'Not set'}</span>
                                                    <span>💰 Rs.{request.paymentAmount || '0'}</span>
                                                    <span>⏱️ {request.duration || '60'} min</span>
                                                </>
                                            )}
                                            {request.type === 'group' && (
                                                <>
                                                    <span>🏷️ {request.category || 'No category'}</span>
                                                    {request.maxParticipants && <span>👥 Max: {request.maxParticipants}</span>}
                                                    {request.rate && <span>💰 {request.rate}</span>}
                                                    {request.deadline && <span>📅 Due: {formatDate(request.deadline)}</span>}
                                                </>
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
                                            Preview
                                        </Link>

                                        <Link
                                            to={`/requests/edit/${request.id}?type=${request.type}`}
                                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-700 transition-colors text-center"
                                        >
                                            Continue Editing
                                        </Link>

                                        <button
                                            onClick={() => handleRequestAction(request.id, 'publish', request.type)}
                                            disabled={actionLoading[request.id] === 'publish'}
                                            className="bg-green-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                                        >
                                            {actionLoading[request.id] === 'publish' ? 'Publishing...' : 'Publish Now'}
                                        </button>

                                        <button
                                            onClick={() => handleRequestAction(request.id, 'delete', request.type)}
                                            disabled={actionLoading[request.id] === 'delete'}
                                            className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
                                        >
                                            {actionLoading[request.id] === 'delete' ? 'Deleting...' : 'Delete Draft'}
                                        </button>
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
                        No draft requests found
                    </h3>
                    <p className="text-gray-500 mb-6">
                        You don't have any draft requests. Start creating a request and save it as a draft to work on it later.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <Link
                            to="/requests/create"
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                        >
                            Create 1:1 Request
                        </Link>
                        <Link
                            to="/requests/create-group"
                            className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                        >
                            Create Group Request
                        </Link>
                    </div>
                </div>
            )}

            {/* Tips for Draft Management */}
            {allDrafts.length > 0 && (
                <div className="mt-8 bg-blue-50 rounded-lg p-6">
                    <h3 className="font-semibold text-blue-900 mb-3">💡 Tips for Managing Drafts</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Complete all required fields before publishing</li>
                        <li>• Use clear, descriptive titles to help others find your request</li>
                        <li>• Set realistic deadlines and payment amounts</li>
                        <li>• Add relevant tags to improve discoverability</li>
                        <li>• Review your draft carefully before publishing</li>
                    </ul>
                </div>
            )}
        </div>
    );
};

export default DraftRequests;
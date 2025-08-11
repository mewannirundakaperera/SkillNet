import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDraftRequests } from '@/hooks/useRequests';
import integratedRequestService from '@/services/integratedRequestService';
import { groupRequestService } from '@/services/groupRequestService';

const DraftRequests = () => {
    const { user } = useAuth();
    const { requests: oneToOneRequests, loading: oneToOneLoading } = useDraftRequests();
    const [groupRequests, setGroupRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState({});

    // Load group draft requests separately
    useEffect(() => {
        const loadGroupDrafts = async () => {
            if (!user?.id) return;

            try {
                const userGroupRequests = await groupRequestService.getUserGroupRequests(user.id, 'draft');
                console.log('👥 Loaded group drafts:', userGroupRequests.length);
                setGroupRequests(userGroupRequests);
            } catch (error) {
                console.error('❌ Error loading group drafts:', error);
                setGroupRequests([]);
            }
        };

        loadGroupDrafts();
    }, [user]);

    // Update loading state
    useEffect(() => {
        setLoading(oneToOneLoading);
    }, [oneToOneLoading]);

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
                        // Use the integrated service to publish draft (draft -> open)
                        result = await integratedRequestService.publishDraft(requestId, user.id);
                        break;
                    case 'delete':
                        result = await integratedRequestService.deleteRequest(requestId, user.id);
                        break;
                    default:
                        result = { success: false, message: 'Unknown action' };
                }
            }

            if (result.success) {
                alert(result.message);
                // Refresh the page to update the list
                window.location.reload();
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
        const oneToOneFormatted = oneToOneRequests.map(req => ({
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
        total: oneToOneRequests.length + groupRequests.length,
        oneToOne: oneToOneRequests.length,
        group: groupRequests.length,
        readyToPublish: allDrafts.filter(r => r.title && r.description && (r.subject || r.category)).length
    };

    if (loading) {
        return (
            <div className="p-8 bg-slate-900 min-h-screen">
                <div className="flex items-center justify-center min-h-96">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-slate-300">Loading your draft requests...</p>
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
                    <h1 className="text-2xl font-bold text-white mb-2">Draft Requests</h1>
                    <p className="text-slate-300">Requests you've started but haven't published yet</p>
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
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                        + New Group Request
                    </Link>
                </div>
            </div>

            {/* Flow Info */}
            <div className="bg-blue-900 rounded-lg p-4 mb-8 border border-blue-700">
                <div className="flex items-center gap-3 mb-2">
                    <span className="text-blue-400 text-xl">📋</span>
                    <h3 className="font-semibold text-blue-200">Draft Request Flow</h3>
                </div>
                <div className="text-blue-100 text-sm">
                    <p>📝 <strong>Draft:</strong> Save your work and edit anytime • 🟢 <strong>Publish:</strong> Make visible to others • 🔵 <strong>Active:</strong> When someone accepts • ✅ <strong>Complete:</strong> After session ends</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-800 rounded-lg p-4 shadow-sm border-l-4 border-gray-500">
                    <div className="text-lg font-bold text-white">{statsData.total}</div>
                    <div className="text-slate-300 text-sm">Total Drafts</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 shadow-sm border-l-4 border-blue-500">
                    <div className="text-lg font-bold text-blue-400">{statsData.oneToOne}</div>
                    <div className="text-slate-300 text-sm">One-to-One</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 shadow-sm border-l-4 border-purple-500">
                    <div className="text-lg font-bold text-purple-400">{statsData.group}</div>
                    <div className="text-slate-300 text-sm">Group</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 shadow-sm border-l-4 border-green-500">
                    <div className="text-lg font-bold text-green-400">{statsData.readyToPublish}</div>
                    <div className="text-slate-300 text-sm">Ready to Publish</div>
                </div>
            </div>

            {/* Draft Requests List */}
            {allDrafts.length > 0 ? (
                <div className="bg-slate-800 rounded-lg shadow-sm">
                    <div className="p-6 border-b border-slate-700">
                        <h2 className="text-lg font-semibold text-white">
                            Draft Requests ({allDrafts.length})
                        </h2>
                    </div>

                    <div className="divide-y divide-slate-700">
                        {allDrafts.map((request) => {
                            const isComplete = request.title && request.description && (request.subject || request.category);

                            return (
                                <div key={`${request.type}-${request.id}`} className="p-6 hover:bg-slate-700 transition-colors">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-xl">{getStatusIcon()}</span>
                                                <h3 className="text-lg font-semibold text-white">{request.title}</h3>
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor()}`}>
                                                    draft
                                                </span>
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                    request.type === 'group' ? 'bg-purple-900 text-purple-200' : 'bg-blue-900 text-blue-200'
                                                }`}>
                                                    {request.type === 'group' ? '👥 Group' : '👤 1:1'}
                                                </span>
                                                {isComplete && (
                                                    <span className="px-2 py-1 rounded text-xs font-medium bg-green-900 text-green-200">
                                                        ✅ Ready
                                                    </span>
                                                )}
                                                {!isComplete && (
                                                    <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-900 text-yellow-200">
                                                        ⚠️ Incomplete
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-slate-300 mb-3 line-clamp-2">{request.description || 'No description yet...'}</p>

                                            <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
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

                                            {/* Completion Status */}
                                            {!isComplete && (
                                                <div className="mt-3 p-3 bg-yellow-900 rounded-lg border border-yellow-700">
                                                    <div className="text-sm text-yellow-200">
                                                        <strong>Missing fields:</strong>
                                                        {!request.title && <span className="ml-2">• Title</span>}
                                                        {!request.description && <span className="ml-2">• Description</span>}
                                                        {!request.subject && !request.category && <span className="ml-2">• Subject/Category</span>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-2 ml-4">
                                            <Link
                                                to={`/requests/details/${request.id}?type=${request.type}`}
                                                className="bg-slate-700 text-slate-200 px-3 py-1 rounded text-sm font-medium hover:bg-slate-600 transition-colors text-center"
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
                                                disabled={actionLoading[request.id] === 'publish' || !isComplete}
                                                className="bg-green-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                title={!isComplete ? 'Complete all required fields first' : 'Publish request'}
                                            >
                                                {actionLoading[request.id] === 'publish' ? 'Publishing...' : 'Publish Now'}
                                            </button>

                                            <button
                                                onClick={() => {
                                                    if (window.confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
                                                        handleRequestAction(request.id, 'delete', request.type);
                                                    }
                                                }}
                                                disabled={actionLoading[request.id] === 'delete'}
                                                className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
                                            >
                                                {actionLoading[request.id] === 'delete' ? 'Deleting...' : 'Delete Draft'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="bg-slate-800 rounded-lg shadow-sm p-12 text-center">
                    <div className="text-slate-400 text-4xl mb-4">📝</div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                        No draft requests found
                    </h3>
                    <p className="text-slate-300 mb-6">
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
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                        >
                            Create Group Request
                        </Link>
                    </div>
                </div>
            )}

            {/* Tips for Draft Management */}
            {allDrafts.length > 0 && (
                <div className="mt-8 bg-blue-900 rounded-lg p-6">
                    <h3 className="font-semibold text-blue-200 mb-3">💡 Tips for Managing Drafts</h3>
                    <ul className="text-sm text-blue-100 space-y-1">
                        <li>• Complete all required fields before publishing (Title, Description, Subject/Category)</li>
                        <li>• Use clear, descriptive titles to help others find your request</li>
                        <li>• Set realistic deadlines and payment amounts</li>
                        <li>• Add relevant tags to improve discoverability</li>
                        <li>• Review your draft carefully before publishing</li>
                        <li>• Published requests will appear in "Available Requests" for others to accept</li>
                    </ul>
                </div>
            )}
        </div>
    );
};

export default DraftRequests;
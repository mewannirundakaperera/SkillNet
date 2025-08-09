import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useActiveRequests } from '@/hooks/useRequests';

const ActiveRequests = () => {
    const {
        requests,
        stats,
        loading,
        error,
        changeStatus,
        deleteRequest
    } = useActiveRequests();

    const [actionLoading, setActionLoading] = useState({});

    // Handle request actions
    const handleMarkCompleted = async (requestId, requestType) => {
        if (!window.confirm('Mark this request as completed?')) {
            return;
        }

        setActionLoading(prev => ({ ...prev, [requestId]: 'completing' }));

        try {
            const result = await changeStatus(requestId, 'completed', requestType);
            if (result.success) {
                alert(result.message);
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('Error marking request as completed:', error);
            alert('Failed to update request status. Please try again.');
        } finally {
            setActionLoading(prev => ({ ...prev, [requestId]: null }));
        }
    };

    const handleArchiveRequest = async (requestId, requestType) => {
        if (!window.confirm('Archive this request?')) {
            return;
        }

        setActionLoading(prev => ({ ...prev, [requestId]: 'archiving' }));

        try {
            const result = await changeStatus(requestId, 'archived', requestType);
            if (result.success) {
                alert(result.message);
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('Error archiving request:', error);
            alert('Failed to archive request. Please try again.');
        } finally {
            setActionLoading(prev => ({ ...prev, [requestId]: null }));
        }
    };

    const handleDeleteRequest = async (requestId, requestType) => {
        if (!window.confirm('Are you sure you want to delete this request? This action cannot be undone.')) {
            return;
        }

        setActionLoading(prev => ({ ...prev, [requestId]: 'deleting' }));

        try {
            const result = await deleteRequest(requestId, requestType);
            if (result.success) {
                alert(result.message);
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('Error deleting request:', error);
            alert('Failed to delete request. Please try again.');
        } finally {
            setActionLoading(prev => ({ ...prev, [requestId]: null }));
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

    const getStatusColor = () => {
        return 'bg-green-100 text-green-700';
    };

    const getStatusIcon = () => {
        return '🟢';
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="flex items-center justify-center min-h-96">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading your active requests...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <div className="text-red-500 text-4xl mb-4">⚠️</div>
                    <h3 className="text-lg font-semibold text-red-700 mb-2">Error Loading Requests</h3>
                    <p className="text-red-600 mb-4">{error}</p>
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
        <div className="p-8">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Active Requests</h1>
                    <p className="text-gray-600">Your currently published and ongoing requests</p>
                </div>
                <div className="flex gap-3">
                    <Link
                        to="/requests/create"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                        + Create New Request
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-5 gap-4 mb-8">
                <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-gray-400">
                    <div className="text-lg font-bold text-gray-700">{stats.total}</div>
                    <div className="text-gray-500 text-sm">Total Requests</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-gray-500">
                    <div className="text-lg font-bold text-gray-600">{stats.byStatus?.draft || 0}</div>
                    <div className="text-gray-500 text-sm">Draft</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-green-500">
                    <div className="text-lg font-bold text-green-600">{stats.active}</div>
                    <div className="text-gray-500 text-sm">Active</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-blue-500">
                    <div className="text-lg font-bold text-blue-600">{stats.completed}</div>
                    <div className="text-gray-500 text-sm">Completed</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-purple-500">
                    <div className="text-lg font-bold text-purple-600">{stats.archived}</div>
                    <div className="text-gray-500 text-sm">Archived</div>
                </div>
            </div>

            {/* Active Requests List */}
            {requests.length > 0 ? (
                <div className="bg-white rounded-lg shadow-sm">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold">
                            Active Requests ({requests.length})
                        </h2>
                    </div>

                    <div className="divide-y divide-gray-200">
                        {requests.map((request) => (
                            <div key={`${request.type}-${request.id}`} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-xl">{getStatusIcon()}</span>
                                            <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor()}`}>
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
                                                    <span>💰 Rs.{request.paymentAmount}</span>
                                                    <span>⏱️ {request.duration || '60'} min</span>
                                                    <span>👥 {request.participants?.length || 0}/{request.maxParticipants || 5} participants</span>
                                                </>
                                            )}
                                            {request.type === 'group' && (
                                                <>
                                                    <span>🏷️ {request.category}</span>
                                                    <span>👍 {request.voteCount || 0} votes</span>
                                                    <span>👥 {request.participantCount || 0} participants</span>
                                                    {request.rate && <span>💰 {request.rate}</span>}
                                                    {request.deadline && <span>📅 Due: {formatDate(request.deadline)}</span>}
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

                                        <Link
                                            to={`/requests/edit/${request.id}?type=${request.type}`}
                                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-700 transition-colors text-center"
                                        >
                                            Edit
                                        </Link>

                                        <button
                                            onClick={() => handleMarkCompleted(request.id, request.type)}
                                            disabled={actionLoading[request.id] === 'completing'}
                                            className="bg-purple-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                                        >
                                            {actionLoading[request.id] === 'completing' ? 'Completing...' : 'Mark Complete'}
                                        </button>

                                        <button
                                            onClick={() => handleArchiveRequest(request.id, request.type)}
                                            disabled={actionLoading[request.id] === 'archiving'}
                                            className="bg-gray-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
                                        >
                                            {actionLoading[request.id] === 'archiving' ? 'Archiving...' : 'Archive'}
                                        </button>

                                        <button
                                            onClick={() => handleDeleteRequest(request.id, request.type)}
                                            disabled={actionLoading[request.id] === 'deleting'}
                                            className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
                                        >
                                            {actionLoading[request.id] === 'deleting' ? 'Deleting...' : 'Delete'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                    <div className="text-gray-400 text-4xl mb-4">🟢</div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                        No active requests found
                    </h3>
                    <p className="text-gray-500 mb-6">
                        You don't have any active requests. Create one to start connecting with others!
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

            {/* Quick Stats Summary */}
            {requests.length > 0 && (
                <div className="mt-8 bg-green-50 rounded-lg p-6">
                    <h3 className="font-semibold text-green-900 mb-3">📊 Active Requests Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="text-center">
                            <div className="text-lg font-bold text-green-700">{stats.oneToOne}</div>
                            <div className="text-green-600">One-to-One</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-purple-700">{stats.group}</div>
                            <div className="text-purple-600">Group Sessions</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-blue-700">
                                {requests.filter(r => r.participants?.length > 0).length}
                            </div>
                            <div className="text-blue-600">With Participants</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-orange-700">
                                {requests.filter(r => r.views > 0).length}
                            </div>
                            <div className="text-orange-600">With Views</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActiveRequests;
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCompletedRequests } from '@/hooks/useRequests';

const CompletedRequests = () => {
    const {
        requests,
        stats,
        loading,
        error,
        deleteRequest
    } = useCompletedRequests();

    const [actionLoading, setActionLoading] = useState({});

    // Handle request actions
    const handleDeleteRequest = async (requestId, requestType) => {
        if (!window.confirm('Are you sure you want to delete this completed request? This action cannot be undone.')) {
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
        return 'bg-blue-100 text-blue-700';
    };

    const getStatusIcon = () => {
        return '✅';
    };

    // Calculate additional stats for completed requests
    const getCompletedStats = () => {
        const completedThisMonth = requests.filter(request => {
            const completedDate = request.completedAt || request.updatedAt;
            if (!completedDate) return false;

            const dateObj = completedDate instanceof Date ? completedDate : completedDate.toDate ? completedDate.toDate() : new Date(completedDate);
            const now = new Date();
            const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            return dateObj >= firstOfMonth;
        }).length;

        const totalParticipants = requests.reduce((sum, request) => {
            return sum + (request.participants?.length || 0);
        }, 0);

        const totalPayments = requests.reduce((sum, request) => {
            const amount = parseFloat(request.paymentAmount || 0);
            return sum + (isNaN(amount) ? 0 : amount);
        }, 0);

        return {
            completedThisMonth,
            totalParticipants,
            totalPayments,
            averageParticipants: requests.length > 0 ? (totalParticipants / requests.length).toFixed(1) : 0
        };
    };

    const completedStats = getCompletedStats();

    if (loading) {
        return (
            <div className="p-8">
                <div className="flex items-center justify-center min-h-96">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading your completed requests...</p>
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
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Completed Requests</h1>
                    <p className="text-gray-600">Successfully completed learning sessions</p>
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
                <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-blue-500">
                    <div className="text-lg font-bold text-blue-600">{requests.length}</div>
                    <div className="text-gray-500 text-sm">Total Completed</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-green-500">
                    <div className="text-lg font-bold text-green-600">{completedStats.completedThisMonth}</div>
                    <div className="text-gray-500 text-sm">This Month</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-purple-500">
                    <div className="text-lg font-bold text-purple-600">{completedStats.totalParticipants}</div>
                    <div className="text-gray-500 text-sm">Total Participants</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-orange-500">
                    <div className="text-lg font-bold text-orange-600">Rs.{completedStats.totalPayments.toFixed(2)}</div>
                    <div className="text-gray-500 text-sm">Total Value</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-teal-500">
                    <div className="text-lg font-bold text-teal-600">{completedStats.averageParticipants}</div>
                    <div className="text-gray-500 text-sm">Avg Participants</div>
                </div>
            </div>

            {/* Completed Requests List */}
            {requests.length > 0 ? (
                <div className="bg-white rounded-lg shadow-sm">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold">
                            Completed Requests ({requests.length})
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
                                                completed
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
                                                    <span>👥 {request.participants?.length || 0} participants</span>
                                                </>
                                            )}
                                            {request.type === 'group' && (
                                                <>
                                                    <span>🏷️ {request.category}</span>
                                                    <span>👍 {request.voteCount || 0} votes</span>
                                                    <span>👥 {request.participantCount || 0} participants</span>
                                                    {request.rate && <span>💰 {request.rate}</span>}
                                                </>
                                            )}
                                            {request.views > 0 && (
                                                <span>👀 {request.views} views</span>
                                            )}
                                            {request.completedAt && (
                                                <span className="text-green-600">✅ Completed {formatTimeAgo(request.completedAt)}</span>
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

                                        {/* Completion Info */}
                                        <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                            <div className="flex items-center gap-2 text-sm text-green-700">
                                                <span>✅</span>
                                                <span className="font-medium">Session completed successfully</span>
                                                {request.completedAt && (
                                                    <span className="text-green-600">
                                                        on {formatDate(request.completedAt)}
                                                    </span>
                                                )}
                                            </div>
                                            {request.participants && request.participants.length > 0 && (
                                                <div className="text-xs text-green-600 mt-1">
                                                    {request.participants.length} participant(s) attended
                                                </div>
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

                                        <button
                                            onClick={() => handleDeleteRequest(request.id, request.type)}
                                            disabled={actionLoading[request.id] === 'deleting'}
                                            className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
                                        >
                                            {actionLoading[request.id] === 'deleting' ? 'Deleting...' : 'Delete'}
                                        </button>

                                        {/* Add rating/feedback button for future implementation */}
                                        <button
                                            onClick={() => alert('Rating feature coming soon!')}
                                            className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded text-sm font-medium hover:bg-yellow-200 transition-colors"
                                        >
                                            Rate Session
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                    <div className="text-gray-400 text-4xl mb-4">✅</div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                        No completed requests found
                    </h3>
                    <p className="text-gray-500 mb-6">
                        You haven't completed any requests yet. Create and complete sessions to see them here.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <Link
                            to="/requests/active"
                            className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                            View Active Requests
                        </Link>
                        <Link
                            to="/requests/create"
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                        >
                            Create New Request
                        </Link>
                    </div>
                </div>
            )}

            {/* Achievement Summary */}
            {requests.length > 0 && (
                <div className="mt-8 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">🏆 Your Learning Achievements</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                            <div className="text-2xl font-bold text-blue-600">{requests.length}</div>
                            <div className="text-sm text-gray-600">Sessions Completed</div>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                            <div className="text-2xl font-bold text-green-600">{completedStats.totalParticipants}</div>
                            <div className="text-sm text-gray-600">People Helped</div>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                            <div className="text-2xl font-bold text-purple-600">{stats.oneToOne}</div>
                            <div className="text-sm text-gray-600">1:1 Sessions</div>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                            <div className="text-2xl font-bold text-orange-600">{stats.group}</div>
                            <div className="text-sm text-gray-600">Group Sessions</div>
                        </div>
                    </div>

                    {/* Success Rate */}
                    <div className="mt-4 p-4 bg-white rounded-lg shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Success Rate</span>
                            <span className="text-sm font-bold text-green-600">
                                {stats.total > 0 ? ((requests.length / stats.total) * 100).toFixed(1) : 0}%
                            </span>
                        </div>
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                style={{
                                    width: `${stats.total > 0 ? (requests.length / stats.total) * 100 : 0}%`
                                }}
                            ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            Based on {stats.total} total requests created
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompletedRequests;
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useActiveRequests } from '@/hooks/useRequests';
import unifiedRequestService from '@/services/unifiedRequestService';

const ActiveRequests = () => {
    const { requests, stats, loading, error } = useActiveRequests();
    const [actionLoading, setActionLoading] = useState({});
    const [requestResponses, setRequestResponses] = useState({});
    const [loadingResponses, setLoadingResponses] = useState({});

    // Handle request actions for active requests
    const handleCompleteRequest = async (requestId, requestType) => {
        if (!window.confirm('Mark this request as completed? This will end the meeting and complete the session.')) {
            return;
        }

        setActionLoading(prev => ({ ...prev, [requestId]: 'completing' }));

        try {
            const result = await unifiedRequestService.completeRequest(requestId, user.id);

            if (result.success) {
                alert(result.message);
                
                // Refresh the data to show updated status
                // The request will now appear in the completed page
                window.location.reload(); // Simple refresh for now
                
                // Alternative: You could implement a more sophisticated refresh
                // by updating local state or triggering a data refetch
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('Error completing request:', error);
            alert('Failed to complete request. Please try again.');
        } finally {
            setActionLoading(prev => ({ ...prev, [requestId]: null }));
        }
    };

    const handleArchiveRequest = async (requestId, requestType) => {
        if (!window.confirm('Archive this request? You can still access it in your archived requests.')) {
            return;
        }

        setActionLoading(prev => ({ ...prev, [requestId]: 'archiving' }));

        try {
            const result = await unifiedRequestService.archiveRequest(requestId);

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

    const handleJoinMeeting = (meetingUrl, requestId) => {
        if (meetingUrl) {
            // Get user's display name for the meeting
            const userName = user?.displayName || user?.name || 'User';
            
            // Create meeting URL with pre-filled username
            let enhancedMeetingUrl = meetingUrl;
            
            // Check if URL already has parameters
            if (enhancedMeetingUrl.includes('?')) {
                enhancedMeetingUrl += `&userInfo.displayName=${encodeURIComponent(userName)}`;
            } else {
                enhancedMeetingUrl += `?userInfo.displayName=${encodeURIComponent(userName)}`;
            }
            
            // Add additional Jitsi parameters for better user experience
            enhancedMeetingUrl += `&userInfo.email=${encodeURIComponent(user?.email || '')}`;
            enhancedMeetingUrl += `&config.prejoinPageEnabled=false`; // Skip pre-join page
            enhancedMeetingUrl += `&config.disableDeepLinking=true`; // Prevent deep linking issues
            
            console.log('🎥 Joining meeting with enhanced URL:', enhancedMeetingUrl);
            
            // Open meeting in new tab with enhanced URL
            window.open(enhancedMeetingUrl, '_blank');
        } else {
            alert('Meeting link not available. Please contact support.');
        }
    };

    // Fetch response details for a specific request
    const fetchRequestResponses = async (requestId) => {
        if (requestResponses[requestId] || loadingResponses[requestId]) return;

        setLoadingResponses(prev => ({ ...prev, [requestId]: true }));
        
        try {
            const responses = await unifiedRequestService.getRequestResponses(requestId);
            setRequestResponses(prev => ({ ...prev, [requestId]: responses }));
        } catch (error) {
            console.error('Error fetching request responses:', error);
        } finally {
            setLoadingResponses(prev => ({ ...prev, [requestId]: false }));
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
        return '🔵';
    };

    // Fetch response details for active requests
    useEffect(() => {
        if (requests.length > 0) {
            requests.forEach(request => {
                if (request.acceptedBy) {
                    fetchRequestResponses(request.id);
                }
            });
        }
    }, [requests]);

    // Listen for meeting leave messages from Jitsi tab
    useEffect(() => {
        const handleMessage = (event) => {
            if (event.data?.type === 'MEETING_LEFT' && event.data?.action === 'redirect_to_request') {
                console.log('📨 Received meeting leave message:', event.data);
                
                // Find the request that was left
                if (event.data.requestId) {
                    const request = requests.find(r => r.id === event.data.requestId);
                    if (request) {
                        console.log('✅ Meeting left for request:', request.id);
                    }
                }
                
                // Show a notification that the meeting was left
                alert('Meeting left successfully. You have been redirected back to your request.');
            }
        };

        // Add message listener
        window.addEventListener('message', handleMessage);

        // Cleanup
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [requests]);

    if (loading) {
        return (
            <div className="p-8 bg-slate-900 min-h-screen">
                <div className="flex items-center justify-center min-h-96">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-slate-300">Loading your active requests...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 bg-slate-900 min-h-screen">
                <div className="bg-red-900 border border-red-700 rounded-lg p-6 text-center">
                    <div className="text-red-400 text-4xl mb-4">⚠️</div>
                    <h3 className="text-lg font-semibold text-red-200 mb-2">Error Loading Requests</h3>
                    <p className="text-red-300 mb-4">{error}</p>
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
        <div className="p-8 bg-slate-900 min-h-screen">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">Active Requests</h1>
                    <p className="text-slate-300">Your requests that have been accepted and have active meetings</p>
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

            {/* Flow Info */}
            <div className="bg-blue-900 rounded-lg p-4 mb-8 border border-blue-700">
                <div className="flex items-center gap-3 mb-2">
                    <span className="text-blue-400 text-xl">🔵</span>
                    <h3 className="font-semibold text-blue-200">Active Request Status</h3>
                </div>
                <div className="text-blue-100 text-sm">
                    <p>These requests have been <strong>accepted by others</strong> and have <strong>active meeting rooms</strong>. You can join meetings, communicate with participants, and complete sessions when finished.</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-6 gap-4 mb-8">
                <div className="bg-slate-800 rounded-lg p-4 shadow-sm border-l-4 border-blue-500">
                    <div className="text-lg font-bold text-blue-400">{requests.length}</div>
                    <div className="text-slate-300 text-sm">Active Requests</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 shadow-sm border-l-4 border-green-500">
                    <div className="text-lg font-bold text-green-400">
                        {requests.filter(r => r.acceptedBy).length}
                    </div>
                    <div className="text-slate-300 text-sm">Accepted Requests</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 shadow-sm border-l-4 border-purple-500">
                    <div className="text-lg font-bold text-purple-400">
                        {requests.filter(r => r.meetingUrl).length}
                    </div>
                    <div className="text-slate-300 text-sm">With Meetings</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 shadow-sm border-l-4 border-orange-500">
                    <div className="text-lg font-bold text-orange-400">
                        {requests.filter(r => r.participantCount > 0).length}
                    </div>
                    <div className="text-slate-300 text-sm">With Participants</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 shadow-sm border-l-4 border-teal-500">
                    <div className="text-lg font-bold text-teal-400">
                        {requests.filter(r => r.paymentAmount && parseFloat(r.paymentAmount) > 0).length}
                    </div>
                    <div className="text-slate-300 text-sm">Paid Sessions</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 shadow-sm border-l-4 border-indigo-500">
                    <div className="text-lg font-bold text-indigo-400">
                        {requests.filter(r => r.acceptedAt && new Date() - r.acceptedAt < 24 * 60 * 60 * 1000).length}
                    </div>
                    <div className="text-slate-300 text-sm">Accepted Today</div>
                </div>
            </div>

            {/* Active Requests List */}
            {requests.length > 0 ? (
                <div className="bg-slate-800 rounded-lg shadow-sm">
                    <div className="p-6 border-b border-slate-700">
                        <h2 className="text-lg font-semibold text-white">
                            Active Requests ({requests.length})
                        </h2>
                    </div>

                    <div className="divide-y divide-slate-700">
                        {requests.map((request) => (
                            <div key={`${request.type}-${request.id}`} className="p-6 hover:bg-slate-700 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-xl">{getStatusIcon()}</span>
                                            <h3 className="text-lg font-semibold text-white">{request.title || request.topic}</h3>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor()}`}>
                                                active
                                            </span>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                request.type === 'group' ? 'bg-purple-900 text-purple-200' : 'bg-blue-900 text-blue-200'
                                            }`}>
                                                {request.type === 'group' ? '👥 Group' : '👤 1:1'}
                                            </span>
                                            {request.meetingUrl && (
                                                <span className="px-2 py-1 rounded text-xs font-medium bg-green-900 text-green-200">
                                                    🎥 Meeting Ready
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-slate-300 mb-3 line-clamp-2">{request.description}</p>

                                        <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
                                            <span>📚 {request.subject}</span>
                                            <span>📅 {formatDate(request.preferredDate)}</span>
                                            <span>⏰ {request.preferredTime || 'Not set'}</span>
                                            <span>💰 {request.currency || 'Rs.'}{request.paymentAmount || '0'}</span>
                                            <span>⏱️ {request.duration || '60'} min</span>
                                            {request.acceptedBy && (
                                                <span className="text-green-400">✅ Accepted by {request.acceptedByName}</span>
                                            )}
                                        </div>
                                        
                                        {/* Acceptance Status */}
                                        {request.acceptedBy && (
                                            <div className="flex items-center gap-2 text-sm text-green-400 mb-3">
                                                <span>🎯 Status: Active (Accepted)</span>
                                                {request.acceptedAt && (
                                                    <>
                                                        <span>•</span>
                                                        <span>Accepted {formatTimeAgo(request.acceptedAt)}</span>
                                                    </>
                                                )}
                                                {request.meetingStatus && (
                                                    <>
                                                        <span>•</span>
                                                        <span>Meeting: {request.meetingStatus}</span>
                                                    </>
                                                )}
                                            </div>
                                        )}

                                        {request.tags && request.tags.length > 0 && (
                                            <div className="flex gap-2 mb-3">
                                                {request.tags.map((tag, index) => (
                                                    <span key={index} className="bg-slate-700 text-slate-200 px-2 py-1 rounded text-xs">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Acceptance and Meeting Info */}
                                        <div className="bg-blue-900 rounded-lg p-3 mb-3 border border-blue-700">
                                            <div className="flex items-start gap-3">
                                                <span className="text-blue-300 text-lg">🎯</span>
                                                <div className="flex-1">
                                                    <div className="font-medium text-blue-200 mb-1">Request Status</div>
                                                    <div className="text-blue-100 text-sm space-y-1">
                                                        {request.acceptedAt && (
                                                            <div>• Accepted {formatTimeAgo(request.acceptedAt)} by {request.acceptedByName}</div>
                                                        )}
                                                        {request.meetingStatus && (
                                                            <div>• Meeting Status: {request.meetingStatus}</div>
                                                        )}
                                                        {request.participants && request.participants.length > 0 && (
                                                            <div>• {request.participants.length} participant(s) joined</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                                                                {/* Accepter Details */}
                                        {request.acceptedBy && (
                                            <div className="bg-green-900 rounded-lg p-3 mb-3 border border-green-700">
                                                <div className="flex items-start gap-3">
                                                    <span className="text-green-300 text-lg">✅</span>
                                                    <div className="flex-1">
                                                        <div className="font-medium text-green-200 mb-2">Accepter Information</div>
                                                        <div className="text-green-100 text-sm space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium">Name:</span>
                                                                <span>{request.acceptedByName || 'Unknown'}</span>
                                                            </div>
                                                            {request.acceptedAt && (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium">Accepted:</span>
                                                                <span>{formatTimeAgo(request.acceptedAt)}</span>
                                                            </div>
                                                            )}
                                                            {request.meetingId && (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium">Meeting ID:</span>
                                                                    <span className="font-mono text-xs">{request.meetingId}</span>
                                                                </div>
                                                            )}
                                                            {request.roomId && (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium">Room ID:</span>
                                                                    <span className="font-mono text-xs">{request.roomId}</span>
                                                                </div>
                                                            )}
                                                            {/* Show accepter's response message if available */}
                                                            {requestResponses[request.id] && requestResponses[request.id].length > 0 && (
                                                                requestResponses[request.id].find(r => r.status === 'accepted')?.message && (
                                                                    <div className="flex items-start gap-2 mt-2 pt-2 border-t border-green-600">
                                                                        <span className="font-medium">Message:</span>
                                                                        <span className="italic">"{requestResponses[request.id].find(r => r.status === 'accepted')?.message}"</span>
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Response Details */}
                                        {request.acceptedBy && (
                                            <div className="bg-purple-900 rounded-lg p-3 mb-3 border border-purple-700">
                                                <div className="flex items-start gap-3">
                                                    <span className="text-purple-300 text-lg">💬</span>
                                                    <div className="flex-1">
                                                        <div className="font-medium text-purple-200 mb-2">Response Details</div>
                                                        {loadingResponses[request.id] ? (
                                                            <div className="text-purple-100 text-sm">Loading response details...</div>
                                                        ) : requestResponses[request.id] && requestResponses[request.id].length > 0 ? (
                                                            <div className="text-purple-100 text-sm space-y-2">
                                                                {requestResponses[request.id].map((response, index) => (
                                                                    <div key={response.id} className="border-l-2 border-purple-500 pl-3">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className="font-medium">Status:</span>
                                                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                                                response.status === 'accepted' 
                                                                                    ? 'bg-green-900 text-green-300' 
                                                                                    : 'bg-red-900 text-red-300'
                                                                            }`}>
                                                                                {response.status}
                                                                            </span>
                                                                        </div>
                                                                        {response.message && (
                                                                            <div className="flex items-center gap-2 mb-1">
                                                                                <span className="font-medium">Message:</span>
                                                                                <span>{response.message}</span>
                                                                            </div>
                                                                        )}
                                                                        <div className="flex items-center gap-2 text-xs text-purple-300">
                                                                            <span>Responded:</span>
                                                                            <span>{formatTimeAgo(response.createdAt)}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="text-purple-100 text-sm">No response details available</div>
                                                        )}
                                                    </div>
                                                </div>
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

                                        {/* Meeting Access */}
                                        {request.meetingUrl ? (
                                            <button
                                                onClick={() => handleJoinMeeting(request.meetingUrl, request.id)}
                                                className="bg-green-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-green-700 transition-colors"
                                            >
                                                🎥 Join Meeting
                                            </button>
                                        ) : (
                                            <div className="bg-yellow-900 text-yellow-300 px-3 py-1 rounded text-xs text-center border border-yellow-700">
                                                Meeting being set up...
                                            </div>
                                        )}

                                        {/* Communication Options */}
                                        <button
                                            onClick={() => alert('Messaging feature coming soon!')}
                                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
                                        >
                                            💬 Message
                                        </button>

                                        {/* Session Management */}
                                        <button
                                            onClick={() => handleCompleteRequest(request.id, request.type)}
                                            disabled={actionLoading[request.id] === 'completing'}
                                            className="bg-purple-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                                        >
                                            {actionLoading[request.id] === 'completing' ? 'Completing...' : '✅ Complete Session'}
                                        </button>

                                        <button
                                            onClick={() => handleArchiveRequest(request.id, request.type)}
                                            disabled={actionLoading[request.id] === 'archiving'}
                                            className="bg-gray-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
                                        >
                                            {actionLoading[request.id] === 'archiving' ? 'Archiving...' : '📁 Archive'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-slate-800 rounded-lg shadow-sm p-12 text-center">
                    <div className="text-slate-400 text-4xl mb-4">🔵</div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                        No active requests found
                    </h3>
                    <p className="text-slate-300 mb-6">
                        You don't have any active requests. Create a request and wait for someone to accept it!
                    </p>
                    <div className="flex gap-3 justify-center">
                        <Link
                            to="/requests/create"
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                        >
                            Create Request
                        </Link>
                        <Link
                            to="/requests/my-requests"
                            className="text-blue-400 hover:text-blue-300 font-medium px-6 py-2"
                        >
                            View All My Requests
                        </Link>
                    </div>
                </div>
            )}

            {/* Quick Actions Summary */}
            {requests.length > 0 && (
                <div className="mt-8 bg-gradient-to-r from-blue-900 to-green-900 rounded-lg p-6">
                    <h3 className="font-semibold text-white mb-4">🎯 Active Session Management</h3>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        <div className="text-center p-4 bg-slate-800 rounded-lg shadow-sm">
                            <div className="text-2xl font-bold text-green-400">{requests.filter(r => r.acceptedBy).length}</div>
                            <div className="text-sm text-slate-300">Accepted Requests</div>
                        </div>
                        <div className="text-center p-4 bg-slate-800 rounded-lg shadow-sm">
                            <div className="text-2xl font-bold text-emerald-400">
                                {requests.filter(r => r.acceptedBy).map(r => r.acceptedByName).filter((name, index, arr) => arr.indexOf(name) === index).length}
                            </div>
                            <div className="text-sm text-slate-300">Unique Acceptees</div>
                        </div>
                        <div className="text-center p-4 bg-slate-800 rounded-lg shadow-sm">
                            <div className="text-2xl font-bold text-blue-400">{requests.filter(r => r.meetingUrl).length}</div>
                            <div className="text-sm text-slate-300">Ready for Meetings</div>
                        </div>
                        <div className="text-center p-4 bg-slate-800 rounded-lg shadow-sm">
                            <div className="text-2xl font-bold text-purple-400">{requests.filter(r => r.participantCount > 0).length}</div>
                            <div className="text-sm text-slate-300">Active Participants</div>
                        </div>
                        <div className="text-center p-4 bg-slate-800 rounded-lg shadow-sm">
                            <div className="text-2xl font-bold text-orange-400">
                                {requests.reduce((sum, r) => sum + (parseFloat(r.paymentAmount) || 0), 0).toFixed(0)}
                            </div>
                            <div className="text-sm text-slate-300">Total Value (Rs.)</div>
                        </div>
                        <div className="text-center p-4 bg-slate-800 rounded-lg shadow-sm">
                            <div className="text-2xl font-bold text-teal-400">
                                {requests.reduce((sum, r) => sum + (parseInt(r.duration) || 60), 0)}
                            </div>
                            <div className="text-sm text-slate-300">Total Minutes</div>
                        </div>
                    </div>

                    {/* Quick Tips */}
                    <div className="mt-4 p-4 bg-slate-800 rounded-lg shadow-sm">
                        <div className="text-sm text-slate-300">
                            <strong className="text-white">💡 Quick Tips:</strong>
                            <div className="mt-2 space-y-1">
                                <div>• View accepter details and response messages in each request card</div>
                                <div>• Click "Join Meeting" to start your session when ready</div>
                                <div>• Use "Message" to communicate with participants before/during sessions</div>
                                <div>• Complete sessions when finished to help track your progress</div>
                                <div>• Archive old requests to keep your active list organized</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActiveRequests;
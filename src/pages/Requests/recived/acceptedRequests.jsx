import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAcceptedRequests } from '@/hooks/useRequests';
import integratedRequestService from '@/services/integratedRequestService';

const AcceptedRequests = () => {
    const { user } = useAuth();
    const { responses, loading, error } = useAcceptedRequests();
    const [selected, setSelected] = useState(null);
    const [actionLoading, setActionLoading] = useState({});

    // Update selected when responses change
    useEffect(() => {
        if (responses.length > 0 && !selected) {
            setSelected(responses[0]);
        } else if (selected && !responses.find(r => r.id === selected.id)) {
            setSelected(responses[0] || null);
        }
    }, [responses, selected]);

    // Handle request selection
    const handleRequestClick = (response, event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        console.log('🎯 Accepted request selected:', response.id);
        setSelected(response);
    };

    // Handle meeting actions
    const handleJoinMeeting = (meetingUrl, requestId) => {
        if (meetingUrl) {
            // Track meeting join
            integratedRequestService.joinMeeting(requestId, user.id, user.displayName || user.name);
            // Open meeting in new tab
            window.open(meetingUrl, '_blank');
        } else {
            alert('Meeting link not available. Please contact the requester.');
        }
    };

    // Handle session completion
    const handleCompleteSession = async (requestId) => {
        if (!window.confirm('Mark this session as completed? This will end the meeting.')) {
            return;
        }

        setActionLoading(prev => ({ ...prev, [requestId]: 'completing' }));

        try {
            const result = await integratedRequestService.completeRequest(requestId);

            if (result.success) {
                alert(result.message);
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('Error completing session:', error);
            alert('Failed to complete session. Please try again.');
        } finally {
            setActionLoading(prev => ({ ...prev, [requestId]: null }));
        }
    };

    // Handle archive
    const handleArchiveResponse = async (responseId) => {
        if (!window.confirm('Archive this request? You can still access it in your archived requests.')) {
            return;
        }

        setActionLoading(prev => ({ ...prev, [responseId]: 'archiving' }));

        try {
            // This would need to be implemented in the service
            alert('Archive feature will be implemented soon.');
        } catch (error) {
            console.error('Error archiving response:', error);
            alert('Failed to archive response. Please try again.');
        } finally {
            setActionLoading(prev => ({ ...prev, [responseId]: null }));
        }
    };

    // Action buttons for accepted requests
    const renderActionButtons = (response) => {
        const requestData = response.requestData;

        return (
            <div className="space-y-3 mt-4">
                <div className="bg-green-900 text-green-300 rounded px-4 py-2 text-sm text-center flex items-center justify-center gap-2 border border-green-700">
                    <span>✅</span>
                    <span>Request Accepted</span>
                </div>

                {/* Meeting Management */}
                {requestData?.meetingUrl ? (
                    <button
                        className="bg-green-600 text-white rounded px-4 py-2 font-medium text-sm hover:bg-green-700 transition-colors w-full"
                        onClick={() => handleJoinMeeting(requestData.meetingUrl, requestData.id)}
                    >
                        🎥 Join Meeting
                    </button>
                ) : (
                    <div className="bg-yellow-900 text-yellow-300 rounded px-4 py-2 text-sm text-center border border-yellow-700">
                        Meeting being set up...
                    </div>
                )}

                {/* Session management buttons */}
                <div className="flex gap-2">
                    <button
                        className="bg-purple-600 text-white rounded px-4 py-2 font-medium text-sm hover:bg-purple-700 transition-colors flex-1"
                        onClick={() => handleCompleteSession(requestData?.id)}
                        disabled={actionLoading[requestData?.id] === 'completing'}
                    >
                        {actionLoading[requestData?.id] === 'completing' ? 'Completing...' : '✅ Complete'}
                    </button>
                    <button
                        className="bg-[#2D3748] text-[#A0AEC0] rounded px-4 py-2 font-medium text-sm hover:bg-[#4A5568] transition-colors border border-[#4A5568]"
                        onClick={() => handleArchiveResponse(response.id)}
                        disabled={actionLoading[response.id] === 'archiving'}
                    >
                        {actionLoading[response.id] === 'archiving' ? 'Archiving...' : '📁 Archive'}
                    </button>
                </div>

                {/* Contact options */}
                <div className="grid grid-cols-2 gap-2">
                    <button
                        className="bg-[#2D3748] text-green-400 rounded px-3 py-2 text-sm hover:bg-[#4A5568] transition-colors border border-[#4A5568]"
                        onClick={() => alert('Messaging feature coming soon!')}
                    >
                        💬 Message
                    </button>
                    <button
                        className="bg-[#2D3748] text-purple-400 rounded px-3 py-2 text-sm hover:bg-[#4A5568] transition-colors border border-[#4A5568]"
                        onClick={() => alert('Scheduling feature coming soon!')}
                    >
                        📅 Schedule
                    </button>
                </div>
            </div>
        );
    };

    // Get status badge
    const getStatusBadge = (status) => {
        return (
            <span className="text-xs px-2 py-0.5 rounded font-medium bg-green-900 text-green-300 border border-green-700">
                Accepted
            </span>
        );
    };

    // Format time ago
    const formatTimeAgo = (date) => {
        if (!date) return 'Unknown';
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return `${Math.floor(diffDays / 7)}w ago`;
    };

    // Calculate stats
    const getStats = () => {
        return {
            total: responses.length,
            withMeetings: responses.filter(r => r.requestData?.meetingUrl).length,
            subjects: new Set(responses.map(r => r.requestData?.subject).filter(Boolean)).size,
            thisWeek: responses.filter(r => new Date() - r.createdAt < 7 * 24 * 60 * 60 * 1000).length
        };
    };

    const stats = getStats();

    if (loading) {
        return (
            <div className="p-8 bg-[#1A202C] min-h-screen">
                <div className="flex items-center justify-center min-h-96">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4299E1] mx-auto"></div>
                        <p className="mt-4 text-[#A0AEC0]">Loading accepted requests...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 bg-[#1A202C] min-h-screen">
                <div className="bg-red-900 border border-red-700 rounded-lg p-6 text-center">
                    <div className="text-red-400 text-4xl mb-4">⚠️</div>
                    <h3 className="text-lg font-semibold text-red-300 mb-2">Error Loading Requests</h3>
                    <p className="text-red-400 mb-4">{error}</p>
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
        <div className="p-8 bg-[#1A202C] min-h-screen">
            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white mb-2">Accepted Requests</h1>
                <p className="text-[#A0AEC0]">Requests you have accepted and are currently managing</p>
            </div>

            {/* Flow Info */}
            <div className="bg-green-900 rounded-lg p-4 mb-8 border border-green-700">
                <div className="flex items-center gap-3 mb-2">
                    <span className="text-green-400 text-xl">✅</span>
                    <h3 className="font-semibold text-green-200">Accepted Request Status</h3>
                </div>
                <div className="text-green-100 text-sm">
                    <p>These are requests from other students that you have <strong>accepted</strong>. You can join meetings, manage sessions, and complete them when finished.</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="bg-[#2D3748] rounded-lg p-4 shadow-sm border-l-4 border-green-500">
                    <div className="text-lg font-bold text-green-400">{stats.total}</div>
                    <div className="text-[#A0AEC0] text-sm">Accepted Requests</div>
                </div>
                <div className="bg-[#2D3748] rounded-lg p-4 shadow-sm border-l-4 border-blue-500">
                    <div className="text-lg font-bold text-[#4299E1]">{stats.withMeetings}</div>
                    <div className="text-[#A0AEC0] text-sm">With Meetings</div>
                </div>
                <div className="bg-[#2D3748] rounded-lg p-4 shadow-sm border-l-4 border-purple-500">
                    <div className="text-lg font-bold text-purple-400">{stats.subjects}</div>
                    <div className="text-[#A0AEC0] text-sm">Subjects Teaching</div>
                </div>
                <div className="bg-[#2D3748] rounded-lg p-4 shadow-sm border-l-4 border-orange-500">
                    <div className="text-lg font-bold text-orange-400">{stats.thisWeek}</div>
                    <div className="text-[#A0AEC0] text-sm">Accepted This Week</div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex gap-6">
                {/* Request Feed */}
                <section className="flex-1 bg-[#2D3748] rounded-lg shadow-sm p-6 min-h-[600px]">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold text-xl text-white">
                            Accepted Requests ({responses.length})
                        </h2>
                        <div className="flex gap-2">
                            <select className="bg-[#1A202C] border border-[#4A5568] rounded-lg px-3 py-1 text-sm text-[#A0AEC0]">
                                <option>Sort by: Recent</option>
                                <option>Sort by: Subject</option>
                                <option>Sort by: Meeting Status</option>
                                <option>Sort by: Acceptance Date</option>
                            </select>
                        </div>
                    </div>

                    {responses.length > 0 ? (
                        <div className="flex flex-col gap-2">
                            {responses.map((response) => {
                                const requestData = response.requestData;
                                return (
                                    <div
                                        key={response.id}
                                        className={`flex items-start gap-3 p-3 rounded cursor-pointer border transition-colors ${
                                            selected?.id === response.id
                                                ? 'border-[#4299E1] bg-[#1A202C]'
                                                : 'border-transparent hover:bg-[#1A202C]'
                                        }`}
                                        onClick={(e) => handleRequestClick(response, e)}
                                    >
                                        <img
                                            src={requestData?.userAvatar || `https://ui-avatars.com/api/?name=${requestData?.userName}&background=3b82f6&color=fff`}
                                            alt={requestData?.userName || 'User'}
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                        <div className="flex-1">
                                            <div className="font-semibold text-white">{requestData?.userName || 'Unknown User'}</div>
                                            <div className="text-[#A0AEC0] text-sm">{requestData?.title || requestData?.topic || 'No title'}</div>
                                            <div className="text-[#A0AEC0] text-xs truncate max-w-xs">
                                                {requestData?.description?.substring(0, 80)}...
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-[#A0AEC0]">📚 {requestData?.subject || 'General'}</span>
                                                <span className="text-xs text-[#A0AEC0]">⏰ {requestData?.duration || '60'} min</span>
                                                {response.createdAt && (
                                                    <span className="text-xs text-green-400">✅ Accepted {formatTimeAgo(response.createdAt)}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-xs text-[#A0AEC0]">{formatTimeAgo(response.createdAt)}</span>
                                            {requestData?.paymentAmount && parseFloat(requestData.paymentAmount) > 0 && (
                                                <span className="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded font-medium border border-green-700">
                                                    Rs.{requestData.paymentAmount}
                                                </span>
                                            )}
                                            {requestData?.meetingUrl && (
                                                <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded font-medium border border-blue-700">
                                                    🎥 Meeting Ready
                                                </span>
                                            )}
                                            {getStatusBadge(response.status)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="text-[#A0AEC0] text-4xl mb-4">✅</div>
                            <h3 className="text-lg font-semibold text-white mb-2">
                                No accepted requests
                            </h3>
                            <p className="text-[#A0AEC0]">
                                You haven't accepted any requests yet. Check available requests to get started.
                            </p>
                            <div className="mt-4">
                                <a href="/requests/pending-offers" className="text-blue-400 hover:text-blue-300 font-medium">
                                    Browse Available Requests →
                                </a>
                            </div>
                        </div>
                    )}
                </section>

                {/* Request Details */}
                {selected && (
                    <aside className="w-[400px] bg-[#2D3748] rounded-lg shadow-sm p-6 border border-[#4A5568] flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <img
                                src={selected.requestData?.userAvatar || `https://ui-avatars.com/api/?name=${selected.requestData?.userName}&background=3b82f6&color=fff`}
                                alt={selected.requestData?.userName || 'User'}
                                className="w-14 h-14 rounded-full object-cover"
                            />
                            <div className="flex-1">
                                <div className="font-bold text-lg text-white">{selected.requestData?.userName || 'Unknown User'}</div>
                                <div className="text-[#A0AEC0] text-sm">Student</div>
                                <div className="flex items-center gap-2 text-xs text-[#A0AEC0]">
                                    <span>⭐ 4.5</span>
                                    <span>•</span>
                                    <span>0 sessions</span>
                                </div>
                                <div
                                    className="text-[#4299E1] text-xs font-medium cursor-pointer hover:underline"
                                    onClick={() => alert('Profile view feature coming soon!')}
                                >
                                    View Full Profile
                                </div>
                            </div>
                        </div>

                        {/* Request Details */}
                        <div className="border-t border-[#4A5568] pt-4">
                            <div className="font-semibold text-white mb-2">{selected.requestData?.title || selected.requestData?.topic || 'No title'}</div>

                            <div className="space-y-2 text-sm mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-[#A0AEC0]">📚 Subject:</span>
                                    <span className="text-white">{selected.requestData?.subject || 'General'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-[#A0AEC0]">📅 Date:</span>
                                    <span className="text-white">
                                        {selected.requestData?.preferredDate ? new Date(selected.requestData.preferredDate).toLocaleDateString() : 'Not specified'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-[#A0AEC0]">⏰ Time:</span>
                                    <span className="text-white">{selected.requestData?.preferredTime || 'Not specified'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-[#A0AEC0]">⏱️ Duration:</span>
                                    <span className="text-white">{selected.requestData?.duration || '60'} minutes</span>
                                </div>
                                {selected.requestData?.paymentAmount && parseFloat(selected.requestData.paymentAmount) > 0 && (
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-[#A0AEC0]">💰 Payment:</span>
                                        <span className="text-green-400 font-semibold">Rs.{selected.requestData.paymentAmount}</span>
                                    </div>
                                )}
                                {selected.createdAt && (
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-[#A0AEC0]">✅ Accepted:</span>
                                        <span className="text-green-400 font-semibold">{formatTimeAgo(selected.createdAt)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Tags */}
                            {selected.requestData?.tags && selected.requestData.tags.length > 0 && (
                                <div className="mb-4">
                                    <span className="font-medium text-[#A0AEC0] text-sm block mb-2">Tags:</span>
                                    <div className="flex flex-wrap gap-1">
                                        {selected.requestData.tags.map((tag, index) => (
                                            <span key={index} className="bg-[#1A202C] text-[#A0AEC0] px-2 py-1 rounded text-xs border border-[#4A5568]">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Message */}
                            <div className="mb-4">
                                <span className="font-medium text-[#A0AEC0] text-sm block mb-2">Description:</span>
                                <div className="text-white text-sm bg-[#1A202C] rounded p-3 border border-[#4A5568] whitespace-pre-line">
                                    {selected.requestData?.description || 'No description provided'}
                                </div>
                            </div>

                            {/* Meeting Status */}
                            {selected.requestData?.meetingUrl && (
                                <div className="bg-blue-900 rounded-lg p-3 mb-4 border border-blue-700">
                                    <div className="text-sm">
                                        <div className="font-medium text-blue-200 mb-1">🎥 Meeting Information</div>
                                        <div className="text-blue-100 text-xs space-y-1">
                                            <div>• Meeting room is ready</div>
                                            <div>• Status: {selected.requestData.meetingStatus || 'scheduled'}</div>
                                            <div>• Click "Join Meeting" to start session</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Response Message */}
                            {selected.message && (
                                <div className="bg-[#1A202C] rounded-lg p-3 mb-4 border border-[#4A5568]">
                                    <div className="text-sm">
                                        <div className="font-medium text-white mb-1">Your Response</div>
                                        <div className="text-[#A0AEC0] text-xs">"{selected.message}"</div>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            {renderActionButtons(selected)}

                            {/* Report Option */}
                            <div
                                className="text-[#A0AEC0] text-xs mt-4 cursor-pointer hover:text-red-400 transition-colors text-center border-t border-[#4A5568] pt-4"
                                onClick={() => alert('Report feature coming soon!')}
                            >
                                🚩 Report Request
                            </div>
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
};

export default AcceptedRequests;
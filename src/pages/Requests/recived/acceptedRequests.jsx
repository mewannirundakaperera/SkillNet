import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAcceptedRequests } from '@/hooks/useRequests';
import unifiedRequestService from '@/services/unifiedRequestService';

const AcceptedRequests = () => {
    const { user } = useAuth();
    const { responses, loading, error } = useAcceptedRequests();
    const [selected, setSelected] = useState(null);
    const [actionLoading, setActionLoading] = useState({});

    // Debug logging
    useEffect(() => {
        console.log('🔍 AcceptedRequests Debug:', {
            user: user?.id,
            responsesCount: responses?.length,
            loading,
            error,
            responses: responses?.slice(0, 2) // Log first 2 responses for debugging
        });
    }, [user, responses, loading, error]);

    // Listen for meeting leave messages from Jitsi tab
    useEffect(() => {
        const handleMessage = (event) => {
            if (event.data?.type === 'MEETING_LEFT' && event.data?.action === 'redirect_to_request') {
                console.log('📨 Received meeting leave message:', event.data);
                
                // Find the request that was left
                if (event.data.requestId) {
                    const request = responses.find(r => r.requestId === event.data.requestId);
                    if (request) {
                        setSelected(request);
                        console.log('✅ Redirected to request:', request.id);
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
    }, [responses]);

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
            unifiedRequestService.joinMeeting(requestId, user.id, user.displayName || user.name);
            
            // Get user's display name for the meeting
            const userName = user.displayName || user.name || 'User';
            
            // Create meeting URL with pre-filled username
            let enhancedMeetingUrl = meetingUrl;
            
            // Check if URL already has parameters
            if (enhancedMeetingUrl.includes('?')) {
                enhancedMeetingUrl += `&userInfo.displayName=${encodeURIComponent(userName)}`;
            } else {
                enhancedMeetingUrl += `?userInfo.displayName=${encodeURIComponent(userName)}`;
            }
            
            // Add additional Jitsi parameters for better user experience
            enhancedMeetingUrl += `&userInfo.email=${encodeURIComponent(user.email || '')}`;
            enhancedMeetingUrl += `&config.prejoinPageEnabled=false`; // Skip pre-join page
            enhancedMeetingUrl += `&config.disableDeepLinking=true`; // Prevent deep linking issues
            
            console.log('🎥 Joining meeting with enhanced URL:', enhancedMeetingUrl);
            
            // Open meeting in new tab with enhanced URL
            window.open(enhancedMeetingUrl, '_blank');
        } else {
            alert('Meeting link not available. Please contact the requester.');
        }
    };

    // Check if meeting can be completed based on scheduled time
    const canCompleteMeeting = (requestData) => {
        if (!requestData?.preferredDate || !requestData?.preferredTime || !requestData?.duration) {
            return false; // Cannot complete if no schedule info
        }

        try {
            // Parse scheduled start time
            const scheduledStart = new Date(`${requestData.preferredDate}T${requestData.preferredTime}`);
            const now = new Date();
            
            // Calculate meeting duration in minutes
            const durationMinutes = parseInt(requestData.duration) || 60;
            
            // Calculate when half the time has passed
            const halfTimePassed = new Date(scheduledStart.getTime() + (durationMinutes * 30 * 1000)); // Half of duration
            
            // Check if current time is after half the scheduled time
            const canComplete = now >= halfTimePassed;
            
            console.log('⏰ Meeting completion check:', {
                scheduledStart: scheduledStart.toLocaleString(),
                duration: durationMinutes + ' minutes',
                halfTimePassed: halfTimePassed.toLocaleString(),
                currentTime: now.toLocaleString(),
                canComplete
            });
            
            return canComplete;
        } catch (error) {
            console.error('❌ Error checking meeting completion eligibility:', error);
            return false;
        }
    };

    // Get time information until meeting can be completed
    const getTimeUntilCompletion = (requestData) => {
        if (!requestData?.preferredDate || !requestData?.preferredTime || !requestData?.duration) {
            return 'No schedule info';
        }

        try {
            const scheduledStart = new Date(`${requestData.preferredDate}T${requestData.preferredTime}`);
            const now = new Date();
            const durationMinutes = parseInt(requestData.duration) || 60;
            const halfTimePassed = new Date(scheduledStart.getTime() + (durationMinutes * 30 * 1000));
            
            // If meeting hasn't started yet
            if (now < scheduledStart) {
                const timeUntilStart = scheduledStart - now;
                const hoursUntilStart = Math.floor(timeUntilStart / (1000 * 60 * 60));
                const minutesUntilStart = Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60));
                
                if (hoursUntilStart > 0) {
                    return `Starts in ${hoursUntilStart}h ${minutesUntilStart}m`;
                } else {
                    return `Starts in ${minutesUntilStart}m`;
                }
            }
            
            // If meeting is in progress but half time hasn't passed
            if (now < halfTimePassed) {
                const timeUntilHalf = halfTimePassed - now;
                const minutesUntilHalf = Math.ceil(timeUntilHalf / (1000 * 60));
                return `Can complete in ${minutesUntilHalf}m`;
            }
            
            // If meeting can be completed
            return 'Can complete now';
            
        } catch (error) {
            console.error('❌ Error calculating time until completion:', error);
            return 'Time calculation error';
        }
    };

    // Handle session completion
    const handleCompleteSession = async (requestId) => {
        if (!window.confirm('Mark this session as completed? This will end the meeting and move the request to completed status.')) {
            return;
        }

        setActionLoading(prev => ({ ...prev, [requestId]: 'completing' }));

        try {
            // Use the acceptee completion method since this is the accepted requests page
            const result = await unifiedRequestService.completeRequestAsAcceptee(requestId, user.id);

            if (result.success) {
                alert(result.message);
                
                // Refresh the data to show updated status
                // The request will now appear in the archived/completed page
                window.location.reload(); // Simple refresh for now
                
                // Alternative: You could implement a more sophisticated refresh
                // by updating local state or triggering a data refetch
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
                <div className="grid grid-cols-2 gap-2">
                    {(() => {
                        const canComplete = canCompleteMeeting(requestData);
                        const timeInfo = getTimeUntilCompletion(requestData);
                        
                        return (
                            <button
                                className={`px-4 py-2 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                    canComplete 
                                        ? 'bg-purple-600 text-white hover:bg-purple-700' 
                                        : 'bg-gray-500 text-gray-300 cursor-not-allowed'
                                }`}
                                onClick={() => canComplete ? handleCompleteSession(requestData?.id) : null}
                                disabled={!canComplete || actionLoading[requestData?.id] === 'completing'}
                                title={canComplete ? 'Complete this session' : timeInfo}
                            >
                                {actionLoading[requestData?.id] === 'completing' 
                                    ? 'Completing...' 
                                    : canComplete 
                                        ? '✅ Complete' 
                                        : `⏳ ${timeInfo}`
                                }
                            </button>
                        );
                    })()}
                    <button
                        className="bg-[#2D3748] text-[#A0AEC0] rounded px-4 py-2 font-medium text-sm hover:bg-[#4A5568] transition-colors border border-[#4A5568] disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => handleArchiveResponse(response.id)}
                        disabled={actionLoading[response.id] === 'archiving'}
                    >
                        {actionLoading[response.id] === 'archiving' ? 'Archiving...' : '📁 Archive'}
                    </button>
                </div>

                {/* Contact options */}
                <div className="grid grid-cols-2 gap-2">
                    <button
                        className="bg-[#2D3748] text-green-400 rounded px-3 py-2 text-sm hover:bg-[#4A5568] transition-colors border border-[#4A5568] whitespace-nowrap"
                        onClick={() => alert('Messaging feature coming soon!')}
                    >
                        💬 Message
                    </button>
                    <button
                        className="bg-[#2D3748] text-purple-400 rounded px-3 py-2 text-sm hover:bg-[#4A5568] transition-colors border border-[#4A5568] whitespace-nowrap"
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
        
        // Handle Firestore timestamps
        let dateObj;
        if (date?.toDate) {
            dateObj = date.toDate(); // Firestore timestamp
        } else if (date instanceof Date) {
            dateObj = date; // Already a Date object
        } else {
            dateObj = new Date(date); // String or number
        }
        
        if (isNaN(dateObj.getTime())) return 'Invalid date';
        
        const now = new Date();
        const diffMs = now - dateObj;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
        return `${Math.floor(diffDays / 365)}y ago`;
    };

    // Calculate stats from real data
    const getStats = () => {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        return {
            total: responses.length,
            withMeetings: responses.filter(r => r.requestData?.meetingUrl).length,
            subjects: new Set(responses.map(r => r.requestData?.subject).filter(Boolean)).size,
            thisWeek: responses.filter(r => {
                const responseDate = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
                return responseDate > oneWeekAgo;
            }).length
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
            <div className="flex gap-6 min-h-0">
                {/* Request Feed */}
                <section className="flex-1 bg-[#2D3748] rounded-lg shadow-sm p-6 min-h-[600px] overflow-hidden">
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
                                        className={`flex items-start gap-3 p-3 rounded cursor-pointer border transition-colors min-w-0 ${
                                            selected?.id === response.id
                                                ? 'border-[#4299E1] bg-[#1A202C]'
                                                : 'border-transparent hover:bg-[#1A202C]'
                                        }`}
                                        onClick={(e) => handleRequestClick(response, e)}
                                    >
                                        <img
                                            src={requestData?.userAvatar || `https://ui-avatars.com/api/?name=${requestData?.userName}&background=3b82f6&color=fff`}
                                            alt={requestData?.userName || 'User'}
                                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-white truncate">{requestData?.userName || 'Unknown User'}</div>
                                            <div className="text-[#A0AEC0] text-sm truncate">{requestData?.title || requestData?.topic || 'No title'}</div>
                                            <div className="text-[#A0AEC0] text-xs line-clamp-2 mt-1">
                                                {requestData?.description || 'No description available'}
                                            </div>
                                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                <span className="text-xs text-[#A0AEC0] bg-[#1A202C] px-2 py-1 rounded whitespace-nowrap">📚 {requestData?.subject || 'General'}</span>
                                                <span className="text-xs text-[#A0AEC0] bg-[#1A202C] px-2 py-1 rounded whitespace-nowrap">⏰ {requestData?.duration || '60'} min</span>
                                                {response.createdAt && (
                                                    <span className="text-xs text-green-400 bg-green-900 px-2 py-1 rounded whitespace-nowrap">✅ Accepted {formatTimeAgo(response.createdAt)}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 flex-shrink-0 min-w-[120px]">
                                            <span className="text-xs text-[#A0AEC0] whitespace-nowrap">{formatTimeAgo(response.createdAt)}</span>
                                            {requestData?.paymentAmount && parseFloat(requestData.paymentAmount) > 0 && (
                                                <span className="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded font-medium border border-green-700 whitespace-nowrap">
                                                    Rs.{requestData.paymentAmount}
                                                </span>
                                            )}
                                            {requestData?.meetingUrl && (
                                                <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded font-medium border border-blue-700 whitespace-nowrap">
                                                    🎥 Meeting Ready
                                                </span>
                                            )}
                                            {/* Meeting completion status indicator */}
                                            {requestData?.preferredDate && requestData?.preferredTime && (
                                                <span className={`text-xs px-2 py-0.5 rounded font-medium border whitespace-nowrap ${
                                                    canCompleteMeeting(requestData)
                                                        ? 'bg-green-900 text-green-300 border-green-700'
                                                        : 'bg-yellow-900 text-yellow-300 border-yellow-700'
                                                }`}>
                                                    {canCompleteMeeting(requestData) ? '✅ Can Complete' : '⏳ Wait'}
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
                                <a href="/requests/available" className="text-blue-400 hover:text-blue-300 font-medium">
                                    Browse Available Requests →
                                </a>
                            </div>
                        </div>
                    )}
                </section>

                {/* Request Details */}
                {selected && (
                    <aside className="w-[400px] flex-shrink-0 bg-[#2D3748] rounded-lg shadow-sm p-6 border border-[#4A5568] flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <img
                                src={selected.requestData?.userAvatar || `https://ui-avatars.com/api/?name=${selected.requestData?.userName}&background=3b82f6&color=fff`}
                                alt={selected.requestData?.userName || 'User'}
                                className="w-14 h-14 rounded-full object-cover"
                            />
                            <div className="flex-1">
                                <div className="font-bold text-lg text-white">{selected.requestData?.userName || 'Unknown User'}</div>
                                <div className="text-[#A0AEC0] text-sm">Request Creator</div>
                                <div className="flex items-center gap-2 text-xs text-[#A0AEC0]">
                                    <span>📅 {selected.createdAt ? formatTimeAgo(selected.createdAt) : 'Recently'}</span>
                                    <span>•</span>
                                    <span>{selected.requestData?.status || 'Unknown'} status</span>
                                </div>
                                <div className="text-[#4299E1] text-xs font-medium">
                                    Request ID: {selected.requestData?.id || selected.id}
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

                            {/* Meeting Completion Status */}
                            {selected.requestData?.preferredDate && selected.requestData?.preferredTime && (
                                <div className={`rounded-lg p-3 mb-4 border ${
                                    canCompleteMeeting(selected.requestData) 
                                        ? 'bg-green-900 border-green-700' 
                                        : 'bg-yellow-900 border-yellow-700'
                                }`}>
                                    <div className="text-sm">
                                        <div className={`font-medium mb-1 ${
                                            canCompleteMeeting(selected.requestData) 
                                                ? 'text-green-200' 
                                                : 'text-yellow-200'
                                        }`}>
                                            ⏰ Meeting Completion Status
                                        </div>
                                        <div className={`text-xs space-y-1 ${
                                            canCompleteMeeting(selected.requestData) 
                                                ? 'text-green-100' 
                                                : 'text-yellow-100'
                                        }`}>
                                            <div>• {getTimeUntilCompletion(selected.requestData)}</div>
                                            {canCompleteMeeting(selected.requestData) ? (
                                                <div>• ✅ You can now complete this meeting</div>
                                            ) : (
                                                <div>• ⏳ Wait until half the scheduled time has passed</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Response Details */}
                            <div className="bg-[#1A202C] rounded-lg p-3 mb-4 border border-[#4A5568]">
                                <div className="text-sm">
                                    <div className="font-medium text-white mb-1">Response Details</div>
                                    <div className="text-[#A0AEC0] text-xs space-y-1">
                                        <div>• Status: <span className="text-green-400">{selected.status}</span></div>
                                        <div>• Responded: {selected.createdAt ? formatTimeAgo(selected.createdAt) : 'Recently'}</div>
                                        {selected.responderName && (
                                            <div>• You responded as: {selected.responderName}</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            {renderActionButtons(selected)}

                            {/* Request Information */}
                            <div className="text-[#A0AEC0] text-xs mt-4 text-center border-t border-[#4A5568] pt-4">
                                <div className="space-y-1">
                                    <div>Request created: {selected.requestData?.createdAt ? formatTimeAgo(selected.requestData.createdAt) : 'Unknown'}</div>
                                    <div>Last updated: {selected.requestData?.updatedAt ? formatTimeAgo(selected.requestData.updatedAt) : 'Unknown'}</div>
                                </div>
                            </div>
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
};

export default AcceptedRequests;
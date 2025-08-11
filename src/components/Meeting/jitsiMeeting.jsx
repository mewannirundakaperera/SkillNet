// src/components/Meeting/JitsiMeeting.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { jitsiConfig, generateRoomName, getUserConfig } from '@/config/jitsi';
import {
    collection,
    doc,
    updateDoc,
    addDoc,
    serverTimestamp,
    onSnapshot,
    query,
    where,
    orderBy,
    limit
} from 'firebase/firestore';
import { db } from '@/config/firebase';

const JitsiMeeting = () => {
    const { requestId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const jitsiContainerRef = useRef(null);
    const jitsiApiRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [meetingInfo, setMeetingInfo] = useState(null);
    const [participantCount, setParticipantCount] = useState(0);
    const [meetingDuration, setMeetingDuration] = useState(0);

    // Get meeting info from route state or URL params
    const {
        roomName,
        otherUserId,
        otherUserName,
        subject,
        sessionType = 'one-to-one'
    } = location.state || {};

    useEffect(() => {
        // Load Jitsi Meet API script
        const loadJitsiScript = () => {
            return new Promise((resolve, reject) => {
                if (window.JitsiMeetExternalAPI) {
                    resolve();
                    return;
                }

                const script = document.createElement('script');
                script.src = 'https://meet.jit.si/external_api.js';
                script.onload = () => resolve();
                script.onerror = () => reject(new Error('Failed to load Jitsi Meet API'));
                document.head.appendChild(script);
            });
        };

        const initializeMeeting = async () => {
            try {
                setIsLoading(true);
                await loadJitsiScript();

                // Generate room name if not provided
                const finalRoomName = roomName || generateRoomName(
                    requestId || 'direct',
                    user.id,
                    otherUserId || 'guest'
                );

                // Get user configuration
                const userConfig = getUserConfig(user);

                // Configure Jitsi options
                const options = {
                    ...jitsiConfig.options,
                    roomName: finalRoomName,
                    parentNode: jitsiContainerRef.current,
                    userInfo: userConfig,
                    listeners: {
                        // Meeting events
                        conferenceJoined: () => {
                            console.log('✅ Joined meeting:', finalRoomName);
                            setIsLoading(false);
                            logMeetingEvent('joined');
                        },
                        conferenceLeft: () => {
                            console.log('👋 Left meeting');
                            logMeetingEvent('left');
                            navigate(-1); // Go back to previous page
                        },
                        participantJoined: (participant) => {
                            console.log('👤 Participant joined:', participant.displayName);
                            setParticipantCount(prev => prev + 1);
                        },
                        participantLeft: (participant) => {
                            console.log('👤 Participant left:', participant.displayName);
                            setParticipantCount(prev => Math.max(0, prev - 1));
                        },
                        audioMuteStatusChanged: (muted) => {
                            console.log('🎤 Audio muted:', muted);
                        },
                        videoMuteStatusChanged: (muted) => {
                            console.log('📹 Video muted:', muted);
                        },
                        screenShareToggled: (sharing) => {
                            console.log('🖥️ Screen sharing:', sharing);
                        },
                        // Error handling
                        conferenceError: (error) => {
                            console.error('❌ Conference error:', error);
                            setError('Failed to join the meeting. Please try again.');
                        },
                        connectionError: (error) => {
                            console.error('❌ Connection error:', error);
                            setError('Connection failed. Please check your internet connection.');
                        }
                    }
                };

                // Create Jitsi Meet instance
                const api = new window.JitsiMeetExternalAPI(jitsiConfig.domain, options);
                jitsiApiRef.current = api;

                // Set meeting info
                setMeetingInfo({
                    roomName: finalRoomName,
                    subject: subject || 'StudentConnect Session',
                    otherUser: otherUserName || 'Other Student',
                    sessionType,
                    startTime: new Date()
                });

                // Track meeting duration
                const durationInterval = setInterval(() => {
                    setMeetingDuration(prev => prev + 1);
                }, 1000);

                // Cleanup function
                return () => {
                    clearInterval(durationInterval);
                    if (jitsiApiRef.current) {
                        jitsiApiRef.current.dispose();
                        jitsiApiRef.current = null;
                    }
                };

            } catch (error) {
                console.error('Failed to initialize meeting:', error);
                setError('Failed to start the meeting. Please try again.');
                setIsLoading(false);
            }
        };

        if (user && jitsiContainerRef.current) {
            initializeMeeting();
        }

        // Cleanup on unmount
        return () => {
            if (jitsiApiRef.current) {
                jitsiApiRef.current.dispose();
                jitsiApiRef.current = null;
            }
        };
    }, [user, requestId, roomName, otherUserId, otherUserName, subject, sessionType, navigate]);

    // Log meeting events to Firestore
    const logMeetingEvent = async (eventType) => {
        if (!user || !meetingInfo) return;

        try {
            await addDoc(collection(db, 'meetingLogs'), {
                userId: user.id,
                userName: user.displayName || user.name,
                userEmail: user.email,
                requestId: requestId || null,
                roomName: meetingInfo.roomName,
                eventType,
                timestamp: serverTimestamp(),
                sessionType: meetingInfo.sessionType,
                otherUser: meetingInfo.otherUser,
                subject: meetingInfo.subject
            });
        } catch (error) {
            console.error('Failed to log meeting event:', error);
        }
    };

    // Format duration
    const formatDuration = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    // Handle manual leave
    const handleLeaveMeeting = async () => {
        try {
            // First, hangup from Jitsi if API is available
            if (jitsiApiRef.current) {
                jitsiApiRef.current.executeCommand('hangup');
            }

            // Update meeting status in database
            if (meetingInfo?.meetingId && user?.id) {
                try {
                    const { UnifiedJitsiMeetingService } = await import('@/services/UnifiedJitsiMeetingService');
                    await UnifiedJitsiMeetingService.leaveMeeting(
                        meetingInfo.meetingId, 
                        user.id, 
                        user.displayName || user.name || 'User'
                    );
                    console.log('✅ Meeting leave recorded in database');
                } catch (error) {
                    console.warn('⚠️ Could not record meeting leave:', error);
                }
            }

            // Try to send message to parent window to redirect
            try {
                if (window.opener && !window.opener.closed) {
                    // Send message to parent window to redirect back to request page
                    window.opener.postMessage({
                        type: 'MEETING_LEFT',
                        meetingId: meetingInfo?.meetingId,
                        requestId: meetingInfo?.requestId,
                        action: 'redirect_to_request'
                    }, '*');
                    
                    // Close this meeting tab
                    window.close();
                } else {
                    // If no parent window, try to navigate back
                    navigate(-1);
                }
            } catch (error) {
                console.warn('⚠️ Could not communicate with parent window:', error);
                // Fallback: close the tab
                window.close();
            }
        } catch (error) {
            console.error('❌ Error leaving meeting:', error);
            // Fallback: close the tab
            window.close();
        }
    };

    // Handle tab close/refresh to record meeting leave
    useEffect(() => {
        const handleBeforeUnload = async (event) => {
            // Only handle if we have meeting info and user
            if (meetingInfo?.meetingId && user?.id) {
                try {
                    // Try to record meeting leave before tab closes
                    const { UnifiedJitsiMeetingService } = await import('@/services/UnifiedJitsiMeetingService');
                    await UnifiedJitsiMeetingService.leaveMeeting(
                        meetingInfo.meetingId, 
                        user.id, 
                        user.displayName || user.name || 'User'
                    );
                    console.log('✅ Meeting leave recorded before tab close');
                } catch (error) {
                    console.warn('⚠️ Could not record meeting leave before tab close:', error);
                }
            }
        };

        const handleVisibilityChange = async () => {
            // Handle when tab becomes hidden (user switches tabs or minimizes)
            if (document.hidden && meetingInfo?.meetingId && user?.id) {
                try {
                    const { UnifiedJitsiMeetingService } = await import('@/services/UnifiedJitsiMeetingService');
                    await UnifiedJitsiMeetingService.leaveMeeting(
                        meetingInfo.meetingId, 
                        user.id, 
                        user.displayName || user.name || 'User'
                    );
                    console.log('✅ Meeting leave recorded on tab visibility change');
                } catch (error) {
                    console.warn('⚠️ Could not record meeting leave on tab visibility change:', error);
                }
            }
        };

        // Add event listeners
        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Cleanup
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [meetingInfo, user]);

    if (error) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
                    <div className="text-red-500 text-4xl mb-4">⚠️</div>
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Meeting Error</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Try Again
                        </button>
                        <button
                            onClick={() => navigate(-1)}
                            className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-black flex flex-col">
            {/* Meeting Header */}
            {meetingInfo && (
                <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className="font-semibold">{meetingInfo.subject}</h1>
                            <p className="text-sm text-gray-300">
                                {meetingInfo.sessionType === 'one-to-one' ? 'One-to-One Session' : 'Group Session'}
                                {meetingInfo.otherUser && ` with ${meetingInfo.otherUser}`}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-sm">
                            <span className="text-gray-300">Duration: </span>
                            <span className="font-mono">{formatDuration(meetingDuration)}</span>
                        </div>
                        <div className="text-sm">
                            <span className="text-gray-300">Participants: </span>
                            <span>{participantCount}</span>
                        </div>
                        <button
                            onClick={handleLeaveMeeting}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            Leave Meeting
                        </button>
                    </div>
                </div>
            )}

            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-8 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Joining Meeting...</h3>
                        <p className="text-gray-600">Please wait while we connect you to the session</p>
                    </div>
                </div>
            )}

            {/* Jitsi Meet Container */}
            <div
                ref={jitsiContainerRef}
                className="flex-1 w-full h-full"
                style={{ minHeight: '400px' }}
            />
        </div>
    );
};

export default JitsiMeeting;
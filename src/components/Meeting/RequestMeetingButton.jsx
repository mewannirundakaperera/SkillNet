// src/components/Meeting/RequestMeetingButton.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMeeting } from '@/hooks/useMeeting';

const RequestMeetingButton = ({
                                  request,
                                  requestType = 'one-to-one', // 'one-to-one' or 'group'
                                  variant = 'primary', // 'primary', 'secondary', 'minimal'
                                  size = 'md', // 'sm', 'md', 'lg'
                                  className = ''
                              }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const {
        createOneToOneMeeting,
        createGroupMeeting,
        getMeetingForRequest,
        loading
    } = useMeeting();

    const [meetingState, setMeetingState] = useState('checking'); // 'checking', 'create', 'join', 'error'
    const [meetingUrl, setMeetingUrl] = useState(null);
    const [meetingId, setMeetingId] = useState(null);

    // Check if meeting already exists for this request
    useEffect(() => {
        const checkExistingMeeting = async () => {
            if (!request?.id) return;

            try {
                const result = await getMeetingForRequest(request.id, requestType);

                if (result.meeting) {
                    setMeetingUrl(result.meeting.meetingUrl);
                    setMeetingId(result.meeting.id);
                    setMeetingState('join');
                } else {
                    setMeetingState('create');
                }
            } catch (error) {
                console.error('Error checking existing meeting:', error);
                setMeetingState('create');
            }
        };

        checkExistingMeeting();
    }, [request?.id, requestType, getMeetingForRequest]);

    // Create meeting when button is clicked (if no meeting exists)
    const handleCreateMeeting = async () => {
        if (!request || !user) return;

        try {
            let result;

            if (requestType === 'one-to-one') {
                // For one-to-one meetings
                const accepterUserId = user.id;
                const accepterName = user.displayName || user.name || 'Student';

                result = await createOneToOneMeeting(
                    request.id,
                    request,
                    accepterUserId,
                    accepterName
                );
            } else {
                // For group meetings
                result = await createGroupMeeting(request.id, request);
            }

            if (result.success) {
                setMeetingUrl(result.meetingUrl);
                setMeetingId(result.meetingId);
                setMeetingState('join');
            }
        } catch (error) {
            console.error('Error creating meeting:', error);
            setMeetingState('error');
        }
    };

    // Join existing meeting
    const handleJoinMeeting = () => {
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
            
            // Open Jitsi meeting in current window with enhanced URL
            window.location.href = enhancedMeetingUrl;
        } else {
            // Navigate to meeting page with request data
            navigate(`/OnlineMeeting/${request.id}`, {
                state: {
                    requestData: request,
                    requestType,
                    meetingId
                }
            });
        }
    };

    // Get button styling based on variant and size
    const getButtonClasses = () => {
        const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';

        const sizeClasses = {
            sm: 'px-3 py-1.5 text-sm',
            md: 'px-4 py-2 text-sm',
            lg: 'px-6 py-3 text-base'
        };

        const variantClasses = {
            primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm',
            secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500 border border-gray-300',
            minimal: 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 focus:ring-blue-500'
        };

        return `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;
    };

    // Get button content based on state
    const getButtonContent = () => {
        if (loading) {
            return (
                <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    {meetingState === 'create' ? 'Creating...' : 'Joining...'}
                </>
            );
        }

        switch (meetingState) {
            case 'checking':
                return (
                    <>
                        <div className="animate-pulse w-4 h-4 bg-current rounded-full mr-2 opacity-50"></div>
                        Checking...
                    </>
                );

            case 'create':
                return (
                    <>
                        <span className="mr-2">🎥</span>
                        {requestType === 'group' ? 'Start Group Meeting' : 'Start Meeting'}
                    </>
                );

            case 'join':
                return (
                    <>
                        <span className="mr-2">🚀</span>
                        Join Meeting
                    </>
                );

            case 'error':
                return (
                    <>
                        <span className="mr-2">⚠️</span>
                        Try Again
                    </>
                );

            default:
                return 'Loading...';
        }
    };

    // Handle button click based on current state
    const handleClick = () => {
        switch (meetingState) {
            case 'create':
                handleCreateMeeting();
                break;
            case 'join':
                handleJoinMeeting();
                break;
            case 'error':
                setMeetingState('create');
                break;
            default:
                break;
        }
    };

    // Don't render if request is not in accepted status
    if (!request || request.status !== 'accepted') {
        return null;
    }

    return (
        <div className="relative">
            <button
                onClick={handleClick}
                disabled={loading || meetingState === 'checking'}
                className={getButtonClasses()}
                title={
                    meetingState === 'join'
                        ? 'Join the video meeting'
                        : 'Create and start a video meeting'
                }
            >
                {getButtonContent()}
            </button>

            {/* Meeting info tooltip for created meetings */}
            {meetingState === 'join' && meetingUrl && (
                <div className="absolute top-full left-0 mt-2 p-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                    Meeting ready • Click to join
                </div>
            )}
        </div>
    );
};

// Specialized component for one-to-one requests
export const OneToOneMeetingButton = (props) => (
    <RequestMeetingButton {...props} requestType="one-to-one" />
);

// Specialized component for group requests
export const GroupMeetingButton = (props) => (
    <RequestMeetingButton {...props} requestType="group" />
);

// Simple meeting link component for inline use
export const MeetingActionLink = ({ request, requestType = 'one-to-one', children }) => {
    const [meetingUrl, setMeetingUrl] = useState(null);
    const { getMeetingForRequest } = useMeeting();

    useEffect(() => {
        const checkMeeting = async () => {
            if (request?.id) {
                try {
                    const result = await getMeetingForRequest(request.id, requestType);
                    if (result.meeting) {
                        setMeetingUrl(result.meeting.meetingUrl);
                    }
                } catch (error) {
                    console.error('Error checking meeting:', error);
                }
            }
        };

        checkMeeting();
    }, [request?.id, requestType, getMeetingForRequest]);

    if (!meetingUrl || request?.status !== 'accepted') {
        return null;
    }

    return (
        <a
            href={meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
        >
            {children || 'Join Meeting'}
        </a>
    );
};

export default RequestMeetingButton;
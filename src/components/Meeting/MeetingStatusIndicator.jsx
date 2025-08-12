// src/components/Meeting/MeetingStatusIndicator.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMeeting } from '@/hooks/useMeeting';
import { RequestMeetingButton } from './RequestMeetingButton';
import { VideoIcon, CheckIcon, XIcon, ClockIcon, QuestionIcon } from '@/components/Icons/SvgIcons';

const MeetingStatusIndicator = ({
                                    request,
                                    requestType = 'one-to-one',
                                    showActions = true,
                                    compact = false,
                                    className = ''
                                }) => {
    const { user } = useAuth();
    const { getMeetingForRequest } = useMeeting();
    const [meetingData, setMeetingData] = useState(null);
    const [loading, setLoading] = useState(false);

    // Load meeting data if request is accepted
    useEffect(() => {
        const loadMeetingData = async () => {
            if (request?.status === 'accepted' && request?.id) {
                try {
                    setLoading(true);
                    const result = await getMeetingForRequest(request.id, requestType);
                    setMeetingData(result);
                } catch (error) {
                    console.error('Error loading meeting data:', error);
                } finally {
                    setLoading(false);
                }
            }
        };

        loadMeetingData();
    }, [request?.id, request?.status, requestType, getMeetingForRequest]);

    // Get status display info
    const getStatusInfo = () => {
        switch (request?.status) {
            case 'draft':
                return {
                    icon: '📝',
                    text: 'Draft',
                    color: 'gray',
                    description: 'Request is being prepared'
                };

            case 'pending':
                return {
                    icon: <ClockIcon className="w-5 h-5" color="currentColor" />,
                    text: 'Pending',
                    color: 'yellow',
                    description: 'Waiting for response'
                };

            case 'accepted':
                if (meetingData?.meeting) {
                    return {
                        icon: <VideoIcon className="w-5 h-5" color="currentColor" />,
                        text: 'Meeting Ready',
                        color: 'blue',
                        description: 'Video meeting is available'
                    };
                } else {
                    return {
                        icon: <CheckIcon className="w-5 h-5" color="currentColor" />,
                        text: 'Accepted',
                        color: 'green',
                        description: 'Request accepted, meeting setup required'
                    };
                }

            case 'completed':
                return {
                    icon: <CheckIcon className="w-5 h-5" color="currentColor" />,
                    text: 'Completed',
                    color: 'green',
                    description: 'Session completed successfully'
                };

            case 'cancelled':
                return {
                    icon: <XIcon className="w-5 h-5" color="currentColor" />,
                    text: 'Cancelled',
                    color: 'red',
                    description: 'Request was cancelled'
                };

            case 'expired':
                return {
                    icon: <ClockIcon className="w-5 h-5" color="currentColor" />,
                    text: 'Expired',
                    color: 'gray',
                    description: 'Request has expired'
                };

            default:
                return {
                    icon: <QuestionIcon className="w-5 h-5" color="currentColor" />,
                    text: 'Unknown',
                    color: 'gray',
                    description: 'Status unknown'
                };
        }
    };

    const statusInfo = getStatusInfo();

    // Get color classes
    const getColorClasses = (color) => {
        const colors = {
            gray: {
                bg: 'bg-gray-100',
                text: 'text-gray-800',
                border: 'border-gray-300'
            },
            yellow: {
                bg: 'bg-yellow-100',
                text: 'text-yellow-800',
                border: 'border-yellow-300'
            },
            blue: {
                bg: 'bg-blue-100',
                text: 'text-blue-800',
                border: 'border-blue-300'
            },
            green: {
                bg: 'bg-green-100',
                text: 'text-green-800',
                border: 'border-green-300'
            },
            red: {
                bg: 'bg-red-100',
                text: 'text-red-800',
                border: 'border-red-300'
            }
        };
        return colors[color] || colors.gray;
    };

    const colorClasses = getColorClasses(statusInfo.color);

    // Check if user can join meeting
    const canJoinMeeting = () => {
        return request?.status === 'accepted' &&
            meetingData?.meeting &&
            (request?.userId === user?.id ||
                request?.createdBy === user?.id ||
                request?.acceptedBy === user?.id);
    };

    // Get meeting participants info
    const getMeetingParticipants = () => {
        if (!meetingData?.meeting) return null;

        const meeting = meetingData.meeting;
        const participants = meeting.participants || [];

        return {
            total: participants.length,
            active: meeting.activeParticipants || 0,
            names: participants.map(p => p.name || 'Student').slice(0, 2)
        };
    };

    const participantInfo = getMeetingParticipants();

    if (compact) {
        return (
            <div className={`inline-flex items-center gap-2 ${className}`}>
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${colorClasses.bg} ${colorClasses.text} ${colorClasses.border}`}>
                    <span>{statusInfo.icon}</span>
                    <span>{statusInfo.text}</span>
                </div>

                {canJoinMeeting() && showActions && (
                    <RequestMeetingButton
                        request={request}
                        requestType={requestType}
                        variant="minimal"
                        size="sm"
                    />
                )}
            </div>
        );
    }

    return (
        <div className={`space-y-3 ${className}`}>
            {/* Status Badge */}
            <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${colorClasses.bg} ${colorClasses.text} ${colorClasses.border}`}>
                <span className="text-lg">{statusInfo.icon}</span>
                <div>
                    <div className="font-medium">{statusInfo.text}</div>
                    <div className="text-xs opacity-75">{statusInfo.description}</div>
                </div>
            </div>

            {/* Loading State */}
            {loading && request?.status === 'accepted' && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>Setting up meeting...</span>
                </div>
            )}

            {/* Meeting Information */}
            {meetingData?.meeting && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-blue-800">
                        <span className="font-medium">🎥 Video Meeting Ready</span>
                    </div>

                    {participantInfo && (
                        <div className="text-sm text-blue-700">
                            <div>Participants: {participantInfo.names.join(', ')}</div>
                            {participantInfo.active > 0 && (
                                <div className="text-green-600 font-medium">
                                    {participantInfo.active} currently active
                                </div>
                            )}
                        </div>
                    )}

                    {/* Meeting Actions */}
                    {canJoinMeeting() && showActions && (
                        <div className="pt-2">
                            <RequestMeetingButton
                                request={request}
                                requestType={requestType}
                                variant="primary"
                                size="md"
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Meeting History for Completed Requests */}
            {request?.status === 'completed' && meetingData?.meeting && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-800 mb-2">
                        <span className="font-medium">✅ Session Completed</span>
                    </div>

                    <div className="text-sm text-green-700 space-y-1">
                        {meetingData.meeting.duration && (
                            <div>Duration: {Math.round(meetingData.meeting.duration / 60)} minutes</div>
                        )}
                        {meetingData.meeting.endedAt && (
                            <div>
                                Ended: {new Date(
                                meetingData.meeting.endedAt.toDate ?
                                    meetingData.meeting.endedAt.toDate() :
                                    meetingData.meeting.endedAt
                            ).toLocaleString()}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Request Type Info */}
            <div className="text-xs text-gray-500">
                {requestType === 'group' ? '👥 Group Session' : '🤝 One-to-One Session'}
                {request?.category && ` • ${request.category}`}
            </div>
        </div>
    );
};

// Simplified version for list views
export const MeetingStatusBadge = ({ request, requestType = 'one-to-one', className = '' }) => (
    <MeetingStatusIndicator
        request={request}
        requestType={requestType}
        showActions={false}
        compact={true}
        className={className}
    />
);

// Full version with actions for detail views
export const MeetingStatusCard = ({ request, requestType = 'one-to-one', className = '' }) => (
    <MeetingStatusIndicator
        request={request}
        requestType={requestType}
        showActions={true}
        compact={false}
        className={className}
    />
);

export default MeetingStatusIndicator;
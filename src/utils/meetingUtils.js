// src/utils/meetingUtils.js

/**
 * Format meeting time from date and time strings
 */
export const formatMeetingTime = (dateString, timeString) => {
    if (!dateString || !timeString) return 'Not scheduled';

    try {
        const date = new Date(`${dateString}T${timeString}`);
        return date.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return 'Invalid date/time';
    }
};

/**
 * Format meeting duration in human readable format
 */
export const formatDuration = (seconds) => {
    if (!seconds || seconds < 0) return '0m';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m`;
    } else {
        return `${secs}s`;
    }
};

/**
 * Format duration for real-time display (with seconds)
 */
export const formatDurationLive = (seconds) => {
    if (!seconds || seconds < 0) return '00:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Get meeting status display information
 */
export const getMeetingStatusInfo = (request, meetingData = null) => {
    const status = request?.status || 'unknown';

    const statusMap = {
        draft: {
            icon: '📝',
            label: 'Draft',
            color: 'gray',
            description: 'Request is being prepared',
            canJoin: false,
            priority: 1
        },
        pending: {
            icon: '⏳',
            label: 'Pending',
            color: 'yellow',
            description: 'Waiting for response',
            canJoin: false,
            priority: 2
        },
        accepted: {
            icon: meetingData ? '🎥' : '✅',
            label: meetingData ? 'Meeting Ready' : 'Accepted',
            color: meetingData ? 'green' : 'blue',
            description: meetingData ? 'Video meeting is available' : 'Request accepted, setting up meeting...',
            canJoin: !!meetingData,
            priority: 3
        },
        active: {
            icon: '🔴',
            label: 'Live',
            color: 'red',
            description: 'Meeting is currently in progress',
            canJoin: true,
            priority: 4
        },
        completed: {
            icon: '✅',
            label: 'Completed',
            color: 'green',
            description: 'Session completed successfully',
            canJoin: false,
            priority: 5
        },
        cancelled: {
            icon: '❌',
            label: 'Cancelled',
            color: 'red',
            description: 'Request was cancelled',
            canJoin: false,
            priority: 6
        },
        expired: {
            icon: '⏰',
            label: 'Expired',
            color: 'gray',
            description: 'Request has expired',
            canJoin: false,
            priority: 7
        },
        declined: {
            icon: '👎',
            label: 'Declined',
            color: 'red',
            description: 'Request was declined',
            canJoin: false,
            priority: 8
        }
    };

    return statusMap[status] || {
        icon: '❓',
        label: 'Unknown',
        color: 'gray',
        description: 'Status unknown',
        canJoin: false,
        priority: 9
    };
};

/**
 * Check if user can access a meeting
 */
export const canUserAccessMeeting = (request, meetingData, userId) => {
    if (!request || !userId) return false;

    // Check if user is the requester, accepter, or participant
    const isRequester = request.userId === userId || request.createdBy === userId;
    const isAccepter = request.acceptedBy === userId;

    if (meetingData?.meeting) {
        const isParticipant = meetingData.meeting.participants?.some(p =>
            p.userId === userId || p === userId
        );
        return isRequester || isAccepter || isParticipant;
    }

    return isRequester || isAccepter;
};

/**
 * Check if user is the requester/creator
 */
export const isUserRequester = (request, userId) => {
    if (!request || !userId) return false;
    return request.userId === userId || request.createdBy === userId;
};

/**
 * Check if user is the accepter
 */
export const isUserAccepter = (request, userId) => {
    if (!request || !userId) return false;
    return request.acceptedBy === userId;
};

/**
 * Get user's role in the meeting
 */
export const getUserMeetingRole = (request, meetingData, userId) => {
    if (!request || !userId) return 'none';

    if (isUserRequester(request, userId)) return 'requester';
    if (isUserAccepter(request, userId)) return 'accepter';

    if (meetingData?.meeting?.participants) {
        const participant = meetingData.meeting.participants.find(p =>
            p.userId === userId || p === userId
        );
        return participant?.role || 'participant';
    }

    return 'none';
};

/**
 * Generate meeting room name based on request data
 */
export const generateMeetingRoomName = (requestId, requestType, participants = []) => {
    const timestamp = Date.now().toString().slice(-8);
    const shortRequestId = requestId.slice(-8);

    if (requestType === 'one-to-one') {
        const userHash = participants.sort().join('-').slice(-16);
        return `SkillNet-1to1-${shortRequestId}-${userHash}-${timestamp}`.replace(/[^a-zA-Z0-9-]/g, '');
    } else {
        const participantCount = participants.length;
        return `SkillNet-Group-${shortRequestId}-${participantCount}p-${timestamp}`.replace(/[^a-zA-Z0-9-]/g, '');
    }
};

/**
 * Get Jitsi meeting URL
 */
export const getJitsiMeetingUrl = (roomName) => {
    if (!roomName) return null;
    return `https://meet.jit.si/${roomName}`;
};

/**
 * Validate meeting room name
 */
export const isValidRoomName = (roomName) => {
    if (!roomName || typeof roomName !== 'string') return false;

    // Jitsi room names should only contain alphanumeric characters and hyphens
    const validPattern = /^[a-zA-Z0-9-]+$/;
    return validPattern.test(roomName) && roomName.length > 0 && roomName.length <= 100;
};

/**
 * Get meeting participants summary
 */
export const getMeetingParticipantsSummary = (meetingData) => {
    if (!meetingData?.meeting?.participants) {
        return {
            total: 0,
            active: 0,
            names: [],
            list: [],
            joined: [],
            waiting: []
        };
    }

    const participants = meetingData.meeting.participants;
    const activeCount = meetingData.meeting.activeParticipants || 0;
    const joined = participants.filter(p => p.joinedAt);
    const waiting = participants.filter(p => !p.joinedAt);

    return {
        total: participants.length,
        active: activeCount,
        names: participants.map(p => p.name || 'Student'),
        list: participants,
        joined,
        waiting
    };
};

/**
 * Format meeting schedule for display
 */
export const formatMeetingSchedule = (meeting) => {
    if (!meeting) return 'Not scheduled';

    const { createdAt, startedAt, endedAt, scheduledDate, scheduledTime } = meeting;

    // Check for scheduled time first
    if (scheduledDate && scheduledTime) {
        return formatMeetingTime(scheduledDate, scheduledTime);
    }

    if (endedAt) {
        return `Completed on ${new Date(
            endedAt.toDate ? endedAt.toDate() : endedAt
        ).toLocaleDateString()}`;
    }

    if (startedAt) {
        return `Started on ${new Date(
            startedAt.toDate ? startedAt.toDate() : startedAt
        ).toLocaleString()}`;
    }

    if (createdAt) {
        return `Created on ${new Date(
            createdAt.toDate ? createdAt.toDate() : createdAt
        ).toLocaleDateString()}`;
    }

    return 'Schedule not available';
};

/**
 * Get meeting type display name
 */
export const getMeetingTypeDisplay = (requestType, participantCount = 2) => {
    switch (requestType) {
        case 'one-to-one':
            return '🤝 One-to-One Session';
        case 'group':
            return `👥 Group Session (${participantCount} participants)`;
        case 'webinar':
            return `📺 Webinar (${participantCount} attendees)`;
        case 'workshop':
            return `🛠️ Workshop (${participantCount} participants)`;
        default:
            return '🎥 Video Meeting';
    }
};

/**
 * Check if meeting is currently active
 */
export const isMeetingActive = (meetingData) => {
    if (!meetingData?.meeting) return false;

    const meeting = meetingData.meeting;
    return meeting.sessionStarted && !meeting.sessionEnded && meeting.activeParticipants > 0;
};

/**
 * Check if meeting can be joined
 */
export const canJoinMeeting = (request, meetingData) => {
    if (!request || !meetingData?.meeting) return false;

    const meeting = meetingData.meeting;

    // Can join if meeting exists and is not ended
    return meeting.status !== 'completed' && !meeting.sessionEnded;
};

/**
 * Get time until meeting starts (for scheduled meetings)
 */
export const getTimeUntilMeeting = (scheduledDate, scheduledTime) => {
    if (!scheduledDate || !scheduledTime) return null;

    try {
        const meetingTime = new Date(`${scheduledDate}T${scheduledTime}`);
        const now = new Date();
        const diffMs = meetingTime.getTime() - now.getTime();

        if (diffMs <= 0) return 'Meeting time has passed';

        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (diffHours > 24) {
            const diffDays = Math.floor(diffHours / 24);
            return `${diffDays} day${diffDays > 1 ? 's' : ''} from now`;
        } else if (diffHours > 0) {
            return `${diffHours}h ${diffMinutes}m from now`;
        } else {
            return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} from now`;
        }
    } catch (error) {
        return 'Invalid meeting time';
    }
};

/**
 * Check if meeting is starting soon (within next 15 minutes)
 */
export const isMeetingStartingSoon = (scheduledDate, scheduledTime) => {
    if (!scheduledDate || !scheduledTime) return false;

    try {
        const meetingTime = new Date(`${scheduledDate}T${scheduledTime}`);
        const now = new Date();
        const diffMs = meetingTime.getTime() - now.getTime();

        // Within next 15 minutes
        return diffMs > 0 && diffMs <= 15 * 60 * 1000;
    } catch (error) {
        return false;
    }
};

/**
 * Create meeting notification message
 */
export const createMeetingNotification = (requestData, meetingData, actionType) => {
    const subject = requestData.title || requestData.topic || 'Study Session';
    const requesterName = requestData.userName || requestData.createdByName || 'Student';

    switch (actionType) {
        case 'created':
            return {
                title: 'Meeting Created',
                message: `Video meeting for "${subject}" is ready!`,
                type: 'success',
                icon: '🎥'
            };

        case 'accepted':
            return {
                title: 'Request Accepted',
                message: `${requesterName} accepted your request for "${subject}"`,
                type: 'success',
                icon: '✅'
            };

        case 'joined':
            return {
                title: 'Joined Meeting',
                message: `You joined the meeting for "${subject}"`,
                type: 'info',
                icon: '🚀'
            };

        case 'left':
            return {
                title: 'Left Meeting',
                message: `You left the meeting for "${subject}"`,
                type: 'info',
                icon: '👋'
            };

        case 'ended':
            return {
                title: 'Meeting Ended',
                message: `The meeting for "${subject}" has ended`,
                type: 'success',
                icon: '✅'
            };

        case 'starting_soon':
            return {
                title: 'Meeting Starting Soon',
                message: `"${subject}" starts in a few minutes`,
                type: 'warning',
                icon: '⏰'
            };

        case 'cancelled':
            return {
                title: 'Meeting Cancelled',
                message: `The meeting for "${subject}" was cancelled`,
                type: 'error',
                icon: '❌'
            };

        default:
            return {
                title: 'Meeting Update',
                message: `Meeting for "${subject}" has been updated`,
                type: 'info',
                icon: '📋'
            };
    }
};

/**
 * Export meeting data for external use
 */
export const exportMeetingData = (meetingData) => {
    if (!meetingData?.meeting) return null;

    const meeting = meetingData.meeting;

    return {
        id: meeting.id,
        roomName: meeting.roomName,
        meetingUrl: meeting.meetingUrl,
        subject: meeting.subject || meeting.requestTitle,
        participants: meeting.participants?.map(p => ({
            name: p.name,
            role: p.role,
            joinedAt: p.joinedAt
        })) || [],
        createdAt: meeting.createdAt,
        startedAt: meeting.startedAt,
        endedAt: meeting.endedAt,
        duration: meeting.duration,
        status: meeting.status,
        requestType: meeting.requestType,
        activeParticipants: meeting.activeParticipants
    };
};

/**
 * Sort requests by meeting priority (active meetings first, then by status)
 */
export const sortRequestsByMeetingPriority = (requests) => {
    return requests.sort((a, b) => {
        const statusA = getMeetingStatusInfo(a);
        const statusB = getMeetingStatusInfo(b);

        // Active meetings first
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (b.status === 'active' && a.status !== 'active') return 1;

        // Then by priority
        return statusA.priority - statusB.priority;
    });
};

/**
 * Filter requests by meeting status
 */
export const filterRequestsByMeetingStatus = (requests, status) => {
    return requests.filter(request => request.status === status);
};

/**
 * Get meeting categories for organization
 */
export const getMeetingCategories = () => {
    return [
        {
            id: 'active',
            label: 'Active Meetings',
            icon: '🔴',
            description: 'Currently in progress'
        },
        {
            id: 'scheduled',
            label: 'Scheduled',
            icon: '📅',
            description: 'Upcoming meetings'
        },
        {
            id: 'pending',
            label: 'Pending',
            icon: '⏳',
            description: 'Waiting for response'
        },
        {
            id: 'completed',
            label: 'Completed',
            icon: '✅',
            description: 'Finished sessions'
        }
    ];
};

/**
 * Calculate meeting statistics
 */
export const calculateMeetingStats = (meetings) => {
    if (!Array.isArray(meetings)) return null;

    const stats = {
        total: meetings.length,
        completed: 0,
        active: 0,
        scheduled: 0,
        cancelled: 0,
        totalDuration: 0,
        averageDuration: 0,
        participantCount: 0
    };

    meetings.forEach(meeting => {
        switch (meeting.status) {
            case 'completed':
                stats.completed++;
                if (meeting.duration) stats.totalDuration += meeting.duration;
                break;
            case 'active':
                stats.active++;
                break;
            case 'scheduled':
                stats.scheduled++;
                break;
            case 'cancelled':
                stats.cancelled++;
                break;
        }

        if (meeting.participants) {
            stats.participantCount += meeting.participants.length;
        }
    });

    stats.averageDuration = stats.completed > 0 ? stats.totalDuration / stats.completed : 0;

    return stats;
};

export default {
    formatMeetingTime,
    formatDuration,
    formatDurationLive,
    getMeetingStatusInfo,
    canUserAccessMeeting,
    isUserRequester,
    isUserAccepter,
    getUserMeetingRole,
    generateMeetingRoomName,
    getJitsiMeetingUrl,
    isValidRoomName,
    getMeetingParticipantsSummary,
    formatMeetingSchedule,
    getMeetingTypeDisplay,
    isMeetingActive,
    canJoinMeeting,
    getTimeUntilMeeting,
    isMeetingStartingSoon,
    createMeetingNotification,
    exportMeetingData,
    sortRequestsByMeetingPriority,
    filterRequestsByMeetingStatus,
    getMeetingCategories,
    calculateMeetingStats
};
// src/hooks/useMeeting.js
import { useState } from 'react';
import { UnifiedJitsiMeetingService } from '@/services/UnifiedJitsiMeetingService';

export const useMeeting = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Create meeting for accepted one-to-one request
    const createOneToOneMeeting = async (requestId, requestData, accepterUserId, accepterName) => {
        try {
            setLoading(true);
            setError(null);

            const result = await UnifiedJitsiMeetingService.createOneToOneMeeting(
                requestId,
                requestData,
                accepterUserId,
                accepterName
            );

            if (!result.success) {
                throw new Error(result.error);
            }

            return result;
        } catch (err) {
            console.error('Error creating one-to-one meeting:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // Create meeting for accepted group request
    const createGroupMeeting = async (requestId, groupRequestData) => {
        try {
            setLoading(true);
            setError(null);

            const result = await UnifiedJitsiMeetingService.createGroupMeeting(requestId, groupRequestData);

            if (!result.success) {
                throw new Error(result.error);
            }

            return result;
        } catch (err) {
            console.error('Error creating group meeting:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // Get meeting for request
    const getMeetingForRequest = async (requestId, requestType = 'one-to-one') => {
        try {
            setLoading(true);
            setError(null);

            const result = await UnifiedJitsiMeetingService.getMeetingForRequest(requestId, requestType);

            if (!result.success) {
                throw new Error(result.error);
            }

            return result;
        } catch (err) {
            console.error('Error getting meeting for request:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // Join meeting
    const joinMeeting = async (meetingId, userId, userName) => {
        try {
            const result = await UnifiedJitsiMeetingService.joinMeeting(meetingId, userId, userName);

            if (!result.success) {
                throw new Error(result.error);
            }

            return result;
        } catch (err) {
            console.error('Error joining meeting:', err);
            setError(err.message);
            throw err;
        }
    };

    // Leave meeting
    const leaveMeeting = async (meetingId, userId, userName) => {
        try {
            const result = await UnifiedJitsiMeetingService.leaveMeeting(meetingId, userId, userName);

            if (!result.success) {
                throw new Error(result.error);
            }

            return result;
        } catch (err) {
            console.error('Error leaving meeting:', err);
            setError(err.message);
            throw err;
        }
    };

    // End meeting
    const endMeeting = async (meetingId, userId) => {
        try {
            const result = await UnifiedJitsiMeetingService.endMeeting(meetingId, userId);

            if (!result.success) {
                throw new Error(result.error);
            }

            return result;
        } catch (err) {
            console.error('Error ending meeting:', err);
            setError(err.message);
            throw err;
        }
    };

    // Validate meeting access
    const validateMeetingAccess = async (roomId, userId) => {
        try {
            const result = await UnifiedJitsiMeetingService.validateMeetingAccess(roomId, userId);
            return result;
        } catch (err) {
            console.error('Error validating meeting access:', err);
            return { hasAccess: false, reason: 'Validation failed' };
        }
    };

    // Get user meeting history
    const getUserMeetings = async (userId, limit = 10) => {
        try {
            setLoading(true);
            setError(null);

            const result = await UnifiedJitsiMeetingService.getUserMeetings(userId, limit);

            if (!result.success) {
                throw new Error(result.error);
            }

            return result.meetings;
        } catch (err) {
            console.error('Error getting user meetings:', err);
            setError(err.message);
            return [];
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        error,
        createOneToOneMeeting,
        createGroupMeeting,
        getMeetingForRequest,
        joinMeeting,
        leaveMeeting,
        endMeeting,
        validateMeetingAccess,
        getUserMeetings,
        clearError: () => setError(null)
    };
};
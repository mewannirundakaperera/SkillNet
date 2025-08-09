// src/hooks/useMeeting.js
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
    collection,
    onSnapshot,
    query,
    where,
    orderBy,
    doc,
    getDoc
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
    createMeetingSession,
    joinMeeting,
    leaveMeeting,
    endMeeting,
    getUserMeetings,
    sendMeetingInvitation,
    validateMeetingAccess,
    isMeetingStartingSoon
} from '@/utils/meetingUtils';

export const useMeeting = () => {
    const { user } = useAuth();
    const [meetings, setMeetings] = useState([]);
    const [activeMeeting, setActiveMeeting] = useState(null);
    const [upcomingMeetings, setUpcomingMeetings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Real-time listener for user's meetings
    useEffect(() => {
        if (!user?.id) return;

        setLoading(true);
        const meetingsRef = collection(db, 'meetings');

        // Query for meetings where user is host or participant
        const meetingsQuery = query(
            meetingsRef,
            where('participants', 'array-contains-any', [
                { userId: user.id },
                user.id
            ]),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(meetingsQuery,
            (snapshot) => {
                const meetingsData = [];
                const upcoming = [];
                let active = null;

                snapshot.forEach((doc) => {
                    const meeting = { id: doc.id, ...doc.data() };
                    meetingsData.push(meeting);

                    // Check for active meeting
                    if (meeting.status === 'active') {
                        active = meeting;
                    }

                    // Check for upcoming meetings
                    if (meeting.status === 'scheduled' &&
                        isMeetingStartingSoon(meeting.scheduledDate, meeting.scheduledTime)) {
                        upcoming.push(meeting);
                    }
                });

                setMeetings(meetingsData);
                setActiveMeeting(active);
                setUpcomingMeetings(upcoming);
                setLoading(false);
                setError(null);
            },
            (error) => {
                console.error('Error listening to meetings:', error);
                setError('Failed to load meetings');
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user]);

    // Create a new meeting
    const createMeeting = useCallback(async (meetingData) => {
        if (!user) throw new Error('User not authenticated');

        setLoading(true);
        setError(null);

        try {
            const meeting = await createMeetingSession({
                ...meetingData,
                hostUserId: user.id,
                hostUserName: user.displayName || user.name
            });

            // Send invitation to participant
            if (meetingData.participantUserId) {
                await sendMeetingInvitation({
                    meetingId: meeting.id,
                    hostUserId: user.id,
                    hostName: user.displayName || user.name,
                    participantUserId: meetingData.participantUserId,
                    participantName: meetingData.participantUserName,
                    subject: meetingData.subject,
                    meetingUrl: meeting.meetingUrl,
                    scheduledDate: meetingData.scheduledDate,
                    scheduledTime: meetingData.scheduledTime
                });
            }

            return meeting;
        } catch (error) {
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Join a meeting
    const joinMeetingSession = useCallback(async (meetingId) => {
        if (!user) throw new Error('User not authenticated');

        setLoading(true);
        setError(null);

        try {
            await joinMeeting(meetingId, user.id, user.displayName || user.name);
            return true;
        } catch (error) {
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Leave a meeting
    const leaveMeetingSession = useCallback(async (meetingId) => {
        if (!user) throw new Error('User not authenticated');

        try {
            await leaveMeeting(meetingId, user.id, user.displayName || user.name);
            return true;
        } catch (error) {
            setError(error.message);
            throw error;
        }
    }, [user]);

    // End a meeting (host only)
    const endMeetingSession = useCallback(async (meetingId) => {
        if (!user) throw new Error('User not authenticated');

        try {
            await endMeeting(meetingId, user.id);
            return true;
        } catch (error) {
            setError(error.message);
            throw error;
        }
    }, [user]);

    // Get meeting by ID
    const getMeetingById = useCallback(async (meetingId) => {
        try {
            const meetingDoc = await getDoc(doc(db, 'meetings', meetingId));

            if (!meetingDoc.exists()) {
                throw new Error('Meeting not found');
            }

            return { id: meetingDoc.id, ...meetingDoc.data() };
        } catch (error) {
            setError(error.message);
            throw error;
        }
    }, []);

    // Validate meeting access
    const checkMeetingAccess = useCallback(async (roomName) => {
        if (!user) return { hasAccess: false, reason: 'User not authenticated' };

        try {
            return await validateMeetingAccess(roomName, user.id);
        } catch (error) {
            setError(error.message);
            return { hasAccess: false, reason: error.message };
        }
    }, [user]);

    // Get meetings by status
    const getMeetingsByStatus = useCallback((status) => {
        return meetings.filter(meeting => meeting.status === status);
    }, [meetings]);

    // Get meeting statistics
    const getMeetingStats = useCallback(() => {
        const total = meetings.length;
        const scheduled = meetings.filter(m => m.status === 'scheduled').length;
        const completed = meetings.filter(m => m.status === 'completed').length;
        const cancelled = meetings.filter(m => m.status === 'cancelled').length;

        return {
            total,
            scheduled,
            completed,
            cancelled,
            active: activeMeeting ? 1 : 0
        };
    }, [meetings, activeMeeting]);

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        // State
        meetings,
        activeMeeting,
        upcomingMeetings,
        loading,
        error,

        // Actions
        createMeeting,
        joinMeetingSession,
        leaveMeetingSession,
        endMeetingSession,
        getMeetingById,
        checkMeetingAccess,
        getMeetingsByStatus,
        getMeetingStats,
        clearError
    };
};

export default useMeeting;
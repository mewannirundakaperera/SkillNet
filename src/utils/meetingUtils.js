// src/utils/meetingUtils.js
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    getDocs,
    query,
    where,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { generateRoomName, getMeetingUrl } from '@/config/jitsi';

// Create a new meeting session
export const createMeetingSession = async (meetingData) => {
    try {
        const {
            requestId,
            hostUserId,
            hostUserName,
            participantUserId,
            participantUserName,
            subject,
            scheduledDate,
            scheduledTime,
            duration = 60,
            sessionType = 'one-to-one'
        } = meetingData;

        // Generate unique room name
        const roomName = generateRoomName(requestId, hostUserId, participantUserId);
        const meetingUrl = getMeetingUrl(roomName);

        // Create meeting document
        const meetingDoc = {
            requestId,
            roomName,
            meetingUrl,
            subject,
            scheduledDate,
            scheduledTime,
            duration,
            sessionType,
            status: 'scheduled', // scheduled, active, completed, cancelled
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),

            // Host information
            host: {
                userId: hostUserId,
                name: hostUserName,
                joined: false,
                joinedAt: null
            },

            // Participants
            participants: [
                {
                    userId: participantUserId,
                    name: participantUserName,
                    joined: false,
                    joinedAt: null,
                    role: 'participant'
                }
            ],

            // Meeting stats
            stats: {
                totalParticipants: 2,
                maxConcurrentParticipants: 0,
                actualDuration: 0,
                startTime: null,
                endTime: null
            }
        };

        const docRef = await addDoc(collection(db, 'meetings'), meetingDoc);

        return {
            id: docRef.id,
            ...meetingDoc,
            roomName,
            meetingUrl
        };
    } catch (error) {
        console.error('Error creating meeting session:', error);
        throw error;
    }
};

// Join a meeting
export const joinMeeting = async (meetingId, userId, userName) => {
    try {
        const meetingRef = doc(db, 'meetings', meetingId);

        // Update meeting document to mark user as joined
        await updateDoc(meetingRef, {
            [`participants.${userId}.joined`]: true,
            [`participants.${userId}.joinedAt`]: serverTimestamp(),
            status: 'active',
            updatedAt: serverTimestamp()
        });

        // Log meeting join event
        await addDoc(collection(db, 'meetingEvents'), {
            meetingId,
            userId,
            userName,
            eventType: 'user_joined',
            timestamp: serverTimestamp()
        });

    } catch (error) {
        console.error('Error joining meeting:', error);
        throw error;
    }
};

// Leave a meeting
export const leaveMeeting = async (meetingId, userId, userName) => {
    try {
        const meetingRef = doc(db, 'meetings', meetingId);

        // Update meeting document
        await updateDoc(meetingRef, {
            [`participants.${userId}.joined`]: false,
            [`participants.${userId}.leftAt`]: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        // Log meeting leave event
        await addDoc(collection(db, 'meetingEvents'), {
            meetingId,
            userId,
            userName,
            eventType: 'user_left',
            timestamp: serverTimestamp()
        });

    } catch (error) {
        console.error('Error leaving meeting:', error);
        throw error;
    }
};

// End a meeting
export const endMeeting = async (meetingId, endedByUserId) => {
    try {
        const meetingRef = doc(db, 'meetings', meetingId);

        await updateDoc(meetingRef, {
            status: 'completed',
            'stats.endTime': serverTimestamp(),
            endedBy: endedByUserId,
            updatedAt: serverTimestamp()
        });

        // Log meeting end event
        await addDoc(collection(db, 'meetingEvents'), {
            meetingId,
            userId: endedByUserId,
            eventType: 'meeting_ended',
            timestamp: serverTimestamp()
        });

    } catch (error) {
        console.error('Error ending meeting:', error);
        throw error;
    }
};

// Get user's meetings
export const getUserMeetings = async (userId, status = null) => {
    try {
        let meetingsQuery;

        if (status) {
            meetingsQuery = query(
                collection(db, 'meetings'),
                where('participants', 'array-contains', { userId }),
                where('status', '==', status)
            );
        } else {
            meetingsQuery = query(
                collection(db, 'meetings'),
                where('participants', 'array-contains', { userId })
            );
        }

        const snapshot = await getDocs(meetingsQuery);
        const meetings = [];

        snapshot.forEach(doc => {
            meetings.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return meetings;
    } catch (error) {
        console.error('Error getting user meetings:', error);
        throw error;
    }
};

// Send meeting invitation notification
export const sendMeetingInvitation = async (meetingData) => {
    try {
        const {
            meetingId,
            hostName,
            participantUserId,
            participantName,
            subject,
            meetingUrl,
            scheduledDate,
            scheduledTime
        } = meetingData;

        // Create notification document
        const notification = {
            type: 'meeting_invitation',
            recipientId: participantUserId,
            recipientName: participantName,
            senderId: meetingData.hostUserId,
            senderName: hostName,
            title: 'Meeting Invitation',
            message: `${hostName} has invited you to join a meeting: ${subject}`,
            data: {
                meetingId,
                meetingUrl,
                subject,
                scheduledDate,
                scheduledTime
            },
            read: false,
            createdAt: serverTimestamp()
        };

        await addDoc(collection(db, 'notifications'), notification);

        return notification;
    } catch (error) {
        console.error('Error sending meeting invitation:', error);
        throw error;
    }
};

// Validate meeting access
export const validateMeetingAccess = async (roomName, userId) => {
    try {
        const meetingsQuery = query(
            collection(db, 'meetings'),
            where('roomName', '==', roomName)
        );

        const snapshot = await getDocs(meetingsQuery);

        if (snapshot.empty) {
            return { hasAccess: false, reason: 'Meeting not found' };
        }

        const meeting = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };

        // Check if user is host or participant
        const isHost = meeting.host.userId === userId;
        const isParticipant = meeting.participants.some(p => p.userId === userId);

        if (!isHost && !isParticipant) {
            return { hasAccess: false, reason: 'You are not invited to this meeting' };
        }

        if (meeting.status === 'cancelled') {
            return { hasAccess: false, reason: 'This meeting has been cancelled' };
        }

        return {
            hasAccess: true,
            meeting,
            userRole: isHost ? 'host' : 'participant'
        };
    } catch (error) {
        console.error('Error validating meeting access:', error);
        return { hasAccess: false, reason: 'Error validating access' };
    }
};

// Format meeting time for display
export const formatMeetingTime = (date, time) => {
    try {
        if (!date || !time) return 'Time not specified';

        const meetingDateTime = new Date(`${date}T${time}`);
        return meetingDateTime.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return 'Invalid time format';
    }
};

// Check if meeting is starting soon (within 15 minutes)
export const isMeetingStartingSoon = (scheduledDate, scheduledTime) => {
    try {
        if (!scheduledDate || !scheduledTime) return false;

        const meetingDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
        const now = new Date();
        const timeDiff = meetingDateTime.getTime() - now.getTime();
        const minutesDiff = timeDiff / (1000 * 60);

        return minutesDiff <= 15 && minutesDiff >= -5; // 15 minutes before to 5 minutes after
    } catch (error) {
        return false;
    }
};

export default {
    createMeetingSession,
    joinMeeting,
    leaveMeeting,
    endMeeting,
    getUserMeetings,
    sendMeetingInvitation,
    validateMeetingAccess,
    formatMeetingTime,
    isMeetingStartingSoon
};
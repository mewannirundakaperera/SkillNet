// src/services/MeetingManagementService.js
import {
    doc,
    updateDoc,
    serverTimestamp,
    getDoc,
    addDoc,
    collection,
    query,
    where,
    getDocs,
    onSnapshot,
    arrayUnion,
    increment,
    Timestamp
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export class MeetingManagementService {
    // Meeting status constants
    static MEETING_STATUS = {
        SCHEDULED: 'scheduled',
        STARTING: 'starting',
        ACTIVE: 'active',
        PAUSED: 'paused',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled',
        EXPIRED: 'expired'
    };

    // Meeting events
    static MEETING_EVENTS = {
        CREATED: 'meeting_created',
        STARTED: 'meeting_started',
        JOINED: 'participant_joined',
        LEFT: 'participant_left',
        PAUSED: 'meeting_paused',
        RESUMED: 'meeting_resumed',
        COMPLETED: 'meeting_completed',
        EXPIRED: 'meeting_expired',
        CANCELLED: 'meeting_cancelled'
    };

    /**
     * Create a new meeting session with monitoring
     */
    static async createMeetingSession(requestId, requestType, meetingData) {
        try {
            const meetingSession = {
                requestId,
                requestType,
                roomId: meetingData.roomId,
                meetingUrl: meetingData.meetingUrl,
                scheduledStartTime: meetingData.scheduledStartTime,
                scheduledEndTime: meetingData.scheduledEndTime,
                duration: meetingData.duration, // in minutes
                status: this.MEETING_STATUS.SCHEDULED,
                participants: meetingData.participants || [],
                creatorId: meetingData.creatorId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                actualStartTime: null,
                actualEndTime: null,
                totalParticipants: 0,
                maxParticipants: meetingData.maxParticipants || 10,
                isRecording: false,
                notes: '',
                tags: []
            };

            const docRef = await addDoc(collection(db, 'meetingSessions'), meetingSession);
            console.log('✅ Meeting session created:', docRef.id);

            // Start monitoring this meeting
            this.startMeetingMonitoring(docRef.id);

            return {
                success: true,
                meetingSessionId: docRef.id,
                meetingSession: { ...meetingSession, id: docRef.id }
            };
        } catch (error) {
            console.error('❌ Error creating meeting session:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Start monitoring a meeting session
     */
    static startMeetingMonitoring(meetingSessionId) {
        console.log('🔍 Starting monitoring for meeting session:', meetingSessionId);

        // Set up real-time monitoring
        const unsubscribe = onSnapshot(
            doc(db, 'meetingSessions', meetingSessionId),
            async (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const meetingData = docSnapshot.data();
                    await this.processMeetingStatus(meetingSessionId, meetingData);
                }
            },
            (error) => {
                console.error('❌ Error monitoring meeting session:', error);
            }
        );

        // Store unsubscribe function for cleanup
        this.activeMonitors.set(meetingSessionId, unsubscribe);

        // Start time-based monitoring
        this.startTimeBasedMonitoring(meetingSessionId);
    }

    /**
     * Process meeting status changes
     */
    static async processMeetingStatus(meetingSessionId, meetingData) {
        const now = new Date();
        const scheduledStart = meetingData.scheduledStartTime?.toDate();
        const scheduledEnd = meetingData.scheduledEndTime?.toDate();

        try {
            let newStatus = meetingData.status;
            let updates = {};

            // Check if meeting should start
            if (meetingData.status === this.MEETING_STATUS.SCHEDULED && 
                scheduledStart && now >= scheduledStart) {
                newStatus = this.MEETING_STATUS.STARTING;
                updates.actualStartTime = serverTimestamp();
                updates.status = newStatus;
                console.log('🟢 Meeting starting:', meetingSessionId);
            }

            // Check if meeting should end
            if (scheduledEnd && now >= scheduledEnd && 
                meetingData.status !== this.MEETING_STATUS.COMPLETED) {
                newStatus = this.MEETING_STATUS.EXPIRED;
                updates.actualEndTime = serverTimestamp();
                updates.status = newStatus;
                console.log('🔴 Meeting expired:', meetingSessionId);

                // Auto-complete the request
                await this.autoCompleteRequest(meetingData.requestId, meetingData.requestType);
            }

            // Apply updates if needed
            if (Object.keys(updates).length > 0) {
                updates.updatedAt = serverTimestamp();
                await updateDoc(doc(db, 'meetingSessions', meetingSessionId), updates);
                
                // Log the event
                await this.logMeetingEvent(meetingSessionId, {
                    type: newStatus === this.MEETING_STATUS.STARTING ? 
                        this.MEETING_EVENTS.STARTED : this.MEETING_EVENTS.EXPIRED,
                    timestamp: serverTimestamp(),
                    details: updates
                });
            }

        } catch (error) {
            console.error('❌ Error processing meeting status:', error);
        }
    }

    /**
     * Start time-based monitoring for a meeting
     */
    static startTimeBasedMonitoring(meetingSessionId) {
        // Check every minute
        const intervalId = setInterval(async () => {
            try {
                const meetingDoc = await getDoc(doc(db, 'meetingSessions', meetingSessionId));
                if (meetingDoc.exists()) {
                    const meetingData = meetingDoc.data();
                    await this.processMeetingStatus(meetingSessionId, meetingData);
                } else {
                    // Meeting no longer exists, stop monitoring
                    this.stopMeetingMonitoring(meetingSessionId);
                    clearInterval(intervalId);
                }
            } catch (error) {
                console.error('❌ Error in time-based monitoring:', error);
            }
        }, 60000); // Check every minute

        // Store interval ID for cleanup
        this.activeIntervals.set(meetingSessionId, intervalId);
    }

    /**
     * Stop monitoring a meeting session
     */
    static stopMeetingMonitoring(meetingSessionId) {
        // Unsubscribe from real-time updates
        const unsubscribe = this.activeMonitors.get(meetingSessionId);
        if (unsubscribe) {
            unsubscribe();
            this.activeMonitors.delete(meetingSessionId);
        }

        // Clear interval
        const intervalId = this.activeIntervals.get(meetingSessionId);
        if (intervalId) {
            clearInterval(intervalId);
            this.activeIntervals.delete(meetingSessionId);
        }

        console.log('🛑 Stopped monitoring meeting session:', meetingSessionId);
    }

    /**
     * Auto-complete request when meeting ends
     */
    static async autoCompleteRequest(requestId, requestType) {
        try {
            console.log('✅ Auto-completing request:', requestId, 'Type:', requestType);

            if (requestType === 'one-to-one') {
                // Update one-to-one request
                await updateDoc(doc(db, 'requests', requestId), {
                    status: 'completed',
                    completedAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            } else if (requestType === 'group') {
                // Update group request
                await updateDoc(doc(db, 'grouprequests', requestId), {
                    status: 'completed',
                    completedAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            }

            // Log completion event
            await this.logMeetingEvent(requestId, {
                type: 'request_auto_completed',
                timestamp: serverTimestamp(),
                details: { requestType, requestId }
            });

            console.log('✅ Request auto-completed successfully');
        } catch (error) {
            console.error('❌ Error auto-completing request:', error);
        }
    }

    /**
     * Log meeting events for monitoring and analytics
     */
    static async logMeetingEvent(meetingSessionId, eventData) {
        try {
            const event = {
                meetingSessionId,
                type: eventData.type,
                timestamp: eventData.timestamp,
                details: eventData.details,
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, 'meetingEvents'), event);
            console.log('📝 Meeting event logged:', event.type);
        } catch (error) {
            console.error('❌ Error logging meeting event:', error);
        }
    }

    /**
     * Update meeting status manually
     */
    static async updateMeetingStatus(meetingSessionId, newStatus, additionalData = {}) {
        try {
            const updates = {
                status: newStatus,
                updatedAt: serverTimestamp(),
                ...additionalData
            };

            await updateDoc(doc(db, 'meetingSessions', meetingSessionId), updates);
            
            // Log the status change
            await this.logMeetingEvent(meetingSessionId, {
                type: `status_changed_to_${newStatus}`,
                timestamp: serverTimestamp(),
                details: updates
            });

            return { success: true };
        } catch (error) {
            console.error('❌ Error updating meeting status:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get active meetings for a user
     */
    static async getUserActiveMeetings(userId) {
        try {
            const q = query(
                collection(db, 'meetingSessions'),
                where('participants', 'array-contains', userId),
                where('status', 'in', [this.MEETING_STATUS.STARTING, this.MEETING_STATUS.ACTIVE])
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('❌ Error getting user active meetings:', error);
            return [];
        }
    }

    /**
     * Get meeting statistics
     */
    static async getMeetingStats(userId, timeRange = 'week') {
        try {
            const now = new Date();
            let startDate;

            switch (timeRange) {
                case 'day':
                    startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                    break;
                case 'week':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'month':
                    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                default:
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            }

            const q = query(
                collection(db, 'meetingSessions'),
                where('participants', 'array-contains', userId),
                where('createdAt', '>=', Timestamp.fromDate(startDate))
            );

            const snapshot = await getDocs(q);
            const meetings = snapshot.docs.map(doc => doc.data());

            return {
                total: meetings.length,
                completed: meetings.filter(m => m.status === this.MEETING_STATUS.COMPLETED).length,
                active: meetings.filter(m => m.status === this.MEETING_STATUS.ACTIVE).length,
                totalDuration: meetings.reduce((sum, m) => sum + (m.duration || 0), 0),
                averageDuration: meetings.length > 0 ? 
                    meetings.reduce((sum, m) => sum + (m.duration || 0), 0) / meetings.length : 0
            };
        } catch (error) {
            console.error('❌ Error getting meeting stats:', error);
            return {
                total: 0,
                completed: 0,
                active: 0,
                totalDuration: 0,
                averageDuration: 0
            };
        }
    }

    /**
     * Clean up expired meetings
     */
    static async cleanupExpiredMeetings() {
        try {
            const now = new Date();
            const q = query(
                collection(db, 'meetingSessions'),
                where('status', 'in', [this.MEETING_STATUS.SCHEDULED, this.MEETING_STATUS.STARTING]),
                where('scheduledEndTime', '<', Timestamp.fromDate(now))
            );

            const snapshot = await getDocs(q);
            const batch = [];

            snapshot.docs.forEach(doc => {
                batch.push(updateDoc(doc.ref, {
                    status: this.MEETING_STATUS.EXPIRED,
                    actualEndTime: serverTimestamp(),
                    updatedAt: serverTimestamp()
                }));
            });

            if (batch.length > 0) {
                await Promise.all(batch);
                console.log(`🧹 Cleaned up ${batch.length} expired meetings`);
            }
        } catch (error) {
            console.error('❌ Error cleaning up expired meetings:', error);
        }
    }

    // Static properties for tracking active monitors and intervals
    static activeMonitors = new Map();
    static activeIntervals = new Map();

    /**
     * Cleanup all active monitoring
     */
    static cleanupAllMonitoring() {
        // Stop all active monitors
        this.activeMonitors.forEach((unsubscribe, meetingId) => {
            unsubscribe();
        });
        this.activeMonitors.clear();

        // Clear all intervals
        this.activeIntervals.forEach((intervalId, meetingId) => {
            clearInterval(intervalId);
        });
        this.activeIntervals.clear();

        console.log('🧹 Cleaned up all meeting monitoring');
    }
}

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        MeetingManagementService.cleanupAllMonitoring();
    });
}

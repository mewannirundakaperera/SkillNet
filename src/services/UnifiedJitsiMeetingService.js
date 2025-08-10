// src/services/UnifiedJitsiMeetingService.js
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
    arrayUnion,
    increment
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export class UnifiedJitsiMeetingService {
    // Jitsi Meet public server
    static JITSI_DOMAIN = 'meet.jit.si';

    /**
     * Generate unique room ID based on request type
     */
    static generateRoomId(requestType, requestId, participants) {
        const timestamp = Date.now();
        const shortRequestId = requestId.slice(-8);

        if (requestType === 'one-to-one') {
            const userHash = participants.sort().join('-').slice(-16);
            return `SkillNet-1to1-${shortRequestId}-${userHash}-${timestamp}`.replace(/[^a-zA-Z0-9-]/g, '');
        } else {
            // Group meeting
            const participantCount = participants.length;
            return `SkillNet-Group-${shortRequestId}-${participantCount}p-${timestamp}`.replace(/[^a-zA-Z0-9-]/g, '');
        }
    }

    /**
     * Generate Jitsi meeting URL with proper configuration
     */
    static generateMeetingUrl(roomId, config = {}) {
        const baseUrl = `https://${this.JITSI_DOMAIN}/${roomId}`;

        // Build configuration object for Jitsi
        const jitsiConfig = {
            startWithAudioMuted: config.startWithAudioMuted || false,
            startWithVideoMuted: config.startWithVideoMuted || false,
            enableWelcomePage: false,
            enableClosePage: false,
            disableThirdPartyRequests: true,
            enableNoisyMicDetection: true,
            enableOpusRed: true,
            enableTcc: true,
            enableRemb: true,
            enableSimulcast: false,
            requireDisplayName: true,
        };

        const interfaceConfig = {
            TOOLBAR_BUTTONS: [
                'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
                'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
                'security'
            ],
            SETTINGS_SECTIONS: ['devices', 'language', 'moderator', 'profile', 'calendar'],
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            BRAND_WATERMARK_LINK: '',
            SHOW_POWERED_BY: false,
            SHOW_PROMOTIONAL_CLOSE_PAGE: false,
            DISPLAY_WELCOME_FOOTER: false,
            MOBILE_APP_PROMO: false,
            NATIVE_APP_NAME: 'SkillNet',
            PROVIDER_NAME: 'SkillNet',
            LANG_DETECTION: true,
            CONNECTION_INDICATOR_AUTO_HIDE_ENABLED: true,
            CONNECTION_INDICATOR_AUTO_HIDE_TIMEOUT: 5000,
            CONNECTION_INDICATOR_DISABLED: false,
            VIDEO_LAYOUT_FIT: 'both',
            filmStripOnly: false,
            VERTICAL_FILMSTRIP: true,
        };

        // Encode configuration as URL fragment
        const configParam = encodeURIComponent(JSON.stringify({
            config: jitsiConfig,
            interfaceConfig: interfaceConfig,
            userInfo: config.userInfo || {}
        }));

        return `${baseUrl}#jitsi_meet_external_api_config=${configParam}`;
    }

    /**
     * Create meeting for ONE-TO-ONE accepted request
     */
    static async createOneToOneMeeting(requestId, requestData, accepterUserId, accepterName) {
        try {
            console.log('🎥 Creating one-to-one Jitsi meeting for request:', requestId);

            const requesterUserId = requestData.userId || requestData.createdBy;
            const requesterName = requestData.userName || requestData.createdByName || 'Student';

            const participants = [requesterUserId, accepterUserId];
            const roomId = this.generateRoomId('one-to-one', requestId, participants);

            const meetingUrl = this.generateMeetingUrl(roomId, {
                startWithAudioMuted: false,
                startWithVideoMuted: false,
                userInfo: {
                    displayName: accepterName
                }
            });

            const meetingData = {
                // Request context
                requestId,
                requestType: 'one-to-one',
                requestTitle: requestData.topic || requestData.title || 'Study Session',
                requestDescription: requestData.message || requestData.description || '',

                // Meeting details
                roomId,
                meetingUrl,
                jitsiDomain: this.JITSI_DOMAIN,

                // Participants
                requesterUserId,
                requesterName,
                accepterUserId,
                accepterName,
                participants: [
                    {
                        userId: requesterUserId,
                        name: requesterName,
                        role: 'requester',
                        joinedAt: null
                    },
                    {
                        userId: accepterUserId,
                        name: accepterName,
                        role: 'accepter',
                        joinedAt: null
                    }
                ],
                participantCount: 2,
                maxParticipants: 2,

                // Meeting metadata
                subject: `${requestData.topic || 'Study Session'} - ${requesterName} & ${accepterName}`,
                category: requestData.category || 'general',
                urgency: requestData.urgency || 'medium',

                // Status and timing
                status: 'scheduled',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),

                // Session tracking
                sessionStarted: false,
                sessionEnded: false,
                startedAt: null,
                endedAt: null,
                duration: 0,
                activeParticipants: 0,

                // Meeting configuration
                config: {
                    enableChat: true,
                    enableScreenSharing: true,
                    enableRecording: false,
                    startWithAudioMuted: false,
                    startWithVideoMuted: false,
                    requireDisplayName: true
                }
            };

            // Save meeting to database
            const meetingRef = await addDoc(collection(db, 'meetings'), meetingData);

            // Update the request with meeting information
            await this.updateRequestWithMeeting('requests', requestId, {
                meetingId: meetingRef.id,
                meetingUrl,
                roomId,
                meetingStatus: 'scheduled',
                meetingCreatedAt: serverTimestamp()
            });

            console.log('✅ One-to-one meeting created:', meetingRef.id);
            return {
                success: true,
                meetingId: meetingRef.id,
                meetingUrl,
                roomId,
                meetingData
            };

        } catch (error) {
            console.error('❌ Error creating one-to-one meeting:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Create meeting for GROUP REQUEST when status becomes 'accepted'
     */
    static async createGroupMeeting(requestId, groupRequestData) {
        try {
            console.log('🎥 Creating group Jitsi meeting for request:', requestId);

            const participants = groupRequestData.participants || [];
            const creatorUserId = groupRequestData.userId || groupRequestData.createdBy;
            const creatorName = groupRequestData.createdByName || groupRequestData.userName || 'Host';

            if (participants.length < 1) {
                throw new Error('Group meeting requires at least 1 participant');
            }

            const roomId = this.generateRoomId('group', requestId, participants);

            const meetingUrl = this.generateMeetingUrl(roomId, {
                startWithAudioMuted: true, // Start muted for group calls
                startWithVideoMuted: false,
                userInfo: {
                    displayName: creatorName
                }
            });

            // Build participants array with proper structure
            const participantsData = [
                {
                    userId: creatorUserId,
                    name: creatorName,
                    role: 'host',
                    joinedAt: null
                },
                ...participants.map(participantId => ({
                    userId: participantId,
                    name: `Participant ${participantId.slice(-4)}`, // Will be updated when they join
                    role: 'participant',
                    joinedAt: null
                }))
            ];

            const meetingData = {
                // Request context
                requestId,
                requestType: 'group',
                requestTitle: groupRequestData.title || 'Group Study Session',
                requestDescription: groupRequestData.description || '',
                targetGroupId: groupRequestData.targetGroupId || groupRequestData.groupId,
                groupName: groupRequestData.groupName,

                // Meeting details
                roomId,
                meetingUrl,
                jitsiDomain: this.JITSI_DOMAIN,

                // Participants
                hostUserId: creatorUserId,
                hostName: creatorName,
                participants: participantsData,
                participantCount: participants.length + 1, // +1 for host
                maxParticipants: 50, // Jitsi limit

                // Meeting metadata
                subject: `${groupRequestData.title} - Group Session`,
                category: groupRequestData.category || 'group-learning',
                skills: groupRequestData.skills || [],

                // Status and timing
                status: 'scheduled',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),

                // Session tracking
                sessionStarted: false,
                sessionEnded: false,
                startedAt: null,
                endedAt: null,
                duration: 0,
                activeParticipants: 0,

                // Meeting configuration
                config: {
                    enableChat: true,
                    enableScreenSharing: true,
                    enableRecording: true, // Allow recording for group sessions
                    startWithAudioMuted: true,
                    startWithVideoMuted: false,
                    requireDisplayName: true,
                    enableLobby: false, // No lobby for group sessions
                    enableBreakoutRooms: false
                }
            };

            // Save meeting to database
            const meetingRef = await addDoc(collection(db, 'meetings'), meetingData);

            // Update the group request with meeting information
            await this.updateRequestWithMeeting('grouprequests', requestId, {
                meetingId: meetingRef.id,
                meetingUrl,
                roomId,
                meetingStatus: 'scheduled',
                meetingCreatedAt: serverTimestamp()
            });

            console.log('✅ Group meeting created:', meetingRef.id);
            return {
                success: true,
                meetingId: meetingRef.id,
                meetingUrl,
                roomId,
                meetingData
            };

        } catch (error) {
            console.error('❌ Error creating group meeting:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update request document with meeting information
     */
    static async updateRequestWithMeeting(collection, requestId, meetingInfo) {
        try {
            const requestRef = doc(db, collection, requestId);
            await updateDoc(requestRef, {
                ...meetingInfo,
                updatedAt: serverTimestamp()
            });

            console.log('✅ Request updated with meeting info');
            return { success: true };
        } catch (error) {
            console.error('❌ Error updating request with meeting info:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get meeting details for any type of request
     */
    static async getMeetingForRequest(requestId, requestType = 'one-to-one') {
        try {
            const collection = requestType === 'one-to-one' ? 'requests' : 'grouprequests';

            // First try to get meeting info from request document
            const requestRef = doc(db, collection, requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                throw new Error('Request not found');
            }

            const requestData = requestSnap.data();

            if (requestData.meetingId) {
                // Get full meeting details
                const meetingRef = doc(db, 'meetings', requestData.meetingId);
                const meetingSnap = await getDoc(meetingRef);

                if (meetingSnap.exists()) {
                    return {
                        success: true,
                        meeting: { id: meetingSnap.id, ...meetingSnap.data() },
                        request: requestData
                    };
                }
            }

            // If no meeting exists, return request data only
            return {
                success: true,
                meeting: null,
                request: requestData
            };

        } catch (error) {
            console.error('❌ Error getting meeting for request:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Join meeting (track participant joining)
     */
    static async joinMeeting(meetingId, userId, userName) {
        try {
            const meetingRef = doc(db, 'meetings', meetingId);
            const meetingSnap = await getDoc(meetingRef);

            if (!meetingSnap.exists()) {
                throw new Error('Meeting not found');
            }

            const meetingData = meetingSnap.data();
            const now = serverTimestamp();

            // Update participant join time
            const updatedParticipants = meetingData.participants.map(p => {
                if (p.userId === userId) {
                    return { ...p, name: userName, joinedAt: now };
                }
                return p;
            });

            // Update meeting
            await updateDoc(meetingRef, {
                participants: updatedParticipants,
                activeParticipants: increment(1),
                sessionStarted: true,
                startedAt: meetingData.startedAt || now,
                updatedAt: now
            });

            // Log join event
            await addDoc(collection(db, 'meetingEvents'), {
                meetingId,
                requestId: meetingData.requestId,
                userId,
                userName,
                eventType: 'participant_joined',
                timestamp: now
            });

            console.log('✅ User joined meeting:', userId);
            return { success: true };

        } catch (error) {
            console.error('❌ Error joining meeting:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Leave meeting (track participant leaving)
     */
    static async leaveMeeting(meetingId, userId, userName) {
        try {
            const meetingRef = doc(db, 'meetings', meetingId);
            const meetingSnap = await getDoc(meetingRef);

            if (!meetingSnap.exists()) {
                throw new Error('Meeting not found');
            }

            const meetingData = meetingSnap.data();
            const now = serverTimestamp();

            // Update meeting
            await updateDoc(meetingRef, {
                activeParticipants: increment(-1),
                updatedAt: now
            });

            // Log leave event
            await addDoc(collection(db, 'meetingEvents'), {
                meetingId,
                requestId: meetingData.requestId,
                userId,
                userName,
                eventType: 'participant_left',
                timestamp: now
            });

            console.log('✅ User left meeting:', userId);
            return { success: true };

        } catch (error) {
            console.error('❌ Error leaving meeting:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * End meeting (mark as completed)
     */
    static async endMeeting(meetingId, userId) {
        try {
            const meetingRef = doc(db, 'meetings', meetingId);
            const meetingSnap = await getDoc(meetingRef);

            if (!meetingSnap.exists()) {
                throw new Error('Meeting not found');
            }

            const meetingData = meetingSnap.data();
            const now = serverTimestamp();

            // Calculate duration (approximate)
            const duration = meetingData.startedAt
                ? Math.floor((Date.now() - meetingData.startedAt.toDate().getTime()) / 1000)
                : 0;

            // Update meeting
            await updateDoc(meetingRef, {
                status: 'completed',
                sessionEnded: true,
                endedAt: now,
                duration,
                activeParticipants: 0,
                updatedAt: now
            });

            // Update corresponding request status
            const collection = meetingData.requestType === 'one-to-one' ? 'requests' : 'grouprequests';
            const requestRef = doc(db, collection, meetingData.requestId);
            await updateDoc(requestRef, {
                status: 'completed',
                meetingStatus: 'completed',
                completedAt: now,
                updatedAt: now
            });

            // Log end event
            await addDoc(collection(db, 'meetingEvents'), {
                meetingId,
                requestId: meetingData.requestId,
                userId,
                eventType: 'meeting_ended',
                duration,
                timestamp: now
            });

            console.log('✅ Meeting ended:', meetingId);
            return { success: true };

        } catch (error) {
            console.error('❌ Error ending meeting:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get user's meeting history
     */
    static async getUserMeetings(userId, limit = 10) {
        try {
            const meetingsQuery = query(
                collection(db, 'meetings'),
                where('participants', 'array-contains-any', [
                    { userId },
                    userId
                ]),
                orderBy('createdAt', 'desc'),
                limit(limit)
            );

            const snapshot = await getDocs(meetingsQuery);
            const meetings = [];

            snapshot.forEach(doc => {
                meetings.push({ id: doc.id, ...doc.data() });
            });

            return { success: true, meetings };

        } catch (error) {
            console.error('❌ Error getting user meetings:', error);
            return { success: false, error: error.message, meetings: [] };
        }
    }

    /**
     * Validate meeting access for a user
     */
    static async validateMeetingAccess(roomId, userId) {
        try {
            // Find meeting by room ID
            const meetingsQuery = query(
                collection(db, 'meetings'),
                where('roomId', '==', roomId)
            );

            const snapshot = await getDocs(meetingsQuery);

            if (snapshot.empty) {
                return { hasAccess: false, reason: 'Meeting not found' };
            }

            const meetingDoc = snapshot.docs[0];
            const meetingData = meetingDoc.data();

            // Check if user is a participant
            const isParticipant = meetingData.participants.some(p =>
                p.userId === userId || p === userId
            );

            if (!isParticipant) {
                return { hasAccess: false, reason: 'Not authorized to join this meeting' };
            }

            // Check meeting status
            if (meetingData.status === 'completed') {
                return { hasAccess: false, reason: 'Meeting has ended' };
            }

            return {
                hasAccess: true,
                meeting: { id: meetingDoc.id, ...meetingData }
            };

        } catch (error) {
            console.error('❌ Error validating meeting access:', error);
            return { hasAccess: false, reason: 'Error validating access' };
        }
    }
}

export default UnifiedJitsiMeetingService;
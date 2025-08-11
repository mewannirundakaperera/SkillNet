// src/services/databaseService.js
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    getDoc,
    setDoc,
    serverTimestamp,
    arrayUnion,
    arrayRemove,
    limit,
    startAfter,
    increment
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import UnifiedJitsiMeetingService from '@/services/UnifiedJitsiMeetingService';

/**
 * Comprehensive Database Service for Request Flow Management
 * Handles the complete lifecycle: draft -> open -> active -> completed -> archived
 */
export const databaseService = {
    // ===== REQUEST CREATION AND DRAFTING =====
    
    /**
     * Create a new one-to-one request (draft or published)
     */
    async createRequest(requestData, userId, isDraft = false) {
        try {
            console.log('🔄 Creating request:', { requestData, userId, isDraft });

            const status = isDraft ? 'draft' : 'open';
            const timestamp = serverTimestamp();

            const completeRequestData = {
                // Core request information
                topic: requestData.topic || requestData.title,
                title: requestData.title || requestData.topic,
                description: requestData.description || '',
                subject: requestData.subject || 'General',
                
                // User identification
                userId,
                createdBy: userId,
                userName: requestData.userName || 'User',
                userEmail: requestData.userEmail || '',
                userAvatar: requestData.userAvatar || '',
                
                // Scheduling
                preferredDate: requestData.preferredDate || null,
                preferredTime: requestData.preferredTime || null,
                duration: requestData.duration || '60',
                
                // Payment and visibility
                paymentAmount: requestData.paymentAmount || '0',
                visibility: requestData.visibility || 'public',
                
                // Status and workflow
                status,
                type: 'one-to-one',
                
                // Participation tracking
                participants: [],
                participantCount: 0,
                maxParticipants: 1,
                responses: [],
                responseCount: 0,
                
                // Meeting management
                meetingId: null,
                meetingUrl: null,
                meetingStatus: null,
                roomId: null,
                
                // Acceptance tracking
                acceptedBy: null,
                acceptedByName: null,
                acceptedAt: null,
                
                // Metadata
                views: 0,
                likes: 0,
                featured: false,
                tags: requestData.tags || [],
                
                // Timestamps
                createdAt: timestamp,
                updatedAt: timestamp,
                publishedAt: isDraft ? null : timestamp
            };

            const docRef = await addDoc(collection(db, 'requests'), completeRequestData);
            console.log('✅ Request created with ID:', docRef.id);

            return {
                success: true,
                requestId: docRef.id,
                message: isDraft ? 'Draft saved successfully!' : 'Request published successfully!'
            };
        } catch (error) {
            console.error('❌ Error creating request:', error);
            return { success: false, message: `Failed to create request: ${error.message}` };
        }
    },

    /**
     * Update existing request (for editing)
     */
    async updateRequest(requestId, updateData, userId) {
        try {
            console.log('🔄 Updating request:', { requestId, updateData, userId });

            const requestRef = doc(db, 'requests', requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestSnap.data();
            if (requestData.userId !== userId) {
                return { success: false, message: 'You can only update your own requests' };
            }

            // Don't allow status changes through update
            const { status, ...safeUpdateData } = updateData;
            
            const finalUpdateData = {
                ...safeUpdateData,
                updatedAt: serverTimestamp()
            };

            await updateDoc(requestRef, finalUpdateData);
            console.log('✅ Request updated successfully');

            return { success: true, message: 'Request updated successfully!' };
        } catch (error) {
            console.error('❌ Error updating request:', error);
            return { success: false, message: `Failed to update request: ${error.message}` };
        }
    },

    /**
     * Publish a draft request
     */
    async publishDraft(requestId, userId) {
        try {
            console.log('🔄 Publishing draft:', { requestId, userId });

            const requestRef = doc(db, 'requests', requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestSnap.data();
            if (requestData.userId !== userId) {
                return { success: false, message: 'You can only publish your own drafts' };
            }

            if (requestData.status !== 'draft') {
                return { success: false, message: 'Only draft requests can be published' };
            }

            await updateDoc(requestRef, {
                status: 'open',
                publishedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            console.log('✅ Draft published successfully');
            return { success: true, message: 'Draft published successfully!' };
        } catch (error) {
            console.error('❌ Error publishing draft:', error);
            return { success: false, message: `Failed to publish draft: ${error.message}` };
        }
    },

    // ===== REQUEST RESPONSES AND ACCEPTANCE =====

    /**
     * Respond to an open request (accept/decline)
     */
    async respondToRequest(requestId, responseData, userId) {
        try {
            console.log('🔄 Responding to request:', { requestId, responseData, userId });

            const requestRef = doc(db, 'requests', requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestSnap.data();
            
            console.log('🔍 Request data:', {
                id: requestSnap.id,
                status: requestData.status,
                userId: requestData.userId,
                createdBy: requestData.createdBy,
                hasResponses: !!requestData.responses,
                responseCount: requestData.responses?.length || 0
            });
            
            // Check if request is open for responses
            console.log('🔍 Request status check:', { 
                requestId, 
                status: requestData.status, 
                expectedStatus: 'open',
                isOpen: requestData.status === 'open'
            });
            
            if (requestData.status !== 'open') {
                return { success: false, message: `This request is not accepting responses. Current status: ${requestData.status}` };
            }

            // Check if user is not the creator
            console.log('🔍 User check:', { 
                requestUserId: requestData.userId, 
                currentUserId: userId,
                isOwnRequest: requestData.userId === userId
            });
            
            if (requestData.userId === userId) {
                return { success: false, message: 'You cannot respond to your own request' };
            }

            // Check if user already responded
            console.log('🔍 Existing response check:', { 
                hasResponses: !!requestData.responses,
                responseCount: requestData.responses?.length || 0,
                existingResponse: requestData.responses?.find(r => r.responderId === userId)
            });
            
            const existingResponse = requestData.responses?.find(r => r.responderId === userId);
            if (existingResponse) {
                return { success: false, message: 'You have already responded to this request' };
            }

            const response = {
                id: `${userId}-${Date.now()}`,
                responderId: userId,
                responderName: responseData.responderName || 'Unknown',
                responderEmail: responseData.responderEmail || '',
                status: responseData.status, // 'accepted', 'declined', or 'not_interested'
                message: responseData.message || '',
                respondedAt: serverTimestamp()
            };

            const updateData = {
                responses: arrayUnion(response),
                responseCount: increment(1),
                updatedAt: serverTimestamp()
            };

            // If accepted, create meeting and update status
            if (responseData.status === 'accepted') {
                try {
                    console.log('🎥 Creating meeting for accepted request:', requestId);
                    console.log('👤 Accepter:', { userId, name: responseData.responderName });
                    
                    // Create Jitsi meeting
                    const meetingInfo = await UnifiedJitsiMeetingService.createOneToOneMeeting(
                        requestId,
                        requestData,
                        userId,
                        responseData.responderName
                    );

                    console.log('🎥 Meeting creation result:', meetingInfo);

                    if (meetingInfo.success) {
                        updateData.status = 'active';
                        updateData.meetingId = meetingInfo.meetingId;
                        updateData.meetingUrl = meetingInfo.meetingUrl;
                        updateData.roomId = meetingInfo.roomId;
                        updateData.meetingStatus = 'scheduled';
                        updateData.acceptedBy = userId;
                        updateData.acceptedByName = responseData.responderName;
                        updateData.acceptedAt = serverTimestamp();
                        updateData.participants = [userId, requestData.userId];
                        updateData.participantCount = 2;
                        
                        console.log('✅ Meeting data added to update:', updateData);
                    } else {
                        console.error('❌ Meeting creation failed:', meetingInfo);
                    }
                } catch (meetingError) {
                    console.error('❌ Meeting creation error:', meetingError);
                    // Continue with response even if meeting creation fails
                }
            }

            await updateDoc(requestRef, updateData);
            console.log('✅ Response submitted successfully');

            // If user is not interested, add to hidden requests collection
            if (responseData.status === 'not_interested') {
                try {
                    const hiddenRequestRef = doc(db, 'hiddenRequests', `${userId}_${requestId}`);
                    await setDoc(hiddenRequestRef, {
                        userId,
                        requestId,
                        hiddenAt: serverTimestamp(),
                        requestData: {
                            topic: requestData.topic,
                            subject: requestData.subject,
                            paymentAmount: requestData.paymentAmount
                        }
                    });
                    console.log('✅ Request hidden for user:', userId);
                } catch (hideError) {
                    console.error('❌ Error hiding request:', hideError);
                    // Continue even if hiding fails
                }
            }

            return {
                success: true,
                message: responseData.status === 'accepted' ? 
                    'Request accepted! Meeting has been scheduled.' : 
                    responseData.status === 'not_interested' ?
                    'Request hidden from your view.' :
                    'Response submitted successfully.',
                meetingUrl: updateData.meetingUrl || null
            };
        } catch (error) {
            console.error('❌ Error responding to request:', error);
            return { success: false, message: `Failed to respond: ${error.message}` };
        }
    },

    // ===== REQUEST STATUS MANAGEMENT =====

    /**
     * Complete an active request
     */
    async completeRequest(requestId, userId) {
        try {
            console.log('🔄 Completing request:', { requestId, userId });

            const requestRef = doc(db, 'requests', requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestSnap.data();
            
            // Only creator or accepted user can complete
            if (requestData.userId !== userId && requestData.acceptedBy !== userId) {
                return { success: false, message: 'You are not authorized to complete this request' };
            }

            if (requestData.status !== 'active') {
                return { success: false, message: 'Only active requests can be completed' };
            }

            // End the meeting if it exists
            if (requestData.meetingId) {
                try {
                    await UnifiedJitsiMeetingService.endMeeting(requestData.meetingId, userId);
                } catch (meetingError) {
                    console.warn('Meeting end failed:', meetingError);
                }
            }

            await updateDoc(requestRef, {
                status: 'completed',
                meetingStatus: 'completed',
                completedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            console.log('✅ Request completed successfully');
            return { success: true, message: 'Request completed successfully!' };
        } catch (error) {
            console.error('❌ Error completing request:', error);
            return { success: false, message: `Failed to complete request: ${error.message}` };
        }
    },

    /**
     * Archive a completed request
     */
    async archiveRequest(requestId, userId) {
        try {
            console.log('🔄 Archiving request:', { requestId, userId });

            const requestRef = doc(db, 'requests', requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestSnap.data();
            
            // Only creator can archive
            if (requestData.userId !== userId) {
                return { success: false, message: 'You can only archive your own requests' };
            }

            if (requestData.status !== 'completed') {
                return { success: false, message: 'Only completed requests can be archived' };
            }

            await updateDoc(requestRef, {
                status: 'archived',
                archivedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            console.log('✅ Request archived successfully');
            return { success: true, message: 'Request archived successfully!' };
        } catch (error) {
            console.error('❌ Error archiving request:', error);
            return { success: false, message: `Failed to archive request: ${error.message}` };
        }
    },

    // ===== REQUEST RETRIEVAL =====

    /**
     * Get user's requests by status (real-time with onSnapshot)
     */
    getUserRequests(userId, status = null, callback) {
        if (!userId) {
            callback([]);
            return () => {};
        }

        console.log('🔄 Setting up user requests listener for user:', userId);

        let q = query(
            collection(db, 'requests'),
            where('userId', '==', userId),
            orderBy('updatedAt', 'desc')
        );

        if (status) {
            q = query(q, where('status', '==', status));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log('📥 User requests snapshot received:', snapshot.docs.length, 'documents');
            const requests = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            callback(requests);
        }, (error) => {
            console.error('❌ Error fetching user requests:', error);
            
            // Check if it's a missing index error
            if (error.code === 'failed-precondition') {
                console.error('🚨 Missing Firebase composite index!');
                console.error('🔗 Create this index:', error.message);
                
                // Extract the index creation URL if available
                const indexMatch = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]+/);
                if (indexMatch) {
                    console.error('📋 Index creation URL:', indexMatch[0]);
                }
                
                // Call callback with error info so component can handle it
                callback([], { error: 'missing_index', details: error.message });
            } else {
                callback([], { error: 'general', details: error.message });
            }
        });

        return unsubscribe;
    },

    /**
     * Get user's requests by status (direct fetch, no real-time updates)
     */
    async getUserRequestsDirect(userId, status = null) {
        if (!userId) {
            return [];
        }

        try {
            console.log('🔄 Fetching user requests directly for user:', userId, 'status:', status);

            let q = query(
                collection(db, 'requests'),
                where('userId', '==', userId),
                orderBy('updatedAt', 'desc')
            );

            if (status) {
                q = query(q, where('status', '==', status));
            }

            const snapshot = await getDocs(q);
            console.log('📥 User requests direct fetch received:', snapshot.docs.length, 'documents');
            
            const requests = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            return requests;
        } catch (error) {
            console.error('❌ Error fetching user requests directly:', error);
            
            // Check if it's a missing index error
            if (error.code === 'failed-precondition') {
                console.error('🚨 Missing Firebase composite index!');
                console.error('🔗 Create this index:', error.message);
                
                // Extract the index creation URL if available
                const indexMatch = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]+/);
                if (indexMatch) {
                    console.error('📋 Index creation URL:', indexMatch[0]);
                }
            }
            
            throw error;
        }
    },

    /**
     * Get available requests for other users to respond to
     */
    getAvailableRequests(userId, callback) {
        if (!userId) {
            callback([]);
            return () => {};
        }

        console.log('🔄 Setting up available requests listener for user:', userId);

        const q = query(
            collection(db, 'requests'),
            where('status', '==', 'open'),
            where('userId', '!=', userId),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            try {
                console.log('📥 Available requests snapshot received:', snapshot.docs.length, 'documents');
                
                // Get hidden requests for this user
                const hiddenRequestIds = await this.getHiddenRequests(userId);
                console.log('🚫 Hidden request IDs for user:', userId, hiddenRequestIds);
                
                const requests = snapshot.docs
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }))
                    .filter(request => !hiddenRequestIds.includes(request.id)); // Exclude hidden requests
                
                console.log('✅ Filtered requests (excluding hidden):', requests.length);
                callback(requests);
            } catch (error) {
                console.error('❌ Error filtering available requests:', error);
                // Fallback to unfiltered requests if filtering fails
                const requests = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                callback(requests);
            }
        }, (error) => {
            console.error('❌ Error fetching available requests:', error);
            
            // Check if it's a missing index error
            if (error.code === 'failed-precondition') {
                console.error('🚨 Missing Firebase composite index!');
                console.error('🔗 Create this index:', error.message);
                
                // Extract the index creation URL if available
                const indexMatch = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]+/);
                if (indexMatch) {
                    console.error('📋 Index creation URL:', indexMatch[0]);
                }
                
                // Call callback with error info so component can handle it
                callback([], { error: 'missing_index', details: error.message });
            } else {
                callback([], { error: 'general', details: error.message });
            }
        });

        return unsubscribe;
    },

    /**
     * Get user's responses to requests
     */
    getUserResponses(userId, status = null, callback) {
        if (!userId) {
            callback([]);
            return () => {};
        }

        console.log('🔄 Setting up user responses listener for user:', userId);

        let q = query(
            collection(db, 'requests'),
            where('responses', 'array-contains', { responderId: userId }),
            orderBy('updatedAt', 'desc')
        );

        if (status) {
            q = query(q, where('status', '==', status));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log('📥 User responses snapshot received:', snapshot.docs.length, 'documents');
            const requests = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            callback(requests);
        }, (error) => {
            console.error('❌ Error fetching user responses:', error);
            
            // Check if it's a missing index error
            if (error.code === 'failed-precondition') {
                console.error('🚨 Missing Firebase composite index!');
                console.error('🔗 Create this index:', error.message);
                
                // Extract the index creation URL if available
                const indexMatch = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]+/);
                if (indexMatch) {
                    console.error('📋 Index creation URL:', indexMatch[0]);
                }
                
                // Call callback with error info so component can handle it
                callback([], { error: 'missing_index', details: error.message });
            } else {
                callback([], { error: 'general', details: error.message });
            }
        });

        return unsubscribe;
    },

    /**
     * Get hidden requests for a user
     */
    async getHiddenRequests(userId) {
        if (!userId) return [];

        try {
            const hiddenRequestsRef = collection(db, 'hiddenRequests');
            const q = query(
                hiddenRequestsRef,
                where('userId', '==', userId)
            );
            
            const snapshot = await getDocs(q);
            const hiddenRequestIds = snapshot.docs.map(doc => doc.data().requestId);
            
            console.log('🔍 Hidden request IDs for user:', userId, hiddenRequestIds);
            return hiddenRequestIds;
        } catch (error) {
            console.error('❌ Error fetching hidden requests:', error);
            return [];
        }
    },

    // ===== MEETING MANAGEMENT =====

    /**
     * Get meeting information for a request
     */
    async getMeetingForRequest(requestId) {
        try {
            const requestRef = doc(db, 'requests', requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestSnap.data();
            
            if (!requestData.meetingId) {
                return { success: false, message: 'No meeting found for this request' };
            }

            return {
                success: true,
                meetingInfo: {
                    meetingId: requestData.meetingId,
                    meetingUrl: requestData.meetingUrl,
                    roomId: requestData.roomId,
                    meetingStatus: requestData.meetingStatus,
                    participants: requestData.participants || [],
                    acceptedBy: requestData.acceptedBy,
                    acceptedByName: requestData.acceptedByName
                }
            };
        } catch (error) {
            console.error('Error getting meeting info:', error);
            return { success: false, message: error.message };
        }
    },

    /**
     * Join a meeting
     */
    async joinMeeting(meetingId, userId, userName) {
        try {
            // Find the request with this meeting ID
            const q = query(
                collection(db, 'requests'),
                where('meetingId', '==', meetingId)
            );
            
            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                return { success: false, message: 'Meeting not found' };
            }

            const requestDoc = snapshot.docs[0];
            const requestData = requestDoc.data();

            // Check if user is authorized to join
            if (!requestData.participants?.includes(userId)) {
                return { success: false, message: 'You are not authorized to join this meeting' };
            }

            // Update meeting status and log join
            await updateDoc(requestDoc.ref, {
                meetingStatus: 'active',
                lastActivity: serverTimestamp()
            });

            return {
                success: true,
                meetingInfo: {
                    meetingId: requestData.meetingId,
                    meetingUrl: requestData.meetingUrl,
                    roomId: requestData.roomId,
                    participants: requestData.participants,
                    topic: requestData.topic,
                    subject: requestData.subject
                }
            };
        } catch (error) {
            console.error('Error joining meeting:', error);
            return { success: false, message: error.message };
        }
    },

    // ===== UTILITY FUNCTIONS =====

    /**
     * Delete a request (only for drafts or if no responses)
     */
    async deleteRequest(requestId, userId) {
        try {
            const requestRef = doc(db, 'requests', requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestSnap.data();
            if (requestData.userId !== userId) {
                return { success: false, message: 'You can only delete your own requests' };
            }

            // Only allow deletion of drafts or requests with no responses
            if (requestData.status !== 'draft' && requestData.responseCount > 0) {
                return { success: false, message: 'Cannot delete requests that have responses' };
            }

            await deleteDoc(requestRef);
            console.log('✅ Request deleted successfully');

            return { success: true, message: 'Request deleted successfully!' };
        } catch (error) {
            console.error('❌ Error deleting request:', error);
            return { success: false, message: `Failed to delete request: ${error.message}` };
        }
    },

    /**
     * Get request statistics for a user
     */
    async getUserRequestStats(userId) {
        try {
            const stats = {
                total: 0,
                draft: 0,
                open: 0,
                active: 0,
                completed: 0,
                archived: 0,
                responses: 0
            };

            // Get user's requests
            const userRequestsQuery = query(
                collection(db, 'requests'),
                where('userId', '==', userId)
            );
            
            const userRequestsSnapshot = await getDocs(userRequestsQuery);
            userRequestsSnapshot.forEach(doc => {
                const data = doc.data();
                stats.total++;
                stats[data.status]++;
            });

            // Get user's responses
            const responsesQuery = query(
                collection(db, 'requests'),
                where('responses', 'array-contains', { responderId: userId })
            );
            
            const responsesSnapshot = await getDocs(responsesQuery);
            stats.responses = responsesSnapshot.size;

            return { success: true, stats };
        } catch (error) {
            console.error('Error getting user stats:', error);
            return { success: false, message: error.message };
        }
    }
};

export default databaseService;

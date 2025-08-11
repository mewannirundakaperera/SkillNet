// src/services/unifiedRequestService.js
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
 * UNIFIED REQUEST SERVICE
 * Consolidates all request functionality from databaseService and integratedRequestService
 * Provides consistent data structures and permission handling across all request pages
 */
export const unifiedRequestService = {
    // ===== REQUEST CREATION AND DRAFTING =====
    
    /**
     * Create a new one-to-one request (draft or published)
     */
    async createRequest(requestData, userId, isDraft = false) {
        try {
            console.log('🔄 Creating unified request:', { requestData, userId, isDraft });

            const status = isDraft ? 'draft' : 'open';
            const timestamp = serverTimestamp();

            const completeRequestData = {
                // Core request information - UNIFIED FIELD NAMES
                topic: requestData.topic || requestData.title,
                title: requestData.title || requestData.topic,
                description: requestData.description || '',
                subject: requestData.subject || 'General',
                
                // User identification - UNIFIED USER FIELDS
                userId, // Primary field for request owner
                createdBy: userId, // Alternative field for compatibility
                userName: requestData.userName || 'User',
                userEmail: requestData.userEmail || '',
                userAvatar: requestData.userAvatar || '',
                
                // Scheduling
                preferredDate: requestData.preferredDate || null,
                preferredTime: requestData.preferredTime || null,
                duration: requestData.duration || '60',
                
                // Payment and visibility
                paymentAmount: requestData.paymentAmount || '0',
                currency: requestData.currency || 'Rs.',
                visibility: requestData.visibility || 'public',
                
                // Status and workflow - UNIFIED STATUS FLOW
                status, // draft -> open -> active -> completed/archived
                type: 'one-to-one',
                
                // Participation tracking - UNIFIED ARRAY STRUCTURE
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
                
                // Acceptance tracking - UNIFIED ACCEPTANCE FIELDS
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
            console.log('✅ Unified request created with ID:', docRef.id);

            return {
                success: true,
                requestId: docRef.id,
                message: isDraft ? 'Draft saved successfully' : 'Request published successfully'
            };
        } catch (error) {
            console.error('❌ Error creating unified request:', error);
            return {
                success: false,
                message: 'Failed to create request',
                error: error.message
            };
        }
    },

    /**
     * Update an existing request
     */
    async updateRequest(requestId, updateData, userId) {
        try {
            console.log('🔄 Updating unified request:', { requestId, updateData, userId });

            const requestRef = doc(db, 'requests', requestId);
            const requestDoc = await getDoc(requestRef);

            if (!requestDoc.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestDoc.data();
            
            // Check ownership
            if (requestData.userId !== userId && requestData.createdBy !== userId) {
                return { success: false, message: 'Permission denied' };
            }

            // Update with new data
            const updatePayload = {
                ...updateData,
                updatedAt: serverTimestamp()
            };

            await updateDoc(requestRef, updatePayload);
            console.log('✅ Unified request updated successfully');

            return {
                success: true,
                message: 'Request updated successfully'
            };
        } catch (error) {
            console.error('❌ Error updating unified request:', error);
            return {
                success: false,
                message: 'Failed to update request',
                error: error.message
            };
        }
    },

    /**
     * Publish a draft request
     */
    async publishDraft(requestId, userId) {
        try {
            console.log('🔄 Publishing unified draft:', { requestId, userId });

            const requestRef = doc(db, 'requests', requestId);
            const requestDoc = await getDoc(requestRef);

            if (!requestDoc.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestDoc.data();
            
            // Check ownership and draft status
            if (requestData.userId !== userId && requestData.createdBy !== userId) {
                return { success: false, message: 'Permission denied' };
            }

            if (requestData.status !== 'draft') {
                return { success: false, message: 'Request is not a draft' };
            }

            // Validate required fields
            const requiredFields = ['topic', 'subject', 'paymentAmount', 'preferredDate'];
            const missingFields = requiredFields.filter(field => !requestData[field]);
            
            if (missingFields.length > 0) {
                return { 
                    success: false, 
                    message: `Missing required fields: ${missingFields.join(', ')}`,
                    missingFields 
                };
            }

            // Update status and publish
            await updateDoc(requestRef, {
                status: 'open',
                publishedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            console.log('✅ Unified draft published successfully');

            return {
                success: true,
                message: 'Draft published successfully'
            };
        } catch (error) {
            console.error('❌ Error publishing unified draft:', error);
            return {
                success: false,
                message: 'Failed to publish draft',
                error: error.message
            };
        }
    },

    // ===== REQUEST RESPONSES =====

    /**
     * Respond to a request (accept/decline/not interested)
     */
    async respondToRequest(requestId, responseData, userId) {
        try {
            console.log('🔄 Responding to unified request:', { requestId, responseData, userId });

            const requestRef = doc(db, 'requests', requestId);
            const requestDoc = await getDoc(requestRef);

            if (!requestDoc.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestDoc.data();

            // Check if request is already accepted
            if (requestData.status === 'active') {
                return { success: false, message: 'Request has already been accepted' };
            }

            // Check if user has already responded
            try {
                const responsesRef = collection(db, 'requestResponses');
                const existingResponseQuery = query(
                    responsesRef,
                    where('requestId', '==', requestId),
                    where('responderId', '==', userId)
                );
                const existingResponseSnapshot = await getDocs(existingResponseQuery);
                
                if (!existingResponseSnapshot.empty) {
                    return { success: false, message: 'You have already responded to this request' };
                }
            } catch (checkError) {
                console.warn('⚠️ Could not check existing responses, continuing:', checkError);
            }

            // Create response record in separate collection
            const response = {
                requestId,
                responderId: userId,
                responderName: responseData.responderName || 'Unknown',
                responderEmail: responseData.responderEmail || '',
                status: responseData.status, // 'accepted', 'declined', or 'not_interested'
                message: responseData.message || '',
                requestOwnerId: requestData.userId || requestData.createdBy, // Add request owner ID for permissions
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            // Validate response data before creating
            if (!response.requestId || !response.responderId || !response.status) {
                throw new Error('Missing required fields: requestId, responderId, or status');
            }

            console.log('📝 Creating response record:', response);
            console.log('📝 Collection path: requestResponses');

            const responseRef = await addDoc(collection(db, 'requestResponses'), response);
            console.log('✅ Response record created:', responseRef.id);

            const updateData = {
                responses: arrayUnion(responseRef.id), // Store only the response ID
                responseCount: increment(1)
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

                    if (meetingInfo && meetingInfo.success) {
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
                        // If meeting creation fails, don't update the request status
                        // Just create the response record but keep request as 'open'
                        return {
                            success: false,
                            message: 'Failed to create meeting. Please try again.',
                            error: meetingInfo?.message || 'Meeting creation failed'
                        };
                    }
                } catch (meetingError) {
                    console.error('❌ Meeting creation error:', meetingError);
                    // If meeting creation throws an error, don't proceed
                    return {
                        success: false,
                        message: 'Failed to create meeting due to an error.',
                        error: meetingError.message
                    };
                }
            }

            await updateDoc(requestRef, updateData);
            
            // Update timestamp separately to avoid arrayUnion + serverTimestamp conflict
            await updateDoc(requestRef, {
                updatedAt: serverTimestamp()
            });
            
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
            console.error('❌ Error responding to unified request:', error);
            console.error('❌ Error details:', {
                code: error.code,
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            
            // Provide more specific error messages based on error type
            let userMessage = 'Failed to respond to request';
            if (error.code === 'permission-denied') {
                userMessage = 'Permission denied. Please check your account status.';
            } else if (error.code === 'unavailable') {
                userMessage = 'Service temporarily unavailable. Please try again.';
            } else if (error.code === 'unauthenticated') {
                userMessage = 'Please log in again to continue.';
            } else if (error.message) {
                userMessage = `Error: ${error.message}`;
            }
            
            return {
                success: false,
                message: userMessage,
                error: error.message,
                code: error.code
            };
        }
    },

    // ===== REQUEST MANAGEMENT =====

    /**
     * Complete a request
     */
    async completeRequest(requestId, userId) {
        try {
            console.log('🔄 Completing unified request:', { requestId, userId });

            const requestRef = doc(db, 'requests', requestId);
            const requestDoc = await getDoc(requestRef);

            if (!requestDoc.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestDoc.data();
            
            // Check ownership
            if (requestData.userId !== userId && requestData.createdBy !== userId) {
                return { success: false, message: 'Permission denied' };
            }

            // Check if request can be completed
            if (requestData.status !== 'active') {
                return { success: false, message: 'Request is not active' };
            }

            await updateDoc(requestRef, {
                status: 'completed',
                updatedAt: serverTimestamp(),
                completedAt: serverTimestamp()
            });

            console.log('✅ Unified request completed successfully');

            return {
                success: true,
                message: 'Request completed successfully'
            };
        } catch (error) {
            console.error('❌ Error completing unified request:', error);
            return {
                success: false,
                message: 'Failed to complete request',
                error: error.message
            };
        }
    },

    /**
     * Archive a request
     */
    async archiveRequest(requestId, userId) {
        try {
            console.log('🔄 Archiving unified request:', { requestId, userId });

            const requestRef = doc(db, 'requests', requestId);
            const requestDoc = await getDoc(requestRef);

            if (!requestDoc.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestDoc.data();
            
            // Check ownership
            if (requestData.userId !== userId && requestData.createdBy !== userId) {
                return { success: false, message: 'Permission denied' };
            }

            await updateDoc(requestRef, {
                status: 'archived',
                updatedAt: serverTimestamp(),
                archivedAt: serverTimestamp()
            });

            console.log('✅ Unified request archived successfully');

            return {
                success: true,
                message: 'Request archived successfully'
            };
        } catch (error) {
            console.error('❌ Error archiving unified request:', error);
            return {
                success: false,
                message: 'Failed to archive request',
                error: error.message
            };
        }
    },

    /**
     * Delete a request
     */
    async deleteRequest(requestId, userId) {
        try {
            console.log('🔄 Deleting unified request:', { requestId, userId });

            const requestRef = doc(db, 'requests', requestId);
            const requestDoc = await getDoc(requestRef);

            if (!requestDoc.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestDoc.data();
            
            // Check ownership
            if (requestData.userId !== userId && requestData.createdBy !== userId) {
                return { success: false, message: 'Permission denied' };
            }

            await deleteDoc(requestRef);
            console.log('✅ Unified request deleted successfully');

            return {
                success: true,
                message: 'Request deleted successfully'
            };
        } catch (error) {
            console.error('❌ Error deleting unified request:', error);
            return {
                success: false,
                message: 'Failed to delete request',
                error: error.message
            };
        }
    },

    // ===== REQUEST FETCHING =====

    /**
     * Get user's requests with real-time updates
     */
    getUserRequests(userId, status = null, callback) {
        try {
            console.log('🔄 Getting unified user requests:', { userId, status });

            let requestsQuery = query(
                collection(db, 'requests'),
                where('userId', '==', userId),
                orderBy('createdAt', 'desc')
            );

            if (status) {
                requestsQuery = query(
                    collection(db, 'requests'),
                    where('userId', '==', userId),
                    where('status', '==', status),
                    orderBy('createdAt', 'desc')
                );
            }

            return onSnapshot(requestsQuery, (snapshot) => {
                const requests = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                callback(requests, null);
            }, (error) => {
                console.error('❌ Error in unified getUserRequests:', error);
                callback(null, { error: error.message, code: error.code });
            });
        } catch (error) {
            console.error('❌ Error setting up unified getUserRequests:', error);
            callback(null, { error: error.message, code: error.code });
        }
    },

    /**
     * Get user's requests directly (one-time fetch)
     */
    async getUserRequestsDirect(userId, status = null) {
        try {
            console.log('🔄 Getting unified user requests directly:', { userId, status });

            let requestsQuery = query(
                collection(db, 'requests'),
                where('userId', '==', userId),
                orderBy('createdAt', 'desc')
            );

            if (status) {
                requestsQuery = query(
                    collection(db, 'requests'),
                    where('userId', '==', userId),
                    where('status', '==', status),
                    orderBy('createdAt', 'desc')
                );
            }

            const snapshot = await getDocs(requestsQuery);
            const requests = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            return {
                success: true,
                requests,
                count: requests.length
            };
        } catch (error) {
            console.error('❌ Error getting unified user requests directly:', error);
            return {
                success: false,
                error: error.message,
                code: error.code
            };
        }
    },

    /**
     * Get available requests for a user (excluding their own and hidden ones)
     */
    getAvailableRequests(userId, callback) {
        try {
            console.log('🔄 Getting unified available requests for user:', userId);

            // Get available requests directly (hidden requests will be filtered on the client side)
            const requestsQuery = query(
                collection(db, 'requests'),
                where('status', 'in', ['open', 'active']),
                orderBy('createdAt', 'desc')
            );

            const unsubscribe = onSnapshot(requestsQuery, async (snapshot) => {
                try {
                    // Get hidden request IDs for this user only
                    const hiddenQuery = query(
                        collection(db, 'hiddenRequests'),
                        where('userId', '==', userId)
                    );
                    
                    const hiddenSnapshot = await getDocs(hiddenQuery);
                    const hiddenRequestIds = hiddenSnapshot.docs.map(doc => doc.data().requestId);

                    const requests = snapshot.docs
                        .map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }))
                        .filter(request => 
                            request.userId !== userId && 
                            !hiddenRequestIds.includes(request.id)
                        );

                    callback(requests, null);
                } catch (error) {
                    console.error('❌ Error processing available requests:', error);
                    callback(null, { error: error.message, code: error.code });
                }
            }, (error) => {
                console.error('❌ Error in unified getAvailableRequests:', error);
                callback(null, { error: error.message, code: error.code });
            });

            // Return the unsubscribe function
            return unsubscribe;
        } catch (error) {
            console.error('❌ Error setting up unified getAvailableRequests:', error);
            callback(null, { error: error.message, code: error.code });
            return () => {}; // Return empty function if error
        }
    },

    /**
     * Get user's responses to requests
     */
    getUserResponses(userId, status = null, callback) {
        try {
            console.log('🔄 Getting unified user responses:', { userId, status });

            let responsesQuery = query(
                collection(db, 'requestResponses'),
                where('responderId', '==', userId),
                orderBy('createdAt', 'desc')
            );

            if (status) {
                responsesQuery = query(
                    collection(db, 'requestResponses'),
                    where('responderId', '==', userId),
                    where('status', '==', status),
                    orderBy('createdAt', 'desc')
                );
            }

            return onSnapshot(responsesQuery, async (snapshot) => {
                try {
                    const responses = [];
                    
                    for (const doc of snapshot.docs) {
                        const responseData = doc.data();
                        
                        // Get the corresponding request data
                        try {
                            const requestDoc = await getDoc(doc(db, 'requests', responseData.requestId));
                            if (requestDoc.exists()) {
                                responses.push({
                                    id: doc.id,
                                    ...responseData,
                                    requestData: requestDoc.data()
                                });
                            }
                        } catch (requestError) {
                            console.warn('⚠️ Could not fetch request data for response:', responseData.requestId);
                            responses.push({
                                id: doc.id,
                                ...responseData,
                                requestData: null
                            });
                        }
                    }

                    callback(responses, null);
                } catch (error) {
                    console.error('❌ Error processing unified responses:', error);
                    callback(null, { error: error.message, code: error.code });
                }
            }, (error) => {
                console.error('❌ Error in unified getUserResponses:', error);
                callback(null, { error: error.message, code: error.code });
            });
        } catch (error) {
            console.error('❌ Error setting up unified getUserResponses:', error);
            callback(null, { error: error.message, code: error.code });
        }
    },

    /**
     * Get hidden requests for a user
     */
    async getHiddenRequests(userId) {
        try {
            console.log('🔄 Getting unified hidden requests for user:', userId);

            const hiddenQuery = query(
                collection(db, 'hiddenRequests'),
                where('userId', '==', userId)
            );

            const snapshot = await getDocs(hiddenQuery);
            const hiddenRequests = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            return {
                success: true,
                hiddenRequests,
                count: hiddenRequests.length
            };
        } catch (error) {
            console.error('❌ Error getting unified hidden requests:', error);
            return {
                success: false,
                error: error.message,
                code: error.code
            };
        }
    },

    /**
     * Get responses for a specific request
     */
    async getRequestResponses(requestId) {
        try {
            console.log('🔄 Getting unified responses for request:', requestId);

            const responsesQuery = query(
                collection(db, 'requestResponses'),
                where('requestId', '==', requestId),
                orderBy('createdAt', 'desc')
            );

            const snapshot = await getDocs(responsesQuery);
            const responses = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            return {
                success: true,
                responses,
                count: responses.length
            };
        } catch (error) {
            console.error('❌ Error getting unified request responses:', error);
            return {
                success: false,
                error: error.message,
                code: error.code
            };
        }
    },

    // ===== MEETING MANAGEMENT =====

    /**
     * Get meeting information for a request
     */
    async getMeetingForRequest(requestId) {
        try {
            console.log('🔄 Getting unified meeting for request:', requestId);

            const requestRef = doc(db, 'requests', requestId);
            const requestDoc = await getDoc(requestRef);

            if (!requestDoc.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestDoc.data();

            if (!requestData.meetingId) {
                return { success: false, message: 'No meeting found for this request' };
            }

            return {
                success: true,
                meeting: {
                    meetingId: requestData.meetingId,
                    meetingUrl: requestData.meetingUrl,
                    meetingStatus: requestData.meetingStatus,
                    roomId: requestData.roomId,
                    acceptedBy: requestData.acceptedBy,
                    acceptedByName: requestData.acceptedByName,
                    acceptedAt: requestData.acceptedAt
                }
            };
        } catch (error) {
            console.error('❌ Error getting unified meeting for request:', error);
            return {
                success: false,
                error: error.message,
                code: error.code
            };
        }
    },

    /**
     * Join a meeting
     */
    async joinMeeting(meetingId, userId, userName) {
        try {
            console.log('🔄 Joining unified meeting:', { meetingId, userId, userName });

            // Find request with this meeting ID
            const requestsQuery = query(
                collection(db, 'requests'),
                where('meetingId', '==', meetingId)
            );

            const snapshot = await getDocs(requestsQuery);
            
            if (snapshot.empty) {
                return { success: false, message: 'Meeting not found' };
            }

            const requestDoc = snapshot.docs[0];
            const requestData = requestDoc.data();

            // Check if user is authorized to join
            if (requestData.userId !== userId && requestData.acceptedBy !== userId) {
                return { success: false, message: 'You are not authorized to join this meeting' };
            }

            return {
                success: true,
                meetingUrl: requestData.meetingUrl,
                roomId: requestData.roomId,
                requestData: {
                    id: requestDoc.id,
                    topic: requestData.topic,
                    subject: requestData.subject
                }
            };
        } catch (error) {
            console.error('❌ Error joining unified meeting:', error);
            return {
                success: false,
                error: error.message,
                code: error.code
            };
        }
    },

    // ===== STATISTICS =====

    /**
     * Get user's request statistics
     */
    async getUserRequestStats(userId) {
        try {
            console.log('🔄 Getting unified user request stats:', userId);

            const requestsQuery = query(
                collection(db, 'requests'),
                where('userId', '==', userId)
            );

            const snapshot = await getDocs(requestsQuery);
            const requests = snapshot.docs.map(doc => doc.data());

            const stats = {
                total: requests.length,
                draft: requests.filter(r => r.status === 'draft').length,
                open: requests.filter(r => r.status === 'open').length,
                active: requests.filter(r => r.status === 'active').length,
                completed: requests.filter(r => r.status === 'completed').length,
                archived: requests.filter(r => r.status === 'archived').length
            };

            return {
                success: true,
                stats
            };
        } catch (error) {
            console.error('❌ Error getting unified user request stats:', error);
            return {
                success: false,
                error: error.message,
                code: error.code
            };
        }
    }
};

export default unifiedRequestService;

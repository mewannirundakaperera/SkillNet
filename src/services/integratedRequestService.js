// src/services/integratedRequestService.js
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
    arrayRemove
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import UnifiedJitsiMeetingService from '@/services/UnifiedJitsiMeetingService';

export const integratedRequestService = {
    /**
     * Create a new one-to-one request with proper flow status
     */
    async createRequest(requestData, userId, isDraft = false) {
        try {
            console.log('🔄 Creating request:', { requestData, userId, isDraft });

            const status = isDraft ? 'draft' : 'open';

            const completeRequestData = {
                ...requestData,
                // User identification - consistent across the app
                userId, // Primary field for request owner
                createdBy: userId, // Alternative field for compatibility
                userName: requestData.userName || 'User',
                userEmail: requestData.userEmail || '',
                userAvatar: requestData.userAvatar || '',

                // Request content with consistent naming
                topic: requestData.topic || requestData.title,
                title: requestData.title || requestData.topic,
                description: requestData.description || '',
                subject: requestData.subject || 'General',

                // Scheduling information
                preferredDate: requestData.preferredDate || null,
                preferredTime: requestData.preferredTime || null,
                duration: requestData.duration || '60',

                // Payment information
                paymentAmount: requestData.paymentAmount || '0',

                // Status and workflow - key for the flow
                status, // draft -> open -> active -> completed/archived
                visibility: requestData.visibility || 'public',

                // Participation tracking
                participants: [],
                participantCount: 0,
                maxParticipants: requestData.maxParticipants || 1, // One-to-one = 1 participant
                responses: [],
                responseCount: 0,

                // Meeting management
                meetingId: null,
                meetingUrl: null,
                meetingStatus: null, // null -> scheduled -> active -> completed/cancelled
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
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),

                // Type identifier
                type: 'one-to-one'
            };

            if (!isDraft) {
                completeRequestData.publishedAt = serverTimestamp();
            }

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
     * Publish a draft request (draft -> open)
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

            // Check ownership
            if (requestData.userId !== userId && requestData.createdBy !== userId) {
                return { success: false, message: 'You can only publish your own requests' };
            }

            // Check if it's actually a draft
            if (requestData.status !== 'draft') {
                return { success: false, message: 'This request is not a draft' };
            }

            await updateDoc(requestRef, {
                status: 'open',
                publishedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            console.log('✅ Draft published successfully');
            return { success: true, message: 'Request published successfully!' };
        } catch (error) {
            console.error('❌ Error publishing draft:', error);
            return { success: false, message: `Failed to publish request: ${error.message}` };
        }
    },

    /**
     * Respond to a request (open -> active with meeting creation)
     */
    async respondToRequest(requestId, responseData, userId) {
        try {
            console.log('🔄 Responding to request:', { requestId, responseData, userId });

            // Get the original request
            const requestRef = doc(db, 'requests', requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestSnap.data();

            // Prevent self-response
            if (requestData.userId === userId || requestData.createdBy === userId) {
                return { success: false, message: 'You cannot respond to your own request' };
            }

            // Check if request is available for responses
            if (requestData.status !== 'open') {
                return { success: false, message: 'This request is no longer available' };
            }

            // Check if request is already accepted
            if (requestData.acceptedBy) {
                return { success: false, message: 'This request has already been accepted' };
            }

            // Create response record
            const response = {
                requestId,
                responderId: userId,
                responderName: responseData.responderName || 'Unknown',
                responderEmail: responseData.responderEmail || '',
                status: responseData.status || 'pending',
                message: responseData.message || '',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            const responseRef = await addDoc(collection(db, 'requestResponses'), response);

            // If response is accepted, create meeting and update request status
            if (responseData.status === 'accepted') {
                console.log('🎥 Response accepted, creating meeting...');

                try {
                    // Create Jitsi meeting
                    const meetingResult = await UnifiedJitsiMeetingService.createOneToOneMeeting(
                        requestId,
                        requestData,
                        userId,
                        responseData.responderName
                    );

                    if (meetingResult.success) {
                        // Update request: open -> active
                        await updateDoc(requestRef, {
                            status: 'active', // Key status change for the flow
                            acceptedBy: userId,
                            acceptedByName: responseData.responderName,
                            acceptedAt: serverTimestamp(),

                            // Meeting information
                            meetingId: meetingResult.meetingId,
                            meetingUrl: meetingResult.meetingUrl,
                            roomId: meetingResult.roomId,
                            meetingStatus: 'scheduled',

                            // Participant tracking
                            participants: arrayUnion(userId),
                            participantCount: 1,

                            // Update metadata
                            responses: arrayUnion(responseRef.id),
                            responseCount: (requestData.responseCount || 0) + 1
                        });
                        
                        // Update timestamp separately to avoid arrayUnion + serverTimestamp conflict
                        await updateDoc(requestRef, {
                            updatedAt: serverTimestamp()
                        });

                        // Update response with meeting info
                        await updateDoc(doc(db, 'requestResponses', responseRef.id), {
                            meetingId: meetingResult.meetingId,
                            meetingUrl: meetingResult.meetingUrl,
                            updatedAt: serverTimestamp()
                        });

                        console.log('✅ Meeting created and request activated');
                        return {
                            success: true,
                            message: 'Request accepted and meeting scheduled!',
                            meetingUrl: meetingResult.meetingUrl,
                            meetingId: meetingResult.meetingId
                        };
                    } else {
                        console.warn('⚠️ Meeting creation failed, but response recorded');
                        return {
                            success: true,
                            message: 'Response submitted, but meeting creation failed. Please contact support.',
                            error: meetingResult.error
                        };
                    }
                } catch (meetingError) {
                    console.error('❌ Error in meeting creation:', meetingError);
                    return {
                        success: true,
                        message: 'Response submitted, but meeting creation failed. Please try again.',
                        error: meetingError.message
                    };
                }
            } else if (responseData.status === 'declined') {
                // Just record the declined response, don't change request status
                await updateDoc(requestRef, {
                    responses: arrayUnion(responseRef.id),
                    responseCount: (requestData.responseCount || 0) + 1
                });
                
                // Update timestamp separately to avoid arrayUnion + serverTimestamp conflict
                await updateDoc(requestRef, {
                    updatedAt: serverTimestamp()
                });

                return { success: true, message: 'Response submitted successfully!' };
            } else if (responseData.status === 'not_interested') {
                // Record the not_interested response and hide the request
                await updateDoc(requestRef, {
                    responses: arrayUnion(responseRef.id),
                    responseCount: (requestData.responseCount || 0) + 1
                });
                
                // Update timestamp separately to avoid arrayUnion + serverTimestamp conflict
                await updateDoc(requestRef, {
                    updatedAt: serverTimestamp()
                });

                // Add to hidden requests collection
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

                return { success: true, message: 'Request hidden from your view!' };
            }

            // For other statuses (pending, etc.)
            await updateDoc(requestRef, {
                responses: arrayUnion(responseRef.id),
                responseCount: (requestData.responseCount || 0) + 1
            });
            
            // Update timestamp separately to avoid arrayUnion + serverTimestamp conflict
            await updateDoc(requestRef, {
                updatedAt: serverTimestamp()
            });

            console.log('✅ Response submitted successfully');
            return { success: true, message: 'Response submitted successfully!' };

        } catch (error) {
            console.error('❌ Error responding to request:', error);
            return { success: false, message: `Failed to respond: ${error.message}` };
        }
    },

    /**
     * Complete a request (active -> completed)
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

            // Check if user can complete (either creator or accepter)
            const canComplete = requestData.userId === userId ||
                requestData.createdBy === userId ||
                requestData.acceptedBy === userId;

            if (!canComplete) {
                return { success: false, message: 'You cannot complete this request' };
            }

            // Update status: active -> completed
            const updateData = {
                status: 'completed',
                completedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            // End meeting if it exists
            if (requestData.meetingId) {
                try {
                    await UnifiedJitsiMeetingService.endMeeting(requestData.meetingId, userId);
                    updateData.meetingStatus = 'completed';
                } catch (meetingError) {
                    console.warn('⚠️ Failed to end meeting:', meetingError);
                }
            }

            await updateDoc(requestRef, updateData);
            console.log('✅ Request completed successfully');

            return { success: true, message: 'Request completed successfully!' };
        } catch (error) {
            console.error('❌ Error completing request:', error);
            return { success: false, message: `Failed to complete request: ${error.message}` };
        }
    },

    /**
     * Archive a request (completed -> archived or any status -> archived)
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

            // Check if user can archive (either creator or accepter)
            const canArchive = requestData.userId === userId ||
                requestData.createdBy === userId ||
                requestData.acceptedBy === userId;

            if (!canArchive) {
                return { success: false, message: 'You cannot archive this request' };
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

    /**
     * Get user's own requests with real-time updates
     */
    getUserRequests(userId, status, callback) {
        try {
            console.log('🔄 Getting user requests:', { userId, status });

            const requestsRef = collection(db, 'requests');
            let requestsQuery;

            if (status) {
                requestsQuery = query(
                    requestsRef,
                    where('userId', '==', userId),
                    where('status', '==', status),
                    orderBy('updatedAt', 'desc')
                );
            } else {
                requestsQuery = query(
                    requestsRef,
                    where('userId', '==', userId),
                    orderBy('updatedAt', 'desc')
                );
            }

            return onSnapshot(requestsQuery, (snapshot) => {
                const requests = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    requests.push({
                        id: doc.id,
                        ...data,
                        createdAt: data.createdAt?.toDate() || new Date(),
                        updatedAt: data.updatedAt?.toDate() || new Date()
                    });
                });

                console.log(`✅ Found ${requests.length} user requests`);
                callback(requests);
            }, (error) => {
                console.error('❌ Error fetching user requests:', error);
                callback([]);
            });
        } catch (error) {
            console.error('❌ Error setting up user requests listener:', error);
            callback([]);
        }
    },

    /**
     * Get available requests for users to respond to (excluding own requests)
     */
    getAvailableRequests(userId, callback) {
        try {
            console.log('🔄 Getting available requests for user:', userId);

            const requestsRef = collection(db, 'requests');
            const requestsQuery = query(
                requestsRef,
                where('status', '==', 'open'), // Only open requests
                where('userId', '!=', userId), // Exclude own requests
                orderBy('createdAt', 'desc')
            );

            return onSnapshot(requestsQuery, async (snapshot) => {
                try {
                    const requests = [];

                    // Get hidden requests for this user
                    const hiddenRequestIds = await this.getHiddenRequests(userId);
                    console.log('🚫 Hidden request IDs for user:', userId, hiddenRequestIds);

                    snapshot.forEach(doc => {
                        const data = doc.data();

                        // Additional filter to exclude already accepted requests and hidden requests
                        if (!data.acceptedBy && !hiddenRequestIds.includes(doc.id)) {
                            requests.push({
                                id: doc.id,
                                ...data,
                                createdAt: data.createdAt?.toDate() || new Date(),
                                updatedAt: data.updatedAt?.toDate() || new Date()
                            });
                        }
                    });

                    console.log(`✅ Found ${requests.length} available requests (excluding hidden)`);
                    callback(requests);
                } catch (error) {
                    console.error('❌ Error filtering available requests:', error);
                    // Fallback to unfiltered requests if filtering fails
                    const requests = [];
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        if (!data.acceptedBy) {
                            requests.push({
                                id: doc.id,
                                ...data,
                                createdAt: data.createdAt?.toDate() || new Date(),
                                updatedAt: data.updatedAt?.toDate() || new Date()
                            });
                        }
                    });
                    callback(requests);
                }
            }, (error) => {
                console.error('❌ Error fetching available requests:', error);
                callback([]);
            });
        } catch (error) {
            console.error('❌ Error setting up available requests listener:', error);
            callback([]);
        }
    },

    /**
     * Get user's responses with status filtering
     */
    getUserResponses(userId, status, callback) {
        try {
            console.log('🔄 Getting user responses:', { userId, status });

            const responsesRef = collection(db, 'requestResponses');
            let responsesQuery;

            if (status) {
                responsesQuery = query(
                    responsesRef,
                    where('responderId', '==', userId),
                    where('status', '==', status),
                    orderBy('createdAt', 'desc')
                );
            } else {
                responsesQuery = query(
                    responsesRef,
                    where('responderId', '==', userId),
                    orderBy('createdAt', 'desc')
                );
            }

            return onSnapshot(responsesQuery, async (snapshot) => {
                const responses = [];

                for (const doc of snapshot.docs) {
                    const responseData = doc.data();

                    // Get the original request data
                    try {
                        const requestRef = doc(db, 'requests', responseData.requestId);
                        const requestSnap = await getDoc(requestRef);

                        if (requestSnap.exists()) {
                            const requestData = requestSnap.data();

                            responses.push({
                                id: doc.id,
                                ...responseData,
                                requestData: {
                                    id: requestSnap.id,
                                    ...requestData
                                },
                                createdAt: responseData.createdAt?.toDate() || new Date()
                            });
                        }
                    } catch (requestError) {
                        console.warn('Could not load request data for response:', doc.id);
                        responses.push({
                            id: doc.id,
                            ...responseData,
                            createdAt: responseData.createdAt?.toDate() || new Date()
                        });
                    }
                }

                console.log(`✅ Found ${responses.length} responses`);
                callback(responses);
            }, (error) => {
                console.error('❌ Error fetching responses:', error);
                callback([]);
            });
        } catch (error) {
            console.error('❌ Error setting up responses listener:', error);
            callback([]);
        }
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

    /**
     * Update existing request
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

            // Check ownership
            if (requestData.userId !== userId && requestData.createdBy !== userId) {
                return { success: false, message: 'You can only update your own requests' };
            }

            const finalUpdateData = {
                ...updateData,
                updatedAt: serverTimestamp()
            };

            // Ensure consistent field naming
            if (updateData.topic && !updateData.title) {
                finalUpdateData.title = updateData.topic;
            }
            if (updateData.title && !updateData.topic) {
                finalUpdateData.topic = updateData.title;
            }

            await updateDoc(requestRef, finalUpdateData);
            console.log('✅ Request updated successfully');

            return { success: true, message: 'Request updated successfully!' };
        } catch (error) {
            console.error('❌ Error updating request:', error);
            return { success: false, message: `Failed to update request: ${error.message}` };
        }
    },

    /**
     * Delete a request
     */
    async deleteRequest(requestId, userId) {
        try {
            console.log('🔄 Deleting request:', { requestId, userId });

            const requestRef = doc(db, 'requests', requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestSnap.data();

            // Check ownership
            if (requestData.userId !== userId && requestData.createdBy !== userId) {
                return { success: false, message: 'You can only delete your own requests' };
            }

            // End meeting if it exists
            if (requestData.meetingId) {
                try {
                    await UnifiedJitsiMeetingService.endMeeting(requestData.meetingId, userId);
                } catch (meetingError) {
                    console.warn('⚠️ Failed to end meeting during deletion:', meetingError);
                }
            }

            // Delete all related responses
            const responsesQuery = query(
                collection(db, 'requestResponses'),
                where('requestId', '==', requestId)
            );
            const responsesSnapshot = await getDocs(responsesQuery);

            const deletePromises = responsesSnapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);

            // Delete the request
            await deleteDoc(requestRef);

            console.log('✅ Request deleted successfully');
            return { success: true, message: 'Request deleted successfully!' };
        } catch (error) {
            console.error('❌ Error deleting request:', error);
            return { success: false, message: `Failed to delete request: ${error.message}` };
        }
    },

    /**
     * Get meeting information for a request
     */
    async getMeetingForRequest(requestId) {
        try {
            return await UnifiedJitsiMeetingService.getMeetingForRequest(requestId, 'one-to-one');
        } catch (error) {
            console.error('❌ Error getting meeting for request:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Join a meeting (for tracking)
     */
    async joinMeeting(meetingId, userId, userName) {
        try {
            return await UnifiedJitsiMeetingService.joinMeeting(meetingId, userId, userName);
        } catch (error) {
            console.error('❌ Error joining meeting:', error);
            return { success: false, error: error.message };
        }
    }
};

export default integratedRequestService;
// src/services/requestService.js
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
    serverTimestamp,
    arrayUnion,
    arrayRemove
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export const requestService = {
    /**
     * Create a new request (one-to-one)
     */
    async createRequest(requestData, userId, isDraft = false) {
        try {
            console.log('🔄 Creating request:', { requestData, userId, isDraft });

            const status = isDraft ? 'draft' : 'open';

            const completeRequestData = {
                ...requestData,
                userId,
                status,
                participants: [],
                participantCount: 0,
                responses: [],
                views: 0,
                likes: 0,
                featured: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                type: 'one-to-one'
            };

            if (!isDraft) {
                completeRequestData.publishedAt = serverTimestamp();
            }

            const docRef = await addDoc(collection(db, 'requests'), completeRequestData);
            console.log('✅ Request created with ID:', docRef.id);

            return { success: true, requestId: docRef.id, message: isDraft ? 'Draft saved successfully!' : 'Request created successfully!' };
        } catch (error) {
            console.error('❌ Error creating request:', error);
            return { success: false, message: `Failed to create request: ${error.message}` };
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
            if (requestData.userId !== userId) {
                return { success: false, message: 'You can only update your own requests' };
            }

            const finalUpdateData = {
                ...updateData,
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
                return { success: false, message: 'You can only publish your own requests' };
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
            return { success: true, message: 'Request published successfully!' };
        } catch (error) {
            console.error('❌ Error publishing draft:', error);
            return { success: false, message: `Failed to publish request: ${error.message}` };
        }
    },

    /**
     * Save request as draft
     */
    async saveDraft(requestData, userId, requestId = null) {
        try {
            console.log('🔄 Saving draft:', { requestData, userId, requestId });

            if (requestId) {
                // Update existing draft
                return await this.updateRequest(requestId, requestData, userId);
            } else {
                // Create new draft
                return await this.createRequest(requestData, userId, true);
            }
        } catch (error) {
            console.error('❌ Error saving draft:', error);
            return { success: false, message: `Failed to save draft: ${error.message}` };
        }
    },

    /**
     * Get user's requests by status
     */
    getUserRequestsByStatus(userId, status, callback) {
        try {
            console.log('🔄 Getting user requests by status:', { userId, status });

            const requestsRef = collection(db, 'requests');
            const requestsQuery = query(
                requestsRef,
                where('userId', '==', userId),
                where('status', '==', status),
                orderBy('updatedAt', 'desc')
            );

            return onSnapshot(requestsQuery, (snapshot) => {
                const requests = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate() || new Date(),
                    updatedAt: doc.data().updatedAt?.toDate() || new Date()
                }));

                console.log(`✅ Found ${requests.length} ${status} requests`);
                callback(requests);
            }, (error) => {
                console.error('❌ Error fetching requests:', error);
                callback([]);
            });
        } catch (error) {
            console.error('❌ Error setting up requests listener:', error);
            callback([]);
        }
    },

    /**
     * Get all user's requests
     */
    getAllUserRequests(userId, callback) {
        try {
            console.log('🔄 Getting all user requests:', { userId });

            const requestsRef = collection(db, 'requests');
            const requestsQuery = query(
                requestsRef,
                where('userId', '==', userId),
                orderBy('updatedAt', 'desc')
            );

            return onSnapshot(requestsQuery, (snapshot) => {
                const requests = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate() || new Date(),
                    updatedAt: doc.data().updatedAt?.toDate() || new Date()
                }));

                console.log(`✅ Found ${requests.length} total requests`);
                callback(requests);
            }, (error) => {
                console.error('❌ Error fetching requests:', error);
                callback([]);
            });
        } catch (error) {
            console.error('❌ Error setting up requests listener:', error);
            callback([]);
        }
    },

    /**
     * Get all available requests (for browsing)
     */
    getAllAvailableRequests(userId, callback) {
        try {
            console.log('🔄 Getting all available requests');

            const requestsRef = collection(db, 'requests');
            const requestsQuery = query(
                requestsRef,
                where('userId', '!=', userId),
                where('status', 'in', ['open', 'active']),
                orderBy('createdAt', 'desc')
            );

            return onSnapshot(requestsQuery, (snapshot) => {
                const requests = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate() || new Date(),
                    updatedAt: doc.data().updatedAt?.toDate() || new Date()
                }));

                console.log(`✅ Found ${requests.length} available requests`);
                callback(requests);
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
     * Change request status
     */
    async changeRequestStatus(requestId, newStatus, userId) {
        try {
            console.log('🔄 Changing request status:', { requestId, newStatus, userId });

            const requestRef = doc(db, 'requests', requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestSnap.data();
            if (requestData.userId !== userId) {
                return { success: false, message: 'You can only change the status of your own requests' };
            }

            const updateData = {
                status: newStatus,
                updatedAt: serverTimestamp()
            };

            // Add specific timestamp fields based on status
            switch (newStatus) {
                case 'active':
                    updateData.activatedAt = serverTimestamp();
                    break;
                case 'completed':
                    updateData.completedAt = serverTimestamp();
                    break;
                case 'archived':
                    updateData.archivedAt = serverTimestamp();
                    break;
                case 'cancelled':
                    updateData.cancelledAt = serverTimestamp();
                    break;
            }

            await updateDoc(requestRef, updateData);
            console.log('✅ Status changed successfully');

            return { success: true, message: `Request status changed to ${newStatus}` };
        } catch (error) {
            console.error('❌ Error changing request status:', error);
            return { success: false, message: `Failed to change status: ${error.message}` };
        }
    },

    /**
     * Delete request
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
            if (requestData.userId !== userId) {
                return { success: false, message: 'You can only delete your own requests' };
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
     * Respond to a request
     */
    async respondToRequest(requestId, responseData, userId) {
        try {
            console.log('🔄 Responding to request:', { requestId, responseData, userId });

            // Create response record
            const response = {
                requestId,
                responderId: userId,
                responderName: responseData.responderName || 'Unknown',
                responderEmail: responseData.responderEmail || '',
                status: responseData.status || 'pending',
                message: responseData.message || '',
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, 'requestResponses'), response);
            console.log('✅ Response created successfully');

            return { success: true, message: 'Response submitted successfully!' };
        } catch (error) {
            console.error('❌ Error responding to request:', error);
            return { success: false, message: `Failed to respond: ${error.message}` };
        }
    },

    /**
     * Get user's responses
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

            return onSnapshot(responsesQuery, (snapshot) => {
                const responses = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate() || new Date()
                }));

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
    }
};
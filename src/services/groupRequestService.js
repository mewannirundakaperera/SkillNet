// src/services/groupRequestService.js

import {
    doc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    increment,
    getDoc,
    addDoc,
    collection,
    query,
    where,
    orderBy,
    getDocs,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export const groupRequestService = {
    /**
     * Create a new group request
     * @param {Object} requestData - The request data
     * @param {string} userId - The ID of the user creating the request
     * @returns {Promise<{success: boolean, message: string, requestId?: string}>}
     */
    async createGroupRequest(requestData, userId) {
        try {
            // Validate required fields
            if (!requestData.title || !requestData.description || !requestData.targetGroupId) {
                return { success: false, message: 'Missing required fields' };
            }

            // Check if user is member of target group
            const groupRef = doc(db, 'groups', requestData.targetGroupId);
            const groupSnap = await getDoc(groupRef);

            if (!groupSnap.exists()) {
                return { success: false, message: 'Target group not found' };
            }

            const groupData = groupSnap.data();
            if (!groupData.members?.includes(userId) && !groupData.hiddenMembers?.includes(userId)) {
                return { success: false, message: 'You must be a member of the group to create requests' };
            }

            // Prepare the complete request data
            const completeRequestData = {
                ...requestData,
                userId,
                createdBy: userId,
                groupId: requestData.targetGroupId,
                groupName: groupData.name,
                status: requestData.sessionType === 'group-session' ? 'pending' : 'active',
                responses: [],
                votes: [],
                participants: [],
                paidParticipants: [],
                voteCount: 0,
                participantCount: 0,
                totalPaid: 0,
                viewCount: 0,
                minParticipants: requestData.sessionType === 'group-session' ? 3 : 1,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                type: 'group-request'
            };

            // Create the request
            const docRef = await addDoc(collection(db, 'grouprequests'), completeRequestData);

            // Optional: Add activity log
            try {
                await addDoc(collection(db, 'activities'), {
                    type: 'group_request_created',
                    userId,
                    groupId: requestData.targetGroupId,
                    requestId: docRef.id,
                    actorName: requestData.createdByName,
                    action: `created a new request "${requestData.title}" in ${groupData.name}`,
                    createdAt: serverTimestamp()
                });
            } catch (activityError) {
                console.warn('Failed to log activity:', activityError);
                // Don't fail the entire operation for activity logging
            }

            return {
                success: true,
                message: 'Group request created successfully!',
                requestId: docRef.id
            };

        } catch (error) {
            console.error('Error creating group request:', error);

            if (error.code === 'permission-denied') {
                return { success: false, message: 'Permission denied. You may not have access to create requests in this group.' };
            }

            return { success: false, message: `Failed to create request: ${error.message}` };
        }
    },

    /**
     * Get group requests for a specific group
     * @param {string} groupId - The ID of the group
     * @param {string} status - Optional status filter
     * @returns {Promise<Array>} - Array of group requests
     */
    async getGroupRequests(groupId, status = null) {
        try {
            const requestsRef = collection(db, 'grouprequests');
            let requestsQuery;

            if (status) {
                requestsQuery = query(
                    requestsRef,
                    where('targetGroupId', '==', groupId),
                    where('status', '==', status),
                    orderBy('updatedAt', 'desc')
                );
            } else {
                requestsQuery = query(
                    requestsRef,
                    where('targetGroupId', '==', groupId),
                    orderBy('updatedAt', 'desc')
                );
            }

            const snapshot = await getDocs(requestsQuery);
            const requests = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            return requests;

        } catch (error) {
            console.error('Error fetching group requests:', error);
            return [];
        }
    },

    /**
     * Get all group requests (for AllGroupRequests page)
     * @param {Object} filters - Optional filters {category, status, userId}
     * @returns {Promise<Array>} - Array of all group requests
     */
    async getAllGroupRequests(filters = {}) {
        try {
            const requestsRef = collection(db, 'grouprequests');
            let requestsQuery = query(requestsRef, orderBy('updatedAt', 'desc'));

            // Apply filters if provided
            if (filters.category) {
                requestsQuery = query(requestsQuery, where('category', '==', filters.category));
            }
            if (filters.status) {
                requestsQuery = query(requestsQuery, where('status', '==', filters.status));
            }
            if (filters.userId) {
                requestsQuery = query(requestsQuery, where('userId', '==', filters.userId));
            }

            const snapshot = await getDocs(requestsQuery);
            const requests = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            return requests;

        } catch (error) {
            console.error('Error fetching all group requests:', error);
            return [];
        }
    },

    /**
     * Update a group request
     * @param {string} requestId - The ID of the request
     * @param {Object} updateData - The data to update
     * @param {string} userId - The ID of the user updating
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async updateGroupRequest(requestId, updateData, userId) {
        try {
            const requestRef = doc(db, 'grouprequests', requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestSnap.data();

            // Check if user owns the request
            if (requestData.userId !== userId && requestData.createdBy !== userId) {
                return { success: false, message: 'You can only update your own requests' };
            }

            // Update the request
            await updateDoc(requestRef, {
                ...updateData,
                updatedAt: serverTimestamp()
            });

            return { success: true, message: 'Request updated successfully!' };

        } catch (error) {
            console.error('Error updating group request:', error);

            if (error.code === 'permission-denied') {
                return { success: false, message: 'Permission denied. You cannot update this request.' };
            }

            return { success: false, message: `Failed to update request: ${error.message}` };
        }
    },

    /**
     * Respond to a group request
     * @param {string} requestId - The ID of the request
     * @param {Object} responseData - The response data
     * @param {string} userId - The ID of the user responding
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async respondToGroupRequest(requestId, responseData, userId) {
        try {
            const requestRef = doc(db, 'grouprequests', requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestSnap.data();

            // Check if user is trying to respond to their own request
            if (requestData.userId === userId || requestData.createdBy === userId) {
                return { success: false, message: 'You cannot respond to your own request' };
            }

            // Check if user already responded
            const existingResponse = requestData.responses?.find(r => r.userId === userId);
            if (existingResponse) {
                return { success: false, message: 'You have already responded to this request' };
            }

            // Prepare response data
            const response = {
                userId,
                ...responseData,
                createdAt: serverTimestamp()
            };

            // Add response to the request
            await updateDoc(requestRef, {
                responses: arrayUnion(response),
                updatedAt: serverTimestamp()
            });

            // Optional: Create notification for request owner
            try {
                await addDoc(collection(db, 'notifications'), {
                    userId: requestData.userId,
                    type: 'group_request_response',
                    title: 'New Response to Your Group Request',
                    message: `Someone responded to your request "${requestData.title}"`,
                    data: {
                        requestId,
                        responderId: userId,
                        responderName: responseData.responderName
                    },
                    read: false,
                    createdAt: serverTimestamp()
                });
            } catch (notificationError) {
                console.warn('Failed to create notification:', notificationError);
                // Don't fail the response for notification issues
            }

            return { success: true, message: 'Response submitted successfully!' };

        } catch (error) {
            console.error('Error responding to group request:', error);
            return { success: false, message: `Failed to respond: ${error.message}` };
        }
    },

    /**
     * Handle automatic status transitions based on conditions
     * @param {string} requestId - The ID of the request
     * @returns {Promise<{success: boolean, message: string, newStatus?: string}>}
     */
    async handleStatusTransition(requestId) {
        try {
            const requestRef = doc(db, 'grouprequests', requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const request = requestSnap.data();
            let newStatus = request.status;
            const updateData = { updatedAt: serverTimestamp() };

            // Transition logic based on current status and conditions
            switch (request.status) {
                case 'pending':
                    if ((request.voteCount || 0) >= 5) {
                        newStatus = 'voting_open';
                        updateData.status = newStatus;
                        updateData.votingOpenedAt = serverTimestamp();
                    }
                    break;

                case 'voting_open':
                    const minParticipants = request.minParticipants || 3;
                    if ((request.participantCount || 0) >= minParticipants) {
                        newStatus = 'accepted';
                        updateData.status = newStatus;
                        updateData.approvedAt = serverTimestamp();
                    }
                    break;

                case 'accepted':
                    const requiredPayments = request.participantCount || 1;
                    if ((request.paidParticipants?.length || 0) >= requiredPayments) {
                        newStatus = 'payment_complete';
                        updateData.status = newStatus;
                        updateData.paymentCompletedAt = serverTimestamp();
                        // Schedule session (for demo, 1 hour from now)
                        updateData.scheduledDateTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
                    }
                    break;

                case 'payment_complete':
                    // Check if session time has started
                    if (request.scheduledDateTime && new Date(request.scheduledDateTime) <= new Date()) {
                        newStatus = 'in_progress';
                        updateData.status = newStatus;
                        updateData.sessionStartedAt = serverTimestamp();
                    }
                    break;

                case 'in_progress':
                    // Sessions can be marked as completed manually or after a certain duration
                    // This would typically be handled by a separate process or manually
                    break;
            }

            if (newStatus !== request.status) {
                await updateDoc(requestRef, updateData);
                return { success: true, message: `Status updated to ${newStatus}`, newStatus };
            }

            return { success: true, message: 'No status change needed' };

        } catch (error) {
            console.error('Error handling status transition:', error);
            return { success: false, message: `Failed to handle status transition: ${error.message}` };
        }
    },

    /**
     * Cancel a group request with reason
     * @param {string} requestId - The ID of the request
     * @param {string} reason - Cancellation reason
     * @param {string} userId - The ID of the user cancelling (must be owner or admin)
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async cancelGroupRequest(requestId, reason, userId) {
        try {
            const requestRef = doc(db, 'grouprequests', requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestSnap.data();

            // Check permissions
            if (requestData.userId !== userId && requestData.createdBy !== userId) {
                // Could add admin check here
                return { success: false, message: 'You can only cancel your own requests' };
            }

            // Update to cancelled status
            await updateDoc(requestRef, {
                status: 'cancelled',
                cancellationReason: reason,
                cancelledAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            // Handle refunds if payments were made
            if (requestData.paidParticipants && requestData.paidParticipants.length > 0) {
                // In a real app, trigger refund process
                await updateDoc(requestRef, {
                    refundStatus: 'pending',
                    refundInitiatedAt: serverTimestamp()
                });
            }

            return { success: true, message: 'Request cancelled successfully' };

        } catch (error) {
            console.error('Error cancelling group request:', error);
            return { success: false, message: `Failed to cancel request: ${error.message}` };
        }
    },

    /**
     * Complete a session
     * @param {string} requestId - The ID of the request
     * @param {string} userId - The ID of the user completing (must be owner)
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async completeSession(requestId, userId) {
        try {
            const requestRef = doc(db, 'grouprequests', requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestSnap.data();

            // Check if user can complete (owner or participant)
            if (requestData.userId !== userId && !requestData.participants?.includes(userId)) {
                return { success: false, message: 'You can only complete sessions you own or participate in' };
            }

            // Update to completed status
            await updateDoc(requestRef, {
                status: 'completed',
                completedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            return { success: true, message: 'Session completed successfully' };

        } catch (error) {
            console.error('Error completing session:', error);
            return { success: false, message: `Failed to complete session: ${error.message}` };
        }
    },

    /**
     * Get user's group requests
     * @param {string} userId - The user ID
     * @param {string} status - Optional status filter
     * @returns {Promise<Array>} - Array of user's group requests
     */
    async getUserGroupRequests(userId, status = null) {
        try {
            const requestsRef = collection(db, 'grouprequests');
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

            const snapshot = await getDocs(requestsQuery);
            const requests = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            return requests;

        } catch (error) {
            console.error('Error fetching user group requests:', error);
            return [];
        }
    },

    /**
     * Change request status
     * @param {string} requestId - The ID of the request
     * @param {string} newStatus - The new status
     * @param {string} userId - The ID of the user changing status
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async changeRequestStatus(requestId, newStatus, userId) {
        try {
            const requestRef = doc(db, 'grouprequests', requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestSnap.data();

            // Only request owner can change status
            if (requestData.userId !== userId && requestData.createdBy !== userId) {
                return { success: false, message: 'You can only change the status of your own requests' };
            }

            // Valid statuses
            const validStatuses = ['active', 'pending', 'accepted', 'completed', 'cancelled'];
            if (!validStatuses.includes(newStatus)) {
                return { success: false, message: 'Invalid status' };
            }

            // Update status
            await updateDoc(requestRef, {
                status: newStatus,
                updatedAt: serverTimestamp()
            });

            return { success: true, message: `Request status changed to ${newStatus}` };

        } catch (error) {
            console.error('Error changing request status:', error);
            return { success: false, message: `Failed to change status: ${error.message}` };
        }
    },

    /**
     * Delete a group request
     * @param {string} requestId - The ID of the request
     * @param {string} userId - The ID of the user deleting
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async deleteGroupRequest(requestId, userId) {
        try {
            const requestRef = doc(db, 'grouprequests', requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestSnap.data();

            // Only request owner can delete
            if (requestData.userId !== userId && requestData.createdBy !== userId) {
                return { success: false, message: 'You can only delete your own requests' };
            }

            // Soft delete by changing status
            await updateDoc(requestRef, {
                status: 'deleted',
                deletedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            return { success: true, message: 'Request deleted successfully!' };

        } catch (error) {
            console.error('Error deleting group request:', error);
            return { success: false, message: `Failed to delete request: ${error.message}` };
        }
    },

    /**
     * Increment view count for a request
     * @param {string} requestId - The ID of the request
     * @returns {Promise<void>}
     */
    async incrementViewCount(requestId) {
        try {
            const requestRef = doc(db, 'grouprequests', requestId);
            await updateDoc(requestRef, {
                viewCount: increment(1),
                lastViewedAt: serverTimestamp()
            });
        } catch (error) {
            console.warn('Failed to increment view count:', error);
        }
    },

    /**
     * Check if user can vote on a request
     * @param {Object} request - The request data
     * @param {string} userId - The user ID
     * @returns {boolean}
     */
    canUserVote(request, userId) {
        // Can't vote on own request
        if (request.userId === userId || request.createdBy === userId) {
            return false;
        }

        // Can only vote on pending or voting_open requests
        return ['pending', 'voting_open'].includes(request.status);
    },

    /**
     * Check if user can participate in a request
     * @param {Object} request - The request data
     * @param {string} userId - The user ID
     * @returns {boolean}
     */
    canUserParticipate(request, userId) {
        // Can't participate in own request
        if (request.userId === userId || request.createdBy === userId) {
            return false;
        }

        // Can only participate in voting_open or accepted requests
        return ['voting_open', 'accepted'].includes(request.status);
    },

    /**
     * Check if user needs to pay
     * @param {Object} request - The request data
     * @param {string} userId - The user ID
     * @returns {boolean}
     */
    userNeedsToPay(request, userId) {
        // Must be participating and not already paid
        return request.participants?.includes(userId) &&
            !request.paidParticipants?.includes(userId) &&
            request.status === 'accepted';
    },

    /**
     * Get request status display info
     * @param {string} status - The request status
     * @returns {Object} Display information
     */
    getStatusDisplay(status) {
        const statusMap = {
            pending: {
                label: 'Pending Approval',
                color: 'yellow',
                description: 'Waiting for community votes to approve this session'
            },
            voting_open: {
                label: 'Voting Open',
                color: 'orange',
                description: 'Approved! Members can now join this session'
            },
            accepted: {
                label: 'Accepted',
                color: 'green',
                description: 'Session confirmed, waiting for payments'
            },
            payment_complete: {
                label: 'Ready to Start',
                color: 'golden',
                description: 'All payments completed, session will start soon'
            },
            in_progress: {
                label: 'In Progress',
                color: 'blue',
                description: 'Session is currently active'
            },
            completed: {
                label: 'Completed',
                color: 'black',
                description: 'Session has ended successfully'
            },
            cancelled: {
                label: 'Cancelled',
                color: 'red',
                description: 'Session was cancelled'
            }
        };

        return statusMap[status] || {
            label: status,
            color: 'gray',
            description: 'Unknown status'
        };
    }
};
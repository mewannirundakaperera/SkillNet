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
    serverTimestamp,
    deleteDoc,
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export const groupRequestService = {
    /**
     * Get all groups the user belongs to (including hidden members)
     * @param {string} userId
     * @returns {Promise<string[]>} Array of group IDs
     */
    async getUserGroups(userId) {
        try {
            const groupsRef = collection(db, 'groups');

            const qMembers = query(groupsRef, where('members', 'array-contains', userId));
            const qHiddenMembers = query(groupsRef, where('hiddenMembers', 'array-contains', userId));

            const [snapMembers, snapHiddenMembers] = await Promise.all([getDocs(qMembers), getDocs(qHiddenMembers)]);
            const groupIdsSet = new Set();

            snapMembers.forEach(doc => groupIdsSet.add(doc.id));
            snapHiddenMembers.forEach(doc => groupIdsSet.add(doc.id));

            return Array.from(groupIdsSet);
        } catch (error) {
            console.error('Error fetching user groups:', error);
            return [];
        }
    },

    /**
     * Get all group requests accessible to a user, handling Firestore rule restrictions
     * @param {Object} params
     * @param {string} params.userId - Current user ID
     * @param {boolean} params.isAdmin - Is current user admin
     * @returns {Promise<Array>} Array of group request documents
     */
    async getAllGroupRequests({ userId, isAdmin = false }) {
        try {
            const requestsRef = collection(db, 'grouprequests');

            if (isAdmin) {
                // Admin: fetch all requests unrestricted
                const snapshot = await getDocs(query(requestsRef, orderBy('updatedAt', 'desc')));
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }

            // For non-admins, get groups user belongs to
            const userGroups = await this.getUserGroups(userId);

            const batchSize = 10; // Firestore 'in' queries accept max 10 values
            const groupRequests = [];

            // Query by batches for targetGroupId and groupId fields
            for (let i = 0; i < userGroups.length; i += batchSize) {
                const batch = userGroups.slice(i, i + batchSize);

                // Query requests where targetGroupId in batch
                const qTargetGroup = query(requestsRef, where('targetGroupId', 'in', batch));
                const snapTargetGroup = await getDocs(qTargetGroup);
                snapTargetGroup.forEach(doc => groupRequests.push({ id: doc.id, ...doc.data() }));

                // Query requests where groupId in batch
                const qGroup = query(requestsRef, where('groupId', 'in', batch));
                const snapGroup = await getDocs(qGroup);
                snapGroup.forEach(doc => groupRequests.push({ id: doc.id, ...doc.data() }));
            }

            // Query requests owned by the user (userId)
            const qUserId = query(requestsRef, where('userId', '==', userId));
            const snapUserId = await getDocs(qUserId);

            // Query requests created by the user (createdBy)
            const qCreatedBy = query(requestsRef, where('createdBy', '==', userId));
            const snapCreatedBy = await getDocs(qCreatedBy);

            const ownedRequests = [];
            snapUserId.forEach(doc => ownedRequests.push({ id: doc.id, ...doc.data() }));
            snapCreatedBy.forEach(doc => ownedRequests.push({ id: doc.id, ...doc.data() }));

            // Combine results and remove duplicates by id
            const allRequestsMap = new Map();

            [...groupRequests, ...ownedRequests].forEach(req => {
                allRequestsMap.set(req.id, req);
            });

            const allRequests = Array.from(allRequestsMap.values());

            // Sort by updatedAt descending (handle timestamp conversion safely)
            allRequests.sort((a, b) => {
                const aTime = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : new Date(a.updatedAt).getTime() || 0;
                const bTime = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : new Date(b.updatedAt).getTime() || 0;
                return bTime - aTime;
            });

            return allRequests;
        } catch (error) {
            console.error('Error fetching accessible group requests:', error);
            return [];
        }
    },

    /**
     * Create a new group request
     */
    async createGroupRequest(requestData, userId) {
        try {
            if (!requestData.title || !requestData.description || !requestData.targetGroupId) {
                return { success: false, message: 'Missing required fields' };
            }

            const groupRef = doc(db, 'groups', requestData.targetGroupId);
            const groupSnap = await getDoc(groupRef);
            if (!groupSnap.exists()) {
                return { success: false, message: 'Target group not found' };
            }

            const groupData = groupSnap.data();
            if (!groupData.members?.includes(userId) && !groupData.hiddenMembers?.includes(userId)) {
                return { success: false, message: 'You must be a member of the group to create requests' };
            }

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
                type: 'group-request',
            };

            const docRef = await addDoc(collection(db, 'grouprequests'), completeRequestData);

            try {
                await addDoc(collection(db, 'activities'), {
                    type: 'group_request_created',
                    userId,
                    groupId: requestData.targetGroupId,
                    requestId: docRef.id,
                    actorName: requestData.createdByName,
                    action: `created a new request "${requestData.title}" in ${groupData.name}`,
                    createdAt: serverTimestamp(),
                });
            } catch (activityError) {
                console.warn('Failed to log activity:', activityError);
            }

            return { success: true, message: 'Group request created successfully!', requestId: docRef.id };
        } catch (error) {
            console.error('Error creating group request:', error);
            if (error.code === 'permission-denied') {
                return { success: false, message: 'Permission denied. You may not have access to create requests in this group.' };
            }
            return { success: false, message: `Failed to create request: ${error.message}` };
        }
    },

    /**
     * Update a group request
     */
    async updateGroupRequest(requestId, updateData, userId) {
        try {
            const requestRef = doc(db, 'grouprequests', requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestSnap.data();
            if (requestData.userId !== userId && requestData.createdBy !== userId) {
                return { success: false, message: 'You can only update your own requests' };
            }

            await updateDoc(requestRef, {
                ...updateData,
                updatedAt: serverTimestamp(),
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
     */
    async respondToGroupRequest(requestId, responseData, userId) {
        try {
            const requestRef = doc(db, 'grouprequests', requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestSnap.data();

            if (requestData.userId === userId || requestData.createdBy === userId) {
                return { success: false, message: 'You cannot respond to your own request' };
            }

            const existingResponse = requestData.responses?.find(r => r.userId === userId);
            if (existingResponse) {
                return { success: false, message: 'You have already responded to this request' };
            }

            const response = {
                userId,
                ...responseData,
                createdAt: serverTimestamp(),
            };

            await updateDoc(requestRef, {
                responses: arrayUnion(response),
                updatedAt: serverTimestamp(),
            });

            try {
                await addDoc(collection(db, 'notifications'), {
                    userId: requestData.userId,
                    type: 'group_request_response',
                    title: 'New Response to Your Group Request',
                    message: `Someone responded to your request "${requestData.title}"`,
                    data: {
                        requestId,
                        responderId: userId,
                        responderName: responseData.responderName,
                    },
                    read: false,
                    createdAt: serverTimestamp(),
                });
            } catch (notificationError) {
                console.warn('Failed to create notification:', notificationError);
            }

            return { success: true, message: 'Response submitted successfully!' };
        } catch (error) {
            console.error('Error responding to group request:', error);
            return { success: false, message: `Failed to respond: ${error.message}` };
        }
    },

    /**
     * Handle automatic status transitions based on conditions
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
                        updateData.scheduledDateTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
                    }
                    break;
                case 'payment_complete':
                    if (request.scheduledDateTime && new Date(request.scheduledDateTime) <= new Date()) {
                        newStatus = 'in_progress';
                        updateData.status = newStatus;
                        updateData.sessionStartedAt = serverTimestamp();
                    }
                    break;
                case 'in_progress':
                    // Completion handled manually or via another process
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
     */
    async cancelGroupRequest(requestId, reason, userId) {
        try {
            const requestRef = doc(db, 'grouprequests', requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestSnap.data();

            if (requestData.userId !== userId && requestData.createdBy !== userId) {
                return { success: false, message: 'You can only cancel your own requests' };
            }

            await updateDoc(requestRef, {
                status: 'cancelled',
                cancellationReason: reason,
                cancelledAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            if (requestData.paidParticipants && requestData.paidParticipants.length > 0) {
                await updateDoc(requestRef, {
                    refundStatus: 'pending',
                    refundInitiatedAt: serverTimestamp(),
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
     */
    async completeSession(requestId, userId) {
        try {
            const requestRef = doc(db, 'grouprequests', requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestSnap.data();

            if (requestData.userId !== userId && !requestData.participants?.includes(userId)) {
                return { success: false, message: 'You can only complete sessions you own or participate in' };
            }

            await updateDoc(requestRef, {
                status: 'completed',
                completedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            return { success: true, message: 'Session completed successfully' };
        } catch (error) {
            console.error('Error completing session:', error);
            return { success: false, message: `Failed to complete session: ${error.message}` };
        }
    },

    /**
     * Get user's group requests optionally filtered by status
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
            const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return requests;
        } catch (error) {
            console.error('Error fetching user group requests:', error);
            return [];
        }
    },

    /**
     * Change request status
     */
    async changeRequestStatus(requestId, newStatus, userId) {
        try {
            const requestRef = doc(db, 'grouprequests', requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestSnap.data();

            if (requestData.userId !== userId && requestData.createdBy !== userId) {
                return { success: false, message: 'You can only change the status of your own requests' };
            }

            const validStatuses = ['active', 'pending', 'accepted', 'completed', 'cancelled'];
            if (!validStatuses.includes(newStatus)) {
                return { success: false, message: 'Invalid status' };
            }

            await updateDoc(requestRef, {
                status: newStatus,
                updatedAt: serverTimestamp(),
            });

            return { success: true, message: `Request status changed to ${newStatus}` };
        } catch (error) {
            console.error('Error changing request status:', error);
            return { success: false, message: `Failed to change status: ${error.message}` };
        }
    },

    /**
     * Soft delete a group request
     */
    async deleteGroupRequest(requestId, userId) {
        try {
            const requestRef = doc(db, 'grouprequests', requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestSnap.data();

            if (requestData.userId !== userId && requestData.createdBy !== userId) {
                return { success: false, message: 'You can only delete your own requests' };
            }

            await updateDoc(requestRef, {
                status: 'deleted',
                deletedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            return { success: true, message: 'Request deleted successfully!' };
        } catch (error) {
            console.error('Error deleting group request:', error);
            return { success: false, message: `Failed to delete request: ${error.message}` };
        }
    },

    /**
     * Increment view count
     */
    async incrementViewCount(requestId) {
        try {
            const requestRef = doc(db, 'grouprequests', requestId);
            await updateDoc(requestRef, {
                viewCount: increment(1),
                lastViewedAt: serverTimestamp(),
            });
        } catch (error) {
            console.warn('Failed to increment view count:', error);
        }
    },

    /**
     * Check if user can vote
     */
    canUserVote(request, userId) {
        if (request.userId === userId || request.createdBy === userId) {
            return false;
        }
        return ['pending', 'voting_open'].includes(request.status);
    },

    /**
     * Check if user can participate
     */
    canUserParticipate(request, userId) {
        if (request.userId === userId || request.createdBy === userId) {
            return false;
        }
        return ['voting_open', 'accepted'].includes(request.status);
    },

    /**
     * Check if user needs to pay
     */
    userNeedsToPay(request, userId) {
        return request.participants?.includes(userId) &&
            !request.paidParticipants?.includes(userId) &&
            request.status === 'accepted';
    },

    /**
     * Get request status display info
     */
    getStatusDisplay(status) {
        const statusMap = {
            pending: {
                label: 'Pending Approval',
                color: 'yellow',
                description: 'Waiting for community votes to approve this session',
            },
            voting_open: {
                label: 'Voting Open',
                color: 'orange',
                description: 'Approved! Members can now join this session',
            },
            accepted: {
                label: 'Accepted',
                color: 'green',
                description: 'Session confirmed, waiting for payments',
            },
            payment_complete: {
                label: 'Ready to Start',
                color: 'golden',
                description: 'All payments completed, session will start soon',
            },
            in_progress: {
                label: 'In Progress',
                color: 'blue',
                description: 'Session is currently active',
            },
            completed: {
                label: 'Completed',
                color: 'black',
                description: 'Session has ended successfully',
            },
            cancelled: {
                label: 'Cancelled',
                color: 'red',
                description: 'Session was cancelled',
            },
        };

        return statusMap[status] || {
            label: status,
            color: 'gray',
            description: 'Unknown status',
        };
    },
};

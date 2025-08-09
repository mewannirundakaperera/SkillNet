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
    limit,
    startAfter,
    or,
    and
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
            console.log('🔍 getUserGroups called for userId:', userId);

            if (!userId) {
                console.log('⚠️ No userId provided to getUserGroups');
                return [];
            }

            const groupsRef = collection(db, 'groups');

            // Query for regular members
            console.log('📋 Querying groups where user is regular member...');
            const qMembers = query(groupsRef, where('members', 'array-contains', userId));

            // Query for hidden members (admin users)
            console.log('📋 Querying groups where user is hidden member...');
            const qHiddenMembers = query(groupsRef, where('hiddenMembers', 'array-contains', userId));

            const [snapMembers, snapHiddenMembers] = await Promise.all([
                getDocs(qMembers).catch(err => {
                    console.warn('⚠️ Error querying regular members:', err);
                    return { docs: [] };
                }),
                getDocs(qHiddenMembers).catch(err => {
                    console.warn('⚠️ Error querying hidden members:', err);
                    return { docs: [] };
                })
            ]);

            const groupIdsSet = new Set();

            console.log('📊 Regular member results:', snapMembers.docs?.length || 0);
            snapMembers.docs?.forEach(doc => {
                console.log('👥 Regular member group:', doc.id, doc.data().name);
                groupIdsSet.add(doc.id);
            });

            console.log('📊 Hidden member results:', snapHiddenMembers.docs?.length || 0);
            snapHiddenMembers.docs?.forEach(doc => {
                console.log('🕵️ Hidden member group:', doc.id, doc.data().name);
                groupIdsSet.add(doc.id);
            });

            const groupIds = Array.from(groupIdsSet);
            console.log('✅ Total unique groups for user:', groupIds.length, groupIds);

            return groupIds;
        } catch (error) {
            console.error('❌ Error fetching user groups:', error);
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
            console.log('🔄 groupRequestService.getAllGroupRequests called with:', { userId, isAdmin });

            if (!userId) {
                console.log('⚠️ No userId provided to getAllGroupRequests');
                return [];
            }

            const requestsRef = collection(db, 'grouprequests');

            if (isAdmin) {
                console.log('👑 Admin access: fetching all requests');
                try {
                    // Admin: fetch all requests unrestricted
                    const snapshot = await getDocs(query(requestsRef, orderBy('updatedAt', 'desc')));
                    const allRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    console.log('✅ Admin: Found', allRequests.length, 'total requests');
                    return allRequests;
                } catch (adminError) {
                    console.warn('⚠️ Admin query with orderBy failed, trying without orderBy:', adminError);
                    // Fallback without orderBy for admin
                    const snapshot = await getDocs(requestsRef);
                    const allRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    // Sort manually
                    allRequests.sort((a, b) => {
                        const aTime = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : new Date(a.updatedAt).getTime() || 0;
                        const bTime = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : new Date(b.updatedAt).getTime() || 0;
                        return bTime - aTime;
                    });
                    console.log('✅ Admin (fallback): Found', allRequests.length, 'total requests');
                    return allRequests;
                }
            }

            console.log('👤 Non-admin access: fetching user-accessible requests');

            // For non-admins, get groups user belongs to
            console.log('🔍 Getting user groups...');
            const userGroups = await this.getUserGroups(userId);
            console.log('👥 User belongs to groups:', userGroups);

            const allRequests = [];

            // Strategy 1: Get requests from user's groups
            if (userGroups.length > 0) {
                const batchSize = 10; // Firestore 'in' queries accept max 10 values

                console.log('🔍 Querying requests in batches for', userGroups.length, 'groups');

                for (let i = 0; i < userGroups.length; i += batchSize) {
                    const batch = userGroups.slice(i, i + batchSize);
                    console.log(`📦 Processing batch ${Math.floor(i/batchSize) + 1}: groups`, batch);

                    try {
                        // Query requests where targetGroupId in batch
                        console.log('🔍 Querying targetGroupId in batch...');
                        const qTargetGroup = query(requestsRef, where('targetGroupId', 'in', batch));
                        const snapTargetGroup = await getDocs(qTargetGroup);
                        snapTargetGroup.forEach(doc => {
                            const data = { id: doc.id, ...doc.data() };
                            console.log('📝 Found request by targetGroupId:', data.id, data.title);
                            allRequests.push(data);
                        });
                        console.log('📝 Found', snapTargetGroup.size, 'requests by targetGroupId');

                        // Query requests where groupId in batch
                        console.log('🔍 Querying groupId in batch...');
                        const qGroup = query(requestsRef, where('groupId', 'in', batch));
                        const snapGroup = await getDocs(qGroup);
                        snapGroup.forEach(doc => {
                            const data = { id: doc.id, ...doc.data() };
                            console.log('📝 Found request by groupId:', data.id, data.title);
                            allRequests.push(data);
                        });
                        console.log('📝 Found', snapGroup.size, 'requests by groupId');

                    } catch (batchError) {
                        console.error('❌ Error in batch query:', batchError);
                        // Continue with next batch instead of failing completely
                        continue;
                    }
                }
            }

            // Strategy 2: Get requests owned by the user
            console.log('🔍 Querying owned requests...');

            try {
                // Query requests where userId equals current user
                console.log('🔍 Querying requests by userId...');
                const qUserId = query(requestsRef, where('userId', '==', userId));
                const snapUserId = await getDocs(qUserId);
                snapUserId.forEach(doc => {
                    const data = { id: doc.id, ...doc.data() };
                    console.log('📝 Found owned request by userId:', data.id, data.title);
                    allRequests.push(data);
                });
                console.log('📝 Found', snapUserId.size, 'requests by userId');

                // Query requests where createdBy equals current user
                console.log('🔍 Querying requests by createdBy...');
                const qCreatedBy = query(requestsRef, where('createdBy', '==', userId));
                const snapCreatedBy = await getDocs(qCreatedBy);
                snapCreatedBy.forEach(doc => {
                    const data = { id: doc.id, ...doc.data() };
                    console.log('📝 Found owned request by createdBy:', data.id, data.title);
                    allRequests.push(data);
                });
                console.log('📝 Found', snapCreatedBy.size, 'requests by createdBy');

            } catch (ownedError) {
                console.error('❌ Error querying owned requests:', ownedError);
                // Don't fail, just continue without owned requests
            }

            // Strategy 3: Fallback - get all requests and filter client-side (if very few requests)
            if (allRequests.length === 0) {
                console.log('⚠️ No requests found via targeted queries, trying fallback...');
                try {
                    const allRequestsSnapshot = await getDocs(query(requestsRef, limit(100))); // Limit to prevent massive downloads
                    console.log('📊 Fallback: Found', allRequestsSnapshot.size, 'total requests in database');

                    // Filter client-side
                    allRequestsSnapshot.forEach(doc => {
                        const data = { id: doc.id, ...doc.data() };

                        // Include if user created it
                        if (data.userId === userId || data.createdBy === userId) {
                            console.log('📝 Fallback: Including owned request:', data.id, data.title);
                            allRequests.push(data);
                            return;
                        }

                        // Include if request is in user's groups
                        if (userGroups.includes(data.targetGroupId) || userGroups.includes(data.groupId)) {
                            console.log('📝 Fallback: Including group request:', data.id, data.title);
                            allRequests.push(data);
                            return;
                        }
                    });

                } catch (fallbackError) {
                    console.error('❌ Fallback strategy also failed:', fallbackError);
                }
            }

            // Remove duplicates by id
            const requestsMap = new Map();
            allRequests.forEach(req => {
                if (!requestsMap.has(req.id)) {
                    requestsMap.set(req.id, req);
                }
            });

            const uniqueRequests = Array.from(requestsMap.values());
            console.log('📊 Total requests before dedup:', allRequests.length);
            console.log('📊 Total requests after dedup:', uniqueRequests.length);

            // Sort by updatedAt descending (handle timestamp conversion safely)
            uniqueRequests.sort((a, b) => {
                const aTime = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : new Date(a.updatedAt).getTime() || 0;
                const bTime = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : new Date(b.updatedAt).getTime() || 0;
                return bTime - aTime;
            });

            console.log('✅ Final result:', uniqueRequests.length, 'accessible requests');

            // Log summary of what was found
            if (uniqueRequests.length > 0) {
                console.log('📋 Request summary:');
                uniqueRequests.slice(0, 5).forEach((req, index) => {
                    console.log(`${index + 1}. ${req.title} (${req.status}) by ${req.createdByName || 'Unknown'}`);
                });
            }

            return uniqueRequests;

        } catch (error) {
            console.error('❌ Error in getAllGroupRequests:', error);
            console.error('❌ Error details:', {
                code: error.code,
                message: error.message,
                stack: error.stack
            });

            // Return empty array instead of throwing to prevent app crash
            return [];
        }
    },

    /**
     * Create a new group request
     */
    async createGroupRequest(requestData, userId) {
        try {
            console.log('🔄 Creating group request:', { requestData, userId });

            if (!requestData.title || !requestData.description || !requestData.targetGroupId) {
                return { success: false, message: 'Missing required fields: title, description, or targetGroupId' };
            }

            if (!userId) {
                return { success: false, message: 'User ID is required' };
            }

            // Verify target group exists and user has access
            const groupRef = doc(db, 'groups', requestData.targetGroupId);
            const groupSnap = await getDoc(groupRef);
            if (!groupSnap.exists()) {
                return { success: false, message: 'Target group not found' };
            }

            const groupData = groupSnap.data();
            console.log('🏢 Target group data:', {
                name: groupData.name,
                members: groupData.members?.length,
                hiddenMembers: groupData.hiddenMembers?.length
            });

            // Check if user is member of the group
            if (!groupData.members?.includes(userId) && !groupData.hiddenMembers?.includes(userId)) {
                return { success: false, message: 'You must be a member of the group to create requests' };
            }

            const completeRequestData = {
                ...requestData,
                // Core identifiers
                userId,
                createdBy: userId,
                groupId: requestData.targetGroupId,
                groupName: groupData.name,

                // Status and workflow
                status: requestData.sessionType === 'group-session' ? 'pending' : 'active',

                // Arrays for tracking
                responses: [],
                votes: [],
                participants: [],
                paidParticipants: [],

                // Counters
                voteCount: 0,
                participantCount: 0,
                totalPaid: 0,
                viewCount: 0,

                // Configuration
                minParticipants: requestData.sessionType === 'group-session' ? 3 : 1,

                // Timestamps
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),

                // Type identifier
                type: 'group-request',
            };

            console.log('📝 Complete request data prepared:', Object.keys(completeRequestData));

            const docRef = await addDoc(collection(db, 'grouprequests'), completeRequestData);
            console.log('✅ Group request created with ID:', docRef.id);

            // Log activity (optional - don't fail if this fails)
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
                console.log('✅ Activity logged successfully');
            } catch (activityError) {
                console.warn('⚠️ Failed to log activity (non-critical):', activityError);
            }

            return { success: true, message: 'Group request created successfully!', requestId: docRef.id };

        } catch (error) {
            console.error('❌ Error creating group request:', error);
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
            console.log('🔄 Updating group request:', { requestId, updateData, userId });

            if (!requestId || !userId) {
                return { success: false, message: 'Request ID and User ID are required' };
            }

            const requestRef = doc(db, 'grouprequests', requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestSnap.data();
            console.log('📄 Current request data:', {
                title: requestData.title,
                status: requestData.status,
                createdBy: requestData.createdBy,
                userId: requestData.userId
            });

            // Check ownership
            if (requestData.userId !== userId && requestData.createdBy !== userId) {
                return { success: false, message: 'You can only update your own requests' };
            }

            const finalUpdateData = {
                ...updateData,
                updatedAt: serverTimestamp(),
            };

            await updateDoc(requestRef, finalUpdateData);
            console.log('✅ Request updated successfully');

            return { success: true, message: 'Request updated successfully!' };

        } catch (error) {
            console.error('❌ Error updating group request:', error);
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
            console.log('🔄 Responding to group request:', { requestId, responseData, userId });

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

            // Create notification (optional)
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
                console.warn('⚠️ Failed to create notification:', notificationError);
            }

            return { success: true, message: 'Response submitted successfully!' };

        } catch (error) {
            console.error('❌ Error responding to group request:', error);
            return { success: false, message: `Failed to respond: ${error.message}` };
        }
    },

    /**
     * Handle automatic status transitions based on conditions
     */
    async handleStatusTransition(requestId) {
        try {
            console.log('🔄 Handling status transition for request:', requestId);

            const requestRef = doc(db, 'grouprequests', requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const request = requestSnap.data();
            let newStatus = request.status;
            const updateData = { updatedAt: serverTimestamp() };

            console.log('📊 Current status:', request.status, 'votes:', request.voteCount, 'participants:', request.participantCount);

            switch (request.status) {
                case 'pending':
                    if ((request.voteCount || 0) >= 5) {
                        newStatus = 'voting_open';
                        updateData.status = newStatus;
                        updateData.votingOpenedAt = serverTimestamp();
                        console.log('✅ Transitioning to voting_open');
                    }
                    break;

                case 'voting_open':
                    const minParticipants = request.minParticipants || 3;
                    if ((request.participantCount || 0) >= minParticipants) {
                        newStatus = 'accepted';
                        updateData.status = newStatus;
                        updateData.approvedAt = serverTimestamp();
                        console.log('✅ Transitioning to accepted');
                    }
                    break;

                case 'accepted':
                    const requiredPayments = request.participantCount || 1;
                    if ((request.paidParticipants?.length || 0) >= requiredPayments) {
                        newStatus = 'payment_complete';
                        updateData.status = newStatus;
                        updateData.paymentCompletedAt = serverTimestamp();
                        updateData.scheduledDateTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
                        console.log('✅ Transitioning to payment_complete');
                    }
                    break;

                case 'payment_complete':
                    if (request.scheduledDateTime && new Date(request.scheduledDateTime) <= new Date()) {
                        newStatus = 'in_progress';
                        updateData.status = newStatus;
                        updateData.sessionStartedAt = serverTimestamp();
                        console.log('✅ Transitioning to in_progress');
                    }
                    break;

                case 'in_progress':
                    // Completion handled manually or via another process
                    break;
            }

            if (newStatus !== request.status) {
                await updateDoc(requestRef, updateData);
                console.log('✅ Status transition completed:', request.status, '->', newStatus);
                return { success: true, message: `Status updated to ${newStatus}`, newStatus };
            }

            return { success: true, message: 'No status change needed' };

        } catch (error) {
            console.error('❌ Error handling status transition:', error);
            return { success: false, message: `Failed to handle status transition: ${error.message}` };
        }
    },

    /**
     * Cancel a group request with reason
     */
    async cancelGroupRequest(requestId, reason, userId) {
        try {
            console.log('🔄 Cancelling group request:', { requestId, reason, userId });

            const requestRef = doc(db, 'grouprequests', requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestSnap.data();

            if (requestData.userId !== userId && requestData.createdBy !== userId) {
                return { success: false, message: 'You can only cancel your own requests' };
            }

            const updateData = {
                status: 'cancelled',
                cancellationReason: reason,
                cancelledAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            // If payments were made, initiate refund process
            if (requestData.paidParticipants && requestData.paidParticipants.length > 0) {
                updateData.refundStatus = 'pending';
                updateData.refundInitiatedAt = serverTimestamp();
                console.log('💰 Refund process initiated for', requestData.paidParticipants.length, 'participants');
            }

            await updateDoc(requestRef, updateData);
            console.log('✅ Request cancelled successfully');

            return { success: true, message: 'Request cancelled successfully' };

        } catch (error) {
            console.error('❌ Error cancelling group request:', error);
            return { success: false, message: `Failed to cancel request: ${error.message}` };
        }
    },

    /**
     * Complete a session
     */
    async completeSession(requestId, userId) {
        try {
            console.log('🔄 Completing session:', { requestId, userId });

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

            console.log('✅ Session completed successfully');
            return { success: true, message: 'Session completed successfully' };

        } catch (error) {
            console.error('❌ Error completing session:', error);
            return { success: false, message: `Failed to complete session: ${error.message}` };
        }
    },

    /**
     * Get user's group requests optionally filtered by status
     */
    async getUserGroupRequests(userId, status = null) {
        try {
            console.log('🔄 Getting user group requests:', { userId, status });

            if (!userId) {
                return [];
            }

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

            console.log('✅ Found', requests.length, 'user requests');
            return requests;

        } catch (error) {
            console.error('❌ Error fetching user group requests:', error);

            // Fallback without orderBy
            try {
                console.log('⚠️ Trying fallback query without orderBy...');
                const requestsRef = collection(db, 'grouprequests');
                let fallbackQuery;

                if (status) {
                    fallbackQuery = query(
                        requestsRef,
                        where('userId', '==', userId),
                        where('status', '==', status)
                    );
                } else {
                    fallbackQuery = query(
                        requestsRef,
                        where('userId', '==', userId)
                    );
                }

                const snapshot = await getDocs(fallbackQuery);
                const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Sort manually
                requests.sort((a, b) => {
                    const aTime = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : new Date(a.updatedAt).getTime() || 0;
                    const bTime = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : new Date(b.updatedAt).getTime() || 0;
                    return bTime - aTime;
                });

                console.log('✅ Fallback: Found', requests.length, 'user requests');
                return requests;

            } catch (fallbackError) {
                console.error('❌ Fallback query also failed:', fallbackError);
                return [];
            }
        }
    },

    /**
     * Change request status
     */
    async changeRequestStatus(requestId, newStatus, userId) {
        try {
            console.log('🔄 Changing request status:', { requestId, newStatus, userId });

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

            console.log('✅ Status changed successfully');
            return { success: true, message: `Request status changed to ${newStatus}` };

        } catch (error) {
            console.error('❌ Error changing request status:', error);
            return { success: false, message: `Failed to change status: ${error.message}` };
        }
    },

    /**
     * Soft delete a group request
     */
    async deleteGroupRequest(requestId, userId) {
        try {
            console.log('🔄 Deleting group request:', { requestId, userId });

            const requestRef = doc(db, 'grouprequests', requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestSnap.data();

            if (requestData.userId !== userId && requestData.createdBy !== userId) {
                return { success: false, message: 'You can only delete your own requests' };
            }

            // Soft delete - mark as deleted instead of actually deleting
            await updateDoc(requestRef, {
                status: 'deleted',
                deletedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            console.log('✅ Request deleted successfully');
            return { success: true, message: 'Request deleted successfully!' };

        } catch (error) {
            console.error('❌ Error deleting group request:', error);
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
            console.log('👁️ View count incremented for request:', requestId);
        } catch (error) {
            console.warn('⚠️ Failed to increment view count:', error);
        }
    },

    /**
     * Vote on a group request
     */
    async voteOnRequest(requestId, userId, vote = true) {
        try {
            console.log('🗳️ Voting on request:', { requestId, userId, vote });

            const requestRef = doc(db, 'grouprequests', requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestSnap.data();

            // Check if user can vote
            if (!this.canUserVote(requestData, userId)) {
                return { success: false, message: 'You cannot vote on this request' };
            }

            const hasVoted = requestData.votes?.includes(userId);
            let updateData;

            if (vote && !hasVoted) {
                // Add vote
                updateData = {
                    votes: arrayUnion(userId),
                    voteCount: increment(1),
                    updatedAt: serverTimestamp()
                };
            } else if (!vote && hasVoted) {
                // Remove vote
                updateData = {
                    votes: arrayRemove(userId),
                    voteCount: increment(-1),
                    updatedAt: serverTimestamp()
                };
            } else {
                return { success: false, message: hasVoted ? 'Already voted' : 'Vote cancelled' };
            }

            await updateDoc(requestRef, updateData);
            console.log('✅ Vote processed successfully');

            // Check for status transitions
            await this.handleStatusTransition(requestId);

            return { success: true, message: vote ? 'Vote added successfully' : 'Vote removed successfully' };

        } catch (error) {
            console.error('❌ Error voting on request:', error);
            return { success: false, message: `Failed to process vote: ${error.message}` };
        }
    },

    /**
     * Join a group request as participant
     */
    async joinRequest(requestId, userId, userInfo = {}) {
        try {
            console.log('🤝 Joining request:', { requestId, userId, userInfo });

            const requestRef = doc(db, 'grouprequests', requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestSnap.data();

            // Check if user can participate
            if (!this.canUserParticipate(requestData, userId)) {
                return { success: false, message: 'You cannot join this request' };
            }

            const isAlreadyParticipating = requestData.participants?.includes(userId);
            if (isAlreadyParticipating) {
                return { success: false, message: 'You are already participating in this request' };
            }

            const updateData = {
                participants: arrayUnion(userId),
                participantCount: increment(1),
                updatedAt: serverTimestamp()
            };

            await updateDoc(requestRef, updateData);
            console.log('✅ Successfully joined request');

            // Check for status transitions
            await this.handleStatusTransition(requestId);

            return { success: true, message: 'Successfully joined the request!' };

        } catch (error) {
            console.error('❌ Error joining request:', error);
            return { success: false, message: `Failed to join request: ${error.message}` };
        }
    },

    /**
     * Leave a group request
     */
    async leaveRequest(requestId, userId) {
        try {
            console.log('👋 Leaving request:', { requestId, userId });

            const requestRef = doc(db, 'grouprequests', requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                return { success: false, message: 'Request not found' };
            }

            const requestData = requestSnap.data();
            const isParticipating = requestData.participants?.includes(userId);

            if (!isParticipating) {
                return { success: false, message: 'You are not participating in this request' };
            }

            const updateData = {
                participants: arrayRemove(userId),
                participantCount: increment(-1),
                updatedAt: serverTimestamp()
            };

            // Also remove from paid participants if they were there
            if (requestData.paidParticipants?.includes(userId)) {
                updateData.paidParticipants = arrayRemove(userId);
                // Note: You might want to handle refunds here
            }

            await updateDoc(requestRef, updateData);
            console.log('✅ Successfully left request');

            return { success: true, message: 'Successfully left the request!' };

        } catch (error) {
            console.error('❌ Error leaving request:', error);
            return { success: false, message: `Failed to leave request: ${error.message}` };
        }
    },

    /**
     * Get requests by group ID
     */
    async getRequestsByGroup(groupId, limit = 20) {
        try {
            console.log('🔍 Getting requests for group:', groupId);

            const requestsRef = collection(db, 'grouprequests');

            // Try with orderBy first
            try {
                const q = query(
                    requestsRef,
                    where('targetGroupId', '==', groupId),
                    orderBy('updatedAt', 'desc'),
                    limit(limit)
                );

                const snapshot = await getDocs(q);
                const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                console.log('✅ Found', requests.length, 'requests for group');
                return requests;

            } catch (orderError) {
                console.warn('⚠️ OrderBy failed, trying without orderBy:', orderError);

                // Fallback without orderBy
                const q = query(
                    requestsRef,
                    where('targetGroupId', '==', groupId)
                );

                const snapshot = await getDocs(q);
                let requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Sort manually
                requests.sort((a, b) => {
                    const aTime = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : new Date(a.updatedAt).getTime() || 0;
                    const bTime = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : new Date(b.updatedAt).getTime() || 0;
                    return bTime - aTime;
                });

                // Apply limit manually
                requests = requests.slice(0, limit);

                console.log('✅ Fallback: Found', requests.length, 'requests for group');
                return requests;
            }

        } catch (error) {
            console.error('❌ Error getting requests by group:', error);
            return [];
        }
    },

    /**
     * Check if user can vote
     */
    canUserVote(request, userId) {
        if (!userId || !request) return false;

        // User cannot vote on their own request
        if (request.userId === userId || request.createdBy === userId) {
            return false;
        }

        // Can only vote in pending or voting_open states
        return ['pending', 'voting_open'].includes(request.status);
    },

    /**
     * Check if user can participate
     */
    canUserParticipate(request, userId) {
        if (!userId || !request) return false;

        // User cannot participate in their own request
        if (request.userId === userId || request.createdBy === userId) {
            return false;
        }

        // Can only participate in voting_open or accepted states
        return ['voting_open', 'accepted'].includes(request.status);
    },

    /**
     * Check if user needs to pay
     */
    userNeedsToPay(request, userId) {
        if (!userId || !request) return false;

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
            deleted: {
                label: 'Deleted',
                color: 'gray',
                description: 'Request has been deleted',
            },
            active: {
                label: 'Active',
                color: 'blue',
                description: 'Request is active and accepting responses',
            },
            all: {
                label: 'All Requests',
                color: 'gray',
                description: 'All requests regardless of status',
            }
        };

        return statusMap[status] || {
            label: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown',
            color: 'gray',
            description: 'Unknown status',
        };
    },

    /**
     * Get request statistics
     */
    async getRequestStats(userId = null) {
        try {
            console.log('📊 Getting request statistics for userId:', userId);

            const requestsRef = collection(db, 'grouprequests');
            const snapshot = await getDocs(requestsRef);

            const stats = {
                total: 0,
                byStatus: {},
                byUser: userId ? {
                    created: 0,
                    participating: 0,
                    completed: 0
                } : null
            };

            snapshot.forEach(doc => {
                const data = doc.data();
                stats.total++;

                // Count by status
                const status = data.status || 'unknown';
                stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

                // Count user-specific stats
                if (userId && stats.byUser) {
                    if (data.userId === userId || data.createdBy === userId) {
                        stats.byUser.created++;
                        if (data.status === 'completed') {
                            stats.byUser.completed++;
                        }
                    }

                    if (data.participants?.includes(userId)) {
                        stats.byUser.participating++;
                    }
                }
            });

            console.log('✅ Request statistics:', stats);
            return stats;

        } catch (error) {
            console.error('❌ Error getting request statistics:', error);
            return {
                total: 0,
                byStatus: {},
                byUser: null
            };
        }
    }
};

export default groupRequestService;
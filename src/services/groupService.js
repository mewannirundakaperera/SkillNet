// CREATE/REPLACE: src/services/groupService.js

import { doc, updateDoc, arrayUnion, arrayRemove, increment, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

export const groupService = {
    /**
     * Join a group
     * @param {string} groupId - The ID of the group to join
     * @param {string} userId - The ID of the user joining
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async joinGroup(groupId, userId) {
        try {
            console.log(`Attempting to join group ${groupId} with user ${userId}`);

            // First, check if the group exists and is public
            const groupRef = doc(db, 'groups', groupId);
            let groupSnap;

            try {
                groupSnap = await getDoc(groupRef);
            } catch (readError) {
                console.error('Error reading group:', readError);
                return { success: false, message: 'Unable to access group. It may be private or not exist.' };
            }

            if (!groupSnap.exists()) {
                return { success: false, message: 'Group not found' };
            }

            const groupData = groupSnap.data();
            console.log('Group data:', groupData);

            // Check if user is already a member
            if (groupData.members?.includes(userId) || groupData.hiddenMembers?.includes(userId)) {
                return { success: false, message: 'Already a member of this group' };
            }

            // Check if group is public (private groups would need invitation logic)
            if (!groupData.isPublic && groupData.createdBy !== userId) {
                return { success: false, message: 'This group is private. You need an invitation to join.' };
            }

            // Update the group document with minimal changes
            const updateData = {
                members: arrayUnion(userId),
                updatedAt: new Date().toISOString()
            };

            // Only increment memberCount if it exists and is a number
            if (typeof groupData.memberCount === 'number') {
                updateData.memberCount = increment(1);
            } else if (groupData.members) {
                updateData.memberCount = groupData.members.length + 1;
            } else {
                updateData.memberCount = 1;
            }

            console.log('Updating group with:', updateData);

            await updateDoc(groupRef, updateData);

            // Update user's joined groups (with error handling)
            try {
                const userRef = doc(db, 'users', userId);
                await updateDoc(userRef, {
                    joinedGroups: arrayUnion(groupId),
                    updatedAt: new Date().toISOString()
                });
                console.log('Updated user document successfully');
            } catch (userUpdateError) {
                console.warn('Failed to update user document, but group join was successful:', userUpdateError);
                // Don't fail the entire operation if user update fails
            }

            return { success: true, message: 'Successfully joined the group!' };

        } catch (error) {
            console.error('Error joining group:', error);

            // Handle specific Firebase errors
            if (error.code === 'permission-denied') {
                return { success: false, message: 'Permission denied. This group may be private or you may not have access.' };
            } else if (error.code === 'not-found') {
                return { success: false, message: 'Group not found.' };
            } else if (error.code === 'unavailable') {
                return { success: false, message: 'Service temporarily unavailable. Please try again later.' };
            }

            return { success: false, message: `Failed to join group: ${error.message}` };
        }
    },

    /**
     * Leave a group
     * @param {string} groupId - The ID of the group to leave
     * @param {string} userId - The ID of the user leaving
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async leaveGroup(groupId, userId) {
        try {
            console.log(`Attempting to leave group ${groupId} with user ${userId}`);

            const groupRef = doc(db, 'groups', groupId);
            let groupSnap;

            try {
                groupSnap = await getDoc(groupRef);
            } catch (readError) {
                console.error('Error reading group:', readError);
                return { success: false, message: 'Unable to access group.' };
            }

            if (!groupSnap.exists()) {
                return { success: false, message: 'Group not found' };
            }

            const groupData = groupSnap.data();

            // Check if user is actually a member
            if (!groupData.members?.includes(userId) && !groupData.hiddenMembers?.includes(userId)) {
                return { success: false, message: 'You are not a member of this group' };
            }

            // Prevent group creator from leaving (they should transfer ownership or delete group)
            if (groupData.createdBy === userId) {
                return { success: false, message: 'As the group creator, you cannot leave. Please transfer ownership or delete the group.' };
            }

            // Update the group document
            const updateData = {
                members: arrayRemove(userId),
                hiddenMembers: arrayRemove(userId), // Remove from hidden members too
                updatedAt: new Date().toISOString()
            };

            // Handle member count
            if (typeof groupData.memberCount === 'number') {
                updateData.memberCount = increment(-1);
            } else if (groupData.members) {
                updateData.memberCount = Math.max(0, groupData.members.length - 1);
            }

            await updateDoc(groupRef, updateData);

            // Update user's joined groups
            try {
                const userRef = doc(db, 'users', userId);
                await updateDoc(userRef, {
                    joinedGroups: arrayRemove(groupId),
                    updatedAt: new Date().toISOString()
                });
            } catch (userUpdateError) {
                console.warn('Failed to update user document, but group leave was successful:', userUpdateError);
            }

            return { success: true, message: 'Successfully left the group!' };

        } catch (error) {
            console.error('Error leaving group:', error);

            if (error.code === 'permission-denied') {
                return { success: false, message: 'Permission denied. You may not have access to leave this group.' };
            }

            return { success: false, message: `Failed to leave group: ${error.message}` };
        }
    },

    /**
     * Get user's groups
     * @param {string} userId - The user ID
     * @returns {Promise<Array>} - Array of group data
     */
    async getUserGroups(userId) {
        try {
            const userRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                return [];
            }

            const userData = userSnap.data();
            const joinedGroupIds = userData.joinedGroups || [];

            if (joinedGroupIds.length === 0) {
                return [];
            }

            // Fetch group details with error handling for each group
            const groupPromises = joinedGroupIds.map(async (groupId) => {
                try {
                    const groupRef = doc(db, 'groups', groupId);
                    const groupSnap = await getDoc(groupRef);

                    if (groupSnap.exists()) {
                        return { id: groupId, ...groupSnap.data() };
                    }
                    return null;
                } catch (error) {
                    console.warn(`Failed to fetch group ${groupId}:`, error);
                    return null;
                }
            });

            const groups = await Promise.all(groupPromises);
            return groups.filter(group => group !== null);

        } catch (error) {
            console.error('Error fetching user groups:', error);
            return [];
        }
    },

    /**
     * Check if user can join a group
     * @param {string} groupId - The group ID
     * @param {string} userId - The user ID
     * @returns {Promise<{canJoin: boolean, reason: string}>}
     */
    async canUserJoinGroup(groupId, userId) {
        try {
            const groupRef = doc(db, 'groups', groupId);
            const groupSnap = await getDoc(groupRef);

            if (!groupSnap.exists()) {
                return { canJoin: false, reason: 'Group not found' };
            }

            const groupData = groupSnap.data();

            // Check if already a member
            if (groupData.members?.includes(userId) || groupData.hiddenMembers?.includes(userId)) {
                return { canJoin: false, reason: 'Already a member' };
            }

            // Check if group is public
            if (!groupData.isPublic && groupData.createdBy !== userId) {
                return { canJoin: false, reason: 'Group is private' };
            }

            return { canJoin: true, reason: 'Can join' };

        } catch (error) {
            console.error('Error checking join permission:', error);
            return { canJoin: false, reason: 'Error checking permissions' };
        }
    }
};
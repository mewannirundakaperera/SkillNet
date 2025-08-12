// src/firebase/collections/groups.js
import {
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/config/firebase';

// Collection name
export const GROUPS_COLLECTION = 'groups';

// Group categories
export const GROUP_CATEGORIES = {
  STUDY: 'study',
  TECHNOLOGY: 'technology',
  BUSINESS: 'business',
  CREATIVE: 'creative',
  HEALTH: 'health',
  HOBBY: 'hobby',
  OTHER: 'other'
};

// Group template
export const GROUP_TEMPLATE = {
  name: "",
  description: "",
  category: "",
  image: "",
  createdBy: "",
  createdByName: "",
  members: [],
  memberCount: 0,
  isPublic: true,
  maxMembers: 100,
  settings: {
    allowFileSharing: true,
    allowVoiceMessages: true,
    moderatedJoining: false
  },
  lastActivity: null,
  lastMessage: null,
  createdAt: null,
  updatedAt: null
};

// Groups Collection Service
export class GroupsService {

    // Create new group
    static async createGroup(groupData) {
      try {
        const groupsRef = collection(db, GROUPS_COLLECTION);

        const newGroup = {
          ...GROUP_TEMPLATE,
          ...groupData,
          members: [groupData.createdBy], // Creator is first member
          memberCount: 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastActivity: serverTimestamp()
        };

        const docRef = await addDoc(groupsRef, newGroup);
        return {id: docRef.id, ...newGroup};
      } catch (error) {
        console.error('Error creating group:', error);
        throw error;
      }
    }

    // Get group by ID
    static async getGroupById(groupId) {
      try {
        const groupRef = doc(db, GROUPS_COLLECTION, groupId);
        const groupSnap = await getDoc(groupRef);

        if (groupSnap.exists()) {
          return {id: groupSnap.id, ...groupSnap.data()};
        } else {
          return null;
        }
      } catch (error) {
        console.error('Error getting group:', error);
        throw error;
      }
    }

    // Get all public groups (for visitors)
    static async getPublicGroups(limitCount = 20) {
      try {
        const groupsRef = collection(db, GROUPS_COLLECTION);
        const q = query(
            groupsRef,
            where('isPublic', '==', true),
            limit(limitCount)
        );

        const querySnapshot = await getDocs(q);
        const groups = [];

        querySnapshot.forEach((doc) => {
          groups.push({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            lastActivity: doc.data().lastActivity?.toDate()
          });
        });

        return groups;
      } catch (error) {
        console.error('Error getting public groups:', error);
        return [];
      }
    }

    // Get user's joined groups
    static async getUserGroups(userId) {
      try {
        const groupsRef = collection(db, GROUPS_COLLECTION);
        const q = query(
            groupsRef,
            where('members', 'array-contains', userId),
            orderBy('lastActivity', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const groups = [];

        querySnapshot.forEach((doc) => {
          groups.push({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            lastActivity: doc.data().lastActivity?.toDate()
          });
        });

        return groups;
      } catch (error) {
        console.error('Error getting user groups:', error);
        throw error;
      }
    }

    // Join group
    static async joinGroup(groupId, userId, userData) {
      try {
        console.log('🔗 Attempting to join group:', { groupId, userId });
        
        // First, get the current group data to check structure
        const groupRef = doc(db, GROUPS_COLLECTION, groupId);
        const groupSnap = await getDoc(groupRef);
        
        if (!groupSnap.exists()) {
          throw new Error('Group not found');
        }
        
        const groupData = groupSnap.data();
        console.log('📋 Current group data:', groupData);
        
        // Prepare update data with fallbacks for missing fields
        const updateData = {
          updatedAt: serverTimestamp()
        };
        
        // Handle members array
        if (groupData.members && Array.isArray(groupData.members)) {
          updateData.members = arrayUnion(userId);
        } else {
          // Create members array if it doesn't exist
          updateData.members = [userId];
        }
        
        // Handle memberCount
        if (typeof groupData.memberCount === 'number') {
          updateData.memberCount = increment(1);
        } else {
          // Set memberCount if it doesn't exist
          const currentMembers = groupData.members || [];
          updateData.memberCount = currentMembers.length + 1;
        }
        
        console.log('📝 Update data:', updateData);
        
        // Try batch operation first
        try {
          const batch = writeBatch(db);
          batch.update(groupRef, updateData);
          await batch.commit();
          console.log('✅ Group joined successfully via batch');
          return true;
        } catch (batchError) {
          console.warn('⚠️ Batch operation failed, trying direct update:', batchError.message);
          
          // Fallback to direct update
          await updateDoc(groupRef, updateData);
          console.log('✅ Group joined successfully via direct update');
          return true;
        }
        
      } catch (error) {
        console.error('❌ Error joining group:', error);
        throw error;
      }
    }

    // Leave group
    static async leaveGroup(groupId, userId) {
      try {
        const batch = writeBatch(db);

        // Remove user from group members
        const groupRef = doc(db, GROUPS_COLLECTION, groupId);
        batch.update(groupRef, {
          members: arrayRemove(userId),
          memberCount: increment(-1),
          updatedAt: serverTimestamp()
        });

        await batch.commit();
        return true;
      } catch (error) {
        console.error('Error leaving group:', error);
        throw error;
      }
    }

    // Update group details
    static async updateGroup(groupId, updateData) {
      try {
        const groupRef = doc(db, GROUPS_COLLECTION, groupId);
        await updateDoc(groupRef, {
          ...updateData,
          updatedAt: serverTimestamp()
        });
        return true;
      } catch (error) {
        console.error('Error updating group:', error);
        throw error;
      }
    }

    // Update last activity (called when messages are sent)
    static async updateLastActivity(groupId, lastMessage = null) {
      try {
        const groupRef = doc(db, GROUPS_COLLECTION, groupId);
        const updateData = {
          lastActivity: serverTimestamp()
        };

        if (lastMessage) {
          updateData.lastMessage = lastMessage;
        }

        await updateDoc(groupRef, updateData);
        return true;
      } catch (error) {
        console.error('Error updating last activity:', error);
        throw error;
      }
    }

    // Search groups by name or category
    static async searchGroups(searchTerm, category = null) {
      try {
        const groupsRef = collection(db, GROUPS_COLLECTION);
        let q;

        if (category) {
          q = query(
              groupsRef,
              where('isPublic', '==', true),
              where('category', '==', category)
          );
        } else {
          q = query(groupsRef, where('isPublic', '==', true));
        }

        const querySnapshot = await getDocs(q);
        const groups = [];

        querySnapshot.forEach((doc) => {
          const group = {id: doc.id, ...doc.data()};

          // Simple search - check if search term is in name or description
          if (group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              group.description.toLowerCase().includes(searchTerm.toLowerCase())) {
            groups.push(group);
          }
        });

        return groups;
      } catch (error) {
        console.error('Error searching groups:', error);
        throw error;
      }
    }

    // Get groups by category
    static async getGroupsByCategory(category, limitCount = 20) {
      try {
        const groupsRef = collection(db, GROUPS_COLLECTION);
        const q = query(
            groupsRef,
            where('isPublic', '==', true),
            where('category', '==', category),
            orderBy('memberCount', 'desc'),
            limit(limitCount)
        );

        const querySnapshot = await getDocs(q);
        const groups = [];

        querySnapshot.forEach((snapshotdoc) => {
          groups.push({
            id: snapshotdoc.id,
            ...snapshotdoc.data(),
            createdAt: snapshotdoc.data().createdAt?.toDate(),
            lastActivity: snapshotdoc.data().lastActivity?.toDate()
          });
        });

        return groups;
      } catch (error) {
        console.error('Error getting groups by category:', error);
        throw error;
      }
    }

    // Delete group (only by creator)
    static async deleteGroup(groupId, userId) {
      try {
        // First check if user is the creator
        const group = await this.getGroupById(groupId);
        if (!group || group.createdBy !== userId) {
          throw new Error('Only group creator can delete the group');
        }

        const groupRef = doc(db, GROUPS_COLLECTION, groupId);
        await deleteDoc(groupRef);
        return true;
      } catch (error) {
        console.error('Error deleting group:', error);
        throw error;
      }
    }

    // Check if user is member of group
    static async isUserMember(groupId, userId) {
      try {
        const group = await this.getGroupById(groupId);
        return group && group.members.includes(userId);
      } catch (error) {
        console.error('Error checking group membership:', error);
        return false;
      }
    }

    // Get random groups for suggestions (excluding user's joined groups)
    static async getRandomGroups(userId, count = 3) {
      try {
        console.log('GroupsService.getRandomGroups called with userId:', userId, 'count:', count);
        const groupsRef = collection(db, GROUPS_COLLECTION);
        
        // Try to get groups with a simpler query first
        let q = query(
          groupsRef,
          where('isPublic', '==', true),
          limit(20)
        );

        try {
          const querySnapshot = await getDocs(q);
          let allGroups = [];

          querySnapshot.forEach((doc) => {
            const groupData = doc.data();
            const group = {
              id: doc.id,
              ...groupData,
              createdAt: groupData.createdAt?.toDate(),
              lastActivity: groupData.lastActivity?.toDate()
            };
            
            // Only include groups the user is not a member of
            if (!group.members || !group.members.includes(userId)) {
              allGroups.push(group);
            }
          });

          // If we have groups, shuffle and return
          if (allGroups.length > 0) {
            const shuffled = allGroups.sort(() => 0.5 - Math.random());
            return shuffled.slice(0, Math.min(count, allGroups.length));
          }
        } catch (queryError) {
          console.log('Query with isPublic filter failed, trying without filters');
        }

        // Fallback: get all groups without filters
        try {
          const allGroupsQuery = query(groupsRef, limit(20));
          const allGroupsSnapshot = await getDocs(allGroupsQuery);
          let allGroups = [];

          allGroupsSnapshot.forEach((doc) => {
            const groupData = doc.data();
            const group = {
              id: doc.id,
              ...groupData,
              createdAt: groupData.createdAt?.toDate(),
              lastActivity: groupData.lastActivity?.toDate()
            };
            
            // Only include groups the user is not a member of
            if (!group.members || !group.members.includes(userId)) {
              allGroups.push(group);
            }
          });

          const shuffled = allGroups.sort(() => 0.5 - Math.random());
          return shuffled.slice(0, Math.min(count, allGroups.length));
        } catch (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          return [];
        }
      } catch (error) {
        console.error('Error getting random groups:', error);
        return [];
      }
    }

    // Get trending groups (most active/popular)
    static async getTrendingGroups(limitCount = 6) {
      try {
        const groupsRef = collection(db, GROUPS_COLLECTION);
        const q = query(
          groupsRef,
          where('isPublic', '==', true),
          orderBy('memberCount', 'desc'),
          orderBy('lastActivity', 'desc'),
          limit(limitCount)
        );

        const querySnapshot = await getDocs(q);
        const groups = [];

        querySnapshot.forEach((doc) => {
          groups.push({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            lastActivity: doc.data().lastActivity?.toDate()
          });
        });

        return groups;
      } catch (error) {
        console.error('Error getting trending groups:', error);
        return [];
      }
    }
}

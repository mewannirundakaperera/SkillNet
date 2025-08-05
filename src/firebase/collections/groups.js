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

    // Get all public groups
    static async getPublicGroups(limitCount = 20) {
      try {
        const groupsRef = collection(db, GROUPS_COLLECTION);
        const q = query(
            groupsRef,
            where('isPublic', '==', true),
            orderBy('memberCount', 'desc'),
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
        throw error;
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
        const batch = writeBatch(db);

        // Add user to group members
        const groupRef = doc(db, GROUPS_COLLECTION, groupId);
        batch.update(groupRef, {
          members: arrayUnion(userId),
          memberCount: increment(1),
          updatedAt: serverTimestamp()
        });

        await batch.commit();
        return true;
      } catch (error) {
        console.error('Error joining group:', error);
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
}

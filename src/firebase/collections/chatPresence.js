// src/firebase/collections/chatPresence.js
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/config/firebase';

// Chat Presence Service for Online Status and Typing Indicators
export class ChatPresenceService {

  // Update user's online status in a group
  static async updateUserPresence(groupId, userId, userData, isOnline) {
    try {
      const userStatusRef = doc(db, 'groups', groupId, 'activeUsers', userId);

      if (isOnline) {
        await setDoc(userStatusRef, {
          userId,
          userName: userData.userName || userData.displayName,
          userAvatar: userData.userAvatar || userData.avatar,
          isOnline: true,
          lastSeen: serverTimestamp()
        }, { merge: true });
      } else {
        await updateDoc(userStatusRef, {
          isOnline: false,
          lastSeen: serverTimestamp()
        });
      }

      return true;
    } catch (error) {
      console.error('Error updating user presence:', error);
      throw error;
    }
  }

  // Subscribe to online users in a group
  static subscribeToOnlineUsers(groupId, callback) {
    try {
      const activeUsersRef = collection(db, 'groups', groupId, 'activeUsers');
      const activeUsersQuery = query(
        activeUsersRef,
        where('isOnline', '==', true)
      );

      return onSnapshot(activeUsersQuery, (snapshot) => {
        const users = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          lastSeen: doc.data().lastSeen?.toDate()
        }));
        callback(users);
      });
    } catch (error) {
      console.error('Error subscribing to online users:', error);
    }
  }

  // Update typing status
  static async updateTypingStatus(groupId, userId, isTyping, userName) {
    try {
      const typingRef = doc(db, 'groups', groupId, 'typingStatus', userId);

      if (isTyping) {
        await setDoc(typingRef, {
          userId,
          userName,
          timestamp: serverTimestamp()
        });
      } else {
        await deleteDoc(typingRef);
      }

      return true;
    } catch (error) {
      console.error('Error updating typing status:', error);
      // Don't throw error for typing status as it's not critical
    }
  }

  // Subscribe to typing users in a group
  static subscribeToTypingUsers(groupId, callback) {
    try {
      const typingRef = collection(db, 'groups', groupId, 'typingStatus');

      return onSnapshot(typingRef, (snapshot) => {
        const typingUsers = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate()
        }));

        // Filter out old typing indicators (older than 5 seconds)
        const now = new Date();
        const activeTypingUsers = typingUsers.filter(user =>
          user.timestamp && (now - user.timestamp) < 5000
        );

        callback(activeTypingUsers);
      });
    } catch (error) {
      console.error('Error subscribing to typing users:', error);
    }
  }

  // Get user's last seen time
  static async getUserLastSeen(groupId, userId) {
    try {
      const userStatusRef = doc(db, 'groups', groupId, 'activeUsers', userId);
      const userStatusSnap = await getDoc(userStatusRef);

      if (userStatusSnap.exists()) {
        const data = userStatusSnap.data();
        return {
          isOnline: data.isOnline,
          lastSeen: data.lastSeen?.toDate()
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting user last seen:', error);
      throw error;
    }
  }

  // Clean up old typing indicators (called periodically)
  static async cleanupOldTypingIndicators(groupId) {
    try {
      const typingRef = collection(db, 'groups', groupId, 'typingStatus');
      const snapshot = await getDocs(typingRef);

      const now = new Date();
      const deletePromises = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const timestamp = data.timestamp?.toDate();

        // Delete if older than 10 seconds
        if (timestamp && (now - timestamp) > 10000) {
          deletePromises.push(deleteDoc(doc.ref));
        }
      });

      if (deletePromises.length > 0) {
        await Promise.all(deletePromises);
        console.log(`Cleaned up ${deletePromises.length} old typing indicators`);
      }

      return true;
    } catch (error) {
      console.error('Error cleaning up typing indicators:', error);
    }
  }

  // Set user as offline in all groups (call on logout)
  static async setUserOfflineInAllGroups(userId) {
    try {
      // This is a simplified version - in production you might want to
      // keep track of which groups a user is active in
      console.log(`Setting user ${userId} offline in all groups`);
      // Implementation would depend on your specific needs
      return true;
    } catch (error) {
      console.error('Error setting user offline:', error);
    }
  }

  // Get all online users across groups (for global online status)
  static async getGlobalOnlineUsers() {
    try {
      // This would require a different collection structure for global presence
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('Error getting global online users:', error);
      throw error;
    }
  }
}
// src/firebase/collections/userActivityCollection.js
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
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/config/firebase';

// Collection name
export const USER_ACTIVITY_COLLECTION = 'userActivity';

// Activity types enum
export const ACTIVITY_TYPES = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  PROFILE_UPDATE: 'profile_update',
  SKILL_ADDED: 'skill_added',
  SKILL_REMOVED: 'skill_removed',
  CONNECTION_MADE: 'connection_made',
  SESSION_BOOKED: 'session_booked',
  SESSION_COMPLETED: 'session_completed',
  RATING_GIVEN: 'rating_given',
  RATING_RECEIVED: 'rating_received'
};

// Activity template
export const ACTIVITY_TEMPLATE = {
  userId: "",
  activityType: "",
  description: "",
  metadata: {},
  createdAt: null,
  isPublic: false
};

// UserActivity Collection Service
export class UserActivityService {

  // Create new activity
  static async createActivity(activityData) {
    try {
      const activitiesRef = collection(db, USER_ACTIVITY_COLLECTION);

      const newActivity = {
        ...ACTIVITY_TEMPLATE,
        ...activityData,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(activitiesRef, newActivity);
      return { id: docRef.id, ...newActivity };
    } catch (error) {
      console.error('Error creating activity:', error);
      throw error;
    }
  }

  // Get user's activities
  static async getUserActivities(userId, limitCount = 50) {
    try {
      const activitiesRef = collection(db, USER_ACTIVITY_COLLECTION);
      const q = query(
        activitiesRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const activities = [];

      querySnapshot.forEach((doc) => {
        activities.push({ id: doc.id, ...doc.data() });
      });

      return activities;
    } catch (error) {
      console.error('Error getting user activities:', error);
      throw error;
    }
  }

  // Get activities by type
  static async getActivitiesByType(userId, activityType, limitCount = 20) {
    try {
      const activitiesRef = collection(db, USER_ACTIVITY_COLLECTION);
      const q = query(
        activitiesRef,
        where('userId', '==', userId),
        where('activityType', '==', activityType),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const activities = [];

      querySnapshot.forEach((doc) => {
        activities.push({ id: doc.id, ...doc.data() });
      });

      return activities;
    } catch (error) {
      console.error('Error getting activities by type:', error);
      throw error;
    }
  }

  // Get public activities (for feed)
  static async getPublicActivities(limitCount = 20) {
    try {
      const activitiesRef = collection(db, USER_ACTIVITY_COLLECTION);
      const q = query(
        activitiesRef,
        where('isPublic', '==', true),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const activities = [];

      querySnapshot.forEach((doc) => {
        activities.push({ id: doc.id, ...doc.data() });
      });

      return activities;
    } catch (error) {
      console.error('Error getting public activities:', error);
      throw error;
    }
  }

  // Delete activity
  static async deleteActivity(activityId) {
    try {
      const activityRef = doc(db, USER_ACTIVITY_COLLECTION, activityId);
      await deleteDoc(activityRef);
      return true;
    } catch (error) {
      console.error('Error deleting activity:', error);
      throw error;
    }
  }

  // Update activity visibility
  static async updateActivityVisibility(activityId, isPublic) {
    try {
      const activityRef = doc(db, USER_ACTIVITY_COLLECTION, activityId);
      await updateDoc(activityRef, { isPublic });
      return true;
    } catch (error) {
      console.error('Error updating activity visibility:', error);
      throw error;
    }
  }
}

// src/firebase/collections/connectionsCollection.js
// Collection name
export const CONNECTIONS_COLLECTION = 'connections';

// Connection types enum
export const CONNECTION_TYPES = {
  FRIEND: 'friend',
  FOLLOW: 'follow',
  BLOCK: 'block',
  MENTOR: 'mentor',
  MENTEE: 'mentee'
};

// Connection status enum
export const CONNECTION_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled'
};

// Connection template
export const CONNECTION_TEMPLATE = {
  userId: "",           // The user who initiated the connection
  targetUserId: "",     // The user being connected to
  connectionType: "",   // Type of connection
  status: CONNECTION_STATUS.PENDING,
  message: "",          // Optional message
  createdAt: null,
  updatedAt: null,
  metadata: {}
};

// Connections Collection Service
export class ConnectionsService {

  // Create new connection request
  static async createConnection(connectionData) {
    try {
      const connectionsRef = collection(db, CONNECTIONS_COLLECTION);

      const newConnection = {
        ...CONNECTION_TEMPLATE,
        ...connectionData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(connectionsRef, newConnection);
      return { id: docRef.id, ...newConnection };
    } catch (error) {
      console.error('Error creating connection:', error);
      throw error;
    }
  }

  // Get user's connections (both sent and received)
  static async getUserConnections(userId, status = null) {
    try {
      const connectionsRef = collection(db, CONNECTIONS_COLLECTION);

      // Get connections where user is either sender or receiver
      const sentQuery = status
        ? query(connectionsRef, where('userId', '==', userId), where('status', '==', status))
        : query(connectionsRef, where('userId', '==', userId));

      const receivedQuery = status
        ? query(connectionsRef, where('targetUserId', '==', userId), where('status', '==', status))
        : query(connectionsRef, where('targetUserId', '==', userId));

      const [sentSnapshot, receivedSnapshot] = await Promise.all([
        getDocs(sentQuery),
        getDocs(receivedQuery)
      ]);

      const connections = [];

      sentSnapshot.forEach((doc) => {
        connections.push({ id: doc.id, ...doc.data(), direction: 'sent' });
      });

      receivedSnapshot.forEach((doc) => {
        connections.push({ id: doc.id, ...doc.data(), direction: 'received' });
      });

      return connections;
    } catch (error) {
      console.error('Error getting user connections:', error);
      throw error;
    }
  }

  // Get pending connection requests for a user
  static async getPendingRequests(userId) {
    try {
      const connectionsRef = collection(db, CONNECTIONS_COLLECTION);
      const q = query(
        connectionsRef,
        where('targetUserId', '==', userId),
        where('status', '==', CONNECTION_STATUS.PENDING)
      );

      const querySnapshot = await getDocs(q);
      const requests = [];

      querySnapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() });
      });

      return requests;
    } catch (error) {
      console.error('Error getting pending requests:', error);
      throw error;
    }
  }

  // Accept connection request
  static async acceptConnection(connectionId) {
    try {
      const connectionRef = doc(db, CONNECTIONS_COLLECTION, connectionId);
      await updateDoc(connectionRef, {
        status: CONNECTION_STATUS.ACCEPTED,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error accepting connection:', error);
      throw error;
    }
  }

  // Reject connection request
  static async rejectConnection(connectionId) {
    try {
      const connectionRef = doc(db, CONNECTIONS_COLLECTION, connectionId);
      await updateDoc(connectionRef, {
        status: CONNECTION_STATUS.REJECTED,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error rejecting connection:', error);
      throw error;
    }
  }

  // Cancel connection request (by sender)
  static async cancelConnection(connectionId) {
    try {
      const connectionRef = doc(db, CONNECTIONS_COLLECTION, connectionId);
      await updateDoc(connectionRef, {
        status: CONNECTION_STATUS.CANCELLED,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error cancelling connection:', error);
      throw error;
    }
  }

  // Remove/delete connection
  static async removeConnection(connectionId) {
    try {
      const connectionRef = doc(db, CONNECTIONS_COLLECTION, connectionId);
      await deleteDoc(connectionRef);
      return true;
    } catch (error) {
      console.error('Error removing connection:', error);
      throw error;
    }
  }

  // Check if connection exists between two users
  static async checkConnectionExists(userId, targetUserId, connectionType = null) {
    try {
      const connectionsRef = collection(db, CONNECTIONS_COLLECTION);

      // Check both directions
      const queries = [
        query(
          connectionsRef,
          where('userId', '==', userId),
          where('targetUserId', '==', targetUserId),
          where('status', '==', CONNECTION_STATUS.ACCEPTED)
        ),
        query(
          connectionsRef,
          where('userId', '==', targetUserId),
          where('targetUserId', '==', userId),
          where('status', '==', CONNECTION_STATUS.ACCEPTED)
        )
      ];

      if (connectionType) {
        queries.forEach(q => {
          q = query(q, where('connectionType', '==', connectionType));
        });
      }

      const [query1Snapshot, query2Snapshot] = await Promise.all([
        getDocs(queries[0]),
        getDocs(queries[1])
      ]);

      const connections = [];

      query1Snapshot.forEach((doc) => {
        connections.push({ id: doc.id, ...doc.data() });
      });

      query2Snapshot.forEach((doc) => {
        connections.push({ id: doc.id, ...doc.data() });
      });

      return connections.length > 0 ? connections[0] : null;
    } catch (error) {
      console.error('Error checking connection exists:', error);
      throw error;
    }
  }

  // Get connections by type
  static async getConnectionsByType(userId, connectionType) {
    try {
      const connectionsRef = collection(db, CONNECTIONS_COLLECTION);

      const sentQuery = query(
        connectionsRef,
        where('userId', '==', userId),
        where('connectionType', '==', connectionType),
        where('status', '==', CONNECTION_STATUS.ACCEPTED)
      );

      const receivedQuery = query(
        connectionsRef,
        where('targetUserId', '==', userId),
        where('connectionType', '==', connectionType),
        where('status', '==', CONNECTION_STATUS.ACCEPTED)
      );

      const [sentSnapshot, receivedSnapshot] = await Promise.all([
        getDocs(sentQuery),
        getDocs(receivedQuery)
      ]);

      const connections = [];

      sentSnapshot.forEach((doc) => {
        connections.push({ id: doc.id, ...doc.data(), direction: 'sent' });
      });

      receivedSnapshot.forEach((doc) => {
        connections.push({ id: doc.id, ...doc.data(), direction: 'received' });
      });

      return connections;
    } catch (error) {
      console.error('Error getting connections by type:', error);
      throw error;
    }
  }

  // Block user
  static async blockUser(userId, targetUserId, reason = '') {
    try {
      const connectionData = {
        userId,
        targetUserId,
        connectionType: CONNECTION_TYPES.BLOCK,
        status: CONNECTION_STATUS.ACCEPTED, // Block is immediately active
        message: reason,
        metadata: { reason }
      };

      return await this.createConnection(connectionData);
    } catch (error) {
      console.error('Error blocking user:', error);
      throw error;
    }
  }

  // Unblock user
  static async unblockUser(userId, targetUserId) {
    try {
      const connectionsRef = collection(db, CONNECTIONS_COLLECTION);
      const q = query(
        connectionsRef,
        where('userId', '==', userId),
        where('targetUserId', '==', targetUserId),
        where('connectionType', '==', CONNECTION_TYPES.BLOCK)
      );

      const querySnapshot = await getDocs(q);
      const deletePromises = [];

      querySnapshot.forEach((doc) => {
        deletePromises.push(deleteDoc(doc.ref));
      });

      await Promise.all(deletePromises);
      return true;
    } catch (error) {
      console.error('Error unblocking user:', error);
      throw error;
    }
  }
}
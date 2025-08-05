// src/firebase/collections/requests.js
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
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/config/firebase';

// Request statuses
export const REQUEST_STATUS = {
  DRAFT: 'draft',
  OPEN: 'open',
  ACTIVE: 'active',
  PENDING: 'pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ARCHIVED: 'archived'
};

// Request types
export const REQUEST_TYPES = {
  ONE_TO_ONE: 'one-to-one',
  GROUP: 'group',
  STUDY_GROUP: 'study-group',
  TUTORING: 'tutoring'
};

// Request template
export const REQUEST_TEMPLATE = {
  userId: "",
  userName: "",
  userEmail: "",
  userAvatar: "",
  topic: "",
  title: "",
  description: "",
  subject: "",
  type: REQUEST_TYPES.ONE_TO_ONE,
  status: REQUEST_STATUS.DRAFT,
  visibility: "public",
  preferredDate: "",
  preferredTime: "",
  scheduledDate: null,
  scheduledTime: "",
  duration: "60",
  paymentAmount: "200.00",
  maxParticipants: 5,
  participants: [],
  participantCount: 0,
  tags: [],
  views: 0,
  likes: 0,
  featured: false,
  createdAt: null,
  updatedAt: null,
  completedAt: null,
  cancelledAt: null,
  archivedAt: null
};

// Requests Collection Service
export class RequestsService {

  // Create new request
  static async createRequest(requestData, userId) {
    try {
      const requestsRef = collection(db, 'requests');

      const newRequest = {
        ...REQUEST_TEMPLATE,
        ...requestData,
        userId,
        participantCount: 0,
        participants: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(requestsRef, newRequest);
      return { id: docRef.id, ...newRequest };
    } catch (error) {
      console.error('Error creating request:', error);
      throw error;
    }
  }

  // Get request by ID
  static async getRequestById(requestId) {
    try {
      const requestRef = doc(db, 'requests', requestId);
      const requestSnap = await getDoc(requestRef);

      if (requestSnap.exists()) {
        return {
          id: requestSnap.id,
          ...requestSnap.data(),
          createdAt: requestSnap.data().createdAt?.toDate(),
          updatedAt: requestSnap.data().updatedAt?.toDate(),
          scheduledDate: requestSnap.data().scheduledDate?.toDate(),
          completedAt: requestSnap.data().completedAt?.toDate()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting request:', error);
      throw error;
    }
  }

  // Get user's requests
  static async getUserRequests(userId, status = null, limitCount = 20) {
    try {
      const requestsRef = collection(db, 'requests');
      let q = query(
        requestsRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      if (status) {
        q = query(
          requestsRef,
          where('userId', '==', userId),
          where('status', '==', status),
          orderBy('createdAt', 'desc')
        );
      }

      if (limitCount) {
        q = query(q, limit(limitCount));
      }

      const querySnapshot = await getDocs(q);
      const requests = [];

      querySnapshot.forEach((doc) => {
        requests.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
          scheduledDate: doc.data().scheduledDate?.toDate()
        });
      });

      return requests;
    } catch (error) {
      console.error('Error getting user requests:', error);
      throw error;
    }
  }

  // Get available requests (from other users)
  static async getAvailableRequests(currentUserId, filters = {}, limitCount = 20) {
    try {
      const requestsRef = collection(db, 'requests');
      let q = query(
        requestsRef,
        where('userId', '!=', currentUserId),
        where('status', 'in', ['open', 'active']),
        orderBy('createdAt', 'desc')
      );

      // Apply filters
      if (filters.subject) {
        q = query(q, where('subject', '==', filters.subject));
      }

      if (filters.type) {
        q = query(q, where('type', '==', filters.type));
      }

      if (limitCount) {
        q = query(q, limit(limitCount));
      }

      const querySnapshot = await getDocs(q);
      const requests = [];

      querySnapshot.forEach((doc) => {
        requests.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
          scheduledDate: doc.data().scheduledDate?.toDate()
        });
      });

      return requests;
    } catch (error) {
      console.error('Error getting available requests:', error);
      throw error;
    }
  }

  // Subscribe to user's requests (real-time)
  static subscribeToUserRequests(userId, callback, status = null) {
    try {
      const requestsRef = collection(db, 'requests');
      let q = query(
        requestsRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      if (status) {
        q = query(
          requestsRef,
          where('userId', '==', userId),
          where('status', '==', status),
          orderBy('createdAt', 'desc')
        );
      }

      return onSnapshot(q, (snapshot) => {
        const requests = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
          scheduledDate: doc.data().scheduledDate?.toDate()
        }));
        callback(requests);
      });
    } catch (error) {
      console.error('Error subscribing to user requests:', error);
    }
  }

  // Subscribe to available requests (real-time)
  static subscribeToAvailableRequests(currentUserId, callback, filters = {}) {
    try {
      const requestsRef = collection(db, 'requests');
      let q = query(
        requestsRef,
        where('userId', '!=', currentUserId),
        where('status', 'in', ['open', 'active']),
        orderBy('createdAt', 'desc')
      );

      // Apply filters
      if (filters.subject) {
        q = query(q, where('subject', '==', filters.subject));
      }

      return onSnapshot(q, (snapshot) => {
        const requests = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
          scheduledDate: doc.data().scheduledDate?.toDate()
        }));
        callback(requests);
      });
    } catch (error) {
      console.error('Error subscribing to available requests:', error);
    }
  }

  // Update request
  static async updateRequest(requestId, updateData) {
    try {
      const requestRef = doc(db, 'requests', requestId);
      await updateDoc(requestRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating request:', error);
      throw error;
    }
  }

  // Join request (add participant)
  static async joinRequest(requestId, userId, userData) {
    try {
      const batch = writeBatch(db);

      // Add user to participants
      const requestRef = doc(db, 'requests', requestId);
      batch.update(requestRef, {
        participants: arrayUnion(userId),
        participantCount: increment(1),
        updatedAt: serverTimestamp()
      });

      // Create notification for request creator
      const notificationRef = doc(collection(db, 'notifications'));
      batch.set(notificationRef, {
        userId: requestId, // Will be replaced with actual creator ID
        type: 'request_join',
        title: 'New Participant',
        message: `${userData.displayName || userData.name} joined your request`,
        requestId: requestId,
        createdAt: serverTimestamp(),
        read: false
      });

      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error joining request:', error);
      throw error;
    }
  }

  // Leave request (remove participant)
  static async leaveRequest(requestId, userId) {
    try {
      const requestRef = doc(db, 'requests', requestId);
      await updateDoc(requestRef, {
        participants: arrayRemove(userId),
        participantCount: increment(-1),
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error leaving request:', error);
      throw error;
    }
  }

  // Change request status
  static async changeRequestStatus(requestId, newStatus) {
    try {
      const updateData = {
        status: newStatus,
        updatedAt: serverTimestamp()
      };

      // Add timestamp for specific statuses
      if (newStatus === REQUEST_STATUS.COMPLETED) {
        updateData.completedAt = serverTimestamp();
      } else if (newStatus === REQUEST_STATUS.CANCELLED) {
        updateData.cancelledAt = serverTimestamp();
      } else if (newStatus === REQUEST_STATUS.ARCHIVED) {
        updateData.archivedAt = serverTimestamp();
      }

      const requestRef = doc(db, 'requests', requestId);
      await updateDoc(requestRef, updateData);
      return true;
    } catch (error) {
      console.error('Error changing request status:', error);
      throw error;
    }
  }

  // Delete request
  static async deleteRequest(requestId) {
    try {
      const requestRef = doc(db, 'requests', requestId);
      await deleteDoc(requestRef);
      return true;
    } catch (error) {
      console.error('Error deleting request:', error);
      throw error;
    }
  }

  // Increment view count
  static async incrementViews(requestId) {
    try {
      const requestRef = doc(db, 'requests', requestId);
      await updateDoc(requestRef, {
        views: increment(1)
      });
      return true;
    } catch (error) {
      console.error('Error incrementing views:', error);
      // Don't throw error for views as it's not critical
    }
  }

  // Search requests
  static async searchRequests(searchTerm, filters = {}) {
    try {
      const requestsRef = collection(db, 'requests');
      let q = query(
        requestsRef,
        where('status', 'in', ['open', 'active']),
        orderBy('createdAt', 'desc')
      );

      // Apply filters
      if (filters.subject) {
        q = query(q, where('subject', '==', filters.subject));
      }

      const querySnapshot = await getDocs(q);
      const requests = [];

      querySnapshot.forEach((doc) => {
        const request = { id: doc.id, ...doc.data() };

        // Simple search - check if search term is in title, topic, or description
        const searchableText = `${request.title || ''} ${request.topic || ''} ${request.description || ''}`.toLowerCase();

        if (searchableText.includes(searchTerm.toLowerCase())) {
          requests.push({
            ...request,
            createdAt: request.createdAt?.toDate(),
            updatedAt: request.updatedAt?.toDate(),
            scheduledDate: request.scheduledDate?.toDate()
          });
        }
      });

      return requests;
    } catch (error) {
      console.error('Error searching requests:', error);
      throw error;
    }
  }

  // Get requests by subject
  static async getRequestsBySubject(subject, limitCount = 20) {
    try {
      const requestsRef = collection(db, 'requests');
      const q = query(
        requestsRef,
        where('subject', '==', subject),
        where('status', 'in', ['open', 'active']),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const requests = [];

      querySnapshot.forEach((doc) => {
        requests.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
          scheduledDate: doc.data().scheduledDate?.toDate()
        });
      });

      return requests;
    } catch (error) {
      console.error('Error getting requests by subject:', error);
      throw error;
    }
  }

  // Get user statistics
  static async getUserRequestStats(userId) {
    try {
      const requestsRef = collection(db, 'requests');
      const userRequestsQuery = query(
        requestsRef,
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(userRequestsQuery);
      const stats = {
        total: 0,
        draft: 0,
        active: 0,
        completed: 0,
        cancelled: 0,
        archived: 0
      };

      snapshot.forEach((doc) => {
        const status = doc.data().status;
        stats.total++;
        if (stats[status] !== undefined) {
          stats[status]++;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting user request stats:', error);
      throw error;
    }
  }
}
// src/firebase/collections/messages.js
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
  arrayRemove
} from 'firebase/firestore';
import { db } from '@/config/firebase';

// Message types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
  VOICE: 'voice',
  SYSTEM: 'system'
};

// Message status
export const MESSAGE_STATUS = {
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed'
};

// Message template
export const MESSAGE_TEMPLATE = {
  text: "",
  type: MESSAGE_TYPES.TEXT,
  userId: "",
  userName: "",
  userAvatar: "",
  groupId: "",
  fileUrl: "",
  fileName: "",
  fileSize: 0,
  status: MESSAGE_STATUS.SENT,
  reactions: {},
  edited: false,
  editedAt: null,
  replyTo: null,
  timestamp: null
};

// Messages Collection Service
export class MessagesService {

  // Send message
  static async sendMessage(groupId, messageData) {
    try {
      const messagesRef = collection(db, 'groups', groupId, 'messages');

      const newMessage = {
        ...MESSAGE_TEMPLATE,
        ...messageData,
        groupId,
        timestamp: serverTimestamp()
      };

      const docRef = await addDoc(messagesRef, newMessage);
      return { id: docRef.id, ...newMessage };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Listen to messages (real-time)
  static subscribeToMessages(groupId, callback, errorCallback = null) {
    try {
      const messagesRef = collection(db, 'groups', groupId, 'messages');
      const messagesQuery = query(
        messagesRef,
        orderBy('timestamp', 'asc'),
        limit(100)
      );

      return onSnapshot(
        messagesQuery,
        (snapshot) => {
          const messages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate() || new Date()
          }));
          callback(messages);
        },
        (error) => {
          console.error('Error listening to messages:', error);
          if (errorCallback) errorCallback(error);
        }
      );
    } catch (error) {
      console.error('Error setting up message listener:', error);
      if (errorCallback) errorCallback(error);
    }
  }

  // Get messages (for pagination)
  static async getMessages(groupId, limitCount = 50, lastMessage = null) {
    try {
      const messagesRef = collection(db, 'groups', groupId, 'messages');
      let messagesQuery = query(
        messagesRef,
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      // If lastMessage provided, start after it (for pagination)
      if (lastMessage) {
        messagesQuery = query(
          messagesRef,
          orderBy('timestamp', 'desc'),
          startAfter(lastMessage.timestamp),
          limit(limitCount)
        );
      }

      const querySnapshot = await getDocs(messagesQuery);
      const messages = [];

      querySnapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate()
        });
      });

      // Reverse to get chronological order
      return messages.reverse();
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  }

  // Update message status
  static async updateMessageStatus(groupId, messageId, status) {
    try {
      const messageRef = doc(db, 'groups', groupId, 'messages', messageId);
      await updateDoc(messageRef, {
        status,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating message status:', error);
      throw error;
    }
  }

  // Edit message
  static async editMessage(groupId, messageId, newText) {
    try {
      const messageRef = doc(db, 'groups', groupId, 'messages', messageId);
      await updateDoc(messageRef, {
        text: newText,
        edited: true,
        editedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }

  // Delete message
  static async deleteMessage(groupId, messageId) {
    try {
      const messageRef = doc(db, 'groups', groupId, 'messages', messageId);
      await deleteDoc(messageRef);
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  // Add reaction to message
  static async addReaction(groupId, messageId, userId, emoji) {
    try {
      const messageRef = doc(db, 'groups', groupId, 'messages', messageId);
      await updateDoc(messageRef, {
        [`reactions.${emoji}`]: arrayUnion(userId)
      });
      return true;
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  }

  // Remove reaction from message
  static async removeReaction(groupId, messageId, userId, emoji) {
    try {
      const messageRef = doc(db, 'groups', groupId, 'messages', messageId);
      await updateDoc(messageRef, {
        [`reactions.${emoji}`]: arrayRemove(userId)
      });
      return true;
    } catch (error) {
      console.error('Error removing reaction:', error);
      throw error;
    }
  }

  // Search messages in group
  static async searchMessages(groupId, searchTerm) {
    try {
      const messagesRef = collection(db, 'groups', groupId, 'messages');
      const querySnapshot = await getDocs(messagesRef);

      const messages = [];
      querySnapshot.forEach((doc) => {
        const message = { id: doc.id, ...doc.data() };

        // Simple text search
        if (message.text && message.text.toLowerCase().includes(searchTerm.toLowerCase())) {
          messages.push({
            ...message,
            timestamp: message.timestamp?.toDate()
          });
        }
      });

      // Sort by timestamp
      return messages.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error searching messages:', error);
      throw error;
    }
  }

  // Get message by ID
  static async getMessageById(groupId, messageId) {
    try {
      const messageRef = doc(db, 'groups', groupId, 'messages', messageId);
      const messageSnap = await getDoc(messageRef);

      if (messageSnap.exists()) {
        return {
          id: messageSnap.id,
          ...messageSnap.data(),
          timestamp: messageSnap.data().timestamp?.toDate()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting message:', error);
      throw error;
    }
  }

  // Send system message (like "User joined the group")
  static async sendSystemMessage(groupId, text) {
    try {
      const systemMessage = {
        text,
        type: MESSAGE_TYPES.SYSTEM,
        userId: 'system',
        userName: 'System',
        userAvatar: '',
        status: MESSAGE_STATUS.SENT
      };

      return await this.sendMessage(groupId, systemMessage);
    } catch (error) {
      console.error('Error sending system message:', error);
      throw error;
    }
  }

  // Get latest message in group (for group preview)
  static async getLatestMessage(groupId) {
    try {
      const messagesRef = collection(db, 'groups', groupId, 'messages');
      const messagesQuery = query(
        messagesRef,
        orderBy('timestamp', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(messagesQuery);

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate()
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting latest message:', error);
      throw error;
    }
  }
}
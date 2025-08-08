import { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../config/firebase';
import {
  ConnectionsService,
  CONNECTION_TYPES,
  CONNECTION_STATUS
} from '../firebase/collections/connectionsCollection';

// Hook for managing connections
export const useConnections = () => {
  const [user] = useAuthState(auth);
  const [connections, setConnections] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load user's connections
  const loadConnections = async (status = CONNECTION_STATUS.ACCEPTED) => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      setError(null);
      const userConnections = await ConnectionsService.getUserConnections(user.uid, status);
      setConnections(userConnections);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Load pending requests
  const loadPendingRequests = async () => {
    if (!user?.uid) return;

    try {
      const requests = await ConnectionsService.getPendingRequests(user.uid);
      setPendingRequests(requests);
    } catch (err) {
      setError(err);
    }
  };

  // Send connection request
  const sendConnectionRequest = async (targetUserId, connectionType, message = '') => {
    if (!user?.uid) return;

    try {
      const connectionData = {
        userId: user.uid,
        targetUserId,
        connectionType,
        message
      };

      const newConnection = await ConnectionsService.createConnection(connectionData);
      return newConnection;
    } catch (err) {
      setError(err);
      throw err;
    }
  };

  // Accept connection request
  const acceptConnection = async (connectionId) => {
    try {
      await ConnectionsService.acceptConnection(connectionId);
      setPendingRequests(prev => prev.filter(req => req.id !== connectionId));
      await loadConnections(); // Refresh connections
    } catch (err) {
      setError(err);
      throw err;
    }
  };

  // Reject connection request
  const rejectConnection = async (connectionId) => {
    try {
      await ConnectionsService.rejectConnection(connectionId);
      setPendingRequests(prev => prev.filter(req => req.id !== connectionId));
    } catch (err) {
      setError(err);
      throw err;
    }
  };

  // Cancel connection request
  const cancelConnection = async (connectionId) => {
    try {
      await ConnectionsService.cancelConnection(connectionId);
      setConnections(prev => prev.filter(conn => conn.id !== connectionId));
    } catch (err) {
      setError(err);
      throw err;
    }
  };

  // Remove connection
  const removeConnection = async (connectionId) => {
    try {
      await ConnectionsService.removeConnection(connectionId);
      setConnections(prev => prev.filter(conn => conn.id !== connectionId));
    } catch (err) {
      setError(err);
      throw err;
    }
  };

  // Check if connection exists
  const checkConnectionExists = async (targetUserId, connectionType = null) => {
    if (!user?.uid) return false;

    try {
      const exists = await ConnectionsService.checkConnectionExists(user.uid, targetUserId, connectionType);
      return exists;
    } catch (err) {
      setError(err);
      return false;
    }
  };

  // Block user
  const blockUser = async (targetUserId, reason = '') => {
    if (!user?.uid) return;

    try {
      await ConnectionsService.blockUser(user.uid, targetUserId, reason);
      // Refresh connections to reflect the block
      await loadConnections();
    } catch (err) {
      setError(err);
      throw err;
    }
  };

  // Unblock user
  const unblockUser = async (targetUserId) => {
    if (!user?.uid) return;

    try {
      await ConnectionsService.unblockUser(user.uid, targetUserId);
      // Refresh connections to reflect the unblock
      await loadConnections();
    } catch (err) {
      setError(err);
      throw err;
    }
  };

  return {
    connections,
    pendingRequests,
    loading,
    error,
    loadConnections,
    loadPendingRequests,
    sendConnectionRequest,
    acceptConnection,
    rejectConnection,
    cancelConnection,
    removeConnection,
    checkConnectionExists,
    blockUser,
    unblockUser
  };
};

// Hook for managing connections by type
export const useConnectionsByType = (connectionType) => {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadConnectionsByType = async () => {
    try {
      setLoading(true);
      setError(null);
      const typeConnections = await ConnectionsService.getConnectionsByType(connectionType);
      setConnections(typeConnections);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return {
    connections,
    loading,
    error,
    loadConnectionsByType
  };
};

// Convenience hooks for specific connection types
export const useFriends = () => useConnectionsByType(CONNECTION_TYPES.FRIEND);
export const useFollowers = () => useConnectionsByType(CONNECTION_TYPES.FOLLOW);
export const useMentors = () => useConnectionsByType(CONNECTION_TYPES.MENTOR);
export const useMentees = () => useConnectionsByType(CONNECTION_TYPES.MENTEE);
export const useBlockedUsers = () => useConnectionsByType(CONNECTION_TYPES.BLOCK);


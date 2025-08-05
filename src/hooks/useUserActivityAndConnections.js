// src/hooks/useUserActivity.js
import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/config/firebase';
import { UserActivityService, ACTIVITY_TYPES } from '@/firebase/collections/userActivityAndConnections.js';

// Hook for managing user activities
export const useUserActivity = () => {
  const [user] = useAuthState(auth);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load user's activities
  const loadActivities = async (limitCount = 50) => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      setError(null);
      const userActivities = await UserActivityService.getUserActivities(user.uid, limitCount);
      setActivities(userActivities);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Create new activity
  const createActivity = async (activityType, description, metadata = {}, isPublic = false) => {
    if (!user?.uid) return;

    try {
      const activityData = {
        userId: user.uid,
        activityType,
        description,
        metadata,
        isPublic
      };

      const newActivity = await UserActivityService.createActivity(activityData);
      setActivities(prev => [newActivity, ...prev]);
      return newActivity;
    } catch (err) {
      setError(err);
      throw err;
    }
  };

  // Delete activity
  const deleteActivity = async (activityId) => {
    try {
      await UserActivityService.deleteActivity(activityId);
      setActivities(prev => prev.filter(activity => activity.id !== activityId));
    } catch (err) {
      setError(err);
      throw err;
    }
  };

  // Update activity visibility
  const updateActivityVisibility = async (activityId, isPublic) => {
    try {
      await UserActivityService.updateActivityVisibility(activityId, isPublic);
      setActivities(prev =>
        prev.map(activity =>
          activity.id === activityId ? { ...activity, isPublic } : activity
        )
      );
    } catch (err) {
      setError(err);
      throw err;
    }
  };

  // Load activities on component mount
  useEffect(() => {
    if (user?.uid) {
      loadActivities();
    }
  }, [user?.uid]);

  return {
    activities,
    loading,
    error,
    loadActivities,
    createActivity,
    deleteActivity,
    updateActivityVisibility
  };
};

// Hook for activity feed (public activities)
export const useActivityFeed = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadPublicActivities = async (limitCount = 20) => {
    try {
      setLoading(true);
      setError(null);
      const publicActivities = await UserActivityService.getPublicActivities(limitCount);
      setActivities(publicActivities);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPublicActivities();
  }, []);

  return {
    activities,
    loading,
    error,
    loadPublicActivities
  };
};

// Hook for activity tracking helpers
export const useActivityTracker = () => {
  const { createActivity } = useUserActivity();

  // Helper functions for common activities
  const trackLogin = () => createActivity(
    ACTIVITY_TYPES.LOGIN,
    'User logged in',
    {},
    false
  );

  const trackProfileUpdate = (fields) => createActivity(
    ACTIVITY_TYPES.PROFILE_UPDATE,
    'Updated profile',
    { fields },
    true
  );

  const trackSkillAdded = (skill) => createActivity(
    ACTIVITY_TYPES.SKILL_ADDED,
    `Added skill: ${skill}`,
    { skill },
    true
  );

  const trackSkillRemoved = (skill) => createActivity(
    ACTIVITY_TYPES.SKILL_REMOVED,
    `Removed skill: ${skill}`,
    { skill },
    false
  );

  const trackConnectionMade = (targetUserId, connectionType) => createActivity(
    ACTIVITY_TYPES.CONNECTION_MADE,
    `Made a new ${connectionType} connection`,
    { targetUserId, connectionType },
    true
  );

  const trackSessionBooked = (sessionId, mentorId) => createActivity(
    ACTIVITY_TYPES.SESSION_BOOKED,
    'Booked a session',
    { sessionId, mentorId },
    false
  );

  const trackSessionCompleted = (sessionId, mentorId) => createActivity(
    ACTIVITY_TYPES.SESSION_COMPLETED,
    'Completed a session',
    { sessionId, mentorId },
    true
  );

  const trackRatingGiven = (targetUserId, rating) => createActivity(
    ACTIVITY_TYPES.RATING_GIVEN,
    `Gave a ${rating}-star rating`,
    { targetUserId, rating },
    false
  );

  const trackRatingReceived = (fromUserId, rating) => createActivity(
    ACTIVITY_TYPES.RATING_RECEIVED,
    `Received a ${rating}-star rating`,
    { fromUserId, rating },
    true
  );

  return {
    trackLogin,
    trackProfileUpdate,
    trackSkillAdded,
    trackSkillRemoved,
    trackConnectionMade,
    trackSessionBooked,
    trackSessionCompleted,
    trackRatingGiven,
    trackRatingReceived
  };
};

// src/hooks/useConnections.js
import { useState, useEffect } from 'react';
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
    if (!user?.uid) return null;

    try {
      return await ConnectionsService.checkConnectionExists(user.uid, targetUserId, connectionType);
    } catch (err) {
      setError(err);
      return null;
    }
  };

  // Block user
  const blockUser = async (targetUserId, reason = '') => {
    if (!user?.uid) return;

    try {
      const result = await ConnectionsService.blockUser(user.uid, targetUserId, reason);
      await loadConnections(); // Refresh connections
      return result;
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
      await loadConnections(); // Refresh connections
    } catch (err) {
      setError(err);
      throw err;
    }
  };

  // Load data on component mount
  useEffect(() => {
    if (user?.uid) {
      loadConnections();
      loadPendingRequests();
    }
  }, [user?.uid]);

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

// Hook for specific connection types
export const useConnectionsByType = (connectionType) => {
  const [user] = useAuthState(auth);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadConnectionsByType = async () => {
    if (!user?.uid || !connectionType) return;

    try {
      setLoading(true);
      setError(null);
      const typeConnections = await ConnectionsService.getConnectionsByType(user.uid, connectionType);
      setConnections(typeConnections);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.uid && connectionType) {
      loadConnectionsByType();
    }
  }, [user?.uid, connectionType]);

  return {
    connections,
    loading,
    error,
    reload: loadConnectionsByType
  };
};

// Specific hooks for common connection types
export const useFriends = () => useConnectionsByType(CONNECTION_TYPES.FRIEND);
export const useFollowers = () => useConnectionsByType(CONNECTION_TYPES.FOLLOW);
export const useMentors = () => useConnectionsByType(CONNECTION_TYPES.MENTOR);
export const useMentees = () => useConnectionsByType(CONNECTION_TYPES.MENTEE);
export const useBlockedUsers = () => useConnectionsByType(CONNECTION_TYPES.BLOCK);
import { useState } from 'react';
import { UserActivityService } from '../firebase/collections/userActivityAndConnections';

// Hook for managing user activities
export const useUserActivity = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadActivities = async (limitCount = 50) => {
    try {
      setLoading(true);
      setError(null);
      const userActivities = await UserActivityService.getUserActivities(limitCount);
      setActivities(userActivities);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const createActivity = async (activityType, description, metadata = {}, isPublic = false) => {
    try {
      const newActivity = await UserActivityService.createActivity(activityType, description, metadata, isPublic);
      setActivities(prev => [newActivity, ...prev]);
      return newActivity;
    } catch (err) {
      setError(err);
      throw err;
    }
  };

  const deleteActivity = async (activityId) => {
    try {
      await UserActivityService.deleteActivity(activityId);
      setActivities(prev => prev.filter(activity => activity.id !== activityId));
    } catch (err) {
      setError(err);
      throw err;
    }
  };

  const updateActivityVisibility = async (activityId, isPublic) => {
    try {
      await UserActivityService.updateActivityVisibility(activityId, isPublic);
      setActivities(prev => prev.map(activity => 
        activity.id === activityId ? { ...activity, isPublic } : activity
      ));
    } catch (err) {
      setError(err);
      throw err;
    }
  };

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

// Hook for managing activity feed
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

  return {
    activities,
    loading,
    error,
    loadPublicActivities
  };
};

// Hook for activity tracking
export const useActivityTracker = () => {
  const { createActivity } = useUserActivity();

  const trackLogin = () => createActivity(
    'login',
    'User logged in',
    { timestamp: new Date() },
    false
  );

  const trackProfileUpdate = (fields) => createActivity(
    'profile_update',
    'Profile updated',
    { updatedFields: fields },
    false
  );

  const trackSkillAdded = (skill) => createActivity(
    'skill_added',
    `Added skill: ${skill}`,
    { skill },
    true
  );

  const trackSkillRemoved = (skill) => createActivity(
    'skill_removed',
    `Removed skill: ${skill}`,
    { skill },
    true
  );

  const trackConnectionMade = (targetUserId, connectionType) => createActivity(
    'connection_made',
    `Made ${connectionType} connection`,
    { targetUserId, connectionType },
    true
  );

  const trackSessionBooked = (sessionId, mentorId) => createActivity(
    'session_booked',
    'Booked a learning session',
    { sessionId, mentorId },
    true
  );

  const trackSessionCompleted = (sessionId, mentorId) => createActivity(
    'session_completed',
    'Completed a learning session',
    { sessionId, mentorId },
    true
  );

  const trackRatingGiven = (targetUserId, rating) => createActivity(
    'rating_given',
    `Gave ${rating} star rating`,
    { targetUserId, rating },
    false
  );

  const trackRatingReceived = (fromUserId, rating) => createActivity(
    'rating_received',
    `Received ${rating} star rating`,
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


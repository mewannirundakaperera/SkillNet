// src/hooks/useUser.js
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth'; // ✅ FIXED: Use consistent auth hook
import { UserCollectionService } from '@services/user.js';

// Hook for managing current user data
export const useCurrentUser = () => {
  // ✅ FIXED: Use consistent auth hook instead of useAuthState
  const { user: authUser, loading: authLoading, isAuthenticated } = useAuth();
  const [userData, setUserData] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      // ✅ FIXED: Use authUser.id instead of authUser.uid
      if (authUser && authUser.id) {
        try {
          setUserLoading(true);
          setUserError(null);
          // ✅ FIXED: Pass authUser.id consistently
          const fetchedUserData = await UserCollectionService.getUserById(authUser.id);
          setUserData(fetchedUserData);
        } catch (err) {
          console.error('❌ Error fetching user data:', err);
          setUserError(err);
        } finally {
          setUserLoading(false);
        }
      } else {
        setUserData(null);
        setUserLoading(false);
      }
    };

    fetchUserData();
  }, [authUser]);

  const updateUser = async (updateData) => {
    // ✅ FIXED: Use authUser.id instead of authUser.uid
    if (!authUser?.id) {
      const error = new Error('User not authenticated');
      setUserError(error);
      return Promise.reject(error);
    }

    try {
      setUserError(null);
      // ✅ FIXED: Pass authUser.id consistently
      const updatedData = await UserCollectionService.updateUser(authUser.id, updateData);
      setUserData(prev => ({ ...prev, ...updatedData }));
      return updatedData;
    } catch (err) {
      console.error('❌ Error updating user:', err);
      setUserError(err);
      throw err;
    }
  };

  const addSkill = async (skill) => {
    // ✅ FIXED: Use authUser.id instead of authUser.uid
    if (!authUser?.id) {
      const error = new Error('User not authenticated');
      setUserError(error);
      return Promise.reject(error);
    }

    try {
      setUserError(null);
      // ✅ FIXED: Pass authUser.id consistently
      await UserCollectionService.addSkill(authUser.id, skill);
      setUserData(prev => ({
        ...prev,
        skills: [...(prev.skills || []), skill]
      }));
    } catch (err) {
      console.error('❌ Error adding skill:', err);
      setUserError(err);
      throw err;
    }
  };

  const removeSkill = async (skill) => {
    // ✅ FIXED: Use authUser.id instead of authUser.uid
    if (!authUser?.id) {
      const error = new Error('User not authenticated');
      setUserError(error);
      return Promise.reject(error);
    }

    try {
      setUserError(null);
      // ✅ FIXED: Pass authUser.id consistently
      await UserCollectionService.removeSkill(authUser.id, skill);
      setUserData(prev => ({
        ...prev,
        skills: prev.skills?.filter(s => s !== skill) || []
      }));
    } catch (err) {
      console.error('❌ Error removing skill:', err);
      setUserError(err);
      throw err;
    }
  };

  const addInterest = async (interest) => {
    // ✅ FIXED: Use authUser.id instead of authUser.uid
    if (!authUser?.id) {
      const error = new Error('User not authenticated');
      setUserError(error);
      return Promise.reject(error);
    }

    try {
      setUserError(null);
      // ✅ FIXED: Pass authUser.id consistently
      await UserCollectionService.addInterest(authUser.id, interest);
      setUserData(prev => ({
        ...prev,
        interests: [...(prev.interests || []), interest]
      }));
    } catch (err) {
      console.error('❌ Error adding interest:', err);
      setUserError(err);
      throw err;
    }
  };

  const updateStats = async (statsUpdate) => {
    // ✅ FIXED: Use authUser.id instead of authUser.uid
    if (!authUser?.id) {
      const error = new Error('User not authenticated');
      setUserError(error);
      return Promise.reject(error);
    }

    try {
      setUserError(null);
      // ✅ FIXED: Pass authUser.id consistently
      await UserCollectionService.updateStats(authUser.id, statsUpdate);
      setUserData(prev => ({
        ...prev,
        stats: { ...prev.stats, ...statsUpdate }
      }));
    } catch (err) {
      console.error('❌ Error updating stats:', err);
      setUserError(err);
      throw err;
    }
  };

  const markProfileComplete = async () => {
    // ✅ FIXED: Use authUser.id instead of authUser.uid
    if (!authUser?.id) {
      const error = new Error('User not authenticated');
      setUserError(error);
      return Promise.reject(error);
    }

    try {
      setUserError(null);
      // ✅ FIXED: Pass authUser.id consistently
      await UserCollectionService.markProfileComplete(authUser.id);
      setUserData(prev => ({ ...prev, profileComplete: true }));
    } catch (err) {
      console.error('❌ Error marking profile complete:', err);
      setUserError(err);
      throw err;
    }
  };

  return {
    authUser,
    userData,
    loading: authLoading || userLoading,
    error: userError,
    isAuthenticated,
    updateUser,
    addSkill,
    removeSkill,
    addInterest,
    updateStats,
    markProfileComplete
  };
};

// Hook for fetching any user's public profile
export const usePublicProfile = (userId) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const fetchedProfile = await UserCollectionService.getPublicProfile(userId);
        setProfile(fetchedProfile);
      } catch (err) {
        console.error('❌ Error fetching public profile:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  return { profile, loading, error };
};

// Hook for searching users
export const useUserSearch = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchBySkills = async (skills) => {
    try {
      setLoading(true);
      setError(null);
      const searchResults = await UserCollectionService.searchUsersBySkills(skills);
      setResults(searchResults);
      return searchResults;
    } catch (err) {
      console.error('❌ Error searching by skills:', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const searchByInterests = async (interests) => {
    try {
      setLoading(true);
      setError(null);
      const searchResults = await UserCollectionService.searchUsersByInterests(interests);
      setResults(searchResults);
      return searchResults;
    } catch (err) {
      console.error('❌ Error searching by interests:', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const searchByLocation = async (location) => {
    try {
      setLoading(true);
      setError(null);
      const searchResults = await UserCollectionService.searchUsersByLocation(location);
      setResults(searchResults);
      return searchResults;
    } catch (err) {
      console.error('❌ Error searching by location:', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getAllProfiles = async (limit) => {
    try {
      setLoading(true);
      setError(null);
      const profiles = await UserCollectionService.getAllPublicProfiles(limit);
      setResults(profiles);
      return profiles;
    } catch (err) {
      console.error('❌ Error getting all profiles:', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
    setError(null);
  };

  return {
    results,
    loading,
    error,
    searchBySkills,
    searchByInterests,
    searchByLocation,
    getAllProfiles,
    clearResults
  };
};

// Hook for user registration
export const useUserRegistration = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createUser = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      const newUser = await UserCollectionService.createUser(userData);
      return newUser;
    } catch (err) {
      console.error('❌ Error creating user:', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createUser,
    loading,
    error
  };
};
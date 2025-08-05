// src/hooks/useUser.js
import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/config/firebase';
import { UserCollectionService } from '@services/user.js';

// Hook for managing current user data
export const useCurrentUser = () => {
  const [user, loading, error] = useAuthState(auth);
  const [userData, setUserData] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user && user.uid) {
        try {
          setUserLoading(true);
          const fetchedUserData = await UserCollectionService.getUserById(user.uid);
          setUserData(fetchedUserData);
        } catch (err) {
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
  }, [user]);

  const updateUser = async (updateData) => {
    if (!user?.uid) return;

    try {
      const updatedData = await UserCollectionService.updateUser(user.uid, updateData);
      setUserData(prev => ({ ...prev, ...updatedData }));
      return updatedData;
    } catch (err) {
      setUserError(err);
      throw err;
    }
  };

  const addSkill = async (skill) => {
    if (!user?.uid) return;

    try {
      await UserCollectionService.addSkill(user.uid, skill);
      setUserData(prev => ({
        ...prev,
        skills: [...(prev.skills || []), skill]
      }));
    } catch (err) {
      setUserError(err);
      throw err;
    }
  };

  const removeSkill = async (skill) => {
    if (!user?.uid) return;

    try {
      await UserCollectionService.removeSkill(user.uid, skill);
      setUserData(prev => ({
        ...prev,
        skills: prev.skills?.filter(s => s !== skill) || []
      }));
    } catch (err) {
      setUserError(err);
      throw err;
    }
  };

  const addInterest = async (interest) => {
    if (!user?.uid) return;

    try {
      await UserCollectionService.addInterest(user.uid, interest);
      setUserData(prev => ({
        ...prev,
        interests: [...(prev.interests || []), interest]
      }));
    } catch (err) {
      setUserError(err);
      throw err;
    }
  };

  const updateStats = async (statsUpdate) => {
    if (!user?.uid) return;

    try {
      await UserCollectionService.updateStats(user.uid, statsUpdate);
      setUserData(prev => ({
        ...prev,
        stats: { ...prev.stats, ...statsUpdate }
      }));
    } catch (err) {
      setUserError(err);
      throw err;
    }
  };

  const markProfileComplete = async () => {
    if (!user?.uid) return;

    try {
      await UserCollectionService.markProfileComplete(user.uid);
      setUserData(prev => ({ ...prev, profileComplete: true }));
    } catch (err) {
      setUserError(err);
      throw err;
    }
  };

  return {
    authUser: user,
    userData,
    loading: loading || userLoading,
    error: error || userError,
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
        const fetchedProfile = await UserCollectionService.getPublicProfile(userId);
        setProfile(fetchedProfile);
      } catch (err) {
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
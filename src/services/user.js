import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment
} from 'firebase/firestore';
import { db } from '@/config/firebase'; // firebase config

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  USER_PROFILES: 'userProfiles'
};

// User data structure template
export const USER_TEMPLATE = {
  uid: "",
  email: "",
  displayName: "",
  bio: "",
  location: "",
  skills: [],
  interests: [],
  profileComplete: false,
  createdAt: null,
  updatedAt: null,
  settings: {
    emailNotifications: true,
    smsNotifications: false,
    desktopNotifications: true,
    marketingEmails: false,
    newsletter: false,
    profileVisibility: "public",
    shareUsageData: true,
    personalizedAds: false,
    twoFactorAuth: false,
    sessionTimeout: 30,
    language: "en",
    timezone: "UTC",
    currency: "LKR"
  },
  stats: {
    averageRating: 0,
    totalRatings: 0,
    upcomingSessions: 0,
    completedRequests: 0
  }
};

// Public profile template (for search functionality)
export const PUBLIC_PROFILE_TEMPLATE = {
  uid: "",
  displayName: "",
  bio: "",
  location: "",
  skills: [],
  interests: [],
  avatar: "",
  stats: {
    averageRating: 0,
    totalRatings: 0
  },
  createdAt: null,
  updatedAt: null
};

// User Collection Service Class
export class UserCollectionService {

  // Create a new user (called during registration)
  static async createUser(userData) {
    try {
      const userRef = doc(db, COLLECTIONS.USERS, userData.uid);
      const publicProfileRef = doc(db, COLLECTIONS.USER_PROFILES, userData.uid);

      const timestamp = serverTimestamp();

      const newUser = {
        ...USER_TEMPLATE,
        ...userData,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      const publicProfile = {
        ...PUBLIC_PROFILE_TEMPLATE,
        uid: userData.uid,
        displayName: userData.displayName || userData.name || "",
        bio: userData.bio || "",
        location: userData.location || "",
        skills: userData.skills || [],
        interests: userData.interests || [],
        avatar: userData.avatar || userData.photoURL || "",
        stats: {
          averageRating: 0,
          totalRatings: 0
        },
        createdAt: timestamp,
        updatedAt: timestamp
      };

      // Create both private and public profiles
      await setDoc(userRef, newUser);
      await setDoc(publicProfileRef, publicProfile);

      console.log('✅ User created successfully:', userData.uid);
      return newUser;
    } catch (error) {
      console.error('❌ Error creating user:', error);
      throw error;
    }
  }

  // Get user by ID (private data - only user can access their own)
  static async getUserById(userId) {
    try {
      const userRef = doc(db, COLLECTIONS.USERS, userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        return { id: userSnap.id, ...userSnap.data() };
      } else {
        console.log('❌ User not found:', userId);
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting user:', error);
      throw error;
    }
  }

  // Get public profile by ID (anyone can access for search)
  static async getPublicProfile(userId) {
    try {
      const profileRef = doc(db, COLLECTIONS.USER_PROFILES, userId);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        return { id: profileSnap.id, ...profileSnap.data() };
      } else {
        console.log('❌ Public profile not found:', userId);
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting public profile:', error);
      throw error;
    }
  }

  // Update user profile (updates both collections)
  static async updateUser(userId, updateData) {
    try {
      const userRef = doc(db, COLLECTIONS.USERS, userId);
      const publicProfileRef = doc(db, COLLECTIONS.USER_PROFILES, userId);

      const timestamp = serverTimestamp();

      const userUpdateData = {
        ...updateData,
        updatedAt: timestamp
      };

      // Update private profile
      await updateDoc(userRef, userUpdateData);
      console.log('✅ Private profile updated:', userId);

      // Update public profile with relevant fields only
      const publicFields = {
        updatedAt: timestamp
      };

      if (updateData.displayName !== undefined) publicFields.displayName = updateData.displayName;
      if (updateData.bio !== undefined) publicFields.bio = updateData.bio;
      if (updateData.location !== undefined) publicFields.location = updateData.location;
      if (updateData.skills !== undefined) publicFields.skills = updateData.skills;
      if (updateData.interests !== undefined) publicFields.interests = updateData.interests;
      if (updateData.avatar !== undefined) publicFields.avatar = updateData.avatar;
      if (updateData.photoURL !== undefined) publicFields.avatar = updateData.photoURL; // Map photoURL to avatar

      if (Object.keys(publicFields).length > 1) { // More than just updatedAt
        await updateDoc(publicProfileRef, publicFields);
        console.log('✅ Public profile updated:', userId);
      }

      return userUpdateData;
    } catch (error) {
      console.error('❌ Error updating user:', error);
      throw error;
    }
  }

  // Add skill to user
  static async addSkill(userId, skill) {
    try {
      const userRef = doc(db, COLLECTIONS.USERS, userId);
      const publicProfileRef = doc(db, COLLECTIONS.USER_PROFILES, userId);

      await updateDoc(userRef, {
        skills: arrayUnion(skill),
        updatedAt: serverTimestamp()
      });

      await updateDoc(publicProfileRef, {
        skills: arrayUnion(skill),
        updatedAt: serverTimestamp()
      });

      console.log('✅ Skill added:', skill);
      return true;
    } catch (error) {
      console.error('❌ Error adding skill:', error);
      throw error;
    }
  }

  // Remove skill from user
  static async removeSkill(userId, skill) {
    try {
      const userRef = doc(db, COLLECTIONS.USERS, userId);
      const publicProfileRef = doc(db, COLLECTIONS.USER_PROFILES, userId);

      await updateDoc(userRef, {
        skills: arrayRemove(skill),
        updatedAt: serverTimestamp()
      });

      await updateDoc(publicProfileRef, {
        skills: arrayRemove(skill),
        updatedAt: serverTimestamp()
      });

      console.log('✅ Skill removed:', skill);
      return true;
    } catch (error) {
      console.error('❌ Error removing skill:', error);
      throw error;
    }
  }

  // Add interest to user
  static async addInterest(userId, interest) {
    try {
      const userRef = doc(db, COLLECTIONS.USERS, userId);
      const publicProfileRef = doc(db, COLLECTIONS.USER_PROFILES, userId);

      await updateDoc(userRef, {
        interests: arrayUnion(interest),
        updatedAt: serverTimestamp()
      });

      await updateDoc(publicProfileRef, {
        interests: arrayUnion(interest),
        updatedAt: serverTimestamp()
      });

      console.log('✅ Interest added:', interest);
      return true;
    } catch (error) {
      console.error('❌ Error adding interest:', error);
      throw error;
    }
  }

  // Remove interest from user
  static async removeInterest(userId, interest) {
    try {
      const userRef = doc(db, COLLECTIONS.USERS, userId);
      const publicProfileRef = doc(db, COLLECTIONS.USER_PROFILES, userId);

      await updateDoc(userRef, {
        interests: arrayRemove(interest),
        updatedAt: serverTimestamp()
      });

      await updateDoc(publicProfileRef, {
        interests: arrayRemove(interest),
        updatedAt: serverTimestamp()
      });

      console.log('✅ Interest removed:', interest);
      return true;
    } catch (error) {
      console.error('❌ Error removing interest:', error);
      throw error;
    }
  }

  // Update user stats (private collection only)
  static async updateStats(userId, statsUpdate) {
    try {
      const userRef = doc(db, COLLECTIONS.USERS, userId);
      const publicProfileRef = doc(db, COLLECTIONS.USER_PROFILES, userId);

      const updateData = {
        stats: statsUpdate,
        updatedAt: serverTimestamp()
      };

      await updateDoc(userRef, updateData);

      // Only update public stats (rating-related)
      const publicStatsUpdate = {};
      if (statsUpdate.averageRating !== undefined) {
        publicStatsUpdate['stats.averageRating'] = statsUpdate.averageRating;
      }
      if (statsUpdate.totalRatings !== undefined) {
        publicStatsUpdate['stats.totalRatings'] = statsUpdate.totalRatings;
      }

      if (Object.keys(publicStatsUpdate).length > 0) {
        await updateDoc(publicProfileRef, {
          ...publicStatsUpdate,
          updatedAt: serverTimestamp()
        });
      }

      console.log('✅ Stats updated:', userId);
      return true;
    } catch (error) {
      console.error('❌ Error updating stats:', error);
      throw error;
    }
  }

  // Search users by skills (searches public profiles)
  static async searchUsersBySkills(skills) {
    try {
      const profilesRef = collection(db, COLLECTIONS.USER_PROFILES);
      const q = query(
        profilesRef,
        where('skills', 'array-contains-any', skills)
      );

      const querySnapshot = await getDocs(q);
      const users = [];

      querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });

      console.log(`✅ Found ${users.length} users with skills:`, skills);
      return users;
    } catch (error) {
      console.error('❌ Error searching users by skills:', error);
      throw error;
    }
  }

  // Search users by interests (searches public profiles)
  static async searchUsersByInterests(interests) {
    try {
      const profilesRef = collection(db, COLLECTIONS.USER_PROFILES);
      const q = query(
        profilesRef,
        where('interests', 'array-contains-any', interests)
      );

      const querySnapshot = await getDocs(q);
      const users = [];

      querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });

      console.log(`✅ Found ${users.length} users with interests:`, interests);
      return users;
    } catch (error) {
      console.error('❌ Error searching users by interests:', error);
      throw error;
    }
  }

  // Search users by location (searches public profiles)
  static async searchUsersByLocation(location) {
    try {
      const profilesRef = collection(db, COLLECTIONS.USER_PROFILES);
      const q = query(
        profilesRef,
        where('location', '==', location)
      );

      const querySnapshot = await getDocs(q);
      const users = [];

      querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });

      console.log(`✅ Found ${users.length} users in location:`, location);
      return users;
    } catch (error) {
      console.error('❌ Error searching users by location:', error);
      throw error;
    }
  }

  // Get all public profiles (for browse functionality)
  static async getAllPublicProfiles(limitCount = 20) {
    try {
      const profilesRef = collection(db, COLLECTIONS.USER_PROFILES);
      let q = query(profilesRef);

      if (limitCount) {
        q = query(profilesRef, limit(limitCount));
      }

      const querySnapshot = await getDocs(q);
      const profiles = [];

      querySnapshot.forEach((doc) => {
        profiles.push({ id: doc.id, ...doc.data() });
      });

      console.log(`✅ Retrieved ${profiles.length} public profiles`);
      return profiles;
    } catch (error) {
      console.error('❌ Error getting all public profiles:', error);
      throw error;
    }
  }

  // Mark profile as complete
  static async markProfileComplete(userId) {
    try {
      const userRef = doc(db, COLLECTIONS.USERS, userId);

      await updateDoc(userRef, {
        profileComplete: true,
        updatedAt: serverTimestamp()
      });

      console.log('✅ Profile marked as complete:', userId);
      return true;
    } catch (error) {
      console.error('❌ Error marking profile complete:', error);
      throw error;
    }
  }

  // Check if userProfiles collection exists and is populated
  static async checkUserProfilesCollection() {
    try {
      const profilesRef = collection(db, COLLECTIONS.USER_PROFILES);
      const snapshot = await getDocs(query(profilesRef, limit(1)));

      const exists = !snapshot.empty;
      console.log(exists ? '✅ userProfiles collection exists' : '❌ userProfiles collection is empty');

      return exists;
    } catch (error) {
      console.error('❌ Error checking userProfiles collection:', error);
      return false;
    }
  }
}
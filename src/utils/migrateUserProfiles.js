// File: src/utils/migrateUserProfiles.js
// Run this script ONCE to create the userProfiles collection from existing users

import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

export const migrateUsersToUserProfiles = async () => {
  try {
    console.log('🚀 Starting migration of users to userProfiles...');

    // Get all users from the users collection
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);

    let migratedCount = 0;
    let errorCount = 0;

    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data();
        const userId = userDoc.id;

        // Create public profile data (only safe-to-share fields)
        const publicProfile = {
          uid: userId,
          displayName: userData.displayName || userData.name || 'User',
          bio: userData.bio || '',
          location: userData.location || '',
          skills: userData.skills || [],
          interests: userData.interests || [],
          avatar: userData.avatar || userData.photoURL || '',
          stats: {
            averageRating: userData.stats?.averageRating || 0,
            totalRatings: userData.stats?.totalRatings || 0
          },
          createdAt: userData.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Create the public profile document
        const publicProfileRef = doc(db, 'userProfiles', userId);
        await setDoc(publicProfileRef, publicProfile);

        migratedCount++;
        console.log(`✅ Migrated user: ${publicProfile.displayName} (${userId})`);

      } catch (error) {
        errorCount++;
        console.error(`❌ Error migrating user ${userDoc.id}:`, error);
      }
    }

    console.log('🎉 Migration completed!');
    console.log(`✅ Successfully migrated: ${migratedCount} users`);
    console.log(`❌ Errors: ${errorCount} users`);

    return {
      success: true,
      migratedCount,
      errorCount,
      message: `Migration completed. ${migratedCount} users migrated, ${errorCount} errors.`
    };

  } catch (error) {
    console.error('💥 Migration failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Optional: Function to run migration from browser console
// You can call this in your browser's console after importing
export const runMigrationInBrowser = () => {
  migrateUsersToUserProfiles()
    .then(result => {
      if (result.success) {
        alert(result.message);
      } else {
        alert(`Migration failed: ${result.error}`);
      }
    })
    .catch(error => {
      alert(`Migration error: ${error.message}`);
    });
};
// src/services/authService.js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/config/firebase';

// Sign up new user
export const signUp = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update the user's profile with display name
    await updateProfile(user, {
      displayName: displayName
    });

    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: email,
      displayName: displayName,
      createdAt: new Date().toISOString(),
      skills: [],
      interests: [],
      profileComplete: false
    });

    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Sign in existing user
export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Sign out user
export const signOutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get current user data from Firestore
export const getCurrentUserData = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { success: true, userData: userDoc.data() };
    } else {
      return { success: false, error: 'User data not found' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// New: Upload avatar and update user profile
export const uploadUserAvatar = async (userId, file) => {
  if (!file) throw new Error("No file provided");

  const avatarRef = ref(storage, `avatars/${userId}`);

  await uploadBytes(avatarRef, file);   // Wait for upload to finish

  const avatarUrl = await getDownloadURL(avatarRef);  // Get URL after upload

  const userRef = doc(db, "users", userId);

  await updateDoc(userRef, { avatar: avatarUrl });  // Update Firestore with avatar URL

  const user = auth.currentUser;
  if (user && user.uid === userId) {
    await updateProfile(user, { photoURL: avatarUrl });  // Update auth profile photoURL
  }

  return avatarUrl;
};


// Auth state listener
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Check if user is authenticated
export const getCurrentUser = () => {
  return auth.currentUser;
};
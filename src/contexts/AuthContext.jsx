import React, { createContext, useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from "@/config/firebase.js";

// Authentication Context
export const AuthContext = createContext();

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false); // ✅ ADDED: Authentication flag

  useEffect(() => {
    console.log('🔄 Setting up auth state listener...');

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        console.log('🔄 Auth state changed:', firebaseUser ? 'User logged in' : 'User logged out');

        if (firebaseUser) {
          const token = await firebaseUser.getIdToken();
          const userData = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
            displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
            email: firebaseUser.email,
            avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${firebaseUser.email}&background=3b82f6&color=fff`,
            photoURL: firebaseUser.photoURL,
            token: token
          };

          setUser(userData);
          setIsAuthenticated(true); // ✅ ADDED: Set authenticated state
          localStorage.setItem('userToken', token);
          localStorage.setItem('userData', JSON.stringify(userData));

          console.log('✅ User data set successfully');
        } else {
          // ✅ IMPROVED: Clear all state when user is null
          setUser(null);
          setIsAuthenticated(false);
          localStorage.removeItem('userToken');
          localStorage.removeItem('userData');
          localStorage.removeItem('user'); // Clear any other user data
          sessionStorage.clear(); // Clear session storage too

          console.log('✅ User state cleared');
        }
      } catch (error) {
        console.error('❌ Error in auth state change:', error);

        // ✅ IMPROVED: Clear all state on error
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('user');
        sessionStorage.clear();
      } finally {
        setLoading(false);
      }
    });

    // ✅ IMPORTANT: Return cleanup function
    return () => {
      console.log('🧹 Cleaning up auth listener');
      unsubscribe();
    };
  }, []);

  const login = (userData) => {
    console.log('🔑 Manual login called');
    setUser(userData);
    setIsAuthenticated(true); // ✅ ADDED: Set authenticated state
    localStorage.setItem('userToken', userData.token);
    localStorage.setItem('userData', JSON.stringify(userData));
  };

  // ✅ FIXED: Proper logout implementation
  const logout = async () => {
    try {
      console.log('🚪 Starting logout process...');

      // ✅ STEP 1: Clear local state immediately (optimistic update)
      setUser(null);
      setIsAuthenticated(false);

      // ✅ STEP 2: Clear all local storage
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('user');
      sessionStorage.clear();

      console.log('📝 Local state cleared');

      // ✅ STEP 3: Sign out from Firebase
      await signOut(auth);

      console.log('✅ Firebase logout successful');
      return { success: true, message: 'Logged out successfully' };

    } catch (error) {
      console.error('❌ Error signing out:', error);

      // ✅ IMPORTANT: Even if Firebase logout fails, ensure local state is cleared
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('user');
      sessionStorage.clear();

      // ✅ Don't throw error - logout should always succeed locally
      console.log('⚠️ Firebase logout failed, but local state cleared');
      return { success: false, message: 'Logout completed with errors' };
    }
  };

  // ✅ ADDED: Force logout function for emergency cases
  const forceLogout = () => {
    console.log('🆘 Force logout called');
    setUser(null);
    setIsAuthenticated(false);
    localStorage.clear();
    sessionStorage.clear();

    // Try to sign out from Firebase, but don't wait for it
    signOut(auth).catch(error => {
      console.error('Force logout - Firebase signOut failed:', error);
    });
  };

  const value = {
    user,
    loading,
    isAuthenticated, // ✅ ADDED: Export authentication flag
    login,
    logout,
    forceLogout // ✅ ADDED: Emergency logout function
  };

  return (
      <AuthContext.Provider value={value}>
        {children}
      </AuthContext.Provider>
  );
};
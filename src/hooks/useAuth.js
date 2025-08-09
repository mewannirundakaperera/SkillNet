// hooks/useAuth.js
import { useState, useEffect } from 'react';
import { onAuthStateChange, getCurrentUser } from '@/services/authService';
import { signOut } from 'firebase/auth';
import { auth } from '@/config/firebase'; // Make sure this path is correct

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setLoading(true);

    const unsubscribe = onAuthStateChange((authUser) => {
      console.log('🔄 Auth state changed:', authUser ? 'User logged in' : 'User logged out');

      if (authUser) {
        // User is signed in
        setUser({
          id: authUser.uid,
          email: authUser.email,
          name: authUser.displayName,
          photoURL: authUser.photoURL
        });
        setIsAuthenticated(true);
        console.log('✅ User authenticated');
      } else {
        // User is signed out
        setUser(null);
        setIsAuthenticated(false);
        console.log('❌ User not authenticated');
      }
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // ✅ ADDED: Logout function
  const logout = async () => {
    try {
      console.log('🚪 Starting logout process...');

      // Step 1: Clear local state immediately (optimistic update)
      setUser(null);
      setIsAuthenticated(false);

      // Step 2: Clear any local storage
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('user');
      sessionStorage.clear();

      console.log('📝 Local state and storage cleared');

      // Step 3: Sign out from Firebase
      await signOut(auth);

      console.log('✅ Firebase logout successful');
      return { success: true, message: 'Logged out successfully' };

    } catch (error) {
      console.error('❌ Error during logout:', error);

      // Even if Firebase logout fails, ensure local state is cleared
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('user');
      sessionStorage.clear();

      console.log('⚠️ Firebase logout failed, but local state cleared');
      return { success: false, message: 'Logout completed with errors', error };
    }
  };

  // ✅ ADDED: Force logout for emergency cases
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

  return {
    user,
    isAuthenticated,
    loading,
    logout,
    forceLogout
  };
};






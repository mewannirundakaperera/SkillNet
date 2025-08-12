// src/hooks/useAuth.js
import { useState, useEffect, useContext, createContext } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { getCurrentUserData } from '@/services/authService';

// Create Auth Context
const AuthContext = createContext();

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('🔄 Setting up auth state listener...');
    setLoading(true);
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        console.log('🔍 Auth state changed:', firebaseUser ? 'User found' : 'No user');
        setError(null);

        if (firebaseUser) {
          // User is signed in
          console.log('🔐 User authenticated:', firebaseUser.uid);

          const baseUser = {
            id: firebaseUser.uid, // Use 'id' for consistency across the app
            uid: firebaseUser.uid, // Keep uid for Firebase compatibility
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            name: firebaseUser.displayName, // Alias for displayName
            photoURL: firebaseUser.photoURL,
            emailVerified: firebaseUser.emailVerified,
            isAnonymous: firebaseUser.isAnonymous,
            metadata: firebaseUser.metadata
          };

          // Try to get additional user data from Firestore
          try {
            const userDataResult = await getCurrentUserData(firebaseUser.uid);

            if (userDataResult.success) {
              const completeUser = {
                ...baseUser,
                ...userDataResult.userData,
                // Ensure consistent naming for the request flow
                id: firebaseUser.uid,
                displayName: userDataResult.userData.displayName || firebaseUser.displayName || userDataResult.userData.name,
                name: userDataResult.userData.displayName || firebaseUser.displayName || userDataResult.userData.name,
                avatar: userDataResult.userData.avatar || firebaseUser.photoURL,
                // Additional fields for the request system
                userAvatar: userDataResult.userData.avatar || firebaseUser.photoURL,
                userName: userDataResult.userData.displayName || firebaseUser.displayName || userDataResult.userData.name,
                userEmail: firebaseUser.email
              };

              setUser(completeUser);
              setUserData(userDataResult.userData);
              console.log('✅ User data loaded successfully');
            } else {
              // Firestore data not available, use Firebase auth data only
              const fallbackUser = {
                ...baseUser,
                userAvatar: baseUser.photoURL,
                userName: baseUser.displayName || 'User',
                userEmail: baseUser.email
              };
              setUser(fallbackUser);
              setUserData(null);
              console.log('⚠️ Using Firebase auth data only');
            }
          } catch (firestoreError) {
            console.warn('Could not load user data from Firestore:', firestoreError);
            // Fall back to Firebase auth data
            const fallbackUser = {
              ...baseUser,
              userAvatar: baseUser.photoURL,
              userName: baseUser.displayName || 'User',
              userEmail: baseUser.email
            };
            setUser(fallbackUser);
            setUserData(null);
          }
        } else {
          // User is signed out
          console.log('🔓 User signed out');
          setUser(null);
          setUserData(null);
        }
      } catch (err) {
        console.error('Auth state change error:', err);
        setError(err.message);
        setUser(null);
        setUserData(null);
      } finally {
        console.log('✅ Auth state processing complete, setting loading to false');
        setLoading(false);
      }
    });

    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log('⏰ Auth timeout reached, forcing loading to false');
      setLoading(false);
    }, 10000); // 10 second timeout

    return () => {
      console.log('🧹 Cleaning up auth listener and timeout');
      clearTimeout(timeoutId);
      unsubscribe();
    };

    return unsubscribe;
  }, []);

  // Refresh user data (useful after profile updates)
  const refreshUserData = async () => {
    if (!user?.uid) return;

    try {
      console.log('🔄 Refreshing user data...');
      const userDataResult = await getCurrentUserData(user.uid);

      if (userDataResult.success) {
        const updatedUser = {
          ...user,
          ...userDataResult.userData,
          // Maintain consistent fields
          id: user.uid,
          displayName: userDataResult.userData.displayName || user.displayName,
          name: userDataResult.userData.displayName || user.displayName,
          avatar: userDataResult.userData.avatar || user.photoURL,
          userAvatar: userDataResult.userData.avatar || user.photoURL,
          userName: userDataResult.userData.displayName || user.displayName,
          userEmail: user.email
        };

        setUser(updatedUser);
        setUserData(userDataResult.userData);
        console.log('✅ User data refreshed');
      }
    } catch (err) {
      console.error('Error refreshing user data:', err);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      console.log('🚪 Starting logout process...');

      // Clear local state immediately (optimistic update)
      setUser(null);
      setUserData(null);

      // Clear all local storage
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('user');
      sessionStorage.clear();

      console.log('📝 Local state cleared');

      // Sign out from Firebase
      await signOut(auth);

      console.log('✅ Firebase logout successful');
      return { success: true, message: 'Logged out successfully' };

    } catch (error) {
      console.error('❌ Error signing out:', error);

      // Even if Firebase logout fails, ensure local state is cleared
      setUser(null);
      setUserData(null);
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('user');
      sessionStorage.clear();

      // Don't throw error - logout should always succeed locally
      console.log('⚠️ Firebase logout failed, but local state cleared');
      return { success: false, message: 'Logout completed with errors' };
    }
  };

  // Login function to set user data after successful authentication
  const login = (userData) => {
    try {
      console.log('🔐 Login function called with user data:', userData);
      
      // Set user data in context
      setUser(userData);
      setUserData(userData);
      
      // Store in localStorage for persistence
      localStorage.setItem('userToken', userData.token || '');
      localStorage.setItem('userData', JSON.stringify(userData));
      localStorage.setItem('user', JSON.stringify(userData));
      
      console.log('✅ User data set in context and localStorage');
      return { success: true, message: 'Login successful' };
    } catch (error) {
      console.error('❌ Error in login function:', error);
      return { success: false, message: 'Login failed' };
    }
  };

  // Force logout function for emergency cases
  const forceLogout = () => {
    console.log('🆘 Force logout called');
    setUser(null);
    setUserData(null);
    localStorage.clear();
    sessionStorage.clear();

    // Try to sign out from Firebase, but don't wait for it
    signOut(auth).catch(error => {
      console.error('Force logout - Firebase signOut failed:', error);
    });
  };

  const contextValue = {
    user,
    userData,
    loading,
    error,
    login,
    refreshUserData,
    logout,
    forceLogout,
    isAuthenticated: !!user,
    isEmailVerified: user?.emailVerified || false
  };

  return (
      <AuthContext.Provider value={contextValue}>
        {children}
      </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

// Additional utility hooks
export const useCurrentUser = () => {
  const { user } = useAuth();
  return user;
};

export const useIsAuthenticated = () => {
  const { isAuthenticated, loading } = useAuth();
  return { isAuthenticated, loading };
};

export const useUserData = () => {
  const { userData, refreshUserData } = useAuth();
  return { userData, refreshUserData };
};
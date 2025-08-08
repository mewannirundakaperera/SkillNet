// hooks/useAuth.js
import { useState, useEffect } from 'react';
import { onAuthStateChange, getCurrentUser } from '@/services/authService';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // ✅ Track loading state
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setLoading(true); // ✅ Set loading when starting auth check

    const unsubscribe = onAuthStateChange((authUser) => {
      if (authUser) {
        // User is signed in
        setUser({
          id: authUser.uid,
          email: authUser.email,
          name: authUser.displayName,
          photoURL: authUser.photoURL
        });
        setIsAuthenticated(true);
      } else {
        // User is signed out
        setUser(null);
        setIsAuthenticated(false);
      }
      setLoading(false); // ✅ Set loading to false after auth state is determined
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  return {
    user,
    isAuthenticated,
    loading // ✅ Expose loading state
  };
};







import React, { createContext, useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from "@/config/firebase.js";

// Authentication Context
export const AuthContext = createContext();

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
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
          localStorage.setItem('userToken', token);
          localStorage.setItem('userData', JSON.stringify(userData));
        } else {
          setUser(null);
          localStorage.removeItem('userToken');
          localStorage.removeItem('userData');
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        setUser(null);
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('userToken', userData.token);
    localStorage.setItem('userData', JSON.stringify(userData));
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      setUser(null);
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
    }
  };

  const value = {
    user,
    loading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

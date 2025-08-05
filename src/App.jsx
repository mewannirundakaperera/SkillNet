import React, { useState, useEffect, createContext, useContext } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from "@/config/firebase.js";

// Import your existing components
import SignUp from "./pages/Login and Signup/SignUp";
import Login from "./pages/Login and Signup/Login";
import HomePage from "./pages/Homepages/HomePage";
import StudentConnect from "./pages/Requests/StudentConnect";
import GroupRequests from "./pages/Requests/GroupRequests";
import OneToOneRequests from "./pages/Requests/OneToOneRequests";
import CreateRequest from "./pages/Requests/CreateRequest";
import RequestDetails from "./pages/Requests/RequestDetails";
import Profile from "./pages/Requests/Profile";
import RequestHistory from "./pages/Requests/RequestHistory";
import MyRequests from "./pages/Requests/MyRequests";
import Settings from "./pages/Settings";
import SelectTeacher from "./pages/Teach&learn/SelectTeacher";
import TimeSlotSelection from "./pages/Teach&learn/TimeSlotSelection";
import PaymentPage from "./pages/Teach&learn/PaymentPage";
import OnlineMeeting from "./pages/Teach&learn/OnlineMeeting";
import JoinGroup from "./pages/Group/JoinGroup";
import GroupChat from "./pages/Group/GroupChat";
import CreateGroup from "./pages/Group/CreateGroup";
import GroupsList from "./pages/Group/GroupsList";
import NewUserHomePage from "./pages/Homepages/NewUserHomePage";
import AllGroupRequests from "./pages/Group/AllGroupRequests";

// Import the updated layout system
import RequestLayout, { SimpleLayout, FullWidthLayout, ProfileLayout } from "@/components/Layouts/RequestLayout";

// Authentication Context
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider Component
const AuthProvider = ({ children }) => {
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
    login,
    logout,
    isAuthenticated: !!user,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public Route Component (redirect to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/" replace /> : children;
};

// 404 Not Found Component
const NotFound = () => {
  return (
    <SimpleLayout>
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-400">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mt-4">Page Not Found</h2>
          <p className="text-gray-600 mt-2">The page you're looking for doesn't exist.</p>
          <a
            href="/"
            className="mt-6 inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    </SimpleLayout>
  );
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

// Routes Component
const AppRoutes = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Root route - shows different content based on auth status */}
      <Route
        path="/"
        element={
          <SimpleLayout>
            <HomePage />
          </SimpleLayout>
        }
      />

      {/* Public routes (only accessible when NOT logged in) */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <SignUp />
          </PublicRoute>
        }
      />

      {/* Protected routes (only accessible when logged in) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <SimpleLayout>
              <HomePage />
            </SimpleLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/new-user"
        element={
          <ProtectedRoute>
            <SimpleLayout>
              <NewUserHomePage />
            </SimpleLayout>
          </ProtectedRoute>
        }
      />

      {/* Request Routes with RequestLayout (includes sidebar) */}
      <Route
        path="/StudentConnect"
        element={
          <ProtectedRoute>
            <RequestLayout title="Dashboard" subtitle="Manage your student-to-student class scheduling requests efficiently">
              <StudentConnect />
            </RequestLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/requests/group"
        element={
          <ProtectedRoute>
            <RequestLayout title="Group Requests" subtitle="Discover and join collaborative learning opportunities">
              <GroupRequests />
            </RequestLayout>
          </ProtectedRoute>
        }
      />

      {/* ===== CREATE REQUESTS SECTION ===== */}
      <Route
        path="/requests/create"
        element={
          <ProtectedRoute>
            <RequestLayout title="Create Request" subtitle="Share your learning goals and connect with others">
              <CreateRequest />
            </RequestLayout>
          </ProtectedRoute>
        }
      />

      {/* My Requests - All */}
      <Route
        path="/requests/my-requests"
        element={
          <ProtectedRoute>
            <RequestLayout title="My Requests" subtitle="Manage all your created requests">
              <MyRequests />
            </RequestLayout>
          </ProtectedRoute>
        }
      />

      {/* My Requests - Draft */}
      <Route
        path="/requests/my-requests/draft"
        element={
          <ProtectedRoute>
            <RequestLayout title="Draft Requests" subtitle="Requests you've started but haven't published yet">
              <MyRequests />
            </RequestLayout>
          </ProtectedRoute>
        }
      />

      {/* My Requests - Active */}
      <Route
        path="/requests/my-requests/active"
        element={
          <ProtectedRoute>
            <RequestLayout title="Active Requests" subtitle="Your currently published and ongoing requests">
              <MyRequests />
            </RequestLayout>
          </ProtectedRoute>
        }
      />

      {/* My Requests - Completed */}
      <Route
        path="/requests/my-requests/completed"
        element={
          <ProtectedRoute>
            <RequestLayout title="Completed Requests" subtitle="Successfully completed learning sessions">
              <MyRequests />
            </RequestLayout>
          </ProtectedRoute>
        }
      />

      {/* ===== RECEIVED REQUESTS SECTION ===== */}
      {/* Received Requests - All */}
      <Route
        path="/OneToOneRequests"
        element={
          <ProtectedRoute>
            <RequestLayout title="All Received Requests" subtitle="Browse and manage all requests from other users">
              <OneToOneRequests />
            </RequestLayout>
          </ProtectedRoute>
        }
      />

      {/* Received Requests - Pending */}
      <Route
        path="/OneToOneRequests/pending"
        element={
          <ProtectedRoute>
            <RequestLayout title="Pending Offers" subtitle="Requests waiting for your response">
              <OneToOneRequests />
            </RequestLayout>
          </ProtectedRoute>
        }
      />

      {/* Received Requests - Accepted */}
      <Route
        path="/OneToOneRequests/accepted"
        element={
          <ProtectedRoute>
            <RequestLayout title="Accepted Requests" subtitle="Requests you have accepted">
              <OneToOneRequests />
            </RequestLayout>
          </ProtectedRoute>
        }
      />

      {/* Received Requests - Archived */}
      <Route
        path="/OneToOneRequests/archived"
        element={
          <ProtectedRoute>
            <RequestLayout title="Archived Requests" subtitle="Completed and archived requests">
              <OneToOneRequests />
            </RequestLayout>
          </ProtectedRoute>
        }
      />

      {/* Request Details */}
      <Route
        path="/requests/details/:id?"
        element={
          <ProtectedRoute>
            <RequestLayout title="Request Details" subtitle="View and manage request information">
              <RequestDetails />
            </RequestLayout>
          </ProtectedRoute>
        }
      />

      {/* Request History */}
      <Route
        path="/RequestHistory"
        element={
          <ProtectedRoute>
            <RequestLayout title="Request History" subtitle="View your past and archived requests">
              <RequestHistory />
            </RequestLayout>
          </ProtectedRoute>
        }
      />

      {/* Profile Routes with ProfileLayout */}
      <Route
        path="/Profile"
        element={
          <ProtectedRoute>
            <ProfileLayout>
              <Profile />
            </ProfileLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile/:id?"
        element={
          <ProtectedRoute>
            <ProfileLayout>
              <Profile />
            </ProfileLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/Settings"
        element={
          <ProtectedRoute>
            <ProfileLayout>
              <Settings />
            </ProfileLayout>
          </ProtectedRoute>
        }
      />

      {/* ===========================================
          GROUP CHAT ROUTES - UPDATED
          =========================================== */}

      {/* Groups List Page - SIDEBAR LAYOUT */}
      <Route
        path="/groups"
        element={
          <ProtectedRoute>
            <FullWidthLayout>
              <GroupsList />
            </FullWidthLayout>
          </ProtectedRoute>
        }
      />

      {/* ✅ NEW: All Group Requests Page */}
      <Route
        path="/groups/requests"
        element={
          <ProtectedRoute>
            <SimpleLayout>
              <AllGroupRequests />
            </SimpleLayout>
          </ProtectedRoute>
        }
      />

      {/* Create Group Page */}
      <Route
        path="/groups/create"
        element={
          <ProtectedRoute>
            <SimpleLayout>
              <CreateGroup />
            </SimpleLayout>
          </ProtectedRoute>
        }
      />

      {/* Group Discovery/Browse - SIDEBAR LAYOUT */}
      <Route
        path="/groups/discover"
        element={
          <ProtectedRoute>
            <FullWidthLayout>
              <GroupsList />
            </FullWidthLayout>
          </ProtectedRoute>
        }
      />

      {/* Main Group Chat Route - Dynamic groupId - FULL WIDTH */}
      <Route
        path="/chat/:groupId"
        element={
          <ProtectedRoute>
            <FullWidthLayout>
              <GroupChat />
            </FullWidthLayout>
          </ProtectedRoute>
        }
      />

      {/* ===========================================
          LEGACY GROUP ROUTES (for compatibility)
          =========================================== */}

      {/* Your existing JoinGroup page */}
      <Route
        path="/JoinGroup"
        element={
          <ProtectedRoute>
            <SimpleLayout>
              <JoinGroup />
            </SimpleLayout>
          </ProtectedRoute>
        }
      />

      {/* Your existing GroupChat (without dynamic routing) */}
      <Route
        path="/GroupChat"
        element={
          <ProtectedRoute>
            <FullWidthLayout>
              <GroupChat />
            </FullWidthLayout>
          </ProtectedRoute>
        }
      />

      {/* Legacy group routes */}
      <Route
        path="/group/join/:id?"
        element={
          <ProtectedRoute>
            <SimpleLayout>
              <JoinGroup />
            </SimpleLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/group/chat/:id?"
        element={
          <ProtectedRoute>
            <FullWidthLayout>
              <GroupChat />
            </FullWidthLayout>
          </ProtectedRoute>
        }
      />

      {/* ===========================================
          TEACHING/LEARNING ROUTES
          =========================================== */}
      <Route
        path="/SelectTeacher"
        element={
          <ProtectedRoute>
            <SimpleLayout>
              <SelectTeacher />
            </SimpleLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/TimeSlotSelection"
        element={
          <ProtectedRoute>
            <SimpleLayout>
              <TimeSlotSelection />
            </SimpleLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/PaymentPage"
        element={
          <ProtectedRoute>
            <SimpleLayout>
              <PaymentPage />
            </SimpleLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/OnlineMeeting"
        element={
          <ProtectedRoute>
            <FullWidthLayout>
              <OnlineMeeting />
            </FullWidthLayout>
          </ProtectedRoute>
        }
      />

      {/* ===========================================
          LEGACY ROUTES (for backward compatibility)
          =========================================== */}
      <Route path="/studentconnect" element={<Navigate to="/StudentConnect" replace />} />
      <Route path="/GroupRequests" element={<Navigate to="/requests/group" replace />} />
      <Route path="/CreateRequest" element={<Navigate to="/requests/create" replace />} />
      <Route path="/RequestDetails" element={<Navigate to="/requests/details" replace />} />
      <Route path="/profile" element={<Navigate to="/Profile" replace />} />
      <Route path="/settings" element={<Navigate to="/Settings" replace />} />
      <Route path="/NewUserHomePage" element={<Navigate to="/new-user" replace />} />

      {/* Chat legacy redirects */}
      <Route path="/groups/list" element={<Navigate to="/groups" replace />} />
      <Route path="/groups/browse" element={<Navigate to="/groups/discover" replace />} />

      {/* 404 Route - must be last */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;
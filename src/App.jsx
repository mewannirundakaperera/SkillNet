import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/hooks/useAuth";

// Import your existing components
import SignUp from "./pages/Login and Signup/SignUp";
import Login from "./pages/Login and Signup/Login";
import HomePage from "./pages/Homepages/HomePage";
import StudentConnect from "./pages/Requests/StudentConnect";
import GroupRequests from "./pages/Requests/GroupRequests";
import OneToOneRequests from "@pages/Requests/recived/OneToOneRequests.jsx";
import CreateRequest from "@pages/Requests/create/CreateRequest.jsx";
import CreateGroupRequest from "@pages/Group/CreateGroupRequest.jsx";
import RequestDetails from "./pages/Requests/RequestDetails";
import Profile from "./pages/Requests/Profile";
import RequestHistory from "./pages/Requests/RequestHistory";

// FIXED: Import the individual request components with correct names
import AcceptedRequests from "@pages/Requests/recived/acceptedRequests.jsx";
import PendingRequests from "@pages/Requests/recived/PendingRequests.jsx";
import ArchiveRequests from "@pages/Requests/recived/ArchiveRequests.jsx";
import DraftRequests from "@pages/Requests/create/draftRequest.jsx";
import ActiveRequests from "@pages/Requests/create/activeRequest.jsx";
import CompletedRequests from "@pages/Requests/create/completedRequest.jsx";
import MyRequests from "@pages/Requests/create/MyRequests.jsx";
import Settings from "./pages/Settings";
import SelectTeacher from "./pages/Teach&learn/SelectTeacher";
import TimeSlotSelection from "./pages/Teach&learn/TimeSlotSelection";
import PaymentPage from "./pages/Teach&learn/PaymentPage";
import OnlineMeeting from "./pages/Teach&learn/OnlineMeeting";
import JoinGroup from "./pages/Group/JoinGroup";
import GroupChat from "./pages/Group/GroupChat";
import CreateGroup from "./pages/Group/CreateGroup";
import GroupsList from "./pages/Group/GroupsList";
import AllGroupRequests from "./pages/Group/AllGroupRequests";
import JitsiMeeting from '@/components/Meeting/JitsiMeeting';

// Import the updated layout system
import RequestLayout, { SimpleLayout, FullWidthLayout, ProfileLayout } from "@/components/Layouts/RequestLayout";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

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

    return user ? children : <Navigate to="/login" replace />;
};

// Public Route Component (redirect to dashboard if already logged in)
const PublicRoute = ({ children }) => {
    const { user, loading } = useAuth();

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

    return user ? <Navigate to="/" replace /> : children;
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
    const { loading } = useAuth();

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

            {/* ===== MY REQUESTS SECTION ===== */}
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

            <Route
                path="/requests/draft"
                element={
                    <ProtectedRoute>
                        <RequestLayout title="Draft Requests" subtitle="Requests you've started but haven't published yet">
                            <DraftRequests />
                        </RequestLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/requests/active"
                element={
                    <ProtectedRoute>
                        <RequestLayout title="Active Requests" subtitle="Your currently published and ongoing requests">
                            <ActiveRequests />
                        </RequestLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/requests/completed"
                element={
                    <ProtectedRoute>
                        <RequestLayout title="Completed Requests" subtitle="Successfully completed learning sessions">
                            <CompletedRequests />
                        </RequestLayout>
                    </ProtectedRoute>
                }
            />

            {/* ===== RECEIVED REQUESTS SECTION ===== */}
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

            <Route
                path="/OneToOneRequests/pending"
                element={
                    <ProtectedRoute>
                        <RequestLayout title="Pending Offers" subtitle="Requests waiting for your response">
                            <PendingRequests />
                        </RequestLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/OneToOneRequests/accepted"
                element={
                    <ProtectedRoute>
                        <RequestLayout title="Accepted Requests" subtitle="Requests you have accepted">
                            <AcceptedRequests />
                        </RequestLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/OneToOneRequests/archived"
                element={
                    <ProtectedRoute>
                        <RequestLayout title="Archived Requests" subtitle="Completed and archived requests">
                            <ArchiveRequests />
                        </RequestLayout>
                    </ProtectedRoute>
                }
            />

            {/* ===== GROUP REQUEST ROUTES - FIXED ===== */}
            {/* User's Own Group Requests (accessible through request sidebar) */}
            <Route
                path="/requests/group"
                element={
                    <ProtectedRoute>
                        <RequestLayout title="My Group Requests" subtitle="Manage your own group learning requests">
                            <GroupRequests />
                        </RequestLayout>
                    </ProtectedRoute>
                }
            />

            {/* Create Group Request */}
            <Route
                path="/group/create-group-request"
                element={
                    <ProtectedRoute>
                        <RequestLayout title="Create Group Request" subtitle="Request help or collaboration from your group members">
                            <CreateGroupRequest />
                        </RequestLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/group/create-group-request/:groupId"
                element={
                    <ProtectedRoute>
                        <RequestLayout title="Create Group Request" subtitle="Request help or collaboration from your group members">
                            <CreateGroupRequest />
                        </RequestLayout>
                    </ProtectedRoute>
                }
            />

            {/* ===== REQUEST DETAILS AND HISTORY ===== */}
            <Route
                path="/requests/details/:id"
                element={
                    <ProtectedRoute>
                        <RequestLayout title="Request Details" subtitle="View and manage request information">
                            <RequestDetails />
                        </RequestLayout>
                    </ProtectedRoute>
                }
            />

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

            {/* ===== PROFILE ROUTES ===== */}
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
                path="/profile/:id"
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

            {/* ===== GROUP MANAGEMENT ROUTES ===== */}
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

            {/* All Group Requests (Only accessible through groups - NO SIDEBAR) */}
            <Route
                path="/groups/requests"
                element={
                    <ProtectedRoute>
                        <FullWidthLayout>
                            <AllGroupRequests />
                        </FullWidthLayout>
                    </ProtectedRoute>
                }
            />

            {/* Alternative path for direct access - NO SIDEBAR */}
            <Route
                path="/AllGroupRequests"
                element={
                    <ProtectedRoute>
                        <FullWidthLayout>
                            <AllGroupRequests />
                        </FullWidthLayout>
                    </ProtectedRoute>
                }
            />

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

            {/* ===== LEGACY GROUP ROUTES ===== */}
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

            <Route
                path="/group/join/:id"
                element={
                    <ProtectedRoute>
                        <SimpleLayout>
                            <JoinGroup />
                        </SimpleLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/group/chat/:id"
                element={
                    <ProtectedRoute>
                        <FullWidthLayout>
                            <GroupChat />
                        </FullWidthLayout>
                    </ProtectedRoute>
                }
            />

            {/* ===== TEACHING/LEARNING ROUTES ===== */}
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

            {/* ===== JITSI MEETING ROUTES ===== */}
            <Route
                path="/meeting/:requestId?"
                element={
                    <ProtectedRoute>
                        <FullWidthLayout>
                            <JitsiMeeting />
                        </FullWidthLayout>
                    </ProtectedRoute>
                }
            />

            {/* ===== LEGACY ROUTES (for backward compatibility) ===== */}
            <Route path="/studentconnect" element={<Navigate to="/StudentConnect" replace />} />
            <Route path="/CreateRequest" element={<Navigate to="/requests/create" replace />} />
            <Route path="/RequestDetails" element={<Navigate to="/requests/details" replace />} />
            <Route path="/profile" element={<Navigate to="/Profile" replace />} />
            <Route path="/settings" element={<Navigate to="/Settings" replace />} />
            <Route path="/groups/list" element={<Navigate to="/groups" replace />} />
            <Route path="/groups/browse" element={<Navigate to="/groups/discover" replace />} />

            {/* REMOVED: Conflicting/duplicate routes */}
            {/* These were causing conflicts with the main routes above */}

            {/* 404 Route - must be last */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
};

export default App;
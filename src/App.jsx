import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

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
import GroupDetails from "./pages/Group/GroupDetails";
import GroupsList from "./pages/Group/GroupsList";
import AllGroupRequests from "./pages/Group/AllGroupRequests";
import JitsiMeeting from '@/components/Meeting/JitsiMeeting';
import TestJitsiPage from './pages/TestJitsiPage';
import HelpAndSupport from './pages/HelpAndSupport';

// Import the updated layout system
import RequestLayout, { SimpleLayout, FullWidthLayout, ProfileLayout } from "@/components/Layouts/RequestLayout";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-[#1A202C] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#4299E1] mx-auto"></div>
                    <p className="mt-4 text-[#A0AEC0]">Loading...</p>
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
            <div className="min-h-screen bg-[#1A202C] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#4299E1] mx-auto"></div>
                    <p className="mt-4 text-[#A0AEC0]">Loading...</p>
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
                    <h1 className="text-6xl font-bold text-[#A0AEC0]">404</h1>
                    <h2 className="text-2xl font-semibold text-white mt-4">Page Not Found</h2>
                    <p className="text-[#A0AEC0] mt-2">The page you're looking for doesn't exist.</p>
                    <a
                        href="/"
                        className="btn-gradient-primary mt-6 inline-block px-6 py-3 rounded-lg font-semibold transition-colors"
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
            <div className="min-h-screen bg-[#1A202C] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#4299E1] mx-auto"></div>
                    <p className="mt-4 text-[#A0AEC0]">Loading...</p>
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
                        <RequestLayout title="Create Request" subtitle="Create a new one-to-one learning request">
                            <CreateRequest />
                        </RequestLayout>
                    </ProtectedRoute>
                }
            />

            {/* ===== MY REQUESTS SECTION (Flow: draft -> open -> active -> completed/archived) ===== */}
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

            {/* DRAFT REQUESTS (Status: draft) */}
            <Route
                path="/requests/drafts"
                element={
                    <ProtectedRoute>
                        <RequestLayout title="Draft Requests" subtitle="Requests you've started but haven't published yet">
                            <DraftRequests />
                        </RequestLayout>
                    </ProtectedRoute>
                }
            />

            {/* ACTIVE REQUESTS (Status: active - accepted with meeting) */}
            <Route
                path="/requests/active"
                element={
                    <ProtectedRoute>
                        <RequestLayout title="Active Requests" subtitle="Your currently active requests with meetings">
                            <ActiveRequests />
                        </RequestLayout>
                    </ProtectedRoute>
                }
            />

            {/* COMPLETED REQUESTS (Status: completed) */}
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

            {/* ===== RECEIVED REQUESTS SECTION (Flow: available -> pending -> accepted -> archived) ===== */}

            {/* ALL AVAILABLE REQUESTS (Status: open, from others) */}
            <Route
                path="/requests/available"
                element={
                    <ProtectedRoute>
                        <RequestLayout title="Available Requests" subtitle="Browse learning requests from other students">
                            <OneToOneRequests />
                        </RequestLayout>
                    </ProtectedRoute>
                }
            />

            {/* PENDING OFFERS (Status: open, available for response) */}
            <Route
                path="/requests/pending-offers"
                element={
                    <ProtectedRoute>
                        <RequestLayout title="Available Requests" subtitle="Requests you can accept or decline">
                            <PendingRequests />
                        </RequestLayout>
                    </ProtectedRoute>
                }
            />

            {/* ACCEPTED REQUESTS (Status: accepted responses) */}
            <Route
                path="/requests/accepted"
                element={
                    <ProtectedRoute>
                        <RequestLayout title="Accepted Requests" subtitle="Requests you have accepted and are managing">
                            <AcceptedRequests />
                        </RequestLayout>
                    </ProtectedRoute>
                }
            />

            {/* ARCHIVED REQUESTS (Status: archived responses) */}
            <Route
                path="/requests/archived"
                element={
                    <ProtectedRoute>
                        <RequestLayout title="Archived Requests" subtitle="Completed, declined, and archived requests">
                            <ArchiveRequests />
                        </RequestLayout>
                    </ProtectedRoute>
                }
            />

            {/* ===== TEST JITSI PAGE ===== */}
            <Route
                path="/test-jitsi"
                element={
                    <ProtectedRoute>
                        <TestJitsiPage />
                    </ProtectedRoute>
                }
            />

            {/* ===== LEGACY PATHS FOR BACKWARD COMPATIBILITY ===== */}
            <Route path="/OneToOneRequests" element={<Navigate to="/requests/available" replace />} />
            <Route path="/OneToOneRequests/pending" element={<Navigate to="/requests/pending-offers" replace />} />
            <Route path="/OneToOneRequests/accepted" element={<Navigate to="/requests/accepted" replace />} />
            <Route path="/OneToOneRequests/archived" element={<Navigate to="/requests/archived" replace />} />
            <Route path="/requests/draft" element={<Navigate to="/requests/drafts" replace />} />

            {/* ===== GROUP REQUEST ROUTES ===== */}
            <Route
                path="/requests/group"
                element={
                    <ProtectedRoute>
                        <RequestLayout title="Group Requests" subtitle="Browse and participate in group learning requests">
                            <GroupRequests />
                        </RequestLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/requests/create-group"
                element={
                    <ProtectedRoute>
                        <RequestLayout title="Create Group Request" subtitle="Create a new group request to collaborate with your team members">
                            <CreateGroupRequest />
                        </RequestLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/group/create-group-request"
                element={
                    <ProtectedRoute>
                        <RequestLayout title="Create Group Request" subtitle="Create a new group request to collaborate with your team members">
                            <CreateGroupRequest />
                        </RequestLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/group/create-group-request/:groupId"
                element={
                    <ProtectedRoute>
                        <RequestLayout title="Create Group Request" subtitle="Create a new group request to collaborate with your team members">
                            <CreateGroupRequest />
                        </RequestLayout>
                    </ProtectedRoute>
                }
            />

            {/* ===== REQUEST DETAILS AND EDITING ===== */}
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
                path="/requests/edit/:id"
                element={
                    <ProtectedRoute>
                        <FullWidthLayout>
                            <CreateRequest />
                        </FullWidthLayout>
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

            {/* ===== MEETING ROUTES ===== */}
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

            <Route
                path="/meeting/:requestId/:meetingId"
                element={
                    <ProtectedRoute>
                        <FullWidthLayout>
                            <JitsiMeeting />
                        </FullWidthLayout>
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

            {/* ===== HELP AND SUPPORT ROUTE ===== */}
            <Route
                path="/help-and-support"
                element={
                    <ProtectedRoute>
                        <SimpleLayout>
                            <HelpAndSupport />
                        </SimpleLayout>
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

            <Route
                path="/groups/requests"
                element={
                    <ProtectedRoute>
                        <RequestLayout title="Group Requests" subtitle="Browse and manage group learning requests">
                            <AllGroupRequests />
                        </RequestLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/AllGroupRequests"
                element={
                    <ProtectedRoute>
                        <RequestLayout title="Group Requests" subtitle="Browse and manage group learning requests">
                            <AllGroupRequests />
                        </RequestLayout>
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
                path="/groups/:groupId/details"
                element={
                    <ProtectedRoute>
                        <SimpleLayout>
                            <GroupDetails />
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

            {/* ===== ADDITIONAL LEGACY ROUTES (for backward compatibility) ===== */}
            <Route path="/studentconnect" element={<Navigate to="/StudentConnect" replace />} />
            <Route path="/CreateRequest" element={<Navigate to="/requests/create" replace />} />
            <Route path="/RequestDetails" element={<Navigate to="/requests/details" replace />} />
            <Route path="/profile" element={<Navigate to="/Profile" replace />} />
            <Route path="/settings" element={<Navigate to="/Settings" replace />} />
            <Route path="/help" element={<Navigate to="/help-and-support" replace />} />
            <Route path="/groups/list" element={<Navigate to="/groups" replace />} />
            <Route path="/groups/browse" element={<Navigate to="/groups/discover" replace />} />

            {/* 404 Route - must be last */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
};

export default App;
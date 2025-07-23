import React from "react";
import { Routes, Route } from "react-router-dom";
import SignUp from "./pages/Login and Signup/SignUp";
import Login from "./pages/Login and Signup/Login";
import HomePage from "./pages/HomePage";
import StudentConnect from "./pages/Requests/StudentConnect";
import GroupRequests from "./pages/Requests/GroupRequests";
import OneToOneRequests from "./pages/Requests/OneToOneRequests";
import CreateRequest from "./pages/Requests/CreateRequest";
import RequestDetails from "./pages/Requests/RequestDetails";
import Profile from "./pages/Requests/Profile";
import RequestHistory from "./pages/Requests/RequestHistory";
import Navbar from "./components/Navbars/Navbar";
import Settings from "./pages/Settings";
import SelectTeacher from "./pages/Teach&learn/SelectTeacher";
import TimeSlotSelection from "./pages/Teach&learn/TimeSlotSelection";
import PaymentPage from "./pages/Teach&learn/PaymentPage";
import OnlineMeeting from "./pages/Teach&learn/OnlineMeeting";
import JoinGroup from "./pages/Group/JoinGroup";
import GroupChat from "./pages/Group/GroupChat";


function App() {
  return (
    <Routes>
      {/* ✅ Home route with Navbar */}
      <Route
        path="/"
        element={
          <>
            <Navbar />
            <HomePage />
          </>
        }
      />

      {/* ✅ All other pages WITHOUT Navbar */}
      <Route path="/signup" element={<SignUp />} />
      <Route path="/login" element={<Login />} />
      <Route path="/studentconnect" element={<StudentConnect />} />
      <Route path="/GroupRequests" element={<GroupRequests />} />
      <Route path="/OneToOneRequests" element={<OneToOneRequests />} />
      <Route path="/CreateRequest" element={<CreateRequest />} />
      <Route path="/RequestDetails" element={<RequestDetails />} />
      <Route path="/Profile" element={<Profile />} />
      <Route path="/RequestHistory" element={<RequestHistory />} />
      <Route path="/Settings" element={<Settings />} />
      <Route path="/SelectTeacher" element={<SelectTeacher />} />
      <Route path="/TimeSlotSelection" element={<TimeSlotSelection />} />
      <Route path="/PaymentPage" element={<PaymentPage />} />
      <Route path="/OnlineMeeting" element={<OnlineMeeting />} />
      <Route path="/JoinGroup" element={<JoinGroup />} />
      <Route path="/GroupChat" element={<GroupChat />} />
    </Routes>
  );
}

export default App;

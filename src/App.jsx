import React from "react";
import { Routes, Route } from "react-router-dom";
import SignUp from "./pages/SignUp";
import Login from "./pages/Login";
import HomePage from "./pages/HomePage";
import StudentConnect from "./pages/StudentConnect";
import GroupRequests from "./components/GroupRequests";
import OneToOneRequests from "./components/OneToOneRequests";
import CreateRequest from "./components/CreateRequest";
import RequestDetails from "./components/RequestDetails";
import Profile from "./components/Profile";
import RequestHistory from "./components/RequestHistory";
import Navbar from "./components/Navbar";
import Settings from "./pages/Settings";
import SelectTeacher from "./pages/SelectTeacher";
import TimeSlotSelection from "./components/TimeSlotSelection";
import PaymentPage from "./components/PaymentPage";
import OnlineMeeting from "./components/OnlineMeeting";

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
    </Routes>
  );
}

export default App;

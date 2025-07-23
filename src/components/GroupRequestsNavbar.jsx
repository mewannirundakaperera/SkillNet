import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function GroupRequestsNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow px-4 py-4 md:px-8 flex items-center justify-between relative">
     
      {/* Desktop Nav */}
      <ul className="hidden md:flex gap-6 text-gray-700 font-medium">
        <li><Link to="/" className="hover:text-indigo-600">Home</Link></li>
        <li><a href="/StudentConnect" className="hover:text-indigo-600">Request</a></li>
        <li><a href="/GroupChat" className="hover:text-indigo-600">Groups</a></li>
        <li><a href="/SelectTeacher" className="hover:text-indigo-600">Teach & Learn</a></li>
        <li><a href="/Settings" className="hover:text-indigo-600">Settings</a></li>
      </ul>
      {/* Custom Right Section */}
      <div className="flex items-center gap-4 ml-4">
        {/* Search Bar */}
        <input
          type="text"
          placeholder="Search requests..."
          className="border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-100 text-gray-600 w-56"
        />
        {/* Create New Request Button */}
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors">
          + Create New Request
        </button>
        {/* User Avatar */}
        <img
          src="https://randomuser.me/api/portraits/men/32.jpg"
          alt="User Avatar"
          className="h-10 w-10 rounded-full border-2 border-white shadow"
        />
      </div>
      {/* Hamburger for mobile */}
      <button
        className="md:hidden flex items-center p-2 text-indigo-700 focus:outline-none"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Toggle menu"
      >
        <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>
      {/* Mobile Dropdown */}
      {menuOpen && (
        <div className="absolute top-full left-0 w-full bg-white shadow-lg z-50 flex flex-col items-center py-4 md:hidden animate-fade-in">
          <ul className="flex flex-col gap-4 text-gray-700 font-medium w-full items-center">
            <li><Link to="/" className="hover:text-indigo-600 w-full block text-center" onClick={() => setMenuOpen(false)}>Home</Link></li>
            <li><a href="/StudentConnect" className="hover:text-indigo-600 w-full block text-center">Request</a></li>
            <li><a href="#" className="hover:text-indigo-600 w-full block text-center">Connections</a></li>
            <li><a href="/GroupChat" className="hover:text-indigo-600 w-full block text-center">Groups</a></li>
            <li><a href="/SelectTeacher" className="hover:text-indigo-600">Teach & Learn</a></li>
            <li><a href="#" className="hover:text-indigo-600 w-full block text-center">Messages</a></li>
            <li><a href="#" className="hover:text-indigo-600 w-full block text-center">Settings</a></li>
          </ul>
          <div className="flex flex-col gap-2 mt-4 w-4/5">
            <Link to="/login" onClick={() => setMenuOpen(false)}>
              <button className="w-full px-4 py-2 border border-indigo-600 text-indigo-600 rounded hover:bg-indigo-50 font-semibold">Login</button>
            </Link>
            <Link to="/signup" onClick={() => setMenuOpen(false)}>
              <button className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-semibold">Sign Up</button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

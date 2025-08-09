import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function GroupRequestsNavbar2() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow px-4 py-4 md:px-8 flex items-center justify-between relative">
     
      {/* Desktop Nav */}
      <ul className="hidden md:flex gap-6 text-gray-700 font-medium">
        <li><Link to="/" className="hover:text-indigo-600">Home</Link></li>
        <li><a href="/StudentConnect" className="hover:text-indigo-600">Request</a></li>
        <li><a href="/GroupChat" className="hover:text-indigo-600">Groups</a></li>

        <li><a href="/Settings" className="hover:text-indigo-600">Settings</a></li>
      </ul>
      
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
    
            <li><a href="#" className="hover:text-indigo-600 w-full block text-center">Messages</a></li>
            <li><a href="#" className="hover:text-indigo-600 w-full block text-center">Settings</a></li>
          </ul>
        </div>
      )}
    </nav>
  );
}
 
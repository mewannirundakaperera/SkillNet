import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function NewUserNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow px-4 py-4 md:px-8 flex items-center justify-between relative">
      <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <img src="src/assets/skillnet-logo.svg" alt="SkillNet" className="h-8 w-auto" />
      </Link>
    
      <div className="hidden md:flex gap-4">
        <Link to="/login">
          <button className="px-4 py-2 border border-indigo-600 text-indigo-600 rounded hover:bg-indigo-50 font-semibold">Login</button>
        </Link>
        <Link to="/signup">
          <button className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-semibold">Sign Up</button>
        </Link>
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

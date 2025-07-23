import React from "react";
import { Link } from "react-router-dom";
import NewUserNavbar from "../../components/Navbars/NewUserNavbar";

export default function NewUserHomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <NewUserNavbar />
      {/* Hero Section */}
      <section className="bg-indigo-800 text-white py-24 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Welcome to SkillNet</h1>
        <p className="text-lg mb-8">Learn &amp; Teach Beyond Classrooms — Connect with verified students and share your skills.</p>
        <div className="flex justify-center gap-4">
          <Link to="//">
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold text-lg">Get Started</button>
          </Link>
          <Link to="//">
            <button className="bg-white text-indigo-800 px-8 py-3 rounded-lg font-semibold text-lg border border-white hover:bg-indigo-50">Log In</button>
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-gray-50 text-center">
        <h2 className="text-3xl font-bold mb-10 text-gray-900">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
          <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
            <span className="text-blue-600 text-2xl font-bold mb-2">1</span>
            <h3 className="font-semibold mb-2">Register</h3>
            <p className="text-gray-600">Sign up and verify your student status with your university letter.</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
            <span className="text-blue-600 text-2xl font-bold mb-2">2</span>
            <h3 className="font-semibold mb-2">Join Communities</h3>
            <p className="text-gray-600">Connect in your course and public community.</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
            <span className="text-blue-600 text-2xl font-bold mb-2">3</span>
            <h3 className="font-semibold mb-2">Teach &amp; Learn</h3>
            <p className="text-gray-600">Offer your skills or get help — one-to-one or group.</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
            <span className="text-blue-600 text-2xl font-bold mb-2">4</span>
            <h3 className="font-semibold mb-2">Connect &amp; Grow</h3>
            <p className="text-gray-600">Schedule, pay, learn and grow together securely.</p>
          </div>
        </div>
      </section>

      {/* Why SkillNet */}
      <section className="py-16 px-4 bg-white text-center">
        <h2 className="text-3xl font-bold mb-10 text-gray-900">Why SkillNet?</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
          <div className="flex flex-col items-center">
            <span className="text-green-500 text-2xl mb-2">✅</span>
            <h3 className="font-semibold mb-1">Verified Community</h3>
            <p className="text-gray-600">Only students from your university can join.</p>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-indigo-500 text-2xl mb-2">📹</span>
            <h3 className="font-semibold mb-1">Video &amp; Audio</h3>
            <p className="text-gray-600">Talk face-to-face or just chat — your choice.</p>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-green-400 text-2xl mb-2">💸</span>
            <h3 className="font-semibold mb-1">Free &amp; Paid</h3>
            <p className="text-gray-600">Teach for free or earn a fee — it’s flexible.</p>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-purple-500 text-2xl mb-2">👥</span>
            <h3 className="font-semibold mb-1">Groups &amp; 1-to-1</h3>
            <p className="text-gray-600">Host sessions for one student or a group.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-indigo-800 text-white py-20 px-4 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to join SkillNet?</h2>
        <p className="mb-8">Connect with peers and share knowledge today!</p>
        <Link to="//">
          <button className="bg-blue-500 hover:bg-blue-600 px-8 py-3 rounded-lg font-semibold text-lg">Join Now</button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-gray-100 text-center text-sm text-gray-500">
        © 2025 SkillNet University Platform. All rights reserved.
      </footer>
    </div>
  );
}

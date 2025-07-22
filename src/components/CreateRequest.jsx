import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function CreateRequest() {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navbar */}
      <nav className="bg-white border-b flex items-center justify-between px-8 py-3">
        <Link to="/">
          <div className="flex items-center gap-2">
            <img src="/vite.svg" alt="Logo" className="h-7 w-7" />
            <span className="font-bold text-lg text-indigo-700">Class Connect</span>
          </div>
        </Link>
        <ul className="flex gap-6 text-gray-700 font-medium">
          <li><Link to="/GroupRequests" className={location.pathname === "/group-requests" ? "text-indigo-600 font-semibold" : "hover:text-indigo-600"}>Group Requests</Link></li>
          <li><Link to="/OneToOneRequests" className={location.pathname === "/one-to-one-requests" ? "text-indigo-600 font-semibold" : "hover:text-indigo-600"}>1-to-1 Requests</Link></li>
          <li><Link to="/CreateRequest" className={location.pathname === "/create-request" ? "text-indigo-600 font-semibold" : "hover:text-indigo-600"}>Create Request</Link></li>
          <li><Link to="/RequestDetails" className={location.pathname === "/request-details" ? "text-indigo-600 font-semibold" : "hover:text-indigo-600"}>Request Details</Link></li>
          <li><Link to="/profile" className={location.pathname === "/profile" ? "text-indigo-600 font-semibold" : "hover:text-indigo-600"}>Profile</Link></li>
        </ul>
        <div className="flex items-center gap-4">
          <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="User" className="h-8 w-8 rounded-full" />
        </div>
      </nav>
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r flex flex-col py-6 px-4 gap-2 min-h-full">
          <nav className="flex-1 flex flex-col gap-2">
            <Link to="/GroupRequests" className={`flex items-center gap-2 px-4 py-2 rounded-lg ${location.pathname === "/group-requests" ? "bg-indigo-100 text-indigo-600 font-semibold" : "hover:bg-gray-100 text-gray-700"}`}>📄 Group Requests</Link>
            <Link to="/OneToOneRequests" className={`flex items-center gap-2 px-4 py-2 rounded-lg ${location.pathname === "/one-to-one-requests" ? "bg-indigo-100 text-indigo-600 font-semibold" : "hover:bg-gray-100 text-gray-700"}`}>💬 1-to-1 Requests</Link>
            <Link to="/CreateRequest" className={`flex items-center gap-2 px-4 py-2 rounded-lg ${location.pathname === "/create-request" ? "bg-indigo-100 text-indigo-600 font-semibold" : "hover:bg-gray-100 text-gray-700"}`}>➕ Create Request</Link>
            <Link to="/RequestDetails" className={`flex items-center gap-2 px-4 py-2 rounded-lg ${location.pathname === "/request-details" ? "bg-indigo-100 text-indigo-600 font-semibold" : "hover:bg-gray-100 text-gray-700"}`}>📋 Request Details</Link>
            <Link to="/profile" className={`flex items-center gap-2 px-4 py-2 rounded-lg ${location.pathname === "/profile" ? "bg-indigo-100 text-indigo-600 font-semibold" : "hover:bg-gray-100 text-gray-700"}`}>👤 Profile</Link>
          </nav>
          <div className="mt-auto flex flex-col gap-2">
            <Link to="/profile" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700">My Profile</Link>
            <Link to="/settings" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700">Settings</Link>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-red-500 hover:bg-red-50">Logout</button>
          </div>
        </aside>
        {/* Main Content */}
        <main className="flex-1 flex gap-8 p-8">
          {/* Left: Form */}
          <section className="flex-1 flex flex-col gap-6">
            {/* Request Details */}
            <div className="bg-white rounded-xl shadow p-6 mb-2">
              <h2 className="font-semibold mb-1">Request Details</h2>
              <div className="text-xs text-gray-400 mb-4">Provide basic information about your scheduling request.</div>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Topic</label>
                  <input type="text" className="w-full border rounded px-3 py-2 text-sm" placeholder="e.g., Advanced Calculus Review" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Notes / Description</label>
                  <textarea className="w-full border rounded px-3 py-2 text-sm" rows={3} placeholder="Provide a detailed description of what you need help with or want to discuss." />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Request Type</label>
                  <div className="flex gap-4 mt-2">
                    <button className="flex-1 border rounded-lg px-4 py-3 flex flex-col items-center gap-1 hover:bg-indigo-50">
                      <span className="text-2xl">👥</span>
                      <span className="text-xs font-semibold">Group Request</span>
                    </button>
                    <button className="flex-1 border rounded-lg px-4 py-3 flex flex-col items-center gap-1 hover:bg-indigo-50">
                      <span className="text-2xl">👤</span>
                      <span className="text-xs font-semibold">1-to-1 Request</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {/* Scheduling Details */}
            <div className="bg-white rounded-xl shadow p-6 mb-2">
              <h2 className="font-semibold mb-1">Scheduling Details</h2>
              <div className="text-xs text-gray-400 mb-4">Set the date and time for your request.</div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold mb-1">Preferred Date</label>
                  <input type="date" className="w-full border rounded px-3 py-2 text-sm" value="2025-06-11" readOnly />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold mb-1">Preferred Time</label>
                  <input type="time" className="w-full border rounded px-3 py-2 text-sm" value="10:00" readOnly />
                </div>
              </div>
            </div>
            {/* Payment Information */}
            <div className="bg-white rounded-xl shadow p-6 mb-2">
              <h2 className="font-semibold mb-1">Payment Information</h2>
              <div className="text-xs text-gray-400 mb-4">Specify if payment is required for this request.</div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="accent-indigo-500" />
                  <span className="text-sm">This is a paid request</span>
                </label>
              </div>
            </div>
            {/* Additional Options */}
            <div className="bg-white rounded-xl shadow p-6 mb-2">
              <h2 className="font-semibold mb-1">Additional Options</h2>
              <div className="text-xs text-gray-400 mb-4">Customize advanced settings for your request.</div>
              <div className="mb-4">
                <label className="block text-xs font-semibold mb-1">Request Visibility</label>
                <select className="w-full border rounded px-3 py-2 text-sm">
                  <option>Public (Visible to all students)</option>
                  <option>Private (Only invited students)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Request Thumbnail</label>
                <div className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center gap-2 bg-gray-50">
                  <img src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=facearea&w=96&h=96" alt="Thumbnail" className="w-16 h-16 rounded object-cover" />
                  <span className="text-xs text-gray-400">Drag & drop an image here, or click to select one.</span>
                  <button className="border rounded px-3 py-1 text-xs font-semibold">Upload Image</button>
                </div>
              </div>
            </div>
            {/* Action Buttons */}
            <div className="flex gap-2 justify-end mt-2">
              <button className="border rounded px-4 py-2 font-semibold hover:bg-gray-100">Cancel</button>
              <button className="bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700">Create Request</button>
            </div>
          </section>
          {/* Right: Summary & Tips */}
          <aside className="w-96 flex flex-col gap-6">
            <div className="bg-white rounded-xl shadow p-6 mb-2">
              <h3 className="font-semibold mb-2">Request Summary</h3>
              <div className="text-sm mb-2"><span className="font-semibold">Topic:</span> Untitled Request</div>
              <div className="text-sm mb-2"><span className="font-semibold">Type:</span> <span className="inline-block bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs ml-1">Group Request</span></div>
              <div className="text-sm mb-2"><span className="font-semibold">Date:</span> June 11th, 2025</div>
              <div className="text-sm mb-2"><span className="font-semibold">Time:</span> 10:00 AM</div>
              <div className="text-sm mb-2"><span className="font-semibold">Payment:</span> No Payment Required</div>
              <div className="text-sm"><span className="font-semibold">Description:</span> No description provided.</div>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-semibold mb-2">Tips for Great Requests</h3>
              <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
                <li>Be Specific: Clearly state your needs to attract the right help.</li>
                <li>Set a Fair Price: If paid, ensure your offer is competitive.</li>
                <li>Include Relevant Details: Add any links, documents, or prerequisites.</li>
                <li>Choose the Right Type: Group for collaborative learning, 1-to-1 for focused help.</li>
              </ol>
            </div>
          </aside>
        </main>
      </div>
      {/* Footer */}
      <footer className="text-xs text-gray-400 px-6 py-2 flex items-center gap-1">
        Made with <span className="text-indigo-500 font-bold">Visily</span>
      </footer>
    </div>
  );
}

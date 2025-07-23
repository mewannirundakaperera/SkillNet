import React, { useState } from "react";
import { Link } from "react-router-dom";

const requests = [
  {
    id: "REQ-2023-015",
    title: "Annual Security Audit Scheduling",
    date: "2023-11-09",
    priority: "High",
    status: "Completed",
    comments: 3,
  },
  {
    id: "REQ-2023-014",
    title: "Employee Handbook Revision",
    date: "2023-11-08",
    priority: "Low",
    status: "In Progress",
    comments: 1,
  },
  {
    id: "REQ-2023-013",
    title: "Hardware Upgrade Request - Desktops",
    date: "2023-11-07",
    priority: "Medium",
    status: "Pending",
    comments: 2,
  },
  {
    id: "REQ-2023-012",
    title: "Client Meeting Room Booking - 15th Nov",
    date: "2023-11-06",
    priority: "Low",
    status: "Completed",
    comments: 0,
  },
  {
    id: "REQ-2023-011",
    title: "Employee Performance Review Template Update",
    date: "2023-11-05",
    priority: "Medium",
    status: "In Progress",
    comments: 4,
  },
  {
    id: "REQ-2023-010",
    title: "System Access Request for New Intern",
    date: "2023-11-04",
    priority: "Low",
    status: "Pending",
    comments: 1,
  },
  {
    id: "REQ-2023-009",
    title: "Marketing Campaign Launch Approval",
    date: "2023-11-03",
    priority: "High",
    status: "Completed",
    comments: 2,
  },
  {
    id: "REQ-2023-008",
    title: "Purchase Request: New Project Management Tool",
    date: "2023-11-02",
    priority: "Medium",
    status: "Pending",
    comments: 3,
  },
];

const priorityColor = {
  High: "bg-red-100 text-red-500",
  Medium: "bg-orange-100 text-orange-500",
  Low: "bg-green-100 text-green-500",
};
const statusColor = {
  Completed: "text-green-600",
  "In Progress": "text-blue-600",
  Pending: "text-yellow-500",
};

export default function RequestHistory() {
  const [search, setSearch] = useState("");
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navbar */}
      <nav className="bg-white border-b flex items-center justify-between px-8 py-3">
        <Link to="/">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg text-indigo-700">RequestManager</span>
        </div>
        </Link>
        <div className="flex items-center gap-4">
          <input type="text" placeholder="Search anything..." className="border rounded px-3 py-2 text-sm w-64" />
          <img src="https://randomuser.me/api/portraits/men/15.jpg" alt="User" className="h-8 w-8 rounded-full" />
        </div>
      </nav>
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r flex flex-col py-6 px-4 gap-2 min-h-full">
          <nav className="flex-1 flex flex-col gap-2">
            <Link to="#" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700">Dashboard</Link>
            <Link to="#" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-100 text-indigo-600 font-semibold">My Requests</Link>
            <Link to="#" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700">Team</Link>
            <Link to="#" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700">Settings</Link>
          </nav>
          <div className="mt-auto flex flex-col gap-2">
            <Link to="#" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700">Support</Link>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-red-500 hover:bg-red-50">Logout</button>
          </div>
        </aside>
        {/* Main Content */}
        <main className="flex-1 flex flex-col gap-8 p-8">
          <section className="flex flex-col gap-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Request History</h2>
              <div className="flex gap-2">
                <button className="border rounded px-3 py-2 text-sm bg-white hover:bg-gray-100">{" "}</button>
                <button className="border rounded px-3 py-2 text-sm bg-white hover:bg-gray-100">{" "}</button>
                <button className="border rounded px-3 py-2 text-sm bg-white hover:bg-gray-100">{" "}</button>
              </div>
            </div>
            <div className="mb-6">
              <input
                type="text"
                placeholder="Search requests by title, ID, or comment..."
                className="border rounded px-3 py-2 text-sm w-full"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 gap-6">
              {requests
                .filter(r =>
                  r.title.toLowerCase().includes(search.toLowerCase()) ||
                  r.id.toLowerCase().includes(search.toLowerCase())
                )
                .map((r, i) => (
                  <div key={i} className="bg-white rounded-xl shadow p-5 flex flex-col gap-2 border border-gray-100">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{r.id}</span>
                      <span className={`px-2 py-0.5 rounded font-semibold ${priorityColor[r.priority]}`}>{r.priority}</span>
                    </div>
                    <div className="font-semibold text-gray-800 text-base mb-1">{r.title}</div>
                    <div className="text-xs text-gray-500 mb-1">{r.date}</div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold ${statusColor[r.status]}`}>{r.status}</span>
                    </div>
                    <button className="text-xs text-gray-500 flex items-center gap-1 hover:underline">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V10a2 2 0 012-2h2m5-6v6m0 0l-2-2m2 2l2-2" /></svg>
                      View Comments
                    </button>
                    <div className="flex gap-2 mt-2">
                      <button className="border rounded px-3 py-1 text-xs font-semibold hover:bg-gray-100">View Details</button>
                      <button className="border rounded px-3 py-1 text-xs font-semibold hover:bg-gray-100"> <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 12v.01M8 12v.01M12 12v.01M16 12v.01M20 12v.01" /></svg></button>
                      <button className="border rounded px-3 py-1 text-xs font-semibold hover:bg-gray-100"> <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg></button>
                    </div>
                  </div>
                ))}
            </div>
            {/* Pagination */}
            <div className="flex justify-center items-center gap-2 mt-8">
              <button className="px-3 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-100">&lt; Previous</button>
              <button className="px-3 py-1 rounded border border-gray-200 bg-blue-600 text-white">1</button>
              <button className="px-3 py-1 rounded border border-gray-200 text-gray-700 hover:bg-gray-100">2</button>
              <button className="px-3 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-100">Next &gt;</button>
            </div>
          </section>
          {/* Footer */}
          <footer className="mt-12 text-center text-gray-400 text-sm">
            <div>RequestManager Inc.</div>
            <div className="mt-2">© 2023 RequestManager Inc..</div>
          </footer>
        </main>
      </div>
    </div>
  );
}

import React from "react";
import { Link } from "react-router-dom";
import GroupRequestsNavbar from "../../components/GroupRequestsNavbar";
import RequestNavbar from "../../components/Navbars/RequestNavbar";


const requests = [
  {
    title: "Calculus I Study Group",
    user: "Alice Johnson",
    desc: "Reviewing derivatives and integrals for midterm exam.",
    date: "2024-05-15",
    time: "14:00 - 16:00",
    participants: "3/5",
    status: "Open",
    avatar: "https://randomuser.me/api/portraits/women/1.jpg",
    subject: "Math",
  },
  {
    title: "React Native Project Session",
    user: "Bob Williams",
    desc: "Collaborative coding session for the final project.",
    date: "2024-05-16",
    time: "10:00 - 12:00",
    participants: "5/5",
    status: "Full",
    avatar: "https://randomuser.me/api/portraits/men/2.jpg",
    subject: "CS",
  },
  {
    title: "Philosophy Discussion: Ethics",
    user: "Charlie Brown",
    desc: "Deep dive into utilitarianism vs. deontology.",
    date: "2024-05-17",
    time: "18:00 - 19:30",
    participants: "2/4",
    status: "Open",
    avatar: "https://randomuser.me/api/portraits/men/3.jpg",
    subject: "Philosophy",
  },
  {
    title: "Data Structures & Algorithms",
    user: "Diana Prince",
    desc: "Solving LeetCode problems: Trees and Graphs.",
    date: "2024-05-18",
    time: "09:00 - 11:00",
    participants: "4/6",
    status: "Open",
    avatar: "https://randomuser.me/api/portraits/women/4.jpg",
    subject: "CS",
  },
  // ... more requests ...
];

const featured = [
  { title: "Advanced Chemistry", desc: "Reviewing reaction mechanisms and organic synthesis.", joined: 4 },
  { title: "Microeconomics Principles", desc: "Supply and demand, market equilibrium, and elasticity.", joined: 3 },
  { title: "Introduction to Statistics", desc: "Understanding probability, distributions, and hypothesis testing.", joined: 5 },
  { title: "Art History: Renaissance", desc: "Analyzing key artists and movements of the Italian Renaissance.", joined: 2 },
];

const GroupRequests = () => {
  return (
    <>
      <GroupRequestsNavbar />
      <div className="min-h-screen bg-[#f8f9fb] flex">
        {/* Sidebar */}
        <RequestNavbar />


        {/* Main Content */}
        <main className="flex-1 p-8">
          {/* Top Nav */}
          


          {/* Title & Stats */}
          <h1 className="text-2xl font-bold mb-6">Group Requests</h1>
          <div className="flex gap-6 mb-8">
            <div className="bg-white rounded-lg p-6 flex-1 shadow-sm">
              <div className="text-2xl font-bold">125</div>
              <div className="text-gray-500 flex items-center gap-2">Total Requests <span className="text-blue-400"><svg width="16" height="16" fill="currentColor"><circle cx="8" cy="8" r="8"/></svg></span></div>
            </div>
            <div className="bg-white rounded-lg p-6 flex-1 shadow-sm">
              <div className="text-2xl font-bold">18</div>
              <div className="text-gray-500 flex items-center gap-2">Pending Requests <span className="text-yellow-400"><svg width="16" height="16" fill="currentColor"><circle cx="8" cy="8" r="8"/></svg></span></div>
            </div>
            <div className="bg-white rounded-lg p-6 flex-1 shadow-sm">
              <div className="text-2xl font-bold">87</div>
              <div className="text-gray-500 flex items-center gap-2">Completed Requests <span className="text-green-400"><svg width="16" height="16" fill="currentColor"><circle cx="8" cy="8" r="8"/></svg></span></div>
            </div>
            <div className="bg-white rounded-lg p-6 flex-1 shadow-sm">
              <div className="text-2xl font-bold">9</div>
              <div className="text-gray-500 flex items-center gap-2">Joined Groups <span className="text-purple-400"><svg width="16" height="16" fill="currentColor"><circle cx="8" cy="8" r="8"/></svg></span></div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-8">
            <input type="text" placeholder="Search by topic or subject..." className="px-4 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm w-72" />
            <select className="px-3 py-2 border border-gray-200 rounded text-sm bg-white">
              <option>All Subjects</option>
            </select>
            <select className="px-3 py-2 border border-gray-200 rounded text-sm bg-white">
              <option>All Statuses</option>
            </select>
            <select className="px-3 py-2 border border-gray-200 rounded text-sm bg-white">
              <option>Any Time</option>
            </select>
            <button className="ml-auto text-gray-400 hover:text-blue-600 text-sm">Clear Filters</button>
          </div>

          {/* Requests Grid */}
          <div className="grid grid-cols-4 gap-6 mb-12">
            {requests.map((req, idx) => (
              <div key={idx} className="bg-white rounded-lg p-5 shadow-sm flex flex-col justify-between min-h-[220px]">
                <div className="flex items-center gap-2 mb-2">
                  <img src={req.avatar} alt={req.user} className="w-7 h-7 rounded-full border" />
                  <span className="font-medium text-gray-700 text-sm">{req.user}</span>
                </div>
                <div className="font-semibold mb-1 text-gray-900">{req.title}</div>
                <div className="text-gray-500 text-xs mb-2">{req.desc}</div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <span>{req.date}</span>
                  <span>•</span>
                  <span>{req.time}</span>
                </div>
                <div className="flex items-center gap-2 text-xs mb-2">
                  <span className="text-gray-400">Participants: {req.participants}</span>
                  {req.status === "Open" && <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs">Open</span>}
                  {req.status === "Full" && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">Full</span>}
                  {req.status === "Completed" && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">Completed</span>}
                  {req.status === "Upcoming" && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">Upcoming</span>}
                </div>
                <div className="flex gap-2 mt-auto">
                  <button className="bg-gray-100 rounded px-3 py-1 text-blue-600 font-medium text-sm">View Details</button>
                  {req.status === "Open" && <button className="bg-blue-600 text-white rounded px-3 py-1 font-medium text-sm">Join</button>}
                </div>
              </div>
            ))}
          </div>

          {/* Featured Requests */}
          <div className="mb-12">
            <h2 className="text-lg font-bold mb-4">Featured Requests</h2>
            <div className="grid grid-cols-4 gap-6">
              {featured.map((f, idx) => (
                <div key={idx} className="bg-white rounded-lg p-4 shadow-sm flex flex-col gap-2">
                  <div className="font-semibold text-gray-800">{f.title}</div>
                  <div className="text-gray-500 text-xs">{f.desc}</div>
                  <div className="text-gray-400 text-xs">{f.joined} joined</div>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination */}
          <div className="flex justify-center items-center gap-2 mb-12">
            <button className="px-3 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-100">&lt; Previous</button>
            {[1,2,3,4,5,10].map((n, i) => (
              <button key={i} className={`px-3 py-1 rounded border border-gray-200 ${n===1?"bg-blue-600 text-white":"text-gray-700 hover:bg-gray-100"}`}>{n}</button>
            ))}
            <button className="px-3 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-100">Next &gt;</button>
          </div>

          {/* Footer */}
          <footer className="mt-12 text-center text-gray-400 text-sm">
            <div>Class Connect</div>
            <div className="mt-2">Stay updated with Class Connect</div>
            <form className="flex justify-center items-center gap-2 mt-2">
              <input type="email" placeholder="Enter your email" className="px-4 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              <button className="bg-blue-600 text-white rounded px-4 py-2 font-medium text-sm">Subscribe</button>
            </form>
            <div className="mt-4">© 2023 Class Connect.</div>
          </footer>
        </main>
      </div>
    </>
  );
};

export default GroupRequests;

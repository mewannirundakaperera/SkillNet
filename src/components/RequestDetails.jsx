import React, { useState } from "react";
import { Link } from "react-router-dom";

const participants = [
  { name: "Alice Johnson", avatar: "https://randomuser.me/api/portraits/men/1.jpg" },
  { name: "Bob Williams", avatar: "https://randomuser.me/api/portraits/men/2.jpg" },
  { name: "Charlie Brown", avatar: "https://randomuser.me/api/portraits/men/3.jpg" },
  { name: "Diana Smith", avatar: "https://randomuser.me/api/portraits/women/4.jpg" },
  { name: "Eve Davis", avatar: "https://randomuser.me/api/portraits/women/5.jpg" },
];

const relatedRequests = [
  "Linear Algebra Review Session",
  "Probability and Statistics Deep Dive",
  "Introduction to Python Programming",
  "Machine Learning Concepts Explained",
];

const initialMessages = [
  {
    user: "John Doe",
    avatar: "https://randomuser.me/api/portraits/men/6.jpg",
    time: "2 hours ago",
    text: "Looking forward to this session! Will we cover shortest path algorithms?",
  },
  {
    user: "Alice Johnson",
    avatar: "https://randomuser.me/api/portraits/men/1.jpg",
    time: "1 hour ago",
    text: "I'm a bit rusty on trees, hope we can go over them thoroughly.",
  },
  {
    user: "John Doe",
    avatar: "https://randomuser.me/api/portraits/men/6.jpg",
    time: "30 minutes ago",
    text: "Yes, we'll definitely cover trees. Shortest path algorithms are also on the agenda if time permits!",
  },
];

export default function RequestDetails() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages([
      ...messages,
      {
        user: "You",
        avatar: "https://randomuser.me/api/portraits/men/7.jpg",
        time: "Just now",
        text: input,
      },
    ]);
    setInput("");
  };

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
          <li><Link to="/GroupRequests" className="hover:text-indigo-600">Group Requests</Link></li>
          <li><Link to="/OneToOneRequests" className="hover:text-indigo-600">1-to-1 Requests</Link></li>
          <li><Link to="/CreateRequest" className="hover:text-indigo-600">Create Request</Link></li>
          <li><Link to="/RequestDetails" className="text-indigo-600 font-semibold">Request Details</Link></li>
          <li><Link to="/profile" className="hover:text-indigo-600">Profile</Link></li>
        </ul>
        <div className="flex items-center gap-4">
          <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="User" className="h-8 w-8 rounded-full" />
        </div>
      </nav>
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r flex flex-col py-6 px-4 gap-2 min-h-full">
          <nav className="flex-1 flex flex-col gap-2">
            <Link to="/GroupRequests" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700">📄 Group Requests</Link>
            <Link to="/OneToOneRequests" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700">💬 1-to-1 Requests</Link>
            <Link to="/CreateRequest" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700">➕ Create Request</Link>
            <Link to="/RequestDetails" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-100 text-indigo-600 font-semibold">📋 Request Details</Link>
            <Link to="/profile" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700">👤 Profile</Link>
          </nav>
          <div className="mt-auto flex flex-col gap-2">
            <Link to="/profile" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700">My Profile</Link>
            <Link to="/settings" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700">Settings</Link>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-red-500 hover:bg-red-50">Logout</button>
          </div>
        </aside>
        {/* Main Content */}
        <main className="flex-1 flex gap-8 p-8">
          <section className="flex-1 flex flex-col gap-6">
            {/* Request Details */}
            <div className="bg-white rounded-xl shadow p-6 mb-2">
              <div className="flex items-center gap-4 mb-2">
                <h2 className="font-bold text-xl flex-1">Advanced Data Structures Study Group</h2>
                <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded text-xs font-semibold">Pending</span>
              </div>
              <div className="text-xs text-gray-400 mb-4">Details for this scheduling request.</div>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-start gap-2"><span className="font-semibold">📝 Notes:</span> <span>Focus on graphs, trees, and dynamic programming. Bring your laptops for coding exercises. We'll start with a brief review of recursion.</span></div>
                <div className="flex items-center gap-2"><span className="font-semibold">📅 Date:</span> <span>October 26, 2024</span></div>
                <div className="flex items-center gap-2"><span className="font-semibold">⏰ Time:</span> <span>10:00 AM - 12:00 PM</span></div>
                <div className="flex items-center gap-2"><span className="font-semibold">💵 Payment:</span> <span>$25.00</span></div>
              </div>
              <div className="flex gap-2 mt-6">
                <Link to="/GroupRequests" className="border rounded px-4 py-2 font-semibold hover:bg-gray-100">Back to Group Requests</Link>
                <button className="bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700">Edit Request</button>
              </div>
            </div>
            {/* Participants */}
            <div className="bg-white rounded-xl shadow p-6 mb-2">
              <h3 className="font-semibold mb-4">Participants</h3>
              <div className="flex gap-8 flex-wrap">
                {participants.map((p, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <img src={p.avatar} alt={p.name} className="w-14 h-14 rounded-full object-cover" />
                    <span className="text-sm font-medium text-gray-700">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Messages */}
            <div className="bg-white rounded-xl shadow p-6 mb-2">
              <h3 className="font-semibold mb-4">Messages</h3>
              <div className="flex flex-col gap-3 max-h-56 overflow-y-auto mb-2">
                {messages.map((msg, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <img src={msg.avatar} alt={msg.user} className="w-8 h-8 rounded-full object-cover mt-1" />
                    <div>
                      <div className="font-semibold text-sm text-gray-800">{msg.user} <span className="text-xs text-gray-400 font-normal">{msg.time}</span></div>
                      <div className="text-gray-700 text-sm">{msg.text}</div>
                    </div>
                  </div>
                ))}
              </div>
              <form className="flex gap-2 mt-2" onSubmit={handleSend}>
                <input
                  type="text"
                  className="flex-1 border rounded px-3 py-2 text-sm"
                  placeholder="Type your message..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                />
                <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 flex items-center"> <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" /></svg></button>
              </form>
            </div>
          </section>
          {/* Right: Actions & Related */}
          <aside className="w-96 flex flex-col gap-6">
            <div className="bg-white rounded-xl shadow p-6 mb-2">
              <h3 className="font-semibold mb-4">Actions</h3>
              <button className="w-full bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 mb-2">Update Details</button>
              <button className="w-full bg-red-500 text-white rounded px-4 py-2 font-semibold hover:bg-red-600">Cancel Request</button>
            </div>
            <div className="bg-white rounded-xl shadow p-6 mb-2">
              <h3 className="font-semibold mb-4">Related Requests</h3>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {relatedRequests.map((r, i) => (
                  <li key={i} className="cursor-pointer hover:text-blue-600">{r}</li>
                ))}
              </ul>
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

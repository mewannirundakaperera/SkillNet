import React from "react";
import { Link } from "react-router-dom";
import RequestNavbar from "../../components/Navbars/RequestNavbar";
import GroupRequestsNavbar from "../../components/GroupRequestsNavbar";

const friends = [
  { name: "Alice Smith", avatar: "https://randomuser.me/api/portraits/women/10.jpg" },
  { name: "Bob Johnson", avatar: "https://randomuser.me/api/portraits/men/11.jpg" },
  { name: "Charlie Brown", avatar: "https://randomuser.me/api/portraits/men/12.jpg" },
  { name: "Diana Prince", avatar: "https://randomuser.me/api/portraits/women/13.jpg" },
];

const skills = ["React.js", "TypeScript", "Tailwind CSS", "Next.js", "Python", "Data Analysis", "Problem Solving", "Teamwork"];
const interests = ["Machine Learning", "Web Development", "UI/UX Design", "Artificial Intelligence", "Cybersecurity", "Gaming"];
const activity = [2, 4, 3, 7, 6, 1, 0];
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Profile() {
  return (
    <>
      <GroupRequestsNavbar />
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Top Navbar */}
       
        <div className="flex flex-1">
          {/* Sidebar */}
          <RequestNavbar />
          {/* Main Content */}
          <main className="flex-1 flex flex-col gap-8 p-8">
            {/* Profile Card */}
            <section className="bg-white rounded-xl shadow p-6 flex flex-col gap-2 mb-2">
              <div className="flex items-center gap-6">
                <img src="https://randomuser.me/api/portraits/men/14.jpg" alt="Jane Doe" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-2xl">Jane Doe</h2>
                    <button className="ml-auto border rounded px-3 py-1 text-xs font-semibold hover:bg-gray-100">Edit profile</button>
                  </div>
                  <div className="text-gray-500 text-sm">jane.doe@classconnect.com</div>
                  <div className="text-gray-400 text-xs flex items-center gap-2">
                    @janedoe_cc • New York, USA • Member since Oct 2023
                  </div>
                  <div className="mt-2 text-gray-700 text-sm">Passionate student balancing academic pursuits with a love for collaborative learning. Always open to new connections and study groups in Computer Science and Data Analytics. Let us connect to solve the world together!</div>
                </div>
              </div>
            </section>
            {/* Stats */}
            <section className="grid grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
                <div className="text-yellow-500 text-2xl mb-1">★</div>
                <div className="text-2xl font-bold">4.8 <span className="text-yellow-500 text-lg">★</span></div>
                <div className="text-gray-400 text-xs">124 ratings</div>
                <div className="mt-2 text-xs text-gray-500 font-medium">Average Rating</div>
              </div>
              <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
                <div className="text-blue-500 text-2xl mb-1">📅</div>
                <div className="text-2xl font-bold">3</div>
                <div className="text-gray-400 text-xs">Next 7 days</div>
                <div className="mt-2 text-xs text-gray-500 font-medium">Upcoming Class Connects</div>
              </div>
              <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
                <div className="text-green-500 text-2xl mb-1">✓</div>
                <div className="text-2xl font-bold">45</div>
                <div className="text-gray-400 text-xs">All time</div>
                <div className="mt-2 text-xs text-gray-500 font-medium">Requests Completed</div>
              </div>
            </section>
            {/* Friends & Skills */}
            <section className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">My Friends</h3>
                  <Link to="#" className="text-blue-600 text-xs font-medium">View All</Link>
                </div>
                <div className="flex flex-col gap-2">
                  {friends.map((f, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <img src={f.avatar} alt={f.name} className="w-8 h-8 rounded-full object-cover" />
                      <span className="text-sm font-medium text-gray-700">{f.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">Skills & Interests</h3>
                </div>
                <div>
                  <div className="font-semibold text-xs mb-1">Skills</div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {skills.map((s, i) => (
                      <span key={i} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">{s}</span>
                    ))}
                  </div>
                  <div className="font-semibold text-xs mb-1">Interests</div>
                  <div className="flex flex-wrap gap-2">
                    {interests.map((s, i) => (
                      <span key={i} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </section>
            {/* Weekly Activity */}
            <section className="bg-white rounded-xl shadow p-6 flex flex-col gap-4">
              <h3 className="font-semibold mb-2">Weekly Activity Overview</h3>
              <div className="text-xs text-gray-400 mb-2">Your interactions over the last 7 days.</div>
              <div className="flex items-end gap-4 h-32">
                {activity.map((val, i) => (
                  <div key={i} className="flex flex-col items-center justify-end h-full">
                    <div
                      className="w-8 rounded bg-blue-500"
                      style={{ height: `${val * 18}px` }}
                    ></div>
                    <span className="text-xs text-gray-500 mt-1">{days[i]}</span>
                  </div>
                ))}
              </div>
            </section>
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
      </div>
    </>
  );
}

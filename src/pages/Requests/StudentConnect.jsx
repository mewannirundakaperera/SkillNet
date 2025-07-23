import React from "react";
import { Link } from "react-router-dom";
import RequestNavbar from "../../components/Navbars/RequestNavbar";
import GroupRequestsNavbar from "../../components/GroupRequestsNavbar";

const StudentConnect = () => {
  return (
    <>
      <GroupRequestsNavbar />
      <div className="flex min-h-screen bg-[#f8f9fb]">
        {/* Sidebar */}
        <RequestNavbar />

        {/* Main Content */}
        <main className="flex-1 p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-[28px] font-bold">Welcome, Amelia <span role="img" aria-label="wave">👋</span></h1>
              <div className="text-gray-500 text-base">Manage your student-to-student class scheduling requests efficiently.</div>
            </div>
            <button className="bg-blue-600 text-white rounded-md px-6 py-3 font-semibold text-lg shadow hover:bg-blue-700 transition">+ Create New Request</button>
          </div>

          {/* Stats */}
          <div className="flex gap-6 mb-8">
            <div className="bg-white rounded-lg p-6 flex-1 shadow-sm">
              <div className="text-2xl font-bold">12</div>
              <div className="text-gray-500">Active Requests</div>
            </div>
            <div className="bg-white rounded-lg p-6 flex-1 shadow-sm">
              <div className="text-2xl font-bold">8</div>
              <div className="text-gray-500">Active Collaborations</div>
            </div>
            <div className="bg-white rounded-lg p-6 flex-1 shadow-sm">
              <div className="text-2xl font-bold">3</div>
              <div className="text-gray-500">New Opportunities</div>
            </div>
            <div className="bg-white rounded-lg p-6 flex-1 shadow-sm">
              <div className="text-2xl font-bold">50+</div>
              <div className="text-gray-500">Sessions Completed</div>
            </div>
          </div>

          <div className="flex gap-8">
            {/* Left: Recent Requests */}
            <section className="flex-[2]">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">My Recent Requests</h2>
                <a href="#" className="text-blue-600 font-medium">View All</a>
              </div>
              <div className="grid grid-cols-2 gap-5">
                {/* Example cards, repeat as needed */}
                <div className="bg-white rounded-lg p-5 shadow-sm">
                  <div className="font-semibold">Need help with Python loops <span className="text-orange-400 text-xs">(Open)</span></div>
                  <div className="text-gray-500 text-sm">Computer Science - CS101 (1-to-1)</div>
                  <div className="my-2 text-gray-700">Looking for someone to help me understand for-loops and while-loops in Python...</div>
                  <div className="text-gray-400 text-xs">Requested by <b>John Doe</b> · 4d ago</div>
                  <button className="mt-2 bg-gray-100 rounded px-3 py-1 text-blue-600 font-medium">View Details</button>
                </div>
                <div className="bg-white rounded-lg p-5 shadow-sm">
                  <div className="font-semibold">Study group for Organic Chemistry Midterm <span className="text-orange-400 text-xs">(Pending)</span></div>
                  <div className="text-gray-500 text-sm">Chemistry - CHEM201 (Group)</div>
                  <div className="my-2 text-gray-700">Starting a study group for the CHEM201 midterm next week...</div>
                  <div className="text-gray-400 text-xs">Requested by <b>Jane Smith</b> · 1d ago</div>
                  <button className="mt-2 bg-gray-100 rounded px-3 py-1 text-blue-600 font-medium">View Details</button>
                </div>
                {/* Add more cards as needed */}
              </div>
            </section>

            {/* Right: Sidebar widgets */}
            <aside className="flex-1 flex flex-col gap-6">
              {/* Upcoming Sessions */}
              <section className="bg-white rounded-lg p-5 shadow-sm">
                <h3 className="text-base font-bold mb-3">Upcoming Sessions</h3>
                <ul className="list-none p-0 m-0">
                  <li className="mb-2.5">
                    <b>Calculus I Review</b><br />
                    <span className="text-gray-500 text-sm">10:00 AM - 11:00 AM</span><br />
                    <span className="text-gray-400 text-xs">Library Study Room C</span>
                  </li>
                  <li className="mb-2.5">
                    <b>History of Art: Renaissance</b><br />
                    <span className="text-gray-500 text-sm">2:00 PM - 3:00 PM</span><br />
                    <span className="text-gray-400 text-xs">Online via Zoom</span>
                  </li>
                  <li>
                    <b>Chemistry Lab Prep</b><br />
                    <span className="text-gray-500 text-sm">4:00 PM - 5:00 PM</span><br />
                    <span className="text-gray-400 text-xs">Science Building, Lab 203</span>
                  </li>
                </ul>
              </section>

              {/* Notifications */}
              <section className="bg-white rounded-lg p-5 shadow-sm">
                <h3 className="text-base font-bold mb-3">Notifications</h3>
                <ul className="list-none p-0 m-0 text-sm">
                  <li>Your request for Python loops assistance has been opened. <span className="text-gray-400">Just now</span></li>
                  <li>New group "Organic Chemistry Midterm Prep" is seeking members. <span className="text-gray-400">5 mins ago</span></li>
                  <li>Alex Lee accepted your review offer for the English essay. <span className="text-gray-400">1 hour ago</span></li>
                </ul>
              </section>

              {/* Group Collaboration Opportunities */}
              <section className="bg-white rounded-lg p-5 shadow-sm">
                <h3 className="text-base font-bold mb-3">Group Collaboration Opportunities</h3>
                <div className="mb-2.5">
                  <b>Advanced Calculus Study Group</b><br />
                  <span className="text-gray-500 text-sm">Mathematics - 7 members</span><br />
                  <button className="mt-1 bg-blue-600 text-white rounded px-2.5 py-1 text-sm font-medium">Join Group</button>
                </div>
                <div>
                  <b>Digital Marketing Project Crew</b><br />
                  <span className="text-gray-500 text-sm">Marketing - 4 members</span>
                </div>
              </section>

              {/* Helpful Resources & Tips */}
              <section className="bg-white rounded-lg p-5 shadow-sm">
                <h3 className="text-base font-bold mb-3">Helpful Resources & Tips</h3>
                <ul className="list-none p-0 m-0 text-sm">
                  <li>Effective Note-Taking Strategies</li>
                  <li>Time Management for Students</li>
                  <li>Understanding Plagiarism</li>
                  <li>Peer Tutoring Best Practices</li>
                </ul>
              </section>
            </aside>
          </div>

          {/* Footer */}
          <footer className="mt-12 text-left text-gray-400 text-sm">
            Made with <span className="text-blue-600 font-bold">&#10084;</span> by Visily
          </footer>
        </main>
      </div>
    </>
  );
};

export default StudentConnect;

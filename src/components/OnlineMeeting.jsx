import React from "react";
import { Link } from "react-router-dom";

export default function OnlineMeeting() {
  const percent = 40;
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navbar */}
      <nav className="bg-white border-b flex items-center justify-between px-8 py-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg text-indigo-700">Student Scheduler</span>
        </div>
        <ul className="flex gap-6 text-gray-700 font-medium">
          <li><Link to="/SelectTeacher" className="hover:text-indigo-600">Select Teacher</Link></li>
          <li><Link to="/TimeSlotSelection" className="hover:text-indigo-600">Time Slot Selection</Link></li>
          <li><Link to="/PaymentPage" className="hover:text-indigo-600">Payment</Link></li>
          <li><Link to="/OnlineMeeting" className="text-indigo-600 font-semibold">Online Meeting</Link></li>
        </ul>
        <div className="flex items-center gap-4">
          <img src="https://randomuser.me/api/portraits/men/40.jpg" alt="User" className="h-8 w-8 rounded-full" />
        </div>
      </nav>
      <main className="flex-1 flex flex-col gap-8 items-center py-8">
        <section className="w-full max-w-4xl bg-white rounded-xl shadow p-8 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">Advanced React Hooks Masterclass</h1>
              <div className="text-blue-700 font-medium mb-2">With <span className="underline cursor-pointer">Dr. Evelyn Reed</span> <span className="ml-1 inline-block w-2 h-2 bg-blue-400 rounded-full"></span></div>
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Tuesday, October 26, 2024 ● 10:00 AM - 11:30 AM PST
              </div>
              <div className="flex items-center gap-2 mb-2">
                <input type="text" className="border rounded px-3 py-2 text-sm w-96" value="https://studentscheduler.meeting.link/react-hooks-2024" readOnly />
                <button className="border rounded px-2 py-1 text-xs font-semibold hover:bg-gray-100">Copy</button>
                <span className="text-xs text-gray-400 ml-2">Meeting Link</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <input type="text" className="border rounded px-3 py-2 text-sm w-64" value="secure_react_2024" readOnly />
                <button className="border rounded px-2 py-1 text-xs font-semibold hover:bg-gray-100">Copy</button>
                <span className="text-xs text-gray-400 ml-2">Password</span>
              </div>
            </div>
            <button className="bg-blue-600 text-white rounded px-6 py-3 font-semibold text-lg shadow hover:bg-blue-700 transition">Join Session</button>
          </div>
        </section>
        <div className="w-full max-w-4xl grid grid-cols-2 gap-8 mb-4">
          <section className="bg-white rounded-xl shadow p-6 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-blue-600 font-bold mb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" /></svg>
              What to Expect
            </div>
            <ul className="text-sm text-gray-700 list-disc list-inside pl-2">
              <li>Ensure your internet connection is stable and quiet.</li>
              <li>Have your microphone and camera ready for interaction.</li>
              <li>A quiet environment free from distractions is recommended.</li>
              <li>Be prepared to engage and ask questions during the session.</li>
              <li>Technical support is available if you encounter any issues before or during the meeting.</li>
            </ul>
          </section>
          <section className="bg-white rounded-xl shadow p-6 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-blue-600 font-bold mb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0 0H3" /></svg>
              Meeting Resources
            </div>
            <ul className="text-sm text-gray-700 list-disc list-inside pl-2">
              <li>Pre-session reading materials and documentation.</li>
              <li>Links to relevant external articles and tutorials.</li>
              <li>Downloadable code snippets and examples for practice.</li>
              <li>Optional: A brief pre-assessment quiz to gauge readiness.</li>
              <li>A collaborative document for shared notes and questions.</li>
            </ul>
          </section>
        </div>
        <section className="w-full max-w-4xl bg-white rounded-xl shadow p-6 mb-4">
          <div className="font-semibold mb-2">Payment Retrieval</div>
          <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">You can retrieve your payment until the session is halfway complete (40% done).</div>
          <div className="w-full h-2 bg-gray-200 rounded mb-2">
            <div className="h-2 bg-blue-600 rounded" style={{ width: `${percent}%` }}></div>
          </div>
          <div className="flex justify-between items-center">
            <button className="bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700">Retrieve Payment</button>
            <span className="text-xs text-gray-400">{percent}%</span>
          </div>
        </section>
        <section className="w-full max-w-4xl bg-white rounded-xl shadow p-8 mb-4 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 14h.01M16 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Need Assistance?
          </div>
          <div className="text-gray-700 text-center max-w-xl">Our support team is here to help you. Whether you have questions about your session, technical issues, or payment concerns, we've got you covered.</div>
          <div className="flex gap-4 mt-2">
            <button className="border rounded px-4 py-2 font-semibold hover:bg-gray-100">View FAQ</button>
            <button className="bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700">Contact Support</button>
          </div>
        </section>
      </main>
      {/* Footer */}
      <footer className="mt-12 text-center text-gray-400 text-sm pb-4">
        <div>Student Scheduler</div>
        <div className="mt-2">© 2024 Student Scheduler.</div>
      </footer>
    </div>
  );
}

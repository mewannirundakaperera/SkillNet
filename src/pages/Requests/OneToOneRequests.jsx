import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import GroupRequestsNavbar from "../../components/Navbars/GroupRequestsNavbar";
import RequestNavbar from "../../components/Navbars/RequestNavbar";

const requests = [
  {
    id: 1,
    name: 'Jane Doe',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    title: 'Review UI/UX Portfolio',
    message: `Hi, I hope this message finds you well. I’m a product designer looking for some feedback on my UI/UX portfolio. I would appreciate your insights on structure, case studies, and visual design. I’m particularly interested in your thoughts on how I present my problem-solving process. Let me know if you are available for a 30-minute call this week. I am flexible with time. Thank you!`,
    rate: '$30/hour',
    time: '1 hour ago',
    status: 'active',
    profile: {
      username: '@jane_doe',
      role: 'Product Designer',
      bio: 'Jane is a Product Designer with 8 years of experience, specializing in user experience and interface design for mobile applications. She has worked on projects for various startups and established tech companies.',
      date: 'July 15, 2024, 10:00 AM',
      payment: '$30/hour',
    },
  },
  {
    id: 2,
    name: 'Alex Smith',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    title: 'Help with React Hooks',
    message: 'Hello! I am struggling with custom hooks in React and would love some guidance.',
    rate: '$25/hour',
    time: '3 hours ago',
    status: 'active',
  },
  {
    id: 3,
    name: 'Emily M.',
    avatar: 'https://randomuser.me/api/portraits/women/65.jpg',
    title: 'Brainstorm Content Ideas',
    message: 'Hi there! I’m looking for someone to brainstorm some fresh content ideas for my blog.',
    rate: '',
    time: '5 hours ago',
    status: 'active',
  },
  {
    id: 4,
    name: 'Chris H.',
    avatar: 'https://randomuser.me/api/portraits/men/41.jpg',
    title: 'Data Visualization Feedback',
    message: 'I’ve created a few dashboards for my project and would appreciate an expert eye on the design.',
    rate: '',
    time: '1 day ago',
    status: 'active',
  },
  {
    id: 5,
    name: 'Sarah K.',
    avatar: 'https://randomuser.me/api/portraits/women/50.jpg',
    title: 'Critique my Logo Designs',
    message: 'Hi! I’ve just finished a new set of logo concepts for a client and would love some feedback.',
    rate: '',
    time: '2 days ago',
    status: 'active',
  },
];

const OneToOneRequests = () => {
  const [selected, setSelected] = useState(requests[0]);

  return (
    <>
      <GroupRequestsNavbar />
      <div className="min-h-screen bg-[#f8f9fb] flex">
        {/* Sidebar */}
        <RequestNavbar />

        {/* Main Content */}
        <main className="flex-1 p-8">
          {/* Top Nav */}
          

          <div className="flex gap-6">
            {/* Requests List */}
            <aside className="w-[320px] bg-white rounded-lg shadow-sm p-0 flex flex-col border border-gray-200">
              <div className="border-b border-gray-100 p-4">
                <h2 className="font-bold text-lg">Requests</h2>
                <ul className="mt-4 flex flex-col gap-2 text-sm">
                  <li className="text-blue-600 font-semibold bg-blue-50 rounded px-3 py-1">All Requests</li>
                  <li className="text-gray-600 hover:text-blue-600 cursor-pointer px-3 py-1">Pending Offers</li>
                  <li className="text-gray-600 hover:text-blue-600 cursor-pointer px-3 py-1">Accepted</li>
                  <li className="text-gray-600 hover:text-blue-600 cursor-pointer px-3 py-1">Archived</li>
                </ul>
              </div>
            </aside>

            {/* Feed */}
            <section className="flex-1 bg-white rounded-lg shadow-sm p-6 min-h-[600px]">
              <h2 className="font-bold text-xl mb-2">1-to-1 Request Feed</h2>
              <div className="text-gray-500 text-sm mb-4">Browse and manage private scheduling requests.</div>
              <div className="flex flex-col gap-2">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className={`flex items-start gap-3 p-3 rounded cursor-pointer border ${selected.id === req.id ? 'border-yellow-400 bg-yellow-50' : 'border-transparent hover:bg-gray-50'}`}
                    onClick={() => setSelected(req)}
                  >
                    <img src={req.avatar} alt={req.name} className="w-10 h-10 rounded-full object-cover" />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{req.name}</div>
                      <div className="text-gray-500 text-sm">{req.title}</div>
                      <div className="text-gray-500 text-xs truncate max-w-xs">{req.message}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-gray-400">{req.time}</span>
                      {req.rate && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-medium">{req.rate}</span>}
                    </div>
                  </div>
                ))}
                <div className="text-center text-gray-400 text-xs mt-4">End of requests.</div>
              </div>
            </section>

            {/* Details */}
            <aside className="w-[350px] bg-white rounded-lg shadow-sm p-6 border border-gray-200 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <img src={selected.avatar} alt={selected.name} className="w-14 h-14 rounded-full object-cover" />
                <div>
                  <div className="font-bold text-lg">{selected.name}</div>
                  <div className="text-gray-500 text-sm">{selected.profile?.role || 'Member'}</div>
                  <div className="text-blue-600 text-xs font-medium cursor-pointer">View Profile</div>
                </div>
              </div>
              <div>
                <div className="font-semibold text-gray-900 mb-1">{selected.title}</div>
                <div className="text-gray-500 text-xs mb-2">{selected.profile?.date || 'July 15, 2024, 10:00 AM'}</div>
                {selected.profile?.payment && <div className="text-gray-500 text-xs mb-2">Payment: {selected.profile.payment}</div>}
                <div className="text-gray-700 text-sm whitespace-pre-line border rounded p-3 bg-gray-50">{selected.message}</div>
                <div className="flex gap-2 mt-4">
                  <button className="bg-gray-100 rounded px-4 py-2 text-gray-700 font-medium text-sm">Not right now</button>
                  <button className="bg-blue-600 text-white rounded px-4 py-2 font-medium text-sm">Accept Offer</button>
                </div>
                <div className="text-gray-400 text-xs mt-4 cursor-pointer">Report Request</div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </>
  );
};

export default OneToOneRequests;

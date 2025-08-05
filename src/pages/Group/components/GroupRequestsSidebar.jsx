import React from "react";
import { Link } from "react-router-dom";

// Mock data - you can move this to a separate file or fetch from API
const mockRequests = [
  {
    id: 1,
    name: 'Jane Doe',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    title: 'Review UI/UX Portfolio',
    message: 'Hi, I hope this message finds you well. I need feedback on my UI/UX portfolio.',
    rate: '$30/hour',
    time: '1 hour ago',
    status: 'active',
  },
  {
    id: 2,
    name: 'Alex Smith',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    title: 'Help with React Hooks',
    message: 'Hello! I am struggling with custom hooks in React and would love some guidance.',
    rate: '$25/hour',
    time: '3 hours ago',
    status: 'pending',
  },
  {
    id: 3,
    name: 'Emily M.',
    avatar: 'https://randomuser.me/api/portraits/women/65.jpg',
    title: 'Brainstorm Content Ideas',
    message: 'Hi there! I\'m looking for someone to brainstorm some fresh content ideas.',
    rate: '',
    time: '5 hours ago',
    status: 'accepted',
  },
];

const GroupRequestsSidebar = ({ requests = mockRequests }) => {
  return (
    <aside className="w-80 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden">
      {/* Fixed Header - Matches other components height */}
      <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0 bg-white" style={{ minHeight: '76px' }}>
        <div className="flex items-center justify-between h-full w-full">
          <div className="flex flex-col justify-center">
            <h3 className="font-semibold text-lg mb-1">Group Requests</h3>
            <p className="text-xs text-gray-500">Learning requests from group members</p>
          </div>
          <Link
            to="/requests/create"
            className="bg-blue-600 text-white rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1 flex-shrink-0"
            title="Create new request"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create
          </Link>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-3 mb-2">
                <img
                  src={request.avatar}
                  alt={request.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="font-semibold text-sm">{request.name}</div>
                  <div className="text-xs text-gray-500">{request.time}</div>
                </div>
                {request.rate && (
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded font-medium">
                    {request.rate}
                  </span>
                )}
              </div>

              <h4 className="font-medium text-sm mb-1">{request.title}</h4>
              <p className="text-xs text-gray-600 line-clamp-2 mb-2">{request.message}</p>

              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-1 rounded font-medium ${
                  request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    request.status === 'accepted' ? 'bg-green-100 text-green-700' :
                      'bg-blue-100 text-blue-700'
                }`}>
                  {request.status}
                </span>
                <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fixed Footer */}
      <div className="p-6 border-t border-gray-200 flex-shrink-0">
        <Link
          to="/groups/requests"
          className="text-xs text-blue-600 hover:text-blue-800 font-medium block text-center"
        >
          View All Group Requests →
        </Link>
      </div>
    </aside>
  );
};

export default GroupRequestsSidebar;
import React, { useState } from "react";
import { Link } from "react-router-dom";
import RequestCard from "./components/RequestCard"; // Import the new component

// Mock data with 6 diverse group requests
const initialMockRequests = [
  {
    id: 1,
    name: 'Sarah Chen',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    title: 'Review UI/UX Portfolio',
    message: 'Hi everyone! I hope this message finds you well. I need feedback on my UI/UX portfolio and would love to get insights from the community. I\'ve been working on redesigning mobile apps and would appreciate constructive criticism.',
    rate: '$30/hour',
    time: '2 hours ago',
    status: 'active',
    category: 'Design',
    urgency: 'medium',
    duration: '2-3 hours',
    groupName: 'Design Professionals',
    skills: ['UI/UX', 'Figma', 'User Research']
  },
  {
    id: 2,
    name: 'Alex Rodriguez',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    title: 'Help with React Hooks Implementation',
    message: 'Hello! I am struggling with custom hooks in React and would love some guidance from experienced developers. Specifically, I need help with useEffect dependencies and custom hook optimization.',
    rate: '$25/hour',
    time: '4 hours ago',
    status: 'pending',
    category: 'Programming',
    urgency: 'high',
    duration: '1-2 hours',
    groupName: 'React Developers',
    skills: ['React', 'JavaScript', 'Hooks']
  },
  {
    id: 3,
    name: 'Emily Johnson',
    avatar: 'https://randomuser.me/api/portraits/women/65.jpg',
    title: 'Brainstorm Content Marketing Ideas',
    message: 'Hi there! I\'m looking for someone to brainstorm some fresh content ideas for our B2B SaaS company. Need creative minds to help develop engaging social media and blog content strategies.',
    rate: '',
    time: '6 hours ago',
    status: 'accepted',
    category: 'Marketing',
    urgency: 'low',
    duration: '1 hour',
    groupName: 'Digital Marketers',
    skills: ['Content Strategy', 'Social Media', 'B2B Marketing']
  },
  {
    id: 4,
    name: 'Michael Thompson',
    avatar: 'https://randomuser.me/api/portraits/men/75.jpg',
    title: 'Database Architecture Review',
    message: 'Looking for an experienced database architect to review my PostgreSQL schema design for a fintech application. Need advice on optimization, indexing strategies, and scaling considerations.',
    rate: '$50/hour',
    time: '8 hours ago',
    status: 'active',
    category: 'Database',
    urgency: 'high',
    duration: '3-4 hours',
    groupName: 'Backend Engineers',
    skills: ['PostgreSQL', 'Database Design', 'Performance Optimization']
  },
  {
    id: 5,
    name: 'Jessica Wang',
    avatar: 'https://randomuser.me/api/portraits/women/89.jpg',
    title: 'Spanish Conversation Practice',
    message: 'Hola! I\'m preparing for a business trip to Madrid and need to practice conversational Spanish. Looking for native speakers or advanced learners to have regular practice sessions with.',
    rate: '$20/hour',
    time: '1 day ago',
    status: 'pending',
    category: 'Language',
    urgency: 'medium',
    duration: '1 hour/session',
    groupName: 'Language Exchange',
    skills: ['Spanish', 'Business Communication', 'Cultural Exchange']
  },
  {
    id: 6,
    name: 'David Kim',
    avatar: 'https://randomuser.me/api/portraits/men/56.jpg',
    title: 'Machine Learning Model Validation',
    message: 'Need assistance in validating my ML model for predicting customer churn. Looking for someone with experience in model evaluation, cross-validation techniques, and performance metrics interpretation.',
    rate: '$40/hour',
    time: '1 day ago',
    status: 'active',
    category: 'Data Science',
    urgency: 'medium',
    duration: '2-3 hours',
    groupName: 'Data Scientists',
    skills: ['Machine Learning', 'Python', 'Model Validation', 'Statistics']
  }
];

const AllGroupRequests = () => {
  // Use state to manage requests so they can be updated
  const [mockGroupRequests, setMockGroupRequests] = useState(initialMockRequests);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Handle request updates
  const handleRequestUpdate = (requestId, updatedRequest) => {
    setMockGroupRequests(prevRequests =>
      prevRequests.map(request =>
        request.id === requestId ? { ...updatedRequest, time: 'just updated' } : request
      )
    );
  };

  // Get unique categories
  const categories = ['all', ...new Set(mockGroupRequests.map(req => req.category.toLowerCase()))];
  const statuses = ['all', 'active', 'pending', 'accepted', 'completed', 'cancelled'];

  // Filter requests
  const filteredRequests = mockGroupRequests.filter(request => {
    const matchesCategory = selectedCategory === 'all' || request.category.toLowerCase() === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || request.status === selectedStatus;
    const matchesSearch = searchQuery === '' ||
      request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">All Group Requests</h1>
              <p className="mt-2 text-sm text-gray-600">
                Browse and respond to learning requests from all groups
              </p>
            </div>
            <Link
              to="/requests/create"
              className="bg-blue-600 text-white rounded-lg px-6 py-3 font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Request
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search requests, skills, or names..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {statuses.map(status => (
                  <option key={status} value={status}>
                    {status === 'all' ? 'All Statuses' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Showing {filteredRequests.length} of {mockGroupRequests.length} requests
          </p>
        </div>

        {/* Requests Grid - Using RequestCard component */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredRequests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onRequestUpdate={handleRequestUpdate}
            />
          ))}
        </div>

        {/* Empty State */}
        {filteredRequests.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No requests found</h3>
            <p className="text-gray-500 mb-4">
              Try adjusting your filters or search query to find more requests.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedStatus('all');
              }}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Pagination (for future implementation) */}
        {filteredRequests.length > 0 && (
          <div className="mt-8 flex justify-center">
            <div className="flex items-center gap-2">
              <button className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50" disabled>
                Previous
              </button>
              <span className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm">1</span>
              <button className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50" disabled>
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllGroupRequests;
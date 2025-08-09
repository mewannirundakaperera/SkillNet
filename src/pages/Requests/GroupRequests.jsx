import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import GroupRequestsNavbar from "../../components/Navbars/GroupRequestsNavbar";
import RequestNavbar from "../../components/Navbars/RequestNavbar";

const initialRequests = [
  {
    id: 1,
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
    id: 2,
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
    id: 3,
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
    id: 4,
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
  {
    id: 5,
    title: "Advanced Chemistry Lab",
    user: "Emily Davis",
    desc: "Organic chemistry synthesis experiments.",
    date: "2024-05-19",
    time: "15:00 - 17:00",
    participants: "2/4",
    status: "Open",
    avatar: "https://randomuser.me/api/portraits/women/5.jpg",
    subject: "Chemistry",
  },
  {
    id: 6,
    title: "History Exam Prep",
    user: "Frank Miller",
    desc: "World War II timeline and events review.",
    date: "2024-05-20",
    time: "11:00 - 13:00",
    participants: "6/6",
    status: "Full",
    avatar: "https://randomuser.me/api/portraits/men/6.jpg",
    subject: "History",
  },
  {
    id: 7,
    title: "Machine Learning Workshop",
    user: "Grace Lee",
    desc: "Introduction to neural networks and deep learning.",
    date: "2024-05-21",
    time: "16:00 - 18:00",
    participants: "3/5",
    status: "Open",
    avatar: "https://randomuser.me/api/portraits/women/7.jpg",
    subject: "CS",
  },
  {
    id: 8,
    title: "Statistics Study Session",
    user: "Henry Wilson",
    desc: "Probability distributions and hypothesis testing.",
    date: "2024-05-22",
    time: "13:00 - 15:00",
    participants: "1/4",
    status: "Open",
    avatar: "https://randomuser.me/api/portraits/men/8.jpg",
    subject: "Math",
  }
];

const featured = [
  { title: "Advanced Chemistry", desc: "Reviewing reaction mechanisms and organic synthesis.", joined: 4 },
  { title: "Microeconomics Principles", desc: "Supply and demand, market equilibrium, and elasticity.", joined: 3 },
  { title: "Introduction to Statistics", desc: "Understanding probability, distributions, and hypothesis testing.", joined: 5 },
  { title: "Art History: Renaissance", desc: "Analyzing key artists and movements of the Italian Renaissance.", joined: 2 },
];

const GroupRequests = () => {
  const [requests, setRequests] = useState(initialRequests);
  const [filteredRequests, setFilteredRequests] = useState(initialRequests);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("All Subjects");
  const [selectedStatus, setSelectedStatus] = useState("All Statuses");
  const [selectedTime, setSelectedTime] = useState("Any Time");

  // Get unique subjects for filter dropdown
  const subjects = ["All Subjects", ...new Set(initialRequests.map(req => req.subject))];

  // Get unique statuses for filter dropdown
  const statuses = ["All Statuses", ...new Set(initialRequests.map(req => req.status))];

  // Filter function
  useEffect(() => {
    let filtered = requests;

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(req =>
          req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          req.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
          req.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          req.user.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Subject filter
    if (selectedSubject !== "All Subjects") {
      filtered = filtered.filter(req => req.subject === selectedSubject);
    }

    // Status filter
    if (selectedStatus !== "All Statuses") {
      filtered = filtered.filter(req => req.status === selectedStatus);
    }

    // Time filter (simplified - you can enhance this based on your needs)
    if (selectedTime !== "Any Time") {
      const today = new Date();
      const requestDate = new Date();

      switch (selectedTime) {
        case "Today":
          filtered = filtered.filter(req => {
            const reqDate = new Date(req.date);
            return reqDate.toDateString() === today.toDateString();
          });
          break;
        case "This Week":
          const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(req => {
            const reqDate = new Date(req.date);
            return reqDate >= today && reqDate <= weekFromNow;
          });
          break;
        case "Next Week":
          const nextWeekStart = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
          const nextWeekEnd = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(req => {
            const reqDate = new Date(req.date);
            return reqDate >= nextWeekStart && reqDate <= nextWeekEnd;
          });
          break;
        default:
          break;
      }
    }

    setFilteredRequests(filtered);
  }, [searchQuery, selectedSubject, selectedStatus, selectedTime, requests]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedSubject("All Subjects");
    setSelectedStatus("All Statuses");
    setSelectedTime("Any Time");
  };

  // Calculate stats based on filtered results
  const calculateStats = () => {
    const total = filteredRequests.length;
    const pending = filteredRequests.filter(req => req.status === "Open").length;
    const completed = filteredRequests.filter(req => req.status === "Full").length;
    const joined = filteredRequests.reduce((acc, req) => {
      const [current, max] = req.participants.split('/').map(Number);
      return acc + current;
    }, 0);

    return { total, pending, completed, joined };
  };

  const stats = calculateStats();

  return (
      <>
        <GroupRequestsNavbar />
        <div className="min-h-screen bg-[#f8f9fb] flex">
          {/* Sidebar */}
          <RequestNavbar />

          {/* Main Content */}
          <main className="flex-1 p-8">
            {/* Title & Stats */}
            <h1 className="text-2xl font-bold mb-6">Group Requests</h1>
            <div className="flex gap-6 mb-8">
              <div className="bg-white rounded-lg p-6 flex-1 shadow-sm">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-gray-500 flex items-center gap-2">
                  Total Requests
                  <span className="text-blue-400">
                  <svg width="16" height="16" fill="currentColor">
                    <circle cx="8" cy="8" r="8"/>
                  </svg>
                </span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-6 flex-1 shadow-sm">
                <div className="text-2xl font-bold">{stats.pending}</div>
                <div className="text-gray-500 flex items-center gap-2">
                  Open Requests
                  <span className="text-yellow-400">
                  <svg width="16" height="16" fill="currentColor">
                    <circle cx="8" cy="8" r="8"/>
                  </svg>
                </span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-6 flex-1 shadow-sm">
                <div className="text-2xl font-bold">{stats.completed}</div>
                <div className="text-gray-500 flex items-center gap-2">
                  Full Requests
                  <span className="text-green-400">
                  <svg width="16" height="16" fill="currentColor">
                    <circle cx="8" cy="8" r="8"/>
                  </svg>
                </span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-6 flex-1 shadow-sm">
                <div className="text-2xl font-bold">{stats.joined}</div>
                <div className="text-gray-500 flex items-center gap-2">
                  Total Participants
                  <span className="text-purple-400">
                  <svg width="16" height="16" fill="currentColor">
                    <circle cx="8" cy="8" r="8"/>
                  </svg>
                </span>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-8">
              <input
                  type="text"
                  placeholder="Search by topic or subject..."
                  className="px-4 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm w-72"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select
                  className="px-3 py-2 border border-gray-200 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
              >
                {subjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
              <select
                  className="px-3 py-2 border border-gray-200 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
              >
                {statuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <select
                  className="px-3 py-2 border border-gray-200 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
              >
                <option value="Any Time">Any Time</option>
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="Next Week">Next Week</option>
              </select>
              <button
                  className="ml-auto text-gray-400 hover:text-blue-600 text-sm transition-colors"
                  onClick={clearFilters}
              >
                Clear Filters
              </button>
            </div>

            {/* Active Filters Display */}
            {(searchQuery || selectedSubject !== "All Subjects" || selectedStatus !== "All Statuses" || selectedTime !== "Any Time") && (
                <div className="mb-6 flex flex-wrap gap-2">
                  <span className="text-sm text-gray-600">Active filters:</span>
                  {searchQuery && (
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs flex items-center gap-1">
                  Search: "{searchQuery}"
                  <button onClick={() => setSearchQuery("")} className="text-blue-600 hover:text-blue-800">×</button>
                </span>
                  )}
                  {selectedSubject !== "All Subjects" && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs flex items-center gap-1">
                  Subject: {selectedSubject}
                        <button onClick={() => setSelectedSubject("All Subjects")} className="text-green-600 hover:text-green-800">×</button>
                </span>
                  )}
                  {selectedStatus !== "All Statuses" && (
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs flex items-center gap-1">
                  Status: {selectedStatus}
                        <button onClick={() => setSelectedStatus("All Statuses")} className="text-yellow-600 hover:text-yellow-800">×</button>
                </span>
                  )}
                  {selectedTime !== "Any Time" && (
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs flex items-center gap-1">
                  Time: {selectedTime}
                        <button onClick={() => setSelectedTime("Any Time")} className="text-purple-600 hover:text-purple-800">×</button>
                </span>
                  )}
                </div>
            )}

            {/* Results Summary */}
            <div className="mb-4 text-sm text-gray-600">
              Showing {filteredRequests.length} of {requests.length} requests
              {filteredRequests.length !== requests.length && " (filtered)"}
            </div>

            {/* Requests Grid */}
            {filteredRequests.length > 0 ? (
                <div className="grid grid-cols-4 gap-6 mb-12">
                  {filteredRequests.map((req) => (
                      <div key={req.id} className="bg-white rounded-lg p-5 shadow-sm flex flex-col justify-between min-h-[220px] hover:shadow-md transition-shadow">
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
                          <button className="bg-gray-100 rounded px-3 py-1 text-blue-600 font-medium text-sm hover:bg-gray-200 transition-colors">
                            View Details
                          </button>
                          {req.status === "Open" && (
                              <button className="bg-blue-600 text-white rounded px-3 py-1 font-medium text-sm hover:bg-blue-700 transition-colors">
                                Join
                              </button>
                          )}
                        </div>
                      </div>
                  ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                  <div className="text-gray-400 text-4xl mb-4">🔍</div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No requests found</h3>
                  <p className="text-gray-500 mb-4">
                    Try adjusting your filters or search terms to find what you're looking for.
                  </p>
                  <button
                      onClick={clearFilters}
                      className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 transition-colors"
                  >
                    Clear All Filters
                  </button>
                </div>
            )}

            {/* Featured Requests */}
            <div className="mb-12">
              <h2 className="text-lg font-bold mb-4">Featured Requests</h2>
              <div className="grid grid-cols-4 gap-6">
                {featured.map((f, idx) => (
                    <div key={idx} className="bg-white rounded-lg p-4 shadow-sm flex flex-col gap-2 hover:shadow-md transition-shadow">
                      <div className="font-semibold text-gray-800">{f.title}</div>
                      <div className="text-gray-500 text-xs">{f.desc}</div>
                      <div className="text-gray-400 text-xs">{f.joined} joined</div>
                    </div>
                ))}
              </div>
            </div>

            {/* Pagination */}
            <div className="flex justify-center items-center gap-2 mb-12">
              <button className="px-3 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors">
                &lt; Previous
              </button>
              {[1,2,3,4,5,10].map((n, i) => (
                  <button key={i} className={`px-3 py-1 rounded border border-gray-200 transition-colors ${n===1?"bg-blue-600 text-white":"text-gray-700 hover:bg-gray-100"}`}>
                    {n}
                  </button>
              ))}
              <button className="px-3 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors">
                Next &gt;
              </button>
            </div>

            {/* Footer */}
            <footer className="mt-12 text-center text-gray-400 text-sm">
              <div>Class Connect</div>
              <div className="mt-2">Stay updated with Class Connect</div>
              <form className="flex justify-center items-center gap-2 mt-2">
                <input type="email" placeholder="Enter your email" className="px-4 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                <button className="bg-blue-600 text-white rounded px-4 py-2 font-medium text-sm hover:bg-blue-700 transition-colors">
                  Subscribe
                </button>
              </form>
              <div className="mt-4">© 2023 Class Connect.</div>
            </footer>
          </main>
        </div>
      </>
  );
};

export default GroupRequests;
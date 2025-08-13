import React, { useState } from "react";

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
  High: "bg-red-900/30 text-red-400 border border-red-500/50",
  Medium: "bg-orange-900/30 text-orange-400 border border-orange-500/50",
  Low: "bg-green-900/30 text-green-400 border border-green-500/50",
};

const statusColor = {
  Completed: "text-green-400",
  "In Progress": "text-[#4299E1]",
  Pending: "text-yellow-400",
};

export default function RequestHistory() {
  const [search, setSearch] = useState("");

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155] relative overflow-hidden">
      {/* Educational Background Pattern */}
      <div className="absolute inset-0">
        {/* Geometric Shapes - Increased opacity and size for better visibility */}
        <div className="absolute top-10 left-10 w-80 h-80 bg-gradient-to-br from-[#3B82F6]/40 to-[#1D4ED8]/40 rounded-full blur-2xl"></div>
        <div className="absolute top-40 right-20 w-64 h-64 bg-gradient-to-br from-[#8B5CF6]/40 to-[#7C3AED]/40 rounded-full blur-2xl"></div>
        <div className="absolute bottom-20 left-1/4 w-48 h-48 bg-gradient-to-br from-[#10B981]/40 to-[#059669]/40 rounded-full blur-2xl"></div>
        
        {/* Additional geometric elements for more visual interest */}
        <div className="absolute top-1/3 left-1/6 w-32 h-32 bg-gradient-to-br from-[#F59E0B]/30 to-[#D97706]/30 rounded-full blur-xl"></div>
        <div className="absolute bottom-1/4 right-1/6 w-40 h-40 bg-gradient-to-br from-[#EC4899]/30 to-[#DB2777]/30 rounded-full blur-xl"></div>
        
        {/* Educational Icons Pattern - Increased opacity for better visibility */}
        <div className="absolute top-1/4 left-1/3 opacity-15">
          <svg className="w-32 h-32 text-[#3B82F6]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09v6.82L12 23 1 15.82V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9z"/>
          </svg>
        </div>
        <div className="absolute top-1/3 right-1/4 opacity-15">
          <svg className="w-28 h-28 text-[#8B5CF6]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6A4.997 4.997 0 0 1 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z"/>
          </svg>
        </div>
        <div className="absolute bottom-1/3 left-1/6 opacity-15">
          <svg className="w-20 h-20 text-[#10B981]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        
        {/* Additional educational icons for more visual richness */}
        <div className="absolute top-1/2 right-1/3 opacity-10">
          <svg className="w-24 h-24 text-[#F59E0B]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
          </svg>
        </div>
        <div className="absolute bottom-1/3 right-1/4 opacity-10">
          <svg className="w-16 h-16 text-[#EC4899]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1.08-1.36-1.9-1.36h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 p-8">
        <section className="flex flex-col gap-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Request History</h2>
            <div className="flex gap-2">
              <button className="btn-secondary px-3 py-2 text-sm">Export</button>
              <button className="btn-secondary px-3 py-2 text-sm">Filter</button>
              <button className="btn-secondary px-3 py-2 text-sm">Sort</button>
            </div>
          </div>

          <div className="mb-6">
            <input
              type="text"
              placeholder="Search requests by title, ID, or comment..."
              className="input-dark px-3 py-2 text-sm w-full"
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
                <div key={i} className="card-dark p-5 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-[#A0AEC0]">
                    <span>{r.id}</span>
                    <span className={`px-2 py-0.5 rounded font-semibold ${priorityColor[r.priority]}`}>
                      {r.priority}
                    </span>
                  </div>
                  <div className="font-semibold text-white text-base mb-1">{r.title}</div>
                  <div className="text-xs text-[#A0AEC0] mb-1">{r.date}</div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold ${statusColor[r.status]}`}>
                      {r.status}
                    </span>
                  </div>
                  <button className="text-xs text-[#A0AEC0] flex items-center gap-1 hover:text-[#4299E1] transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V10a2 2 0 012-2h2m5-6v6m0 0l-2-2m2 2l2-2" />
                    </svg>
                    {r.comments} Comments
                  </button>
                  <div className="flex gap-2 mt-2">
                    <button className="btn-secondary px-3 py-1 text-xs font-semibold">
                      View Details
                    </button>
                    <button className="btn-secondary px-3 py-1 text-xs font-semibold">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v.01M8 12v.01M12 12v.01M16 12v.01M20 12v.01" />
                      </svg>
                    </button>
                    <button className="btn-secondary px-3 py-1 text-xs font-semibold">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
          </div>

          {/* Pagination */}
          <div className="flex justify-center items-center gap-2 mt-8">
            <button className="btn-secondary px-3 py-1">
              &lt; Previous
            </button>
            <button className="px-3 py-1 rounded border border-[#4299E1] bg-[#4299E1] text-white hover:bg-[#3182CE] transition-colors">1</button>
            <button className="btn-secondary px-3 py-1">2</button>
            <button className="btn-secondary px-3 py-1">
              Next &gt;
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 text-center text-[#A0AEC0] text-sm">
                  <div className="text-white">Skill-Net</div>
        <div className="mt-2">© 2025 Skill-Net. All rights reserved.</div>
        </footer>
      </div>
    </div>
  );
}
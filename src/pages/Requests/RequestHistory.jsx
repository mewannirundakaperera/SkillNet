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
    <div className="min-h-screen bg-[#1A202C]">
      {/* Main Content */}
      <main className="flex-1 flex flex-col gap-8 p-8">
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
      </main>
    </div>
  );
}
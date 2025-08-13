import React, { useState } from "react";

export default function AcceptRequest() {
  const [proposedValue, setProposedValue] = useState(50);
  const [currency, setCurrency] = useState("USD");

  // Static teacher and availability data
  const teacher = {
    name: "Dr. Amelia Clark",
    avatar: "https://randomuser.me/api/portraits/women/65.jpg",
    rating: 4.8,
  };
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const slots = {
    Monday: ["10:00", "13:00", "16:00"],
    Tuesday: ["12:00", "16:00"],
    Wednesday: ["10:00", "13:00", "14:00"],
    Thursday: ["9:00", "10:00", "13:00", "14:00", "15:00"],
    Friday: ["10:00", "13:00", "14:00", "15:00", "16:00"],
    Saturday: ["9:00", "10:00", "12:00", "14:00", "16:00"],
  };

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 min-h-screen">
          <div className="card-dark shadow-xl w-full max-w-3xl mx-4 relative flex flex-col">
            {/* Close Button */}
            <button className="absolute top-4 right-4 text-[#A0AEC0] hover:text-white text-2xl transition-colors" aria-label="Close">
              &times;
            </button>
            {/* Modal Content */}
            <div className="p-8 pb-4">
              <h2 className="text-2xl font-bold mb-1 text-white">Accept New Request</h2>
              <p className="text-[#A0AEC0] mb-6">Review the request details and proposed value. You can directly accept or adjust the value before accepting.</p>
              <hr className="mb-6 border-[#4A5568]" />
              {/* Proposed Value */}
              <div className="mb-6">
                <label className="block font-medium mb-2 text-white">Proposed Value</label>
                <div className="flex gap-2 items-center">
                  <span className="text-[#A0AEC0]">USD</span>
                  <input
                    type="number"
                    min="0"
                    value={proposedValue}
                    onChange={e => setProposedValue(e.target.value)}
                    className="input-dark px-3 py-2 w-32"
                  />
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="input-dark px-2 py-2"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
                <div className="text-xs text-[#A0AEC0] mt-2">This value represents the requested compensation for the session. Adjust as necessary.</div>
              </div>
              {/* Teacher Availability Overview */}
              <div>
                <h3 className="font-semibold text-lg mb-1 text-white">Teacher Availability Overview</h3>
                <p className="text-xs text-[#A0AEC0] mb-3">Select a teacher from the list below to review their detailed availability for the upcoming week. Greyed-out slots are unavailable.</p>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-[#2D3748] rounded-lg border border-[#4A5568]">
                    <thead>
                      <tr>
                        <th className="text-left px-4 py-2 bg-[#4A5568] font-medium text-sm text-white">Teacher</th>
                        {days.map(day => (
                          <th key={day} className="text-center px-4 py-2 bg-[#4A5568] font-medium text-sm text-white">{day}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {/* Teacher Info */}
                        <td className="px-4 py-2 flex items-center gap-2 bg-[#2D3748]">
                          <img src={teacher.avatar} alt={teacher.name} className="w-10 h-10 rounded-full" />
                          <div>
                            <div className="font-semibold text-sm text-white">{teacher.name}</div>
                            <div className="flex items-center text-xs text-yellow-400 gap-1">
                              <span>★</span>
                              <span>{teacher.rating}</span>
                            </div>
                          </div>
                        </td>
                        {/* Availability Slots */}
                        {days.map(day => (
                          <td key={day} className="px-2 py-2 text-center align-top">
                            <div className="flex flex-col gap-2">
                              {slots[day].map(time => (
                                <span key={time} className="bg-yellow-900/30 text-yellow-300 rounded px-2 py-1 text-xs font-semibold inline-block border border-yellow-500/50">{time}</span>
                              ))}
                            </div>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            {/* Footer */}
            <footer className="text-xs text-[#A0AEC0] px-6 py-2 flex items-center gap-1 border-t border-[#4A5568] bg-[#2D3748] rounded-b-xl">
              Made with <span className="text-[#8B5CF6] font-bold">Visily</span>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}

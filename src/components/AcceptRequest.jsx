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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 min-h-screen">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 relative flex flex-col">
        {/* Close Button */}
        <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl" aria-label="Close">
          &times;
        </button>
        {/* Modal Content */}
        <div className="p-8 pb-4">
          <h2 className="text-2xl font-bold mb-1">Accept New Request</h2>
          <p className="text-gray-500 mb-6">Review the request details and proposed value. You can directly accept or adjust the value before accepting.</p>
          <hr className="mb-6" />
          {/* Proposed Value */}
          <div className="mb-6">
            <label className="block font-medium mb-2">Proposed Value</label>
            <div className="flex gap-2 items-center">
              <span className="text-gray-400">USD</span>
              <input
                type="number"
                min="0"
                value={proposedValue}
                onChange={e => setProposedValue(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="border border-gray-300 rounded px-2 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div className="text-xs text-gray-400 mt-2">This value represents the requested compensation for the session. Adjust as necessary.</div>
          </div>
          {/* Teacher Availability Overview */}
          <div>
            <h3 className="font-semibold text-lg mb-1">Teacher Availability Overview</h3>
            <p className="text-xs text-gray-500 mb-3">Select a teacher from the list below to review their detailed availability for the upcoming week. Greyed-out slots are unavailable.</p>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-gray-50 rounded-lg">
                <thead>
                  <tr>
                    <th className="text-left px-4 py-2 bg-gray-100 font-medium text-sm">Teacher</th>
                    {days.map(day => (
                      <th key={day} className="text-center px-4 py-2 bg-gray-100 font-medium text-sm">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {/* Teacher Info */}
                    <td className="px-4 py-2 flex items-center gap-2 bg-white">
                      <img src={teacher.avatar} alt={teacher.name} className="w-10 h-10 rounded-full" />
                      <div>
                        <div className="font-semibold text-sm">{teacher.name}</div>
                        <div className="flex items-center text-xs text-yellow-500 gap-1">
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
                            <span key={time} className="bg-yellow-100 text-gray-700 rounded px-2 py-1 text-xs font-semibold inline-block">{time}</span>
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
        <footer className="text-xs text-gray-400 px-6 py-2 flex items-center gap-1 border-t bg-white rounded-b-xl">
          Made with <span className="text-indigo-500 font-bold">Visily</span>
        </footer>
      </div>
    </div>
  );
}

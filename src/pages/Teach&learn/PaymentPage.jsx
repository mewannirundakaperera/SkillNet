import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function PaymentPage() {
  const [amount, setAmount] = useState(0);
  const collected = 450;
  const target = 1200;
  const remaining = target - collected;
  const percent = ((collected / target) * 100).toFixed(1);

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
          <li><Link to="/PaymentPage" className="text-indigo-600 font-semibold">Payment</Link></li>
          <li><Link to="/OnlineMeeting" className="hover:text-indigo-600">Online Meeting</Link></li>
        </ul>
        <div className="flex items-center gap-4">
          <img src="https://randomuser.me/api/portraits/men/40.jpg" alt="User" className="h-8 w-8 rounded-full" />
        </div>
      </nav>
      <main className="flex-1 flex flex-col gap-8 items-center py-8">
        <h1 className="text-3xl font-bold mb-4">Secure Payment</h1>
        <div className="flex gap-8 w-full max-w-5xl">
          {/* Payment Progress */}
          <section className="flex-1 bg-white rounded-xl shadow p-6 mb-2">
            <div className="flex items-center gap-4 mb-2">
              <img src="https://randomuser.me/api/portraits/women/32.jpg" alt="Dr. Evelyn Reed" className="w-14 h-14 rounded-full object-cover" />
              <div>
                <div className="font-bold text-lg">Payment for Dr. Evelyn Reed</div>
                <div className="text-xs text-gray-400">Helping Dr. Evelyn Reed reach their teaching goal!</div>
              </div>
            </div>
            <div className="mb-2 font-semibold text-blue-700">Collected: ${collected.toFixed(2)} / ${target.toFixed(2)} <span className="ml-2 text-xs text-gray-400">{percent}%</span></div>
            <div className="w-full h-2 bg-gray-200 rounded mb-2">
              <div className="h-2 bg-blue-600 rounded" style={{ width: `${percent}%` }}></div>
            </div>
            <div className="text-xs text-gray-400">Your support directly empowers Dr. Evelyn Reed's educational efforts.</div>
          </section>
          {/* Payment Overview */}
          <aside className="w-96 bg-white rounded-xl shadow p-6 flex flex-col gap-4">
            <div className="font-semibold mb-2">Payment Overview for Dr. Evelyn Reed</div>
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between"><span>Target Value:</span> <span className="font-semibold">${target.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Collected So Far:</span> <span className="text-blue-600 font-semibold">${collected.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Remaining:</span> <span className="text-red-500 font-semibold">${remaining.toFixed(2)}</span></div>
            </div>
            <div className="mt-4">
              <div className="font-semibold mb-1">Recent Contributions <span className="text-xs">(▼)</span></div>
              <div className="text-xs text-gray-400">All contributions are securely processed.</div>
            </div>
          </aside>
        </div>
        {/* Contribution Form */}
        <section className="w-full max-w-5xl bg-white rounded-xl shadow p-6 mb-2 flex flex-col gap-4">
          <h2 className="font-semibold mb-2">Make a Contribution</h2>
          <div className="mb-2 text-sm text-gray-500">Enter an amount or select a preset to contribute.</div>
          <div className="flex gap-4 items-end mb-2">
            <div className="flex-1">
              <label className="block text-xs font-semibold mb-1">Custom Amount</label>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">$</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="border rounded px-3 py-2 text-sm w-full"
                  placeholder="0.00"
                />
              </div>
              <div className="text-xs text-gray-400 mt-1">Minimum contribution: $0.00</div>
            </div>
            <button className="bg-blue-200 text-white rounded px-4 py-2 font-semibold w-64" disabled={amount <= 0}>Contribute Custom Amount</button>
          </div>
          <div className="flex gap-4">
            {[10, 25, 50].map((amt, i) => (
              <button key={i} className="border rounded px-6 py-2 font-semibold text-sm flex-1 hover:bg-gray-100">${amt.toFixed(2)}</button>
            ))}
            <button className="border rounded px-6 py-2 font-semibold text-sm flex-1 hover:bg-gray-100">Contribute Remaining (${remaining.toFixed(2)})</button>
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

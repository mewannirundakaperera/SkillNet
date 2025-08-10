import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function PaymentPage() {
  const [amount, setAmount] = useState(0);
  const collected = 450;
  const target = 1200;
  const remaining = target - collected;
  const percent = ((collected / target) * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-[#1A202C] flex flex-col">
      {/* Top Navbar */}
      <nav className="card-dark border-b border-[#4A5568] flex items-center justify-between px-8 py-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg text-[#4299E1]">Student Scheduler</span>
        </div>
        <ul className="flex gap-6 text-[#E0E0E0] font-medium">
          <li><Link to="/SelectTeacher" className="hover:text-[#4299E1] transition-colors">Select Teacher</Link></li>
          <li><Link to="/TimeSlotSelection" className="hover:text-[#4299E1] transition-colors">Time Slot Selection</Link></li>
          <li><Link to="/PaymentPage" className="text-[#4299E1] font-semibold">Payment</Link></li>
          <li><Link to="/OnlineMeeting" className="hover:text-[#4299E1] transition-colors">Online Meeting</Link></li>
        </ul>
        <div className="flex items-center gap-4">
          <img src="https://randomuser.me/api/portraits/men/40.jpg" alt="User" className="h-8 w-8 rounded-full" />
        </div>
      </nav>
      <main className="flex-1 flex flex-col gap-8 items-center py-8">
        <h1 className="text-3xl font-bold mb-4 text-white">Secure Payment</h1>
        <div className="flex gap-8 w-full max-w-5xl">
          {/* Payment Progress */}
          <section className="flex-1 card-dark rounded-xl shadow p-6 mb-2">
            <div className="flex items-center gap-4 mb-2">
              <img src="https://randomuser.me/api/portraits/women/32.jpg" alt="Dr. Evelyn Reed" className="w-14 h-14 rounded-full object-cover" />
              <div>
                <div className="font-bold text-lg text-white">Payment for Dr. Evelyn Reed</div>
                <div className="text-xs text-[#A0AEC0]">Helping Dr. Evelyn Reed reach their teaching goal!</div>
              </div>
            </div>
            <div className="mb-2 font-semibold text-[#4299E1]">Collected: ${collected.toFixed(2)} / ${target.toFixed(2)} <span className="ml-2 text-xs text-[#A0AEC0]">{percent}%</span></div>
            <div className="w-full h-2 bg-[#4A5568] rounded mb-2">
              <div className="h-2 bg-[#4299E1] rounded" style={{ width: `${percent}%` }}></div>
            </div>
            <div className="text-xs text-[#A0AEC0]">Your support directly empowers Dr. Evelyn Reed's educational efforts.</div>
          </section>
          {/* Payment Overview */}
          <aside className="w-96 card-dark rounded-xl shadow p-6 flex flex-col gap-4">
            <div className="font-semibold mb-2 text-white">Payment Overview for Dr. Evelyn Reed</div>
            <div className="flex flex-col gap-1 text-sm text-[#E0E0E0]">
              <div className="flex justify-between"><span>Target Value:</span> <span className="font-semibold text-white">${target.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Collected So Far:</span> <span className="text-[#4299E1] font-semibold">${collected.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Remaining:</span> <span className="text-red-400 font-semibold">${remaining.toFixed(2)}</span></div>
            </div>
            <div className="mt-4">
              <div className="font-semibold mb-1 text-white">Recent Contributions <span className="text-xs text-[#A0AEC0]">(▼)</span></div>
              <div className="text-xs text-[#A0AEC0]">All contributions are securely processed.</div>
            </div>
          </aside>
        </div>
        {/* Contribution Form */}
        <section className="w-full max-w-5xl card-dark rounded-xl shadow p-6 mb-2 flex flex-col gap-4">
          <h2 className="font-semibold mb-2 text-white">Make a Contribution</h2>
          <div className="mb-2 text-sm text-[#A0AEC0]">Enter an amount or select a preset to contribute.</div>
          <div className="flex gap-4 items-end mb-2">
            <div className="flex-1">
              <label className="block text-xs font-semibold mb-1 text-white">Custom Amount</label>
              <div className="flex items-center gap-2">
                <span className="text-[#A0AEC0]">$</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="input-dark border border-[#4A5568] rounded px-3 py-2 text-sm w-full focus:ring-2 focus:ring-[#4299E1]"
                  placeholder="0.00"
                />
              </div>
              <div className="text-xs text-[#A0AEC0] mt-1">Minimum contribution: $0.00</div>
            </div>
            <button className="btn-gradient-primary px-4 py-2 font-semibold w-64 disabled:opacity-50" disabled={amount <= 0}>Contribute Custom Amount</button>
          </div>
          <div className="flex gap-4">
            {[10, 25, 50].map((amt, i) => (
              <button key={i} className="border border-[#4A5568] rounded px-6 py-2 font-semibold text-sm flex-1 hover:bg-[#2D3748] transition-colors text-[#E0E0E0]">${amt.toFixed(2)}</button>
            ))}
            <button className="border border-[#4A5568] rounded px-6 py-2 font-semibold text-sm flex-1 hover:bg-[#2D3748] transition-colors text-[#E0E0E0]">Contribute Remaining (${remaining.toFixed(2)})</button>
          </div>
        </section>
      </main>
      {/* Footer */}
      <footer className="mt-12 text-center text-[#A0AEC0] text-sm pb-4">
        <div>Student Scheduler</div>
        <div className="mt-2">© 2024 Student Scheduler.</div>
      </footer>
    </div>
  );
}

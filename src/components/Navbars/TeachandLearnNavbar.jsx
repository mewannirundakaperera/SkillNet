import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function TeachandLearnNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    
        <nav className="bg-white border-b flex items-center justify-between px-8 py-3">
        <div className="flex items-center gap-2">
          <Link to= "/">
          <span className="font-bold text-lg text-indigo-700">Student Scheduler</span>
          </Link>
        </div>
        <ul className="flex gap-6 text-gray-700 font-medium">
          <li><Link to="/SelectTeacher" className="hover:text-indigo-600">Select Teacher</Link></li>
          <li><Link to="/TimeSlotSelection" className="hover:text-indigo-600">Time Slot Selection</Link></li>
          <li><Link to="/PaymentPage" className="hover:text-indigo-600">Payment</Link></li>
          <li><Link to="/OnlineMeeting" className="hover:text-indigo-600">Online Meeting</Link></li>
        </ul>
        <div className="flex items-center gap-4">
          <img src="https://randomuser.me/api/portraits/men/40.jpg" alt="User" className="h-8 w-8 rounded-full" />
        </div>
      </nav>
  );
}

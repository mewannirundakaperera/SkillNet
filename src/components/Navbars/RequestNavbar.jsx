import React from "react";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/StudentConnect", label: "Dashboard" },
  { to: "/OneToOneRequests", label: "1-to-1 Requests" },
  { to: "/RequestHistory", label: "Request History" },
  { to: "/MyRequests", label: "My Requests" },
  { to: "/Profile", label: "Profile" },
];

export default function RequestNavbar() {
  return (
    <aside className="w-[220px] bg-white border-r border-gray-200 min-h-screen py-8 px-4 flex flex-col gap-2">
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `px-4 py-2 rounded-lg font-medium text-left ${
                isActive
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-700 hover:bg-gray-100"
              }`
            }
            end
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
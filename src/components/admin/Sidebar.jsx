// src/components/Sidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import {
  FiHome,
  FiUsers,
  FiBarChart2,
  FiClipboard,
  FiSettings,
  FiLogOut,
} from "react-icons/fi";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: FiHome },
  { to: "/leads", label: "Leads", icon: FiUsers },
  { to: "/reports", label: "Reports", icon: FiBarChart2 },
  { to: "/tasks", label: "Tasks", icon: FiClipboard },
  { to: "/settings", label: "Settings", icon: FiSettings },
];

export default function Sidebar({ open, onClose }) {
  return (
    <aside
      className={`transform transition-transform lg:translate-x-0 static ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
      aria-label="Sidebar"
    >
      {/* Brand header */}
      <div className="flex items-center gap-3 px-5 h-16" >
      <img src="/img/favlogo.svg" alt="" />
      </div>

      {/* Nav */}
      <nav className="px-3 py-4 overflow-y-auto h-[calc(100%-4rem)]">
        <ul className="space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                onClick={onClose}
                className={({ isActive }) =>
                  [
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    isActive
                      ? "bg-[#f3ecff] text-[#5a1ea6]"
                      : "text-gray-700 hover:bg-gray-100",
                  ].join(" ")
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={[
                        "text-[18px]",
                        isActive ? "text-[#7d3bd6]" : "text-gray-500 group-hover:text-gray-700",
                      ].join(" ")}
                    />
                    {/* <span>{label}</span> */}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Bottom action */}
        <div className="mt-6 border-t pt-4">
          <button className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-100">
            <FiLogOut className="text-[18px]" />
          
          </button>
        </div>
      </nav>
    </aside>
  );
}

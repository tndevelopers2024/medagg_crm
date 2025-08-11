// src/components/Topbar.jsx
import React, { useState } from "react";
import { FiMenu, FiSearch, FiBell, FiChevronDown } from "react-icons/fi";

export default function Topbar({ onMenu }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 bg-[#f6f3f8]/80 backdrop-blur">
      <div className="h-16 flex items-center gap-3 px-4 md:px-6">
        {/* Mobile menu button */}
        <button
          onClick={onMenu}
          className="lg:hidden p-2 rounded-lg hover:bg-white"
          aria-label="Open sidebar"
        >
          <FiMenu className="text-[20px]" />
        </button>

        {/* Search */}
        <div className="flex-1 max-w-xl">
          <label className="relative block">
            <span className="absolute inset-y-0 left-3 grid place-items-center">
              <FiSearch className="text-gray-400" />
            </span>
            <input
              type="search"
              placeholder="Search leads, tasks, reports…"
              className="w-full rounded-xl bg-white pl-10 pr-3 py-2.5 text-sm ring-1 ring-gray-200 focus:ring-[#8c3ed8] outline-none"
            />
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto">
          <button className="relative p-2 rounded-lg hover:bg-white" aria-label="Notifications">
            <FiBell className="text-[20px]" />
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#ff2e6e]" />
          </button>

          {/* Profile menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((s) => !s)}
              className="flex items-center gap-2 rounded-xl bg-white px-2.5 py-1.5 ring-1 ring-gray-200 hover:ring-gray-300"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <img
                src="https://i.pravatar.cc/32?img=5"
                alt="User"
                className="h-7 w-7 rounded-full"
              />
              <span className="hidden sm:block text-sm font-medium">Alex</span>
              <FiChevronDown className="text-gray-500" />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-44 rounded-xl bg-white shadow-lg ring-1 ring-black/5 overflow-hidden"
              >
                <a className="block px-3 py-2 text-sm hover:bg-gray-50" href="#">
                  Profile
                </a>
                <a className="block px-3 py-2 text-sm hover:bg-gray-50" href="#">
                  Settings
                </a>
                <a className="block px-3 py-2 text-sm text-red-600 hover:bg-red-50" href="#">
                  Logout
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

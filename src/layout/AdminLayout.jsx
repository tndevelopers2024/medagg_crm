// src/layout/AdminLayout.jsx
import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/admin/Sidebar";
import Topbar from "../components/admin/Topbar";
import { TopbarTitleProvider } from "../contexts/TopbarTitleContext";

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <TopbarTitleProvider>
      <div className="min-h-screen bg-[#f6f3f8] text-gray-800 flex">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <button
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          />
        )}

        {/* Desktop sidebar (icon rail) */}
        <div className="hidden lg:block sticky top-0 h-screen bg-white border-r border-gray-200 shadow-sm w-[72px]">
          <Sidebar open onClose={() => {}} />
        </div>

        {/* Mobile sidebar (off-canvas) */}
        <div
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 shadow-sm lg:hidden transform transition-transform ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </div>

        {/* Main area */}
        <div className="flex-1 min-w-0">
          <Topbar onMenu={() => setSidebarOpen(true)} />
          <main className="p-4 md:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </TopbarTitleProvider>
  );
}

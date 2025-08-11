// src/pages/Dashboard.jsx
import React from "react";
import { FiTrendingUp, FiUsers, FiClock, FiCheckCircle } from "react-icons/fi";

const stats = [
  {
    title: "New Leads",
    value: "1,248",
    delta: "+12%",
    icon: <FiUsers />,
    chip: "Today",
  },
  {
    title: "Conversion Rate",
    value: "28.4%",
    delta: "+2.1%",
    icon: <FiTrendingUp />,
    chip: "Weekly",
  },
  {
    title: "Avg. Response",
    value: "1h 12m",
    delta: "-9m",
    icon: <FiClock />,
    chip: "This month",
  },
  {
    title: "Closed Deals",
    value: "87",
    delta: "+6",
    icon: <FiCheckCircle />,
    chip: "Quarter",
  },
];

const leads = [
  { name: "Rohit Sharma", email: "rohit@alpha.in", stage: "Qualified", owner: "Aditi", score: 86 },
  { name: "Sneha Iyer", email: "sneha@beta.co", stage: "New", owner: "Jacob", score: 62 },
  { name: "Mohammed Ali", email: "ali@gamma.com", stage: "Contacted", owner: "Kiran", score: 74 },
  { name: "Divya Rao", email: "divya@delta.io", stage: "Proposal", owner: "Aditi", score: 91 },
];

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#3b0d66]">Dashboard</h1>
          <p className="text-sm text-gray-500">Your pipeline at a glance</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <button className="rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-gray-200 hover:bg-gray-50">
            Export
          </button>
          <button className="rounded-xl bg-gradient-to-r from-[#ff2e6e] to-[#ff5aa4] px-4 py-2 text-sm font-semibold text-white">
            + New Lead
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <article
            key={s.title}
            className="rounded-2xl bg-white p-4 ring-1 ring-gray-200 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="p-2 rounded-xl bg-[#f3ecff] text-[#7d3bd6] text-[18px]">
                {s.icon}
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100">{s.chip}</span>
            </div>
            <div className="mt-3">
              <div className="text-sm text-gray-500">{s.title}</div>
              <div className="mt-1 flex items-baseline gap-2">
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs font-medium text-emerald-600">{s.delta}</div>
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* Charts + list */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart placeholder 1 */}
        <div className="rounded-2xl bg-white p-4 ring-1 ring-gray-200 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Performance Overview</h3>
            <span className="text-xs text-gray-500">Last 30 days</span>
          </div>
          <div className="mt-4 h-56 rounded-xl bg-[linear-gradient(180deg,rgba(141,62,216,0.14),rgba(141,62,216,0.04))] ring-1 ring-[#8c3ed8]/20 grid place-items-center text-sm text-gray-500">
            {/* Drop your actual chart here (Recharts/Chart.js). */}
            Chart Placeholder
          </div>
        </div>

        {/* Chart placeholder 2 */}
        <div className="rounded-2xl bg-white p-4 ring-1 ring-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Lead Sources</h3>
            <span className="text-xs text-gray-500">This week</span>
          </div>
          <div className="mt-4 h-56 rounded-xl bg-[conic-gradient(from_180deg_at_50%_50%,#ff2e6e_0_25%,#8c3ed8_25%_55%,#3a77ff_55%_100%)] grid place-items-center text-white/90 text-sm">
            Pie Placeholder
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <h3 className="font-semibold">Recent Leads</h3>
          <button className="text-sm text-[#7d3bd6] hover:underline">View all</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left font-medium px-4 py-3">Lead</th>
                <th className="text-left font-medium px-4 py-3">Email</th>
                <th className="text-left font-medium px-4 py-3">Stage</th>
                <th className="text-left font-medium px-4 py-3">Owner</th>
                <th className="text-left font-medium px-4 py-3">Score</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l, i) => (
                <tr key={i} className="border-t">
                  <td className="px-4 py-3 font-medium">{l.name}</td>
                  <td className="px-4 py-3 text-gray-600">{l.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                        l.stage === "Qualified"
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : l.stage === "New"
                          ? "bg-blue-50 text-blue-700 ring-blue-200"
                          : l.stage === "Proposal"
                          ? "bg-violet-50 text-violet-700 ring-violet-200"
                          : "bg-amber-50 text-amber-700 ring-amber-200"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {l.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3">{l.owner}</td>
                  <td className="px-4 py-3 font-semibold">{l.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

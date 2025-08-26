// src/pages/Callers.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import { getAllUsers, fetchAllLeads } from "../../../utils/api";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";

const fmtAgo = (d) => {
  if (!d) return "—";
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hrs ago`;
  const dd = Math.floor(h / 24);
  return `${dd}d ago`;
};

const avatarFor = (user) =>
  user?.avatar ||
  user?.photo ||
  (user?.email
    ? `https://api.dicebear.com/7.x/initials/svg?radius=50&seed=${encodeURIComponent(user.email)}`
    : `https://i.pravatar.cc/40?u=${encodeURIComponent(user?.name || "user")}`);

export default function Callers() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [callers, setCallers] = useState([]);
  const [leads, setLeads] = useState([]);
 usePageTitle("Callers Lists", "");
  // ui state
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState("leadsDesc"); // leadsDesc | nameAsc | uncontactedDesc | updatedDesc
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [usersRes, leadsRes] = await Promise.all([
          getAllUsers({ role: "caller" }),
          fetchAllLeads(),
        ]);
        if (!mounted) return;
        setCallers(usersRes); // already normalized to {id, name, email, role, phone}
        setLeads(leadsRes?.leads || []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // aggregate per caller
  const rows = useMemo(() => {
    const map = new Map();
    callers.forEach((c) =>
      map.set(c.id, {
        id: c.id,
        name: c.name || "—",
        email: c.email || "—",
        phone: c.phone || "—",
        avatar: avatarFor(c),
        leads: 0,
        uncontacted: 0,
        lastUpdate: null,
      })
    );

    for (const ld of leads) {
      const cid = ld.assignedTo;
      if (!cid || !map.has(cid)) continue;
      const item = map.get(cid);
      item.leads += 1;
      if ((ld.callCount ?? 0) === 0) item.uncontacted += 1;
      const last =
        (ld.lastCallAt && new Date(ld.lastCallAt)) ||
        (ld.updatedAt && new Date(ld.updatedAt)) ||
        (ld.createdAt && new Date(ld.createdAt)) ||
        (ld.createdTime && new Date(ld.createdTime));
      if (last && (!item.lastUpdate || last > item.lastUpdate)) item.lastUpdate = last;
    }

    return Array.from(map.values());
  }, [callers, leads]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let out = rows.filter(
      (r) =>
        !s ||
        r.name.toLowerCase().includes(s) ||
        r.email.toLowerCase().includes(s) ||
        String(r.phone).toLowerCase().includes(s)
    );
    out.sort((a, b) => {
      if (sortBy === "nameAsc") return a.name.localeCompare(b.name);
      if (sortBy === "uncontactedDesc") return b.uncontacted - a.uncontacted;
      if (sortBy === "updatedDesc")
        return (b.lastUpdate?.getTime() || 0) - (a.lastUpdate?.getTime() || 0);
      return b.leads - a.leads; // leadsDesc default
    });
    return out;
  }, [rows, q, sortBy]);

  useEffect(() => setPage(1), [q, sortBy, pageSize]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const pageRows = filtered.slice(start, end);

  return (
    <div className="space-y-6">
     

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, phone…"
            className="w-72 rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-violet-400"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-600">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="leadsDesc">Leads (high → low)</option>
            <option value="nameAsc">Name (A → Z)</option>
            <option value="uncontactedDesc">Uncontacted (high → low)</option>
            <option value="updatedDesc">Last update (newest)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <section className="rounded-2xl bg-white p-8 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className=" text-gray-600">
              <tr>
                <th className="text-left text-[16px] font-medium px-4 py-4">Caller</th>
                <th className="text-left text-[16px] font-medium px-4 py-4">Email</th>
                <th className="text-left text-[16px] font-medium px-4 py-4">Phone</th>
                <th className="text-left text-[16px] font-medium px-4 py-4">Assigned Leads</th>
                <th className="text-left text-[16px] font-medium px-4 py-4">Uncontacted</th>
                <th className="text-left text-[16px] font-medium px-4 py-4">Last Update</th>
                <th className="text-left text-[16px] font-medium px-4 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((c) => (
                <tr key={c.id} className="border-b last:border-b-0 border-[#ccc] hover:bg-gray-50/50">
                  <td className="px-4 py-4">
                    {/* Name/avatar now navigates to the caller dashboard */}
                    <Link
                      to={`/callers/${encodeURIComponent(c.id)}`}
                      className="flex items-center gap-3 group"
                    >
                      <img
                        src={c.avatar}
                        alt={c.name}
                        className="h-9 w-9 rounded-full ring-1 ring-gray-200 group-hover:ring-[#7d3bd6] transition"
                      />
                      <div>
                        <div className="font-medium text-[#3b0d66] group-hover:underline">
                          {c.name}
                        </div>
                        <div className="text-[11px] text-gray-500">Caller</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-gray-700">{c.email}</td>
                  <td className="px-4 py-4 text-gray-700">{c.phone}</td>
                  <td className="px-4 py-4 font-semibold">{c.leads}</td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                      {c.uncontacted}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-gray-600">{fmtAgo(c.lastUpdate)}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/callers/${encodeURIComponent(c.id)}`}
                        className="rounded-xl bg-white px-3 py-1.5 text-xs ring-1 ring-gray-200 hover:bg-gray-50"
                        title="Open caller dashboard"
                      >
                        View
                      </Link>
                      <button
                        onClick={() =>
                          navigate(`/admin/leads?callerId=${encodeURIComponent(c.id)}`)
                        }
                        className="rounded-xl bg-white px-3 py-1.5 text-xs ring-1 ring-gray-200 hover:bg-gray-50"
                        title="View this caller's leads"
                      >
                        View Leads
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && pageRows.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={7}>
                    No callers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white">
          <div className="text-xs text-gray-500">
            Showing <span className="font-medium">{total ? start + 1 : 0}</span>–
            <span className="font-medium">{end}</span> of{" "}
            <span className="font-medium">{total}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-600">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-2 py-1.5 disabled:opacity-50"
            >
              <FiChevronLeft />
            </button>
            <span className="text-xs">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-2 py-1.5 disabled:opacity-50"
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

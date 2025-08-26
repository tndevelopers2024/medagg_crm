// src/pages/leads/LeadsList.jsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  FiChevronLeft,
  FiChevronDown,
  FiSearch,
  FiDownload,
  FiFilter,
  FiUsers,
  FiPlus,
} from "react-icons/fi";
import { FaFacebook } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getMe,
  fetchAssignedLeads,
  fetchAllLeads,
  fetchLeadsByDate,
} from "../../../utils/api";
// ---------- helpers ----------
const useQuery = () => new URLSearchParams(useLocation().search);
const cls = (...c) => c.filter(Boolean).join(" ");
const parseDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(+d) ? null : d;
};
const startOfDay = (d = new Date()) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d = new Date()) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const isToday = (d) =>
  d && d >= startOfDay(new Date()) && d <= endOfDay(new Date());

const readField = (fieldData = [], keys = []) => {
  for (const f of fieldData) {
    const k = (f?.name || "").toLowerCase().replace(/\s+/g, "_");
    if (keys.includes(k)) {
      const v = Array.isArray(f?.values) ? f.values[0] : f?.values || f?.value || "";
      if (v) return String(v);
    }
  }
  return "";
};

const normStatus = (s) => {
  const v = (s || "").toLowerCase().trim();
  if (!v) return "new";
  if (["new", "new_lead", "new lead"].includes(v)) return "new";
  if (["recapture", "re-capture"].includes(v)) return "recapture";
  if (["hot", "hot lead"].includes(v)) return "hot";
  if (["hot-ip", "hot ip"].includes(v)) return "hot-ip";
  if (["prospective", "prospect"].includes(v)) return "prospective";
  if (["dnp", "do not proceed"].includes(v)) return "dnp";
  return v;
};

const pillTone = {
  new: "bg-violet-50 text-violet-700",
  recapture: "bg-amber-50 text-amber-700",
  hot: "bg-rose-50 text-rose-700",
  "hot-ip": "bg-emerald-50 text-emerald-700",
  prospective: "bg-sky-50 text-sky-700",
  dnp: "bg-gray-100 text-gray-700",
};

const toCSV = (rows = []) => {
  const header = [
    "Lead Name",
    "Phone",
    "Source",
    "Status",
    "Age",
    "Location",
    "Procedure",
    "Created Time",
  ];
  const lines = rows.map((r) => {
    const fd = r.fieldData || [];
    const name = readField(fd, ["full_name", "name"]);
    const phone =
      readField(fd, ["phone_number", "phone", "mobile", "contact"]) || "";
    const source = readField(fd, ["source", "campaign"]) || "Meta Ads";
    const status = normStatus(
      readField(fd, ["lead_status", "status", "bucket"])
    );
    const age = readField(fd, ["age"]);
    const location = readField(fd, ["city", "location"]);
    const procedure = readField(fd, ["procedure", "treatment"]);
    const created = r.createdTime || "";
    return [name, phone, source, status, age, location, procedure, created]
      .map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`)
      .join(",");
  });
  return [header.join(","), ...lines].join("\n");
};

// ---------- row ----------
const LeadRow = ({ lead }) => {
  const fd = lead.fieldData || [];
  const name = readField(fd, ["full_name", "name"]) || "—";
  const phone =
    readField(fd, ["phone_number", "phone", "mobile", "contact"]) || "—";
  const source = readField(fd, ["source"]) || "Meta Ads";
  const status = normStatus(readField(fd, ["lead_status", "status", "bucket"]));
  const age = readField(fd, ["age"]) || "—";
  const location = readField(fd, ["city", "location"]) || "—";
  const procedure = readField(fd, ["procedure", "treatment"]) || "—";
const navigate = useNavigate();
  return (
    <div
    onClick={() => navigate(`/caller/leads/${lead.id}`)} // or /admin/leads/:id based on role
    className="grid grid-cols-12 items-center gap-3 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50"
  >
      <div className="col-span-3">
        <p className="text-sm text-gray-900">{name}</p>
      </div>
      <div className="col-span-2">
        <p className="text-sm text-gray-900">{phone}</p>
      </div>
      <div className="col-span-2 flex items-center gap-2">
        <span className="text-[#1977f3]"><FaFacebook /></span>
        <p className="text-sm text-gray-900">{source}</p>
      </div>
      <div className="col-span-2">
        <span className={cls("px-2.5 py-1 text-xs rounded-full", pillTone[status] || pillTone.new)}>
          {status[0].toUpperCase() + status.slice(1)}
        </span>
      </div>
      <div className="col-span-1">
        <p className="text-sm text-gray-900">{age}</p>
      </div>
      <div className="col-span-1">
        <p className="text-sm text-gray-900 truncate">{location}</p>
      </div>
      <div className="col-span-12 mt-1 md:mt-0 md:col-span-12 lg:col-span-12 xl:col-span-12">
        <p className="text-xs text-gray-500">{procedure}</p>
      </div>
    </div>
  );
};

// ---------- page ----------
export default function LeadsList() {
  const navigate = useNavigate();
  const q = useQuery();

  // read filters from URL
  const dateFilter = (q.get("date") || "today").toLowerCase(); // today | all | yyyy-mm-dd
  const statusFilter = (q.get("status") || "new").toLowerCase(); // new|recapture|hot|...
  const searchQ = (q.get("q") || "").trim();

  const [me, setMe] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const user = await getMe();
      setMe(user);

      let data = [];
      if (user.role === "admin") {
        if (dateFilter === "today") {
          const res = await fetchLeadsByDate(
            new Date().toISOString().slice(0, 10)
          );
          data = res.leads;
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateFilter)) {
          const res = await fetchLeadsByDate(dateFilter);
          data = res.leads;
        } else {
          const res = await fetchAllLeads();
          data = res.leads;
        }
      } else {
        // caller
        const res = await fetchAssignedLeads();
        data = res.leads || [];
        if (dateFilter === "today") {
          data = data.filter((l) => isToday(parseDate(l.createdTime)));
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateFilter)) {
          const d = dateFilter;
          data = data.filter((l) => d === (l.createdTime || "").slice(0, 10));
        }
      }

      setRows(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  const filtered = useMemo(() => {
    const byStatus = rows.filter((r) => {
      const st = normStatus(readField(r.fieldData, ["lead_status", "status", "bucket"]));
      return statusFilter ? st === statusFilter : true;
    });

    const bySearch = !searchQ
      ? byStatus
      : byStatus.filter((r) => {
          const fd = r.fieldData || [];
          const name = (readField(fd, ["full_name", "name"]) || "").toLowerCase();
          const phone =
            (readField(fd, ["phone_number", "phone", "mobile", "contact"]) || "").toLowerCase();
          const proc = (readField(fd, ["procedure", "treatment"]) || "").toLowerCase();
          return (
            name.includes(searchQ.toLowerCase()) ||
            phone.includes(searchQ.toLowerCase()) ||
            proc.includes(searchQ.toLowerCase())
          );
        });

    return bySearch;
  }, [rows, statusFilter, searchQ]);

  const groupTitle = useMemo(() => {
    const cap = statusFilter[0].toUpperCase() + statusFilter.slice(1);
    return `${cap} Leads`;
  }, [statusFilter]);

  const updateQuery = (patch) => {
    const params = new URLSearchParams(window.location.search);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === null || v === undefined || v === "") params.delete(k);
      else params.set(k, v);
    });
    navigate({ search: params.toString() }, { replace: true });
  };

  const exportCSV = () => {
    const csv = toCSV(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${groupTitle.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen ">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur border-b border-gray-100">
        <div className="mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-gray-200 hover:bg-gray-50"
                title="Back"
              >
                <FiChevronLeft />
              </button>
              <div>
                <h1 className="text-lg md:text-xl font-semibold text-gray-900">
                  Leads Management
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {me?.role === "admin" && (
                <button
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff2e6e] to-[#ff5aa4] text-white px-3.5 py-2.5 shadow hover:opacity-95"
                  onClick={() => alert("Open assign-to-callers modal")}
                >
                  <FiUsers />
                  Assign to callers
                </button>
              )}
              <button
                className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-gray-200 hover:bg-gray-50"
                title="Notifications"
              >
                <span className="sr-only">Notifications</span>
                {/* bell could go here */}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Filters row */}
      <div className="mx-auto px-4 py-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            {/* Date dropdown */}
            <div className="relative">
              <button className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50">
                {/^\d{4}-\d{2}-\d{2}$/.test(dateFilter) ? dateFilter : "Today"}
                <FiChevronDown />
              </button>
              {/* For brevity, simple clicks: */}
              <div className="hidden" />
            </div>
            {/* Quick: Today toggle */}
            <select
              className="rounded-xl border-gray-200 text-sm"
              value={dateFilter}
              onChange={(e) => updateQuery({ date: e.target.value })}
            >
              <option value="today">Today</option>
              <option value="all">All</option>
            </select>

            {/* Status dropdown */}
            <select
              className="rounded-xl border-gray-200 text-sm ml-2"
              value={statusFilter}
              onChange={(e) => updateQuery({ status: e.target.value })}
            >
              <option value="new">Lead Status: New</option>
              <option value="recapture">Lead Status: Recapture</option>
              <option value="hot">Lead Status: Hot</option>
              <option value="hot-ip">Lead Status: Hot-IP</option>
              <option value="prospective">Lead Status: Prospective</option>
              <option value="dnp">Lead Status: DNP</option>
            </select>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 w-full md:w-[420px]">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                placeholder="Search Leads"
                className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-100"
                value={searchQ}
                onChange={(e) => updateQuery({ q: e.target.value })}
              />
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
              onClick={exportCSV}
            >
              <FiDownload /> Export
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
              onClick={() => alert("Open filters drawer")}
            >
              <FiFilter /> Filter
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <section className="mx-auto  px-4 pb-10">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 md:p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">
            {groupTitle}{" "}
            <span className="font-normal text-gray-500">({filtered.length})</span>
          </h2>

          {/* Headings */}
          <div className="grid grid-cols-12 gap-3 py-3 text-xs font-medium text-gray-500 border-b border-gray-100">
            <div className="col-span-3">Lead Name</div>
            <div className="col-span-2">Phone Number</div>
            <div className="col-span-2">Source</div>
            <div className="col-span-2">Lead Status</div>
            <div className="col-span-1">Age</div>
            <div className="col-span-1">Location</div>
            <div className="col-span-12 lg:col-span-12 xl:col-span-12">Procedure</div>
          </div>

          {/* Rows */}
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-500">Loading…</div>
          ) : filtered.length ? (
            <div>
              {filtered.map((lead) => (
                <LeadRow key={lead.id} lead={lead} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-gray-500">
              No leads match your filters.
            </div>
          )}
        </div>
      </section>
      {/* Floating Action Button */}
      <button
        title="Quick actions"
        className="fixed bottom-6 right-6 group  inline-flex items-center justify-center rounded-full p-4 bg-gradient-to-br from-[#ff2e6e] to-[#ff5aa4] text-white shadow-xl hover:opacity-95"
      >
        <FiPlus size={22} />
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-6 min-w-6 px-1 rounded-full bg-white text-[#ff2e6e] text-xs font-semibold shadow">
          3
        </span>
      </button>
    </main>
  );
}

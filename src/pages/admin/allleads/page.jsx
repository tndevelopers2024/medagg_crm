// src/pages/LeadsManagement.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FiChevronDown,
  FiSearch,
  FiUpload,
  FiCheckCircle,
  FiX,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import { FaFacebook } from "react-icons/fa";
import { fetchAllLeads, getAllUsers, assignLeadsToCaller } from "../../../utils/api";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";
/* ------------------------ parsing helpers ------------------------ */
const readField = (fieldData = [], keys = []) => {
  for (const f of fieldData) {
    const k = (f?.name || "").toLowerCase().replace(/\s+/g, "_");
    if (keys.includes(k)) {
      const v = Array.isArray(f?.values) ? f.values[0] : f?.values || "";
      if (v) return String(v);
    }
  }
  return "";
};

// 2) Parse a lead using your API fields
const parseLead = (lead) => {
  const name =
    readField(lead.fieldData, ["full_name", "lead_name", "name"]) ||
    readField(lead.fieldData, ["first_name"]) ||
    "—";

  const phone =
    readField(lead.fieldData, ["phone_number", "phone", "mobile", "contact_number"]) || "—";

  // Use top-level status for "Lead Status"
  const leadStatus =
    (lead.status && String(lead.status).replace(/_/g, "-")) ||  // e.g., "new" -> "new"
    readField(lead.fieldData, ["lead_status", "status", "stage", "type"]) ||
    "—";

  // These are optional; will show "—" if not present in fieldData
  const opdStatus = readField(lead.fieldData, ["opd_status", "opd"]) || "—";
  const ipdStatus = readField(lead.fieldData, ["ipd_status", "ipd"]) || "—";
  const diagnostic =
    readField(lead.fieldData, ["diagnostic", "diagnostics", "diagnostic_non", "diagnostic_status"]) ||
    "—";

  // Prefer server-provided timestamps
  const createdTime = lead.createdTime ? new Date(lead.createdTime) : null;
  const lastUpdate =
    (lead.lastCallAt && new Date(lead.lastCallAt)) ||
    (lead.updatedAt && new Date(lead.updatedAt)) ||
    (lead.createdAt && new Date(lead.createdAt)) ||
    createdTime;

  // Source label
  const source =
    readField(lead.fieldData, ["source"]) ||
    (String(lead.campaignId || "").toLowerCase().includes("meta")
      ? "Meta Ads"
      : lead.campaignId
      ? `Campaign ${lead.campaignId}`
      : "Unknown");

  return {
    id: lead._id || lead.id || lead.leadId,
    createdTime,
    lastUpdate,
    assignedTo: lead.assignedTo || null,
    campaignId: lead.campaignId || null,
    adId: lead.adId || null,
    source,
    name,
    phone,
    leadStatus,
    opdStatus,
    ipdStatus,
    diagnostic,
    raw: lead,
  };
};

const exportCsv = (rows, filename = "leads.csv") => {
  const headers = [
    "Lead Name",
    "Phone",
    "Source",
    "Lead Status",
    "OPD Status",
    "IPD Status",
    "Diagnostic/Non",
    "AssignedTo",
    "Last Update",
  ];
  const lines = rows.map((r) =>
    [
      r.name,
      r.phone,
      r.source,
      r.leadStatus,
      r.opdStatus,
      r.ipdStatus,
      r.diagnostic,
      r.assignedTo || "Unassigned",
      r.createdTime ? r.createdTime.toISOString() : "",
    ]
      .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
      .join(",")
  );
  const blob = new Blob([[headers.join(","), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const inLastDays = (d, n) => {
  const now = new Date();
  const from = new Date(now);
  from.setDate(now.getDate() - (n - 1));
  from.setHours(0, 0, 0, 0);
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  return d >= from && d <= to;
};

const timeAgo = (date) => {
  if (!date) return "—";
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hrs ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

/* ------------------------ small UI helpers ------------------------ */
function Menu({ open, children }) {
  if (!open) return null;
  return (
    <div className="absolute z-30 mt-2 w-64 rounded-xl border border-gray-200 bg-white shadow-lg">
      <div className="py-1">{children}</div>
    </div>
  );
}

function FilterDropdown({ label, valueLabel, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onClick = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((s) => !s)}
        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
      >
        {label && <span className="text-gray-500">{label}</span>}
        <span className="font-medium">{valueLabel}</span>
        <FiChevronDown className="opacity-60" />
      </button>
      <Menu open={open}>
        {typeof children === "function" ? children(() => setOpen(false)) : children}
      </Menu>
    </div>
  );
}

function AssignModal({ open, onClose, callers, onConfirm, count }) {
  const [callerId, setCallerId] = useState("");
  useEffect(() => {
    if (!open) setCallerId("");
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
        <div className="flex items-center justify-between px-4 py-4 border-b">
          <h3 className="font-semibold">Assign leads to caller</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-lg">
            <FiX />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="text-xs text-gray-500">{count} selected</div>
          <label className="block text-sm font-medium">Select Caller</label>
          <select
            value={callerId}
            onChange={(e) => setCallerId(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400"
          >
            <option value="">Choose caller…</option>
            {callers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.email ? `• ${c.email}` : ""}
              </option>
            ))}
          </select>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={onClose} className="rounded-xl px-3 py-2 text-sm ring-1 ring-gray-200">
              Cancel
            </button>
            <button
              onClick={() => onConfirm({ callerId })}
              disabled={!callerId}
              className="rounded-xl bg-gradient-to-r from-[#ff2e6e] to-[#ff5aa4] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Assign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SuccessDialog({ open, onClose, text }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-xl ring-1 ring-black/5">
        <FiCheckCircle className="mx-auto text-3xl text-emerald-600" />
        <p className="mt-3 text-sm">{text}</p>
        <button
          onClick={onClose}
          className="mt-5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Done
        </button>
      </div>
    </div>
  );
}

/* ----------------------------- page ----------------------------- */
export default function LeadsManagement() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [callers, setCallers] = useState([]);
  usePageTitle("Leads Management", "Manage your leads effectively");
  // filters (with custom range)
  const [dateMode, setDateMode] = useState("7d"); // Today | Yesterday | 7d | 30d | All | Custom
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [source, setSource] = useState("All Sources");
  const [callerFilter, setCallerFilter] = useState("All Callers"); // All Callers | Unassigned | userId
  const [leadStatus, setLeadStatus] = useState("Lead Status");
  const [opdStatus, setOpdStatus] = useState("OPD Status");
  const [ipdStatus, setIpdStatus] = useState("IPD Status");
  const [diagnostics, setDiagnostics] = useState("Diagnostics");
  const [search, setSearch] = useState("");

  // selection
  const [selected, setSelected] = useState(new Set());

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const headerCheckboxRef = useRef(null);

  // load data
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [all, users] = await Promise.all([fetchAllLeads(), getAllUsers({ role: "caller" })]);
        if (!mounted) return;
        setRows(all.leads || []);
        setCallers(users.filter((u) => (u.role || "").toLowerCase() === "caller"));
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // parsed & maps
  const leads = useMemo(() => rows.map(parseLead), [rows]);
  const callerMap = useMemo(() => {
    const m = new Map();
    callers.forEach((c) => m.set(c.id, c));
    return m;
  }, [callers]);
  const callerCounts = useMemo(() => {
    const counts = new Map();
    leads.forEach((l) => {
      if (l.assignedTo) counts.set(l.assignedTo, (counts.get(l.assignedTo) || 0) + 1);
    });
    return counts;
  }, [leads]);

  // options
  const sourceOptions = useMemo(
    () => ["All Sources", ...Array.from(new Set(leads.map((l) => l.source))).sort()],
    [leads]
  );
  const leadStatusOptions = useMemo(
    () => ["Lead Status", ...Array.from(new Set(leads.map((l) => l.leadStatus))).sort()],
    [leads]
  );
  const opdOptions = useMemo(
    () => ["OPD Status", ...Array.from(new Set(leads.map((l) => l.opdStatus))).sort()],
    [leads]
  );
  const ipdOptions = useMemo(
    () => ["IPD Status", ...Array.from(new Set(leads.map((l) => l.ipdStatus))).sort()],
    [leads]
  );
  const diagOptions = useMemo(
    () => ["Diagnostics", ...Array.from(new Set(leads.map((l) => l.diagnostic))).sort()],
    [leads]
  );
  const callerOptions = useMemo(() => {
    const base = [{ id: "All Callers", name: "All Callers" }, { id: "Unassigned", name: "Unassigned" }];
    return [...base, ...callers.map((c) => ({ id: c.id, name: c.name }))];
  }, [callers]);

  // filtering
  const filtered = useMemo(() => {
    let list = [...leads];

    // date range
    const now = new Date();
    if (dateMode === "Today") list = list.filter((l) => l.createdTime && isSameDay(l.createdTime, now));
    else if (dateMode === "Yesterday") {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      list = list.filter((l) => l.createdTime && isSameDay(l.createdTime, y));
    } else if (dateMode === "7d") list = list.filter((l) => l.createdTime && inLastDays(l.createdTime, 7));
    else if (dateMode === "30d") list = list.filter((l) => l.createdTime && inLastDays(l.createdTime, 30));
    else if (dateMode === "Custom" && customFrom && customTo) {
      const from = new Date(`${customFrom}T00:00:00`);
      const to = new Date(`${customTo}T23:59:59`);
      list = list.filter((l) => l.createdTime && l.createdTime >= from && l.createdTime <= to);
    }

    // search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.phone.toLowerCase().includes(q) ||
          (l.source || "").toLowerCase().includes(q)
      );
    }

    // categorical filters
    if (source !== "All Sources") list = list.filter((l) => l.source === source);
    if (leadStatus !== "Lead Status") list = list.filter((l) => l.leadStatus === leadStatus);
    if (opdStatus !== "OPD Status") list = list.filter((l) => l.opdStatus === opdStatus);
    if (ipdStatus !== "IPD Status") list = list.filter((l) => l.ipdStatus === ipdStatus);
    if (diagnostics !== "Diagnostics") list = list.filter((l) => l.diagnostic === diagnostics);

    if (callerFilter !== "All Callers") {
      list =
        callerFilter === "Unassigned"
          ? list.filter((l) => !l.assignedTo)
          : list.filter((l) => l.assignedTo === callerFilter);
    }

    return list.sort((a, b) => (b.createdTime || 0) - (a.createdTime || 0));
  }, [
    leads,
    dateMode,
    customFrom,
    customTo,
    source,
    callerFilter,
    leadStatus,
    opdStatus,
    ipdStatus,
    diagnostics,
    search,
  ]);

  // pagination + header checkbox for current page
  useEffect(() => setPage(1), [dateMode, customFrom, customTo, source, callerFilter, leadStatus, opdStatus, ipdStatus, diagnostics, search, pageSize]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, total);
  const pageRows = filtered.slice(startIdx, endIdx);

  const allChecked = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));
  const someChecked = pageRows.some((r) => selected.has(r.id)) && !allChecked;
  useEffect(() => {
    if (headerCheckboxRef.current) headerCheckboxRef.current.indeterminate = someChecked;
  }, [someChecked]);

  const toggleAllCurrentPage = () => {
    if (allChecked) {
      setSelected((prev) => {
        const next = new Set(prev);
        pageRows.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        pageRows.forEach((r) => next.add(r.id));
        return next;
      });
    }
  };

  const toggleOne = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // assign flows
  const [assignOpen, setAssignOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successText, setSuccessText] = useState("");

  const onAssignConfirm = async ({ callerId }) => {
    try {
      const ids = Array.from(selected);
      await assignLeadsToCaller(ids, callerId);
      setAssignOpen(false);
      setSelected(new Set());
      setSuccessText(`${ids.length} lead${ids.length > 1 ? "s" : ""} successfully assigned.`);
      setSuccessOpen(true);
      const all = await fetchAllLeads();
      setRows(all.leads || []);
    } catch (e) {
      console.error(e);
      alert("Assignment failed");
    }
  };

  // smart assign (round-robin by current load)
  const smartAssign = async () => {
    if (selected.size === 0 || callers.length === 0) return;
    try {
      const ids = Array.from(selected);
      const sortedCallers = [...callers].sort(
        (a, b) => (callerCounts.get(a.id) || 0) - (callerCounts.get(b.id) || 0)
      );
      let idx = 0;
      for (const leadId of ids) {
        const c = sortedCallers[idx % sortedCallers.length];
        await assignLeadsToCaller([leadId], c.id);
        idx++;
      }
      setSelected(new Set());
      setSuccessText(`Smart assigned ${ids.length} lead${ids.length > 1 ? "s" : ""}.`);
      setSuccessOpen(true);
      const all = await fetchAllLeads();
      setRows(all.leads || []);
    } catch (e) {
      console.error(e);
      alert("Smart assign failed");
    }
  };

  const resetFilters = () => {
    setDateMode("7d");
    setCustomFrom("");
    setCustomTo("");
    setSource("All Sources");
    setCallerFilter("All Callers");
    setLeadStatus("Lead Status");
    setOpdStatus("OPD Status");
    setIpdStatus("IPD Status");
    setDiagnostics("Diagnostics");
    setSearch("");
  };

  // badge helpers
  const Pill = ({ text, tone }) => {
    const cls =
      tone === "red"
        ? "bg-red-100 text-red-600 ring-red-200"
        : tone === "blue"
        ? "bg-blue-100 text-blue-700 ring-blue-200"
        : tone === "green"
        ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
        : "bg-gray-100 text-gray-700 ring-gray-200";
    return (
      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${cls}`}>
        {text}
      </span>
    );
  };

  const leadTone = (v) => (/hot/i.test(v) ? "red" : "gray");
  const opdTone = (v) => (/booked/i.test(v) ? "blue" : /done|completed/i.test(v) ? "green" : "gray");
  const ipdTone = (v) => (/done|completed/i.test(v) ? "green" : "gray");
  const diagTone = (v) => (/diagnostic/i.test(v) ? "green" : "gray");

  const pageNumbers = useMemo(() => {
    const nums = [];
    const add = (n) => nums.push(n);
    const ell = () => nums.push("…");
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) add(i);
    } else {
      add(1);
      if (currentPage > 4) ell();
      const s = Math.max(2, currentPage - 1);
      const e = Math.min(totalPages - 1, currentPage + 1);
      for (let i = s; i <= e; i++) add(i);
      if (currentPage < totalPages - 3) ell();
      add(totalPages);
    }
    return nums;
  }, [currentPage, totalPages]);

  /* ----------------------------- UI ----------------------------- */
  return (
    <div className="space-y-4">
 
      {/* Toolbar — now includes Reset + Custom Date */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Date filter with Custom Range */}
        <FilterDropdown
          label=""
          valueLabel={
            dateMode === "Custom" && customFrom && customTo
              ? `${customFrom} → ${customTo}`
              : {
                  Today: "Today",
                  Yesterday: "Yesterday",
                  "7d": "Last 7 Days",
                  "30d": "Last 30 Days",
                  All: "All",
                  Custom: "Custom Range",
                }[dateMode]
          }
        >
          {(close) => (
            <div className="px-2 py-1">
              {["Today", "Yesterday", "7d", "30d", "All", "Custom"].map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    setDateMode(v);
                    if (v !== "Custom") close();
                  }}
                 
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                    dateMode === v ? "font-semibold text-[#3b0d66]" : ""
                  }`}
                >
                  {{
                    Today: "Today",
                    Yesterday: "Yesterday",
                    "7d": "Last 7 Days",
                    "30d": "Last 30 Days",
                    All: "All",
                    Custom: "Custom Range",
                  }[v]}
                </button>
              ))}
              {dateMode === "Custom" && (
                <div className="p-3 space-y-2">
                  <label className="block text-xs text-gray-500">From</label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                  />
                  <label className="block text-xs text-gray-500">To</label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                  />
                  <button
                    onClick={close}
                    disabled={!customFrom || !customTo}
                    className="w-full rounded-lg bg-[#7d3bd6] py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
          )}
        </FilterDropdown>

        {/* All Sources */}
        <FilterDropdown label="" valueLabel={source}>
          {(close) => (
            <div className="max-h-60 overflow-auto">
              {sourceOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    setSource(opt);
                    close();
                  }}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                    opt === source ? "font-semibold text-[#3b0d66]" : ""
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </FilterDropdown>

        {/* All Callers */}
        <FilterDropdown
          label=""
          valueLabel={
            ([...callerOptions].find((o) => o.id === callerFilter)?.name) || "All Callers"
          }
        >
          {(close) => (
            <div className="max-h-72 overflow-auto">
              {callerOptions.map((o) => (
                <button
                  key={o.id}
                  onClick={() => {
                    setCallerFilter(o.id);
                    close();
                  }}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                    o.id === callerFilter ? "font-semibold text-[#3b0d66]" : ""
                  }`}
                >
                  {o.name}
                </button>
              ))}
            </div>
          )}
        </FilterDropdown>

        {/* Lead / OPD / IPD / Diagnostics */}
        <FilterDropdown label="" valueLabel={leadStatus}>
          {(close) => (
            <div className="max-h-60 overflow-auto">
              {leadStatusOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    setLeadStatus(opt);
                    close();
                  }}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                    opt === leadStatus ? "font-semibold text-[#3b0d66]" : ""
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </FilterDropdown>

        <FilterDropdown label="" valueLabel={opdStatus}>
          {(close) => (
            <div className="max-h-60 overflow-auto">
              {opdOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    setOpdStatus(opt);
                    close();
                  }}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                    opt === opdStatus ? "font-semibold text-[#3b0d66]" : ""
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </FilterDropdown>

        <FilterDropdown label="" valueLabel={ipdStatus}>
          {(close) => (
            <div className="max-h-60 overflow-auto">
              {ipdOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    setIpdStatus(opt);
                    close();
                  }}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                    opt === ipdStatus ? "font-semibold text-[#3b0d66]" : ""
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </FilterDropdown>

        <FilterDropdown label="" valueLabel={diagnostics}>
          {(close) => (
            <div className="max-h-60 overflow-auto">
              {diagOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    setDiagnostics(opt);
                    close();
                  }}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                    opt === diagnostics ? "font-semibold text-[#3b0d66]" : ""
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </FilterDropdown>

      

        {/* Reset Filters (new) */}
        <button
          onClick={resetFilters}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
          title="Reset all filters"
        >
          Reset Filters
        </button>
      </div>
  {/* Search */}
        <div className="ml-auto relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Leads"
            className="w-72 rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-violet-400"
          />
        </div>
      {/* Table */}
      <section className="rounded-2xl p-8 bg-white ring-1 ring-gray-200 shadow-sm overflow-hidden">
   
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className=" text-gray-600">
              <tr>
                <th className="px-4 py-4">
                  <input
                    ref={headerCheckboxRef}
                    type="checkbox"
                    checked={pageRows.length > 0 && pageRows.every((r) => selected.has(r.id))}
                    onChange={toggleAllCurrentPage}
                  />
                </th>
                <th className="text-left text-[16px] font-medium px-4 py-4">Lead Name</th>
                <th className="text-left text-[16px] font-medium px-4 py-4">Phone</th>
                <th className="text-left text-[16px] font-medium px-4 py-4">Source</th>
                <th className="text-left text-[16px] font-medium px-4 py-4">Lead Status</th>
                <th className="text-left text-[16px] font-medium px-4 py-4">OPD Status</th>
                <th className="text-left text-[16px] font-medium px-4 py-4">IPD Status</th>
                <th className="text-left text-[16px] font-medium px-4 py-4">Diagnostic/Non</th>
                <th className="text-left text-[16px] font-medium px-4 py-4">Assigned Caller</th>
                <th className="text-left text-[16px] font-medium px-4 py-4">Last Update</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((l) => {
                const caller = l.assignedTo ? callerMap.get(l.assignedTo) : null;
                const count = l.assignedTo ? callerCounts.get(l.assignedTo) || 0 : 0;
                const initials = caller?.name
                  ? caller.name
                      .split(" ")
                      .map((s) => s[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()
                  : "—";
                return (
                  <tr key={l.id} className="border-b last:border-b-0 border-[#ccc] hover:bg-gray-50/50">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selected.has(l.id)}
                        onChange={() => toggleOne(l.id)}
                      />
                    </td>
                    <td className="px-4 py-4 font-medium">{l.name}</td>
                    <td className="px-4 py-4 text-gray-700">{l.phone}</td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-2 text-gray-700">
                        {l.source.toLowerCase().includes("meta") && (
                          <span className="text-[#1877F2]"><FaFacebook /></span>
                        )}
                        {l.source}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <Pill text={l.leadStatus} tone={leadTone(l.leadStatus)} />
                    </td>
                    <td className="px-4 py-4">
                      <Pill text={l.opdStatus} tone={opdTone(l.opdStatus)} />
                    </td>
                    <td className="px-4 py-4">
                      <Pill text={l.ipdStatus} tone={ipdTone(l.ipdStatus)} />
                    </td>
                    <td className="px-4 py-4">
                      <Pill text={l.diagnostic} tone={diagTone(l.diagnostic)} />
                    </td>
                    <td className="px-4 py-4">
                      {caller ? (
                        <div className="flex items-center gap-2">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
                            {initials}
                          </span>
                          <div>
                            <div className="text-sm font-medium">{caller.name}</div>
                            <div className="flex items-center gap-1 text-xs text-emerald-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              {count} Leads
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-gray-600">{timeAgo(l.createdTime)}</td>
                  </tr>
                );
              })}
              {!loading && pageRows.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={10}>
                    No leads found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 bg-white">
          <div className="text-sm">
            <span className="font-medium">{selected.size}</span> Leads Selected{" "}
            {selected.size > 0 && (
              <button
                className="ml-2 text-xs text-gray-500 hover:underline"
                onClick={() => setSelected(new Set())}
              >
                Clear Selection
              </button>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => exportCsv(filtered, "leads.csv")}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
            >
              <FiUpload /> Export
            </button>
            <button
              onClick={smartAssign}
              disabled={selected.size === 0 || callers.length === 0}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
            >
              Smart Assign
            </button>
            <button
              onClick={() => setAssignOpen(true)}
              disabled={selected.size === 0}
              className="rounded-xl bg-[#ff2e6e] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Assign to callers
            </button>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between gap-3 px-4 pb-4">
          <div className="text-xs text-gray-500">
            Showing <span className="font-medium">{total ? startIdx + 1 : 0}</span>–
            <span className="font-medium">{endIdx}</span> of{" "}
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
            {pageNumbers.map((p, i) =>
              p === "…" ? (
                <span key={`dots-${i}`} className="px-2 text-sm text-gray-500">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`min-w-8 rounded-lg border px-2 py-1.5 text-sm ${
                    p === currentPage
                      ? "border-[#7d3bd6] text-[#7d3bd6] font-semibold"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              )
            )}
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

      {/* Modals */}
      <AssignModal
        open={assignOpen}
        callers={callers}
        count={selected.size}
        onClose={() => setAssignOpen(false)}
        onConfirm={onAssignConfirm}
      />
      <SuccessDialog
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        text={successText}
      />
    </div>
  );
}

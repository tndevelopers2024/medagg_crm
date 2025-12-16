// src/pages/CallerDashboard.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiArrowUpRight,
  FiArrowDownRight,
  FiMail,
  FiDownload,
  FiChevronDown,
  FiCheckCircle,
  FiXCircle,
  FiCalendar,
  FiTarget,
  FiBell,
  FiPhoneCall,
  FiInfo,
  FiX,
} from "react-icons/fi";
import { getAllUsers, fetchAllLeads } from "../../../utils/api";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";
import { useSocket } from "../../../contexts/SocketProvider";
import Loader from "../../../components/Loader";
import { createPortal } from "react-dom";

/* ------------ tiny toast system (socket popups) ------------ */
function Toast({ toast, onClose, onAction, isExiting }) {
  const tone =
    toast.tone === "success"
      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
      : toast.tone === "warning"
        ? "border-amber-300 bg-amber-50 text-amber-800"
        : toast.tone === "error"
          ? "border-red-300 bg-red-50 text-red-800"
          : "border-indigo-300 bg-indigo-50 text-indigo-800";

  const Icon = toast.icon || FiBell;
  return (
    <div
      className={`w-[360px] rounded-xl border p-4 shadow-lg ${tone} ${isExiting ? "animate-toastOut" : "animate-toastIn"
        } transition-all duration-300`}
      style={{
        maxHeight: isExiting ? 0 : "500px",
        opacity: isExiting ? 0 : 1,
        marginBottom: isExiting ? 0 : "0.75rem",
        overflow: "hidden",
      }}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 text-lg" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold leading-5 truncate">{toast.title}</div>
          {toast.message ? (
            <div className="text-sm opacity-90 mt-1 break-words">{toast.message}</div>
          ) : null}
          {toast.action ? (
            <button
              onClick={onAction}
              className="mt-3 text-sm font-medium bg-black/10 hover:bg-black/20 px-3 py-1.5 rounded-md transition-colors"
            >
              {toast.action.label}
            </button>
          ) : null}
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1 hover:bg-black/10 transition"
          aria-label="Close"
          title="Close"
        >
          <FiX />
        </button>
      </div>
    </div>
  );
}
function ToastPortal({ children }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
function ToastStack({ toasts, remove }) {
  return (
    <ToastPortal>
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col-reverse gap-3">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            toast={t}
            onClose={() => remove(t.id)}
            onAction={() => {
              if (typeof t.action?.onClick === "function") t.action.onClick();
              remove(t.id);
            }}
            isExiting={t.isExiting}
          />
        ))}
      </div>
    </ToastPortal>
  );
}
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const remove = useCallback((id) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t)));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 300);
  }, []);
  const push = useCallback(
    (t) => {
      const id =
        (typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID()) ||
        `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const timeout = t.timeout ?? 6000;
      setToasts((prev) => [{ id, ...t }, ...prev]);
      if (timeout > 0) setTimeout(() => remove(id), timeout);
    },
    [remove]
  );
  return { toasts, push, remove };
}
function useEventDeduper(windowMs = 8000) {
  const seenRef = useRef(new Map());
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      for (const [k, v] of seenRef.current.entries()) {
        if (now - v > windowMs) seenRef.current.delete(k);
      }
    }, windowMs);
    return () => clearInterval(t);
  }, [windowMs]);
  return useCallback((key) => {
    const k = String(key || "");
    const now = Date.now();
    const has = seenRef.current.has(k);
    seenRef.current.set(k, now);
    return has;
  }, []);
}

/* ------------ helpers ------------ */
const dicebear = (seed) =>
  `https://api.dicebear.com/7.x/initials/svg?radius=50&fontWeight=700&seed=${encodeURIComponent(
    seed || "caller"
  )}`;

const safeDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(+d) ? null : d;
};

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

/** pick the best timestamp to represent a booking in analytics */
const bookingWhen = (b) =>
  safeDate(b?.doneDate) ||
  safeDate(b?.date) ||
  safeDate(b?.updatedAt) ||
  safeDate(b?.createdAt) ||
  null;

const summarizeBookings = (arr = []) => {
  const counts = { pending: 0, booked: 0, done: 0, cancelled: 0 };
  let latestDate = null;
  let latestStatus = null;

  for (const b of arr) {
    const st = (b?.status || "").toLowerCase();
    if (counts[st] !== undefined) counts[st] += 1;

    const when = bookingWhen(b);
    if (when && (!latestDate || when > latestDate)) {
      latestDate = when;
      latestStatus = st;
    }
  }
  return { counts, latestStatus, latestDate };
};

const parseLead = (lead) => {
  const name =
    readField(lead.fieldData, ["full_name", "lead_name", "name"]) ||
    readField(lead.fieldData, ["first_name"]) ||
    "—";
  const phone = readField(lead.fieldData, ["phone_number", "phone", "mobile"]) || "—";
  const status =
    (lead.status && String(lead.status).replace(/_/g, " ")) ||
    readField(lead.fieldData, ["status", "stage", "type"]) ||
    "—";

  const campaign = lead.campaignId || readField(lead.fieldData, ["campaign"]) || "—";
  const created = safeDate(lead.createdTime) || safeDate(lead.createdAt);
  const lastUpdate =
    safeDate(lead.lastCallAt) || safeDate(lead.updatedAt) || created;

  // normalize OP/IP arrays (straight from your mongoose schema)
  const opBookings = Array.isArray(lead.opBookings)
    ? lead.opBookings.map((b) => ({
      ...b,
      status: (b?.status || "").toLowerCase(),
      _when: bookingWhen(b),
    }))
    : [];
  const ipBookings = Array.isArray(lead.ipBookings)
    ? lead.ipBookings.map((b) => ({
      ...b,
      status: (b?.status || "").toLowerCase(),
      _when: bookingWhen(b),
    }))
    : [];

  const op = summarizeBookings(opBookings);
  const ip = summarizeBookings(ipBookings);

  // compact status for table (latest)
  const compact = (s) =>
    s === "done" ? "Done" : s === "booked" ? "Booked" : s === "cancelled" ? "Cancelled" : s ? s[0].toUpperCase() + s.slice(1) : "—";

  return {
    id: lead._id || lead.id || lead.leadId,
    assignedTo: lead.assignedTo || null,
    name,
    phone,
    campaign,
    status,
    // compact latest statuses for display
    opd: compact(op.latestStatus),
    ipd: compact(ip.latestStatus),
    // raw arrays for analytics
    opBookings,
    ipBookings,
    notes: lead.notes || "",
    outcome: lead.lastCallOutcome || "",
    followUpAt: safeDate(lead.followUpAt),
    lastContact: safeDate(lead.lastCallAt),
    createdAt: created,
    lastUpdate,
  };
};

const fmtDate = (d) =>
  !d ? "—" : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

const timeAgo = (d) => {
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

const pill = (tone) =>
  tone === "red"
    ? "bg-red-50 text-red-700 ring-red-200"
    : tone === "blue"
      ? "bg-blue-50 text-blue-700 ring-blue-200"
      : tone === "green"
        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
        : "bg-gray-50 text-gray-700 ring-gray-200";

const toneLead = (v) => (/hot/i.test(v) ? "red" : /prospect|interested/i.test(v) ? "blue" : "gray");

/* period ranges */
const startOfMonth = (offset = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() + offset, 1);
  d.setHours(0, 0, 0, 0);
  return d;
};
const endOfMonth = (offset = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() + offset + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
};
const startOfWeek = () => {
  const d = new Date();
  const diff = (d.getDay() + 6) % 7; // Monday start
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
};
const endOfWeek = () => {
  const d = startOfWeek();
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
};

/* ------------ page ------------ */
export default function CallerDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  usePageTitle("BD Performance Dashboard", "");

  const [loading, setLoading] = useState(true);
  const [caller, setCaller] = useState(null);
  const [allLeads, setAllLeads] = useState([]);

  // presence + live activity
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(null); // Date | null
  const [liveActivity, setLiveActivity] = useState([]); // [{when, title, tags, note}]
  const seenPresenceRef = useRef(0);

  // period filter
  const [period, setPeriod] = useState("This Month"); // This Month | Last Month | This Week | All Time | Custom
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // socket + toasts
  const { socket, isConnected } = useSocket();
  const { toasts, push, remove } = useToasts();
  const dedupe = useEventDeduper(7000);

  // Initial fetch
  const softRefresh = useCallback(async () => {
    const [users, leadsRes] = await Promise.all([getAllUsers(), fetchAllLeads()]);
    const u = (users || []).find((x) => x.id === id || x._id === id);
    setCaller(u || { id, name: "Unknown", email: "", phone: "", role: "caller", state: "" });
    setAllLeads((leadsRes?.leads || []).map(parseLead));
  }, [id]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        await softRefresh();
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [softRefresh]);

  const assigned = useMemo(
    () => allLeads.filter((l) => String(l.assignedTo) === String(id)),
    [allLeads, id]
  );

  /* period filtering */
  const [from, to] = useMemo(() => {
    if (period === "This Month") return [startOfMonth(0), endOfMonth(0)];
    if (period === "Last Month") return [startOfMonth(-1), endOfMonth(-1)];
    if (period === "This Week") return [startOfWeek(), endOfWeek()];
    if (period === "All Time") return [new Date(0), new Date()];
    if (period === "Custom" && customFrom && customTo)
      return [new Date(`${customFrom}T00:00:00`), new Date(`${customTo}T23:59:59`)];
    return [startOfMonth(0), endOfMonth(0)];
  }, [period, customFrom, customTo]);

  const inRange = (d) => d && d >= from && d <= to;

  // For "Total Leads" we consider leads created in the period (not bookings)
  const leadsInThis = useMemo(
    () => assigned.filter((l) => inRange(l.createdAt)),
    [assigned, from, to]
  );
  const prevRange = useMemo(() => {
    if (period === "This Month") return [startOfMonth(-1), endOfMonth(-1)];
    if (period === "Last Month") return [startOfMonth(-2), endOfMonth(-2)];
    if (period === "This Week") {
      const s = new Date(startOfWeek());
      s.setDate(s.getDate() - 7);
      const e = new Date(endOfWeek());
      e.setDate(e.getDate() - 7);
      return [s, e];
    }
    if (period === "All Time") return [new Date(0), new Date(0)];
    if (period === "Custom") {
      const s = new Date(from);
      const e = new Date(to);
      const delta = e - s || 1;
      return [new Date(s - delta), new Date(e - delta)];
    }
    return [startOfMonth(-1), endOfMonth(-1)];
  }, [period, from, to]);

  const leadsInPrev = useMemo(
    () => assigned.filter((l) => l.createdAt && l.createdAt >= prevRange[0] && l.createdAt <= prevRange[1]),
    [assigned, prevRange]
  );

  const metricLeads = (arrCur, arrPrev) => ({ cur: arrCur.length, prev: arrPrev.length });

  // ---- Booking-based metrics (correct for your schema) ----
  const allOp = useMemo(() => assigned.flatMap((l) => l.opBookings || []), [assigned]);
  const allIp = useMemo(() => assigned.flatMap((l) => l.ipBookings || []), [assigned]);

  const inWindow = (when, win) => when && when >= win[0] && when <= win[1];

  const bookingMetric = (bookings, status, win, winPrev) => {
    const cur = bookings.filter((b) => b.status === status && inWindow(bookingWhen(b), win)).length;
    const prev = bookings.filter((b) => b.status === status && inWindow(bookingWhen(b), winPrev)).length;
    return { cur, prev };
  };

  const mTotal = metricLeads(leadsInThis, leadsInPrev);
  const monthlyTarget = 20;
  const targetProgress = Math.min(100, Math.round((mTotal.cur / monthlyTarget) * 100));

  const mOPBooked = bookingMetric(allOp, "booked", [from, to], prevRange);
  const mOPDone = bookingMetric(allOp, "done", [from, to], prevRange);
  const mOPCancel = bookingMetric(allOp, "cancelled", [from, to], prevRange);
  const mIPDDone = bookingMetric(allIp, "done", [from, to], prevRange);

  /* derived + booking timeline */
  const derivedTimeline = useMemo(() => {
    const items = [];

    // from calls / general lead updates
    for (const l of assigned) {
      const baseWhen = l.lastUpdate || l.createdAt;
      if (baseWhen) {
        items.push({
          when: baseWhen,
          title: `Call with ${l.name}`,
          tags: [l.outcome || "Call"],
          note: l.notes || "",
        });
      }
    }

    // OP bookings
    for (const l of assigned) {
      for (const b of l.opBookings || []) {
        const when = bookingWhen(b);
        if (!when) continue;
        const label =
          b.status === "done" ? "OP Done" : b.status === "booked" ? "OP Booked" : b.status === "cancelled" ? "OP Cancelled" : "OP Pending";
        items.push({
          when,
          title: `${label} - ${l.name}`,
          tags: ["OPD", label],
          note: [b.hospital, b.doctor, b.surgery].filter(Boolean).join(" • "),
        });
      }
    }

    // IP bookings
    for (const l of assigned) {
      for (const b of l.ipBookings || []) {
        const when = bookingWhen(b);
        if (!when) continue;
        const label = b.status === "done" ? "IPD Done" : b.status === "booked" ? "IPD Booked" : b.status === "cancelled" ? "IPD Cancelled" : "IPD Pending";
        items.push({
          when,
          title: `${label} - ${l.name}`,
          tags: ["IPD", label, b.caseType || ""].filter(Boolean),
          note: [b.hospital, b.doctor].filter(Boolean).join(" • "),
        });
      }
    }

    return items
      .filter((x) => x.when)
      .sort((a, b) => b.when - a.when)
      .slice(0, 20);
  }, [assigned]);

  // merge live + derived for display (live first)
  const timeline = useMemo(() => {
    const all = [...liveActivity, ...derivedTimeline];
    const seen = new Set();
    const out = [];
    for (const t of all) {
      const key = `${t.title}__${t.when ? +new Date(t.when) : ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(t);
      if (out.length >= 20) break;
    }
    return out.sort((a, b) => (b.when || 0) - (a.when || 0));
  }, [liveActivity, derivedTimeline]);

  /* export */
  const exportCsv = () => {
    const headers = [
      "Lead Name",
      "Campaign",
      "Status",
      "Assigned",
      "Last Contact",
      "Next Follow-up",
      "OPD (latest)",
      "IPD (latest)",
      "Outcome",
      "Notes",
    ];
    const lines = assigned.map((l) =>
      [
        l.name,
        l.campaign,
        l.status,
        l.createdAt ? l.createdAt.toISOString() : "",
        l.lastContact ? l.lastContact.toISOString() : "",
        l.followUpAt ? l.followUpAt.toISOString() : "",
        l.opd,
        l.ipd,
        l.outcome,
        l.notes,
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
    a.download = `caller-${caller?.name || id}-leads.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ------- socket presence + live events ------- */
  const pushLive = useCallback((evt) => {
    setLiveActivity((prev) => {
      const next = [{ ...evt }, ...prev];
      return next.slice(0, 40);
    });
  }, []);

  const lastRefreshRef = useRef(0);
  const inflightRef = useRef(false);
  const throttledRefresh = useCallback(async () => {
    const now = Date.now();
    if (inflightRef.current || now - lastRefreshRef.current < 1200) return;
    inflightRef.current = true;
    try {
      const leadsRes = await fetchAllLeads();
      setAllLeads((leadsRes?.leads || []).map(parseLead));
      lastRefreshRef.current = Date.now();
    } catch (e) {
      console.warn("throttledRefresh error:", e?.message || e);
    } finally {
      inflightRef.current = false;
    }
  }, []);

  // Presence “staleness”: if no presence ping in 45s, mark offline
  useEffect(() => {
    const t = setInterval(() => {
      if (!lastSeen) return;
      const age = Date.now() - +lastSeen;
      if (age > 45000 && isOnline) setIsOnline(false);
    }, 5000);
    return () => clearInterval(t);
  }, [isOnline, lastSeen]);

  useEffect(() => {
    if (!socket || !isConnected || !id) return;

    const onPresence = (p = {}) => {
      if (String(p.userId) !== String(id)) return;
      const dupKey = `presence:${id}:${p.online ? "1" : "0"}:${p.lastSeen || ""}`;
      if (dedupe(dupKey)) return;
      setIsOnline(!!p.online);
      const seen = p.lastSeen ? new Date(p.lastSeen) : new Date();
      setLastSeen(seen);
      seenPresenceRef.current = Date.now();
    };

    const onLeadAssigned = (p = {}) => {
      if (String(p.callerId) !== String(id)) return;
      const key = `assign:${p.leadId || ""}:${p.at || ""}`;
      if (dedupe(key)) return;
      push({
        title: "New lead assigned",
        message: `Lead ${p.leadName || p.leadId} was assigned to ${caller?.name || "caller"}.`,
        icon: FiBell,
        tone: "success",
        action: { label: "Refresh", onClick: throttledRefresh },
      });
      pushLive({
        when: p.at ? new Date(p.at) : new Date(),
        title: `Lead assigned: ${p.leadName || p.leadId || ""}`,
        tags: ["Assigned"],
        note: p.by ? `By ${p.by.name || p.by.email || "system"}` : "",
      });
      throttledRefresh();
    };

    const onLeadUpdated = (p = {}) => {
      if (String(p.callerId) !== String(id)) return;
      const key = `leadupd:${p.leadId || ""}:${p.at || ""}`;
      if (dedupe(key)) return;
      push({
        title: "Lead updated",
        message: `Lead ${p.leadName || p.leadId} has new changes.`,
        icon: FiInfo,
        action: { label: "Refresh", onClick: throttledRefresh },
      });
      pushLive({
        when: p.at ? new Date(p.at) : new Date(),
        title: `Lead updated: ${p.leadName || p.leadId || ""}`,
        tags: ["Update"],
        note: "",
      });
      throttledRefresh();
    };

    const onCallLogged = (p = {}) => {
      if (String(p.callerId) !== String(id)) return;
      const key = `call:${p.leadId || ""}:${p.at || ""}`;
      if (dedupe(key)) return;
      push({
        title: "Call logged",
        message: `${p.outcome || "Call recorded"} — ${Math.round((p.durationSec || 0) / 60)} min`,
        icon: FiPhoneCall,
        tone: "success",
        action: { label: "Refresh", onClick: throttledRefresh },
      });
      pushLive({
        when: p.at ? new Date(p.at) : new Date(),
        title: `Call with ${p.leadName || p.leadId || ""}`,
        tags: [p.outcome || "Call"],
        note: p.durationSec ? `${Math.round(p.durationSec / 60)} min` : "",
      });
      throttledRefresh();
    };

    // Optional: dedicated booking events if your backend emits them
    // socket.on?.("booking:op:update", ...);
    // socket.on?.("booking:ip:update", ...);

    socket.on?.("caller:presence", onPresence);
    socket.on?.("lead:assigned", onLeadAssigned);
    socket.on?.("lead:updated", onLeadUpdated);
    socket.on?.("call:logged", onCallLogged);

    try {
      socket.emit?.("caller:presence:request", { userId: id });
    } catch { }

    push({
      title: "Live updates ready",
      message: "You’ll see real-time changes for this caller.",
      icon: FiBell,
      tone: "success",
      timeout: 2200,
    });

    return () => {
      socket.off?.("caller:presence", onPresence);
      socket.off?.("lead:assigned", onLeadAssigned);
      socket.off?.("lead:updated", onLeadUpdated);
      socket.off?.("call:logged", onCallLogged);
    };
  }, [socket, isConnected, id, caller?.name, push, dedupe, throttledRefresh, pushLive]);

  /* ------------ UI ------------ */
  if (loading) return <Loader fullScreen text="Loading metrics..." />;
  if (!caller) return <div className="p-6">Caller not found.</div>;

  const lastSeenLabel = isOnline
    ? "Active"
    : lastSeen
      ? `Last seen ${timeAgo(lastSeen)}`
      : "Offline";

  return (
    <div className="space-y-6">
      {/* page topbar mimic (Export / Admin Actions) */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
          >
            <FiDownload /> Export
          </button>
          <button className="rounded-xl bg-[#3b0d66] px-3 py-2 text-sm font-semibold text-white">
            Admin Actions
          </button>
        </div>
      </div>

      {/* Header card */}
      <section className="rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm">
        <div className="p-5 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <img
              src={dicebear(caller.email || caller.name)}
              alt={caller.name}
              className="h-12 w-12 rounded-full ring-2 ring-white shadow"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-semibold text-[#3b0d66]">
                  {caller.name}
                </h2>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${isOnline
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      : "bg-gray-50 text-gray-700 ring-gray-200"
                    }`}
                  title={lastSeenLabel}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-gray-400"
                      }`}
                  />
                  {lastSeenLabel}
                </span>
              </div>
              <div className="mt-2 text-xs text-gray-600 space-x-3">
                {caller.state && <span>📍 {caller.state}</span>}
                {caller.phone && <span>📞 {caller.phone}</span>}
              </div>
              <span className="inline-flex mt-4 items-center gap-1">
                <span className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-violet-200">
                  GPE
                </span>
                <span className="rounded-full bg-pink-50 px-1.5 py-0.5 text-[10px] font-semibold text-pink-700 ring-1 ring-pink-200">
                  PPC
                </span>
              </span>
            </div>
          </div>

          <div className="grid items-center gap-2">
            <div className="text-right mr-3 hidden sm:block">
              <div className="text-xs text-gray-500">Total Leads Handled</div>
              <div className="text-2xl font-bold">{assigned.length}</div>
            </div>
            <a
              href={caller.email ? `mailto:${caller.email}` : "#"}
              className="inline-flex items-center gap-2 rounded-xl bg-[#ff2e6e] px-3 py-2 text-sm font-semibold text-white"
            >
              <FiMail /> Send Message
            </a>
          </div>
        </div>
      </section>

      {/* Performance metrics */}
      <section className="rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm">
        <div className="p-4 flex items-center justify-between">
          <h3 className="font-semibold">Performance Metrics</h3>
          <div>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option>This Month</option>
              <option>Last Month</option>
              <option>This Week</option>
              <option>All Time</option>
              <option>Custom</option>
            </select>
            {period === "Custom" && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                />
                <span className="text-xs text-gray-500">to</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                />
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          {/* Monthly Target */}
          <MetricCard
            title="Monthly Target"
            value={monthlyTarget}
            sub={`${mTotal.cur} Leads to convert`}
            progress={targetProgress}
            badge="This month"
            Icon={FiTarget}
            iconTone="indigo"
          />

          <KpiCard
            title="Total Leads"
            m={mTotal}
            Icon={FiCalendar}
            iconTone="amber"
            sub="Created in period"
          />
          <KpiCard
            title="OP Booked"
            m={mOPBooked}
            tone="green"
            Icon={FiCalendar}
            iconTone="indigo"
            sub="Bookings in period"
          />
          <KpiCard
            title="OPD Done"
            m={mOPDone}
            tone="green"
            Icon={FiCheckCircle}
            iconTone="green"
            sub="Completions in period"
          />
          <KpiCard
            title="OPD Cancelled"
            m={mOPCancel}
            tone="red"
            Icon={FiXCircle}
            iconTone="red"
            sub="Cancellations in period"
          />
          <KpiCard
            title="IPD Done"
            m={mIPDDone}
            tone="green"
            Icon={FiCheckCircle}
            iconTone="green"
            className="sm:col-span-2 xl:col-span-1"
            sub="Completions in period"
          />
        </div>
      </section>

      <div className="px-2 pt-4 flex items-center justify-between">
        <h3 className="font-semibold text-2xl">Assigned Leads</h3>
        <button
          onClick={() => navigate(`/admin/leads?callerId=${encodeURIComponent(id)}`)}
          className="text-xs text-[#7d3bd6] hover:underline"
        >
          Show All <FiChevronDown className="inline-block -rotate-90" />
        </button>
      </div>

      {/* Assigned leads */}
      <section className="rounded-2xl bg-white p-8 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className=" text-gray-600">
              <tr>
                <th className="text-left font-medium px-4 py-3">Lead Name</th>
                <th className="text-left font-medium px-4 py-3">Campaign</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-left font-medium px-4 py-3">Assigned Date</th>
                <th className="text-left font-medium px-4 py-3">Last Contact</th>
                <th className="text-left font-medium px-4 py-3">Next Follow-up</th>
                <th className="text-left font-medium px-4 py-3">Outcome</th>
                <th className="text-left font-medium px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {assigned.slice(0, 5).map((l) => (
                <tr key={l.id} className="border-b last:border-b-0 border-[#ccc] hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{l.name}</div>
                    <div className="text-xs text-gray-500">{l.phone}</div>
                  </td>
                  <td className="px-4 py-3">{l.campaign}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${pill(
                        toneLead(l.status)
                      )}`}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{fmtDate(l.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div>
                      {l.lastContact
                        ? l.lastContact.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                        : "—"}
                    </div>
                    <div className="text-[11px] text-gray-500">{timeAgo(l.lastContact)}</div>
                  </td>
                  <td className="px-4 py-3">{fmtDate(l.followUpAt)}</td>
                  <td className="px-4 py-3">
                    {l.outcome ? (
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${pill(
                          /booked|done/i.test(l.outcome) ? "green" : /cancel/i.test(l.outcome) ? "red" : "gray"
                        )}`}
                      >
                        {l.outcome}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{l.notes || "—"}</td>
                </tr>
              ))}
              {assigned.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={8}>
                    No leads assigned.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex justify-center py-3">
          <button
            onClick={() => navigate(`/admin/leads?callerId=${encodeURIComponent(id)}`)}
            className="text-[12px] font-medium text-[#ff2e6e] hover:underline"
          >
            Show All
          </button>
        </div>
      </section>

      {/* Recent Activity Timeline (live + derived + bookings) */}
      <section className="rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm">
        <div className="p-4">
          <h3 className="font-semibold">Recent Activity Timeline</h3>
        </div>
        <ol className="px-6 pb-6 space-y-4">
          {timeline.map((t, i) => (
            <li key={`${i}-${t.title}`} className="relative pl-8">
              <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-amber-500" />
              <div className="text-sm font-medium">{t.title}</div>
              {t.tags?.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-2">
                  {t.tags.map((tag, j) => (
                    <span
                      key={j}
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${pill(
                        /booked|done/i.test(tag) ? "green" : /cancel/i.test(tag) ? "red" : "blue"
                      )}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {t.note && <div className="mt-1 text-xs text-gray-600">{t.note}</div>}
              <div className="mt-0.5 text-[11px] text-gray-500">{fmtDate(t.when)}</div>
            </li>
          ))}
          {timeline.length === 0 && (
            <div className="text-sm text-gray-500">No recent activity.</div>
          )}
        </ol>
      </section>

      {/* Socket Toasts */}
      <ToastStack toasts={toasts} remove={remove} />

      {/* CSS animations for toasts */}
      <style>{`
        @keyframes toastIn {
          0% { transform: translateX(100%); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes toastOut {
          0% { transform: translateX(0); opacity: 1; max-height: 500px; margin-bottom: 0.75rem; }
          50% { opacity: 0; }
          100% { transform: translateX(100%); opacity: 0; max-height: 0; margin-bottom: 0; }
        }
        .animate-toastIn { animation: toastIn 0.3s ease-out forwards; }
        .animate-toastOut { animation: toastOut 0.3s ease-in forwards; }
      `}</style>
    </div>
  );
}

/* ------------ small components (styled like mock) ------------ */
function KpiCard({
  title,
  m,
  tone = "gray",
  className = "",
  Icon = FiCalendar,
  iconTone = "gray",
  sub = "",
}) {
  const diff = m.prev === 0 && m.cur === 0 ? 0 : Math.round(((m.cur - m.prev) / (m.prev || 1)) * 100);
  const up = diff >= 0;
  const toneCls =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : tone === "red"
        ? "bg-red-50 text-red-700 ring-red-200"
        : "bg-gray-50 text-gray-700 ring-gray-200";
  const iconCls =
    iconTone === "green"
      ? "bg-emerald-50 text-emerald-600"
      : iconTone === "red"
        ? "bg-red-50 text-red-600"
        : iconTone === "indigo"
          ? "bg-indigo-50 text-indigo-600"
          : iconTone === "amber"
            ? "bg-amber-50 text-amber-600"
            : "bg-gray-50 text-gray-600";

  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="text-xs text-gray-500">{title}</div>
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${iconCls}`}>
          <Icon />
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold">{m.cur}</div>
      <div className="mt-1 flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${toneCls}`}>
          {up ? <FiArrowUpRight /> : <FiArrowDownRight />} {Math.abs(diff)}%
        </span>
        <span className="text-[11px] text-gray-500">{sub}</span>
      </div>
    </div>
  );
}

function MetricCard({ title, value, sub, progress, badge, Icon = FiTarget, iconTone = "indigo" }) {
  const iconCls =
    iconTone === "indigo" ? "bg-indigo-50 text-indigo-600" : "bg-gray-50 text-gray-600";
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="text-xs text-gray-500">{title}</div>
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${iconCls}`}>
          <Icon />
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div className="h-full bg-[#7d3bd6]" style={{ width: `${progress || 0}%` }} />
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-[11px] text-gray-500">{sub}</span>
        {badge && (
          <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-700 ring-1 ring-gray-200">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  FiUsers,
  FiAlertTriangle,
  FiClipboard,
  FiBell,
  FiX,
  FiPhoneCall,
  FiCheckCircle,
  FiInfo,
  FiUser,
  FiCalendar,
  FiMessageSquare,
  FiTarget,
  FiClock,
  FiPieChart,
} from "react-icons/fi";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";
import { fetchTodayLeads, fetchAllLeads, getAllUsers, fetchAdminDashboardStats, fetchAdminActivityStats } from "../../../utils/api";
import { useSocket } from "../../../contexts/SocketProvider";
import Loader from "../../../components/Loader";

/* ---------------- helpers ---------------- */
const cls = (...c) => c.filter(Boolean).join(" ");

const isSameDay = (a, b) =>
  a &&
  b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/* -------------------- UI Components -------------------- */
const Progress = ({ value = 0, max = 100, tone = "primary" }) => {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  const toneMap = {
    primary: "from-[#8c3ed8] to-[#ff2e6e]",
    green: "from-emerald-500 to-emerald-400",
    orange: "from-orange-500 to-amber-400",
    red: "from-rose-500 to-pink-500",
    blue: "from-sky-500 to-indigo-500",
  };
  return (
    <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
      <div
        className={cls(
          "h-full bg-gradient-to-r rounded-full transition-all duration-500",
          toneMap[tone] || toneMap.primary
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};

const Pill = ({ children, tone = "gray" }) => {
  const tones = {
    gray: "bg-gray-100 text-gray-700",
    green: "bg-emerald-50 text-emerald-700",
    orange: "bg-orange-50 text-orange-700",
    red: "bg-rose-50 text-rose-700",
    purple: "bg-violet-50 text-violet-700",
    blue: "bg-sky-50 text-sky-700",
  };
  return (
    <span className={cls("px-2 py-0.5 rounded-full text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
};

const MetricCard = ({ title, value, hint, footer, tone = "primary", max = 100, icon }) => {
  const hintTone =
    tone === "green" ? "green" : tone === "orange" ? "orange" : tone === "red" ? "red" : "gray";
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{title}</p>
        {icon ? <div className="text-gray-400">{icon}</div> : null}
      </div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">
        {typeof value === "number" ? value : (value || "—")}
      </div>
      {hint ? (
        <div className="mt-1">
          <Pill tone={hintTone}>{hint}</Pill>
        </div>
      ) : null}
      <div className="mt-3">
        <Progress value={typeof value === "number" ? value : 0} max={max} tone={tone} />
      </div>
      {footer ? <div className="mt-2 text-xs text-gray-500">{footer}</div> : null}
    </div>
  );
};



const initialsOf = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "—";

const formatPhoneNumber = (phone) => {
  if (!phone) return "—";
  const cleaned = String(phone).replace(/\D/g, "");
  // If 10 digits, show (XXX) XXX-XXXX; otherwise return as-is
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return String(phone);
};

const useParsedLeads = (rows = []) =>
  rows.map((lead) => {
    const fields = {};
    (lead.fieldData || lead.field_data || []).forEach((f) => {
      const key = (f?.name || "").toLowerCase();
      const val = Array.isArray(f?.values) ? f.values[0] : f?.values || "";
      if (/full_name|^name$|lead_name|first_name/.test(key) && !fields.name) fields.name = val;
      if (/(phone_number|phone|mobile|contact)/.test(key) && !fields.phone) fields.phone = val;
      if (/(source|page_name)/.test(key) && !fields.source) fields.source = val;
      if (/(email)/.test(key) && !fields.email) fields.email = val;
      if (/(message|comments|notes|concern)/.test(key) && !fields.message) fields.message = val;
    });
    return {
      id: lead._id || lead.id || lead.lead_id || lead.leadId,
      createdTime:
        lead.createdTime || lead.created_time || lead.createdAt || lead.created_at
          ? new Date(lead.createdTime || lead.created_time || lead.createdAt || lead.created_at)
          : null,
      assignedTo: lead.assignedTo || null,
      name: fields.name || "—",
      source: lead.campaignId || fields.source || "Website",
      phone: fields.phone || "—",
      email: fields.email || "—",
      message: fields.message || "—",
      raw: lead,
    };
  });

/** ---------- NEW: robust summary extractor for socket payloads ---------- */
const getField = (fd = [], name) =>
  fd.find((f) => (f?.name || "").toLowerCase() === String(name).toLowerCase())?.values?.[0] || "";

function summarizeSocketLead(p = {}) {
  // Prefer the new structured summary if present
  const s = p.summary || {};
  const fd = p.fieldData || p.field_data || [];

  const name =
    s.name ||
    getField(fd, "full_name") ||
    getField(fd, "name") ||
    getField(fd, "lead_name") ||
    "—";

  const phone =
    s.phone ||
    getField(fd, "phone_number") ||
    getField(fd, "phone") ||
    getField(fd, "mobile") ||
    "—";

  const email =
    s.email ||
    getField(fd, "email") ||
    getField(fd, "email_address") ||
    "—";

  const source =
    s.source ||
    getField(fd, "source") ||
    getField(fd, "page_name") || // fallback if source omitted but page name exists
    "Website";

  const message =
    s.concern ||
    s.message ||
    getField(fd, "concern") ||
    getField(fd, "message") ||
    getField(fd, "comments") ||
    getField(fd, "notes") ||
    "—";

  const createdRaw =
    p.created_time || p.createdTime || p.createdAt || p.created_at || Date.now();
  const createdTime = createdRaw ? new Date(createdRaw) : new Date();

  const id = p.lead_id || p.id || p._id || p.leadId || "";

  return { id, name, phone, email, source, message, createdTime };
}

/* ---------------- Toast (popup) ---------------- */
function Toast({ toast, onClose, onAction, isExiting }) {
  const tone =
    toast.tone === "success"
      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
      : toast.tone === "warning"
        ? "border-amber-300 bg-amber-50 text-amber-800"
        : toast.tone === "error"
          ? "border-red-300 bg-red-50 text-red-800"
          : "border-indigo-300 bg-indigo-50 text-indigo-800";

  const Icon =
    toast.icon ||
    (toast.tone === "success"
      ? FiCheckCircle
      : toast.tone === "warning"
        ? FiAlertTriangle
        : toast.tone === "error"
          ? FiAlertTriangle
          : FiInfo);

  return (
    <div
      className={`w-[380px] rounded-xl border p-4 shadow-lg ${tone} ${isExiting ? "animate-toastOut" : "animate-toastIn"
        } transition-all duration-300 transform`}
      style={{
        maxHeight: isExiting ? 0 : "500px",
        opacity: isExiting ? 0 : 1,
        marginBottom: isExiting ? 0 : "0.75rem",
        overflow: "hidden",
      }}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5">
          <Icon className="text-lg" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold leading-5 truncate flex items-center gap-2">
            {toast.title}
            {toast.leadName && (
              <span className="text-xs font-normal bg-black/10 px-2 py-0.5 rounded-full">
                {toast.leadName}
              </span>
            )}
          </div>

          {toast.message ? <div className="text-sm opacity-90 mt-1 break-words">{toast.message}</div> : null}

          {/* Lead details section */}
          {toast.leadDetails && (
            <div className="mt-3 pt-2 border-t border-current border-opacity-20">
              <div className="space-y-1.5 text-xs">
                {toast.leadDetails.phone && (
                  <div className="flex items-center gap-2">
                    <FiPhoneCall className="opacity-60" />
                    <span>{formatPhoneNumber(toast.leadDetails.phone)}</span>
                  </div>
                )}

                {toast.leadDetails.email && toast.leadDetails.email !== "—" && (
                  <div className="flex items-center gap-2">
                    <FiUser className="opacity-60" />
                    <span className="truncate">{toast.leadDetails.email}</span>
                  </div>
                )}

                {toast.leadDetails.source && (
                  <div className="flex items-center gap-2">
                    <FiInfo className="opacity-60" />
                    <span>From: {toast.leadDetails.source}</span>
                  </div>
                )}

                {toast.leadDetails.message && toast.leadDetails.message !== "—" && (
                  <div className="flex items-center gap-2">
                    <FiMessageSquare className="opacity-60" />
                    <span className="line-clamp-2">{toast.leadDetails.message}</span>
                  </div>
                )}

                {toast.leadDetails.time && (
                  <div className="flex items-center gap-2 text-xs opacity-70">
                    <FiCalendar className="opacity-60" />
                    <span>{toast.leadDetails.time}</span>
                  </div>
                )}
              </div>
            </div>
          )}

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

// Portal so toasts never get clipped by parent overflow/z-index
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
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const push = useCallback(
    (t) => {
      const id =
        (typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID()) ||
        `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const timeout = t.timeout ?? 12000;
      setToasts((prev) => [{ id, ...t }, ...prev]);

      if (timeout > 0) setTimeout(() => remove(id), timeout);
    },
    [remove]
  );

  return { toasts, push, remove };
}

/* ---- Deduper + throttle to avoid spam on reconnect / strict mode ---- */
function useEventDeduper(windowMs = 8000) {
  const seenRef = useRef(new Map()); // id -> timestamp
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      for (const [k, v] of seenRef.current.entries()) {
        if (now - v > windowMs) seenRef.current.delete(k);
      }
    }, windowMs);
    return () => clearInterval(t);
  }, [windowMs]);

  const mark = useCallback((key) => {
    const k = String(key || "");
    const now = Date.now();
    const has = seenRef.current.has(k);
    seenRef.current.set(k, now);
    return has; // true if duplicate
  }, []);

  return mark;
}

/* ---------------- Stat card ---------------- */
function StatsCard({ title, value, icon, tone = "gray", subtitle = "From all sources" }) {
  const toneCls =
    tone === "amber"
      ? "bg-amber-50 text-amber-600"
      : tone === "red"
        ? "bg-red-50 text-red-600"
        : tone === "indigo"
          ? "bg-indigo-50 text-indigo-600"
          : "bg-gray-50 text-gray-600";

  return (
    <article className="rounded-xl bg-white p-4 ring-1 ring-gray-200 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="text-xs text-gray-500">{title}</div>
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${toneCls}`}>{icon}</span>
      </div>
      <div className="mt-2 text-3xl font-bold text-[#1f2233]">{value}</div>
      <div className="mt-0.5 text-xs text-gray-500">{subtitle}</div>
    </article>
  );
}

/* ---------------- Page ---------------- */
export default function Dashboard() {
  const navigate = useNavigate();
  const { toasts, push, remove } = useToasts();
  const { socket, isConnected } = useSocket();

  const [todayCount, setTodayCount] = useState(0);
  const [allLeads, setAllLeads] = useState([]);
  const [callers, setCallers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [activityStats, setActivityStats] = useState({ callers: [], totals: {} });
  usePageTitle("Admin Dashboard", "Welcome back");

  const dedupe = useEventDeduper(8000);
  const lastRefreshRef = useRef(0);

  /* -------- data loaders -------- */
  const refresh = useCallback(async () => {
    const now = Date.now();
    if (now - lastRefreshRef.current < 1200) return; // throttle refresh
    lastRefreshRef.current = now;
    const [t, all] = await Promise.all([fetchTodayLeads(), fetchAllLeads()]);
    setTodayCount(t?.count || 0);
    setAllLeads(all?.leads || []);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [t, all, users, dashStats, actStats] = await Promise.all([
          fetchTodayLeads(),
          fetchAllLeads(),
          getAllUsers({ role: "caller" }),
          fetchAdminDashboardStats(),
          fetchAdminActivityStats(),
        ]);
        if (!mounted) return;
        setTodayCount(t?.count || 0);
        setAllLeads(all?.leads || []);
        setCallers(users || []);
        setStats(dashStats || {});
        setActivityStats(actStats || { callers: [], totals: {} });
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

  /* -------- socket popups (guarded) -------- */
  useEffect(() => {
    if (!socket || !isConnected) return;

    const notifyAndRefresh = (title, message, options = {}) => {
      const toTimeString = (d) => (d instanceof Date && !isNaN(d) ? d.toLocaleTimeString() : "Just now");

      push({
        title,
        message,
        icon: options.icon || FiBell,
        tone: options.tone || "info",
        timeout: options.timeout ?? 12000,
        action: {
          label: options.actionLabel || "Open Leads",
          onClick: () => navigate("/admin/leads"),
        },
        leadName: options.leadName,
        leadDetails: options.leadDetails && {
          ...options.leadDetails,
          time: options.leadDetails?.time || toTimeString(new Date()),
        },
      });
      refresh().catch(() => { });
    };

    const onLeadCreated = (p = {}) => {
      const s = summarizeSocketLead(p);
      if (dedupe(`lead:created:${s.id}`)) return;
      notifyAndRefresh("New lead created", `A new lead has been added to the system.`, {
        leadName: s.name,
        leadDetails: {
          phone: s.phone,
          email: s.email,
          source: s.source,
          message: s.message,
          time: s.createdTime?.toLocaleTimeString(),
        },
      });
    };

    const onLeadIntake = (p = {}) => {
      const s = summarizeSocketLead(p);
      if (dedupe(`lead:intake:${s.id}`)) return;
      notifyAndRefresh("New web lead", `A new lead submitted through the website.`, {
        tone: "success",
        leadName: s.name,
        leadDetails: {
          phone: s.phone,
          email: s.email,
          source: s.source,
          message: s.message,
          time: s.createdTime?.toLocaleTimeString(),
        },
      });
    };

    const onLeadUpdated = (p = {}) => {
      const s = summarizeSocketLead(p);
      if (dedupe(`lead:updated:${s.id}:${p.updatedAt || ""}`)) return;
      notifyAndRefresh("Lead updated", `Lead details were updated.`, {
        icon: FiInfo,
        leadName: s.name,
        leadDetails: {
          phone: s.phone,
          time: new Date().toLocaleTimeString(),
        },
      });
    };

    const onStatusUpdated = (p = {}) => {
      const s = summarizeSocketLead(p);
      if (dedupe(`lead:status_updated:${s.id}:${p.status || ""}`)) return;
      notifyAndRefresh("Lead status changed", `Status updated to: ${p?.status || "updated"}.`, {
        icon: FiInfo,
        leadName: s.name,
      });
    };

    const onCallLogged = (p = {}) => {
      const id = p?.lead?.id || p?.leadId || summarizeSocketLead(p).id || "";
      if (dedupe(`call:logged:${id}:${p?.call?._id || ""}`)) return;
      notifyAndRefresh("Call logged", `Call outcome: ${p?.call?.outcome || "completed"}.`, {
        icon: FiPhoneCall,
        tone: "success",
      });
    };

    const onLeadsAssigned = (p = {}) => {
      const key = Array.isArray(p?.leadIds) ? p.leadIds.join(",") : String(p?.leadIds || "");
      if (dedupe(`leads:assigned:${key}`)) return;
      const n = Array.isArray(p?.leadIds) ? p.leadIds.length : 1;
      notifyAndRefresh("Leads assigned", `${n} lead(s) assigned to a caller.`);
    };

    const onActivity = (p = {}) => {
      const s = summarizeSocketLead(p);
      const act = p?.activity?._id || p?.activity?.action || "";
      if (dedupe(`lead:activity:${s.id}:${act}`)) return;
      notifyAndRefresh("Lead activity", `${p?.activity?.action || "Activity"} recorded.`, {
        leadName: s.name || `Lead #${s.id}`,
      });
    };

    socket.on?.("lead:created", onLeadCreated);
    socket.on?.("lead:intake", onLeadIntake);
    socket.on?.("lead:updated", onLeadUpdated);
    socket.on?.("lead:status_updated", onStatusUpdated);
    socket.on?.("call:logged", onCallLogged);
    socket.on?.("leads:assigned", onLeadsAssigned);
    socket.on?.("lead:activity", onActivity);

    // Optional: toast on reconnect
    notifyAndRefresh("Connected", "Live updates are active.", {
      tone: "success",
      timeout: 2500,
    });

    return () => {
      socket.off?.("lead:created", onLeadCreated);
      socket.off?.("lead:intake", onLeadIntake);
      socket.off?.("lead:updated", onLeadUpdated);
      socket.off?.("lead:status_updated", onStatusUpdated);
      socket.off?.("call:logged", onCallLogged);
      socket.off?.("leads:assigned", onLeadsAssigned);
      socket.off?.("lead:activity", onActivity);
    };
  }, [socket, isConnected, navigate, push, refresh, dedupe]);

  const parsedLeads = useParsedLeads(allLeads);

  // counts
  const pendingCount = useMemo(() => parsedLeads.filter((l) => !l.assignedTo).length, [parsedLeads]);

  const todayPendingCount = useMemo(
    () => parsedLeads.filter((l) => !l.assignedTo && l.createdTime && isSameDay(l.createdTime, new Date())).length,
    [parsedLeads]
  );

  // OP Booked from fieldData ("opd"/"opd_status" contains "booked")
  const opBookedCount = useMemo(() => {
    const get = (lead, keys = []) => {
      for (const f of (lead.raw?.fieldData || lead.raw?.field_data || [])) {
        const k = String(f?.name || "").toLowerCase();
        if (keys.some((x) => k.includes(x))) {
          const v = Array.isArray(f?.values) ? f.values[0] : f?.values || "";
          return String(v);
        }
      }
      return "";
    };
    return (allLeads || []).filter((ld) => /booked/i.test(get({ raw: ld }, ["opd_status", "opd"]))).length;
  }, [allLeads]);

  // caller maps for "Assigned Caller" column
  const callerMap = useMemo(() => {
    const m = new Map();
    (callers || []).forEach((u) => m.set(u.id, u));
    return m;
  }, [callers]);

  const callerCounts = useMemo(() => {
    const counts = new Map();
    (allLeads || []).forEach((l) => {
      if (l.assignedTo) counts.set(l.assignedTo, (counts.get(l.assignedTo) || 0) + 1);
    });
    return counts;
  }, [allLeads]);

  const recent = useMemo(
    () => [...parsedLeads].sort((a, b) => (b.createdTime || 0) - (a.createdTime || 0)).slice(0, 8),
    [parsedLeads]
  );

  // Bucket bars for lead distribution
  const bucketList = useMemo(() => {
    const buckets = stats.buckets || {};
    const map = [
      { label: "New Lead", key: "new lead", tone: "pink" },
      { label: "Hot", key: "hot", tone: "orange" },
      { label: "Hot-IP", key: "hot-ip", tone: "green" },
      { label: "Prospective", key: "prospective", tone: "violet" },
      { label: "Recapture", key: "recapture", tone: "sky" },
      { label: "DNP", key: "dnp", tone: "gray" },
    ];
    return map.map((m) => ({ ...m, value: buckets[m.key] || 0 }));
  }, [stats.buckets]);

  const maxBucket = useMemo(
    () => Math.max(...bucketList.map((b) => b.value), 1),
    [bucketList]
  );

  const barTone = {
    pink: "from-[#ff2e6e] to-[#ff5aa4]",
    orange: "from-orange-500 to-amber-400",
    green: "from-emerald-500 to-emerald-400",
    violet: "from-[#8c3ed8] to-[#a86cf0]",
    sky: "from-sky-500 to-indigo-500",
    gray: "from-gray-300 to-gray-400",
  };

  if (loading) return <Loader fullScreen text="Loading dashboard..." />;

  return (
    <>
      <div className="space-y-8">
        {/* Stat cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatsCard title="Today's Leads" value={loading ? "…" : String(todayCount)} icon={<FiUsers />} tone="amber" />
          <StatsCard
            title="Pending New Leads"
            value={loading ? "…" : String(todayPendingCount)}
            icon={<FiAlertTriangle />}
            tone="red"
          />
          <StatsCard title="OP Booked" value={loading ? "…" : String(opBookedCount)} icon={<FiClipboard />} tone="indigo" />
          <StatsCard title="Unassigned" value={String(pendingCount)} icon={<FiInfo />} />
        </section>

        {/* Performance Metrics */}
        <section className="rounded-2xl border border-gray-100 bg-white p-4 md:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Performance Metrics</h2>
            <p className="text-xs text-gray-500">Aggregated across all callers</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <MetricCard
              title="Today Tasks"
              value={stats.tasksTodayCount || 0}
              hint="All callers"
              footer={`${stats.tasksTodayCount || 0} total`}
              tone="primary"
              max={500}
              icon={<FiTarget />}
            />
            <MetricCard
              title="Calls Made"
              value={stats.callsMadeToday || 0}
              hint="Organization-wide"
              footer={`${stats.callsMadeToday || 0} calls`}
              tone="blue"
              max={200}
              icon={<FiPhoneCall />}
            />
            <MetricCard
              title="Call Duration"
              value={stats.callDurationMin || 0}
              hint="Total talk time"
              footer={`${stats.callDurationMin || 0}min total`}
              tone="green"
              max={1000}
              icon={<FiClock />}
            />
            <MetricCard
              title="OPD Done Today"
              value={stats.opdDoneToday || 0}
              hint="Conversions"
              footer={`${stats.opdDoneToday || 0} conversions`}
              tone="green"
              max={50}
              icon={<FiCheckCircle />}
            />
            <MetricCard
              title="IPD Done Today"
              value={stats.ipdDoneToday || 0}
              hint="Admissions"
              footer={`${stats.ipdDoneToday || 0} admissions`}
              tone="green"
              max={20}
              icon={<FiPieChart />}
            />
          </div>
        </section>

        {/* Lead Distribution */}
        <section className="rounded-2xl border border-gray-100 bg-white p-4 md:p-5 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Lead Distribution</h3>
          <div className="space-y-4">
            {bucketList.map((b) => {
              const pct = Math.max(0, Math.min(100, Math.round((b.value / maxBucket) * 100)));
              return (
                <div key={b.key} className="grid grid-cols-5 items-center gap-3">
                  <div className="col-span-2 md:col-span-1">
                    <p className="text-sm text-gray-700">{b.label}</p>
                  </div>
                  <div className="col-span-3 md:col-span-3">
                    <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={cls(
                          "h-full bg-gradient-to-r rounded-full transition-all",
                          barTone[b.tone]
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-900">{b.value}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Activity & Performance Table */}
        <section className="rounded-2xl border border-gray-100 bg-white p-4 md:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">Activity & Performance</h3>
            <p className="text-xs text-gray-500">Today</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="text-left font-semibold text-gray-700 px-4 py-3">Assignee</th>
                  <th className="text-left font-semibold text-gray-700 px-4 py-3">Calls</th>
                  <th className="text-left font-semibold text-gray-700 px-4 py-3">Duration</th>
                  <th className="text-left font-semibold text-gray-700 px-4 py-3">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {activityStats.callers.map((caller) => (
                  <tr
                    key={caller.id}
                    onClick={() => navigate(`/admin/reports/${caller.id}`)}
                    className="border-b border-gray-100 hover:bg-violet-50 transition cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold">
                          {initialsOf(caller.name)}
                        </div>
                        <span className="font-medium text-gray-900">{caller.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{caller.calls}</td>
                    <td className="px-4 py-3 text-gray-700">{caller.duration}</td>
                    <td className="px-4 py-3 text-gray-700">₹{caller.revenue}</td>
                  </tr>
                ))}
                {activityStats.totals && (
                  <tr className="border-t-2 border-gray-300 font-bold bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">Total</td>
                    <td className="px-4 py-3 text-gray-900">{activityStats.totals.calls || 0}</td>
                    <td className="px-4 py-3 text-gray-900">{activityStats.totals.duration || "0s"}</td>
                    <td className="px-4 py-3 text-gray-900">₹{activityStats.totals.revenue || 0}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Follow Ups Table */}
        <section className="rounded-2xl border border-gray-100 bg-white p-4 md:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">Follow Ups</h3>
            <p className="text-xs text-gray-500">Today</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="text-left font-semibold text-gray-700 px-4 py-3">Assignee</th>
                  <th className="text-left font-semibold text-gray-700 px-4 py-3">Upcoming</th>
                  <th className="text-left font-semibold text-gray-700 px-4 py-3">Late</th>
                  <th className="text-left font-semibold text-gray-700 px-4 py-3">Done</th>
                  <th className="text-left font-semibold text-gray-700 px-4 py-3">Cancel</th>
                </tr>
              </thead>
              <tbody>
                {activityStats.callers.map((caller) => (
                  <tr
                    key={caller.id}
                    onClick={() => navigate(`/admin/reports/${caller.id}`)}
                    className="border-b border-gray-100 hover:bg-violet-50 transition cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-bold">
                          {initialsOf(caller.name)}
                        </div>
                        <span className="font-medium text-gray-900">{caller.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{caller.followUps?.upcoming || 0}</td>
                    <td className="px-4 py-3 text-red-600 font-medium">{caller.followUps?.late || 0}</td>
                    <td className="px-4 py-3 text-green-600 font-medium">{caller.followUps?.done || 0}</td>
                    <td className="px-4 py-3 text-gray-700">{caller.followUps?.cancel || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Lead by Stages Table */}
        <section className="rounded-2xl border border-gray-100 bg-white p-4 md:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">Lead by stages</h3>
            <button className="text-xs text-violet-600 hover:text-violet-700 font-medium">Manage</button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="text-left font-semibold text-gray-700 px-4 py-3">Assignee</th>
                  <th className="text-left font-semibold text-gray-700 px-4 py-3">Fresh</th>
                  <th className="text-left font-semibold text-gray-700 px-4 py-3">Active</th>
                  <th className="text-left font-semibold text-gray-700 px-4 py-3">Won</th>
                  <th className="text-left font-semibold text-gray-700 px-4 py-3">Lost</th>
                </tr>
              </thead>
              <tbody>
                {activityStats.callers.map((caller) => (
                  <tr
                    key={caller.id}
                    onClick={() => navigate(`/admin/reports/${caller.id}`)}
                    className="border-b border-gray-100 hover:bg-violet-50 transition cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                          {initialsOf(caller.name)}
                        </div>
                        <span className="font-medium text-gray-900">{caller.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{caller.leadsByStage?.fresh || 0}</td>
                    <td className="px-4 py-3 text-gray-700">{caller.leadsByStage?.active || 0}</td>
                    <td className="px-4 py-3 text-green-600 font-medium">{caller.leadsByStage?.won || 0}</td>
                    <td className="px-4 py-3 text-red-600 font-medium">{caller.leadsByStage?.lost || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>



      {/* Toasts */}
      <ToastStack toasts={toasts} remove={remove} />

      {/* CSS Animations */}
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
        .line-clamp-2 {
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
      `}</style>
    </>
  );
}

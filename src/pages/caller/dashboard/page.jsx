// src/pages/CallerDashboard.jsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import {
  FiPhoneCall,
  FiTarget,
  FiUsers,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiTrendingUp,
  FiPieChart,
  FiPlus,
  FiBell,
  FiInfo,
  FiUser,
  FiMessageSquare,
  FiX,
} from "react-icons/fi";
import { createPortal } from "react-dom";
import {
  getMe,
  fetchAssignedLeads,
  fetchTodayFollowUps,
  fetchTomorrowFollowUps,
} from "../../../utils/api";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../../contexts/SocketProvider";

/* -------------------- helpers -------------------- */
const cls = (...c) => c.filter(Boolean).join(" ");
const dicebear = (seed) =>
  `https://api.dicebear.com/7.x/initials/svg?radius=50&fontWeight=700&seed=${encodeURIComponent(
    seed || "caller"
  )}`;

const parseDate = (v) => {
  if (!v) return null;
  try {
    const d = new Date(v);
    return isNaN(+d) ? null : d;
  } catch {
    return null;
  }
};
const startOfDay = (d = new Date()) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d = new Date()) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const isToday = (d) =>
  d && d >= startOfDay(new Date()) && d <= endOfDay(new Date());
const isTomorrow = (d) => {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return d && d >= startOfDay(t) && d <= endOfDay(t);
};
const withinNextMinutes = (d, mins = 60) => {
  if (!d) return false;
  const now = new Date();
  const limit = new Date(now.getTime() + mins * 60 * 1000);
  return d > now && d <= limit;
};

// Read value from mixed Meta-style field_data
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
  if (!v) return "new lead";
  if (["hot", "hot lead"].includes(v)) return "hot";
  if (["hot-ip", "hot ip", "hot_inpatient"].includes(v)) return "hot-ip";
  if (["prospective", "prospect"].includes(v)) return "prospective";
  if (["recapture", "re-capture"].includes(v)) return "recapture";
  if (["dnp", "do_not_proceed", "do not proceed"].includes(v)) return "dnp";
  if (["opd booked", "opd_booked"].includes(v)) return "opd booked";
  if (["opd done", "opd_done"].includes(v)) return "opd done";
  if (["ipd done", "ipd_done"].includes(v)) return "ipd done";
  return v;
};

/* -------------------- progress/metric UI -------------------- */
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

const StatCard = ({ title, value, sub, icon, accent = "violet", onClick }) => {
  const accents = {
    violet: "text-violet-600 bg-violet-50",
    pink: "text-pink-600 bg-pink-50",
    sky: "text-sky-600 bg-sky-50",
    emerald: "text-emerald-600 bg-emerald-50",
    amber: "text-amber-600 bg-amber-50",
    indigo: "text-indigo-600 bg-indigo-50",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left w-full rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition"
    >
      <div className="flex items-start gap-3">
        <div className={cls("p-2 rounded-xl", accents[accent])}>{icon}</div>
        <div className="flex-1">
          <p className="text-sm text-gray-500">{title}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <h3 className="text-2xl font-semibold text-gray-900">{value}</h3>
            {sub ? <Pill tone="gray">{sub}</Pill> : null}
          </div>
        </div>
      </div>
    </button>
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

const TaskRow = ({ name, tag, dueIn = "—" }) => (
  <div className="flex items-center justify-between rounded-xl border border-gray-100 p-3 bg-white">
    <div className="flex items-center gap-3">
      <img
        src={dicebear(name)}
        alt={name}
        className="h-9 w-9 rounded-full ring-4 ring-gray-50 object-cover"
      />
      <div>
        <p className="text-sm font-medium text-gray-900">{name}</p>
        <p className="text-xs text-gray-500">{tag || "Follow-up"}</p>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <Pill tone="blue">in {dueIn}</Pill>
      <button
        className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-pink-50 px-3 py-2 text-pink-600 hover:bg-pink-100"
        title="Call now"
      >
        <FiPhoneCall />
        <span className="text-sm font-medium hidden sm:inline">Call</span>
      </button>
    </div>
  </div>
);

/* -------------------- TOASTS (socket popups) -------------------- */
const formatPhoneNumber = (phone) => {
  if (!phone) return "—";
  const cleaned = String(phone).replace(/\D/g, "");
  return cleaned.length === 10
    ? `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    : String(phone);
};

const getFieldExact = (fd = [], name) =>
  fd.find((f) => (f?.name || "").toLowerCase() === String(name).toLowerCase())?.values?.[0] || "";

const summarizeSocketLead = (p = {}) => {
  // Accept both new intake payload shape and generic db lead shape
  const fd = p.fieldData || p.field_data || [];
  const leadDetails = p.leadDetails || {};
  const name =
    p.leadName ||
    getFieldExact(fd, "full_name") ||
    getFieldExact(fd, "name") ||
    getFieldExact(fd, "lead_name") ||
    "—";
  const phone =
    leadDetails.phone ||
    getFieldExact(fd, "phone_number") ||
    getFieldExact(fd, "phone") ||
    getFieldExact(fd, "mobile") ||
    "—";
  const email = getFieldExact(fd, "email") || getFieldExact(fd, "email_address") || "—";
  const source = leadDetails.source || getFieldExact(fd, "source") || getFieldExact(fd, "page_name") || "Website";
  const message =
    leadDetails.message ||
    getFieldExact(fd, "concern") ||
    getFieldExact(fd, "message") ||
    getFieldExact(fd, "comments") ||
    getFieldExact(fd, "notes") ||
    "—";
  const createdRaw = p.created_time || p.createdTime || p.createdAt || p.created_at || leadDetails.time || Date.now();
  const createdTime = createdRaw ? new Date(createdRaw) : new Date();
  const id = p.lead_id || p.id || p._id || p.leadId || "";
  return { id, name, phone, email, source, message, createdTime };
};

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
      className={`w-[380px] rounded-xl border p-4 shadow-lg ${tone} ${
        isExiting ? "animate-toastOut" : "animate-toastIn"
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

          {toast.message ? (
            <div className="text-sm opacity-90 mt-1 break-words">{toast.message}</div>
          ) : null}

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
const ToastPortal = ({ children }) => (typeof document === "undefined" ? null : createPortal(children, document.body));
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
      const timeout = t.timeout ?? 10000;
      setToasts((prev) => [{ id, ...t }, ...prev]);
      if (timeout > 0) setTimeout(() => remove(id), timeout);
    },
    [remove]
  );
  return { toasts, push, remove };
}

/* -------------------- socket helpers (dedupe + refresh) -------------------- */
const useEventDeduper = (windowMs = 8000) => {
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
    const exists = seenRef.current.has(k);
    seenRef.current.set(k, now);
    return exists;
  }, []);
};

const useSoftAssignedRefresh = (setter) => {
  const lastRef = useRef(0);
  const inflightRef = useRef(false);
  return useCallback(async () => {
    const now = Date.now();
    if (inflightRef.current || now - lastRef.current < 1200) return;
    inflightRef.current = true;
    try {
      const res = await fetchAssignedLeads();
      setter(res.leads || []);
      lastRef.current = Date.now();
    } finally {
      inflightRef.current = false;
    }
  }, [setter]);
};

/* -------------------- page -------------------- */
export default function CallersDashboard() {
  const [me, setMe] = useState(null);
  const [leads, setLeads] = useState([]);
  const [todayTasks, setTodayTasks] = useState([]);
  const [tomorrowTasks, setTomorrowTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  usePageTitle("Caller Dashboard", "Welcome back");
  const navigate = useNavigate();

  // socket + toasts
  const { socket, isConnected } = useSocket();
  const { toasts, push, remove } = useToasts();
  const dedupe = useEventDeduper(8000);
  const softRefreshAssigned = useSoftAssignedRefresh(setLeads);

  // Refresh tasks helper
  const refreshTasks = useCallback(async () => {
    try {
      const [t1, t2] = await Promise.all([fetchTodayFollowUps(), fetchTomorrowFollowUps()]);
      setTodayTasks(t1.leads || []);
      setTomorrowTasks(t2.leads || []);
    } catch (e) {
      console.warn("Failed to refresh tasks", e);
    }
  }, []);

  // initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [user, assigned, t1, t2] = await Promise.all([
          getMe(),
          fetchAssignedLeads(),
          fetchTodayFollowUps(),
          fetchTomorrowFollowUps(),
        ]);
        if (!mounted) return;
        setMe(user);
        setLeads(assigned.leads || []);
        setTodayTasks(t1.leads || []);
        setTomorrowTasks(t2.leads || []);
      } catch (e) {
        setErr(e?.response?.data?.message || e?.message || "Failed to load dashboard data");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // toast helper
  const notify = useCallback(
    (title, message, opts = {}) => {
      const withTime = (t) => (t instanceof Date && !isNaN(t) ? t.toLocaleTimeString() : "Just now");
      push({
        title,
        message,
        icon: opts.icon || FiBell,
        tone: opts.tone || "info",
        timeout: opts.timeout ?? 10000,
        leadName: opts.leadName,
        leadDetails: opts.leadDetails && {
          ...opts.leadDetails,
          time: opts.leadDetails.time || withTime(new Date()),
        },
        action: opts.action || {
          label: "Open My Leads",
          onClick: () => navigate("/caller/leads"),
        },
      });
    },
    [push, navigate]
  );

  // socket → popups + data refresh
  useEffect(() => {
    if (!socket || !isConnected) return;

    const onLeadIntake = (p = {}) => {
      const s = summarizeSocketLead(p);
      if (dedupe(`callerDash:lead:intake:${s.id}`)) return;
      notify("New web lead", "A new lead submitted through the website.", {
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
      softRefreshAssigned();
      refreshTasks();
    };

    const onLeadCreated = (p = {}) => {
      const s = summarizeSocketLead(p);
      if (dedupe(`callerDash:lead:created:${s.id}`)) return;
      notify("New lead created", "A new lead has been added.", {
        leadName: s.name,
        leadDetails: {
          phone: s.phone,
          email: s.email,
          source: s.source,
          message: s.message,
          time: s.createdTime?.toLocaleTimeString(),
        },
      });
      softRefreshAssigned();
      refreshTasks();
    };

    const onLeadUpdated = (p = {}) => {
      const s = summarizeSocketLead(p);
      if (dedupe(`callerDash:lead:updated:${s.id}:${p.updatedAt || ""}`)) return;
      notify("Lead updated", "Lead details were updated.", {
        icon: FiInfo,
        leadName: s.name,
        leadDetails: { phone: s.phone },
      });
      softRefreshAssigned();
      refreshTasks();
    };

    const onStatusUpdated = (p = {}) => {
      const s = summarizeSocketLead(p);
      if (dedupe(`callerDash:lead:status:${s.id}:${p.status || ""}`)) return;
      notify("Lead status changed", `Status updated to: ${p?.status || "updated"}.`, {
        icon: FiInfo,
        leadName: s.name,
      });
      softRefreshAssigned();
      refreshTasks();
    };

    const onActivity = (p = {}) => {
      const s = summarizeSocketLead(p);
      const act = p?.activity?._id || p?.activity?.action || "";
      if (dedupe(`callerDash:lead:activity:${s.id}:${act}`)) return;
      notify("Lead activity", `${p?.activity?.action || "Activity"} recorded.`, {
        leadName: s.name || `Lead #${s.id}`,
      });
      softRefreshAssigned();
      refreshTasks();
    };

    const onCallLogged = (p = {}) => {
      const id = p?.lead?.id || p?.leadId || "";
      if (dedupe(`callerDash:call:logged:${id}:${p?.call?._id || ""}`)) return;
      notify("Call logged", `Call outcome: ${p?.call?.outcome || "completed"}.`, {
        icon: FiPhoneCall,
        tone: "success",
      });
      softRefreshAssigned();
      refreshTasks();
    };

    const onLeadsAssigned = (p = {}) => {
      const key = Array.isArray(p?.leadIds) ? p.leadIds.join(",") : String(p?.leadIds || "");
      if (dedupe(`callerDash:leads:assigned:${key}`)) return;
      const n = Array.isArray(p?.leadIds) ? p.leadIds.length : 1;
      notify("Leads assigned", `${n} lead(s) assigned to a caller.`, { icon: FiInfo });
      softRefreshAssigned();
      refreshTasks();
    };

    socket.on?.("lead:intake", onLeadIntake);
    socket.on?.("lead:created", onLeadCreated);
    socket.on?.("lead:updated", onLeadUpdated);
    socket.on?.("lead:status_updated", onStatusUpdated);
    socket.on?.("lead:activity", onActivity);
    socket.on?.("call:logged", onCallLogged);
    socket.on?.("leads:assigned", onLeadsAssigned);

    // heads-up toast
    notify("Connected", "Live updates are active.", { tone: "success", timeout: 2500 });

    return () => {
      socket.off?.("lead:intake", onLeadIntake);
      socket.off?.("lead:created", onLeadCreated);
      socket.off?.("lead:updated", onLeadUpdated);
      socket.off?.("lead:status_updated", onStatusUpdated);
      socket.off?.("lead:activity", onActivity);
      socket.off?.("call:logged", onCallLogged);
      socket.off?.("leads:assigned", onLeadsAssigned);
    };
  }, [socket, isConnected, notify, dedupe, softRefreshAssigned, refreshTasks]);

  /* -------------------- computed metrics -------------------- */
  const computed = useMemo(() => {
    const now = new Date();

    const buckets = {
      "new lead": 0,
      hot: 0,
      "hot-ip": 0,
      prospective: 0,
      recapture: 0,
      dnp: 0,
    };

    let todayNewLeads = 0;
    let callsMadeToday = 0;
    let callDurationMin = 0;
    let idleMin = 0;
    let lastCallAt = null;
    let opdBookedToday = 0;
    let opdDoneToday = 0;
    let ipdDoneToday = 0;

    for (const lead of leads) {
      const created = parseDate(lead.createdTime);
      const fd = Array.isArray(lead.fieldData) ? lead.fieldData : [];

      // status/bucket
      const statusRaw = readField(fd, ["status", "lead_status", "bucket"]) || "new lead";
      const status = normStatus(statusRaw);
      if (buckets[status] !== undefined) buckets[status]++;

      if (isToday(created)) todayNewLeads++;

      const lastCall = parseDate(readField(fd, ["last_call_at", "last_called_at", "last_call"]));
      if (lastCall && isToday(lastCall)) callsMadeToday++;
      if (!lastCallAt || (lastCall && lastCall > lastCallAt)) lastCallAt = lastCall;

      const callDur = Number(readField(fd, ["call_duration_today", "talk_time_today"]));
      if (!Number.isNaN(callDur)) callDurationMin += callDur;

      const idle = Number(readField(fd, ["idle_minutes_today", "idle_time"]));
      if (!Number.isNaN(idle)) idleMin += idle;

      if (status === "opd booked" && isToday(created)) opdBookedToday++;
      if (status === "opd done" && isToday(created)) opdDoneToday++;
      if (status === "ipd done" && isToday(created)) ipdDoneToday++;
    }

    // tasks from API
    const tasksTodayCount = todayTasks.length;
    const tasksTomorrowCount = tomorrowTasks.length;

    const upcomingHour = todayTasks
      .filter((l) => withinNextMinutes(l.followUpAt, 60))
      .map((lead) => {
        const fuDate = lead.followUpAt instanceof Date ? lead.followUpAt : (lead.followUpAt ? new Date(lead.followUpAt) : null);
        const diffMin = fuDate ? Math.max(1, Math.round((fuDate.getTime() - now.getTime()) / 60000)) : "—";
        return { lead, fuDate, diffMin };
      })
      .sort((a, b) => (a.fuDate?.getTime() || 0) - (b.fuDate?.getTime() || 0))
      .slice(0, 3);

    const lastCallAgoMin = lastCallAt
      ? Math.max(1, Math.round((now.getTime() - lastCallAt.getTime()) / 60000))
      : null;

    return {
      todayNewLeads,
      tasksTodayCount,
      tasksTomorrowCount,
      opdBookedToday,
      opdDoneToday,
      ipdDoneToday,
      callsMadeToday,
      callDurationMin,
      idleMin,
      lastCallAgoMin,
      upcomingHour,
      buckets,
    };
  }, [leads, todayTasks, tomorrowTasks]);

  // Bucket bars
  const bucketList = useMemo(() => {
    const map = [
      { label: "New Lead", key: "new lead", tone: "pink" },
      { label: "Hot", key: "hot", tone: "orange" },
      { label: "Hot-IP", key: "hot-ip", tone: "green" },
      { label: "Prospective", key: "prospective", tone: "violet" },
      { label: "Recapture", key: "recapture", tone: "sky" },
      { label: "DNP", key: "dnp", tone: "gray" },
    ];
    return map.map((m) => ({ ...m, value: computed.buckets[m.key] || 0 }));
  }, [computed.buckets]);

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

  /* -------------------- UI -------------------- */
  if (loading) {
    return (
      <main className="">
        <div className="mx-autol px-4 py-10">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 bg-gray-200 rounded" />
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-28 rounded-2xl bg-white border border-gray-100 shadow-sm">
                  <div className="h-full bg-gray-100/50 rounded-2xl" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (err) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {err}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="">
      <div className="mx-auto px-4 py-6 space-y-6">
        {/* Top stats */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            title="Today New Leads"
            value={computed.todayNewLeads}
            sub={`${computed.todayNewLeads} today`}
            icon={<FiUsers />}
            accent="violet"
            onClick={() => navigate("/caller/leads?date=today&status=new")}
          />
         <StatCard
   title={"Today's Task"}
   value={computed.tasksTodayCount}
   sub={`${computed.tasksTodayCount} due`}
   icon={<FiTarget />}
   accent="pink"
   onClick={() => navigate("/caller/leads?date=tasks_today&view=tasks_today")}
 />
          <StatCard
            title={"Tomorrow's Task"}
            value={computed.tasksTomorrowCount}
            sub={`${computed.tasksTomorrowCount} scheduled`}
            icon={<FiCalendar />}
            accent="sky"
    onClick={() => navigate("/caller/leads?date=tasks_tomorrow&view=tasks_tomorrow")}
  />
          <StatCard
            title="OPD Booked Today"
            value={computed.opdBookedToday}
            sub="Target: 2"
            icon={<FiCheckCircle />}
            accent="emerald"
            onClick={() => navigate("/caller/leads?date=today&status=opd%20booked")}
          />
          <StatCard
            title="OPD Done Today"
            value={computed.opdDoneToday}
            sub="Target: 3/10"
            icon={<FiPieChart />}
            accent="amber"
          />
          <StatCard
            title="IPD Done Today"
            value={computed.ipdDoneToday}
            sub="Target: 3/10"
            icon={<FiPieChart />}
            accent="indigo"
          />
        </section>

        {/* Performance Metrics */}
        <section className="rounded-2xl border border-gray-100 bg-white p-4 md:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Performance Metrics</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard
              title="Today Task"
              value={computed.tasksTodayCount}
              hint={computed.tasksTodayCount >= 50 ? "Great progress!" : "You're at part of your daily goal"}
              footer={`${computed.tasksTodayCount}/100`}
              tone={computed.tasksTodayCount >= 50 ? "green" : "orange"}
              max={100}
              icon={<FiTarget />}
            />
            <MetricCard
              title="Calls Made"
              value={computed.callsMadeToday}
              hint={computed.callsMadeToday ? "Keep up the momentum!" : "No calls logged"}
              footer={`${computed.callsMadeToday}/50 calls`}
              tone={computed.callsMadeToday ? "blue" : "orange"}
              max={50}
              icon={<FiPhoneCall />}
            />
            <MetricCard
              title="Call Duration"
              value={computed.callDurationMin}
              hint={computed.callDurationMin >= 30 ? "Nice talk time!" : "Low talk time"}
              footer={`${computed.callDurationMin}min / 120min`}
              tone={computed.callDurationMin >= 30 ? "green" : "red"}
              max={120}
              icon={<FiClock />}
            />
            <MetricCard
              title="Idle Time"
              value={computed.idleMin}
              hint={computed.idleMin > 60 ? "High idle time" : "Good pace"}
              footer={`${computed.idleMin}min`}
              tone={computed.idleMin > 60 ? "red" : "green"}
              max={180}
              icon={<FiClock />}
            />
            <MetricCard
              title="Last Call Made"
              value={computed.lastCallAgoMin ? `${computed.lastCallAgoMin}m` : "—"}
              hint={computed.lastCallAgoMin ? "Great activity!" : "No call yet today"}
              footer={computed.lastCallAgoMin ? `${computed.lastCallAgoMin} mins ago` : "—"}
              tone={computed.lastCallAgoMin ? "green" : "orange"}
              max={60}
              icon={<FiPhoneCall />}
            />
            <MetricCard
              title="OPD Done"
              value={computed.opdDoneToday}
              hint={computed.opdDoneToday ? "Almost halfway there!" : "Start closing!"}
              footer={`${computed.opdDoneToday}/5 con`}
              tone={computed.opdDoneToday ? "green" : "orange"}
              max={5}
              icon={<FiCheckCircle />}
            />
            <MetricCard
              title="IPD Done"
              value={computed.ipdDoneToday}
              hint={computed.ipdDoneToday ? "One more to reach" : "Keep pushing"}
              footer={`${computed.ipdDoneToday}/3`}
              tone={computed.ipdDoneToday ? "green" : "orange"}
              max={3}
              icon={<FiCheckCircle />}
            />
            <MetricCard
              title="Streak"
              value={computed.callsMadeToday >= 100 ? 3 : 0}
              hint={computed.callsMadeToday >= 100 ? "You're on a 3-Day Streak!" : "Build your streak"}
              footer={computed.callsMadeToday >= 100 ? "You’ve completed 100+ calls 3 days in a row" : "—"}
              tone={computed.callsMadeToday >= 100 ? "blue" : "orange"}
              max={7}
              icon={<FiTrendingUp />}
            />
          </div>
        </section>

        {/* Bottom: Tasks + Bucket */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today Task Reminder */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 md:p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Today Task Reminder</h3>
                <p className="text-xs text-gray-500">
                  {computed.upcomingHour.length} Upcoming Follow-ups in next 1 hour
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {computed.upcomingHour.length ? (
                computed.upcomingHour.map(({ lead, diffMin }, i) => {
                  const fd = lead.fieldData || [];
                  const name = readField(fd, ["full_name", "name"]) || "Unknown Lead";
                  const tag =
                    readField(fd, ["category", "service", "treatment"]) || "Follow-up";
                  return <TaskRow key={lead.id || i} name={name} tag={tag} dueIn={`${diffMin}m`} />;
                })
              ) : (
                <div className="rounded-xl border border-gray-100 p-4 text-sm text-gray-600 bg-gray-50">
                  No follow-ups in the next hour.
                </div>
              )}
            </div>
          </div>

          {/* Your Bucket */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 md:p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">Your Bucket</h3>
              <div className="flex items-center gap-2">
                <select className="rounded-lg border-gray-200 text-sm">
                  <option>This Month</option>
                  <option>Last Month</option>
                  <option>This Week</option>
                  <option>Today</option>
                </select>
              </div>
            </div>

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
          </div>
        </section>
      </div>

      {/* Floating Action Button */}
      <button
        title="Quick actions"
        className="fixed bottom-6 right-6 group inline-flex items-center justify-center rounded-full p-4 bg-gradient-to-br from-[#ff2e6e] to-[#ff5aa4] text-white shadow-xl hover:opacity-95"
      >
        <FiPlus size={22} />
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-6 min-w-6 px-1 rounded-full bg-white text-[#ff2e6e] text-xs font-semibold shadow">
          3
        </span>
      </button>

      {/* Socket Toasts */}
      <ToastStack toasts={toasts} remove={remove} />

      {/* Animations / clamp */}
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
    </main>
  );
}

// src/pages/Callers.jsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiBell,
  FiInfo,
  FiPhoneCall,
  FiUser,
  FiCalendar,
  FiMessageSquare,
  FiCheckCircle,
  FiX,
} from "react-icons/fi";
import { createPortal } from "react-dom";
import { getAllUsers, fetchAllLeads, createUser, updateUser, deleteUser } from "../../../utils/api";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";
import { useSocket } from "../../../contexts/SocketProvider";
import Loader from "../../../components/Loader";

/* ---------------- small utils ---------------- */
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

/* -------- socket helpers (parsing + toasts) -------- */
const getField = (fd = [], name) =>
  fd.find((f) => (f?.name || "").toLowerCase() === String(name).toLowerCase())?.values?.[0] || "";

const summarizeSocketLead = (p = {}) => {
  const s = p.summary || {};
  const fd = p.fieldData || p.field_data || [];

  const name =
    s.name || getField(fd, "full_name") || getField(fd, "name") || getField(fd, "lead_name") || "—";
  const phone =
    s.phone || getField(fd, "phone_number") || getField(fd, "phone") || getField(fd, "mobile") || "—";
  const email = s.email || getField(fd, "email") || getField(fd, "email_address") || "—";
  const source = s.source || getField(fd, "source") || getField(fd, "page_name") || "Website";
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
};

const formatPhoneNumber = (phone) => {
  if (!phone) return "—";
  const cleaned = String(phone).replace(/\D/g, "");
  return cleaned.length === 10
    ? `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    : String(phone);
};

/* --------- Toast components (portal + animations) --------- */
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
    (toast.tone === "success" ? FiCheckCircle : toast.tone === "warning" ? FiInfo : FiInfo);

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

function ToastPortal({ children }) {
  if (typeof document === "undefined") return null;
  return document.body ? createPortal(children, document.body) : null;
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
      const timeout = t.timeout ?? 10000;
      setToasts((prev) => [{ id, ...t }, ...prev]);
      if (timeout > 0) setTimeout(() => remove(id), timeout);
    },
    [remove]
  );
  return { toasts, push, remove };
}

/* -------- socket: dedupe + soft refresh -------- */
const useEventDeduper = (windowMs = 8000) => {
  const seenRef = useRef(new Map());
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      for (const [k, v] of seenRef.current.entries()) if (now - v > windowMs) seenRef.current.delete(k);
    }, windowMs);
    return () => clearInterval(t);
  }, [windowMs]);

  const seen = useCallback((key) => {
    const k = String(key || "");
    const now = Date.now();
    const exists = seenRef.current.has(k);
    seenRef.current.set(k, now);
    return exists;
  }, []);

  return seen;
};

const useSoftLeadRefresh = (setter) => {
  const lastRef = useRef(0);
  const inflightRef = useRef(false);
  return useCallback(async () => {
    const now = Date.now();
    if (inflightRef.current || now - lastRef.current < 1200) return;
    inflightRef.current = true;
    try {
      const all = await fetchAllLeads();
      setter(all.leads || []);
      lastRef.current = Date.now();
    } finally {
      inflightRef.current = false;
    }
  }, [setter]);
};

/* -------- Caller Modal -------- */
function CallerModal({ open, mode, initialData, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    city: "", // Added city
    state: "", // Added state
    password: "",
  });

  useEffect(() => {
    if (open) {
      if (mode === "edit" && initialData) {
        setFormData({
          name: initialData.name || "",
          email: initialData.email || "",
          phone: initialData.phone || "",
          city: initialData.city || "", // Added city
          state: initialData.state || "", // Populate state
          password: "", // Leave empty to keep unchanged
        });
      } else {
        setFormData({ name: "", email: "", phone: "", city: "", state: "", password: "" });
      }
    }
  }, [open, mode, initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          {mode === "edit" ? "Edit Caller" : "Create Caller"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
            <input
              required
              type="text"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#7d3bd6]"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              required
              type="email"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#7d3bd6]"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
              <input
                required
                type="text"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#7d3bd6]"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">City</label>
                <input
                  type="text"
                  placeholder="e.g. Chennai"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#7d3bd6]"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">State</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Tamil Nadu"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#7d3bd6]"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Password {mode === "edit" && <span className="text-gray-400 font-normal">(leave blank to keep)</span>}
            </label>
            <input
              type="password"
              required={mode === "create"}
              minLength={6}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#7d3bd6]"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#7d3bd6] px-4 py-2 text-sm font-medium text-white hover:bg-[#6b32b8]"
            >
              {mode === "edit" ? "Save Changes" : "Create Caller"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

/* ---------------- page ---------------- */
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

  // CRUD State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" | "edit"
  const [selectedCaller, setSelectedCaller] = useState(null);

  // CRUD Handlers
  const handleCreate = () => {
    setModalMode("create");
    setSelectedCaller(null);
    setModalOpen(true);
  };

  const handleEdit = (caller) => {
    setModalMode("edit");
    setSelectedCaller(caller);
    setModalOpen(true);
  };

  const handleDelete = async (caller) => {
    if (!window.confirm(`Are you sure you want to delete caller "${caller.name}"? This action cannot be undone.`)) return;
    try {
      await deleteUser(caller.id);
      setCallers((prev) => prev.filter((c) => c.id !== caller.id));
      notify("Caller Deleted", "", { tone: "success" });
    } catch (err) {
      console.error(err);
      notify("Error", "Failed to delete caller", { tone: "error" });
    }
  };

  const handleModalSubmit = async (formData) => {
    try {
      if (modalMode === "create") {
        const payload = { ...formData, role: "caller" };
        const newCaller = await createUser(payload);
        // Add to list immediately (will be refreshed on next load, but good for UX)
        setCallers((prev) => [newCaller, ...prev]);
        notify("Caller Created", `${newCaller.name} added successfully.`, { tone: "success" });
      } else {
        const payload = { ...formData };
        if (!payload.password) delete payload.password; // Don't send empty password
        const updated = await updateUser(selectedCaller.id, payload);
        setCallers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        notify("Caller Updated", "Changes saved successfully.", { tone: "success" });
      }
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.error || err.message || "Operation failed";
      notify("Error", msg, { tone: "error" });
    }
  };

  // socket
  const { socket, isConnected } = useSocket();
  const { toasts, push, remove } = useToasts();
  const dedupe = useEventDeduper(8000);
  const softRefreshLeads = useSoftLeadRefresh(setLeads);

  // load data
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [usersRes, leadsRes] = await Promise.all([getAllUsers({ role: "caller" }), fetchAllLeads()]);
        if (!mounted) return;
        setCallers(usersRes); // normalized to {id, name, email, role, phone}
        setLeads(leadsRes?.leads || []);
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
          label: "Open Leads",
          onClick: () => navigate("/admin/leads"),
        },
      });
    },
    [push, navigate]
  );

  // socket listeners for popups + stats refresh
  useEffect(() => {
    if (!socket || !isConnected) return;

    const onLeadIntake = (p = {}) => {
      const s = summarizeSocketLead(p);
      if (dedupe(`callers:lead:intake:${s.id}`)) return;
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
      softRefreshLeads();
    };

    const onLeadCreated = (p = {}) => {
      const s = summarizeSocketLead(p);
      if (dedupe(`callers:lead:created:${s.id}`)) return;
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
      softRefreshLeads();
    };

    const onLeadUpdated = (p = {}) => {
      const s = summarizeSocketLead(p);
      if (dedupe(`callers:lead:updated:${s.id}:${p.updatedAt || ""}`)) return;
      notify("Lead updated", "Lead details were updated.", {
        icon: FiInfo,
        leadName: s.name,
        leadDetails: { phone: s.phone },
      });
      softRefreshLeads();
    };

    const onStatusUpdated = (p = {}) => {
      const s = summarizeSocketLead(p);
      if (dedupe(`callers:lead:status:${s.id}:${p.status || ""}`)) return;
      notify("Lead status changed", `Status updated to: ${p?.status || "updated"}.`, {
        icon: FiInfo,
        leadName: s.name,
      });
      softRefreshLeads();
    };

    const onActivity = (p = {}) => {
      const s = summarizeSocketLead(p);
      const act = p?.activity?._id || p?.activity?.action || "";
      if (dedupe(`callers:lead:activity:${s.id}:${act}`)) return;
      notify("Lead activity", `${p?.activity?.action || "Activity"} recorded.`, {
        leadName: s.name || `Lead #${s.id}`,
      });
      softRefreshLeads();
    };

    const onCallLogged = (p = {}) => {
      const id = p?.lead?.id || p?.leadId || "";
      if (dedupe(`callers:call:logged:${id}:${p?.call?._id || ""}`)) return;
      notify("Call logged", `Call outcome: ${p?.call?.outcome || "completed"}.`, {
        icon: FiPhoneCall,
        tone: "success",
      });
      softRefreshLeads();
    };

    const onLeadsAssigned = (p = {}) => {
      const key = Array.isArray(p?.leadIds) ? p.leadIds.join(",") : String(p?.leadIds || "");
      if (dedupe(`callers:leads:assigned:${key}`)) return;
      const n = Array.isArray(p?.leadIds) ? p.leadIds.length : 1;
      notify("Leads assigned", `${n} lead(s) assigned to a caller.`, { icon: FiInfo });
      softRefreshLeads();
    };

    socket.on?.("lead:intake", onLeadIntake);
    socket.on?.("lead:created", onLeadCreated);
    socket.on?.("lead:updated", onLeadUpdated);
    socket.on?.("lead:status_updated", onStatusUpdated);
    socket.on?.("lead:activity", onActivity);
    socket.on?.("call:logged", onCallLogged);
    socket.on?.("leads:assigned", onLeadsAssigned);

    // quick heads-up on connect
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
  }, [socket, isConnected, notify, dedupe, softRefreshLeads]);

  /* -------- aggregate per caller -------- */
  const rows = useMemo(() => {
    const map = new Map();
    callers.forEach((c) =>
      map.set(c.id, {
        id: c.id,
        name: c.name || "—",
        email: c.email || "—",
        phone: c.phone || "—",
        city: c.city || "",   // Added city
        state: c.state || "", // Added state
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

  if (loading) return <Loader fullScreen text="Loading callers..." />;

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
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 rounded-xl bg-[#7d3bd6] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#6b32b8] transition-colors"
          >
            <FiUser className="text-lg" />
            <span>Create Caller</span>
          </button>
          <div className="h-6 w-px bg-gray-200 mx-1"></div>

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
                <th className="text-left text-[16px] font-medium px-4 py-4">City</th>
                <th className="text-left text-[16px] font-medium px-4 py-4">State</th>
                <th className="text-left text-[16px] font-medium px-4 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((c) => (
                <tr key={c.id} className="border-b last:border-b-0 border-[#ccc] hover:bg-gray-50/50">
                  <td className="px-4 py-4">
                    <Link
                      to={`/admin/callers/${encodeURIComponent(c.id)}`}
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
                  <td className="px-4 py-4 text-gray-700">{c.city}</td>
                  <td className="px-4 py-4 text-gray-700">{c.state}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/admin/callers/${encodeURIComponent(c.id)}`}
                        className="rounded-xl bg-white px-3 py-1.5 text-xs ring-1 ring-gray-200 hover:bg-gray-50 text-gray-700"
                        title="Open caller dashboard"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => handleEdit(c)}
                        className="rounded-xl bg-white px-3 py-1.5 text-xs ring-1 ring-gray-200 hover:bg-gray-50 text-blue-600 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        className="rounded-xl bg-white px-3 py-1.5 text-xs ring-1 ring-gray-200 hover:bg-red-50 text-red-600 font-medium"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() =>
                          navigate(`/admin/leads?callerId=${encodeURIComponent(c.id)}`)
                        }
                        className="rounded-xl bg-white px-3 py-1.5 text-xs ring-1 ring-gray-200 hover:bg-gray-50 text-gray-700"
                        title="View this caller's leads"
                      >
                        Leads
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

      {/* Modal */}
      <CallerModal
        open={modalOpen}
        mode={modalMode}
        initialData={selectedCaller}
        onClose={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
      />

      {/* Toasts (socket popups) */}
      <ToastStack toasts={toasts} remove={remove} />

      {/* Toast animations + clamp */}
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
    </div>
  );
}

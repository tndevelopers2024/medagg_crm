// src/pages/LeadsManagement.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FiChevronLeft,
  FiChevronRight,
  FiBell,
  FiPhoneCall,
  FiInfo,
} from "react-icons/fi";
import { fetchAllLeads, fetchAssignedLeads, getAllUsers, assignLeadsToCaller, assignLeadsByLocation, bulkUpdateLeads, fetchLeadFields, fetchLeadStages } from "../../../utils/api";
import BulkEditSidebar from "../../../components/admin/BulkEditSidebar";
import LeadFilters from "../../../components/admin/leads/LeadFilters";
import LeadActions from "../../../components/admin/leads/LeadActions";
import LeadPagination from "../../../components/admin/leads/LeadPagination";
import { AssignModal, AssignLocationModal, SuccessDialog } from "../../../components/admin/leads/LeadModals";
import { parseLead, socketPayloadToLead, summarizeSocketLead, formatPhoneNumber } from "../../../utils/leadHelpers";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";
import { useSocket } from "../../../contexts/SocketProvider";
import { useAuth } from "../../../contexts/AuthContext";
import Loader from "../../../components/Loader";
import { createPortal } from "react-dom";
import { FiX, FiCheckCircle, FiUser, FiMessageSquare, FiCalendar } from "react-icons/fi";
import SaveFilterTemplateModal from "../../../components/admin/SaveFilterTemplateModal";
import FilterTemplateDropdown from "../../../components/admin/FilterTemplateDropdown";
import {
  fetchFilterTemplates,
  createFilterTemplate,
  deleteFilterTemplate,
  setDefaultTemplate,
  applyFilterTemplate
} from "../../../utils/filterTemplateApi";

/* ---------- Toast components (portal + animations) ---------- */
// Keeping Toast locally for now as it uses local animations and is tightly coupled
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

/* ---------------- socket helpers: dedupe + soft refresh + highlight ---------------- */
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

const useSoftRefresh = (setter, fetchFn) => {
  const lastRef = useRef(0);
  const inflightRef = useRef(false);
  // Default to fetchAllLeads if no fn provided, but we should always provide one now
  const activeFetch = fetchFn || fetchAllLeads;

  return useCallback(async () => {
    const now = Date.now();
    if (inflightRef.current || now - lastRef.current < 1200) return;
    inflightRef.current = true;
    try {
      const all = await activeFetch();
      setter(all.leads || []);
      lastRef.current = Date.now();
    } finally {
      inflightRef.current = false;
    }
  }, [setter, activeFetch]);
};

/* ----------------------------- page ----------------------------- */
export default function LeadsManagement() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAdmin, isCaller, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [callers, setCallers] = useState([]);
  const [fieldConfigs, setFieldConfigs] = useState([]);
  const [leadStages, setLeadStages] = useState([]); // Dynamic lead stages
  const { socket, isConnected } = useSocket();
  const { toasts, push, remove } = useToasts();

  usePageTitle("Leads Management", "Manage your leads effectively");

  // filters
  const [dateMode, setDateMode] = useState("7d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [source, setSource] = useState("All Sources");
  const [callerFilter, setCallerFilter] = useState("All Callers");
  const [leadStatus, setLeadStatus] = useState("Lead Status");
  const [followupFilter, setFollowupFilter] = useState("All");
  const [opdStatus, setOpdStatus] = useState("OPD Status");
  const [ipdStatus, setIpdStatus] = useState("IPD Status");
  const [diagnostics, setDiagnostics] = useState("Diagnostics");
  const [search, setSearch] = useState("");

  // Apply URL parameters on mount
  // Apply URL parameters on mount
  useEffect(() => {
    const urlDate = searchParams.get('date');
    const urlStatus = searchParams.get('status');
    const urlView = searchParams.get('view');

    // Handle date parameter
    if (urlDate === 'today') {
      setDateMode('Today');
    }
    else if (urlDate === 'tasks_today' || urlView === 'tasks_today') {
      setDateMode('Today');
    }
    else if (urlDate === 'tasks_tomorrow' || urlView === 'tasks_tomorrow') {
      setDateMode('Tomorrow');
      setFollowupFilter("Scheduled"); // ✅ Auto select Scheduled
    }

    // Call You Later / Followup View
    if (urlView === 'call_later' || urlStatus === 'call_later') {
      setFollowupFilter("Scheduled"); // ✅ Force Scheduled
    }

    // Handle status parameter
    if (urlStatus) {
      const decodedStatus = decodeURIComponent(urlStatus);
      // Don't force format - trust the URL to match the value, or let case-insensitive search handle it
      setLeadStatus(decodedStatus);
    }

  }, [searchParams]);


  // Filter templates
  const [filterTemplates, setFilterTemplates] = useState([]);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [currentTemplateId, setCurrentTemplateId] = useState(null);

  // Assignment states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showLocationAssignModal, setShowLocationAssignModal] = useState(false);

  // selection
  const [selected, setSelected] = useState(new Set());

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const headerCheckboxRef = useRef(null);

  // highlight map for row flash
  const [highlight, setHighlight] = useState(() => new Set());
  const addHighlight = useCallback((id) => {
    if (!id) return;
    setHighlight((prev) => new Set(prev).add(String(id)));
    setTimeout(() => {
      setHighlight((prev) => {
        const n = new Set(prev);
        n.delete(String(id));
        return n;
      });
    }, 2500);
  }, []);

  // Determine effective role & fetch function
  const effectiveIsCaller = isCaller || (user?.role || "").toLowerCase() === "caller";
  const fetchFn = effectiveIsCaller ? fetchAssignedLeads : fetchAllLeads;

  const softRefresh = useSoftRefresh(setRows, fetchFn);
  const dedupe = useEventDeduper(8000);

  // load data
  useEffect(() => {
    let mounted = true;
    if (authLoading) return; // Wait for auth to settle

    (async () => {
      try {
        setLoading(true);

        console.log('AllLeads - Loading data...');
        console.log('AllLeads - isCaller:', isCaller);
        console.log('AllLeads - effectiveIsCaller:', effectiveIsCaller);
        console.log('AllLeads - user:', user);

        // Fetch leads based on role
        const leadsPromise = fetchFn();

        const [all, users, fieldsRes, stagesRes] = await Promise.all([
          leadsPromise,
          isAdmin ? getAllUsers({ role: "caller" }) : Promise.resolve([]),
          fetchLeadFields({ active: true }),
          fetchLeadStages({ active: true })
        ]);
        if (!mounted) return;

        console.log('AllLeads - Fetched leads:', all);
        console.log('AllLeads - Leads count:', all.leads?.length || 0);

        setRows(all.leads || []);
        setCallers(users.filter((u) => (u.role || "").toLowerCase() === "caller"));
        setFieldConfigs(fieldsRes.data || []);
        setLeadStages(stagesRes.data || []);
      } catch (e) {
        console.error('AllLeads - Error loading data:', e);
        console.error('AllLeads - Error response:', e?.response?.data);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [authLoading, isCaller, effectiveIsCaller, isAdmin, fetchFn]);

  // Load filter templates on mount
  useEffect(() => {
    if (!authLoading) {
      loadFilterTemplates();
    }
  }, [authLoading]);

  const loadFilterTemplates = async () => {
    try {
      const response = await fetchFilterTemplates();
      setFilterTemplates(response.data || []);

      // Auto-apply default template if exists and no current template is selected
      const defaultTemplate = response.data?.find(t => t.isDefault);
      if (defaultTemplate && !currentTemplateId) {
        applyTemplate(defaultTemplate);
      }
    } catch (error) {
      console.error('Error loading filter templates:', error);
      // Only notify if it's a real error, not just 404 (though list endpoint shouldn't 404)
      if (error?.response?.status !== 404) {
        notify('Error', 'Failed to load saved filters', { tone: 'error' });
      }
    }
  };

  const applyTemplate = async (template) => {
    try {
      // Apply filters
      setLeadStatus(template.filters.status?.[0] || 'Lead Status');
      setCallerFilter(template.filters.assignee?.[0] || 'All Callers');
      setDateMode(template.filters.dateMode || '7d');
      if (template.filters.dateRange?.start) {
        setCustomFrom(new Date(template.filters.dateRange.start).toISOString().split('T')[0]);
      }
      if (template.filters.dateRange?.end) {
        setCustomTo(new Date(template.filters.dateRange.end).toISOString().split('T')[0]);
      }
      setSource(template.filters.source?.[0] || 'All Sources');

      // Extended filters
      setFollowupFilter(template.filters.followup?.[0] || 'All');
      setOpdStatus(template.filters.opd?.[0] || 'OPD Status');
      setIpdStatus(template.filters.ipd?.[0] || 'IPD Status');
      setDiagnostics(template.filters.diagnostic?.[0] || 'Diagnostics');

      setSearch(template.filters.searchQuery || '');

      setCurrentTemplateId(template._id);

      // Track usage
      await applyFilterTemplate(template._id);

      notify('Filter Applied', `Template "${template.name}" applied successfully`, { tone: 'success' });
    } catch (error) {
      console.error('Error applying template:', error);
      notify('Error', 'Failed to apply filter template', { tone: 'error' });
    }
  };

  const handleSaveTemplate = async (templateData) => {
    try {
      await createFilterTemplate(templateData);
      await loadFilterTemplates();
      notify('Template Saved', `Filter template "${templateData.name}" saved successfully`, { tone: 'success' });
    } catch (error) {
      console.error('Error saving template:', error);
      notify('Error', 'Failed to save filter template', { tone: 'error' });
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!confirm('Delete this filter template?')) return;

    try {
      await deleteFilterTemplate(id);
      await loadFilterTemplates();
      if (currentTemplateId === id) {
        setCurrentTemplateId(null);
      }
      notify('Template Deleted', 'Filter template deleted successfully', { tone: 'success' });
    } catch (error) {
      console.error('Error deleting template:', error);
      notify('Error', 'Failed to delete filter template', { tone: 'error' });
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await setDefaultTemplate(id);
      await loadFilterTemplates();
      notify('Default Set', 'Default filter template updated', { tone: 'success' });
    } catch (error) {
      console.error('Error setting default:', error);
      notify('Error', 'Failed to set default template', { tone: 'error' });
    }
  };


  // notify helper
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
        action: opts.action, // optional
      });
    },
    [push]
  );

  // ... socket listeners (kept matching exact file logic) ...
  useEffect(() => {
    if (!socket || !isConnected) return;

    const upsertFromSocket = (payload) => {
      const minimal = socketPayloadToLead(payload);
      const incomingId = String(minimal._id || minimal.id || minimal.leadId || "");

      setRows((prev) => {
        const idx = prev.findIndex((r) => String(r._id || r.id || r.leadId) === incomingId);
        if (idx >= 0) {
          const next = prev.slice();
          next[idx] = { ...next[idx], ...minimal, fieldData: minimal.fieldData || next[idx].fieldData };
          return next;
        }
        return [{ ...minimal }, ...prev];
      });

      addHighlight(incomingId);
      softRefresh();
    };

    const onLeadIntake = (p = {}) => {
      const s = summarizeSocketLead(p);
      if (dedupe(`lead:intake:${s.id}`)) return;
      upsertFromSocket(p);
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
    };

    // ... other socket handlers ...
    // Note: Reusing exact logic but referencing imported helpers
    const onLeadCreated = (p = {}) => {
      const s = summarizeSocketLead(p);
      if (dedupe(`lead:created:${s.id}`)) return;
      upsertFromSocket(p);
      notify("New lead created", "A new lead has been added.", { leadName: s.name });
    };

    const onLeadUpdated = (p = {}) => {
      const s = summarizeSocketLead(p);
      if (dedupe(`lead:updated:${s.id}:${p.updatedAt || ""}`)) return;
      upsertFromSocket(p);
      notify("Lead updated", "Lead details were updated.", {
        icon: FiInfo,
        leadName: s.name,
        leadDetails: { phone: s.phone },
      });
    };

    const onStatusUpdated = (p = {}) => {
      const s = summarizeSocketLead(p);
      if (dedupe(`lead:status_updated:${s.id}:${p.status || ""}`)) return;
      upsertFromSocket({ ...(p.lead || {}), _id: s.id, status: p.status });
      notify("Lead status changed", `Status updated to: ${p?.status || "updated"}.`, {
        icon: FiInfo,
        leadName: s.name,
      });
    };

    const onActivity = (p = {}) => {
      const s = summarizeSocketLead(p);
      const act = p?.activity?._id || p?.activity?.action || "";
      if (dedupe(`lead:activity:${s.id}:${act}`)) return;
      softRefresh();
      addHighlight(s.id);
      notify("Lead activity", `${p?.activity?.action || "Activity"} recorded.`, {
        leadName: s.name || `Lead #${s.id}`,
      });
    };

    const onCallLogged = (p = {}) => {
      const id = p?.lead?.id || p?.leadId || "";
      if (dedupe(`call:logged:${id}:${p?.call?._id || ""}`)) return;
      softRefresh();
      addHighlight(id);
      notify("Call logged", `Call outcome: ${p?.call?.outcome || "completed"}.`, {
        icon: FiPhoneCall,
        tone: "success",
      });
    };

    const onLeadsAssigned = (p = {}) => {
      const key = Array.isArray(p?.leadIds) ? p.leadIds.join(",") : String(p?.leadIds || "");
      if (dedupe(`leads:assigned:${key}`)) return;
      softRefresh();
      (Array.isArray(p?.leadIds) ? p.leadIds : [p?.leadIds]).forEach((lid) => lid && addHighlight(lid));
      const n = Array.isArray(p?.leadIds) ? p.leadIds.length : 1;
      notify("Leads assigned", `${n} lead(s) assigned to a caller.`, { icon: FiInfo });
    };

    socket.on?.("lead:intake", onLeadIntake);
    socket.on?.("lead:created", onLeadCreated);
    socket.on?.("lead:updated", onLeadUpdated);
    socket.on?.("lead:status_updated", onStatusUpdated);
    socket.on?.("lead:activity", onActivity);
    socket.on?.("call:logged", onCallLogged);
    socket.on?.("leads:assigned", onLeadsAssigned);

    return () => {
      socket.off?.("lead:intake", onLeadIntake);
      socket.off?.("lead:created", onLeadCreated);
      socket.off?.("lead:updated", onLeadUpdated);
      socket.off?.("lead:status_updated", onStatusUpdated);
      socket.off?.("lead:activity", onActivity);
      socket.off?.("call:logged", onCallLogged);
      socket.off?.("leads:assigned", onLeadsAssigned);
    };
  }, [socket, isConnected, dedupe, softRefresh, addHighlight, notify]);

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
    () => {
      // Use dynamic lead stages if available
      if (leadStages && leadStages.length > 0) {
        return ["Lead Status", ...leadStages.map(stage => stage.stageName)];
      }
      // Fallback to field config
      const statusField = fieldConfigs.find(f => f.fieldName === 'lead_status' || f.fieldName === 'status');
      if (statusField && statusField.options && statusField.options.length > 0) {
        return ["Lead Status", ...statusField.options];
      }
      // Final fallback to loaded data
      return ["Lead Status", ...Array.from(new Set(leads.map((l) => l.leadStatus))).sort()];
    },
    [leads, fieldConfigs, leadStages]
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

  const followupOptions = useMemo(() => [
    { label: "Scheduled", value: "Scheduled" },
    { label: "Today", value: "Today" },
    { label: "Tomorrow", value: "Tomorrow" },
    { label: "This Week", value: "This Week" },
    { label: "Overdue", value: "Overdue" },
    { label: "Not Scheduled", value: "Not Scheduled" },
    { label: "All", value: "All" },
  ], []);

  // available fields for bulk edit - create mapping between display labels and field names
  const { availableFields, fieldNameMap } = useMemo(() => {
    const fieldsMap = new Map(); // displayLabel -> fieldName
    const labelsSet = new Set();

    // Add from field configs
    fieldConfigs.forEach(f => {
      const label = f.displayLabel || f.fieldName;
      const fieldName = f.fieldName;
      labelsSet.add(label);
      fieldsMap.set(label, fieldName);
    });

    // Add from actual lead data
    leads.forEach(l => {
      if (l.raw?.fieldData) {
        l.raw.fieldData.forEach(f => {
          const fieldName = f.name;
          // Try to find config for this field
          const cfg = fieldConfigs.find(c => c.fieldName === (fieldName || '').toLowerCase());
          const label = cfg ? cfg.displayLabel : fieldName;
          labelsSet.add(label);
          if (!fieldsMap.has(label)) {
            fieldsMap.set(label, fieldName);
          }
        });
      }
    });

    return {
      availableFields: Array.from(labelsSet).sort(),
      fieldNameMap: fieldsMap
    };
  }, [leads, fieldConfigs]);

  // filtering
  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const inLastDays = (d, n) => {
    const now = new Date();
    const from = new Date(now);
    from.setDate(now.getDate() - (n - 1));
    from.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);
    return d >= from && d <= to;
  };

  const filtered = useMemo(() => {
    let list = [...leads];
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

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.phone.toLowerCase().includes(q) ||
          (l.source || "").toLowerCase().includes(q)
      );
    }

    if (source !== "All Sources") list = list.filter((l) => l.source === source);
    if (leadStatus !== "Lead Status") {
      list = list.filter((l) => (l.leadStatus || "").toLowerCase() === leadStatus.toLowerCase());
    }
    if (opdStatus !== "OPD Status") list = list.filter((l) => l.opdStatus === opdStatus);
    if (ipdStatus !== "IPD Status") list = list.filter((l) => l.ipdStatus === ipdStatus);
    if (diagnostics !== "Diagnostics") list = list.filter((l) => l.diagnostic === diagnostics);

    if (callerFilter !== "All Callers") {
      list =
        callerFilter === "Unassigned"
          ? list.filter((l) => !l.assignedTo)
          : list.filter((l) => l.assignedTo === callerFilter);
    }

    // Filter by followup status and date
    if (followupFilter !== "All") {
      if (followupFilter === "Scheduled") {
        // Any future follow-up
        list = list.filter((l) => l.followUpAt && new Date(l.followUpAt) > now);
      } else if (followupFilter === "Not Scheduled") {
        // No follow-up or past follow-up
        list = list.filter((l) => !l.followUpAt || new Date(l.followUpAt) <= now);
      } else if (followupFilter === "Today") {
        // Follow-up scheduled for today
        list = list.filter((l) => {
          if (!l.followUpAt) return false;
          const followUpDate = new Date(l.followUpAt);
          return isSameDay(followUpDate, now);
        });
      } else if (followupFilter === "Tomorrow") {
        // Follow-up scheduled for tomorrow
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        list = list.filter((l) => {
          if (!l.followUpAt) return false;
          const followUpDate = new Date(l.followUpAt);
          return isSameDay(followUpDate, tomorrow);
        });
      } else if (followupFilter === "This Week") {
        // Follow-up scheduled within the next 7 days
        const weekFromNow = new Date(now);
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        list = list.filter((l) => {
          if (!l.followUpAt) return false;
          const followUpDate = new Date(l.followUpAt);
          return followUpDate >= now && followUpDate <= weekFromNow;
        });
      } else if (followupFilter === "Overdue") {
        // Follow-up date has passed
        list = list.filter((l) => {
          if (!l.followUpAt) return false;
          const followUpDate = new Date(l.followUpAt);
          return followUpDate < now;
        });
      }
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
    followupFilter,
    opdStatus,
    ipdStatus,
    diagnostics,
    search,
  ]);

  // pagination
  const totalPages = Math.ceil(filtered.length / pageSize);
  const currentRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleAllCurrentPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = currentRows.every((r) => next.has(r.id));
      if (allSelected) {
        currentRows.forEach((r) => next.delete(r.id));
      } else {
        currentRows.forEach((r) => next.add(r.id));
      }
      return next;
    });
  };
  const isAllCurrentSelected = currentRows.length > 0 && currentRows.every((r) => selected.has(r.id));
  const isSomeCurrentSelected =
    currentRows.some((r) => selected.has(r.id)) && !isAllCurrentSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isSomeCurrentSelected;
    }
  }, [isSomeCurrentSelected]);

  const toggleOne = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // assign flows
  /* ---------------------- bulk operations ---------------------- */

  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successText, setSuccessText] = useState("");

  /* ---------------- handlers ---------------- */
  const handleLocationAssign = async ({ state, city, callerId }) => {
    try {
      setLoading(true);
      // Payload matches backend expectation for bulk query-based assignment
      const res = await assignLeadsByLocation({ state, city, callerId });
      setSuccessText(res.message || "Leads assigned successfully");
      setSuccessOpen(true);
      await softRefresh();
      setShowLocationAssignModal(false);
    } catch (err) {
      setLoading(false);
      console.error(err);
      alert(err?.response?.data?.message || err.message || "Assignment failed");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAssignByLocation = async () => {
    if (!selected.size) return;
    if (!window.confirm(`Auto-assign ${selected.size} leads based on location match?`)) return;

    setLoading(true);
    try {
      const { assignedCount, message } = await assignLeadsByLocation({
        leadIds: Array.from(selected),
      });
      notify("Auto-assigned", message || `Assigned ${assignedCount} leads.`, { tone: "success" });
      setSelected(new Set());
      await softRefresh();
    } catch (err) {
      console.error(err);
      notify("Assignment failed", "Could not auto-assign leads.", { tone: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAssign = async ({ callerId }) => {
    try {
      const ids = Array.from(selected);
      await assignLeadsToCaller(ids, callerId);
      setShowAssignModal(false);
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

  // smart assign (round-robin)
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

  const handleBulkUpdate = async (updates) => {
    try {
      const leadIds = Array.from(selected);
      const res = await bulkUpdateLeads({ leadIds, updates });
      if (res.success) {
        notify("Leads Updated", `${res.count} leads were successfully updated.`, { tone: "success" });
        await softRefresh();
        setSelected(new Set());
        setShowBulkEdit(false);
      } else {
        throw new Error(res.error || "Update failed");
      }
    } catch (err) {
      console.error(err);
      notify("Update Failed", "Could not update leads. Please try again.", { tone: "error" });
    }
  };

  const resetFilters = () => {
    setDateMode("7d");
    setCustomFrom("");
    setCustomTo("");
    setSource("All Sources");
    setCallerFilter("All Callers");
    setLeadStatus("Lead Status");
    setFollowupFilter("All");
    setOpdStatus("OPD Status");
    setIpdStatus("IPD Status");
    setDiagnostics("Diagnostics");
    setSearch("");
  };

  const Pill = ({ text, tone }) => {
    const cls =
      tone === "red"
        ? "bg-red-100 text-red-600 ring-red-200"
        : tone === "blue"
          ? "bg-blue-100 text-blue-700 ring-blue-200"
          : tone === "green"
            ? "bg-green-100 text-green-700 ring-green-200"
            : "bg-gray-100 text-gray-600 ring-gray-200";
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${cls}`}>
        {text}
      </span>
    );
  };

  const getPaginationRange = (current, total) => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let last;

    for (let i = 1; i <= total; i++) {
      if (
        i === 1 ||
        i === total ||
        (i >= current - delta && i <= current + delta)
      ) {
        range.push(i);
      }
    }

    for (let i of range) {
      if (last) {
        if (i - last === 2) {
          rangeWithDots.push(last + 1);
        } else if (i - last > 2) {
          rangeWithDots.push("...");
        }
      }
      rangeWithDots.push(i);
      last = i;
    }

    return rangeWithDots;
  };

  /* ----------------------------- render ----------------------------- */
  return (
    <div className="min-h-screen bg-gray-50/50 p-6 pb-20">
      <ToastStack toasts={toasts} remove={remove} />

      {/* Sidebar & Modals - Admin only */}
      {isAdmin && (
        <>
          <BulkEditSidebar
            open={showBulkEdit}
            onClose={() => setShowBulkEdit(false)}
            selectedCount={selected.size}
            callers={callers}
            onUpdate={handleBulkUpdate}
            leadStages={leadStatusOptions.filter(s => s !== 'Lead Status')}
            availableFields={availableFields}
            fieldConfigs={fieldConfigs}
            fieldNameMap={fieldNameMap}
          />

          <AssignModal
            open={showAssignModal}
            callers={callers}
            count={selected.size}
            onClose={() => setShowAssignModal(false)}
            onConfirm={handleBulkAssign}
          />
          <SuccessDialog
            open={successOpen}
            onClose={() => setSuccessOpen(false)}
            text={successText}
          />

          {/* Floating Actions */}
          <LeadActions
            selectedCount={selected.size}
            onEdit={() => setShowBulkEdit(true)}
            onAssign={() => setShowAssignModal(true)}
            onClear={() => setSelected(new Set())}
          />
        </>
      )}

      {/* Header Info */}
      <div className="mb-6 flex items-center justify-between">
        {/* ... (Header content unchanged basically, can extract later) ... */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Leads Management</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your leads effectively</p>
        </div>
        <div className="flex gap-2">
          {/* Filter Templates */}
          <FilterTemplateDropdown
            templates={filterTemplates}
            onSelect={applyTemplate}
            onDelete={handleDeleteTemplate}
            onSetDefault={handleSetDefault}
            currentTemplateId={currentTemplateId}
          />

          <button
            onClick={() => setShowSaveTemplateModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#E9296A] px-4 py-2 text-sm font-medium text-white hover:bg-[#d12560] transition-colors"
          >
            <FiCheckCircle className="w-4 h-4" />
            Save Filter
          </button>

          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Filters */}
      <section className="mb-6">
        <LeadFilters
          dateMode={dateMode} setDateMode={setDateMode}
          customFrom={customFrom} setCustomFrom={setCustomFrom}
          customTo={customTo} setCustomTo={setCustomTo}
          source={source} setSource={setSource} sourceOptions={sourceOptions}
          caller={callerFilter} setCaller={setCallerFilter} callerOptions={isAdmin ? callerOptions : []}
          status={leadStatus} setStatus={setLeadStatus} statusOptions={leadStatusOptions}
          followup={followupFilter} setFollowup={setFollowupFilter} followupOptions={followupOptions}
          opd={opdStatus} setOpd={setOpdStatus} opdOptions={opdOptions}
          ipd={ipdStatus} setIpd={setIpdStatus} ipdOptions={ipdOptions}
          diag={diagnostics} setDiag={setDiagnostics} diagOptions={diagOptions}
          search={search} setSearch={setSearch}
          fieldConfigs={fieldConfigs}
        />
      </section>

      {/* Table Section */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Loading / Empty States */}
        {loading && (
          <div className="flex justify-center p-12">
            <Loader />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="p-12 text-center text-gray-500">No leads found matching your criteria.</div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="p-4 w-4">
                    <input
                      type="checkbox"
                      ref={headerCheckboxRef}
                      checked={isAllCurrentSelected}
                      onChange={toggleAllCurrentPage}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Lead Name</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Lead Status</th>
                  <th className="px-4 py-3 font-medium">OPD Status</th>
                  <th className="px-4 py-3 font-medium">IPD Status</th>
                  <th className="px-4 py-3 font-medium">Diagnostic</th>
                  {user?.data?.role === 'admin' && (
                    <th className="px-4 py-3 font-medium">Assigned To</th>
                  )}
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentRows.map((lead) => {
                  const isSelected = selected.has(lead.id);
                  const isFlashed = highlight.has(String(lead.id));
                  return (
                    <tr
                      key={lead.id}
                      className={`hover:bg-gray-50 transition-colors ${isSelected ? "bg-indigo-50/60" : ""} ${isFlashed ? "animate-rowFlash" : ""}`}
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(lead.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{lead.name}</td>
                      <td className="px-4 py-3">{formatPhoneNumber(lead.phone)}</td>
                      <td className="px-4 py-3">{lead.source}</td>
                      <td className="px-4 py-3">
                        <Pill text={lead.leadStatus} tone={lead.leadStatus === 'new' ? 'blue' : 'gray'} />
                      </td>
                      <td className="px-4 py-3"><Pill text={lead.opdStatus} /></td>
                      <td className="px-4 py-3"><Pill text={lead.ipdStatus} /></td>
                      <td className="px-4 py-3"><Pill text={lead.diagnostic} /></td>
                      {user?.data?.role === 'admin' && (
                        <td className="px-4 py-3">
                          {lead.assignedTo ? (
                            <div className="flex items-center gap-2">
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-600">
                                {(lead.assignedToUser?.name || callerMap.get(lead.assignedTo)?.name || "U")[0]}
                              </div>
                              <span className="truncate max-w-[100px]">
                                {lead.assignedToUser?.name || callerMap.get(lead.assignedTo)?.name || "Unknown"}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Unassigned</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {lead.createdTime?.toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => navigate(`/admin/leads/${lead.id}`)} className="text-gray-400 hover:text-indigo-600">
                          <FiChevronRight />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="border-t border-gray-100 bg-white px-4 py-3 flex items-center justify-between">
          {/* Info */}
          <div className="text-sm text-gray-500">
            Showing{" "}
            <span className="font-medium text-gray-900">
              {page * pageSize - pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium text-gray-900">
              {Math.min(page * pageSize, filtered.length)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-gray-900">
              {filtered.length}
            </span>{" "}
            leads
          </div>

          {/* Pagination */}
          <div className="flex items-center gap-1">
            {/* Prev */}
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
              className={`px-3 py-1.5 rounded-lg border text-sm transition
        ${page === 1
                  ? "text-gray-300 border-gray-200 cursor-not-allowed"
                  : "text-gray-600 border-gray-300 hover:bg-gray-50"}
      `}
            >
              <FiChevronLeft />
            </button>

            {/* Pages */}
            {getPaginationRange(page, totalPages).map((p, i) =>
              p === "..." ? (
                <span key={i} className="px-2 text-gray-400">
                  …
                </span>
              ) : (
                <button
                  key={i}
                  onClick={() => setPage(p)}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition
            ${page === p
                      ? "bg-indigo-600 text-white border-indigo-600 shadow"
                      : "text-gray-600 border-gray-300 hover:bg-gray-50"}
          `}
                >
                  {p}
                </button>
              )
            )}

            {/* Next */}
            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className={`px-3 py-1.5 rounded-lg border text-sm transition
        ${page === totalPages
                  ? "text-gray-300 border-gray-200 cursor-not-allowed"
                  : "text-gray-600 border-gray-300 hover:bg-gray-50"}
      `}
            >
              <FiChevronRight />
            </button>
          </div>
        </div>

        {/* Location Assign Button */}
        {isAdmin && (
          <div className="p-4 border-t bg-gray-50 flex justify-end">
            <button
              onClick={() => setShowLocationAssignModal(true)}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
            >
              📍 Assign by Location
            </button>
          </div>
        )}
      </section>

      {/* Assignment Modals */}
      <AssignModal
        open={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        callers={callers}
        onConfirm={handleBulkAssign}
        count={selected.size}
      />
      <AssignLocationModal
        open={showLocationAssignModal}
        onClose={() => setShowLocationAssignModal(false)}
        callers={callers}
        onConfirm={handleLocationAssign}
      />

      {/* Filter Template Modal */}
      <SaveFilterTemplateModal
        isOpen={showSaveTemplateModal}
        onClose={() => setShowSaveTemplateModal(false)}
        currentFilters={{
          status: [leadStatus],
          assignee: [callerFilter],
          source: [source],
          followup: [followupFilter],
          opd: [opdStatus],
          ipd: [ipdStatus],
          diagnostic: [diagnostics],
          dateMode,
          dateRange: { start: customFrom || null, end: customTo || null },
          searchQuery: search
        }}
        currentSorting={{
          field: 'createdAt', // Default for now
          order: 'desc'
        }}
        onSave={handleSaveTemplate}
      />

      <style>{`
        @keyframes rowFlash {
          0% { background-color: #f0ecff; }
          100% { background-color: transparent; }
        }
        .animate-rowFlash { animation: rowFlash .8s ease-out 0s 1; }

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

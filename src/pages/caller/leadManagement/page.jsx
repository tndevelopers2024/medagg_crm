// src/pages/leads/LeadManagement.jsx
"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  FiArrowLeft,
  FiSave,
  FiClock,
  FiPhoneCall,
  FiMessageCircle,
  FiEdit3,
  FiPlusCircle,
  FiTrash2,
  FiCheckCircle,
  FiRefreshCcw,
  FiShare2,
  FiList,
  FiActivity,
  FiUser,
  FiMic,
  FiStar,
} from "react-icons/fi";
import {
  // removed: getMe, fetchAssignedLeads, fetchAllLeads
  fetchLeadDetail,
  updateLeadDetails,
  updateLeadStatus,
  deferLeadToNextDay, // uses date/hour/minute now
  addOpBooking,
  updateOpBooking,
  removeOpBooking,
  addIpBooking,
  updateIpBooking,
  removeIpBooking,
  fetchLeadActivities,
  BOOKING_STATUSES,
  requestMobileCall,
  fetchLeadFields,
  fetchBookingFields,
  fetchLeadStages,
  BASE_URL,
} from "../../../utils/api";

// ... existing helpers ...

// Action → icon/tone mapping (for activity timeline)
const actionMeta = (action = "") => {
  const base = {
    Icon: FiActivity,
    tone: "bg-gray-50 text-gray-700 border-gray-200",
    label: action.replace(/_/g, " "),
  };
  const map = {
    call_logged: {
      Icon: FiPhoneCall,
      tone: "bg-sky-50 text-sky-700 border-sky-200",
    },
    recording_uploaded: {
      Icon: FiMic,
      tone: "bg-rose-50 text-rose-700 border-rose-200",
    },
    lead_update: {
      Icon: FiEdit3,
      tone: "bg-gray-50 text-gray-700 border-gray-200",
    },

    fielddata_replace: {
      Icon: FiList,
      tone: "bg-indigo-50 text-indigo-700 border-indigo-200",
    },
    fielddata_merge: {
      Icon: FiList,
      tone: "bg-indigo-50 text-indigo-700 border-indigo-200",
    },

    op_booking_add: {
      Icon: FiPlusCircle,
      tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    op_booking_update: {
      Icon: FiEdit3,
      tone: "bg-amber-50 text-amber-700 border-amber-200",
    },
    op_booking_remove: {
      Icon: FiTrash2,
      tone: "bg-rose-50 text-rose-700 border-rose-200",
    },

    ip_booking_add: {
      Icon: FiPlusCircle,
      tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    ip_booking_update: {
      Icon: FiEdit3,
      tone: "bg-amber-50 text-amber-700 border-amber-200",
    },
    ip_booking_remove: {
      Icon: FiTrash2,
      tone: "bg-rose-50 text-rose-700 border-rose-200",
    },
  };
  return { ...base, ...(map[action] || {}) };
};

// ... inside component ...



import { usePageTitle } from "../../../contexts/TopbarTitleContext";
import Loader from "../../../components/Loader";
import { DynamicField, fieldDataToObject, objectToFieldData } from "../../../components/DynamicField";

// ---------- helpers ----------
const cls = (...c) => c.filter(Boolean).join(" ");
const useQuery = () => new URLSearchParams(useLocation().search);
const parseDate = (v) => (v ? new Date(v) : null);
const pad2 = (n) => String(n).padStart(2, "0");
const toYMD = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const tomorrowYMD = () => toYMD(new Date(Date.now() + 24 * 60 * 60 * 1000));
const fmtTime = (d) =>
  d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
const fmtDate = (v) => {
  if (!v) return "";
  const d = typeof v === "string" ? new Date(v) : v;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString();
};
const fmtDateTime = (v) => {
  if (!v) return "—";
  const d = typeof v === "string" ? new Date(v) : v;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString()} • ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};
const timeToHHMM = (dateLike) => {
  if (!dateLike) return "10:00";
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "10:00";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

// Helper to format concise activity messages
const formatActivity = (a) => {
  const actor = a.actor ? (a.actor.name || a.actor.email || "User") : "System";

  if (a.action === 'lead_update') {
    if (a.diff?.after?.status && a.diff?.before?.status) {
      return `${actor} changed status from ${a.diff.before.status} to ${a.diff.after.status}`;
    }
    if (a.diff?.after?.status) {
      return `${actor} set status to ${a.diff.after.status}`;
    }
    if (a.diff?.after?.notes) {
      return `${actor} added a note`;
    }
    return `${actor} updated lead details`;
  }

  if (a.action === 'fielddata_merge' || a.action === 'fielddata_replace') {
    const changes = [];
    if (a.diff?.after) {
      // It seems diff.after contains the key-value pairs that changed
      Object.keys(a.diff.after).forEach(key => {
        if (key === '_id' || key === 'updatedAt') return;

        const oldVal = a.diff.before?.[key];
        const newVal = a.diff.after[key];

        // Simple equality check
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          // Format key name: "phone_number" -> "Phone Number"
          const readableKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          changes.push(readableKey);
        }
      });
    }

    if (changes.length === 1) {
      return `${actor} updated ${changes[0]}`;
    } else if (changes.length > 1) {
      // "User updated Phone, Email and City"
      const last = changes.pop();
      return `${actor} updated ${changes.join(", ")} and ${last}`;
    }
    return `${actor} updated lead information`;
  }

  if (a.action === 'call_logged') {
    return `${actor} logged a call`;
  }

  if (a.action === 'recording_uploaded') {
    return `${actor} uploaded a recording`;
  }

  if (a.action?.startsWith('op_booking_')) {
    const type = a.action.includes('add') ? 'added' : a.action.includes('update') ? 'updated' : 'removed';
    return `${actor} ${type} an OP booking`;
  }

  if (a.action?.startsWith('ip_booking_')) {
    const type = a.action.includes('add') ? 'added' : a.action.includes('update') ? 'updated' : 'removed';
    return `${actor} ${type} an IP booking`;
  }

  // Fallback
  return `${actor} performed ${a.action.replace(/_/g, ' ')}`;
};

const readField = (fieldData = [], keys = []) => {
  for (const f of fieldData) {
    const k = (f?.name || "").toLowerCase().replace(/\s+/g, "_");
    if (keys.includes(k)) {
      const v = Array.isArray(f?.values)
        ? f.values[0]
        : f?.values || f?.value || "";
      if (v) return String(v);
    }
  }
  return "";
};

const toneChip = {
  new: "bg-violet-50 text-violet-700",
  hot: "bg-rose-50 text-rose-700",
  "hot-ip": "bg-emerald-50 text-emerald-700",
  prospective: "bg-sky-50 text-sky-700",
  recapture: "bg-amber-50 text-amber-700",
  dnp: "bg-gray-100 text-gray-700",
  opd_booked: "bg-emerald-50 text-emerald-700",
};

const Input = (p) => (
  <div className="space-y-1">
    <label className="text-xs text-gray-600">{p.label}</label>
    <input
      {...p}
      className={cls(
        "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none",
        "focus:ring-2 focus:ring-violet-100",
        p.className
      )}
    />
  </div>
);
const Select = ({ label, value, onChange, options = [], ...rest }) => (
  <div className="space-y-1">
    <label className="text-xs text-gray-600">{label}</label>
    <select
      value={value}
      onChange={onChange}
      {...rest}
      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-100"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </div>
);
const Textarea = ({ label, ...p }) => (
  <div className="space-y-1">
    <label className="text-xs text-gray-600">{label}</label>
    <textarea
      {...p}
      rows={6}
      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-100"
    />
  </div>
);

// ---------- page ----------
export default function LeadManagement() {
  const { id } = useParams(); // /:role/leads/:id
  const q = useQuery();
  const navigate = useNavigate();
  usePageTitle("Lead Management");

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [laterDate, setLaterDate] = useState("");

  // Dynamic field configurations
  const [leadFields, setLeadFields] = useState([]);
  const [opFields, setOpFields] = useState([]);
  const [ipFields, setIpFields] = useState([]);
  const [leadStages, setLeadStages] = useState([]);
  const [fieldsLoading, setFieldsLoading] = useState(true);

  // Dynamic lead data (replaces hardcoded form)
  const [leadData, setLeadData] = useState({});

  // right card
  const [status, setStatus] = useState("new");
  const [notes, setNotes] = useState("");
  const [opdBooked, setOpdBooked] = useState(false);

  // bookings arrays
  const [opBookings, setOpBookings] = useState([]);
  const [ipBookings, setIpBookings] = useState([]);
  const [calling, setCalling] = useState(false);

  // NEW: defer modal
  const [deferring, setDeferring] = useState(false);
  const [showLaterModal, setShowLaterModal] = useState(false);
  const [laterTime, setLaterTime] = useState("10:00");

  // activities from backend
  const [activities, setActivities] = useState([]);
  const [actsLoading, setActsLoading] = useState(false);
  const [expanded, setExpanded] = useState({}); // activityId -> boolean
  const toggleExpand = (aid) => setExpanded((s) => ({ ...s, [aid]: !s[aid] }));

  const loadActivities = useCallback(async () => {
    if (!id) return;
    try {
      setActsLoading(true);
      const res = await fetchLeadActivities(id, { limit: 50 });
      setActivities(res.activities || []);
    } catch (e) {
      console.error("fetchLeadActivities error:", e);
    } finally {
      setActsLoading(false);
    }
  }, [id]);

  // Load field configurations
  useEffect(() => {
    const loadConfigs = async () => {
      try {
        setFieldsLoading(true);
        const [leadRes, opRes, ipRes, stagesRes] = await Promise.all([
          fetchLeadFields({ active: "true" }),
          fetchBookingFields({ type: "OP", active: "true" }),
          fetchBookingFields({ type: "IP", active: "true" }),
          fetchLeadStages({ active: "true" }),
        ]);
        if (leadRes.success) setLeadFields(leadRes.data);
        if (opRes.success) setOpFields(opRes.data);
        if (ipRes.success) setIpFields(ipRes.data);
        if (stagesRes.success) setLeadStages(stagesRes.data);
      } catch (err) {
        console.error("Error loading field configs:", err);
      } finally {
        setFieldsLoading(false);
      }
    };
    loadConfigs();
  }, []);

  // —— load the lead ONLY through fetchLeadDetail ——
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);

        // 1) Fetch the lead directly
        const detail = await fetchLeadDetail(id);
        if (!mounted) return;

        setLead(detail);
        setOpBookings(detail.opBookings || []);
        setIpBookings(detail.ipBookings || []);

        // 2) Convert fieldData to object for editing
        const fieldDataObj = fieldDataToObject(detail.fieldData || []);
        setLeadData(fieldDataObj);

        // 3) Set status and notes
        setStatus(detail?.status || "new");
        setNotes(detail?.notes || "");
        setOpdBooked(
          ["yes", "true", "booked"].includes((fieldDataObj.opd_booked || "").toLowerCase())
        );

        // 4) Load activities
        await loadActivities();
      } catch (e) {
        console.error("fetchLeadDetail error:", e);
        if (mounted) setLead(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id, loadActivities]);

  const statusOptions = useMemo(() => {
    // Group stages by category
    const grouped = {
      initial: [],
      active: [],
      won: [],
      lost: [],
    };

    leadStages.forEach((stage) => {
      if (grouped[stage.stageCategory]) {
        grouped[stage.stageCategory].push({
          value: stage.stageName,
          label: stage.displayLabel,
          color: stage.color,
          category: stage.stageCategory,
        });
      }
    });

    return grouped;
  }, [leadStages]);

  const handleLeadFieldChange = (fieldName, value) => {
    setLeadData((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const details = await updateLeadDetails(id, {
        fieldDataUpdates: leadData,
        notes,
        status,
      });

      await updateLeadStatus(id, { status, notes });

      setLead((prev) => ({
        ...prev,
        status: details?.status || status,
        notes: details?.notes || notes,
        fieldData: details?.fieldData || prev?.fieldData || [],
        followUpAt: details?.followUpAt || prev?.followUpAt || null,
      }));

      await loadActivities();
      toast.success("Lead saved successfully");
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to save lead";
      console.error("Save lead error:", err);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Queue a mobile call task for this lead
  const handleRequestMobileCall = async () => {
    if (!id) return;

    const phone = leadData.phone_number || leadData.phone || "";
    const altPhone = leadData.alt_phone || leadData.alternate_number || "";
    let picked = (phone && String(phone).trim()) || (altPhone && String(altPhone).trim()) || "";

    if (phone && altPhone) {
      const choice = window.prompt(
        `Choose number to call:\n1) ${phone}\n2) ${altPhone}\n\nEnter 1 or 2, or type a custom phone number.`
      );
      if (!choice) return;

      if (choice === "1") picked = phone;
      else if (choice === "2") picked = altPhone;
      else picked = choice;
    } else if (!picked) {
      const custom = window.prompt("Enter a phone number to call:");
      if (!custom) return;
      picked = custom;
    }

    const num = String(picked).replace(/[^\d+]/g, "");
    if (!num || num.length < 7) {
      toast.error("Please enter a valid phone number.");
      return;
    }

    try {
      setCalling(true);
      await requestMobileCall(id, num);
      await loadActivities();
      toast.success("Call request queued successfully.");
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to queue call";
      console.error("requestMobileCall error:", err);
      toast.error(msg);
    } finally {
      setCalling(false);
    }
  };

  const handleShareLead = () => {
    if (!lead) return;

    const name = leadData.full_name || leadData.name || "Unknown";
    const statusLabel = leadStages.find(s => s.stageName === status)?.displayLabel || status || "New";
    const createdDate = lead.createdTime ? new Date(lead.createdTime).toLocaleString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: '2-digit'
    }) : "N/A";

    const leadUrl = `${window.location.origin}/caller/leads/${id}`;

    const shareText = `Checkout this lead in Medagg CRM\n\nName: ${name}\nStatus: ${statusLabel}\nAcquired On: ${createdDate}\nWorkspace: Medagg Ventures\n\nLink: ${leadUrl}`;

    // Copy to clipboard
    navigator.clipboard.writeText(shareText).then(() => {
      toast.success("Lead details copied to clipboard!");

      // Open WhatsApp share (optional)
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(whatsappUrl, '_blank');
    }).catch(() => {
      toast.error("Failed to copy to clipboard");
    });
  };

  // —— Defer/reschedule modal handlers (any date/time) ——
  const openCallYouLater = () => {
    setLaterDate(tomorrowYMD());
    setLaterTime(timeToHHMM(lead?.followUpAt || null));
    setShowLaterModal(true);
  };
  const closeCallYouLater = () => setShowLaterModal(false);
  const saveCallYouLater = async () => {
    if (!id) return;

    const ymd = (laterDate || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
      toast.error("Please pick a valid date (YYYY-MM-DD).");
      return;
    }

    const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec((laterTime || "").trim());
    if (!m) {
      toast.error("Invalid time. Use HH:mm (e.g., 10:00)");
      return;
    }
    const hour = parseInt(m[1], 10);
    const minute = parseInt(m[2], 10);

    setDeferring(true);
    try {
      const res = await deferLeadToNextDay(id, { date: ymd, hour, minute });
      setLead((prev) => ({ ...prev, followUpAt: res.followUpAt }));
      await loadActivities();
      closeCallYouLater();
      toast.success(`Follow-up scheduled for ${ymd} at ${m[1].padStart(2, "0")}:${m[2]}.`);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Failed to schedule";
      console.error("defer/reschedule error:", err);
      toast.error(msg);
    } finally {
      setDeferring(false);
    }
  };

  // ----- OP/IP booking handlers -----
  const [op, setOp] = useState({
    date: "",
    time: "",
    hospital: "",
    doctor: "",
    status: "pending",
    surgery: "",
    payment: "",
  });
  const [ip, setIp] = useState({
    date: "",
    time: "",
    hospital: "",
    doctor: "",
    caseType: "",
    status: "pending",
    payment: "",
  });

  const handleAddOp = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const created = await addOpBooking(id, {
        booked: op.status === "booked" || op.status === "done",
        date: op.date || null,
        time: op.time || "",
        hospital: op.hospital || "",
        doctor: op.doctor || "",
        status: op.status || "pending",
        surgery: op.surgery || "",
        payment: op.payment ? Number(op.payment) : 0,
      });
      setOpBookings((arr) => [...arr, created]);
      setOp({
        date: "",
        time: "",
        hospital: "",
        doctor: "",
        status: "pending",
        surgery: "",
        payment: "",
      });
      await loadActivities();
      toast.success("OP booking added");
    } catch (e) {
      toast.error("Failed to add OP booking");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveOp = async (bid) => {
    if (!id || !bid) return;
    if (!window.confirm("Delete this OP booking?")) return;
    setSaving(true);
    try {
      await removeOpBooking(id, bid);
      setOpBookings((arr) =>
        arr.filter((b) => String(b.id || b._id) !== String(bid))
      );
      await loadActivities();
      toast.success("OP booking removed");
    } catch (e) {
      toast.error("Failed to remove OP booking");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDoneOp = async (bid) => {
    if (!id || !bid) return;
    setSaving(true);
    try {
      const updated = await updateOpBooking(id, bid, {
        status: "done",
        doneDate: new Date().toISOString(),
        booked: true,
      });
      setOpBookings((arr) =>
        arr.map((b) =>
          String(b.id || b._id) === String(bid) ? { ...b, ...updated } : b
        )
      );
      await loadActivities();
      toast.success("OP booking marked as done");
    } catch (e) {
      toast.error("Failed to update OP booking");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleAddIp = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const created = await addIpBooking(id, {
        booked: ip.status === "booked" || ip.status === "done",
        date: ip.date || null,
        time: ip.time || "",
        hospital: ip.hospital || "",
        doctor: ip.doctor || "",
        caseType: ip.caseType || "",
        status: ip.status || "pending",
        payment: ip.payment ? Number(ip.payment) : 0,
      });
      setIpBookings((arr) => [...arr, created]);
      setIp({
        date: "",
        time: "",
        hospital: "",
        doctor: "",
        caseType: "",
        status: "pending",
        payment: "",
      });
      await loadActivities();
      toast.success("IP booking added");
    } catch (e) {
      toast.error("Failed to add IP booking");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveIp = async (bid) => {
    if (!id || !bid) return;
    if (!window.confirm("Delete this IP booking?")) return;
    setSaving(true);
    try {
      await removeIpBooking(id, bid);
      setIpBookings((arr) =>
        arr.filter((b) => String(b.id || b._id) !== String(bid))
      );
      await loadActivities();
      toast.success("IP booking removed");
    } catch (e) {
      toast.error("Failed to remove IP booking");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDoneIp = async (bid) => {
    if (!id || !bid) return;
    setSaving(true);
    try {
      const updated = await updateIpBooking(id, bid, {
        status: "done",
        doneDate: new Date().toISOString(),
        booked: true,
      });
      setIpBookings((arr) =>
        arr.map((b) =>
          String(b.id || b._id) === String(bid) ? { ...b, ...updated } : b
        )
      );
      await loadActivities();
      toast.success("IP booking marked as done");
    } catch (e) {
      toast.error("Failed to update IP booking");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader fullScreen text="Loading lead details..." />;

  if (!lead) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
            Lead not found.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen ">
      {/* Header */}
      <header className="sticky top-0 z-10  backdrop-blur border-b border-gray-100">
        <div className="mx-auto  px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-gray-200 hover:bg-gray-50"
                title="Back"
              >
                <FiArrowLeft />
              </button>
              <div>
                <h1 className="text-lg md:text-xl font-semibold text-gray-900">
                  Leads Management
                </h1>
                <p className="text-xs text-gray-500">
                  Lead ID: <span className="font-mono">{id}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleShareLead}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-gray-700 hover:bg-gray-50"
                title="Share Lead"
              >
                <FiShare2 />
                <span className="hidden md:inline">Share</span>
              </button>
              <button
                onClick={handleRequestMobileCall}
                disabled={calling}
                className={cls(
                  "inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-emerald-700",
                  calling
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:bg-emerald-100"
                )}
                title="Request Mobile Call"
              >
                <FiPhoneCall /> {calling ? "Queuing..." : "Request Call"}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={cls(
                  "inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff2e6e] to-[#ff5aa4] text-white px-3.5 py-2.5 shadow",
                  saving ? "opacity-60 cursor-not-allowed" : "hover:opacity-95"
                )}
                title="Save"
              >
                <FiSave /> {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={loadActivities}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-gray-700 hover:bg-gray-50"
                title="Refresh Activity"
              >
                <FiRefreshCcw /> {actsLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto  px-4 py-6 space-y-6">
        {/* Top: left info + right status/notes */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left info card */}
          <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-4 md:p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-gray-900">
                  Lead Details
                </h2>
                <span
                  className={cls(
                    "px-2 py-0.5 rounded-full text-xs",
                    toneChip[status] || toneChip["new"]
                  )}
                >
                  {status.toUpperCase()}
                </span>
              </div>
            </div>

            {fieldsLoading ? (
              <div className="col-span-2 text-center py-8 text-gray-500">
                Loading fields...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {leadFields.map((field) => (
                  <DynamicField
                    key={field._id}
                    field={field}
                    value={leadData[field.fieldName]}
                    onChange={handleLeadFieldChange}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right status + notes */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 md:p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-600">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-100"
                >
                  {statusOptions.initial?.length > 0 && (
                    <optgroup label="Initial">
                      {statusOptions.initial.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {statusOptions.active?.length > 0 && (
                    <optgroup label="Active">
                      {statusOptions.active.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {statusOptions.won?.length > 0 && (
                    <optgroup label="Won">
                      {statusOptions.won.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {statusOptions.lost?.length > 0 && (
                    <optgroup label="Lost">
                      {statusOptions.lost.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Rating Input */}
              <div className="space-y-1">
                <label className="text-xs text-gray-600">Rating</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const currentRating = parseInt(leadData.rating || 0);
                    const isActive = currentRating >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleLeadFieldChange("rating", String(star))}
                        className={`p-1 transition-transform hover:scale-110 focus:outline-none ${isActive ? "text-amber-400" : "text-gray-300"
                          }`}
                      >
                        <FiStar
                          className="h-6 w-6"
                          fill={isActive ? "currentColor" : "none"}
                        />
                      </button>
                    );
                  })}
                  {(leadData.rating && leadData.rating !== "0") && (
                    <button
                      type="button"
                      onClick={() => handleLeadFieldChange("rating", "0")}
                      className="ml-2 text-xs text-gray-400 hover:text-gray-600 underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <Textarea
                label="Call Notes"
                placeholder="Type here..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 select-none">
                <input
                  type="checkbox"
                  checked={opdBooked}
                  onChange={(e) => setOpdBooked(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                OPD Booked? (Check if yes)
              </label>

              <div className="pt-2">
                <button
                  onClick={handleRequestMobileCall}
                  disabled={calling}
                  className={cls(
                    "inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700",
                    calling ? "opacity-60 cursor-not-allowed" : "hover:bg-emerald-100"
                  )}
                >
                  <FiPhoneCall /> {calling ? "Queuing..." : "Request Mobile Call"}
                </button>
              </div>

              {/* Call you later */}
              <div className="pt-2 flex items-center justify-between">
                <div className="text-xs text-gray-600">
                  Next follow-up:{" "}
                  <span className="font-medium text-gray-800">
                    {fmtDateTime(lead?.followUpAt)}
                  </span>
                </div>
                <button
                  onClick={openCallYouLater}
                  className="inline-flex items-center gap-2 rounded-xl border border-violet-300 bg-violet-50 px-3 py-2 text-sm text-violet-700 hover:bg-violet-100"
                  title="Schedule a follow-up"
                >
                  <FiClock /> Call you later
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* OP + IP Creation Forms */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* OP create form */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 md:p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">
                Add OP Booking
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="OP Date"
                type="date"
                value={op.date || ""}
                onChange={(e) => setOp((s) => ({ ...s, date: e.target.value }))}
              />
              <Input
                label="OP Time"
                type="time"
                value={op.time || ""}
                onChange={(e) => setOp((s) => ({ ...s, time: e.target.value }))}
              />
              <Input
                label="Hospital Name"
                value={op.hospital || ""}
                onChange={(e) =>
                  setOp((s) => ({ ...s, hospital: e.target.value }))
                }
              />
              <Input
                label="Doctor Name"
                value={op.doctor || ""}
                onChange={(e) =>
                  setOp((s) => ({ ...s, doctor: e.target.value }))
                }
              />
              <Select
                label="OP Status"
                value={op.status}
                onChange={(e) =>
                  setOp((s) => ({ ...s, status: e.target.value }))
                }
                options={BOOKING_STATUSES.map((s) => ({
                  value: s,
                  label: s[0].toUpperCase() + s.slice(1),
                }))}
              />
              <Input
                label="Surgery"
                value={op.surgery || ""}
                onChange={(e) =>
                  setOp((s) => ({ ...s, surgery: e.target.value }))
                }
              />
              <Input
                label="Payment"
                type="number"
                value={op.payment || ""}
                onChange={(e) =>
                  setOp((s) => ({ ...s, payment: e.target.value }))
                }
              />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={handleAddOp}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
              >
                <FiPlusCircle /> {saving ? "Adding..." : "Add OP"}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={cls(
                  "inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff2e6e] to-[#ff5aa4] text-white px-3 py-2 text-sm shadow",
                  saving ? "opacity-60 cursor-not-allowed" : "hover:opacity-95"
                )}
              >
                <FiSave /> {saving ? "Saving..." : "Save Lead"}
              </button>
            </div>
          </div>

          {/* IP create form */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 md:p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">
                Add IP Booking
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="IP Date"
                type="date"
                value={ip.date || ""}
                onChange={(e) => setIp((s) => ({ ...s, date: e.target.value }))}
              />
              <Input
                label="IP Time"
                type="time"
                value={ip.time || ""}
                onChange={(e) => setIp((s) => ({ ...s, time: e.target.value }))}
              />
              <Input
                label="Hospital Name"
                value={ip.hospital || ""}
                onChange={(e) =>
                  setIp((s) => ({ ...s, hospital: e.target.value }))
                }
              />
              <Input
                label="Doctor Name"
                value={ip.doctor || ""}
                onChange={(e) =>
                  setIp((s) => ({ ...s, doctor: e.target.value }))
                }
              />
              <Input
                label="Case"
                value={ip.caseType || ""}
                onChange={(e) =>
                  setIp((s) => ({ ...s, caseType: e.target.value }))
                }
              />
              <Select
                label="IP Status"
                value={ip.status}
                onChange={(e) =>
                  setIp((s) => ({ ...s, status: e.target.value }))
                }
                options={BOOKING_STATUSES.map((s) => ({
                  value: s,
                  label: s[0].toUpperCase() + s.slice(1),
                }))}
              />
              <Input
                label="Payment"
                type="number"
                value={ip.payment || ""}
                onChange={(e) =>
                  setIp((s) => ({ ...s, payment: e.target.value }))
                }
              />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={handleAddIp}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
              >
                <FiPlusCircle /> {saving ? "Adding..." : "Add IP"}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={cls(
                  "inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff2e6e] to-[#ff5aa4] text-white px-3 py-2 text-sm shadow",
                  saving ? "opacity-60 cursor-not-allowed" : "hover:opacity-95"
                )}
              >
                <FiSave /> {saving ? "Saving..." : "Save Lead"}
              </button>
            </div>
          </div>
        </section>

        {/* Lists of existing bookings */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* OP list */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 md:p-5 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-3">
              OP Bookings
            </h3>
            {opBookings.length ? (
              <ul className="space-y-3">
                {opBookings.map((b) => {
                  const bid = String(b.id || b._id);
                  return (
                    <li
                      key={bid}
                      className="rounded-xl border border-gray-100 p-3 flex items-center justify-between"
                    >
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {fmtDate(b.date)} {b.time ? `• ${b.time}` : ""} —{" "}
                          {b.hospital || "—"}
                        </div>
                        <div className="text-gray-600">
                          Dr. {b.doctor || "—"} • {b.surgery || "—"} • ₹
                          {Number(b.payment || 0)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Status: {b.status}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {b.status !== "done" && (
                          <button
                            onClick={() => handleDoneOp(bid)}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-emerald-700 text-xs hover:bg-emerald-100"
                          >
                            <FiCheckCircle /> Done
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveOp(bid)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-rose-700 text-xs hover:bg-rose-100"
                        >
                          <FiTrash2 /> Delete
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
                No OP bookings yet.
              </div>
            )}
          </div>

          {/* IP list */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 md:p-5 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-3">
              IP Bookings
            </h3>
            {ipBookings.length ? (
              <ul className="space-y-3">
                {ipBookings.map((b) => {
                  const bid = String(b.id || b._id);
                  return (
                    <li
                      key={bid}
                      className="rounded-2xl border border-gray-100 p-3 flex items-center justify-between"
                    >
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {fmtDate(b.date)} {b.time ? `• ${b.time}` : ""} —{" "}
                          {b.hospital || "—"}
                        </div>
                        <div className="text-gray-600">
                          Dr. {b.doctor || "—"} • Case: {b.caseType || "—"} • ₹
                          {Number(b.payment || 0)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Status: {b.status}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {b.status !== "done" && (
                          <button
                            onClick={() => handleDoneIp(bid)}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-emerald-700 text-xs hover:bg-emerald-100"
                          >
                            <FiCheckCircle /> Done
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveIp(bid)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-rose-700 text-xs hover:bg-rose-100"
                        >
                          <FiTrash2 /> Delete
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
                No IP bookings yet.
              </div>
            )}
          </div>
        </section>

        {/* Server Activity Timeline */}
        <section className="rounded-2xl border border-gray-100 bg-white p-4 md:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold text-gray-900">
              Activity Timeline
            </h3>
            <button
              onClick={loadActivities}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <FiRefreshCcw className={actsLoading ? "animate-spin" : ""} />{" "}
              Refresh
            </button>
          </div>

          {activities && activities.length ? (
            <ul className="space-y-4">
              {activities.map((a) => {
                const aid = String(a.id || a._id);
                const at = a.createdAt ? new Date(a.createdAt) : null;
                const when = at
                  ? `${at.toLocaleDateString()} • ${fmtTime(at)}`
                  : "";
                const meta = actionMeta(a.action);
                const Actor = () =>
                  a.actor ? (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                      <FiUser className="opacity-70" />{" "}
                      {a.actor.name || a.actor.email || "User"}
                    </span>
                  ) : null;

                return (
                  <li key={aid} className="flex items-start gap-3">
                    <div
                      className={cls(
                        "mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full border",
                        meta.tone
                      )}
                    >
                      <meta.Icon />
                    </div>
                    <div className="flex-1 min-w-0">

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {formatActivity(a)}
                        </span>
                        <span className="text-xs text-gray-500">{when}</span>
                      </div>
                      {/* Removed raw badges and actor below as they are integrated into the message now */}

                      {a.action === 'recording_uploaded' && a.meta?.recordingFilename && (
                        <div className="mt-2">
                          <audio
                            controls
                            src={`${BASE_URL.replace('/api/v1', '')}/uploads/recordings/${a.meta.recordingFilename}`}
                            className="w-full max-w-md h-8"
                          />
                        </div>
                      )}

                      {((a.diff && (a.diff.before || a.diff.after)) || (a.meta && Object.keys(a.meta).length > 0)) && (
                        <div className="mt-2 text-xs">
                          <button
                            onClick={() => toggleExpand(aid)}
                            className="text-violet-700 hover:text-violet-800 font-medium mb-2"
                          >
                            {expanded[aid] ? "Hide details" : "View details"}
                          </button>

                          {expanded[aid] && (
                            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 space-y-2">
                              {/* Readable Diff */}
                              {(a.diff?.before || a.diff?.after) && (
                                <div className="space-y-1">
                                  {Object.keys({ ...a.diff?.before, ...a.diff?.after }).map((key) => {
                                    // Skip internal keys or if values are identical
                                    if (key === '_id' || key === 'updatedAt') return null;

                                    const oldVal = a.diff?.before?.[key];
                                    const newVal = a.diff?.after?.[key];

                                    // If both undefined/null, skip
                                    if (!oldVal && !newVal) return null;
                                    // If deeply equal (simple check), skip
                                    if (JSON.stringify(oldVal) === JSON.stringify(newVal)) return null;

                                    const formatValue = (v) => {
                                      if (v === null || v === undefined || v === "") return <span className="text-gray-400 italic">Empty</span>;
                                      if (typeof v === 'boolean') return v ? 'Yes' : 'No';
                                      if (typeof v === 'object') return JSON.stringify(v); // Fallback for objects
                                      return String(v);
                                    };

                                    return (
                                      <div key={key} className="flex flex-wrap items-baseline gap-2">
                                        <span className="font-medium text-gray-700 capitalize">
                                          {key.replace(/([A-Z])/g, ' $1').trim().replace(/_/g, ' ')}:
                                        </span>
                                        <div className="flex items-center gap-2 text-gray-600">
                                          <span className="line-through opacity-75">{formatValue(oldVal)}</span>
                                          <span>→</span>
                                          <span className="font-semibold text-gray-900">{formatValue(newVal)}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Readable Meta (if any extra info exists) */}
                              {a.meta && Object.keys(a.meta).length > 0 && (
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                  {Object.entries(a.meta).map(([mKey, mVal]) => {
                                    if (mKey === 'recordingFilename') return null; // Handled separately
                                    return (
                                      <div key={mKey} className="flex gap-2 text-gray-500">
                                        <span className="capitalize">{mKey}:</span>
                                        <span>{String(mVal)}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
              {actsLoading ? "Loading..." : "No recent activity."}
            </div>
          )}
        </section>
      </div >

      {/* ---- Call you later modal ---- */}
      {
        showLaterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={closeCallYouLater} />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-xl">
              <h4 className="text-base font-semibold text-gray-900 mb-1">Schedule follow-up</h4>
              <p className="text-sm text-gray-600 mb-4">
                Pick a <span className="font-medium">date</span> and <span className="font-medium">time</span>.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Date (YYYY-MM-DD)</label>
                  <input
                    type="date"
                    value={laterDate}
                    onChange={(e) => setLaterDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Time (HH:mm)</label>
                  <input
                    type="time"
                    value={laterTime}
                    onChange={(e) => setLaterTime(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-100"
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  onClick={closeCallYouLater}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCallYouLater}
                  disabled={deferring}
                  className={cls(
                    "inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff2e6e] to-[#ff5aa4] text-white px-3 py-2 text-sm shadow",
                    deferring ? "opacity-60 cursor-not-allowed" : "hover:opacity-95"
                  )}
                >
                  {deferring ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )
      }
    </main >
  );
}

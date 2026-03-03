import {
  FiActivity,
  FiPhoneCall,
  FiMic,
  FiEdit3,
  FiList,
  FiPlusCircle,
  FiTrash2,
  FiMessageSquare,
  FiFileText,
  FiSettings,
} from "react-icons/fi";

// ---------- class name joiner ----------
export const cls = (...c) => c.filter(Boolean).join(" ");

// ---------- date/time formatters ----------
export const parseDate = (v) => (v ? new Date(v) : null);
export const pad2 = (n) => String(n).padStart(2, "0");
export const toYMD = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const tomorrowYMD = () =>
  toYMD(new Date(Date.now() + 24 * 60 * 60 * 1000));

const _toDate = (v) => {
  const d = typeof v === "string" ? new Date(v) : v;
  return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
};

const _pad = (n) => String(n).padStart(2, '0');

const _fmtDateParts = (d) =>
  `${_pad(d.getDate())}/${_pad(d.getMonth() + 1)}/${d.getFullYear()}`;

const _fmtTimeParts = (d) =>
  `${_pad(d.getHours())}:${_pad(d.getMinutes())}`;

export const fmtTime = (d) => {
  const dt = _toDate(d);
  return dt ? _fmtTimeParts(dt) : "";
};

export const fmtDate = (v) => {
  const d = _toDate(v);
  return d ? _fmtDateParts(d) : "";
};

export const fmtDateTime = (v) => {
  const d = _toDate(v);
  return d ? `${_fmtDateParts(d)} \u2022 ${_fmtTimeParts(d)}` : "\u2014";
};

export const timeToHHMM = (dateLike) => {
  if (!dateLike) return "10:00";
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "10:00";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

// ---------- activity helpers ----------
export const actionMeta = (action = "") => {
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
    telcrm_call: {
      Icon: FiPhoneCall,
      tone: "bg-sky-50 text-sky-700 border-sky-200",
      label: "TelCRM Call",
    },
    telcrm_note: {
      Icon: FiFileText,
      tone: "bg-green-50 text-green-700 border-green-200",
      label: "TelCRM Note",
    },
    telcrm_system_note: {
      Icon: FiSettings,
      tone: "bg-orange-50 text-orange-700 border-orange-200",
      label: "TelCRM System Note",
    },
    whatsapp_sent: {
      Icon: FiMessageSquare,
      tone: "bg-green-50 text-green-700 border-green-200",
      label: "WhatsApp Sent",
    },
    telcrm_whatsapp: {
      Icon: FiMessageSquare,
      tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
      label: "TelCRM WhatsApp",
    },
  };
  return { ...base, ...(map[action] || {}) };
};

export const formatActivity = (a) => {
  const actor = a.actor
    ? a.actor.name || a.actor.email || "User"
    : "System";

  if (a.action === "lead_update") {
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

  if (a.action === "fielddata_merge" || a.action === "fielddata_replace") {
    const changes = [];
    if (a.diff?.after) {
      Object.keys(a.diff.after).forEach((key) => {
        if (key === "_id" || key === "updatedAt") return;
        const oldVal = a.diff.before?.[key];
        const newVal = a.diff.after[key];
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          const readableKey = key
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase());
          changes.push(readableKey);
        }
      });
    }
    if (changes.length === 1) {
      return `${actor} updated ${changes[0]}`;
    } else if (changes.length > 1) {
      const last = changes.pop();
      return `${actor} updated ${changes.join(", ")} and ${last}`;
    }
    return `${actor} updated lead information`;
  }

  if (a.action === "call_logged") return `${actor} logged a call`;
  if (a.action === "recording_uploaded")
    return `${actor} uploaded a recording`;

  if (a.action?.startsWith("op_booking_")) {
    const type = a.action.includes("add")
      ? "added"
      : a.action.includes("update")
        ? "updated"
        : "removed";
    return `${actor} ${type} an OP booking`;
  }
  if (a.action?.startsWith("ip_booking_")) {
    const type = a.action.includes("add")
      ? "added"
      : a.action.includes("update")
        ? "updated"
        : "removed";
    return `${actor} ${type} an IP booking`;
  }

  // TelCRM imported activities — use description directly (it's pre-formatted)
  if (a.action?.startsWith("telcrm_")) {
    return a.description || `${actor} imported activity`;
  }

  return `${actor} performed ${a.action.replace(/_/g, " ")}`;
};

// ---------- field helpers ----------
export const readField = (fieldData = [], keys = []) => {
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

export const toneChip = {
  new: "bg-violet-50 text-violet-700",
  hot: "bg-rose-50 text-rose-700",
  "hot-ip": "bg-emerald-50 text-emerald-700",
  prospective: "bg-sky-50 text-sky-700",
  recapture: "bg-amber-50 text-amber-700",
  dnp: "bg-gray-100 text-gray-700",
  opd_booked: "bg-emerald-50 text-emerald-700",
};

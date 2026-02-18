import React from "react";
import { FiChevronRight } from "react-icons/fi";

/**
 * Column definition shape:
 * {
 *   id: string,
 *   label: string,
 *   category: string,
 *   defaultVisible: boolean,
 *   adminOnly: boolean,
 *   sticky: boolean,           // cannot be toggled off
 *   headerRender?: (ctx) => ReactNode,   // custom header (checkbox etc.)
 *   render: (lead, ctx) => ReactNode,
 *   thClassName?: string,
 *   tdClassName?: string,
 * }
 *
 * ctx object provided at render time:
 *   { callerMap, formatPhoneNumber, Pill, selected, toggleOne,
 *     navigate, isAdmin, headerCheckboxRef, toggleAllCurrentPage,
 *     isAllCurrentSelected, fieldConfigs }
 */

export const COLUMN_DEFINITIONS = [
  /* ── Core (sticky) ─────────────────────────────── */
  {
    id: "checkbox",
    label: "Select",
    category: "Core",
    defaultVisible: true,
    adminOnly: false,
    sticky: true,
    thClassName: "p-4 w-4",
    tdClassName: "p-4",
    headerRender: (ctx) => (
      <input
        type="checkbox"
        ref={ctx.headerCheckboxRef}
        checked={ctx.isAllCurrentSelected}
        onChange={ctx.toggleAllCurrentPage}
        className="rounded border-gray-300"
      />
    ),
    render: (lead, ctx) => (
      <input
        type="checkbox"
        checked={ctx.selected.has(lead.id)}
        onChange={() => ctx.toggleOne(lead.id)}
        onClick={(e) => e.stopPropagation()}
        className="rounded border-gray-300"
      />
    ),
  },

  /* ── Basic Info ─────────────────────────────────── */
  {
    id: "name",
    label: "Lead Name",
    category: "Basic Info",
    defaultVisible: true,
    adminOnly: false,
    sticky: false,
    thClassName: "px-4 py-3 font-medium",
    tdClassName: "px-4 py-3 font-medium text-gray-900",
    render: (lead) => lead.name,
  },
  {
    id: "phone",
    label: "Phone",
    category: "Basic Info",
    defaultVisible: true,
    adminOnly: false,
    sticky: false,
    thClassName: "px-4 py-3 font-medium",
    tdClassName: "px-4 py-3",
    render: (lead, ctx) => ctx.formatPhoneNumber(lead.phone),
  },
  {
    id: "campaign",
    label: "Campaign",
    category: "Basic Info",
    defaultVisible: true,
    adminOnly: false,
    sticky: false,
    thClassName: "px-4 py-3 font-medium",
    tdClassName: "px-4 py-3 max-w-[150px] truncate",
    render: (lead) => (
      <span title={lead.campaignName}>{lead.campaignName || lead.source}</span>
    ),
  },
  {
    id: "date",
    label: "Date",
    category: "Basic Info",
    defaultVisible: true,
    adminOnly: false,
    sticky: false,
    thClassName: "px-4 py-3 font-medium",
    tdClassName: "px-4 py-3 text-xs text-gray-400",
    render: (lead) => lead.createdTime?.toLocaleDateString(),
  },
  {
    id: "email",
    label: "Email",
    category: "Basic Info",
    defaultVisible: false,
    adminOnly: false,
    sticky: false,
    thClassName: "px-4 py-3 font-medium",
    tdClassName: "px-4 py-3 max-w-[180px] truncate",
    render: (lead) => {
      const fd = lead.raw?.fieldData || [];
      const emailField = fd.find(
        (f) => (f?.name || "").toLowerCase() === "email" || (f?.name || "").toLowerCase() === "email_address"
      );
      return emailField?.values?.[0] || "—";
    },
  },
  {
    id: "platform",
    label: "Platform",
    category: "Basic Info",
    defaultVisible: false,
    adminOnly: false,
    sticky: false,
    thClassName: "px-4 py-3 font-medium",
    tdClassName: "px-4 py-3",
    render: (lead) => lead.raw?.platform || lead.source || "—",
  },

  /* ── Status ─────────────────────────────────────── */
  {
    id: "leadStatus",
    label: "Lead Status",
    category: "Status",
    defaultVisible: true,
    adminOnly: false,
    sticky: false,
    thClassName: "px-4 py-3 font-medium",
    tdClassName: "px-4 py-3",
    render: (lead, ctx) => (
      <ctx.Pill text={lead.leadStatus} tone={lead.leadStatus === "new" ? "blue" : "gray"} />
    ),
  },
  {
    id: "opdStatus",
    label: "OPD Status",
    category: "Status",
    defaultVisible: true,
    adminOnly: false,
    sticky: false,
    thClassName: "px-4 py-3 font-medium",
    tdClassName: "px-4 py-3",
    render: (lead, ctx) => <ctx.Pill text={lead.opdStatus} />,
  },
  {
    id: "ipdStatus",
    label: "IPD Status",
    category: "Status",
    defaultVisible: true,
    adminOnly: false,
    sticky: false,
    thClassName: "px-4 py-3 font-medium",
    tdClassName: "px-4 py-3",
    render: (lead, ctx) => <ctx.Pill text={lead.ipdStatus} />,
  },
  {
    id: "diagnostic",
    label: "Diagnostic",
    category: "Status",
    defaultVisible: true,
    adminOnly: false,
    sticky: false,
    thClassName: "px-4 py-3 font-medium",
    tdClassName: "px-4 py-3",
    render: (lead, ctx) => <ctx.Pill text={lead.diagnostic} />,
  },

  /* ── OPD Details ────────────────────────────────── */
  {
    id: "opdBookedCount",
    label: "OPD Booked",
    category: "OPD Details",
    defaultVisible: false,
    adminOnly: false,
    sticky: false,
    thClassName: "px-4 py-3 font-medium",
    tdClassName: "px-4 py-3 text-center",
    render: (lead) => {
      const bookings = lead.raw?.opBookings || [];
      return bookings.filter((b) => b.status === "booked").length;
    },
  },
  {
    id: "opdDoneCount",
    label: "OPD Done",
    category: "OPD Details",
    defaultVisible: false,
    adminOnly: false,
    sticky: false,
    thClassName: "px-4 py-3 font-medium",
    tdClassName: "px-4 py-3 text-center",
    render: (lead) => {
      const bookings = lead.raw?.opBookings || [];
      return bookings.filter((b) => b.status === "done").length;
    },
  },
  {
    id: "opdTotal",
    label: "OPD Total",
    category: "OPD Details",
    defaultVisible: false,
    adminOnly: false,
    sticky: false,
    thClassName: "px-4 py-3 font-medium",
    tdClassName: "px-4 py-3 text-center",
    render: (lead) => (lead.raw?.opBookings || []).length,
  },

  /* ── IPD Details ────────────────────────────────── */
  {
    id: "ipdBookedCount",
    label: "IPD Booked",
    category: "IPD Details",
    defaultVisible: false,
    adminOnly: false,
    sticky: false,
    thClassName: "px-4 py-3 font-medium",
    tdClassName: "px-4 py-3 text-center",
    render: (lead) => {
      const bookings = lead.raw?.ipBookings || [];
      return bookings.filter((b) => b.status === "booked").length;
    },
  },
  {
    id: "ipdDoneCount",
    label: "IPD Done",
    category: "IPD Details",
    defaultVisible: false,
    adminOnly: false,
    sticky: false,
    thClassName: "px-4 py-3 font-medium",
    tdClassName: "px-4 py-3 text-center",
    render: (lead) => {
      const bookings = lead.raw?.ipBookings || [];
      return bookings.filter((b) => b.status === "done").length;
    },
  },
  {
    id: "ipdTotal",
    label: "IPD Total",
    category: "IPD Details",
    defaultVisible: false,
    adminOnly: false,
    sticky: false,
    thClassName: "px-4 py-3 font-medium",
    tdClassName: "px-4 py-3 text-center",
    render: (lead) => (lead.raw?.ipBookings || []).length,
  },

  /* ── Assignment ─────────────────────────────────── */
  {
    id: "assignedTo",
    label: "Assigned To",
    category: "Assignment",
    defaultVisible: true,
    adminOnly: false,
    sticky: false,
    thClassName: "px-4 py-3 font-medium",
    tdClassName: "px-4 py-3",
    render: (lead, ctx) => {
      if (!lead.assignedTo) {
        return <span className="text-gray-400 italic">Unassigned</span>;
      }
      const callerName =
        lead.assignedToUser?.name || ctx.callerMap.get(lead.assignedTo)?.name || "Unknown";
      return (
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-600">
            {callerName[0]}
          </div>
          <span className="truncate max-w-[100px]">{callerName}</span>
        </div>
      );
    },
  },
  {
    id: "followUpDate",
    label: "Follow Up Date",
    category: "Assignment",
    defaultVisible: false,
    adminOnly: false,
    sticky: false,
    thClassName: "px-4 py-3 font-medium",
    tdClassName: "px-4 py-3 text-xs",
    render: (lead) => {
      if (!lead.followUpAt) return <span className="text-gray-400">—</span>;
      const d = new Date(lead.followUpAt);
      return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    },
  },

  /* ── Activity ───────────────────────────────────── */
  {
    id: "callCount",
    label: "Call Count",
    category: "Activity",
    defaultVisible: false,
    adminOnly: false,
    sticky: false,
    thClassName: "px-4 py-3 font-medium",
    tdClassName: "px-4 py-3 text-center",
    render: (lead) => lead.raw?.callCount || lead.raw?.calls?.length || 0,
  },
  {
    id: "lastCallDate",
    label: "Last Call Date",
    category: "Activity",
    defaultVisible: false,
    adminOnly: false,
    sticky: false,
    thClassName: "px-4 py-3 font-medium",
    tdClassName: "px-4 py-3 text-xs",
    render: (lead) => {
      const d = lead.raw?.lastCallAt;
      if (!d) return <span className="text-gray-400">—</span>;
      return new Date(d).toLocaleDateString();
    },
  },
  {
    id: "lastCallOutcome",
    label: "Last Call Outcome",
    category: "Activity",
    defaultVisible: false,
    adminOnly: false,
    sticky: false,
    thClassName: "px-4 py-3 font-medium",
    tdClassName: "px-4 py-3",
    render: (lead, ctx) => {
      const outcome = lead.raw?.lastCallOutcome;
      if (!outcome) return <span className="text-gray-400">—</span>;
      return <ctx.Pill text={outcome} />;
    },
  },
  {
    id: "notesPreview",
    label: "Notes Preview",
    category: "Activity",
    defaultVisible: false,
    adminOnly: false,
    sticky: false,
    thClassName: "px-4 py-3 font-medium",
    tdClassName: "px-4 py-3 max-w-[200px]",
    render: (lead) => {
      const notes = lead.raw?.notes || lead.raw?.lastNote;
      if (!notes) return <span className="text-gray-400">—</span>;
      const text = typeof notes === "string" ? notes : notes?.text || "";
      return <span className="truncate block text-xs text-gray-500">{text}</span>;
    },
  },


];

/**
 * Build dynamic field-based columns from fieldConfigs.
 * These are appended after the static columns.
 */
export const buildFieldColumns = (fieldConfigs = []) => {
  // Exclude fields that are already covered by static columns
  const coveredFields = new Set([
    "full_name", "lead_name", "name", "first_name",
    "phone_number", "phone", "mobile", "contact_number",
    "email", "email_address",
    "lead_status", "status", "stage", "type",
    "opd_status", "opd",
    "ipd_status", "ipd",
    "diagnostic", "diagnostics", "diagnostic_non", "diagnostic_status",
    "source",
  ]);

  return fieldConfigs
    .filter((fc) => !coveredFields.has((fc.fieldName || "").toLowerCase()))
    .map((fc) => ({
      id: `field_${fc.fieldName}`,
      label: fc.displayLabel || fc.fieldName,
      category: "Field Data",
      defaultVisible: false,
      adminOnly: false,
      sticky: false,
      thClassName: "px-4 py-3 font-medium",
      tdClassName: "px-4 py-3 max-w-[160px] truncate",
      render: (lead) => {
        const fd = lead.raw?.fieldData || [];
        const match = fd.find(
          (f) => (f?.name || "").toLowerCase() === (fc.fieldName || "").toLowerCase()
        );
        const val = match
          ? Array.isArray(match.values) ? match.values[0] : match.values || ""
          : "";
        return val || <span className="text-gray-400">—</span>;
      },
    }));
};

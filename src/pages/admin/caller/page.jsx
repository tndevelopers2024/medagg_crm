// src/pages/CallerDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
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
} from "react-icons/fi";
import { getAllUsers, fetchAllLeads } from "../../../utils/api";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";

/* ------------ helpers ------------ */
const dicebear = (seed) =>
  `https://api.dicebear.com/7.x/initials/svg?radius=50&fontWeight=700&seed=${encodeURIComponent(
    seed || "caller"
  )}`;

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
  const opd = readField(lead.fieldData, ["opd_status", "opd"]) || "—";
  const ipd = readField(lead.fieldData, ["ipd_status", "ipd"]) || "—";

  const campaign = lead.campaignId || readField(lead.fieldData, ["campaign"]) || "—";
  const created = lead.createdTime ? new Date(lead.createdTime) : null;
  const lastUpdate =
    (lead.lastCallAt && new Date(lead.lastCallAt)) ||
    (lead.updatedAt && new Date(lead.updatedAt)) ||
    (lead.createdAt && new Date(lead.createdAt)) ||
    created;

  return {
    id: lead._id || lead.id || lead.leadId,
    assignedTo: lead.assignedTo || null,
    name,
    phone,
    campaign,
    status,
    opd,
    ipd,
    notes: lead.notes || "",
    outcome: lead.lastCallOutcome || "",
    followUpAt: lead.followUpAt ? new Date(lead.followUpAt) : null,
    lastContact: lead.lastCallAt ? new Date(lead.lastCallAt) : null,
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

const toneLead = (v) => (/hot/i.test(v) ? "red" : /prospect/i.test(v) ? "blue" : "gray");
const toneOPD = (v) =>
  /booked/i.test(v) ? "blue" : /done|completed/i.test(v) ? "green" : /cancel/i.test(v) ? "red" : "gray";
const toneIPD = (v) => (/done|admission/i.test(v) ? "green" : "gray");

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

  const [period, setPeriod] = useState("This Month"); // This Month | Last Month | This Week | All Time | Custom
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [users, leadsRes] = await Promise.all([getAllUsers(), fetchAllLeads()]);
        if (!mounted) return;
        const u = (users || []).find((x) => x.id === id || x._id === id);
        setCaller(
          u || { id, name: "Unknown", email: "", phone: "", role: "caller", state: "" }
        );
        setAllLeads((leadsRes?.leads || []).map(parseLead));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  const assigned = useMemo(() => allLeads.filter((l) => l.assignedTo === id), [allLeads, id]);

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
  const inThis = assigned.filter((l) => inRange(l.createdAt || l.lastUpdate));

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

  const inPrev = useMemo(
    () =>
      assigned.filter(
        (l) => l.createdAt && l.createdAt >= prevRange[0] && l.createdAt <= prevRange[1]
      ),
    [assigned, prevRange]
  );

  const metric = (fn) => ({ cur: inThis.filter(fn).length, prev: inPrev.filter(fn).length });
  const pct = (cur, prev) => (!prev && !cur ? 0 : !prev ? 100 : Math.round(((cur - prev) / prev) * 100));

  /* KPIs */
  const mTotal = metric(() => true);
  const mOPBooked = metric((l) => /booked/i.test(l.opd));
  const mOPDone = metric((l) => /done|completed/i.test(l.opd));
  const mOPCancel = metric((l) => /cancel/i.test(l.opd));
  const mIPDDone = metric((l) => /done|admission/i.test(l.ipd));

  const monthlyTarget = 20;
  const targetProgress = Math.min(100, Math.round((mTotal.cur / monthlyTarget) * 100));

  /* timeline */
  const timeline = useMemo(() => {
    return assigned
      .map((l) => ({
        when: l.lastUpdate || l.createdAt,
        title: `Call with ${l.name}`,
        tags: [
          /booked/i.test(l.opd) ? "OPD Booked" : null,
          /done|completed/i.test(l.ipd) ? "IPD Done" : null,
          l.outcome || null,
        ].filter(Boolean),
        note: l.notes || "",
      }))
      .filter((x) => x.when)
      .sort((a, b) => b.when - a.when)
      .slice(0, 10);
  }, [assigned]);

  /* export */
  const exportCsv = () => {
    const headers = [
      "Lead Name",
      "Campaign",
      "Status",
      "Assigned",
      "Last Contact",
      "Next Follow-up",
      "OPD",
      "IPD",
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

  if (loading) return <div className="p-6">Loading…</div>;
  if (!caller) return <div className="p-6">Caller not found.</div>;

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
                <h2 className="text-lg md:text-xl font-semibold text-[#3b0d66]">{caller.name}</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
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
            sub="This month"
          />
          <KpiCard
            title="OP Booked"
            m={mOPBooked}
            tone="green"
            Icon={FiCalendar}
            iconTone="indigo"
            sub="This month"
          />
          <KpiCard
            title="OPD Done"
            m={mOPDone}
            tone="green"
            Icon={FiCheckCircle}
            iconTone="green"
            sub="This month"
          />
          <KpiCard
            title="OPD Cancelled"
            m={mOPCancel}
            tone="red"
            Icon={FiXCircle}
            iconTone="red"
            sub="This month"
          />
          <KpiCard
            title="IPD Done"
            m={mIPDDone}
            tone="green"
            Icon={FiCheckCircle}
            iconTone="green"
            className="sm:col-span-2 xl:col-span-1"
            sub="This month"
          />
        </div>
      </section>

<div className="px-2 pt-4 flex items-center justify-between">
          <h3 className="font-semibold text-2xl">Assigned Leads</h3>
          <button
            onClick={() => navigate(`/leads?callerId=${encodeURIComponent(id)}`)}
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
            onClick={() => navigate(`/leads?callerId=${encodeURIComponent(id)}`)}
            className="text-[12px] font-medium text-[#ff2e6e] hover:underline"
          >
            Show All
          </button>
        </div>
      </section>

      {/* Recent Activity Timeline */}
      <section className="rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm">
        <div className="p-4">
          <h3 className="font-semibold">Recent Activity Timeline</h3>
        </div>
        <ol className="px-6 pb-6 space-y-4">
          {timeline.map((t, i) => (
            <li key={i} className="relative pl-8">
              <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-amber-500" />
              <div className="text-sm font-medium">{t.title}</div>
              {t.tags.length > 0 && (
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
    </div>
  );
}

/* ------------ small components (styled like mock) ------------ */
function KpiCard({ title, m, tone = "gray", className = "", Icon = FiCalendar, iconTone = "gray", sub = "" }) {
  const diff = (m.prev === 0 && m.cur === 0) ? 0 : Math.round(((m.cur - m.prev) / (m.prev || 1)) * 100);
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

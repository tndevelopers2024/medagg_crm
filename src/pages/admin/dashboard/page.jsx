// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { FiUsers, FiAlertTriangle, FiClipboard } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";
import {
  fetchTodayLeads,
  fetchAllLeads,
  getAllUsers,
} from "../../../utils/api";

/* ---------------- helpers ---------------- */
const isSameDay = (a, b) =>
  a &&
  b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const initialsOf = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "—";

const useParsedLeads = (rows = []) =>
  rows.map((lead) => {
    const fields = {};
    (lead.fieldData || []).forEach((f) => {
      const key = (f?.name || "").toLowerCase();
      const val = Array.isArray(f?.values) ? f.values[0] : f?.values || "";
      if (/full_name|^name$|lead_name|first_name/.test(key) && !fields.name)
        fields.name = val;
      if (/(phone_number|phone|mobile|contact)/.test(key) && !fields.phone)
        fields.phone = val;
    });
    return {
      id: lead._id || lead.id || lead.leadId,
      createdTime: lead.createdTime ? new Date(lead.createdTime) : null,
      assignedTo: lead.assignedTo || null,
      name: fields.name || "—",
      source: lead.campaignId || fields.source || "Website",
      phone: fields.phone || "—",
      raw: lead,
    };
  });

/* stat card component to match the mock */
function StatsCard({
  title,
  value,
  icon,
  tone = "gray",
  subtitle = "From all sources",
}) {
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
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${toneCls}`}
        >
          {icon}
        </span>
      </div>
      <div className="mt-2 text-3xl font-bold text-[#1f2233]">{value}</div>
      <div className="mt-0.5 text-xs text-gray-500">{subtitle}</div>
    </article>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [todayCount, setTodayCount] = useState(0);
  const [allLeads, setAllLeads] = useState([]);
  const [callers, setCallers] = useState([]);
  const [loading, setLoading] = useState(true);
  usePageTitle("Admin Dashboard", "Welcome back");
  // load
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [t, all, users] = await Promise.all([
          fetchTodayLeads(),
          fetchAllLeads(),
          getAllUsers({ role: "caller" }),
        ]);
        if (!mounted) return;
        setTodayCount(t?.count || 0);
        setAllLeads(all?.leads || []);
        setCallers(users || []);
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

  const parsedLeads = useParsedLeads(allLeads);

  // counts
  const pendingCount = useMemo(
    () => parsedLeads.filter((l) => !l.assignedTo).length,
    [parsedLeads]
  );

  const todayPendingCount = useMemo(
    () =>
      parsedLeads.filter(
        (l) =>
          !l.assignedTo && l.createdTime && isSameDay(l.createdTime, new Date())
      ).length,
    [parsedLeads]
  );

  // OP Booked from fieldData ("opd"/"opd_status" contains "booked")
  const opBookedCount = useMemo(() => {
    const get = (lead, keys = []) => {
      for (const f of lead.fieldData || []) {
        const k = String(f?.name || "").toLowerCase();
        if (keys.some((x) => k.includes(x))) {
          const v = Array.isArray(f?.values) ? f.values[0] : f?.values || "";
          return String(v);
        }
      }
      return "";
    };
    return (allLeads || []).filter((ld) =>
      /booked/i.test(get(ld, ["opd_status", "opd"]))
    ).length;
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
      if (l.assignedTo)
        counts.set(l.assignedTo, (counts.get(l.assignedTo) || 0) + 1);
    });
    return counts;
  }, [allLeads]);

  const recent = useMemo(
    () =>
      [...parsedLeads]
        .sort((a, b) => (b.createdTime || 0) - (a.createdTime || 0))
        .slice(0, 8),
    [parsedLeads]
  );

  return (
    <div className="space-y-8">
      {/* Stat cards – styled like your mock */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="Today's Leads"
          value={loading ? "…" : String(todayCount)}
          icon={<FiUsers />}
          tone="amber"
          subtitle="From all sources"
        />
        <StatsCard
          title="Pending New Leads"
          value={loading ? "…" : String(todayPendingCount)}
          icon={<FiAlertTriangle />}
          tone="red"
          subtitle="From all sources"
        />
        <StatsCard
          title="OP Booked"
          value={loading ? "…" : String(opBookedCount)}
          icon={<FiClipboard />}
          tone="indigo"
          subtitle="In 24–48h"
        />
      </section>
      <div className="px-1 flex items-center justify-between">
        <h3 className="font-semibold text-2xl">Recent Leads</h3>
        <button
          onClick={() => navigate("/admin/leads")}
          className="text-sm button text-[#7d3bd6] "
        >
          View all
        </button>
      </div>
      {/* Recent Leads (now with Assigned Caller) */}
      <section className="rounded-2xl bg-white p-8 ring-1 ring-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className=" text-gray-600">
              <tr>
                <th className="text-left font-blod text-[16px] px-4 py-4">
                  Lead
                </th>
                <th className="text-left font-blod text-[16px] px-4 py-4">
                  Phone
                </th>
                <th className="text-left font-blod text-[16px] px-4 py-4">
                  Source
                </th>
                <th className="text-left font-blod text-[16px] px-4 py-4">
                  Status
                </th>
                <th className="text-left font-blod text-[16px] px-4 py-4">
                  Assigned Caller
                </th>
                <th className="text-left font-blod text-[16px] px-4 py-4">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {recent.map((l) => {
                const caller = l.assignedTo
                  ? callerMap.get(l.assignedTo)
                  : null;
                const count = l.assignedTo
                  ? callerCounts.get(l.assignedTo) || 0
                  : 0;
                const init = caller ? initialsOf(caller.name) : null;

                return (
                  <tr
                    key={l.id}
                    className="border-b last:border-b-0 border-[#ccc]"
                  >
                    <td className="px-4 py-4 font-medium">{l.name}</td>
                    <td className="px-4 py-4 text-gray-600">{l.phone}</td>
                    <td className="px-4 py-4">{l.source}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                          l.assignedTo
                            ? "bg-violet-50 text-violet-700 ring-violet-200"
                            : "bg-amber-50 text-amber-700 ring-amber-200"
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {l.assignedTo ? "Assigned" : "Unassigned"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {caller ? (
                        <div className="flex items-center gap-2">
                          <span className="grid h-7 w-7 place-items-center rounded-full bg-orange-100 text-orange-700 text-[11px] font-bold">
                            {init}
                          </span>
                          <div>
                            <div className="text-sm font-medium">
                              {caller.name}
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-emerald-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              {count} Leads
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      {l.createdTime ? l.createdTime.toLocaleString() : "—"}
                    </td>
                  </tr>
                );
              })}
              {!loading && recent.length === 0 && (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-gray-500"
                    colSpan={6}
                  >
                    No leads yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

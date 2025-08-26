// src/pages/CallerDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  FiPhoneCall,
  FiTarget,
  FiUsers,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiTrendingUp,
  FiPieChart,
  FiArrowRight,
  FiPlus,
} from "react-icons/fi";
import { getMe, fetchAssignedLeads } from "../../../utils/api";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";
import { useNavigate } from "react-router-dom";
// ---------- helpers ----------
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
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
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

// ---------- main ----------
export default function CallersDashboard() {
  const [me, setMe] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  usePageTitle("Caller Dashboard", "Welcome back");
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [user, assigned] = await Promise.all([getMe(), fetchAssignedLeads()]);
        if (!mounted) return;
        setMe(user);
        setLeads(assigned.leads || []);
      } catch (e) {
        setErr(
          e?.response?.data?.message ||
            e?.message ||
            "Failed to load dashboard data"
        );
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // ---------- derive ----------
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

    // tasks
    const tasksToday = [];
    const tasksTomorrow = [];
    const upcomingHour = [];

    for (const lead of leads) {
      const created = parseDate(lead.createdTime);
      const fd = Array.isArray(lead.fieldData) ? lead.fieldData : [];

      // status/bucket
      const statusRaw =
        readField(fd, ["status", "lead_status", "bucket"]) || "new lead";
      const status = normStatus(statusRaw);
      if (buckets[status] !== undefined) buckets[status]++;

      // Created today?
      if (isToday(created)) todayNewLeads++;

      // follow-ups
      const fu =
        readField(fd, [
          "next_followup",
          "next_follow_up",
          "follow_up",
          "followup",
          "follow_up_at",
          "followup_at",
        ]) || "";
      const fuDate = parseDate(fu);
      if (fuDate) {
        if (isToday(fuDate)) tasksToday.push({ lead, fuDate });
        else if (isTomorrow(fuDate)) tasksTomorrow.push({ lead, fuDate });
        if (withinNextMinutes(fuDate, 60)) {
          const diffMin = Math.max(
            1,
            Math.round((fuDate.getTime() - now.getTime()) / 60000)
          );
          upcomingHour.push({ lead, fuDate, diffMin });
        }
      }

      // calls
      const lastCall = parseDate(
        readField(fd, ["last_call_at", "last_called_at", "last_call"])
      );
      if (lastCall && isToday(lastCall)) callsMadeToday++;
      if (!lastCallAt || (lastCall && lastCall > lastCallAt)) lastCallAt = lastCall;

      const callDur = Number(
        readField(fd, ["call_duration_today", "talk_time_today"])
      );
      if (!Number.isNaN(callDur)) callDurationMin += callDur;

      const idle = Number(readField(fd, ["idle_minutes_today", "idle_time"]));
      if (!Number.isNaN(idle)) idleMin += idle;

      // OPD/IPD
      if (status === "opd booked" && isToday(created)) opdBookedToday++;
      if (status === "opd done" && isToday(created)) opdDoneToday++;
      if (status === "ipd done" && isToday(created)) ipdDoneToday++;
    }

    // Sort upcoming by soonest
    upcomingHour.sort((a, b) => a.fuDate - b.fuDate);

    const lastCallAgoMin = lastCallAt
      ? Math.max(1, Math.round((now.getTime() - lastCallAt.getTime()) / 60000))
      : null;

    return {
      todayNewLeads,
      tasksTodayCount: tasksToday.length,
      tasksTomorrowCount: tasksTomorrow.length,
      opdBookedToday,
      opdDoneToday,
      ipdDoneToday,
      callsMadeToday,
      callDurationMin,
      idleMin,
      lastCallAgoMin,
      upcomingHour: upcomingHour.slice(0, 3),
      buckets,
    };
  }, [leads]);

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

  // ---------- UI ----------
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
      {/* Header */}


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
  onClick={() => navigate("/caller/leads?date=today&status=new")}
/>
         <StatCard
  title={"Tomorrow's Task"}
  value={computed.tasksTomorrowCount}
  sub={`${computed.tasksTomorrowCount} scheduled`}
  icon={<FiCalendar />}
  accent="sky"
  onClick={() => navigate("/caller/leads?date=all&status=new")}
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
              hint={
                computed.tasksTodayCount >= 50
                  ? "Great progress!"
                  : "You're at part of your daily goal"
              }
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
              footer={
                computed.lastCallAgoMin ? `${computed.lastCallAgoMin} mins ago` : "—"
              }
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
              hint={
                computed.callsMadeToday >= 100
                  ? "You're on a 3-Day Streak!"
                  : "Build your streak"
              }
              footer={
                computed.callsMadeToday >= 100
                  ? "You’ve completed 100+ calls 3 days in a row"
                  : "—"
              }
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
                  const name =
                    readField(fd, ["full_name", "name"]) || "Unknown Lead";
                  const tag =
                    readField(fd, ["category", "service", "treatment"]) ||
                    "Follow-up";
                  return (
                    <TaskRow
                      key={lead.id || i}
                      name={name}
                      tag={tag}
                      dueIn={`${diffMin}m`}
                    />
                  );
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
                const pct = Math.max(
                  0,
                  Math.min(100, Math.round((b.value / maxBucket) * 100))
                );
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
        className="fixed bottom-6 right-6 group  inline-flex items-center justify-center rounded-full p-4 bg-gradient-to-br from-[#ff2e6e] to-[#ff5aa4] text-white shadow-xl hover:opacity-95"
      >
        <FiPlus size={22} />
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-6 min-w-6 px-1 rounded-full bg-white text-[#ff2e6e] text-xs font-semibold shadow">
          3
        </span>
      </button>
    </main>
  );
}

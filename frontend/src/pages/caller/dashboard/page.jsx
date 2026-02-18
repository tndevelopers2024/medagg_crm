// src/pages/caller/dashboard/page.jsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import {
    Card,
    Row,
    Col,
    Statistic,
    Progress,
    Tag,
    Button,
    Timeline,
    Typography,
    Space,
    Avatar,
    Select,
    notification,
    Empty,
} from "antd";
import {
    PhoneOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    UserOutlined,
    CalendarOutlined,
    LineChartOutlined,
    PieChartOutlined,
    ThunderboltOutlined,
    PlusOutlined,
    InfoCircleOutlined,
} from "@ant-design/icons";

import { getMe } from "../../../utils/api";
import { useTodayFollowUps, useTomorrowFollowUps, useCallerDashboardStats } from "../../../hooks/queries/useCallerQueries";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../../contexts/SocketProvider";
import { useAuth } from "../../../contexts/AuthContext";
import Loader from "../../../components/Loader";
import AccessDenied from "../../../components/AccessDenied";

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
const formatDurationAgo = (mins) => {
    if (!mins && mins !== 0) return "—";
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    return `${d}d`;
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
        const k = (f?.name || "").toLowerCase().replace(/\\s+/g, "_");
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

const { Title, Text } = Typography;

const StatCard = ({ title, value, sub, icon: Icon, color = "purple", onClick }) => (
    <Card
        hoverable
        onClick={onClick}
        bordered={false}
        className="shadow-sm rounded-2xl h-full cursor-pointer"
        bodyStyle={{ padding: "16px" }}
    >
        <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl bg-${color}-50 text-${color}-600`}>
                <Icon style={{ fontSize: 24, color: `var(--ant-${color}-primary)` }} />
            </div>
            <div className="flex-1">
                <div className="text-gray-500 text-sm">{title}</div>
                <div className="mt-1 flex items-baseline gap-2">
                    <Statistic value={value} valueStyle={{ fontWeight: 600 }} />
                    {sub && <Tag color={color}>{sub}</Tag>}
                </div>
            </div>
        </div>
    </Card>
);

const CommonMetricCard = ({ title, value, hint, footer, progress, max = 100, icon: Icon, color = "purple" }) => (
    <Card bordered={false} className="shadow-sm rounded-2xl h-full" bodyStyle={{ padding: "20px" }}>
        <div className="flex justify-between items-start mb-2">
            <Text type="secondary" size="small">{title}</Text>
            {Icon && <Icon className="text-gray-400" />}
        </div>
        <div className="text-2xl font-semibold mb-2">
            {typeof value === "number" ? value : (value || "—")}
        </div>
        {hint && (
            <div className="mb-3">
                <Tag color={color}>{hint}</Tag>
            </div>
        )}
        <Progress
            percent={progress !== undefined ? progress : Math.min(100, Math.round(((value || 0) / max) * 100))}
            strokeColor={color === 'purple' ? '#7d3bd6' : undefined}
            status="active"
            showInfo={false}
            strokeWidth={6}
        />
        {footer && <div className="mt-3 text-xs text-gray-400">{footer}</div>}
    </Card>
);

/* -------------------- TOASTS (socket popups) -------------------- */
const formatPhoneNumber = (phone) => {
    if (!phone) return "—";
    const cleaned = String(phone).replace(/\\D/g, "");
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



/* -------------------- page -------------------- */
export default function CallersDashboard() {
    const { hasPermission } = useAuth();
    const [me, setMe] = useState(null);
    const [err, setErr] = useState("");
    usePageTitle("Caller Dashboard", "Welcome back");

    const navigate = useNavigate();

    // socket + toasts
    const { socket, isConnected } = useSocket();
    const dedupe = useEventDeduper(8000);

    // React Query hooks for data fetching (shared cache, auto-invalidated by useSocketInvalidation)
    const { data: todayData, isLoading: todayLoading } = useTodayFollowUps();
    const { data: tomorrowData, isLoading: tomorrowLoading } = useTomorrowFollowUps();
    const { data: stats = {}, isLoading: statsLoading } = useCallerDashboardStats();

    const todayTasks = todayData?.leads || [];
    const tomorrowTasks = tomorrowData?.leads || [];
    const loading = todayLoading || tomorrowLoading || statsLoading;

    // refreshTasks/refreshStats are no longer needed — useSocketInvalidation handles this.
    // Keep stubs for socket handler compatibility.
    const refreshTasks = useCallback(() => {}, []);
    const refreshStats = useCallback(() => {}, []);

    // Load user profile on mount (not cached via React Query since it's auth-specific)
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const user = await getMe();
                if (mounted) setMe(user);
            } catch (e) {
                if (mounted) setErr(e?.response?.data?.message || e?.message || "Failed to load dashboard data");
            }
        })();
        return () => { mounted = false; };
    }, []);

    // toast helper (mapped to react-hot-toast)
    const notify = useCallback(
        (title, message, opts = {}) => {
            const { leadName, tone } = opts;
            const fullMsg = (
                <div>
                    <b className="block">{title}</b>
                    <span className="block text-sm">{message}</span>
                    {leadName && <span className="block text-xs mt-1 opacity-75">Lead: {leadName}</span>}
                </div>
            );

            if (tone === "success") {
                toast.success(fullMsg, { duration: 5000 });
            } else if (tone === "error") {
                toast.error(fullMsg, { duration: 5000 });
            } else {
                // default/info
                toast(fullMsg, { icon: opts.icon ? <opts.icon /> : "ℹ️", duration: 5000 });
            }
        },
        []
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
            });
            refreshTasks();
            refreshStats();
        };

        const onLeadCreated = (p = {}) => {
            const s = summarizeSocketLead(p);
            if (dedupe(`callerDash:lead:created:${s.id}`)) return;
            notify("New lead created", "A new lead has been added.", {
                leadName: s.name,
            });
            refreshTasks();
            refreshStats();
        };

        const onLeadUpdated = (p = {}) => {
            const s = summarizeSocketLead(p);
            if (dedupe(`callerDash:lead:updated:${s.id}:${p.updatedAt || ""}`)) return;
            notify("Lead updated", "Lead details were updated.", {
                icon: FiInfo,
                leadName: s.name,
            });
            refreshTasks();
            refreshStats();
        };

        const onStatusUpdated = (p = {}) => {
            const s = summarizeSocketLead(p);
            if (dedupe(`callerDash:lead:status:${s.id}:${p.status || ""}`)) return;
            notify("Lead status changed", `Status updated to: ${p?.status || "updated"}.`, {
                icon: InfoCircleOutlined,
                leadName: s.name,
            });
            refreshTasks();
            refreshStats();
        };

        const onActivity = (p = {}) => {
            const s = summarizeSocketLead(p);
            const act = p?.activity?._id || p?.activity?.action || "";
            if (dedupe(`callerDash:lead:activity:${s.id}:${act}`)) return;
            notify("Lead activity", `${p?.activity?.action || "Activity"} recorded.`, {
                leadName: s.name || `Lead #${s.id}`,
            });
            refreshTasks();
            refreshStats();
        };

        const onCallLogged = (p = {}) => {
            const id = p?.lead?.id || p?.leadId || "";
            if (dedupe(`callerDash:call:logged:${id}:${p?.call?._id || ""}`)) return;
            notify("Call logged", `Call outcome: ${p?.call?.outcome || "completed"}.`, {
                icon: PhoneOutlined,
                tone: "success",
            });
            refreshTasks();
            refreshStats();
        };

        const onLeadsAssigned = (p = {}) => {
            const key = Array.isArray(p?.leadIds) ? p.leadIds.join(",") : String(p?.leadIds || "");
            if (dedupe(`callerDash:leads:assigned:${key}`)) return;
            const n = Array.isArray(p?.leadIds) ? p.leadIds.length : 1;
            notify("Leads assigned", `${n} lead(s) assigned to a caller.`, { icon: InfoCircleOutlined });
            refreshTasks();
            refreshStats();

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
            socket.off?.("lead:logged", onCallLogged);
            socket.off?.("leads:assigned", onLeadsAssigned);
        };
    }, [socket, isConnected, notify, dedupe, refreshTasks, refreshStats]);

    /* -------------------- computed metrics -------------------- */
    const computed = useMemo(() => {
        const now = new Date();

        // 1. Stats from backend (or defaults)
        const buckets = stats.buckets || {
            "new lead": 0,
            hot: 0,
            "hot-ip": 0,
            prospective: 0,
            recapture: 0,
            dnp: 0,
        };

        const todayNewLeads = stats.todayNewLeads || 0;
        const callsMadeToday = stats.callsMadeToday || 0;
        const callDurationMin = stats.callDurationMin || 0;
        const idleMin = stats.idleMin || 0;
        const lastCallAgoMin = stats.lastCallAgoMin || null;

        const opdBookedToday = stats.opdBookedToday || 0;
        const opdDoneToday = stats.opdDoneToday || 0;
        const ipdBookedToday = stats.ipdBookedToday || 0;
        const ipdDoneToday = stats.ipdDoneToday || 0;
        const diagnosticBookedToday = stats.diagnosticBookedToday || 0;
        const diagnosticDoneToday = stats.diagnosticDoneToday || 0;

        // 2. Tasks counts (from API, or use stats if reliable - we use stats.tasksTodayCount/Tomorrow from API)
        // Actually our backend getDashboardStats also returns tasksTodayCount/tasksTomorrowCount.
        // But we also fetch the actual tasks list for the "upcoming reminder" list.
        // Let's use the explicit list length if available, or fallback to stats if list is empty but count > 0? 
        // Backend stats is arguably more accurate if lists are paginated (though lists here seem to be "all due").
        // Let's rely on stats for the *Count* display, and the list for the *Reminder* widgets.
        const tasksTodayCount = stats.tasksTodayCount || todayTasks.length || 0;
        const tasksTomorrowCount = stats.tasksTomorrowCount || tomorrowTasks.length || 0;

        // 3. Upcoming reminders (needs client-side calc on todayTasks)
        const upcomingHour = todayTasks
            .filter((l) => withinNextMinutes(l.followUpAt, 60))
            .map((lead) => {
                const fuDate = lead.followUpAt instanceof Date ? lead.followUpAt : (lead.followUpAt ? new Date(lead.followUpAt) : null);
                const diffMin = fuDate ? Math.max(1, Math.round((fuDate.getTime() - now.getTime()) / 60000)) : "—";
                return { lead, fuDate, diffMin };
            })
            .sort((a, b) => (a.fuDate?.getTime() || 0) - (b.fuDate?.getTime() || 0))
            .slice(0, 3);

        return {
            todayNewLeads,
            tasksTodayCount,
            tasksTomorrowCount,
            opdBookedToday,
            opdDoneToday,
            ipdBookedToday,
            ipdDoneToday,
            diagnosticBookedToday,
            diagnosticDoneToday,
            callsMadeToday,
            callDurationMin,
            idleMin,
            lastCallAgoMin,
            upcomingHour,
            buckets,
        };
    }, [todayTasks, tomorrowTasks, stats]);

    // Bucket bars
    const bucketList = useMemo(() => {
        const map = [
            { label: "New Lead", key: "new lead", color: "pink" },
            { label: "Hot", key: "hot", color: "orange" },
            { label: "Hot-IP", key: "hot-ip", color: "green" },
            { label: "Prospective", key: "prospective", color: "purple" },
            { label: "Recapture", key: "recapture", color: "blue" },
            { label: "DNP", key: "dnp", color: "gray" },
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
    if (!hasPermission("dashboard.dashboard.view")) return <AccessDenied />;
    if (loading) return <Loader fullScreen text="Loading dashboard..." />;

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
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} md={8} lg={8} xl={4}>
                        <StatCard
                            title="Today New Leads"
                            value={computed.todayNewLeads}
                            sub={`${computed.todayNewLeads} today`}
                            icon={UserOutlined}
                            color="purple"
                            onClick={() => navigate("/leads?date=today&status=new")}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={8} xl={4}>
                        <StatCard
                            title={"Today's Task"}
                            value={computed.tasksTodayCount}
                            sub={`${computed.tasksTodayCount} due`}
                            icon={CheckCircleOutlined}
                            color="pink"
                            onClick={() => navigate("/leads?date=tasks_today&view=tasks_today")}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={8} xl={4}>
                        <StatCard
                            title={"Tomorrow's Task"}
                            value={computed.tasksTomorrowCount}
                            sub={`${computed.tasksTomorrowCount} scheduled`}
                            icon={CalendarOutlined}
                            color="blue"
                            onClick={() => navigate("/leads?date=tasks_tomorrow&view=tasks_tomorrow")}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={8} xl={4}>
                        <StatCard
                            title="OPD Booked Today"
                            value={computed.opdBookedToday}
                            sub="Target: 2"
                            icon={ClockCircleOutlined}
                            color="green"
                            onClick={() => navigate("/leads?date=today&status=opd%20booked")}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={8} xl={4}>
                        <StatCard
                            title="OPD Done Today"
                            value={computed.opdDoneToday}
                            sub="Target: 3/10"
                            icon={PieChartOutlined}
                            color="orange"
                            onClick={() => navigate("/leads?date=today&status=opd%20done")}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={8} xl={4}>
                        <StatCard
                            title="IPD Booked Today"
                            value={computed.ipdBookedToday}
                            sub="Target: 2"
                            icon={ClockCircleOutlined}
                            color="lime"
                            onClick={() => navigate("/leads?date=today&status=ipd%20booked")}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={8} xl={4}>
                        <StatCard
                            title="IPD Done Today"
                            value={computed.ipdDoneToday}
                            sub="Target: 3/10"
                            icon={PieChartOutlined}
                            color="cyan"
                            onClick={() => navigate("/leads?date=today&status=ipd%20done")}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={8} xl={4}>
                        <StatCard
                            title="Diag Booked Today"
                            value={computed.diagnosticBookedToday}
                            sub="Target: 2"
                            icon={ClockCircleOutlined}
                            color="volcano"
                            onClick={() => navigate("/leads?date=today&status=diagnostic%20booked")}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={8} xl={4}>
                        <StatCard
                            title="Diag Done Today"
                            value={computed.diagnosticDoneToday}
                            sub="Target: 3/10"
                            icon={PieChartOutlined}
                            color="magenta"
                            onClick={() => navigate("/leads?date=today&status=diagnostic%20done")}
                        />
                    </Col>
                </Row>

                {/* Performance Metrics */}
                <Card title="Performance Metrics" bordered={false} className="shadow-sm rounded-2xl">
                    <Row gutter={[16, 16]}>
                        <Col xs={24} sm={12} md={12} lg={8} xl={6}>
                            <CommonMetricCard
                                title="Today Task"
                                value={computed.tasksTodayCount}
                                hint={computed.tasksTodayCount >= 50 ? "Great progress!" : "You're at part of your daily goal"}
                                footer={`${computed.tasksTodayCount}/100`}
                                color={computed.tasksTodayCount >= 50 ? "green" : "orange"}
                                max={100}
                                icon={CheckCircleOutlined}
                            />
                        </Col>
                        <Col xs={24} sm={12} md={12} lg={8} xl={6}>
                            <CommonMetricCard
                                title="Calls Made"
                                value={computed.callsMadeToday}
                                hint={computed.callsMadeToday ? "Keep up the momentum!" : "No calls logged"}
                                footer={`${computed.callsMadeToday}/50 calls`}
                                color={computed.callsMadeToday ? "blue" : "orange"}
                                max={50}
                                icon={PhoneOutlined}
                            />
                        </Col>
                        <Col xs={24} sm={12} md={12} lg={8} xl={6}>
                            <CommonMetricCard
                                title="Call Duration"
                                value={computed.callDurationMin}
                                hint={computed.callDurationMin >= 30 ? "Nice talk time!" : "Low talk time"}
                                footer={`${computed.callDurationMin}min / 120min`}
                                color={computed.callDurationMin >= 30 ? "green" : "red"}
                                max={120}
                                icon={ClockCircleOutlined}
                            />
                        </Col>
                        <Col xs={24} sm={12} md={12} lg={8} xl={6}>
                            <CommonMetricCard
                                title="Idle Time"
                                value={computed.idleMin ? `${computed.idleMin}m` : "0m"}
                                hint={computed.idleMin > 60 ? "High idle time" : "Good pace"}
                                footer={`${computed.idleMin}min`}
                                color={computed.idleMin > 60 ? "red" : "green"}
                                max={180}
                                icon={ClockCircleOutlined}
                            />
                        </Col>
                        <Col xs={24} sm={12} md={12} lg={8} xl={6}>
                            <CommonMetricCard
                                title="Last Call Made"
                                value={computed.lastCallAgoMin !== null ? formatDurationAgo(computed.lastCallAgoMin) : "—"}
                                hint={
                                    computed.lastCallAgoMin !== null && computed.lastCallAgoMin < 60
                                        ? "Great activity!"
                                        : "Make a call now"
                                }
                                footer={
                                    computed.lastCallAgoMin !== null
                                        ? `${formatDurationAgo(computed.lastCallAgoMin)} ago`
                                        : "No call yet"
                                }
                                color={
                                    computed.lastCallAgoMin !== null && computed.lastCallAgoMin < 60
                                        ? "green"
                                        : "orange"
                                }
                                max={60}
                                icon={PhoneOutlined}
                            />
                        </Col>
                        <Col xs={24} sm={12} md={12} lg={8} xl={6}>
                            <CommonMetricCard
                                title="OPD Booked"
                                value={computed.opdBookedToday}
                                hint={computed.opdBookedToday ? "Bookings coming in!" : "Book more OPDs"}
                                footer={`${computed.opdBookedToday}/5`}
                                color={computed.opdBookedToday ? "green" : "orange"}
                                max={5}
                                icon={CheckCircleOutlined}
                            />
                        </Col>
                        <Col xs={24} sm={12} md={12} lg={8} xl={6}>
                            <CommonMetricCard
                                title="OPD Done"
                                value={computed.opdDoneToday}
                                hint={computed.opdDoneToday ? "Almost halfway there!" : "Start closing!"}
                                footer={`${computed.opdDoneToday}/5`}
                                color={computed.opdDoneToday ? "green" : "orange"}
                                max={5}
                                icon={CheckCircleOutlined}
                            />
                        </Col>
                        <Col xs={24} sm={12} md={12} lg={8} xl={6}>
                            <CommonMetricCard
                                title="IPD Booked"
                                value={computed.ipdBookedToday}
                                hint={computed.ipdBookedToday ? "Admissions rolling!" : "Push for IP bookings"}
                                footer={`${computed.ipdBookedToday}/3`}
                                color={computed.ipdBookedToday ? "green" : "orange"}
                                max={3}
                                icon={CheckCircleOutlined}
                            />
                        </Col>
                        <Col xs={24} sm={12} md={12} lg={8} xl={6}>
                            <CommonMetricCard
                                title="IPD Done"
                                value={computed.ipdDoneToday}
                                hint={computed.ipdDoneToday ? "One more to reach" : "Keep pushing"}
                                footer={`${computed.ipdDoneToday}/3`}
                                color={computed.ipdDoneToday ? "green" : "orange"}
                                max={3}
                                icon={CheckCircleOutlined}
                            />
                        </Col>
                        <Col xs={24} sm={12} md={12} lg={8} xl={6}>
                            <CommonMetricCard
                                title="Diagnostic Booked"
                                value={computed.diagnosticBookedToday}
                                hint={computed.diagnosticBookedToday ? "Diagnostics on track!" : "Book diagnostics"}
                                footer={`${computed.diagnosticBookedToday}/3`}
                                color={computed.diagnosticBookedToday ? "green" : "orange"}
                                max={3}
                                icon={CheckCircleOutlined}
                            />
                        </Col>
                        <Col xs={24} sm={12} md={12} lg={8} xl={6}>
                            <CommonMetricCard
                                title="Diagnostic Done"
                                value={computed.diagnosticDoneToday}
                                hint={computed.diagnosticDoneToday ? "Great diagnostic closures!" : "Close diagnostics"}
                                footer={`${computed.diagnosticDoneToday}/3`}
                                color={computed.diagnosticDoneToday ? "green" : "orange"}
                                max={3}
                                icon={CheckCircleOutlined}
                            />
                        </Col>
                        <Col xs={24} sm={12} md={12} lg={8} xl={6}>
                            <CommonMetricCard
                                title="Streak"
                                value={computed.callsMadeToday >= 100 ? 3 : 0}
                                hint={computed.callsMadeToday >= 100 ? "You're on a 3-Day Streak!" : "Build your streak"}
                                footer={computed.callsMadeToday >= 100 ? "You've completed 100+ calls 3 days in a row" : "—"}
                                color={computed.callsMadeToday >= 100 ? "blue" : "orange"}
                                max={7}
                                icon={ThunderboltOutlined}
                            />
                        </Col>
                    </Row>
                </Card>

                {/* Bottom: Tasks + Bucket */}
                <Row className="mt-6" gutter={24}>
                    <Col xs={24} lg={12}>
                        <Card
                            title={
                                <div>
                                    <div className="font-semibold text-gray-900">Today Task Reminder</div>
                                    <div className="text-xs text-secondary font-normal">
                                        {computed.upcomingHour.length} Upcoming Follow-ups in next 1 hour
                                    </div>
                                </div>
                            }
                            bordered={false}
                            className="shadow-sm rounded-2xl h-full"
                        >
                            {computed.upcomingHour.length ? (
                                <Timeline
                                    mode="left"
                                    className="mt-2"
                                    items={computed.upcomingHour.map(({ lead, diffMin }, i) => {
                                        const fd = lead.fieldData || [];
                                        const name = readField(fd, ["full_name", "name"]) || "Unknown Lead";
                                        const tag = readField(fd, ["category", "service", "treatment"]) || "Follow-up";
                                        return {
                                            color: 'blue',
                                            children: (
                                                <div className="flex items-center justify-between pb-2">
                                                    <div>
                                                        <div className="font-medium text-gray-900">{name}</div>
                                                        <div className="text-xs text-gray-500">{tag}</div>
                                                    </div>
                                                    <Space>
                                                        <Tag color="blue">in {diffMin}m</Tag>
                                                        <Button
                                                            type="primary"
                                                            shape="round"
                                                            size="small"
                                                            icon={<PhoneOutlined />}
                                                            onClick={() => navigate(`/leads/${lead.id}`)}
                                                            className="bg-pink-500 hover:bg-pink-600 border-none"
                                                        >
                                                            Call
                                                        </Button>
                                                    </Space>
                                                </div>
                                            )
                                        };
                                    })}
                                />
                            ) : (
                                <Empty description="No follow-ups in the next hour" className="py-8" />
                            )}
                        </Card>
                    </Col>

                    <Col xs={24} lg={12}>
                        <Card
                            title="Your Bucket"
                            bordered={false}
                            className="shadow-sm rounded-2xl h-full"
                            extra={
                                <Select defaultValue="This Month" size="small" bordered={false} style={{ width: 120 }}>
                                    <Select.Option value="This Month">This Month</Select.Option>
                                    <Select.Option value="Last Month">Last Month</Select.Option>
                                    <Select.Option value="This Week">This Week</Select.Option>
                                    <Select.Option value="Today">Today</Select.Option>
                                </Select>
                            }
                        >
                            <div className="space-y-6 pt-2">
                                {bucketList.map((b) => {
                                    const pct = Math.max(0, Math.min(100, Math.round((b.value / maxBucket) * 100)));
                                    return (
                                        <div key={b.key}>
                                            <div className="flex justify-between items-center mb-1">
                                                <Text size="small">{b.label}</Text>
                                                <Text strong>{b.value}</Text>
                                            </div>
                                            <Progress
                                                percent={pct}
                                                showInfo={false}
                                                strokeColor={b.color === 'purple' ? '#7d3bd6' : undefined}
                                                status="active"
                                                strokeWidth={8}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    </Col>
                </Row>
            </div>

            {/* Floating Action Button */}
            <Button
                type="primary"
                shape="circle"
                size="large"
                icon={<PlusOutlined />}
                className="fixed bottom-6 right-6 h-14 w-14 shadow-xl bg-gradient-to-br from-[#ff2e6e] to-[#ff5aa4] border-none flex items-center justify-center"
                onClick={() => navigate("/leads/create")}
            />
        </main>
    );
}

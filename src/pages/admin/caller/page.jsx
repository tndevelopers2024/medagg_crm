// src/pages/CallerDashboard.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Row,
  Col,
  Statistic,
  Avatar,
  Tag,
  Button,
  Select,
  DatePicker,
  Timeline,
  Typography,
  Divider,
  Space,
  App,
  notification
} from "antd";
import {
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  DownloadOutlined,
  SettingOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { getAllUsers, fetchAllLeads } from "../../../utils/api";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";
import { useSocket } from "../../../contexts/SocketProvider";
import Loader from "../../../components/Loader";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

/* ------------ helpers ------------ */
const dicebear = (seed) =>
  `https://api.dicebear.com/7.x/initials/svg?radius=50&fontWeight=700&seed=${encodeURIComponent(
    seed || "caller"
  )}`;

const safeDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(+d) ? null : d;
};

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

/** pick the best timestamp to represent a booking in analytics */
const bookingWhen = (b) =>
  safeDate(b?.doneDate) ||
  safeDate(b?.date) ||
  safeDate(b?.updatedAt) ||
  safeDate(b?.createdAt) ||
  null;

const summarizeBookings = (arr = []) => {
  const counts = { pending: 0, booked: 0, done: 0, cancelled: 0 };
  let latestDate = null;
  let latestStatus = null;

  for (const b of arr) {
    const st = (b?.status || "").toLowerCase();
    if (counts[st] !== undefined) counts[st] += 1;

    const when = bookingWhen(b);
    if (when && (!latestDate || when > latestDate)) {
      latestDate = when;
      latestStatus = st;
    }
  }
  return { counts, latestStatus, latestDate };
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

  const campaign = lead.campaignId || readField(lead.fieldData, ["campaign"]) || "—";
  const created = safeDate(lead.createdTime) || safeDate(lead.createdAt);
  const lastUpdate =
    safeDate(lead.lastCallAt) || safeDate(lead.updatedAt) || created;

  const opBookings = Array.isArray(lead.opBookings)
    ? lead.opBookings.map((b) => ({
      ...b,
      status: (b?.status || "").toLowerCase(),
      _when: bookingWhen(b),
    }))
    : [];
  const ipBookings = Array.isArray(lead.ipBookings)
    ? lead.ipBookings.map((b) => ({
      ...b,
      status: (b?.status || "").toLowerCase(),
      _when: bookingWhen(b),
    }))
    : [];

  const op = summarizeBookings(opBookings);
  const ip = summarizeBookings(ipBookings);

  const compact = (s) =>
    s === "done" ? "Done" : s === "booked" ? "Booked" : s === "cancelled" ? "Cancelled" : s ? s[0].toUpperCase() + s.slice(1) : "—";

  return {
    id: lead._id || lead.id || lead.leadId,
    assignedTo: lead.assignedTo || null,
    name,
    phone,
    campaign,
    status,
    opd: compact(op.latestStatus),
    ipd: compact(ip.latestStatus),
    opBookings,
    ipBookings,
    notes: lead.notes || "",
    outcome: lead.lastCallOutcome || "",
    followUpAt: safeDate(lead.followUpAt),
    lastContact: safeDate(lead.lastCallAt),
    createdAt: created,
    lastUpdate,
  };
};

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

// --- Custom Components ---
const MetricCard = ({ title, value, sub, progress, badge, icon: Icon, color = "purple" }) => (
  <Card bordered={false} className="shadow-sm h-full" bodyStyle={{ padding: "20px" }}>
    <div className="flex justify-between items-start mb-2">
      <div className={`p-2 rounded-lg bg-${color}-50`}>
        <Icon style={{ fontSize: 20, color: `var(--ant-${color}-primary)` }} />
      </div>
      {badge && <Tag color={color}>{badge}</Tag>}
    </div>
    <Statistic value={value} valueStyle={{ fontWeight: 600 }} />
    <div className="text-gray-500 text-xs mt-1">{title}</div>
    {sub && (
      <div className="mt-3 text-xs text-gray-400 border-t pt-2 w-full">
        {sub}
      </div>
    )}
    {progress !== undefined && (
      <div className="mt-2 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full bg-${color}-500`}
          style={{ width: `${progress}%`, backgroundColor: '#7d3bd6' }}
        />
      </div>
    )}
  </Card>
);

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
    const has = seenRef.current.has(k);
    seenRef.current.set(k, now);
    return has;
  }, []);
};


/* ------------ page ------------ */
export default function CallerDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  usePageTitle("BD Performance Dashboard", "");

  const [loading, setLoading] = useState(true);
  const [caller, setCaller] = useState(null);
  const [allLeads, setAllLeads] = useState([]);

  // presence
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);
  const [liveActivity, setLiveActivity] = useState([]);

  // period
  const [period, setPeriod] = useState("This Month");
  const [customRange, setCustomRange] = useState([]);

  // socket
  const { socket, isConnected } = useSocket();
  const dedupe = useEventDeduper(7000);

  // Initial fetch
  const softRefresh = useCallback(async () => {
    const [users, leadsRes] = await Promise.all([getAllUsers(), fetchAllLeads()]);
    const u = (users || []).find((x) => x.id === id || x._id === id);
    setCaller(u || { id, name: "Unknown", email: "", phone: "", role: "caller", state: "" });
    setAllLeads((leadsRes?.leads || []).map(parseLead));
  }, [id]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        await softRefresh();
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [softRefresh]);

  const assigned = useMemo(
    () => allLeads.filter((l) => String(l.assignedTo) === String(id)),
    [allLeads, id]
  );

  /* period filtering */
  const [from, to] = useMemo(() => {
    if (period === "This Month") return [startOfMonth(0), endOfMonth(0)];
    if (period === "Last Month") return [startOfMonth(-1), endOfMonth(-1)];
    if (period === "This Week") return [startOfWeek(), endOfWeek()];
    if (period === "All Time") return [new Date(0), new Date()];
    if (period === "Custom" && customRange?.length === 2)
      return [customRange[0].startOf('day').toDate(), customRange[1].endOf('day').toDate()];
    return [startOfMonth(0), endOfMonth(0)];
  }, [period, customRange]);

  const inRange = (d) => d && d >= from && d <= to;

  const leadsInThis = useMemo(
    () => assigned.filter((l) => inRange(l.createdAt)),
    [assigned, from, to]
  );

  const prevRange = useMemo(() => {
    // simplified prev range logic for brevity, ideally mirror strict logic
    if (period === "This Month") return [startOfMonth(-1), endOfMonth(-1)];
    return [startOfMonth(-1), endOfMonth(-1)];
  }, [period]);

  const leadsInPrev = useMemo(
    () => assigned.filter((l) => l.createdAt && l.createdAt >= prevRange[0] && l.createdAt <= prevRange[1]),
    [assigned, prevRange]
  );

  const metricLeads = (arrCur, arrPrev) => ({ cur: arrCur.length, prev: arrPrev.length });

  // Metrics
  const allOp = useMemo(() => assigned.flatMap((l) => l.opBookings || []), [assigned]);
  const allIp = useMemo(() => assigned.flatMap((l) => l.ipBookings || []), [assigned]);
  const inWindow = (when, win) => when && when >= win[0] && when <= win[1];

  const bookingMetric = (bookings, status, win, winPrev) => {
    const cur = bookings.filter((b) => b.status === status && inWindow(bookingWhen(b), win)).length;
    const prev = bookings.filter((b) => b.status === status && inWindow(bookingWhen(b), winPrev)).length;
    return { cur, prev };
  };

  const mTotal = metricLeads(leadsInThis, leadsInPrev);
  const monthlyTarget = 20;
  const targetProgress = Math.min(100, Math.round((mTotal.cur / monthlyTarget) * 100));

  const mOPBooked = bookingMetric(allOp, "booked", [from, to], prevRange);
  const mOPDone = bookingMetric(allOp, "done", [from, to], prevRange);
  const mOPCancel = bookingMetric(allOp, "cancelled", [from, to], prevRange);
  const mIPDDone = bookingMetric(allIp, "done", [from, to], prevRange);

  /* Timeline */
  const derivedTimeline = useMemo(() => {
    const items = [];
    for (const l of assigned) {
      if (l.lastUpdate) {
        items.push({
          when: l.lastUpdate,
          title: `Call with ${l.name}`,
          color: "blue",
          icon: <PhoneOutlined />,
          desc: l.notes,
        });
      }
      for (const b of l.opBookings) {
        const when = bookingWhen(b);
        if (!when) continue;
        items.push({
          when,
          title: `OP ${b.status} - ${l.name}`,
          color: b.status === 'done' ? 'green' : b.status === 'booked' ? 'geekblue' : 'gray',
          icon: <CheckCircleOutlined />,
          desc: `${b.hospital} • ${b.doctor}`,
        });
      }
    }
    return items.sort((a, b) => b.when - a.when).slice(0, 20);
  }, [assigned]);


  /* Socket & Live Activity helper */
  const pushLive = useCallback((evt) => {
    setLiveActivity(prev => [{ ...evt }, ...prev].slice(0, 40));
  }, []);

  const throttledRefresh = useCallback(async () => {
    // simplifed refresh
    const leadsRes = await fetchAllLeads();
    setAllLeads((leadsRes?.leads || []).map(parseLead));
  }, []);

  useEffect(() => {
    if (!socket || !id) return;
    const onPresence = (p) => {
      if (String(p.userId) !== String(id)) return;
      setIsOnline(!!p.online);
      setLastSeen(p.lastSeen ? new Date(p.lastSeen) : new Date());
    }
    socket.on?.("caller:presence", onPresence);
    try { socket.emit?.("caller:presence:request", { userId: id }); } catch { }
    return () => socket.off?.("caller:presence", onPresence);
  }, [socket, id]);


  if (loading) return <Loader fullScreen text="Loading metrics..." />;
  if (!caller) return <div className="p-6">Caller not found.</div>;

  const lastSeenLabel = isOnline
    ? "Active Now"
    : lastSeen
      ? `Last seen ${timeAgo(lastSeen)}`
      : "Offline";

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-end gap-3">
        <Button icon={<DownloadOutlined />}>Export Report</Button>
        <Button type="primary" style={{ backgroundColor: '#3b0d66' }}>Admin Actions</Button>
      </div>

      {/* Header */}
      <Card bordered={false} className="shadow-sm rounded-xl">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
          <Avatar src={dicebear(caller.email)} size={80} className="ring-4 ring-gray-50" />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <Title level={3} style={{ margin: 0, color: '#3b0d66' }}>{caller.name}</Title>
              <Tag color={isOnline ? "success" : "default"}>
                {isOnline ? <ThunderboltOutlined spin /> : <ClockCircleOutlined />} {lastSeenLabel}
              </Tag>
            </div>
            <Space split={<Divider type="vertical" />} className="text-gray-500">
              <span><EnvironmentOutlined /> {caller.state || "Unknown Location"}</span>
              <span><PhoneOutlined /> {caller.phone || "—"}</span>
              <span><MailOutlined /> {caller.email}</span>
            </Space>
            <div className="mt-3">
              <Space>
                <Tag color="purple">GPE</Tag>
                <Tag color="magenta">PPC</Tag>
              </Space>
            </div>
          </div>
          <div className="text-right hidden md:block">
            <Statistic title="Total Allocated Leads" value={assigned.length} groupSeparator="," />
            <Button type="link" icon={<MailOutlined />} href={`mailto:${caller.email}`}>Send Message</Button>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <div className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-gray-100">
        <Text strong>Performance Overview</Text>
        <Space>
          <Select value={period} onChange={setPeriod} style={{ width: 140 }} bordered={false}>
            <Select.Option value="This Month">This Month</Select.Option>
            <Select.Option value="Last Month">Last Month</Select.Option>
            <Select.Option value="This Week">This Week</Select.Option>
            <Select.Option value="All Time">All Time</Select.Option>
            <Select.Option value="Custom">Custom Range</Select.Option>
          </Select>
          {period === "Custom" && <RangePicker onChange={setCustomRange} />}
        </Space>
      </div>

      {/* Metrics Grid */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={4}>
          <MetricCard
            title="Monthly Target"
            value={mTotal.cur}
            sub={`${monthlyTarget - mTotal.cur} more to goal`}
            progress={targetProgress}
            icon={CheckCircleOutlined}
            color="purple"
          />
        </Col>
        <Col xs={24} sm={12} md={4}>
          <MetricCard
            title="OP Booked"
            value={mOPBooked.cur}
            badge={mOPBooked.cur > mOPBooked.prev ? "Trending Up" : null}
            icon={ClockCircleOutlined}
            color="blue"
          />
        </Col>
        <Col xs={24} sm={12} md={4}>
          <MetricCard
            title="OP Done"
            value={mOPDone.cur}
            icon={CheckCircleOutlined}
            color="green"
          />
        </Col>
        <Col xs={24} sm={12} md={4}>
          <MetricCard
            title="IPD Conversions"
            value={mIPDDone.cur}
            icon={UserOutlined}
            color="gold"
          />
        </Col>
        <Col xs={24} sm={12} md={4}>
          <MetricCard
            title="Cancellations"
            value={mOPCancel.cur}
            icon={WarningOutlined}
            color="red"
          />
        </Col>
      </Row>

      {/* Activity Timeline */}
      <Row gutter={24}>
        <Col span={24}>
          <Card title="Activity Timeline" bordered={false} className="shadow-sm rounded-xl">
            {derivedTimeline.length > 0 ? (
              <Timeline
                mode="left"
                items={derivedTimeline.map(item => ({
                  color: item.color,
                  dot: item.icon,
                  children: (
                    <div className="pb-4">
                      <Text strong>{item.title}</Text>
                      <div className="text-xs text-gray-400">{timeAgo(item.when)}</div>
                      <div className="text-gray-500 text-sm mt-1">{item.desc}</div>
                    </div>
                  )
                }))}
              />
            ) : <div className="text-center py-10 text-gray-400">No activity in this period</div>}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

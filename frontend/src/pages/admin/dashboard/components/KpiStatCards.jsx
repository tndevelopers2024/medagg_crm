import React from "react";
import { Row, Col, Card, Statistic } from "antd";
import {
  FiUsers,
  FiAlertTriangle,
  FiClipboard,
  FiCheckCircle,
  FiActivity,
  FiHeart,
  FiZap,
  FiTrendingUp,
  FiClock,
  FiCalendar,
} from "react-icons/fi";

const PRESET_LABEL = {
  today:      "Today's",
  yesterday:  "Yesterday's",
  this_week:  "This Week's",
  last_week:  "Last Week's",
  this_month: "This Month's",
  last_month: "Last Month's",
  custom:     "Period",
};

const CARD_CONFIG = [
  { key: "todaysLeads",        dynamic: true,  base: "Leads",          icon: FiUsers,         bg: "bg-pink-100",   color: "text-pink-600" },
  { key: "pendingNewLeads",    dynamic: true,  base: "Pending Leads",  icon: FiAlertTriangle, bg: "bg-amber-100",  color: "text-amber-600" },
  { key: "pendingTasks",           label: "Pending Tasks",               icon: FiClock,     bg: "bg-orange-100", color: "text-orange-600" },
  { key: "tomorrowOpdDiagBooked",  label: "Tomorrow OP & Diag",     icon: FiCalendar,  bg: "bg-teal-100",   color: "text-teal-600" },
  { key: "tomorrowIpBooked",       label: "Tomorrow IP Booked",       icon: FiActivity,  bg: "bg-pink-100",   color: "text-pink-600" },
  { key: "opBooked",           label: "OP Booked",           icon: FiClipboard,     bg: "bg-green-100",  color: "text-green-600" },
  { key: "opDone",             label: "OP Done",             icon: FiCheckCircle,   bg: "bg-indigo-100", color: "text-indigo-600" },
  { key: "ipBooked",           label: "IP Booked",           icon: FiActivity,      bg: "bg-pink-100",   color: "text-pink-600" },
  { key: "ipDone",             label: "IP Done",             icon: FiHeart,         bg: "bg-amber-100",  color: "text-amber-600" },
  { key: "diagnosticBooked",   label: "Diagnostic Booked",   icon: FiClipboard,     bg: "bg-blue-100",   color: "text-blue-600" },
  { key: "diagnosticDone",     label: "Diagnostic Done",     icon: FiCheckCircle,   bg: "bg-cyan-100",   color: "text-cyan-600" },
  { key: "surgerySuggested",   label: "Surgery Suggested",   icon: FiZap,           bg: "bg-green-100",  color: "text-green-600" },
  { key: "diagnosticSuggested",label: "Diagnostic Suggested",icon: FiTrendingUp,    bg: "bg-indigo-100", color: "text-indigo-600" },
];

export default function KpiStatCards({ kpiCards = {}, onCardClick, datePreset = "today" }) {
  const prefix = PRESET_LABEL[datePreset] ?? "Period";

  return (
    <Row gutter={[16, 16]}>
      {CARD_CONFIG.map((c) => {
        const Icon = c.icon;
        const hasData = (kpiCards[c.key] ?? 0) > 0;
        const label = c.dynamic ? `${prefix} ${c.base}` : c.label;
        return (
          <Col xs={12} sm={6} key={c.key}>
            <Card
              hoverable={hasData}
              onClick={() => hasData && onCardClick?.(c.key)}
              style={{ cursor: hasData ? "pointer" : "default" }}
            >
              <div className="flex flex-col gap-3">
                <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${c.bg}`}>
                  <Icon className={`text-lg ${c.color}`} />
                </span>
                <Statistic
                  title={label}
                  value={kpiCards[c.key] ?? 0}
                  valueStyle={{ fontWeight: 700, color: "#1f2233" }}
                />
              </div>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
}

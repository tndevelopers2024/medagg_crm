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
} from "react-icons/fi";

const CARD_CONFIG = [
  { key: "todaysLeads", label: "Today's Leads", icon: FiUsers, bg: "bg-pink-100", color: "text-pink-600" },
  { key: "pendingNewLeads", label: "Pending New Leads", icon: FiAlertTriangle, bg: "bg-amber-100", color: "text-amber-600" },
  { key: "opBooked", label: "OP Booked", icon: FiClipboard, bg: "bg-green-100", color: "text-green-600" },
  { key: "opDone", label: "OP Done", icon: FiCheckCircle, bg: "bg-indigo-100", color: "text-indigo-600" },
  { key: "ipBooked", label: "IP Booked", icon: FiActivity, bg: "bg-pink-100", color: "text-pink-600" },
  { key: "ipDone", label: "IP Done", icon: FiHeart, bg: "bg-amber-100", color: "text-amber-600" },
  { key: "diagnosticBooked", label: "Diagnostic Booked", icon: FiClipboard, bg: "bg-blue-100", color: "text-blue-600" },
  { key: "diagnosticDone", label: "Diagnostic Done", icon: FiCheckCircle, bg: "bg-cyan-100", color: "text-cyan-600" },
  { key: "surgerySuggested", label: "Surgery Suggested", icon: FiZap, bg: "bg-green-100", color: "text-green-600" },
  { key: "diagnosticSuggested", label: "Diagnostic Suggested", icon: FiTrendingUp, bg: "bg-indigo-100", color: "text-indigo-600" },
];

export default function KpiStatCards({ kpiCards = {}, onCardClick }) {
  return (
    <Row gutter={[16, 16]}>
      {CARD_CONFIG.map((c) => {
        const Icon = c.icon;
        const hasData = (kpiCards[c.key] ?? 0) > 0;
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
                  title={c.label}
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

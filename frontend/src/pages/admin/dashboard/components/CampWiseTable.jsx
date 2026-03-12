import React from "react";
import { useNavigate } from "react-router-dom";
import ExpandableTable from "./ExpandableTable";
import { buildDashboardCellUrl } from "../../../../utils/leadsNavigation";

const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";

const COLUMNS = [
  { key: "name", label: "City / Campaign", render: (r) => capitalize(r.name) },
  { key: "totalLeads", label: "Total Leads" },
  { key: "opBooked", label: "OP Booked" },
  { key: "opDone", label: "OP Done" },
  { key: "ipBooked", label: "IP Booked" },
  { key: "ipDone", label: "IP Done" },
  { key: "diagnosticBooked", label: "Diag. Booked" },
  { key: "diagnosticDone", label: "Diag. Done" },
];

const CHART_CONFIG = {
  metrics: [
    { key: "totalLeads", label: "Total Leads", color: "#6366f1" },
    { key: "opBooked", label: "OP Booked", color: "#10b981" },
    { key: "opDone", label: "OP Done", color: "#8b5cf6" },
    { key: "ipBooked", label: "IP Booked", color: "#f59e0b" },
    { key: "ipDone", label: "IP Done", color: "#ef4444" },
    { key: "diagnosticBooked", label: "Diag. Booked", color: "#3b82f6" },
    { key: "diagnosticDone", label: "Diag. Done", color: "#06b6d4" },
  ],
  defaultMetric: "totalLeads",
  nameKey: "name",
  filters: [{ key: "name", label: "City" }],
};

export default function CampWiseTable({ data = [], datePreset = "today", customRange = {} }) {
  const navigate = useNavigate();

  const rows = data.map((c) => {
    const cityNavCtx = { search: c.city };
    return {
      name: c.city,
      totalLeads: c.totalLeads,
      opBooked: c.opBooked,
      opDone: c.opDone,
      ipBooked: c.ipBooked,
      ipDone: c.ipDone,
      diagnosticBooked: c.diagnosticBooked,
      diagnosticDone: c.diagnosticDone,
      _navCtx: cityNavCtx,
      children: (c.campaigns || []).map((camp) => ({
        name: camp.campaignName || camp.campaignId,
        totalLeads: camp.totalLeads,
        opBooked: camp.opBooked,
        opDone: camp.opDone,
        ipBooked: camp.ipBooked,
        ipDone: camp.ipDone,
        diagnosticBooked: camp.diagnosticBooked,
        diagnosticDone: camp.diagnosticDone,
        _navCtx: { campaignFilter: [String(camp.campaignId)], search: c.city },
      })),
    };
  });

  const handleCellClick = (colKey, row) => {
    navigate(buildDashboardCellUrl(row._navCtx || {}, colKey, datePreset, customRange));
  };

  return (
    <ExpandableTable
      title="Camp-Wise Leads"
      columns={COLUMNS}
      rows={rows}
      chartConfig={CHART_CONFIG}
      onCellClick={handleCellClick}
    />
  );
}

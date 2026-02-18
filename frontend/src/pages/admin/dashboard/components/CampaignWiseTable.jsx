import React from "react";
import ExpandableTable from "./ExpandableTable";

const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";

const COLUMNS = [
  { key: "name", label: "Campaign / City", render: (r) => capitalize(r.name) },
  { key: "totalLeads", label: "Total Leads" },
  { key: "opBooked", label: "OP Booked" },
  { key: "opDone", label: "OP Done" },
  { key: "ipBooked", label: "IP Booked" },
  { key: "ipDone", label: "IP Done" },
  { key: "diagnosticBooked", label: "Diag. Booked" },
  { key: "diagnosticDone", label: "Diag. Done" },
];

export default function CampaignWiseTable({ data = [] }) {
  const rows = data.map((c) => ({
    name: c.campaignName,
    totalLeads: c.totalLeads,
    opBooked: c.opBooked,
    opDone: c.opDone,
    ipBooked: c.ipBooked,
    ipDone: c.ipDone,
    diagnosticBooked: c.diagnosticBooked,
    diagnosticDone: c.diagnosticDone,
    children: (c.cities || []).map((city) => ({
      name: capitalize(city.city),
      totalLeads: city.totalLeads,
      opBooked: city.opBooked,
      opDone: city.opDone,
      ipBooked: city.ipBooked,
      ipDone: city.ipDone,
      diagnosticBooked: city.diagnosticBooked,
      diagnosticDone: city.diagnosticDone,
    })),
  }));

  return (
    <ExpandableTable
      title="Campaign-Wise Leads"
      columns={COLUMNS}
      rows={rows}
      chartConfig={{
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
        filters: [{ key: "name", label: "Campaign" }],
      }}
    />
  );
}

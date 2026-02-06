import React from "react";
import ExpandableTable from "./ExpandableTable";

const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";

const COLUMNS = [
  { key: "name", label: "City / Campaign", render: (r) => capitalize(r.name) },
  { key: "totalLeads", label: "Total Leads" },
  { key: "opBooked", label: "OP Booked" },
  { key: "opDone", label: "OP Done" },
];

const CHART_CONFIG = {
  metrics: [
    { key: "totalLeads", label: "Total Leads", color: "#6366f1" },
    { key: "opBooked", label: "OP Booked", color: "#10b981" },
    { key: "opDone", label: "OP Done", color: "#8b5cf6" },
  ],
  defaultMetric: "totalLeads",
  nameKey: "name",
  filters: [{ key: "name", label: "City" }],
};

export default function CampWiseTable({ data = [] }) {
  const rows = data.map((c) => ({
    name: c.city,
    totalLeads: c.totalLeads,
    opBooked: c.opBooked,
    opDone: c.opDone,
    children: (c.campaigns || []).map((camp) => ({
      name: camp.campaignName || camp.campaignId,
      totalLeads: camp.totalLeads,
      opBooked: camp.opBooked,
      opDone: camp.opDone,
    })),
  }));

  return (
    <ExpandableTable
      title="Camp-Wise Leads"
      columns={COLUMNS}
      rows={rows}
      chartConfig={CHART_CONFIG}
    />
  );
}

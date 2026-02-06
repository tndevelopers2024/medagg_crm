import React from "react";
import ExpandableTable from "./ExpandableTable";

const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";

const COLUMNS = [
  { key: "name", label: "Campaign / City", render: (r) => capitalize(r.name) },
  { key: "totalLeads", label: "Total Leads" },
  { key: "opBooked", label: "OP Booked" },
  { key: "opDone", label: "OP Done" },
];

export default function CampaignWiseTable({ data = [] }) {
  const rows = data.map((c) => ({
    name: c.campaignName,
    totalLeads: c.totalLeads,
    opBooked: c.opBooked,
    opDone: c.opDone,
    children: (c.cities || []).map((city) => ({
      name: capitalize(city.city),
      totalLeads: city.totalLeads,
      opBooked: city.opBooked,
      opDone: city.opDone,
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
        ],
        defaultMetric: "totalLeads",
        nameKey: "name",
        filters: [{ key: "name", label: "Campaign" }],
      }}
    />
  );
}

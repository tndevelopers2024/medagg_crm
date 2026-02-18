import React from "react";
import ExpandableTable from "./ExpandableTable";

const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";

const COLUMNS = [
  { key: "name", label: "City / Doctor", render: (r) => capitalize(r.name) },
  { key: "totalLeads", label: "Total Leads" },
  { key: "opBooked", label: "OP Booked" },
  { key: "opDone", label: "OP Done" },
  { key: "ipBooked", label: "IP Booked" },
  { key: "ipDone", label: "IP Done" },
  { key: "diagnosticBooked", label: "Diag. Booked" },
  { key: "diagnosticDone", label: "Diag. Done" },
  { key: "surgerySuggested", label: "Surgery Suggested" },
  { key: "revenue", label: "Revenue", render: (r) => `₹${(r.revenue || 0).toLocaleString()}` },
];

export default function CityDoctorTable({ data = [] }) {
  const rows = data.map((city) => ({
    name: city.city,
    totalLeads: city.totalLeads,
    opBooked: city.opBooked,
    opDone: city.opDone,
    ipBooked: city.ipBooked,
    ipDone: city.ipDone,
    diagnosticBooked: city.diagnosticBooked,
    diagnosticDone: city.diagnosticDone,
    surgerySuggested: city.surgerySuggested,
    revenue: city.revenue,
    children: (city.doctors || []).map((d) => ({
      name: d.doctor === "unassigned" ? "Unassigned" : capitalize(d.doctor),
      totalLeads: d.totalLeads,
      opBooked: d.opBooked,
      opDone: d.opDone,
      ipBooked: d.ipBooked,
      ipDone: d.ipDone,
      diagnosticBooked: d.diagnosticBooked,
      diagnosticDone: d.diagnosticDone,
      surgerySuggested: d.surgerySuggested,
      revenue: d.revenue,
    })),
  }));

  return (
    <ExpandableTable
      title="City & Doctor Summary"
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
          { key: "surgerySuggested", label: "Surgery Suggested", color: "#f97316" },
          { key: "revenue", label: "Revenue", color: "#ec4899" },
        ],
        defaultMetric: "totalLeads",
        nameKey: "name",
        filters: [{ key: "name", label: "City" }],
      }}
    />
  );
}

import React, { useState, useMemo } from "react";
import { Card, Table, Tag, Space, Empty } from "antd";
import { FiHeadphones } from "react-icons/fi";
import SectionHeader from "./SectionHeader";
import ChartPanel from "./ChartPanel";
import { downloadFlatCSV } from "./csvExport";

const CSV_COLUMNS = [
  { key: "callerName", label: "BD Name" },
  { key: "callsMade", label: "Calls Made" },
  { key: "uniqueDials", label: "Unique Dials" },
  { key: "callDuration", label: "Call Duration" },
  { key: "lastCall", label: "Last Call", getValue: (r) => r.lastCall ? new Date(r.lastCall).toLocaleTimeString() : "—" },
  { key: "idleHour", label: "Idle Hour" },
  { key: "dropouts", label: "Dropouts" },
  { key: "bookedLeads", label: "Booked Leads" },
];

const TABLE_COLUMNS = [
  {
    key: "callerName",
    title: "BD Name",
    dataIndex: "callerName",
    render: (name) => (
      <Space>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-pink-100">
          <FiHeadphones className="text-sm text-pink-600" />
        </span>
        <span className="font-medium text-pink-600">{name}</span>
      </Space>
    ),
  },
  { key: "callsMade", title: "Calls Made", dataIndex: "callsMade" },
  { key: "uniqueDials", title: "Unique Dials", dataIndex: "uniqueDials" },
  { key: "callDuration", title: "Call Duration", dataIndex: "callDuration" },
  {
    key: "lastCall",
    title: "Last Call",
    dataIndex: "lastCall",
    render: (val) => (val ? new Date(val).toLocaleTimeString() : "—"),
  },
  { key: "idleHour", title: "Idle Hour", dataIndex: "idleHour" },
  {
    key: "dropouts",
    title: "Dropouts",
    dataIndex: "dropouts",
    render: (val) => <Tag color="red">{val}</Tag>,
  },
  {
    key: "bookedLeads",
    title: "Booked Leads",
    dataIndex: "bookedLeads",
    render: (val) => <Tag color="green">{val}</Tag>,
  },
];

export default function BdActivityTracker({ data = [] }) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterValue, setFilterValue] = useState("");
  const [chartOpen, setChartOpen] = useState(false);
  const filtered = useMemo(() => {
    if (!filterValue.trim()) return data;
    const q = filterValue.toLowerCase();
    return data.filter((bd) => (bd.callerName || "").toLowerCase().includes(q));
  }, [data, filterValue]);

  const handleDownload = () => downloadFlatCSV("BD_Activity_Tracker", CSV_COLUMNS, data);

  return (
    <Card>
      <SectionHeader
        title="BD-Wise Activity Tracker"
        filterOpen={filterOpen}
        onFilterToggle={() => setFilterOpen((v) => !v)}
        filterValue={filterValue}
        onFilterChange={setFilterValue}
        onDownload={handleDownload}
        chartOpen={chartOpen}
        onChartToggle={() => setChartOpen((v) => !v)}
      />

      {chartOpen && (
        <ChartPanel
          data={data}
          metrics={[
            { key: "callsMade", label: "Calls Made", color: "#6366f1" },
            { key: "uniqueDials", label: "Unique Dials", color: "#10b981" },
            { key: "dropouts", label: "Dropouts", color: "#ef4444" },
            { key: "bookedLeads", label: "Booked Leads", color: "#f59e0b" },
          ]}
          defaultMetric="callsMade"
          nameKey="callerName"
          filters={[{ key: "callerName", label: "BD Name" }]}
        />
      )}

      <Table
        columns={TABLE_COLUMNS}
        dataSource={filtered}
        rowKey="callerId"
        pagination={false}
        scroll={{ x: "max-content", y: 550 }}
        size="middle"
        locale={{ emptyText: <Empty description={data.length ? "No matching rows" : "No call activity data"} /> }}
      />
    </Card>
  );
}

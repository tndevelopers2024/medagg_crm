import React, { useState, useMemo } from "react";
import { Card, Table, Tag, Space, Empty } from "antd";
import { FiHeadphones } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import SectionHeader from "./SectionHeader";
import ChartPanel from "./ChartPanel";
import { downloadFlatCSV } from "./csvExport";
import { buildDashboardCellUrl } from "../../../../utils/leadsNavigation";

// TABLE_COLUMNS is built inside component to access navigate/handlers — defined below.

const CSV_COLUMNS = [
  { key: "callerName", label: "BD Name" },
  { key: "target", label: "Target" },
  { key: "totalLeads", label: "Total Leads" },
  { key: "opBooked", label: "OP Booked" },
  { key: "opCancelled", label: "OP Cancelled" },
  { key: "ipBooked", label: "IP Booked" },
  { key: "ipDone", label: "IP Done" },
  { key: "diagnosticBooked", label: "Diag. Booked" },
  { key: "diagnosticDone", label: "Diag. Done" },
];

export default function BdPerformanceSummary({ data = [], datePreset = "today", customRange = {} }) {
  const navigate = useNavigate();
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterValue, setFilterValue] = useState("");
  const [chartOpen, setChartOpen] = useState(false);
  const filtered = useMemo(() => {
    if (!filterValue.trim()) return data;
    const q = filterValue.toLowerCase();
    return data.filter((bd) => (bd.callerName || "").toLowerCase().includes(q));
  }, [data, filterValue]);

  const handleDownload = () => downloadFlatCSV("BD_Performance_Summary", CSV_COLUMNS, data);

  const mkCell = (colKey) => (val, record) => {
    const entityFilter = { callerFilter: [String(record.callerId)] };
    return (
      <span
        className="cursor-pointer hover:text-[#322554] hover:underline transition-colors"
        onClick={() => navigate(buildDashboardCellUrl(entityFilter, colKey, datePreset, customRange))}
      >
        {val ?? 0}
      </span>
    );
  };

  const TABLE_COLUMNS = [
    {
      key: "callerName",
      title: "BD Name",
      dataIndex: "callerName",
      render: (name, record) => (
        <Space
          className="cursor-pointer"
          onClick={() => navigate(buildDashboardCellUrl({ callerFilter: [String(record.callerId)] }, "totalLeads", datePreset, customRange))}
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-pink-100">
            <FiHeadphones className="text-sm text-pink-600" />
          </span>
          <span className="font-medium text-pink-600 hover:underline">{name}</span>
        </Space>
      ),
    },
    { key: "target", title: "Target", dataIndex: "target" },
    { key: "totalLeads", title: "Total Leads", dataIndex: "totalLeads", render: mkCell("totalLeads") },
    { key: "opBooked", title: "OP Booked", dataIndex: "opBooked", render: mkCell("opBooked") },
    {
      key: "opCancelled",
      title: "OP Cancelled",
      dataIndex: "opCancelled",
      render: (val, record) => (
        <Tag
          color="red"
          className="cursor-pointer"
          onClick={() => navigate(buildDashboardCellUrl({ callerFilter: [String(record.callerId)], opdStatus: "Cancelled" }, "totalLeads", datePreset, customRange))}
        >
          {val}
        </Tag>
      ),
    },
    { key: "ipBooked", title: "IP Booked", dataIndex: "ipBooked", render: mkCell("ipBooked") },
    { key: "ipDone", title: "IP Done", dataIndex: "ipDone", render: (val, record) => <Tag color="green" className="cursor-pointer" onClick={() => navigate(buildDashboardCellUrl({ callerFilter: [String(record.callerId)] }, "ipDone", datePreset, customRange))}>{val}</Tag> },
    { key: "diagnosticBooked", title: "Diag. Booked", dataIndex: "diagnosticBooked", render: mkCell("diagnosticBooked") },
    { key: "diagnosticDone", title: "Diag. Done", dataIndex: "diagnosticDone", render: (val, record) => <Tag color="cyan" className="cursor-pointer" onClick={() => navigate(buildDashboardCellUrl({ callerFilter: [String(record.callerId)] }, "diagnosticDone", datePreset, customRange))}>{val}</Tag> },
  ];

  return (
    <Card>
      <SectionHeader
        title="BD Performance Summary"
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
            { key: "totalLeads", label: "Total Leads", color: "#6366f1" },
            { key: "opBooked", label: "OP Booked", color: "#10b981" },
            { key: "opCancelled", label: "OP Cancelled", color: "#ef4444" },
            { key: "ipBooked", label: "IP Booked", color: "#f59e0b" },
            { key: "ipDone", label: "IP Done", color: "#8b5cf6" },
            { key: "diagnosticBooked", label: "Diag. Booked", color: "#3b82f6" },
            { key: "diagnosticDone", label: "Diag. Done", color: "#06b6d4" },
          ]}
          defaultMetric="totalLeads"
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
        locale={{ emptyText: <Empty description={data.length ? "No matching rows" : "No performance data"} /> }}
      />
    </Card>
  );
}

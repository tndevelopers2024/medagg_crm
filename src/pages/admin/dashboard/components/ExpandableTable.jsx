import React, { useState, useMemo } from "react";
import { Card, Table, Empty } from "antd";
import SectionHeader from "./SectionHeader";
import ChartPanel from "./ChartPanel";
import { downloadTableCSV } from "./csvExport";

export default function ExpandableTable({ title, columns, rows = [], chartConfig }) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterValue, setFilterValue] = useState("");
  const [chartOpen, setChartOpen] = useState(false);

  // Filter rows by first column (name) - case-insensitive
  const filteredRows = useMemo(() => {
    if (!filterValue.trim()) return rows;
    const q = filterValue.toLowerCase();

    // Helper to check if a row matches
    const matches = (r) => {
      const nameCol = columns[0];
      const val = nameCol?.render ? nameCol.render(r) : r[nameCol?.key];
      return String(val || "").toLowerCase().includes(q);
    };

    return rows.filter((row) => {
      const parentMatch = matches(row);
      const childMatch = (row.children || []).some(matches);
      return parentMatch || childMatch;
    });
  }, [rows, filterValue, columns]);

  const handleDownload = () => downloadTableCSV(title, columns, rows);

  // Convert columns from { key, label, render } to Ant Table format
  const antColumns = useMemo(() => {
    return columns.map((col) => ({
      key: col.key,
      title: col.label,
      dataIndex: col.key,
      render: col.render ? (_, record) => col.render(record) : undefined,
    }));
  }, [columns]);

  // Add unique keys recursively for tree data
  const dataSource = useMemo(() => {
    const processData = (items, prefix) => {
      return items.map((item, index) => {
        const key = `${prefix}-${index}`;
        const newItem = { ...item, key };
        if (newItem.children) {
          newItem.children = processData(newItem.children, key);
        }
        return newItem;
      });
    };
    return processData(filteredRows, 'row');
  }, [filteredRows]);

  return (
    <Card>
      <SectionHeader
        title={title}
        filterOpen={filterOpen}
        onFilterToggle={() => setFilterOpen((v) => !v)}
        filterValue={filterValue}
        onFilterChange={setFilterValue}
        onDownload={handleDownload}
        {...(chartConfig && { chartOpen, onChartToggle: () => setChartOpen((v) => !v) })}
      />

      {chartConfig && chartOpen && <ChartPanel data={rows} {...chartConfig} />}

      <Table
        columns={antColumns}
        dataSource={dataSource}
        rowKey="key"
        pagination={false}
        scroll={{ x: "max-content", y: 550 }}
        size="middle"
        locale={{ emptyText: <Empty description="No data available" /> }}
      />
    </Card>
  );
}

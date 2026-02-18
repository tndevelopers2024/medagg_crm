import React, { useState, useMemo } from "react";
import { Card, Table, Empty, Button } from "antd";
import { DownOutlined } from "@ant-design/icons";
import SectionHeader from "./SectionHeader";
import ChartPanel from "./ChartPanel";
import { downloadTableCSV } from "./csvExport";

const INITIAL_ITEMS = 10;
const LOAD_MORE_INCREMENT = 10;

export default function ExpandableTable({ title, columns, rows = [], chartConfig }) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterValue, setFilterValue] = useState("");
  const [chartOpen, setChartOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_ITEMS);

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

  // Reset visible count when filter changes
  useMemo(() => {
    setVisibleCount(INITIAL_ITEMS);
  }, [filterValue]);

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

  // Add unique keys recursively for tree data and limit visible items
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
    const processed = processData(filteredRows, 'row');
    return processed.slice(0, visibleCount);
  }, [filteredRows, visibleCount]);

  const hasMore = filteredRows.length > visibleCount;
  const remainingCount = filteredRows.length - visibleCount;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + LOAD_MORE_INCREMENT);
  };

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

      <div className="overflow-x-auto">
        <Table
          columns={antColumns}
          dataSource={dataSource}
          rowKey="key"
          pagination={false}
          scroll={{ x: "max-content", y: 550 }}
          size="middle"
          locale={{ emptyText: <Empty description="No data available" /> }}
        />
      </div>

      {hasMore && (
        <div className="flex justify-center mt-4 pb-2">
          <Button
            type="default"
            icon={<DownOutlined />}
            onClick={handleLoadMore}
            size="large"
            className="px-8"
          >
            Load More ({remainingCount} remaining)
          </Button>
        </div>
      )}
    </Card>
  );
}

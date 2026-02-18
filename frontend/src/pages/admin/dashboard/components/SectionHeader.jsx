import React from "react";
import { Button, Input, Space } from "antd";
import { FiBarChart2, FiDownload, FiFilter } from "react-icons/fi";

export default function SectionHeader({
  title,
  children,
  filterOpen,
  onFilterToggle,
  filterValue,
  onFilterChange,
  onDownload,
  chartOpen,
  onChartToggle,
}) {
  return (
    <div className="mb-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <Space size="small">
          {children}
          <Button
            type={filterOpen ? "primary" : "text"}
            ghost={filterOpen}
            icon={<FiFilter />}
            size="small"
            onClick={onFilterToggle}
            title="Filter"
          />
          {onChartToggle && (
            <Button
              type={chartOpen ? "primary" : "text"}
              ghost={chartOpen}
              icon={<FiBarChart2 />}
              size="small"
              onClick={onChartToggle}
              title="Analytics"
            />
          )}
          <Button
            type="text"
            icon={<FiDownload />}
            size="small"
            onClick={onDownload}
            title="Download CSV"
          />
        </Space>
      </div>

      {filterOpen && (
        <Input.Search
          value={filterValue}
          onChange={(e) => onFilterChange(e.target.value)}
          onSearch={onFilterChange}
          placeholder="Search rows..."
          allowClear
          autoFocus
        />
      )}
    </div>
  );
}

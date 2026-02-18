import React, { useMemo } from "react";
import { Table, Empty, Spin } from "antd";

export default function LeadsTable({
  loading,
  filtered,
  currentRows,
  activeColumns,
  columnCtx,
  selected,
  highlight,
  navigate,
}) {
  const antColumns = useMemo(() => {
    return activeColumns.map((col) => ({
      key: col.id,
      title: col.headerRender ? col.headerRender(columnCtx) : col.label,
      dataIndex: col.id,
      className: col.tdClassName || "px-4 py-3",
      onHeaderCell: () => ({ className: col.thClassName || "px-4 py-3 font-medium" }),
      render: (_, lead) => col.render(lead, columnCtx),
    }));
  }, [activeColumns, columnCtx]);

  return (
    <Table
      columns={antColumns}
      dataSource={currentRows}
      rowKey="id"
      loading={{ spinning: loading, indicator: <Spin /> }}
      pagination={false}
      scroll={{ x: "max-content" }}
      size="middle"
      locale={{ emptyText: <Empty description="No leads found matching your criteria." /> }}
      onRow={(lead) => ({
        onClick: () => navigate(`/leads/${lead.id}`),
        className: `cursor-pointer ${selected.has(lead.id) ? "bg-indigo-50/60" : ""} ${highlight.has(String(lead.id)) ? "animate-rowFlash" : ""}`,
      })}
    />
  );
}

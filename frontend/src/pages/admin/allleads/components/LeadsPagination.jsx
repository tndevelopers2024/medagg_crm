import React from "react";
import { Pagination, Select } from "antd";

export default function LeadsPagination({ page, setPage, totalPages, pageSize, setPageSize, filteredCount, className = "border-t border-gray-100 bg-white px-4 py-3 flex items-center justify-between" }) {
  return (
    <div className={className}>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">
          Showing{" "}
          <span className="font-medium text-gray-900">{(page - 1) * pageSize + 1}</span>
          {" "}to{" "}
          <span className="font-medium text-gray-900">{Math.min(page * pageSize, filteredCount)}</span>
          {" "}of{" "}
          <span className="font-medium text-gray-900">{filteredCount}</span> leads
        </span>
        <Select
          value={pageSize}
          onChange={(val) => { setPageSize(val); setPage(1); }}
          size="small"
          options={[
            { label: "10 / page", value: 10 },
            { label: "20 / page", value: 20 },
            { label: "50 / page", value: 50 },
            { label: "100 / page", value: 100 },
          ]}
          style={{ width: 110 }}
        />
      </div>

      <Pagination
        current={page}
        total={filteredCount}
        pageSize={pageSize}
        onChange={(p) => setPage(p)}
        showSizeChanger={false}
        size="small"
      />
    </div>
  );
}

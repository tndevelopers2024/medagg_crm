import React from "react";
import { Pagination } from "antd";

export default function LeadPagination({ currentPage, totalPages, onPageChange, totalItems, pageSize }) {
    return (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-gray-500">
                Showing{" "}
                <span className="font-medium text-gray-700">{(currentPage - 1) * pageSize + 1}</span>
                {" "}to{" "}
                <span className="font-medium text-gray-700">{Math.min(currentPage * pageSize, totalItems)}</span>
                {" "}of{" "}
                <span className="font-medium text-gray-700">{totalItems}</span> leads
            </span>

            <Pagination
                current={currentPage}
                total={totalItems}
                pageSize={pageSize}
                onChange={onPageChange}
                showSizeChanger={false}
                size="small"
            />
        </div>
    );
}

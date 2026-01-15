import React from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

export default function LeadPagination({ currentPage, totalPages, onPageChange, totalItems, pageSize }) {
    const getPageNumbers = () => {
        const delta = 2; // Number of pages to show on each side of current
        const range = [];
        const rangeWithDots = [];

        // Always show first, last, and range around current
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
                range.push(i);
            }
        }

        let l;
        for (let i of range) {
            if (l) {
                if (i - l === 2) {
                    rangeWithDots.push(l + 1);
                } else if (i - l !== 1) {
                    rangeWithDots.push('...');
                }
            }
            rangeWithDots.push(i);
            l = i;
        }

        return rangeWithDots;
    };

    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalItems);

    return (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 flex items-center justify-between">
            <div className="text-xs text-gray-500">
                Showing <span className="font-medium text-gray-700">{start}</span> to <span className="font-medium text-gray-700">{end}</span> of <span className="font-medium text-gray-700">{totalItems}</span> leads
            </div>

            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                    <FiChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1">
                    {getPageNumbers().map((pageNum, idx) => (
                        <button
                            key={idx}
                            onClick={() => typeof pageNum === 'number' && onPageChange(pageNum)}
                            disabled={typeof pageNum !== 'number'}
                            className={`min-w-[28px] h-7 px-1 flex items-center justify-center rounded-lg text-xs font-medium transition-all ${pageNum === currentPage
                                    ? 'bg-white shadow-sm text-indigo-600 border border-gray-200'
                                    : typeof pageNum === 'number'
                                        ? 'text-gray-500 hover:bg-white hover:text-gray-900'
                                        : 'text-gray-400 cursor-default'
                                }`}
                        >
                            {pageNum}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                    <FiChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

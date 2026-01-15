import React, { useState, useEffect, useRef } from "react";
import { FiChevronDown, FiSearch } from "react-icons/fi";

function Menu({ open, children }) {
    if (!open) return null;
    return (
        <div className="absolute z-30 mt-2 w-64 rounded-xl border border-gray-200 bg-white shadow-lg">
            <div className="py-1">{children}</div>
        </div>
    );
}

function FilterDropdown({ label, valueLabel, children }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        const onClick = (e) => {
            if (!ref.current) return;
            if (!ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, []);
    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen((s) => !s)}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
            >
                {label && <span className="text-gray-500">{label}</span>}
                <span className="font-medium">{valueLabel}</span>
                <FiChevronDown className="opacity-60" />
            </button>
            <Menu open={open}>
                {typeof children === "function" ? children(() => setOpen(false)) : children}
            </Menu>
        </div>
    );
}

const LeadFilters = ({
    dateMode, setDateMode,
    customFrom, setCustomFrom,
    customTo, setCustomTo,
    source, setSource, sourceOptions,
    caller, setCaller, callerOptions,
    status, setStatus, statusOptions,
    opd, setOpd, opdOptions,
    ipd, setIpd, ipdOptions,
    diag, setDiag, diagOptions,
    search, setSearch
}) => {
    return (
        <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide">
            {/* Date Filter */}
            <FilterDropdown label="" valueLabel={dateMode === "7d" ? "Last 7 Days" : dateMode}>
                {(close) => (
                    <>
                        {["Today", "Yesterday", "7d", "30d", "Custom"].map((m) => (
                            <button
                                key={m}
                                onClick={() => {
                                    setDateMode(m);
                                    if (m !== "Custom") close();
                                }}
                                className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${dateMode === m ? "bg-gray-50 font-medium text-emerald-600" : ""
                                    }`}
                            >
                                {m === "7d" ? "Last 7 Days" : m === "30d" ? "Last 30 Days" : m}
                            </button>
                        ))}
                        {dateMode === "Custom" && (
                            <div className="p-3 border-t">
                                <input
                                    type="date"
                                    className="w-full text-xs border rounded mb-2"
                                    value={customFrom}
                                    onChange={(e) => setCustomFrom(e.target.value)}
                                />
                                <input
                                    type="date"
                                    className="w-full text-xs border rounded"
                                    value={customTo}
                                    onChange={(e) => setCustomTo(e.target.value)}
                                />
                            </div>
                        )}
                    </>
                )}
            </FilterDropdown>

            {/* Source */}
            <FilterDropdown label="" valueLabel={source}>
                {(close) =>
                    sourceOptions.map((s) => (
                        <button
                            key={s}
                            onClick={() => {
                                setSource(s);
                                close();
                            }}
                            className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${source === s ? "bg-gray-50 font-medium text-emerald-600" : ""
                                }`}
                        >
                            {s}
                        </button>
                    ))
                }
            </FilterDropdown>

            {/* Callers */}
            <FilterDropdown label="" valueLabel={caller.name || caller}>
                {(close) =>
                    callerOptions.map((c) => (
                        <button
                            key={c.id}
                            onClick={() => {
                                setCaller(c.id);
                                close();
                            }}
                            className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${caller === c.id ? "bg-gray-50 font-medium text-emerald-600" : ""
                                }`}
                        >
                            {c.name}
                        </button>
                    ))
                }
            </FilterDropdown>

            {/* Statuses */}
            <FilterDropdown label="" valueLabel={status}>
                {(close) =>
                    statusOptions.map((s) => (
                        <button
                            key={s}
                            onClick={() => {
                                setStatus(s);
                                close();
                            }}
                            className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${status === s ? "bg-gray-50 font-medium text-emerald-600" : ""
                                }`}
                        >
                            {s.replace(/_/g, ' ')}
                        </button>
                    ))
                }
            </FilterDropdown>

            {/* OPD */}
            <FilterDropdown label="" valueLabel={opd}>
                {(close) =>
                    opdOptions.map((s) => (
                        <button
                            key={s}
                            onClick={() => {
                                setOpd(s);
                                close();
                            }}
                            className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${opd === s ? "bg-gray-50 font-medium text-emerald-600" : ""
                                }`}
                        >
                            {s}
                        </button>
                    ))
                }
            </FilterDropdown>

            {/* IPD */}
            <FilterDropdown label="" valueLabel={ipd}>
                {(close) =>
                    ipdOptions.map((s) => (
                        <button
                            key={s}
                            onClick={() => {
                                setIpd(s);
                                close();
                            }}
                            className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${ipd === s ? "bg-gray-50 font-medium text-emerald-600" : ""
                                }`}
                        >
                            {s}
                        </button>
                    ))
                }
            </FilterDropdown>

            {/* Diagnostics */}
            <FilterDropdown label="" valueLabel={diag}>
                {(close) =>
                    diagOptions.map((s) => (
                        <button
                            key={s}
                            onClick={() => {
                                setDiag(s);
                                close();
                            }}
                            className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${diag === s ? "bg-gray-50 font-medium text-emerald-600" : ""
                                }`}
                        >
                            {s}
                        </button>
                    ))
                }
            </FilterDropdown>

            <div className="flex-1"></div>

            {/* Search */}
            <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search leads..."
                    className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
        </div>
    );
};

export default LeadFilters;

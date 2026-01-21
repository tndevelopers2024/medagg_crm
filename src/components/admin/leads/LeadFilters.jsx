import React, { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import { ChevronDownIcon, MagnifyingGlassIcon } from "@heroicons/react/20/solid";

function MenuFilter({ label, valueLabel, children }) {
    return (
        <Menu as="div" className="relative inline-block text-left">
            <div>
                <Menu.Button className="inline-flex w-full items-center justify-center gap-x-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50">
                    {label && <span className="text-gray-500 font-normal">{label}</span>}
                    <span className="font-medium text-gray-900">{valueLabel}</span>
                    <ChevronDownIcon className="-mr-1 h-5 w-5 text-gray-400" aria-hidden="true" />
                </Menu.Button>
            </div>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items className="absolute left-0 z-30 mt-2 w-56 origin-top-left rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                        {children}
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
}

// Wrapper for simple options to keep the main code clean
function MenuItem({ active, onClick, children }) {
    return (
        <button
            onClick={onClick}
            className={`${active ? 'bg-gray-50 text-emerald-600' : 'text-gray-900'
                } group flex w-full items-center px-4 py-2 text-sm text-left`}
        >
            {children}
        </button>
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
        <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide z-10">
            {/* Date Filter */}
            <MenuFilter label="" valueLabel={dateMode === "7d" ? "Last 7 Days" : dateMode}>
                {["Today", "Yesterday", "7d", "30d", "Custom"].map((m) => (
                    <Menu.Item key={m}>
                        {({ active }) => (
                            <MenuItem
                                active={active || dateMode === m}
                                onClick={() => setDateMode(m)}
                            >
                                {m === "7d" ? "Last 7 Days" : m === "30d" ? "Last 30 Days" : m}
                            </MenuItem>
                        )}
                    </Menu.Item>
                ))}
                {dateMode === "Custom" && (
                    <div className="p-3 border-t">
                        <input
                            type="date"
                            className="w-full text-xs border rounded mb-2 px-2 py-1"
                            value={customFrom}
                            onChange={(e) => setCustomFrom(e.target.value)}
                        />
                        <input
                            type="date"
                            className="w-full text-xs border rounded px-2 py-1"
                            value={customTo}
                            onChange={(e) => setCustomTo(e.target.value)}
                        />
                    </div>
                )}
            </MenuFilter>

            {/* Source */}
            <MenuFilter label="" valueLabel={source}>
                {sourceOptions.map((s) => (
                    <Menu.Item key={s}>
                        {({ active }) => (
                            <MenuItem
                                active={active || source === s}
                                onClick={() => setSource(s)}
                            >
                                {s}
                            </MenuItem>
                        )}
                    </Menu.Item>
                ))}
            </MenuFilter>

            {/* Callers - Only show if callerOptions provided */}
            {callerOptions && callerOptions.length > 0 && (
                <MenuFilter label="" valueLabel={caller.name || caller}>
                    {callerOptions.map((c) => (
                        <Menu.Item key={c.id}>
                            {({ active }) => (
                                <MenuItem
                                    active={active || caller === c.id}
                                    onClick={() => setCaller(c.id)}
                                >
                                    {c.name}
                                </MenuItem>
                            )}
                        </Menu.Item>
                    ))}
                </MenuFilter>
            )}

            {/* Statuses */}
            <MenuFilter label="" valueLabel={status}>
                {statusOptions.map((s) => (
                    <Menu.Item key={s}>
                        {({ active }) => (
                            <MenuItem
                                active={active || status === s}
                                onClick={() => setStatus(s)}
                            >
                                {s.replace(/_/g, ' ')}
                            </MenuItem>
                        )}
                    </Menu.Item>
                ))}
            </MenuFilter>

            {/* OPD */}
            <MenuFilter label="" valueLabel={opd}>
                {opdOptions.map((s) => (
                    <Menu.Item key={s}>
                        {({ active }) => (
                            <MenuItem
                                active={active || opd === s}
                                onClick={() => setOpd(s)}
                            >
                                {s}
                            </MenuItem>
                        )}
                    </Menu.Item>
                ))}
            </MenuFilter>

            {/* IPD */}
            <MenuFilter label="" valueLabel={ipd}>
                {ipdOptions.map((s) => (
                    <Menu.Item key={s}>
                        {({ active }) => (
                            <MenuItem
                                active={active || ipd === s}
                                onClick={() => setIpd(s)}
                            >
                                {s}
                            </MenuItem>
                        )}
                    </Menu.Item>
                ))}
            </MenuFilter>

            {/* Diagnostics */}
            <MenuFilter label="" valueLabel={diag}>
                {diagOptions.map((s) => (
                    <Menu.Item key={s}>
                        {({ active }) => (
                            <MenuItem
                                active={active || diag === s}
                                onClick={() => setDiag(s)}
                            >
                                {s}
                            </MenuItem>
                        )}
                    </Menu.Item>
                ))}
            </MenuFilter>

            <div className="flex-1"></div>

            {/* Search */}
            <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
                <input
                    type="text"
                    placeholder="Search leads..."
                    className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
        </div>
    );
};

export default LeadFilters;

import React, { Fragment, useState, useEffect, useMemo } from "react";
import { Menu, Transition, Popover } from "@headlessui/react";
import {
    ChevronDownIcon,
    XMarkIcon,
    PlusIcon,
    FunnelIcon,
    CalendarIcon,
    UserIcon,
    TagIcon,
    BeakerIcon,
    BuildingOffice2Icon,
    SquaresPlusIcon,
    ClockIcon
} from "@heroicons/react/20/solid";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

// Configuration for standard available filters
const STANDARD_CONFIG = {
    date: { id: 'date', label: 'Created On', icon: CalendarIcon, defaultValue: '7d' },
    status: { id: 'status', label: 'Lead Status', icon: FunnelIcon, defaultValue: 'Lead Status' },
    source: { id: 'source', label: 'Source', icon: TagIcon, defaultValue: 'All Sources' },
    caller: { id: 'caller', label: 'Assignee', icon: UserIcon, defaultValue: 'All Callers' },
    followup: { id: 'followup', label: 'Call Later', icon: ClockIcon, defaultValue: 'All' },
    opd: { id: 'opd', label: 'OPD Status', icon: BuildingOffice2Icon, defaultValue: 'OPD Status' },
    ipd: { id: 'ipd', label: 'IPD Status', icon: BuildingOffice2Icon, defaultValue: 'IPD Status' },
    diag: { id: 'diag', label: 'Diagnostics', icon: BeakerIcon, defaultValue: 'Diagnostics' },
};

function ConditionPill({ label, operator, onOperatorChange, onRemove, children }) {
    return (
        <div className="group flex items-center bg-violet-50 rounded-lg border border-violet-100 p-1 pr-2 transition-all hover:border-violet-200 hover:shadow-sm">
            <div className="flex items-center gap-1 px-2 border-r border-violet-200/50 mr-2">
                <span className="text-xs font-semibold text-violet-700 uppercase tracking-wide mr-1">{label}</span>

                {/* Operator Dropdown */}
                <Menu as="div" className="relative">
                    <Menu.Button className="text-xs text-violet-400 font-medium hover:text-violet-600 flex items-center gap-0.5 outline-none rounded px-1 transition-colors">
                        {operator.toUpperCase().replace('_', ' ')}
                        <ChevronDownIcon className="w-3 h-3" />
                    </Menu.Button>
                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                    >
                        <Menu.Items className="absolute left-0 z-[60] mt-1 w-24 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                            <div className="p-1">
                                {['is', 'is_not'].map((op) => (
                                    <Menu.Item key={op}>
                                        {({ active }) => (
                                            <button
                                                onClick={() => onOperatorChange(op)}
                                                className={`${active ? 'bg-violet-50 text-violet-700' : 'text-gray-700'} group flex w-full items-center px-2 py-1.5 text-xs rounded-md`}
                                            >
                                                {op.replace('_', ' ').toUpperCase()}
                                            </button>
                                        )}
                                    </Menu.Item>
                                ))}
                            </div>
                        </Menu.Items>
                    </Transition>
                </Menu>
            </div>

            <div className="relative">
                {children}
            </div>

            <button
                onClick={onRemove}
                className="ml-2 p-0.5 rounded-full text-violet-300 hover:bg-violet-100 hover:text-violet-600 transition-colors"
            >
                <XMarkIcon className="w-4 h-4" />
            </button>
        </div>
    );
}

function MenuContent({ options, value, onChange, getValueLabel }) {
    return (
        <Menu as="div" className="relative inline-block text-left">
            <Menu.Button className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-violet-700 transition-colors outline-none">
                <span className="truncate max-w-[150px]">{getValueLabel ? getValueLabel(value) : value}</span>
                <ChevronDownIcon className="h-4 w-4 text-gray-400" />
            </Menu.Button>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items className="absolute left-0 z-50 mt-2 w-56 origin-top-left rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none max-h-80 overflow-y-auto">
                    <div className="p-1">
                        {options.map((opt) => (
                            <Menu.Item key={opt.value || opt}>
                                {({ active }) => (
                                    <button
                                        onClick={() => onChange(opt.value || opt)}
                                        className={`${active ? 'bg-violet-50 text-violet-700' : 'text-gray-700'} group flex w-full items-center px-3 py-2 text-sm rounded-lg transition-colors`}
                                    >
                                        {opt.label || opt}
                                    </button>
                                )}
                            </Menu.Item>
                        ))}
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
}

const LeadFilters = ({
    dateMode, setDateMode,
    customFrom, setCustomFrom,
    customTo, setCustomTo,
    source, setSource, sourceOptions,
    caller, setCaller, callerOptions,
    status, setStatus, statusOptions,
    followup, setFollowup, followupOptions,
    opd, setOpd, opdOptions,
    ipd, setIpd, ipdOptions,
    diag, setDiag, diagOptions,
    search, setSearch,
    fieldConfigs = [] // New prop for custom fields
}) => {
    // 1. Unified Config: Merge Standard + Custom Fields
    const allFilters = useMemo(() => {
        const standard = Object.values(STANDARD_CONFIG);
        const dynamic = fieldConfigs.map(fc => ({
            id: fc._id,
            label: fc.displayLabel, // fieldLabel was incorrect
            icon: SquaresPlusIcon, // Generic icon for custom fields
            defaultValue: '', // Custom fields start empty
            isCustom: true,
            options: fc.options || [],
            type: fc.fieldType
        }));
        return [...standard, ...dynamic];
    }, [fieldConfigs]);

    // 2. State for visible filters (Set of IDs)
    const [visibleFilters, setVisibleFilters] = useState(new Set(['date']));

    // 3. State for operators ({ [filterId]: 'is' | 'is_not' })
    const [operators, setOperators] = useState({});

    // 4. State for custom field values ({ [filterId]: value }) - Local for now until Page.jsx supports it
    const [customValues, setCustomValues] = useState({});

    // Sync external props to visible state
    useEffect(() => {
        const newVisible = new Set(visibleFilters);
        if (status !== STANDARD_CONFIG.status.defaultValue) newVisible.add('status');
        if (source !== STANDARD_CONFIG.source.defaultValue) newVisible.add('source');
        if (caller !== STANDARD_CONFIG.caller.defaultValue && caller?.id !== STANDARD_CONFIG.caller.defaultValue) newVisible.add('caller');
        if (followup !== STANDARD_CONFIG.followup.defaultValue) newVisible.add('followup');
        if (opd !== STANDARD_CONFIG.opd.defaultValue) newVisible.add('opd');
        if (ipd !== STANDARD_CONFIG.ipd.defaultValue) newVisible.add('ipd');
        if (diag !== STANDARD_CONFIG.diag.defaultValue) newVisible.add('diag');
        if (newVisible.size > visibleFilters.size) setVisibleFilters(newVisible);
    }, [status, source, caller, followup, opd, ipd, diag]);

    const addFilter = (filterKey) => {
        setVisibleFilters(prev => new Set([...prev, filterKey]));
        setOperators(prev => ({ ...prev, [filterKey]: 'is' })); // Default operator
    };

    const removeFilter = (filterKey) => {
        // Reset value if standard
        switch (filterKey) {
            case 'date': setDateMode(STANDARD_CONFIG.date.defaultValue); break;
            case 'status': setStatus(STANDARD_CONFIG.status.defaultValue); break;
            case 'source': setSource(STANDARD_CONFIG.source.defaultValue); break;
            case 'caller': setCaller(STANDARD_CONFIG.caller.defaultValue); break;
            case 'followup': setFollowup(STANDARD_CONFIG.followup.defaultValue); break;
            case 'opd': setOpd(STANDARD_CONFIG.opd.defaultValue); break;
            case 'ipd': setIpd(STANDARD_CONFIG.ipd.defaultValue); break;
            case 'diag': setDiag(STANDARD_CONFIG.diag.defaultValue); break;
            default:
                // Clear custom value
                setCustomValues(prev => {
                    const next = { ...prev };
                    delete next[filterKey];
                    return next;
                });
        }
        setVisibleFilters(prev => {
            const next = new Set(prev);
            next.delete(filterKey);
            return next;
        });
    };

    const updateOperator = (filterKey, op) => {
        setOperators(prev => ({ ...prev, [filterKey]: op }));
    };

    // Filter Menu Search
    const [filterMenuSearch, setFilterMenuSearch] = useState("");
    const availableFilters = allFilters
        .filter(f => !visibleFilters.has(f.id))
        .filter(f => (f.label || "").toLowerCase().includes(filterMenuSearch.toLowerCase()));

    return (
        <div className="flex flex-col gap-4 w-full">
            {/* Main Search Bar */}
            <div className="flex items-center gap-4 w-full">
                <div className="relative flex-1 max-w-md">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" aria-hidden="true" />
                    <input
                        type="text"
                        placeholder="Search leads by name, phone..."
                        className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all shadow-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Active Conditions Row */}
            <div className="flex flex-wrap items-center gap-3">
                {/* 1. Date Filter */}
                {visibleFilters.has('date') && (
                    <ConditionPill
                        label="Created On"
                        operator={operators['date'] || 'is'}
                        onOperatorChange={(op) => updateOperator('date', op)}
                        onRemove={() => removeFilter('date')}
                    >
                        <div className="flex items-center gap-2">
                            <MenuContent
                                value={dateMode}
                                onChange={setDateMode}
                                options={["Today", "Yesterday", "7d", "30d", "Custom"]}
                                getValueLabel={(v) => v === '7d' ? 'Last 7 Days' : v === '30d' ? 'Last 30 Days' : v}
                            />
                            {dateMode === "Custom" && (
                                <div className="flex items-center gap-1 bg-white rounded border border-gray-200 px-1">
                                    <input type="date" className="text-xs border-none p-1 focus:ring-0 text-gray-600 bg-transparent" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                                    <span className="text-gray-400">-</span>
                                    <input type="date" className="text-xs border-none p-1 focus:ring-0 text-gray-600 bg-transparent" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
                                </div>
                            )}
                        </div>
                    </ConditionPill>
                )}

                {/* 2. Standard Filters */}
                {visibleFilters.has('status') && (
                    <ConditionPill label="Lead Status" operator={operators['status'] || 'is'} onOperatorChange={(op) => updateOperator('status', op)} onRemove={() => removeFilter('status')}>
                        <MenuContent value={status} onChange={setStatus} options={statusOptions} getValueLabel={(v) => v.replace(/_/g, ' ')} />
                    </ConditionPill>
                )}
                {visibleFilters.has('source') && (
                    <ConditionPill label="Source" operator={operators['source'] || 'is'} onOperatorChange={(op) => updateOperator('source', op)} onRemove={() => removeFilter('source')}>
                        <MenuContent value={source} onChange={setSource} options={sourceOptions} />
                    </ConditionPill>
                )}
                {visibleFilters.has('caller') && callerOptions && (
                    <ConditionPill label="Assignee" operator={operators['caller'] || 'is'} onOperatorChange={(op) => updateOperator('caller', op)} onRemove={() => removeFilter('caller')}>
                        <MenuContent value={caller} onChange={(val) => setCaller(val.id || val)} options={callerOptions.map(c => ({ label: c.name, value: c.id }))} getValueLabel={(v) => callerOptions.find(c => c.id === v)?.name || v} />
                    </ConditionPill>
                )}
                {visibleFilters.has('followup') && (
                    <ConditionPill label="Call Later" operator={operators['followup'] || 'is'} onOperatorChange={(op) => updateOperator('followup', op)} onRemove={() => removeFilter('followup')}>
                        <MenuContent value={followup} onChange={setFollowup} options={followupOptions} />
                    </ConditionPill>
                )}
                {visibleFilters.has('opd') && (
                    <ConditionPill label="OPD Status" operator={operators['opd'] || 'is'} onOperatorChange={(op) => updateOperator('opd', op)} onRemove={() => removeFilter('opd')}>
                        <MenuContent value={opd} onChange={setOpd} options={opdOptions} />
                    </ConditionPill>
                )}
                {visibleFilters.has('ipd') && (
                    <ConditionPill label="IPD Status" operator={operators['ipd'] || 'is'} onOperatorChange={(op) => updateOperator('ipd', op)} onRemove={() => removeFilter('ipd')}>
                        <MenuContent value={ipd} onChange={setIpd} options={ipdOptions} />
                    </ConditionPill>
                )}
                {visibleFilters.has('diag') && (
                    <ConditionPill label="Diagnostics" operator={operators['diag'] || 'is'} onOperatorChange={(op) => updateOperator('diag', op)} onRemove={() => removeFilter('diag')}>
                        <MenuContent value={diag} onChange={setDiag} options={diagOptions} />
                    </ConditionPill>
                )}

                {/* 3. Custom Filters - Renders generic pills for any added custom fields */}
                {Array.from(visibleFilters)
                    .filter(id => !STANDARD_CONFIG[id]) // Filter out standard keys
                    .map(id => {
                        const config = allFilters.find(f => f.id === id);
                        if (!config) return null;

                        return (
                            <ConditionPill
                                key={id}
                                label={config.label}
                                operator={operators[id] || 'is'}
                                onOperatorChange={(op) => updateOperator(id, op)}
                                onRemove={() => removeFilter(id)}
                            >
                                <MenuContent
                                    value={customValues[id] || 'Select...'}
                                    onChange={(val) => setCustomValues(prev => ({ ...prev, [id]: val }))}
                                    options={config.options || []}
                                />
                            </ConditionPill>
                        );
                    })
                }

                {/* + Add Condition Button */}
                <Menu as="div" className="relative">
                    <Menu.Button className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-violet-600 hover:bg-violet-50 transition-colors">
                        <PlusIcon className="w-4 h-4" />
                        <span>Add Condition</span>
                    </Menu.Button>
                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                    >
                        <Menu.Items className="absolute left-0 z-50 mt-2 w-64 origin-top-left rounded-xl bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden">
                            <div className="p-2 border-b border-gray-50 bg-gray-50/50">
                                <input
                                    type="text"
                                    placeholder="Search fields..."
                                    className="w-full text-xs bg-white border border-gray-200 rounded-md px-2 py-1.5 focus:border-violet-500 focus:outline-none"
                                    value={filterMenuSearch}
                                    onChange={(e) => setFilterMenuSearch(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="max-h-60 overflow-y-auto p-1">
                                {availableFilters.length === 0 ? (
                                    <div className="px-3 py-2 text-sm text-gray-400 italic text-center">No matching fields</div>
                                ) : (
                                    availableFilters.map((f) => (
                                        <Menu.Item key={f.id}>
                                            {({ active }) => (
                                                <button
                                                    onClick={() => { addFilter(f.id); setFilterMenuSearch(""); }}
                                                    className={`${active ? 'bg-violet-50 text-violet-700' : 'text-gray-700'
                                                        } flex w-full items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors`}
                                                >
                                                    <f.icon className={`w-4 h-4 ${active ? 'text-violet-500' : 'text-gray-400'}`} />
                                                    <span className="truncate">{f.label}</span>
                                                    {f.isCustom && <span className="ml-auto text-[10px] bg-gray-100 text-gray-500 px-1.5 rounded">Custom</span>}
                                                </button>
                                            )}
                                        </Menu.Item>
                                    ))
                                )}
                            </div>
                        </Menu.Items>
                    </Transition>
                </Menu>
            </div>
        </div>
    );
};

export default LeadFilters;

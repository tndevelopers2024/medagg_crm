import React, { useState, useEffect, useMemo } from "react";
import { Select, Input, Tag, Dropdown, Button, DatePicker, Space } from "antd";
import {
    CloseOutlined,
    PlusOutlined,
    SearchOutlined,
    BarChartOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const STANDARD_CONFIG = {
    date: { id: 'date', label: 'Created On', defaultValue: '7d' },
    campaign: { id: 'campaign', label: 'Campaign', defaultValue: [] },
    status: { id: 'status', label: 'Lead Status', defaultValue: [] },
    source: { id: 'source', label: 'Source', defaultValue: 'All Sources' },
    caller: { id: 'caller', label: 'Assignee', defaultValue: [] },
    followup: { id: 'followup', label: 'Call Later', defaultValue: 'All' },
    opd: { id: 'opd', label: 'OPD Status', defaultValue: 'OPD Status' },
    opdDate: { id: 'opdDate', label: 'OPD Date', defaultValue: '' },
    ipd: { id: 'ipd', label: 'IPD Status', defaultValue: 'IPD Status' },
    ipdDate: { id: 'ipdDate', label: 'IPD Date', defaultValue: '' },
    diag: { id: 'diag', label: 'Diagnostics', defaultValue: 'Diagnostics' },
};

// ON / AFTER / BEFORE / CUSTOM for booking dates
const BOOKING_DATE_OPERATOR_OPTIONS = [
    { label: "ON", value: "is" },
    { label: "AFTER", value: "after" },
    { label: "BEFORE", value: "before" },
    { label: "CUSTOM", value: "custom" },
];

const DATE_OPTIONS = [
    { label: "Today", value: "Today" },
    { label: "Yesterday", value: "Yesterday" },
    { label: "Last 7 Days", value: "7d" },
    { label: "Last 30 Days", value: "30d" },
    { label: "Custom", value: "Custom" },
];

const OPERATOR_OPTIONS = [
    { label: "IS", value: "is" },
    { label: "IS NOT", value: "is_not" },
    { label: "IS EMPTY", value: "is_empty" },
    { label: "INCLUDES", value: "is_include" },
];

// Caller and campaign are ID-based — text search not applicable
const OPERATOR_OPTIONS_NO_INCLUDE = [
    { label: "IS", value: "is" },
    { label: "IS NOT", value: "is_not" },
    { label: "IS EMPTY", value: "is_empty" },
];

const DATE_OPERATOR_OPTIONS = [
    { label: "IS", value: "is" },
    { label: "IS NOT", value: "is_not" },
    { label: "IS EMPTY", value: "is_empty" },
    { label: "AFTER", value: "after" },
    { label: "BEFORE", value: "before" },
];

function ConditionPill({ label, operator, onOperatorChange, onRemove, children, operatorOptions = OPERATOR_OPTIONS }) {
    return (
        <div className="group flex items-center bg-violet-50 rounded-lg border border-violet-100 p-1 pr-2 transition-all hover:border-violet-200 hover:shadow-sm">
            <div className="flex items-center gap-1 px-2 border-r border-violet-200/50 mr-2">
                <span className="text-xs font-semibold text-violet-700 uppercase tracking-wide mr-1">{label}</span>
                <Select
                    size="small"
                    variant="borderless"
                    value={operator}
                    onChange={onOperatorChange}
                    options={operatorOptions}
                    style={{ width: 105 }}
                    popupMatchSelectWidth={false}
                    className="text-xs"
                />
            </div>
            {operator !== 'is_empty' && <div className="relative">{children}</div>}
            <button
                onClick={onRemove}
                className="ml-2 p-0.5 rounded-full text-violet-300 hover:bg-violet-100 hover:text-violet-600 transition-colors"
            >
                <CloseOutlined style={{ fontSize: 12 }} />
            </button>
        </div>
    );
}

function ValueSelect({ value, onChange, options, getValueLabel, style }) {
    // Convert simple string array options to { label, value } format
    const antOptions = options.map((opt) => {
        if (typeof opt === "object" && opt.label !== undefined) return opt;
        return { label: String(opt), value: opt };
    });
    const displayValue = getValueLabel ? getValueLabel(value) : value;
    return (
        <Select
            size="small"
            variant="borderless"
            value={value}
            onChange={onChange}
            options={antOptions}
            popupMatchSelectWidth={false}
            style={{ minWidth: 100, ...style }}
            showSearch
            filterOption={(input, option) =>
                (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
        />
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
    followupFrom, setFollowupFrom, followupTo, setFollowupTo,
    opd, setOpd, opdOptions,
    ipd, setIpd, ipdOptions,
    diag, setDiag, diagOptions,
    campaign, setCampaign, campaignOptions,
    search, setSearch,
    fieldConfigs = [],
    customFieldFilters = {},
    onCustomFieldFilter,
    onRemoveCustomFieldFilter,
    chartDrillFilters = [],
    removeChartDrillFilter,
    updateChartDrillFilter,
    clearAllChartDrillFilters,
    analyticsFilterOptions = {},
    operators = {},
    onOperatorChange,
    filterIncludeTexts = {},
    onIncludeTextChange,
    opdDate, setOpdDate,
    opdDateTo, setOpdDateTo,
    ipdDate, setIpdDate,
    ipdDateTo, setIpdDateTo,
}) => {
    const allFilters = useMemo(() => {
        const standard = Object.values(STANDARD_CONFIG);
        const dynamic = fieldConfigs.map(fc => ({
            id: fc._id || fc.fieldName,
            fieldName: fc.fieldName,
            label: fc.displayLabel || fc.fieldName,
            defaultValue: '',
            isCustom: true,
            options: fc.options || [],
            type: fc.fieldType
        }));
        return [...standard, ...dynamic];
    }, [fieldConfigs]);

    const [visibleFilters, setVisibleFilters] = useState(new Set());

    useEffect(() => {
        const newVisible = new Set(visibleFilters);
        if (Array.isArray(status) && status.length > 0) newVisible.add('status');
        if (source !== STANDARD_CONFIG.source.defaultValue) newVisible.add('source');
        if (Array.isArray(caller) && caller.length > 0) newVisible.add('caller');
        if (followup !== STANDARD_CONFIG.followup.defaultValue) newVisible.add('followup');
        if (opd !== STANDARD_CONFIG.opd.defaultValue) newVisible.add('opd');
        if (ipd !== STANDARD_CONFIG.ipd.defaultValue) newVisible.add('ipd');
        if (diag !== STANDARD_CONFIG.diag.defaultValue) newVisible.add('diag');
        if (Array.isArray(campaign) && campaign.length > 0) newVisible.add('campaign');
        if (opdDate) newVisible.add('opdDate');
        if (ipdDate) newVisible.add('ipdDate');
        if (customFieldFilters) {
            for (const fieldName of Object.keys(customFieldFilters)) {
                const config = allFilters.find(f => f.fieldName === fieldName);
                if (config) newVisible.add(config.id);
            }
        }
        // Keep filters visible when IS EMPTY / AFTER / BEFORE / IS INCLUDE operator is active (no value to detect from)
        const standardKeyToId = { status: 'status', source: 'source', caller: 'caller', campaign: 'campaign', followup: 'followup', opd: 'opd', opdDate: 'opdDate', ipd: 'ipd', ipdDate: 'ipdDate', diag: 'diag', date: 'date' };
        if (operators) {
            for (const [key, op] of Object.entries(operators)) {
                if (op === 'is_empty' || op === 'after' || op === 'before' || op === 'is_include') {
                    const filterId = standardKeyToId[key];
                    if (filterId) newVisible.add(filterId);
                }
            }
        }
        if (newVisible.size > visibleFilters.size) setVisibleFilters(newVisible);
    }, [status, source, caller, followup, opd, opdDate, ipd, ipdDate, diag, campaign, customFieldFilters, operators, filterIncludeTexts]);

    const addFilter = (filterKey) => {
        setVisibleFilters(prev => new Set([...prev, filterKey]));
        if (onOperatorChange) onOperatorChange(filterKey, 'is');
    };

    const removeFilter = (filterKey) => {
        switch (filterKey) {
            case 'date':
                setDateMode('');
                setCustomFrom('');
                setCustomTo('');
                onOperatorChange?.('date', 'is');
                break;
            case 'status':
                setStatus([]);
                onOperatorChange?.('status', 'is');
                onIncludeTextChange?.('status', '');
                break;
            case 'source':
                setSource(STANDARD_CONFIG.source.defaultValue);
                onOperatorChange?.('source', 'is');
                onIncludeTextChange?.('source', '');
                break;
            case 'caller':
                setCaller([]);
                onOperatorChange?.('caller', 'is');
                break;
            case 'followup':
                setFollowup(STANDARD_CONFIG.followup.defaultValue);
                setFollowupFrom('');
                setFollowupTo('');
                onOperatorChange?.('followup', 'is');
                break;
            case 'opd':
                setOpd(STANDARD_CONFIG.opd.defaultValue);
                onOperatorChange?.('opd', 'is');
                onIncludeTextChange?.('opd', '');
                break;
            case 'opdDate':
                setOpdDate('');
                setOpdDateTo('');
                onOperatorChange?.('opdDate', 'is');
                break;
            case 'ipd':
                setIpd(STANDARD_CONFIG.ipd.defaultValue);
                onOperatorChange?.('ipd', 'is');
                onIncludeTextChange?.('ipd', '');
                break;
            case 'ipdDate':
                setIpdDate('');
                setIpdDateTo('');
                onOperatorChange?.('ipdDate', 'is');
                break;
            case 'diag':
                setDiag(STANDARD_CONFIG.diag.defaultValue);
                onOperatorChange?.('diag', 'is');
                onIncludeTextChange?.('diag', '');
                break;
            case 'campaign':
                setCampaign([]);
                onOperatorChange?.('campaign', 'is');
                break;
            default:
                if (onRemoveCustomFieldFilter) {
                    const config = allFilters.find(f => f.id === filterKey);
                    const fieldName = config?.fieldName || filterKey;
                    onRemoveCustomFieldFilter(fieldName);
                }
                onOperatorChange?.(filterKey, 'is');
        }
        setVisibleFilters(prev => {
            const next = new Set(prev);
            next.delete(filterKey);
            return next;
        });
    };

    const getDrillFilterLabel = (filter) => {
        switch (filter.type) {
            case 'leadStatus': return 'Status';
            case 'assignee': return 'Assignee';
            case 'callStatus': return 'Call Status';
            case 'totalCalls': return 'Calls';
            case 'source': return 'Source';
            case 'followUp': return 'Follow Up';
            default:
                if (filter.type.startsWith('custom_')) {
                    const fieldName = filter.type.replace('custom_', '');
                    const cfg = fieldConfigs.find(fc => fc.fieldName === fieldName);
                    return cfg?.displayLabel || fieldName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                }
                return filter.type;
        }
    };

    const getDrillFilterValue = (filter) => {
        if (filter.type === 'totalCalls') {
            if (filter.from === '0' && filter.to === '0') return 'No calls';
            if (!filter.to) return `${filter.from}+`;
            return `${filter.from}-${filter.to}`;
        }
        if (filter.type === 'assignee' && analyticsFilterOptions?.callers) {
            const c = analyticsFilterOptions.callers.find(c => c.id === filter.value);
            if (c) return c.name;
        }
        return filter.value;
    };

    // Build value options for a chart drill filter type
    const getDrillFilterOptions = (filter) => {
        switch (filter.type) {
            case 'leadStatus':
                return (analyticsFilterOptions?.leadStages || statusOptions || []).map(s => ({
                    label: s.replace(/_/g, ' '), value: s
                }));
            case 'assignee':
                return [
                    { label: 'Unassigned', value: 'Unassigned' },
                    ...(analyticsFilterOptions?.callers || []).map(c => ({ label: c.name, value: c.id })),
                ];
            case 'source':
                return (analyticsFilterOptions?.sources || sourceOptions || []).map(s => ({
                    label: s, value: s
                }));
            case 'callStatus':
                return ['answered', 'no_answer', 'busy', 'failed', 'voicemail'].map(s => ({
                    label: s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), value: s
                }));
            case 'campaign':
                return (campaignOptions || []).map(c => ({
                    label: typeof c === 'object' ? c.label : c,
                    value: typeof c === 'object' ? c.value : c,
                }));
            default:
                // custom_<fieldName> → look up field config options
                if (filter.type.startsWith('custom_')) {
                    const fieldName = filter.type.replace('custom_', '');
                    const cfg = fieldConfigs.find(fc => fc.fieldName === fieldName);
                    if (cfg?.options?.length) {
                        return cfg.options.map(o => ({ label: o, value: o }));
                    }
                }
                return [];
        }
    };

    const availableFilters = allFilters.filter(f => !visibleFilters.has(f.id));

    const addConditionItems = availableFilters.map((f) => ({
        key: f.id,
        label: (
            <div className="flex items-center gap-2">
                <span>{f.label}</span>
                {f.isCustom && <Tag className="text-[10px]" style={{ marginRight: 0 }}>Custom</Tag>}
            </div>
        ),
        onClick: () => addFilter(f.id),
    }));

    return (
        <div className="flex flex-col gap-4 w-full">
            {/* Main Search Bar */}
            <Input.Search
                placeholder="Search leads by name, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onSearch={setSearch}
                allowClear
                style={{ maxWidth: 400 }}
                size="large"
            />

            {/* Active Conditions Row */}
            <div className="flex flex-wrap items-center gap-3">
                {Array.from(visibleFilters).map(filterId => {
                    if (filterId === 'date') {
                        const dateOp = operators['date'] || 'is';
                        return (
                            <ConditionPill
                                key="date"
                                label="Created On"
                                operator={dateOp}
                                operatorOptions={DATE_OPERATOR_OPTIONS}
                                onOperatorChange={(op) => {
                                    onOperatorChange?.('date', op);
                                    // Clear carry-over dates when switching modes
                                    if (op === 'after') { setCustomTo(''); }
                                    if (op === 'before') { setCustomFrom(''); }
                                }}
                                onRemove={() => removeFilter('date')}
                            >
                                {(dateOp === 'after' || dateOp === 'before') ? (
                                    <DatePicker
                                        size="small"
                                        variant="borderless"
                                        format="DD/MM/YYYY"
                                        placeholder="Select date"
                                        value={dateOp === 'after'
                                            ? (customFrom ? dayjs(customFrom) : null)
                                            : (customTo ? dayjs(customTo) : null)}
                                        onChange={(date) => {
                                            if (dateOp === 'after') {
                                                setCustomFrom(date?.format('YYYY-MM-DD') || '');
                                                setCustomTo('');
                                            } else {
                                                setCustomTo(date?.format('YYYY-MM-DD') || '');
                                                setCustomFrom('');
                                            }
                                        }}
                                    />
                                ) : (
                                    <Space size="small">
                                        <ValueSelect
                                            value={dateMode}
                                            onChange={setDateMode}
                                            options={DATE_OPTIONS}
                                        />
                                        {dateMode === "Custom" && (
                                            <DatePicker.RangePicker
                                                size="small"
                                                value={
                                                    customFrom && customTo
                                                        ? [dayjs(customFrom), dayjs(customTo)]
                                                        : null
                                                }
                                                onChange={(dates) => {
                                                    if (dates) {
                                                        setCustomFrom(dates[0].format("YYYY-MM-DD"));
                                                        setCustomTo(dates[1].format("YYYY-MM-DD"));
                                                    } else {
                                                        setCustomFrom("");
                                                        setCustomTo("");
                                                    }
                                                }}
                                            />
                                        )}
                                    </Space>
                                )}
                            </ConditionPill>
                        );
                    }
                    if (filterId === 'status') {
                        const statusOp = operators['status'] || 'is';
                        return (
                            <ConditionPill key="status" label="Lead Status" operator={statusOp}
                                onOperatorChange={(op) => { onOperatorChange?.('status', op); if (op !== 'is_include') onIncludeTextChange?.('status', ''); }}
                                onRemove={() => removeFilter('status')}>
                                {statusOp === 'is_include' ? (
                                    <Input size="small" variant="borderless" placeholder="Type to search..." value={filterIncludeTexts['status'] || ''} onChange={e => onIncludeTextChange?.('status', e.target.value)} style={{ width: 150 }} />
                                ) : (
                                    <Select
                                        mode="multiple"
                                        size="small"
                                        variant="borderless"
                                        value={status}
                                        onChange={(val) => setStatus(val)}
                                        options={statusOptions.map(s => ({ label: s.replace(/_/g, ' '), value: s }))}
                                        placeholder="Select statuses..."
                                        popupMatchSelectWidth={false}
                                        style={{ minWidth: 160 }}
                                        maxTagCount="responsive"
                                        showSearch
                                        filterOption={(input, option) =>
                                            (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                                        }
                                    />
                                )}
                            </ConditionPill>
                        );
                    }
                    if (filterId === 'source') {
                        const sourceOp = operators['source'] || 'is';
                        return (
                            <ConditionPill key="source" label="Source" operator={sourceOp}
                                onOperatorChange={(op) => { onOperatorChange?.('source', op); if (op !== 'is_include') onIncludeTextChange?.('source', ''); }}
                                onRemove={() => removeFilter('source')}>
                                {sourceOp === 'is_include' ? (
                                    <Input size="small" variant="borderless" placeholder="Type to search..." value={filterIncludeTexts['source'] || ''} onChange={e => onIncludeTextChange?.('source', e.target.value)} style={{ width: 150 }} />
                                ) : (
                                    <ValueSelect value={source} onChange={setSource} options={sourceOptions} />
                                )}
                            </ConditionPill>
                        );
                    }
                    if (filterId === 'caller') {
                        if (!callerOptions) return null;
                        return (
                            <ConditionPill key="caller" label="Assignee" operator={operators['caller'] || 'is'} operatorOptions={OPERATOR_OPTIONS_NO_INCLUDE} onOperatorChange={(op) => onOperatorChange?.('caller', op)} onRemove={() => removeFilter('caller')}>
                                <Select
                                    mode="multiple"
                                    size="small"
                                    variant="borderless"
                                    value={caller}
                                    onChange={(val) => setCaller(val)}
                                    options={callerOptions.map(c => ({ label: c.name, value: c.id }))}
                                    placeholder="Select assignees..."
                                    popupMatchSelectWidth={false}
                                    style={{ minWidth: 160 }}
                                    maxTagCount="responsive"
                                    showSearch
                                    filterOption={(input, option) =>
                                        (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                                    }
                                />
                            </ConditionPill>
                        );
                    }
                    if (filterId === 'followup') {
                        const followOp = operators['followup'] || 'is';
                        return (
                            <ConditionPill
                                key="followup"
                                label="Call Later"
                                operator={followOp}
                                operatorOptions={DATE_OPERATOR_OPTIONS}
                                onOperatorChange={(op) => {
                                    onOperatorChange?.('followup', op);
                                    if (op === 'after') { setFollowupTo(''); }
                                    if (op === 'before') { setFollowupFrom(''); }
                                }}
                                onRemove={() => removeFilter('followup')}
                            >
                                {(followOp === 'after' || followOp === 'before') ? (
                                    <DatePicker
                                        size="small"
                                        variant="borderless"
                                        format="DD/MM/YYYY"
                                        placeholder="Select date"
                                        value={followOp === 'after'
                                            ? (followupFrom ? dayjs(followupFrom) : null)
                                            : (followupTo ? dayjs(followupTo) : null)}
                                        onChange={(date) => {
                                            if (followOp === 'after') {
                                                setFollowupFrom(date?.format('YYYY-MM-DD') || '');
                                                setFollowupTo('');
                                            } else {
                                                setFollowupTo(date?.format('YYYY-MM-DD') || '');
                                                setFollowupFrom('');
                                            }
                                        }}
                                    />
                                ) : (
                                    <>
                                        <ValueSelect value={followup} onChange={setFollowup} options={followupOptions} />
                                        {followup === 'Custom' && (
                                            <DatePicker.RangePicker
                                                size="small"
                                                variant="borderless"
                                                format="DD/MM/YYYY"
                                                value={[
                                                    followupFrom ? dayjs(followupFrom) : null,
                                                    followupTo ? dayjs(followupTo) : null,
                                                ]}
                                                onChange={(dates) => {
                                                    setFollowupFrom(dates?.[0]?.format('YYYY-MM-DD') || '');
                                                    setFollowupTo(dates?.[1]?.format('YYYY-MM-DD') || '');
                                                }}
                                                style={{ minWidth: 200 }}
                                            />
                                        )}
                                    </>
                                )}
                            </ConditionPill>
                        );
                    }
                    if (filterId === 'opd') {
                        const opdOp = operators['opd'] || 'is';
                        return (
                            <ConditionPill key="opd" label="OPD Status" operator={opdOp}
                                onOperatorChange={(op) => { onOperatorChange?.('opd', op); if (op !== 'is_include') onIncludeTextChange?.('opd', ''); }}
                                onRemove={() => removeFilter('opd')}>
                                {opdOp === 'is_include' ? (
                                    <Input size="small" variant="borderless" placeholder="Type to search..." value={filterIncludeTexts['opd'] || ''} onChange={e => onIncludeTextChange?.('opd', e.target.value)} style={{ width: 140 }} />
                                ) : (
                                    <ValueSelect value={opd} onChange={setOpd} options={opdOptions} />
                                )}
                            </ConditionPill>
                        );
                    }
                    if (filterId === 'opdDate') {
                        const opdDateOp = operators['opdDate'] || 'is';
                        return (
                            <ConditionPill key="opdDate" label="OPD Date" operator={opdDateOp}
                                operatorOptions={BOOKING_DATE_OPERATOR_OPTIONS}
                                onOperatorChange={(op) => {
                                    onOperatorChange?.('opdDate', op);
                                    if (op !== 'custom') setOpdDateTo('');
                                }}
                                onRemove={() => removeFilter('opdDate')}>
                                {opdDateOp === 'custom' ? (
                                    <DatePicker.RangePicker
                                        size="small"
                                        variant="borderless"
                                        format="DD/MM/YYYY"
                                        value={[
                                            opdDate ? dayjs(opdDate) : null,
                                            opdDateTo ? dayjs(opdDateTo) : null,
                                        ]}
                                        onChange={(dates) => {
                                            setOpdDate(dates?.[0]?.format('YYYY-MM-DD') || '');
                                            setOpdDateTo(dates?.[1]?.format('YYYY-MM-DD') || '');
                                        }}
                                    />
                                ) : (
                                    <DatePicker
                                        size="small"
                                        variant="borderless"
                                        format="DD/MM/YYYY"
                                        placeholder="Select date"
                                        value={opdDate ? dayjs(opdDate) : null}
                                        onChange={(date) => setOpdDate(date?.format('YYYY-MM-DD') || '')}
                                    />
                                )}
                            </ConditionPill>
                        );
                    }
                    if (filterId === 'ipd') {
                        const ipdOp = operators['ipd'] || 'is';
                        return (
                            <ConditionPill key="ipd" label="IPD Status" operator={ipdOp}
                                onOperatorChange={(op) => { onOperatorChange?.('ipd', op); if (op !== 'is_include') onIncludeTextChange?.('ipd', ''); }}
                                onRemove={() => removeFilter('ipd')}>
                                {ipdOp === 'is_include' ? (
                                    <Input size="small" variant="borderless" placeholder="Type to search..." value={filterIncludeTexts['ipd'] || ''} onChange={e => onIncludeTextChange?.('ipd', e.target.value)} style={{ width: 140 }} />
                                ) : (
                                    <ValueSelect value={ipd} onChange={setIpd} options={ipdOptions} />
                                )}
                            </ConditionPill>
                        );
                    }
                    if (filterId === 'ipdDate') {
                        const ipdDateOp = operators['ipdDate'] || 'is';
                        return (
                            <ConditionPill key="ipdDate" label="IPD Date" operator={ipdDateOp}
                                operatorOptions={BOOKING_DATE_OPERATOR_OPTIONS}
                                onOperatorChange={(op) => {
                                    onOperatorChange?.('ipdDate', op);
                                    if (op !== 'custom') setIpdDateTo('');
                                }}
                                onRemove={() => removeFilter('ipdDate')}>
                                {ipdDateOp === 'custom' ? (
                                    <DatePicker.RangePicker
                                        size="small"
                                        variant="borderless"
                                        format="DD/MM/YYYY"
                                        value={[
                                            ipdDate ? dayjs(ipdDate) : null,
                                            ipdDateTo ? dayjs(ipdDateTo) : null,
                                        ]}
                                        onChange={(dates) => {
                                            setIpdDate(dates?.[0]?.format('YYYY-MM-DD') || '');
                                            setIpdDateTo(dates?.[1]?.format('YYYY-MM-DD') || '');
                                        }}
                                    />
                                ) : (
                                    <DatePicker
                                        size="small"
                                        variant="borderless"
                                        format="DD/MM/YYYY"
                                        placeholder="Select date"
                                        value={ipdDate ? dayjs(ipdDate) : null}
                                        onChange={(date) => setIpdDate(date?.format('YYYY-MM-DD') || '')}
                                    />
                                )}
                            </ConditionPill>
                        );
                    }
                    if (filterId === 'diag') {
                        const diagOp = operators['diag'] || 'is';
                        return (
                            <ConditionPill key="diag" label="Diagnostics" operator={diagOp}
                                onOperatorChange={(op) => { onOperatorChange?.('diag', op); if (op !== 'is_include') onIncludeTextChange?.('diag', ''); }}
                                onRemove={() => removeFilter('diag')}>
                                {diagOp === 'is_include' ? (
                                    <Input size="small" variant="borderless" placeholder="Type to search..." value={filterIncludeTexts['diag'] || ''} onChange={e => onIncludeTextChange?.('diag', e.target.value)} style={{ width: 140 }} />
                                ) : (
                                    <ValueSelect value={diag} onChange={setDiag} options={diagOptions} />
                                )}
                            </ConditionPill>
                        );
                    }
                    if (filterId === 'campaign') {
                        if (!campaignOptions) return null;
                        return (
                            <ConditionPill key="campaign" label="Campaign" operator={operators['campaign'] || 'is'} operatorOptions={OPERATOR_OPTIONS_NO_INCLUDE} onOperatorChange={(op) => onOperatorChange?.('campaign', op)} onRemove={() => removeFilter('campaign')}>
                                <Select
                                    mode="multiple"
                                    size="small"
                                    variant="borderless"
                                    value={campaign}
                                    onChange={(val) => setCampaign(val)}
                                    options={campaignOptions.map(c => ({ label: c.name, value: c.id }))}
                                    placeholder="Select campaigns..."
                                    popupMatchSelectWidth={false}
                                    style={{ minWidth: 160 }}
                                    maxTagCount="responsive"
                                    showSearch
                                    filterOption={(input, option) =>
                                        (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                                    }
                                />
                            </ConditionPill>
                        );
                    }

                    // Custom field filters
                    const config = allFilters.find(f => f.id === filterId);
                    if (!config) return null;
                    const fieldName = config.fieldName || filterId;
                    const currentValue = customFieldFilters[fieldName]?.value || undefined;
                    const currentOp = customFieldFilters[fieldName]?.operator || operators[filterId] || 'is';
                    const hasOptions = config.options && config.options.length > 0;

                    return (
                        <ConditionPill
                            key={filterId}
                            label={config.label}
                            operator={currentOp}
                            onOperatorChange={(op) => {
                                onOperatorChange?.(filterId, op);
                                if (onCustomFieldFilter) {
                                    if (op === 'is_empty') {
                                        onCustomFieldFilter(fieldName, '', op);
                                    } else {
                                        onCustomFieldFilter(fieldName, customFieldFilters[fieldName]?.value || '', op);
                                    }
                                }
                            }}
                            onRemove={() => removeFilter(filterId)}
                        >
                            {hasOptions && currentOp !== 'is_include' ? (
                                <ValueSelect
                                    value={currentValue || 'Select...'}
                                    onChange={(val) => onCustomFieldFilter && onCustomFieldFilter(fieldName, val, currentOp)}
                                    options={config.options}
                                />
                            ) : (
                                <Input
                                    size="small"
                                    type={config.type === 'number' && currentOp !== 'is_include' ? 'number' : 'text'}
                                    placeholder={currentOp === 'is_include' ? 'Type to search...' : `Enter ${config.label}...`}
                                    value={currentValue || ''}
                                    onChange={(e) => onCustomFieldFilter && onCustomFieldFilter(fieldName, e.target.value, currentOp)}
                                    style={{ width: 140 }}
                                    variant="borderless"
                                />
                            )}
                        </ConditionPill>
                    );
                })}

                {/* Chart Drill-Down Filters */}
                {chartDrillFilters.map((filter) => {
                    const drillOptions = getDrillFilterOptions(filter);
                    const isTotalCalls = filter.type === 'totalCalls';

                    return (
                        <ConditionPill
                            key={filter.id}
                            label={<><BarChartOutlined className="mr-1" />{getDrillFilterLabel(filter)}</>}
                            operator={filter.operator || 'is'}
                            onOperatorChange={(op) => updateChartDrillFilter?.(filter.id, { operator: op })}
                            onRemove={() => removeChartDrillFilter?.(filter.id)}
                        >
                            {isTotalCalls ? (
                                <span className="text-sm px-1">{getDrillFilterValue(filter)}</span>
                            ) : drillOptions.length > 0 ? (
                                <Select
                                    size="small"
                                    variant="borderless"
                                    value={filter.value}
                                    onChange={(val) => updateChartDrillFilter?.(filter.id, { value: val })}
                                    options={drillOptions}
                                    popupMatchSelectWidth={false}
                                    style={{ minWidth: 120 }}
                                    showSearch
                                    filterOption={(input, option) =>
                                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                    }
                                />
                            ) : (
                                <Input
                                    size="small"
                                    variant="borderless"
                                    value={filter.value || ''}
                                    onChange={(e) => updateChartDrillFilter?.(filter.id, { value: e.target.value })}
                                    style={{ width: 120 }}
                                    placeholder="Value..."
                                />
                            )}
                        </ConditionPill>
                    );
                })}

                {chartDrillFilters.length > 1 && (
                    <Button type="link" size="small" onClick={clearAllChartDrillFilters}>
                        Clear chart filters
                    </Button>
                )}

                {/* Add Condition Button */}
                <Dropdown
                    menu={{ items: addConditionItems }}
                    trigger={["click"]}
                >
                    <Button type="text" icon={<PlusOutlined />} className="text-violet-600">
                        Add Condition
                    </Button>
                </Dropdown>
            </div>
        </div>
    );
};

export default LeadFilters;

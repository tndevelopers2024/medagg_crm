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
    ipd: { id: 'ipd', label: 'IPD Status', defaultValue: 'IPD Status' },
    diag: { id: 'diag', label: 'Diagnostics', defaultValue: 'Diagnostics' },
};

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
];

function ConditionPill({ label, operator, onOperatorChange, onRemove, children }) {
    return (
        <div className="group flex items-center bg-violet-50 rounded-lg border border-violet-100 p-1 pr-2 transition-all hover:border-violet-200 hover:shadow-sm">
            <div className="flex items-center gap-1 px-2 border-r border-violet-200/50 mr-2">
                <span className="text-xs font-semibold text-violet-700 uppercase tracking-wide mr-1">{label}</span>
                <Select
                    size="small"
                    variant="borderless"
                    value={operator}
                    onChange={onOperatorChange}
                    options={OPERATOR_OPTIONS}
                    style={{ width: 70 }}
                    popupMatchSelectWidth={false}
                    className="text-xs"
                />
            </div>
            <div className="relative">{children}</div>
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
        if (customFieldFilters) {
            for (const fieldName of Object.keys(customFieldFilters)) {
                const config = allFilters.find(f => f.fieldName === fieldName);
                if (config) newVisible.add(config.id);
            }
        }
        if (newVisible.size > visibleFilters.size) setVisibleFilters(newVisible);
    }, [status, source, caller, followup, opd, ipd, diag, campaign, customFieldFilters]);

    const addFilter = (filterKey) => {
        setVisibleFilters(prev => new Set([...prev, filterKey]));
        if (onOperatorChange) onOperatorChange(filterKey, 'is');
    };

    const removeFilter = (filterKey) => {
        switch (filterKey) {
            case 'date': setDateMode(STANDARD_CONFIG.date.defaultValue); break;
            case 'status': setStatus([]); break;
            case 'source': setSource(STANDARD_CONFIG.source.defaultValue); break;
            case 'caller': setCaller([]); break;
            case 'followup': setFollowup(STANDARD_CONFIG.followup.defaultValue); break;
            case 'opd': setOpd(STANDARD_CONFIG.opd.defaultValue); break;
            case 'ipd': setIpd(STANDARD_CONFIG.ipd.defaultValue); break;
            case 'diag': setDiag(STANDARD_CONFIG.diag.defaultValue); break;
            case 'campaign': setCampaign([]); break;
            default:
                if (onRemoveCustomFieldFilter) {
                    const config = allFilters.find(f => f.id === filterKey);
                    const fieldName = config?.fieldName || filterKey;
                    onRemoveCustomFieldFilter(fieldName);
                }
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
                        return (
                            <ConditionPill
                                key="date"
                                label="Created On"
                                operator={operators['date'] || 'is'}
                                onOperatorChange={(op) => onOperatorChange?.('date', op)}
                                onRemove={() => removeFilter('date')}
                            >
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
                            </ConditionPill>
                        );
                    }
                    if (filterId === 'status') {
                        return (
                            <ConditionPill key="status" label="Lead Status" operator={operators['status'] || 'is'} onOperatorChange={(op) => onOperatorChange?.('status', op)} onRemove={() => removeFilter('status')}>
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
                            </ConditionPill>
                        );
                    }
                    if (filterId === 'source') {
                        return (
                            <ConditionPill key="source" label="Source" operator={operators['source'] || 'is'} onOperatorChange={(op) => onOperatorChange?.('source', op)} onRemove={() => removeFilter('source')}>
                                <ValueSelect value={source} onChange={setSource} options={sourceOptions} />
                            </ConditionPill>
                        );
                    }
                    if (filterId === 'caller') {
                        if (!callerOptions) return null;
                        return (
                            <ConditionPill key="caller" label="Assignee" operator={operators['caller'] || 'is'} onOperatorChange={(op) => onOperatorChange?.('caller', op)} onRemove={() => removeFilter('caller')}>
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
                        return (
                            <ConditionPill key="followup" label="Call Later" operator={operators['followup'] || 'is'} onOperatorChange={(op) => onOperatorChange?.('followup', op)} onRemove={() => removeFilter('followup')}>
                                <ValueSelect value={followup} onChange={setFollowup} options={followupOptions} />
                            </ConditionPill>
                        );
                    }
                    if (filterId === 'opd') {
                        return (
                            <ConditionPill key="opd" label="OPD Status" operator={operators['opd'] || 'is'} onOperatorChange={(op) => onOperatorChange?.('opd', op)} onRemove={() => removeFilter('opd')}>
                                <ValueSelect value={opd} onChange={setOpd} options={opdOptions} />
                            </ConditionPill>
                        );
                    }
                    if (filterId === 'ipd') {
                        return (
                            <ConditionPill key="ipd" label="IPD Status" operator={operators['ipd'] || 'is'} onOperatorChange={(op) => onOperatorChange?.('ipd', op)} onRemove={() => removeFilter('ipd')}>
                                <ValueSelect value={ipd} onChange={setIpd} options={ipdOptions} />
                            </ConditionPill>
                        );
                    }
                    if (filterId === 'diag') {
                        return (
                            <ConditionPill key="diag" label="Diagnostics" operator={operators['diag'] || 'is'} onOperatorChange={(op) => onOperatorChange?.('diag', op)} onRemove={() => removeFilter('diag')}>
                                <ValueSelect value={diag} onChange={setDiag} options={diagOptions} />
                            </ConditionPill>
                        );
                    }
                    if (filterId === 'campaign') {
                        if (!campaignOptions) return null;
                        return (
                            <ConditionPill key="campaign" label="Campaign" operator={operators['campaign'] || 'is'} onOperatorChange={(op) => onOperatorChange?.('campaign', op)} onRemove={() => removeFilter('campaign')}>
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
                                if (onCustomFieldFilter && customFieldFilters[fieldName]?.value) {
                                    onCustomFieldFilter(fieldName, customFieldFilters[fieldName].value, op);
                                }
                            }}
                            onRemove={() => removeFilter(filterId)}
                        >
                            {hasOptions ? (
                                <ValueSelect
                                    value={currentValue || 'Select...'}
                                    onChange={(val) => onCustomFieldFilter && onCustomFieldFilter(fieldName, val, currentOp)}
                                    options={config.options}
                                />
                            ) : (
                                <Input
                                    size="small"
                                    type={config.type === 'number' ? 'number' : 'text'}
                                    placeholder={`Enter ${config.label}...`}
                                    value={currentValue || ''}
                                    onChange={(e) => onCustomFieldFilter && onCustomFieldFilter(fieldName, e.target.value, currentOp)}
                                    style={{ width: 130 }}
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

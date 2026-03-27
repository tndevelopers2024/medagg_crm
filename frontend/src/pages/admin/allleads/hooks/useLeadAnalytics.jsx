import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchAnalytics, fetchFilterOptions, exportAnalytics, downloadCSV } from "../../../../utils/analyticsApi";
import {
  StatusBarChart,
  LostReasonsChart,
  AssigneeChart,
  CallsHistogramChart,
  RatingChart,
  CallStatusChart,
  CustomFieldChart,
  ChartLegend,
} from "../../../../components/admin/analytics/ChartComponents";
import Loader from "../../../../components/Loader";
import React from "react";

export const CHART_TYPES = [
  { value: "status", label: "Status" },
  { value: "lostReasons", label: "Lost Reasons" },
  { value: "assignee", label: "Assignee" },
  { value: "city", label: "City" },
  { value: "state", label: "State" },
  { value: "callStatus", label: "Call Status" },
  { value: "custom", label: "Custom" },
];

export default function useLeadAnalytics({
  leadStatus,
  lostStatus,
  callerFilter,
  source,
  opdStatus,
  ipdStatus,
  diagnostics,
  campaignFilter,
  dateMode,
  customFrom,
  customTo,
  followupFilter,
  followupFrom,
  followupTo,
  customFieldFilters,
  filterOperators = {},
  filterIncludeTexts = {},
  opdDate,
  opdDateTo,
  ipdDate,
  ipdDateTo,
  statusFrom,
  statusTo,
  statusDate,
  statusDateTo,
  fieldConfigs,
  notify,
  ownLeadsOnly,
  userId,
  authLoading,
}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState(() => searchParams.get('vm') || 'list');
  const [chartType, setChartType] = useState(() => searchParams.get('ct') || 'status');
  const [customFieldName, setCustomFieldName] = useState(() => searchParams.get('cfn') || '');
  const [chartData, setChartData] = useState([]);
  const [chartTotalCount, setChartTotalCount] = useState(0);
  const [chartLoading, setChartLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [chartDrillFilters, setChartDrillFilters] = useState([]);
  const [chartSortBy, setChartSortBy] = useState("createdTime");
  const [chartSortOrder, setChartSortOrder] = useState("desc");

  const [analyticsFilterOptions, setAnalyticsFilterOptions] = useState({
    callers: [],
    leadStages: [],
    fieldConfigs: [],
    sources: [],
  });

  // Sync analytics state → URL (preserves filter params owned by useLeadFilters)
  useEffect(() => {
    const currentVm = searchParams.get('vm') || 'list';
    const currentCt = searchParams.get('ct') || 'status';
    const currentCfn = searchParams.get('cfn') || '';
    if (currentVm === viewMode && currentCt === chartType && currentCfn === customFieldName) return;

    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (viewMode !== 'list') next.set('vm', viewMode); else next.delete('vm');
      if (chartType !== 'status') next.set('ct', chartType); else next.delete('ct');
      if (customFieldName) next.set('cfn', customFieldName); else next.delete('cfn');
      return next;
    }, { replace: true });
  }, [viewMode, chartType, customFieldName, setSearchParams, searchParams]);

  // Sync URL → analytics state (back button / external navigation)
  useEffect(() => {
    const urlVm = searchParams.get('vm') || 'list';
    const urlCt = searchParams.get('ct') || 'status';
    const urlCfn = searchParams.get('cfn') || '';
    if (urlVm !== viewMode) setViewMode(urlVm);
    if (urlCt !== chartType) setChartType(urlCt);
    if (urlCfn !== customFieldName) setCustomFieldName(urlCfn);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load analytics filter options when switching to chart view
  useEffect(() => {
    if (viewMode === "chart" && analyticsFilterOptions.callers.length === 0) {
      fetchFilterOptions()
        .then((res) => {
          if (res.success) setAnalyticsFilterOptions(res.data);
        })
        .catch((err) => console.error("Failed to load analytics filter options:", err));
    }
  }, [viewMode]);

  const mergedAnalyticsFilters = useMemo(() => {
    const af = [...chartDrillFilters];
    const ops = filterOperators;
    const inc = filterIncludeTexts;

    // Scope to own leads when role has "Own Leads Analytics Only" permission
    if (ownLeadsOnly && userId) {
      af.push({ id: "caller_scope", type: "assignee", operator: "is", values: [userId] });
    }

    // Lead Status
    if (ops.status === 'is_empty') {
      af.push({ id: "page_status", type: "leadStatus", operator: "is_empty" });
    } else if (ops.status === 'is_include' && inc.status) {
      af.push({ id: "page_status", type: "leadStatus", operator: "is_include", value: inc.status });
    } else if (ops.status === 'between' && (statusFrom || statusTo)) {
      af.push({
        id: "page_status",
        type: "leadStatus",
        operator: "between",
        statusFrom,
        statusTo,
        statusDate,
        statusDateTo
      });
    } else if (Array.isArray(leadStatus) && leadStatus.length > 0) {
      af.push({ id: "page_status", type: "leadStatus", operator: ops.status || "is", values: leadStatus });
    }

    // Lost Status
    if (ops.lostStatus === 'is_empty') {
      af.push({ id: "page_lostStatus", type: "lostStatus", operator: "is_empty" });
    } else if (Array.isArray(lostStatus) && lostStatus.length > 0) {
      af.push({ id: "page_lostStatus", type: "lostStatus", operator: ops.lostStatus || "is", values: lostStatus });
    }

    // Assignee
    if (ops.caller === 'is_empty') {
      af.push({ id: "page_caller", type: "assignee", operator: "is_empty" });
    } else if (Array.isArray(callerFilter) && callerFilter.length > 0) {
      af.push({ id: "page_caller", type: "assignee", operator: ops.caller || "is", values: callerFilter });
    }

    // Source
    if (ops.source === 'is_empty') {
      af.push({ id: "page_source", type: "source", operator: "is_empty" });
    } else if (ops.source === 'is_include' && inc.source) {
      af.push({ id: "page_source", type: "source", operator: "is_include", value: inc.source });
    } else if (source !== "All Sources") {
      af.push({ id: "page_source", type: "source", operator: ops.source || "is", value: source });
    }

    // OPD Status — stored in opBookings[].status, not fieldData
    if (ops.opd === 'is_empty') {
      af.push({ id: "page_opd", type: "opdStatus", operator: "is_empty" });
    } else if (ops.opd === 'is_include' && inc.opd) {
      af.push({ id: "page_opd", type: "opdStatus", operator: "is_include", value: inc.opd });
    } else if (opdStatus !== "OPD Status") {
      af.push({ id: "page_opd", type: "opdStatus", operator: ops.opd || "is", value: opdStatus });
    }

    // IPD Status — stored in ipBookings[].status, not fieldData
    if (ops.ipd === 'is_empty') {
      af.push({ id: "page_ipd", type: "ipdStatus", operator: "is_empty" });
    } else if (ops.ipd === 'is_include' && inc.ipd) {
      af.push({ id: "page_ipd", type: "ipdStatus", operator: "is_include", value: inc.ipd });
    } else if (ipdStatus !== "IPD Status") {
      af.push({ id: "page_ipd", type: "ipdStatus", operator: ops.ipd || "is", value: ipdStatus });
    }

    // Diagnostics — stored in fieldData
    if (ops.diag === 'is_empty') {
      af.push({ id: "page_diag", type: "custom_diagnostic", operator: "is_empty" });
    } else if (ops.diag === 'is_include' && inc.diag) {
      af.push({ id: "page_diag", type: "custom_diagnostic", operator: "is_include", value: inc.diag });
    } else if (diagnostics !== "Diagnostics") {
      af.push({ id: "page_diag", type: "custom_diagnostic", operator: ops.diag || "is", value: diagnostics });
    }

    // Campaign
    if (ops.campaign === 'is_empty') {
      af.push({ id: "page_campaign", type: "campaign", operator: "is_empty" });
    } else if (Array.isArray(campaignFilter) && campaignFilter.length > 0) {
      af.push({ id: "page_campaign", type: "campaign", operator: ops.campaign || "is", values: campaignFilter });
    }

    // Date filter — convert dateMode/operators to dateRange filter for analytics
    const dateOp = ops.date;
    if (dateOp === 'after' && customFrom) {
      af.push({ id: "page_date", type: "dateRange", operator: "after", from: new Date(`${customFrom}T00:00:00+05:30`).toISOString() });
    } else if (dateOp === 'before' && customTo) {
      af.push({ id: "page_date", type: "dateRange", operator: "before", to: new Date(`${customTo}T23:59:59.999+05:30`).toISOString() });
    } else if (dateMode) {
      const now = new Date();
      const dayStart = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.toISOString(); };
      const dayEnd = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x.toISOString(); };
      if (dateMode === "Today") {
        af.push({ id: "page_date", type: "dateRange", from: dayStart(now), to: dayEnd(now) });
      } else if (dateMode === "Yesterday") {
        const y = new Date(now); y.setDate(y.getDate() - 1);
        af.push({ id: "page_date", type: "dateRange", from: dayStart(y), to: dayEnd(y) });
      } else if (dateMode === "7d") {
        const d = new Date(now); d.setDate(d.getDate() - 6);
        af.push({ id: "page_date", type: "dateRange", from: dayStart(d), to: dayEnd(now) });
      } else if (dateMode === "30d") {
        const d = new Date(now); d.setDate(d.getDate() - 29);
        af.push({ id: "page_date", type: "dateRange", from: dayStart(d), to: dayEnd(now) });
      } else if (dateMode === "Custom" && customFrom && customTo) {
        af.push({ id: "page_date", type: "dateRange", from: new Date(`${customFrom}T00:00:00+05:30`).toISOString(), to: new Date(`${customTo}T23:59:59.999+05:30`).toISOString() });
      }
    }

    // Follow-up filter
    const followupOp = ops.followup;
    if (followupOp === 'is_empty') {
      af.push({ id: "page_followup", type: "followUp", operator: "is_empty" });
    } else if (followupOp === 'after' && followupFrom) {
      af.push({ id: "page_followup", type: "followUp", operator: "after", from: followupFrom });
    } else if (followupOp === 'before' && followupTo) {
      af.push({ id: "page_followup", type: "followUp", operator: "before", to: followupTo });
    } else if (followupFilter && followupFilter !== "All") {
      const fEntry = { id: "page_followup", type: "followUp", operator: followupOp || "is", value: followupFilter };
      if (followupFilter === "Custom" && followupFrom && followupTo) {
        fEntry.from = followupFrom;
        fEntry.to = followupTo;
      }
      af.push(fEntry);
    }

    // OPD Date filter
    if (opdDate) {
      af.push({ id: "page_opdDate", type: "opdDate", operator: ops.opdDate || "is", from: opdDate, to: ops.opdDate === 'custom' ? (opdDateTo || '') : '' });
    }

    // IPD Date filter
    if (ipdDate) {
      af.push({ id: "page_ipdDate", type: "ipdDate", operator: ops.ipdDate || "is", from: ipdDate, to: ops.ipdDate === 'custom' ? (ipdDateTo || '') : '' });
    }

    // Custom field filters from "Add Condition"
    if (customFieldFilters) {
      for (const [fieldName, { value, operator }] of Object.entries(customFieldFilters)) {
        if (value || operator === 'is_empty') {
          af.push({ id: `page_custom_${fieldName}`, type: `custom_${fieldName}`, operator: operator || "is", value: value || '' });
        }
      }
    }

    return af;
  }, [
    chartDrillFilters, leadStatus, lostStatus, callerFilter, source, opdStatus, ipdStatus, diagnostics, campaignFilter,
    dateMode, customFrom, customTo, followupFilter, followupFrom, followupTo,
    customFieldFilters, filterOperators, filterIncludeTexts,
    opdDate, opdDateTo, ipdDate, ipdDateTo,
    statusFrom, statusTo, statusDate, statusDateTo,
    ownLeadsOnly, userId,
  ]);

  const loadChartData = useCallback(async () => {
    try {
      setChartLoading(true);
      const response = await fetchAnalytics({
        filters: mergedAnalyticsFilters,
        chartType,
        sortBy: chartSortBy,
        sortOrder: chartSortOrder,
        fieldName: chartType === "custom" ? customFieldName : undefined,
      });
      if (response.success) {
        setChartData(response.data || []);
        setChartTotalCount(response.totalCount || 0);
      }
    } catch (error) {
      console.error("Failed to load chart data:", error);
    } finally {
      setChartLoading(false);
    }
  }, [mergedAnalyticsFilters, chartType, chartSortBy, chartSortOrder, customFieldName]);

  useEffect(() => {
    if (viewMode === "chart" && !authLoading) {
      loadChartData();
    }
  }, [viewMode, loadChartData, authLoading]);

  const handleBarClick = useCallback((data) => {
    if (!data || !data.name) return;

    let filterType;
    let filterValue = data.name;
    const filterOperator = "is";

    switch (chartType) {
      case "status":
        // "Lost" bar is aggregated — clicking it switches to Lost Reasons chart
        if (data.name === "Lost") {
          setChartType("lostReasons");
          return;
        }
        filterType = "leadStatus";
        break;
      case "lostReasons":
        filterType = "custom_lost_reason";
        break;
      case "assignee":
        filterType = "assignee";
        filterValue = data.userId || (data.name === "Unassigned" ? "Unassigned" : data.name);
        break;
      case "rating":
        filterType = "custom_rating";
        break;
      case "callStatus":
        filterType = "callStatus";
        break;
      case "numberOfCalls": {
        filterType = "totalCalls";
        const rangeMatch = data.name.match(/(\d+)-(\d+)/);
        const plusMatch = data.name.match(/(\d+)\+/);
        if (data.name === "No calls") {
          setChartDrillFilters((prev) => [...prev, { id: Date.now(), type: filterType, from: "0", to: "0" }]);
        } else if (rangeMatch) {
          setChartDrillFilters((prev) => [...prev, { id: Date.now(), type: filterType, from: rangeMatch[1], to: rangeMatch[2] }]);
        } else if (plusMatch) {
          setChartDrillFilters((prev) => [...prev, { id: Date.now(), type: filterType, from: plusMatch[1], to: "" }]);
        }
        return;
      }
      case "city":
        filterType = "custom_city";
        break;
      case "state":
        filterType = "custom_state";
        break;
      case "custom":
        if (!customFieldName) return;
        filterType = `custom_${customFieldName}`;
        break;
      default:
        return;
    }

    const exists = chartDrillFilters.find((f) => f.type === filterType && f.value === filterValue);
    if (exists) return;

    setChartDrillFilters((prev) => [...prev, { id: Date.now(), type: filterType, operator: filterOperator, value: filterValue }]);
  }, [chartType, setChartType, customFieldName, chartDrillFilters]);

  const removeChartDrillFilter = useCallback((filterId) => {
    setChartDrillFilters((prev) => prev.filter((f) => f.id !== filterId));
  }, []);

  const updateChartDrillFilter = useCallback((filterId, updates) => {
    setChartDrillFilters((prev) =>
      prev.map((f) => (f.id === filterId ? { ...f, ...updates } : f))
    );
  }, []);

  const clearAllChartDrillFilters = useCallback(() => {
    setChartDrillFilters([]);
  }, []);

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const blob = await exportAnalytics({ filters: mergedAnalyticsFilters, format: "csv" });
      downloadCSV(blob, `leads_analytics_${new Date().toISOString().split("T")[0]}.csv`);
    } catch (error) {
      console.error("Failed to export:", error);
      notify("Export Failed", "Could not export data. Please try again.", { tone: "error" });
    } finally {
      setExporting(false);
    }
  };

  const renderChart = () => {
    if (chartLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <Loader />
        </div>
      );
    }
    switch (chartType) {
      case "status":
        return <StatusBarChart data={chartData} onBarClick={handleBarClick} />;
      case "lostReasons":
        return <LostReasonsChart data={chartData} onBarClick={handleBarClick} />;
      case "assignee":
        return <AssigneeChart data={chartData} onBarClick={handleBarClick} />;
      case "rating":
        return <RatingChart data={chartData} onBarClick={handleBarClick} />;
      case "callStatus":
        return <CallStatusChart data={chartData} onBarClick={handleBarClick} />;
      case "numberOfCalls":
        return <CallsHistogramChart data={chartData} onBarClick={handleBarClick} />;
      case "city":
        return <CustomFieldChart data={chartData} onBarClick={handleBarClick} fieldName="city" />;
      case "state":
        return <CustomFieldChart data={chartData} onBarClick={handleBarClick} fieldName="state" />;
      case "custom":
        return <CustomFieldChart data={chartData} onBarClick={handleBarClick} fieldName={customFieldName} />;
      default:
        return <StatusBarChart data={chartData} onBarClick={handleBarClick} />;
    }
  };

  return {
    viewMode, setViewMode,
    chartType, setChartType,
    customFieldName, setCustomFieldName,
    chartData,
    chartTotalCount,
    chartLoading,
    exporting,
    chartDrillFilters, setChartDrillFilters,
    chartSortBy, setChartSortBy,
    chartSortOrder, setChartSortOrder,
    analyticsFilterOptions,
    mergedAnalyticsFilters,
    loadChartData,
    handleBarClick,
    handleExportCSV,
    renderChart,
    removeChartDrillFilter,
    updateChartDrillFilter,
    clearAllChartDrillFilters,
  };
}

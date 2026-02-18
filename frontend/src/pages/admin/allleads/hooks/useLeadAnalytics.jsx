import { useEffect, useMemo, useState, useCallback } from "react";
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
  customFieldFilters,
  filterOperators = {},
  fieldConfigs,
  notify,
}) {
  const [viewMode, setViewMode] = useState("list");
  const [chartType, setChartType] = useState("status");
  const [customFieldName, setCustomFieldName] = useState("");
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
    if (Array.isArray(leadStatus) && leadStatus.length > 0) {
      af.push({ id: "page_status", type: "leadStatus", operator: filterOperators.status || "is", value: leadStatus.join(',') });
    }
    if (Array.isArray(callerFilter) && callerFilter.length > 0) {
      af.push({ id: "page_caller", type: "assignee", operator: filterOperators.caller || "is", value: callerFilter.join(',') });
    }
    if (source !== "All Sources") {
      af.push({ id: "page_source", type: "source", operator: filterOperators.source || "is", value: source });
    }
    if (opdStatus !== "OPD Status") {
      af.push({ id: "page_opd", type: "custom_opd_status", operator: filterOperators.opd || "is", value: opdStatus });
    }
    if (ipdStatus !== "IPD Status") {
      af.push({ id: "page_ipd", type: "custom_ipd_status", operator: filterOperators.ipd || "is", value: ipdStatus });
    }
    if (diagnostics !== "Diagnostics") {
      af.push({ id: "page_diag", type: "custom_diagnostic", operator: filterOperators.diag || "is", value: diagnostics });
    }
    if (Array.isArray(campaignFilter) && campaignFilter.length > 0) {
      af.push({ id: "page_campaign", type: "campaign", operator: filterOperators.campaign || "is", value: campaignFilter.join(',') });
    }
    // Date filter — convert dateMode to dateRange filter for analytics
    if (dateMode && dateMode !== "7d") {
      const now = new Date();
      const dayStart = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.toISOString(); };
      const dayEnd = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x.toISOString(); };

      if (dateMode === "Today") {
        af.push({ id: "page_date", type: "dateRange", from: dayStart(now), to: dayEnd(now) });
      } else if (dateMode === "Yesterday") {
        const y = new Date(now); y.setDate(y.getDate() - 1);
        af.push({ id: "page_date", type: "dateRange", from: dayStart(y), to: dayEnd(y) });
      } else if (dateMode === "30d") {
        const d = new Date(now); d.setDate(d.getDate() - 29);
        af.push({ id: "page_date", type: "dateRange", from: dayStart(d), to: dayEnd(now) });
      } else if (dateMode === "Custom" && customFrom && customTo) {
        af.push({ id: "page_date", type: "dateRange", from: new Date(`${customFrom}T00:00:00`).toISOString(), to: new Date(`${customTo}T23:59:59.999`).toISOString() });
      }
    }
    // Follow-up filter
    if (followupFilter && followupFilter !== "All") {
      af.push({ id: "page_followup", type: "followUp", operator: filterOperators.followup || "is", value: followupFilter });
    }
    // Custom field filters from "Add Condition"
    if (customFieldFilters) {
      for (const [fieldName, { value, operator }] of Object.entries(customFieldFilters)) {
        if (value) {
          af.push({ id: `page_custom_${fieldName}`, type: `custom_${fieldName}`, operator: operator || "is", value });
        }
      }
    }
    return af;
  }, [chartDrillFilters, leadStatus, callerFilter, source, opdStatus, ipdStatus, diagnostics, campaignFilter, dateMode, customFrom, customTo, followupFilter, customFieldFilters, filterOperators]);

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
    if (viewMode === "chart") {
      loadChartData();
    }
  }, [viewMode, loadChartData]);

  const handleBarClick = useCallback((data) => {
    if (!data || !data.name) return;

    let filterType;
    let filterValue = data.name;
    const filterOperator = "is";

    switch (chartType) {
      case "status":
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
  }, [chartType, customFieldName, chartDrillFilters]);

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

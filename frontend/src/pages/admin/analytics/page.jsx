// src/pages/admin/analytics/page.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FiDownload, FiRefreshCw, FiArrowRight } from "react-icons/fi";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";
import { fetchAnalytics, fetchFilterOptions, exportAnalytics, downloadCSV } from "../../../utils/analyticsApi";
import AnalyticsFilters from "../../../components/admin/analytics/AnalyticsFilters";
import {
    StatusBarChart,
    LostReasonsChart,
    AssigneeChart,
    CallsHistogramChart,
    RatingChart,
    CallStatusChart,
    CustomFieldChart,
    ChartLegend,
} from "../../../components/admin/analytics/ChartComponents";
import Loader from "../../../components/Loader";
import { useAuth } from "../../../contexts/AuthContext";
import AccessDenied from "../../../components/AccessDenied";
import PermissionGate from "../../../components/PermissionGate";

const CHART_TYPES = [
    { value: "status", label: "Status" },
    { value: "lostReasons", label: "Lost Reasons" },
    { value: "assignee", label: "Assignee" },
    { value: "rating", label: "Rating" },
    { value: "callStatus", label: "Call Status" },
    { value: "numberOfCalls", label: "Number of Calls" },
    { value: "custom", label: "Custom" },
];

export default function AnalyticsPage() {
    const { hasPermission } = useAuth();
    const navigate = useNavigate();
    usePageTitle("Analytics Dashboard", "Visualize and analyze your lead data");

    // State
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [chartData, setChartData] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [filters, setFilters] = useState([]);
    const [filterOptions, setFilterOptions] = useState({
        callers: [],
        leadStages: [],
        fieldConfigs: [],
        sources: [],
    });
    const [chartType, setChartType] = useState("status");
    const [customFieldName, setCustomFieldName] = useState("");
    const [sortBy, setSortBy] = useState("createdTime");
    const [sortOrder, setSortOrder] = useState("desc");

    // Load filter options on mount
    useEffect(() => {
        loadFilterOptions();
    }, []);

    // Load chart data when filters or chart type changes
    // Load chart data when filters or chart type changes
    useEffect(() => {
        loadChartData();
    }, [filters, chartType, sortBy, sortOrder, customFieldName]);

    const loadFilterOptions = async () => {
        try {
            const response = await fetchFilterOptions();
            if (response.success) {
                setFilterOptions(response.data);
            }
        } catch (error) {
            console.error("Failed to load filter options:", error);
        }
    };

    const loadChartData = async () => {
        try {
            setLoading(true);
            const response = await fetchAnalytics({
                filters,
                chartType,
                sortBy,
                sortOrder,
                fieldName: chartType === "custom" ? customFieldName : undefined,
            });

            if (response.success) {
                setChartData(response.data || []);
                setTotalCount(response.totalCount || 0);
            }
        } catch (error) {
            console.error("Failed to load chart data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        loadChartData();
    };

    const handleExport = async () => {
        try {
            setExporting(true);
            const blob = await exportAnalytics({ filters, format: "csv" });
            downloadCSV(blob, `analytics_${new Date().toISOString().split("T")[0]}.csv`);
        } catch (error) {
            console.error("Failed to export data:", error);
            alert("Failed to export data. Please try again.");
        } finally {
            setExporting(false);
        }
    };

    const handleViewLeads = () => {
        // Navigate to leads page with filters applied
        // For now, just navigate to all leads
        navigate("/leads");
    };

    const handleBarClick = (data, payload, index) => {
        // Add filter based on clicked bar
        if (!data || !data.name) return;

        console.log("Bar clicked:", data, "Chart type:", chartType);

        // Determine filter type based on current chart
        let filterType;
        let filterValue = data.name;
        let filterOperator = "is";

        switch (chartType) {
            case "status":
                filterType = "leadStatus";
                break;
            case "lostReasons":
                filterType = "custom_lost_reason";
                break;
            case "assignee":
                filterType = "assignee";
                // Use userId if available, otherwise use name for "Unassigned"
                filterValue = data.userId || (data.name === "Unassigned" ? "Unassigned" : data.name);
                break;
            case "rating":
                filterType = "custom_rating";
                break;
            case "callStatus":
                filterType = "callStatus"; // Matches new backend handler
                break;
            case "numberOfCalls":
                // For histogram, we need to parse the range
                // e.g., "No calls" -> from: 0, to: 0
                // e.g., "1-2" -> from: 1, to: 2
                // e.g., "100+" -> from: 100, to: ""
                filterType = "totalCalls";
                const rangeMatch = data.name.match(/(\d+)-(\d+)/);
                const plusMatch = data.name.match(/(\d+)\+/);

                if (data.name === "No calls") {
                    const newFilter = {
                        id: Date.now(),
                        type: filterType,
                        from: "0",
                        to: "0",
                    };
                    setFilters([...filters, newFilter]);
                    return;
                } else if (rangeMatch) {
                    const newFilter = {
                        id: Date.now(),
                        type: filterType,
                        from: rangeMatch[1],
                        to: rangeMatch[2],
                    };
                    setFilters([...filters, newFilter]);
                    return;
                } else if (plusMatch) {
                    const newFilter = {
                        id: Date.now(),
                        type: filterType,
                        from: plusMatch[1],
                        to: "",
                    };
                    setFilters([...filters, newFilter]);
                    return;
                }
                return;
            case "custom":
                if (!customFieldName) {
                    console.warn("No custom field selected");
                    return;
                }
                filterType = `custom_${customFieldName}`;
                break;
            default:
                console.warn("Unknown chart type:", chartType);
                return;
        }

        // Check if filter already exists
        const existingFilter = filters.find(
            (f) => f.type === filterType && f.value === filterValue
        );

        if (existingFilter) {
            // Filter already exists, don't add duplicate
            console.log("Filter already exists:", existingFilter);
            return;
        }

        // Add new filter
        const newFilter = {
            id: Date.now(),
            type: filterType,
            operator: filterOperator,
            value: filterValue,
        };

        console.log("Adding filter:", newFilter);
        setFilters([...filters, newFilter]);
    };

    const renderChart = () => {
        if (loading) {
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
            case "custom":
                return (
                    <CustomFieldChart
                        data={chartData}
                        onBarClick={handleBarClick}
                        fieldName={customFieldName}
                    />
                );
            default:
                return <StatusBarChart data={chartData} onBarClick={handleBarClick} />;
        }
    };

    if (!hasPermission("analytics.analytics.view")) return <AccessDenied />;

    return (
        <div className="min-h-screen bg-gray-50/50 p-6">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Visualize and analyze your lead data with interactive charts
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>

                    <PermissionGate permission="analytics.analytics.export">
                        <button
                            onClick={handleExport}
                            disabled={exporting || loading}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <FiDownload className="w-4 h-4" />
                            {exporting ? "Exporting..." : "Export CSV"}
                        </button>
                    </PermissionGate>
                </div>
            </div>

            {/* Filters */}
            <div className="mb-6">
                <AnalyticsFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                    sortBy={sortBy}
                    onSortByChange={setSortBy}
                    sortOrder={sortOrder}
                    onSortOrderChange={setSortOrder}
                    filterOptions={filterOptions}
                />
            </div>

            {/* Filter Breadcrumb - Shows step-by-step filtering path */}
            {filters.length > 0 && (
                <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-indigo-900 mb-2">
                                Filtering Path (Step {filters.length})
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="text-indigo-700 font-medium">All Leads</span>
                                {filters.map((filter, index) => (
                                    <React.Fragment key={filter.id}>
                                        <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                        <span className="text-indigo-700 font-medium">
                                            {filter.type === "leadStatus" && `Status: ${filter.value}`}
                                            {filter.type === "assignee" && `Assignee: ${filterOptions.callers?.find(c => c.id === filter.value)?.name || filter.value}`}
                                            {filter.type === "totalCalls" && `Calls: ${filter.from}${filter.to ? `-${filter.to}` : '+'}`}
                                            {filter.type.startsWith("custom_") && `${filter.type.replace("custom_", "")}: ${filter.value}`}
                                        </span>
                                    </React.Fragment>
                                ))}
                                <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                <span className="px-2 py-1 bg-indigo-600 text-white text-xs font-semibold rounded">
                                    {totalCount.toLocaleString()} leads
                                </span>
                            </div>
                            <p className="text-xs text-indigo-600 mt-2">
                                Each chart now shows data only from these {totalCount.toLocaleString()} filtered leads
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Chart Type Tabs */}
            <div className="mb-6 bg-white border border-gray-200 rounded-lg p-1">
                <div className="flex flex-wrap gap-1">
                    {CHART_TYPES.map((type) => (
                        <button
                            key={type.value}
                            onClick={() => setChartType(type.value)}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${chartType === type.value
                                ? "bg-indigo-600 text-white"
                                : "text-gray-700 hover:bg-gray-100"
                                }`}
                        >
                            {type.label}
                        </button>
                    ))}
                </div>

                {/* Custom Field Selector */}
                {chartType === "custom" && (
                    <div className="mt-3 pt-3 border-t border-gray-200 p-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Custom Field
                        </label>
                        <select
                            value={customFieldName}
                            onChange={(e) => setCustomFieldName(e.target.value)}
                            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="">Select a field...</option>
                            {filterOptions.fieldConfigs?.map((field) => (
                                <option key={field.fieldName} value={field.fieldName}>
                                    {field.displayLabel || field.fieldName}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Chart Container */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                <div className="mb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                {CHART_TYPES.find((t) => t.value === chartType)?.label} Distribution
                                {filters.length > 0 && (
                                    <span className="text-sm font-normal text-indigo-600 ml-2">
                                        (filtered)
                                    </span>
                                )}
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">
                                {filters.length > 0 ? (
                                    <>
                                        Showing <span className="font-medium text-indigo-600">{totalCount.toLocaleString()}</span> leads matching your filters
                                    </>
                                ) : (
                                    <>
                                        Total leads: <span className="font-medium">{totalCount.toLocaleString()}</span>
                                    </>
                                )}
                            </p>
                            {filters.length > 0 && (
                                <p className="text-xs text-gray-500 mt-1">
                                    💡 Click any bar to drill deeper into this filtered data
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {renderChart()}

                {/* Legend */}
                {!loading && chartData.length > 0 && <ChartLegend data={chartData} />}
            </div>

            {/* View Leads Button */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-600">
                            Showing data for{" "}
                            <span className="font-semibold text-gray-900">
                                {totalCount.toLocaleString()} leads
                            </span>
                        </p>
                        {filters.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                                {filters.length} filter{filters.length > 1 ? "s" : ""} applied
                            </p>
                        )}
                    </div>

                    <button
                        onClick={handleViewLeads}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                        View {totalCount.toLocaleString()} leads
                        <FiArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

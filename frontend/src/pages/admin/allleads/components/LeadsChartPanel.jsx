import React from "react";
import { Segmented, Button, Select, Card, Tag, Space } from "antd";
import { FiRefreshCw, FiDownload } from "react-icons/fi";
import { ChartLegend } from "../../../../components/admin/analytics/ChartComponents";
import { CHART_TYPES } from "../hooks/useLeadAnalytics.jsx";

export default function LeadsChartPanel({
  chartType,
  setChartType,
  customFieldName,
  setCustomFieldName,
  chartData,
  chartTotalCount,
  chartLoading,
  exporting,
  chartDrillFilters,
  analyticsFilterOptions,
  mergedAnalyticsFilters,
  loadChartData,
  handleExportCSV,
  renderChart,
  fieldConfigs,
}) {
  return (
    <section className="mb-6 space-y-4">
      {/* Drill-down Breadcrumb */}
      {chartDrillFilters.length > 0 && (
        <Card size="small" style={{ backgroundColor: "#eef2ff", borderColor: "#c7d2fe" }}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-indigo-900 mb-2">
                Filtering Path (Step {chartDrillFilters.length})
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-indigo-700 font-medium">Filtered Leads</span>
                {chartDrillFilters.map((filter) => (
                  <React.Fragment key={filter.id}>
                    <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-indigo-700 font-medium">
                      {filter.type === "leadStatus" && `Status: ${filter.value}`}
                      {filter.type === "assignee" && `Assignee: ${analyticsFilterOptions.callers?.find(c => c.id === filter.value)?.name || filter.value}`}
                      {filter.type === "totalCalls" && `Calls: ${filter.from}${filter.to ? `-${filter.to}` : "+"}`}
                      {filter.type === "callStatus" && `Call Status: ${filter.value}`}
                      {filter.type === "source" && `Source: ${filter.value}`}
                      {filter.type === "followUp" && `Follow Up: ${filter.value}`}
                      {filter.type === "custom_city" && `City: ${filter.value}`}
                      {filter.type === "custom_state" && `State: ${filter.value}`}
                      {filter.type.startsWith("custom_") && !["custom_city", "custom_state"].includes(filter.type) && `${filter.type.replace("custom_", "")}: ${filter.value}`}
                    </span>
                  </React.Fragment>
                ))}
                <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <Tag color="blue">{chartTotalCount.toLocaleString()} leads</Tag>
              </div>
              <p className="text-xs text-indigo-600 mt-2">
                Each chart now shows data only from these {chartTotalCount.toLocaleString()} filtered leads
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Chart Type Tabs + Actions */}
      <Card size="small" bodyStyle={{ padding: "8px" }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Segmented
            value={chartType}
            onChange={setChartType}
            options={CHART_TYPES.map((t) => ({ label: t.label, value: t.value }))}
          />
          <Space>
            <Button
              icon={<FiRefreshCw className={chartLoading ? "animate-spin" : ""} />}
              onClick={loadChartData}
              loading={chartLoading}
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<FiDownload />}
              onClick={handleExportCSV}
              loading={exporting}
              disabled={chartLoading}
            >
              {exporting ? "Exporting..." : "Export CSV"}
            </Button>
          </Space>
        </div>

        {/* Custom Field Selector */}
        {chartType === "custom" && (
          <div className="mt-3 pt-3 border-t border-gray-200 px-2 pb-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Custom Field
            </label>
            <Select
              value={customFieldName || undefined}
              onChange={setCustomFieldName}
              placeholder="Select a field..."
              style={{ width: 280 }}
              options={fieldConfigs.map((field) => ({
                label: field.displayLabel || field.fieldName,
                value: field.fieldName,
              }))}
              allowClear
            />
          </div>
        )}
      </Card>

      {/* Chart Container */}
      <Card>
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {CHART_TYPES.find((t) => t.value === chartType)?.label} Distribution
                {(chartDrillFilters.length > 0 || mergedAnalyticsFilters.length > chartDrillFilters.length) && (
                  <span className="text-sm font-normal text-indigo-600 ml-2">(filtered)</span>
                )}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {mergedAnalyticsFilters.length > 0 ? (
                  <>Showing <span className="font-medium text-indigo-600">{chartTotalCount.toLocaleString()}</span> leads matching your filters</>
                ) : (
                  <>Total leads: <span className="font-medium">{chartTotalCount.toLocaleString()}</span></>
                )}
              </p>
              <p className="text-xs text-gray-500 mt-1">Click any bar to drill deeper into the data</p>
            </div>
          </div>
        </div>

        {renderChart()}

        {!chartLoading && chartData.length > 0 && <ChartLegend data={chartData} />}
      </Card>
    </section>
  );
}

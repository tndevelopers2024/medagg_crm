import React, { useState, useMemo } from "react";
import { Select, Segmented, Empty } from "antd";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
];

export default function ChartPanel({
  data = [],
  metrics = [],
  defaultMetric,
  nameKey = "name",
  filters = [],
}) {
  const [selectedMetric, setSelectedMetric] = useState(defaultMetric || metrics[0]?.key);
  const [chartType, setChartType] = useState("bar");
  const [activeFilters, setActiveFilters] = useState(() =>
    Object.fromEntries(filters.map((f) => [f.key, "All"]))
  );

  // Extract unique filter options from data
  const filterOptions = useMemo(() => {
    const opts = {};
    for (const f of filters) {
      const values = [...new Set(data.map((d) => d[f.key]).filter(Boolean))].sort();
      opts[f.key] = ["All", ...values];
    }
    return opts;
  }, [data, filters]);

  // Apply all active filters
  const filteredData = useMemo(() => {
    return data.filter((d) =>
      filters.every((f) => activeFilters[f.key] === "All" || d[f.key] === activeFilters[f.key])
    );
  }, [data, filters, activeFilters]);

  // Build chart data sorted desc, limited
  const chartData = useMemo(() => {
    const metric = selectedMetric;
    const mapped = filteredData
      .map((d) => ({ name: String(d[nameKey] || "—"), value: Number(d[metric]) || 0 }))
      .sort((a, b) => b.value - a.value);

    if (chartType === "pie") {
      const top = mapped.slice(0, 10);
      const rest = mapped.slice(10);
      if (rest.length) {
        top.push({ name: "Others", value: rest.reduce((s, d) => s + d.value, 0) });
      }
      return top;
    }
    return mapped.slice(0, 15);
  }, [filteredData, selectedMetric, nameKey, chartType]);

  const metricColor = metrics.find((m) => m.key === selectedMetric)?.color || COLORS[0];

  const handleFilterChange = (key, value) => {
    setActiveFilters((prev) => ({ ...prev, [key]: value }));
  };

  if (!data.length) return null;

  return (
    <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {filters.map((f) => (
          <Select
            key={f.key}
            size="small"
            value={activeFilters[f.key]}
            onChange={(v) => handleFilterChange(f.key, v)}
            style={{ minWidth: 140 }}
            options={(filterOptions[f.key] || []).map((v) => ({ label: v, value: v }))}
          />
        ))}
        <div className="flex-1" />
        <Select
          size="small"
          value={selectedMetric}
          onChange={setSelectedMetric}
          style={{ minWidth: 140 }}
          options={metrics.map((m) => ({ label: m.label, value: m.key }))}
        />
        <Segmented
          size="small"
          value={chartType}
          onChange={setChartType}
          options={[
            { label: "Bar", value: "bar" },
            { label: "Pie", value: "pie" },
          ]}
        />
      </div>

      {/* Chart */}
      {!chartData.length ? (
        <Empty description="No data to chart" className="py-8" />
      ) : chartType === "bar" ? (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart layout="vertical" data={chartData} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" fill={metricColor} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={120}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// src/components/admin/analytics/ChartComponents.jsx
import React from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";

// Color palette matching the design
const COLORS = [
    "#6366f1", // Indigo
    "#06b6d4", // Cyan
    "#f59e0b", // Amber
    "#10b981", // Emerald
    "#ef4444", // Red
    "#8b5cf6", // Violet
    "#ec4899", // Pink
    "#14b8a6", // Teal
    "#f97316", // Orange
    "#6b7280", // Gray
];

/**
 * Custom tooltip for charts
 */
const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
            <p className="font-semibold text-gray-900">{data.name}</p>
            <p className="text-sm text-gray-600">
                Count: <span className="font-medium">{data.count.toLocaleString()}</span>
            </p>
            <p className="text-sm text-gray-600">
                Percentage: <span className="font-medium">{data.percentage}%</span>
            </p>
            <p className="text-xs text-indigo-600 mt-2 border-t border-gray-200 pt-2">
                💡 Click to filter by this value
            </p>
        </div>
    );
};

/**
 * Status Bar Chart Component
 */
export const StatusBarChart = ({ data, onBarClick }) => {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 text-gray-500">
                No status data available
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                    dataKey="name"
                    stroke="#6b7280"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                />
                <YAxis stroke="#6b7280" />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99, 102, 241, 0.1)" }} />
                <Bar
                    dataKey="count"
                    maxBarSize={60}
                    radius={[8, 8, 0, 0]}
                    onClick={onBarClick}
                    cursor="pointer"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

/**
 * Lost Reasons Chart Component
 */
export const LostReasonsChart = ({ data, onBarClick }) => {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 text-gray-500">
                No lost reasons data available
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                    dataKey="name"
                    stroke="#6b7280"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                />
                <YAxis stroke="#6b7280" />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99, 102, 241, 0.1)" }} />
                <Bar
                    dataKey="count"
                    maxBarSize={60}
                    radius={[8, 8, 0, 0]}
                    onClick={onBarClick}
                    cursor="pointer"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

/**
 * Assignee Distribution Chart Component
 */
export const AssigneeChart = ({ data, onBarClick }) => {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 text-gray-500">
                No assignee data available
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                    dataKey="name"
                    stroke="#6b7280"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                />
                <YAxis stroke="#6b7280" />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99, 102, 241, 0.1)" }} />
                <Bar
                    dataKey="count"
                    fill="#6366f1"
                    maxBarSize={60}
                    radius={[8, 8, 0, 0]}
                    onClick={onBarClick}
                    cursor="pointer"
                />
            </BarChart>
        </ResponsiveContainer>
    );
};

/**
 * Number of Calls Histogram Component
 */
export const CallsHistogramChart = ({ data, onBarClick }) => {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 text-gray-500">
                No call data available
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99, 102, 241, 0.1)" }} />
                <Bar
                    dataKey="count"
                    fill="#8b5cf6"
                    maxBarSize={60}
                    radius={[8, 8, 0, 0]}
                    onClick={onBarClick}
                    cursor="pointer"
                />
            </BarChart>
        </ResponsiveContainer>
    );
};

/**
 * Rating Distribution Chart Component
 */
export const RatingChart = ({ data, onBarClick }) => {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 text-gray-500">
                No rating data available
            </div>
        );
    }

    // Color code by rating (assuming ratings are numeric or star-based)
    const getRatingColor = (rating) => {
        const ratingNum = parseInt(rating);
        if (ratingNum >= 4) return "#10b981"; // Green for high ratings
        if (ratingNum >= 3) return "#f59e0b"; // Amber for medium
        return "#ef4444"; // Red for low
    };

    return (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99, 102, 241, 0.1)" }} />
                <Bar
                    dataKey="count"
                    maxBarSize={60}
                    radius={[8, 8, 0, 0]}
                    onClick={onBarClick}
                    cursor="pointer"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getRatingColor(entry.name)} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

/**
 * Call Status Distribution Chart Component
 */
export const CallStatusChart = ({ data, onBarClick }) => {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 text-gray-500">
                No call status data available
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                    dataKey="name"
                    stroke="#6b7280"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                />
                <YAxis stroke="#6b7280" />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99, 102, 241, 0.1)" }} />
                <Bar
                    dataKey="count"
                    maxBarSize={60}
                    radius={[8, 8, 0, 0]}
                    onClick={onBarClick}
                    cursor="pointer"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

/**
 * Custom Field Chart Component (Generic)
 */
export const CustomFieldChart = ({ data, onBarClick, fieldName }) => {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 text-gray-500">
                No data available for {fieldName || "this field"}
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                    dataKey="name"
                    stroke="#6b7280"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                />
                <YAxis stroke="#6b7280" />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99, 102, 241, 0.1)" }} />
                <Bar
                    dataKey="count"
                    maxBarSize={60}
                    radius={[8, 8, 0, 0]}
                    onClick={onBarClick}
                    cursor="pointer"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

/**
 * Chart Legend Component
 */
export const ChartLegend = ({ data }) => {
    if (!data || data.length === 0) return null;

    return (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-500">
                            {item.count.toLocaleString()} ({item.percentage}%)
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
};

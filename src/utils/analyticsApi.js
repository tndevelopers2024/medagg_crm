// src/utils/analyticsApi.js
import { apiClient as api } from "./api";

/**
 * Fetch analytics data with filters
 * @param {Object} params - { filters, chartType, sortBy, sortOrder, fieldName }
 * @returns {Promise<Object>} Analytics data
 */
export const fetchAnalytics = async ({ filters = [], chartType = "status", sortBy = "createdTime", sortOrder = "desc", fieldName }) => {
    try {
        const response = await api.post("/analytics/leads", {
            filters,
            chartType,
            sortBy,
            sortOrder,
            fieldName, // For custom field charts
        });
        return response.data;
    } catch (error) {
        console.error("Fetch analytics error:", error);
        throw error;
    }
};

/**
 * Fetch available filter options
 * @returns {Promise<Object>} Filter options (callers, leadStages, fieldConfigs, sources)
 */
export const fetchFilterOptions = async () => {
    try {
        const response = await api.get("/analytics/filters");
        return response.data;
    } catch (error) {
        console.error("Fetch filter options error:", error);
        throw error;
    }
};

/**
 * Export analytics data
 * @param {Object} params - { filters, format }
 * @returns {Promise<Blob>} CSV or JSON data
 */
export const exportAnalytics = async ({ filters = [], format = "csv" }) => {
    try {
        const response = await api.post("/analytics/export", {
            filters,
            format,
        }, {
            responseType: format === "csv" ? "blob" : "json",
        });
        return response.data;
    } catch (error) {
        console.error("Export analytics error:", error);
        throw error;
    }
};

/**
 * Download CSV file
 * @param {Blob} blob - CSV blob data
 * @param {String} filename - Filename for download
 */
export const downloadCSV = (blob, filename = "analytics.csv") => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

import { useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/api/v1" : "http://localhost:5013/api/v1");

export default function useLeadExport() {
    const [exporting, setExporting] = useState(false);

    const exportLeads = async (filters, columns, exportAll = false, page = 1, pageSize = 20) => {
        setExporting(true);
        try {
            const token = localStorage.getItem("token");

            const response = await axios.post(
                `${API_URL}/export/leads`,
                {
                    filters,
                    columns,
                    exportAll,
                    page,
                    pageSize,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    responseType: "blob", // Important for file download
                }
            );

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;

            // Generate filename with timestamp
            const timestamp = new Date().toISOString().split("T")[0];
            const exportType = exportAll ? "all" : "page";
            link.setAttribute("download", `leads-export-${exportType}-${timestamp}.csv`);

            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            return { success: true };
        } catch (error) {
            console.error("Export error:", error);
            return {
                success: false,
                error: error.response?.data?.error || "Failed to export leads",
            };
        } finally {
            setExporting(false);
        }
    };

    return {
        exportLeads,
        exporting,
    };
}

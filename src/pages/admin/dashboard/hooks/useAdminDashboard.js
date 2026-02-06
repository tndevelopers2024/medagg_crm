import { useState, useCallback, useEffect, useRef } from "react";
import { fetchAdminDashboardV2 } from "../../../../utils/api";

const DEFAULT_DATA = {
  kpiCards: {},
  cityDoctorSummary: [],
  campaignWise: [],
  campWise: [],
  bdActivityTracker: [],
  bdPerformanceSummary: [],
};

export default function useAdminDashboard() {
  const [datePreset, setDatePreset] = useState("today");
  const [customRange, setCustomRange] = useState({ from: "", to: "" });
  const [data, setData] = useState(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const lastRefreshRef = useRef(0);

  const buildParams = useCallback(() => {
    const params = { datePreset };
    if (datePreset === "custom" && customRange.from && customRange.to) {
      params.from = customRange.from;
      params.to = customRange.to;
    }
    return params;
  }, [datePreset, customRange]);

  const refresh = useCallback(async () => {
    const now = Date.now();
    if (now - lastRefreshRef.current < 1200) return;
    lastRefreshRef.current = now;
    try {
      const result = await fetchAdminDashboardV2(buildParams());
      setData(result || DEFAULT_DATA);
    } catch (err) {
      console.error("Dashboard V2 fetch error:", err);
    }
  }, [buildParams]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminDashboardV2(buildParams());
      setData(result || DEFAULT_DATA);
    } catch (err) {
      console.error("Dashboard V2 load error:", err);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    data,
    loading,
    refresh,
    datePreset,
    setDatePreset,
    customRange,
    setCustomRange,
  };
}

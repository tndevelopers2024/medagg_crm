import { useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminDashboardV2 } from "../../../../hooks/queries/useAdminStatsQueries";

const DEFAULT_DATA = {
  kpiCards: {},
  cityDoctorSummary: [],
  campaignWise: [],
  campWise: [],
  bdActivityTracker: [],
  bdPerformanceSummary: [],
};

export default function useAdminDashboard() {
  const queryClient = useQueryClient();
  const [scope, setScope] = useState("all");
  const [datePreset, setDatePreset] = useState("today");
  const [customRange, setCustomRange] = useState({ from: "", to: "" });

  const params = useMemo(() => {
    const p = { datePreset, scope };
    if (datePreset === "custom" && customRange.from && customRange.to) {
      p.from = customRange.from;
      p.to = customRange.to;
    }
    return p;
  }, [datePreset, customRange, scope]);

  const { data, isLoading: loading } = useAdminDashboardV2(params);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["adminDashboardV2"] });
  }, [queryClient]);

  return {
    data: data || DEFAULT_DATA,
    loading,
    refresh,
    datePreset,
    setDatePreset,
    customRange,
    setCustomRange,
    scope,
    setScope,
  };
}

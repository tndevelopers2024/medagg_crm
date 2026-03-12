import { useCallback, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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

const VALID_PRESETS = ["today", "yesterday", "this_week", "last_week", "this_month", "last_month", "custom"];
const VALID_SCOPES  = ["all", "team", "assigned"];

export default function useAdminDashboard() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial state from URL
  const rawPreset = searchParams.get("dp");
  const rawScope  = searchParams.get("scope");
  const rawFrom   = searchParams.get("from") || "";
  const rawTo     = searchParams.get("to")   || "";

  const datePreset  = VALID_PRESETS.includes(rawPreset) ? rawPreset : "today";
  const scope       = VALID_SCOPES.includes(rawScope)   ? rawScope  : "all";
  const customRange = { from: rawFrom, to: rawTo };

  const setDatePreset = useCallback((preset) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (preset === "today") {
        next.delete("dp");
      } else {
        next.set("dp", preset);
      }
      // Clear custom range when switching away from custom
      if (preset !== "custom") {
        next.delete("from");
        next.delete("to");
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setCustomRange = useCallback(({ from, to }) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (from) next.set("from", from); else next.delete("from");
      if (to)   next.set("to", to);     else next.delete("to");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setScope = useCallback((s) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (s === "all") {
        next.delete("scope");
      } else {
        next.set("scope", s);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const params = useMemo(() => {
    const p = { datePreset, scope };
    if (datePreset === "custom" && customRange.from && customRange.to) {
      p.from = customRange.from;
      p.to   = customRange.to;
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

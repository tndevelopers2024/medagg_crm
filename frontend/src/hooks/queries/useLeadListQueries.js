import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { fetchAllLeads, fetchLeadFilterMeta } from "../../utils/api";

const LIST_STALE_TIME = 30 * 1000; // 30 seconds

export function useLeadList(params = {}, { enabled = true } = {}) {
  // Always use fetchAllLeads — the backend getAllLeads controller handles
  // permission-based filtering (callers only see assigned leads).
  return useQuery({
    queryKey: queryKeys.leadList(params),
    queryFn: () => fetchAllLeads(params),
    staleTime: LIST_STALE_TIME,
    placeholderData: (prev) => prev, // keepPreviousData for smooth pagination
    enabled,
  });
}

export function useFilterMeta(options = {}) {
  return useQuery({
    queryKey: queryKeys.filterMeta(),
    queryFn: fetchLeadFilterMeta,
    staleTime: LIST_STALE_TIME,
    ...options,
  });
}

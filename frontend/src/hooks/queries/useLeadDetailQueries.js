import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { fetchLeadDetail, fetchLeadActivities, fetchLeadCallLogs } from "../../utils/api";

const DETAIL_STALE_TIME = 60 * 1000; // 60 seconds

export function useLeadDetail(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.leadDetail(id),
    queryFn: () => fetchLeadDetail(id),
    staleTime: DETAIL_STALE_TIME,
    enabled: !!id,
    ...options,
  });
}

export function useLeadActivities(leadId, params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.leadActivities(leadId, params),
    queryFn: () => fetchLeadActivities(leadId, params),
    staleTime: DETAIL_STALE_TIME,
    enabled: !!leadId,
    ...options,
  });
}

export function useLeadCallLogs(leadId, options = {}) {
  return useQuery({
    queryKey: queryKeys.leadCallLogs(leadId),
    queryFn: () => fetchLeadCallLogs(leadId),
    staleTime: DETAIL_STALE_TIME,
    enabled: !!leadId,
    ...options,
  });
}

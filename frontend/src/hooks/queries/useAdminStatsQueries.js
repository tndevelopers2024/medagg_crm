import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { fetchAdminDashboardV2 } from "../../utils/api";

const STATS_STALE_TIME = 2 * 60 * 1000; // 2 minutes

export function useAdminDashboardV2(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.adminDashboardV2(params),
    queryFn: () => fetchAdminDashboardV2(params),
    staleTime: STATS_STALE_TIME,
    ...options,
  });
}

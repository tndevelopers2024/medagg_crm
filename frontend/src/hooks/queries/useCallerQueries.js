import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import {
  fetchTodayFollowUps,
  fetchTomorrowFollowUps,
  fetchDashboardStats,
  fetchMyStats,
} from "../../utils/api";

const DETAIL_STALE_TIME = 60 * 1000; // 60 seconds
const STATS_STALE_TIME = 2 * 60 * 1000; // 2 minutes

export function useTodayFollowUps(options = {}) {
  return useQuery({
    queryKey: queryKeys.todayFollowUps(),
    queryFn: fetchTodayFollowUps,
    staleTime: DETAIL_STALE_TIME,
    ...options,
  });
}

export function useTomorrowFollowUps(options = {}) {
  return useQuery({
    queryKey: queryKeys.tomorrowFollowUps(),
    queryFn: fetchTomorrowFollowUps,
    staleTime: DETAIL_STALE_TIME,
    ...options,
  });
}

export function useCallerDashboardStats(options = {}) {
  return useQuery({
    queryKey: queryKeys.dashboardStats(),
    queryFn: fetchDashboardStats,
    staleTime: STATS_STALE_TIME,
    ...options,
  });
}

export function useCallerStats(options = {}) {
  return useQuery({
    queryKey: queryKeys.callerStats(),
    queryFn: fetchMyStats,
    staleTime: STATS_STALE_TIME,
    ...options,
  });
}

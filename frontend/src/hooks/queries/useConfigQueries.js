import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import {
  fetchLeadFields,
  fetchBookingFields,
  fetchLeadStages,
  fetchCampaigns,
  getAllUsers,
} from "../../utils/api";

const CONFIG_STALE_TIME = 5 * 60 * 1000; // 5 minutes

export function useLeadFields(params = { active: true }, options = {}) {
  return useQuery({
    queryKey: queryKeys.leadFields(params),
    queryFn: () => fetchLeadFields(params).then((res) => res.data || []),
    staleTime: CONFIG_STALE_TIME,
    ...options,
  });
}

export function useBookingFields(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.bookingFields(params),
    queryFn: () => fetchBookingFields(params).then((res) => res.data || []),
    staleTime: CONFIG_STALE_TIME,
    ...options,
  });
}

export function useLeadStages(params = { active: true }, options = {}) {
  return useQuery({
    queryKey: queryKeys.leadStages(params),
    queryFn: () => fetchLeadStages(params).then((res) => res.data || []),
    staleTime: CONFIG_STALE_TIME,
    ...options,
  });
}

export function useCampaigns(params = { limit: 1000 }, options = {}) {
  return useQuery({
    queryKey: queryKeys.campaigns(params),
    queryFn: () => fetchCampaigns(params).then((res) => res?.data || []),
    staleTime: CONFIG_STALE_TIME,
    ...options,
  });
}

export function useUsers(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.users(params),
    queryFn: () => getAllUsers(params),
    staleTime: CONFIG_STALE_TIME,
    ...options,
  });
}

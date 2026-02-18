import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateLeadStatus,
  updateLeadDetails,
  logCall,
  deferLeadToNextDay,
  createLead,
  assignLeadsToCaller,
  assignLeadsByLocation,
  deleteLeads,
  bulkUpdateLeads,
  bulkUpdateByFilter,
  addOpBooking,
  updateOpBooking,
  removeOpBooking,
  addIpBooking,
  updateIpBooking,
  removeIpBooking,
  addDiagnosticBooking,
  updateDiagnosticBooking,
  removeDiagnosticBooking,
  createAlarm,
  updateAlarm,
  deleteAlarm as deleteAlarmApi,
  createHelpRequest,
  respondToHelpRequest,
} from "../../utils/api";

/**
 * Invalidation helpers — call after successful mutations to keep cache fresh.
 */
function invalidateLeadRelated(queryClient, leadId) {
  queryClient.invalidateQueries({ queryKey: ["leadList"] });
  queryClient.invalidateQueries({ queryKey: ["filterMeta"] });
  if (leadId) {
    queryClient.invalidateQueries({ queryKey: ["leadDetail", leadId] });
    queryClient.invalidateQueries({ queryKey: ["leadActivities", leadId] });
    queryClient.invalidateQueries({ queryKey: ["leadCallLogs", leadId] });
  }
  queryClient.invalidateQueries({ queryKey: ["adminDashboardV2"] });
  queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
  queryClient.invalidateQueries({ queryKey: ["todayFollowUps"] });
  queryClient.invalidateQueries({ queryKey: ["tomorrowFollowUps"] });
}

// --- Lead mutations ---

export function useUpdateLeadStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateLeadStatus(id, payload),
    onSuccess: (_data, { id }) => invalidateLeadRelated(qc, id),
  });
}

export function useUpdateLeadDetails() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateLeadDetails(id, payload),
    onSuccess: (_data, { id }) => invalidateLeadRelated(qc, id),
  });
}

export function useLogCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => logCall(id, payload),
    onSuccess: (_data, { id }) => invalidateLeadRelated(qc, id),
  });
}

export function useDeferLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, opts }) => deferLeadToNextDay(id, opts),
    onSuccess: (_data, { id }) => invalidateLeadRelated(qc, id),
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => createLead(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leadList"] });
      qc.invalidateQueries({ queryKey: ["filterMeta"] });
    },
  });
}

export function useAssignLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadIds, callerId }) => assignLeadsToCaller(leadIds, callerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leadList"] });
      qc.invalidateQueries({ queryKey: ["filterMeta"] });
    },
  });
}

export function useAssignByLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => assignLeadsByLocation(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leadList"] });
      qc.invalidateQueries({ queryKey: ["filterMeta"] });
    },
  });
}

export function useDeleteLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (leadIds) => deleteLeads(leadIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leadList"] });
      qc.invalidateQueries({ queryKey: ["filterMeta"] });
    },
  });
}

export function useBulkUpdateLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => bulkUpdateLeads(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leadList"] });
      qc.invalidateQueries({ queryKey: ["filterMeta"] });
    },
  });
}

export function useBulkUpdateByFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => bulkUpdateByFilter(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leadList"] });
      qc.invalidateQueries({ queryKey: ["filterMeta"] });
    },
  });
}

// --- Booking mutations ---

export function useAddOpBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, payload }) => addOpBooking(leadId, payload),
    onSuccess: (_data, { leadId }) => invalidateLeadRelated(qc, leadId),
  });
}

export function useUpdateOpBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, bookingId, payload }) => updateOpBooking(leadId, bookingId, payload),
    onSuccess: (_data, { leadId }) => invalidateLeadRelated(qc, leadId),
  });
}

export function useRemoveOpBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, bookingId }) => removeOpBooking(leadId, bookingId),
    onSuccess: (_data, { leadId }) => invalidateLeadRelated(qc, leadId),
  });
}

export function useAddIpBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, payload }) => addIpBooking(leadId, payload),
    onSuccess: (_data, { leadId }) => invalidateLeadRelated(qc, leadId),
  });
}

export function useUpdateIpBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, bookingId, payload }) => updateIpBooking(leadId, bookingId, payload),
    onSuccess: (_data, { leadId }) => invalidateLeadRelated(qc, leadId),
  });
}

export function useRemoveIpBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, bookingId }) => removeIpBooking(leadId, bookingId),
    onSuccess: (_data, { leadId }) => invalidateLeadRelated(qc, leadId),
  });
}

export function useAddDiagnosticBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, payload }) => addDiagnosticBooking(leadId, payload),
    onSuccess: (_data, { leadId }) => invalidateLeadRelated(qc, leadId),
  });
}

export function useUpdateDiagnosticBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, bookingId, payload }) => updateDiagnosticBooking(leadId, bookingId, payload),
    onSuccess: (_data, { leadId }) => invalidateLeadRelated(qc, leadId),
  });
}

export function useRemoveDiagnosticBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, bookingId }) => removeDiagnosticBooking(leadId, bookingId),
    onSuccess: (_data, { leadId }) => invalidateLeadRelated(qc, leadId),
  });
}

// --- Alarm mutations ---

export function useCreateAlarm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, alarmTime, notes }) => createAlarm(leadId, alarmTime, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alarmsCount"] });
      qc.invalidateQueries({ queryKey: ["alarms"] });
    },
  });
}

export function useUpdateAlarm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateAlarm(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alarmsCount"] });
      qc.invalidateQueries({ queryKey: ["alarms"] });
    },
  });
}

export function useDeleteAlarm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteAlarmApi(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alarmsCount"] });
      qc.invalidateQueries({ queryKey: ["alarms"] });
    },
  });
}

// --- Help request mutations ---

export function useCreateHelpRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => createHelpRequest(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sentHelpRequests"] });
    },
  });
}

export function useRespondToHelpRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }) => respondToHelpRequest(id, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incomingHelpRequests"] });
    },
  });
}

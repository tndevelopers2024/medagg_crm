import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "../../contexts/SocketProvider";

const DEBOUNCE_MS = 2000;

/**
 * Central hook that maps socket events to React Query cache invalidations.
 * Mount once in AdminLayout.jsx. Individual page hooks only handle UI (toasts, highlights).
 */
export default function useSocketInvalidation() {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();
  const timerRef = useRef(null);

  const debouncedInvalidateLists = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["leadList"] });
      queryClient.invalidateQueries({ queryKey: ["filterMeta"] });
    }, DEBOUNCE_MS);
  }, [queryClient]);

  const invalidateDetail = useCallback((leadId) => {
    if (!leadId) return;
    queryClient.invalidateQueries({ queryKey: ["leadDetail", leadId] });
    queryClient.invalidateQueries({ queryKey: ["leadActivities", leadId] });
    queryClient.invalidateQueries({ queryKey: ["leadCallLogs", leadId] });
  }, [queryClient]);

  const invalidateStats = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["adminDashboardV2"] });
    queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    queryClient.invalidateQueries({ queryKey: ["callerStats"] });
    queryClient.invalidateQueries({ queryKey: ["todayFollowUps"] });
    queryClient.invalidateQueries({ queryKey: ["tomorrowFollowUps"] });
  }, [queryClient]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const onLeadChange = (p = {}) => {
      const leadId = p.lead_id || p.id || p._id || p.leadId || p?.lead?.id || p?.lead?._id || "";
      debouncedInvalidateLists();
      invalidateDetail(leadId);
      invalidateStats();
    };

    const onCallLogged = (p = {}) => {
      const leadId = p?.lead?.id || p?.leadId || "";
      debouncedInvalidateLists();
      invalidateDetail(leadId);
      invalidateStats();
    };

    const onLeadsAssigned = () => {
      debouncedInvalidateLists();
      invalidateStats();
    };

    socket.on?.("lead:intake", onLeadChange);
    socket.on?.("lead:created", onLeadChange);
    socket.on?.("lead:updated", onLeadChange);
    socket.on?.("lead:status_updated", onLeadChange);
    socket.on?.("lead:activity", onLeadChange);
    socket.on?.("call:logged", onCallLogged);
    socket.on?.("leads:assigned", onLeadsAssigned);

    return () => {
      socket.off?.("lead:intake", onLeadChange);
      socket.off?.("lead:created", onLeadChange);
      socket.off?.("lead:updated", onLeadChange);
      socket.off?.("lead:status_updated", onLeadChange);
      socket.off?.("lead:activity", onLeadChange);
      socket.off?.("call:logged", onCallLogged);
      socket.off?.("leads:assigned", onLeadsAssigned);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [socket, isConnected, debouncedInvalidateLists, invalidateDetail, invalidateStats]);
}

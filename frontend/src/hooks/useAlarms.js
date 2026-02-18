import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./queries/queryKeys";
import {
    createAlarm,
    getUserAlarms,
    getActiveAlarmsCount,
    getLeadAlarm,
    updateAlarm,
    deleteAlarm,
} from "../utils/api";

export default function useAlarms() {
    const queryClient = useQueryClient();

    // Active alarm count — polls every 60s (volatile tier)
    const { data: activeCount = 0 } = useQuery({
        queryKey: queryKeys.alarmsCount(),
        queryFn: getActiveAlarmsCount,
        staleTime: 0,
        refetchInterval: 60000,
    });

    // Alarms list — fetched on demand via loadAlarms
    const { data: alarms = [], isLoading: loading, refetch: refetchAlarms } = useQuery({
        queryKey: queryKeys.alarms("active"),
        queryFn: () => getUserAlarms("active"),
        staleTime: 30 * 1000,
    });

    const loadAlarms = useCallback(async (status = "active") => {
        if (status === "active") {
            await refetchAlarms();
        } else {
            // For non-active status, do a direct fetch and update cache
            const data = await getUserAlarms(status);
            queryClient.setQueryData(queryKeys.alarms(status), data);
        }
    }, [refetchAlarms, queryClient]);

    const loadActiveCount = useCallback(async () => {
        await queryClient.invalidateQueries({ queryKey: queryKeys.alarmsCount() });
    }, [queryClient]);

    const getAlarmForLead = useCallback(async (leadId) => {
        try {
            const alarm = await getLeadAlarm(leadId);
            return alarm;
        } catch (error) {
            console.error("Get lead alarm error:", error);
            return null;
        }
    }, []);

    const handleCreateAlarm = useCallback(async (leadId, alarmTime, notes = "") => {
        try {
            const alarm = await createAlarm(leadId, alarmTime, notes);
            queryClient.invalidateQueries({ queryKey: ["alarmsCount"] });
            queryClient.invalidateQueries({ queryKey: ["alarms"] });
            return alarm;
        } catch (error) {
            console.error("Create alarm error:", error);
            throw error;
        }
    }, [queryClient]);

    const handleSnoozeAlarm = useCallback(async (id, minutes) => {
        try {
            const snoozedUntil = new Date(Date.now() + minutes * 60000);
            const alarm = await updateAlarm(id, {
                status: "snoozed",
                snoozedUntil: snoozedUntil.toISOString(),
            });
            queryClient.invalidateQueries({ queryKey: ["alarmsCount"] });
            queryClient.invalidateQueries({ queryKey: ["alarms"] });
            return alarm;
        } catch (error) {
            console.error("Snooze alarm error:", error);
            throw error;
        }
    }, [queryClient]);

    const handleDismissAlarm = useCallback(async (id) => {
        try {
            const alarm = await updateAlarm(id, { status: "dismissed" });
            queryClient.invalidateQueries({ queryKey: ["alarmsCount"] });
            queryClient.invalidateQueries({ queryKey: ["alarms"] });
            return alarm;
        } catch (error) {
            console.error("Dismiss alarm error:", error);
            throw error;
        }
    }, [queryClient]);

    const handleDeleteAlarm = useCallback(async (id) => {
        try {
            await deleteAlarm(id);
            queryClient.invalidateQueries({ queryKey: ["alarmsCount"] });
            queryClient.invalidateQueries({ queryKey: ["alarms"] });
        } catch (error) {
            console.error("Delete alarm error:", error);
            throw error;
        }
    }, [queryClient]);

    return {
        alarms,
        activeCount,
        loading,
        loadAlarms,
        loadActiveCount,
        getAlarmForLead,
        createAlarm: handleCreateAlarm,
        snoozeAlarm: handleSnoozeAlarm,
        dismissAlarm: handleDismissAlarm,
        deleteAlarm: handleDeleteAlarm,
    };
}

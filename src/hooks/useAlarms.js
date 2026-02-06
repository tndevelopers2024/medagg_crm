import { useState, useEffect, useCallback } from "react";
import {
    createAlarm,
    getUserAlarms,
    getActiveAlarmsCount,
    getLeadAlarm,
    updateAlarm,
    deleteAlarm,
} from "../utils/api";

export default function useAlarms() {
    const [alarms, setAlarms] = useState([]);
    const [activeCount, setActiveCount] = useState(0);
    const [loading, setLoading] = useState(false);

    // Load all alarms
    const loadAlarms = useCallback(async (status = "active") => {
        setLoading(true);
        try {
            const data = await getUserAlarms(status);
            setAlarms(data);
        } catch (error) {
            console.error("Load alarms error:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Load active count
    const loadActiveCount = useCallback(async () => {
        try {
            const count = await getActiveAlarmsCount();
            setActiveCount(count);
        } catch (error) {
            console.error("Load alarm count error:", error);
        }
    }, []);

    // Get alarm for specific lead
    const getAlarmForLead = useCallback(async (leadId) => {
        try {
            const alarm = await getLeadAlarm(leadId);
            return alarm;
        } catch (error) {
            console.error("Get lead alarm error:", error);
            return null;
        }
    }, []);

    // Create new alarm
    const handleCreateAlarm = useCallback(async (leadId, alarmTime, notes = "") => {
        try {
            const alarm = await createAlarm(leadId, alarmTime, notes);
            await loadActiveCount();
            return alarm;
        } catch (error) {
            console.error("Create alarm error:", error);
            throw error;
        }
    }, [loadActiveCount]);

    // Snooze alarm
    const handleSnoozeAlarm = useCallback(async (id, minutes) => {
        try {
            const snoozedUntil = new Date(Date.now() + minutes * 60000);
            const alarm = await updateAlarm(id, {
                status: "snoozed",
                snoozedUntil: snoozedUntil.toISOString(),
            });
            await loadActiveCount();
            await loadAlarms();
            return alarm;
        } catch (error) {
            console.error("Snooze alarm error:", error);
            throw error;
        }
    }, [loadActiveCount, loadAlarms]);

    // Dismiss alarm
    const handleDismissAlarm = useCallback(async (id) => {
        try {
            const alarm = await updateAlarm(id, { status: "dismissed" });
            await loadActiveCount();
            await loadAlarms();
            return alarm;
        } catch (error) {
            console.error("Dismiss alarm error:", error);
            throw error;
        }
    }, [loadActiveCount, loadAlarms]);

    // Delete alarm
    const handleDeleteAlarm = useCallback(async (id) => {
        try {
            await deleteAlarm(id);
            await loadActiveCount();
            await loadAlarms();
        } catch (error) {
            console.error("Delete alarm error:", error);
            throw error;
        }
    }, [loadActiveCount, loadAlarms]);

    // Poll for alarm count updates every minute
    useEffect(() => {
        loadActiveCount();
        const interval = setInterval(loadActiveCount, 60000); // Every minute
        return () => clearInterval(interval);
    }, [loadActiveCount]);

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

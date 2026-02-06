import { useState, useCallback, useMemo } from "react";
import { fetchLeadActivities, fetchLeadCallLogs } from "../../../../utils/api";

export default function useActivities(id) {
  const [activities, setActivities] = useState([]);
  const [callLogs, setCallLogs] = useState([]);
  const [actsLoading, setActsLoading] = useState(false);
  const [expanded, setExpanded] = useState({});

  const toggleExpand = (aid) =>
    setExpanded((s) => ({ ...s, [aid]: !s[aid] }));

  const loadActivities = useCallback(async () => {
    if (!id) return;
    try {
      setActsLoading(true);
      const [actRes, logsRes] = await Promise.all([
        fetchLeadActivities(id, { limit: 50 }),
        fetchLeadCallLogs(id),
      ]);
      setActivities(actRes.activities || []);
      setCallLogs(logsRes.logs || []);
    } catch (e) {
      console.error("fetchLeadActivities error:", e);
    } finally {
      setActsLoading(false);
    }
  }, [id]);

  const callStats = useMemo(() => {
    const totalCalls = callLogs.length;
    const connectedCalls = callLogs.filter(
      (l) => l.outcome === "connected"
    ).length;
    const totalDurationSec = callLogs.reduce(
      (acc, l) => acc + (l.durationSec || 0),
      0
    );

    const h = Math.floor(totalDurationSec / 3600);
    const m = Math.floor((totalDurationSec % 3600) / 60);
    const s = totalDurationSec % 60;

    let durationStr = "";
    if (h > 0) durationStr += `${h}h `;
    if (m > 0 || h > 0) durationStr += `${m}m `;
    durationStr += `${s}s`;

    return { totalCalls, connectedCalls, durationStr };
  }, [callLogs]);

  return {
    activities,
    callLogs,
    actsLoading,
    callStats,
    expanded,
    toggleExpand,
    loadActivities,
  };
}

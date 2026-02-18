import { useEffect, useRef, useCallback, useState } from "react";
import { FiInfo, FiPhoneCall } from "react-icons/fi";
import { socketPayloadToLead, summarizeSocketLead } from "../../../../utils/leadHelpers";

/* ---------- helpers ---------- */
const useEventDeduper = (windowMs = 8000) => {
  const seenRef = useRef(new Map());
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      for (const [k, v] of seenRef.current.entries()) if (now - v > windowMs) seenRef.current.delete(k);
    }, windowMs);
    return () => clearInterval(t);
  }, [windowMs]);

  const seen = useCallback((key) => {
    const k = String(key || "");
    const now = Date.now();
    const exists = seenRef.current.has(k);
    seenRef.current.set(k, now);
    return exists;
  }, []);

  return seen;
};

/* ---------- main hook ---------- */
export default function useLeadSocket({ socket, isConnected, setRows, notify, invalidate }) {
  const [highlight, setHighlight] = useState(() => new Set());

  const addHighlight = useCallback((id) => {
    if (!id) return;
    setHighlight((prev) => new Set(prev).add(String(id)));
    setTimeout(() => {
      setHighlight((prev) => {
        const n = new Set(prev);
        n.delete(String(id));
        return n;
      });
    }, 2500);
  }, []);

  const dedupe = useEventDeduper(8000);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const upsertFromSocket = (payload) => {
      const minimal = socketPayloadToLead(payload);
      const incomingId = String(minimal._id || minimal.id || minimal.leadId || "");

      // Only update if this lead is already in the current page rows
      setRows((prev) => {
        const idx = prev.findIndex((r) => String(r._id || r.id || r.leadId) === incomingId);
        if (idx >= 0) {
          const next = prev.slice();
          next[idx] = { ...next[idx], ...minimal, fieldData: minimal.fieldData || next[idx].fieldData };
          return next;
        }
        // Don't insert new leads that aren't on the current page
        return prev;
      });

      addHighlight(incomingId);
      invalidate();
    };

    const onLeadIntake = (p = {}) => {
      const s = summarizeSocketLead(p);
      if (dedupe(`lead:intake:${s.id}`)) return;
      upsertFromSocket(p);
      notify("New web lead", "A new lead submitted through the website.", {
        tone: "success",
        leadName: s.name,
        leadDetails: {
          phone: s.phone,
          email: s.email,
          source: s.source,
          message: s.message,
          time: s.createdTime?.toLocaleTimeString(),
        },
      });
    };

    const onLeadCreated = (p = {}) => {
      const s = summarizeSocketLead(p);
      if (dedupe(`lead:created:${s.id}`)) return;
      upsertFromSocket(p);
      notify("New lead created", "A new lead has been added.", { leadName: s.name });
    };

    const onLeadUpdated = (p = {}) => {
      const s = summarizeSocketLead(p);
      if (dedupe(`lead:updated:${s.id}:${p.updatedAt || ""}`)) return;
      upsertFromSocket(p);
      notify("Lead updated", "Lead details were updated.", {
        icon: FiInfo,
        leadName: s.name,
        leadDetails: { phone: s.phone },
      });
    };

    const onStatusUpdated = (p = {}) => {
      const s = summarizeSocketLead(p);
      if (dedupe(`lead:status_updated:${s.id}:${p.status || ""}`)) return;
      upsertFromSocket({ ...(p.lead || {}), _id: s.id, status: p.status });
      notify("Lead status changed", `Status updated to: ${p?.status || "updated"}.`, {
        icon: FiInfo,
        leadName: s.name,
      });
    };

    const onActivity = (p = {}) => {
      const s = summarizeSocketLead(p);
      const act = p?.activity?._id || p?.activity?.action || "";
      if (dedupe(`lead:activity:${s.id}:${act}`)) return;
      invalidate();
      addHighlight(s.id);
      notify("Lead activity", `${p?.activity?.action || "Activity"} recorded.`, {
        leadName: s.name || `Lead #${s.id}`,
      });
    };

    const onCallLogged = (p = {}) => {
      const id = p?.lead?.id || p?.leadId || "";
      if (dedupe(`call:logged:${id}:${p?.call?._id || ""}`)) return;
      invalidate();
      addHighlight(id);
      notify("Call logged", `Call outcome: ${p?.call?.outcome || "completed"}.`, {
        icon: FiPhoneCall,
        tone: "success",
      });
    };

    const onLeadsAssigned = (p = {}) => {
      const key = Array.isArray(p?.leadIds) ? p.leadIds.join(",") : String(p?.leadIds || "");
      if (dedupe(`leads:assigned:${key}`)) return;
      invalidate();
      (Array.isArray(p?.leadIds) ? p.leadIds : [p?.leadIds]).forEach((lid) => lid && addHighlight(lid));
      const n = Array.isArray(p?.leadIds) ? p.leadIds.length : 1;
      notify("Leads assigned", `${n} lead(s) assigned to a caller.`, { icon: FiInfo });
    };

    socket.on?.("lead:intake", onLeadIntake);
    socket.on?.("lead:created", onLeadCreated);
    socket.on?.("lead:updated", onLeadUpdated);
    socket.on?.("lead:status_updated", onStatusUpdated);
    socket.on?.("lead:activity", onActivity);
    socket.on?.("call:logged", onCallLogged);
    socket.on?.("leads:assigned", onLeadsAssigned);

    return () => {
      socket.off?.("lead:intake", onLeadIntake);
      socket.off?.("lead:created", onLeadCreated);
      socket.off?.("lead:updated", onLeadUpdated);
      socket.off?.("lead:status_updated", onStatusUpdated);
      socket.off?.("lead:activity", onActivity);
      socket.off?.("call:logged", onCallLogged);
      socket.off?.("leads:assigned", onLeadsAssigned);
    };
  }, [socket, isConnected, dedupe, invalidate, addHighlight, notify, setRows]);

  return { highlight, addHighlight };
}

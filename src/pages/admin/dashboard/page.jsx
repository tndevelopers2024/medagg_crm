import React, { useEffect, useCallback, useRef } from "react";
import {
  FiPhoneCall,
  FiInfo,
  FiUser,
  FiCalendar,
  FiMessageSquare,
} from "react-icons/fi";
import { notification, Button } from "antd";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";
import { useSocket } from "../../../contexts/SocketProvider";
import Loader from "../../../components/Loader";

import useAdminDashboard from "./hooks/useAdminDashboard";
import DateRangeFilter from "./components/DateRangeFilter";
import KpiStatCards from "./components/KpiStatCards";
import CityDoctorTable from "./components/CityDoctorTable";
import CampaignWiseTable from "./components/CampaignWiseTable";
import CampWiseTable from "./components/CampWiseTable";
import BdActivityTracker from "./components/BdActivityTracker";
import BdPerformanceSummary from "./components/BdPerformanceSummary";

/* ---------------- helpers ---------------- */
const formatPhoneNumber = (phone) => {
  if (!phone) return "—";
  const cleaned = String(phone).replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return String(phone);
};

const getField = (fd = [], name) =>
  fd.find((f) => (f?.name || "").toLowerCase() === String(name).toLowerCase())?.values?.[0] || "";

function summarizeSocketLead(p = {}) {
  const s = p.summary || {};
  const fd = p.fieldData || p.field_data || [];

  const name =
    s.name || getField(fd, "full_name") || getField(fd, "name") || getField(fd, "lead_name") || "—";
  const phone =
    s.phone || getField(fd, "phone_number") || getField(fd, "phone") || getField(fd, "mobile") || "—";
  const email = s.email || getField(fd, "email") || getField(fd, "email_address") || "—";
  const source = s.source || getField(fd, "source") || getField(fd, "page_name") || "Website";
  const message =
    s.concern || s.message || getField(fd, "concern") || getField(fd, "message") || getField(fd, "comments") || "—";

  const createdRaw = p.created_time || p.createdTime || p.createdAt || p.created_at || Date.now();
  const createdTime = createdRaw ? new Date(createdRaw) : new Date();
  const id = p.lead_id || p.id || p._id || p.leadId || "";

  return { id, name, phone, email, source, message, createdTime };
}

function useEventDeduper(windowMs = 8000) {
  const seenRef = useRef(new Map());
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      for (const [k, v] of seenRef.current.entries()) {
        if (now - v > windowMs) seenRef.current.delete(k);
      }
    }, windowMs);
    return () => clearInterval(t);
  }, [windowMs]);

  const mark = useCallback((key) => {
    const k = String(key || "");
    const now = Date.now();
    const has = seenRef.current.has(k);
    seenRef.current.set(k, now);
    return has;
  }, []);

  return mark;
}

/* ---------- Lead detail description for notification ---------- */
function LeadDescription({ details }) {
  if (!details) return null;
  return (
    <div className="space-y-1.5 text-xs mt-1">
      {details.phone && details.phone !== "—" && (
        <div className="flex items-center gap-2">
          <FiPhoneCall className="opacity-60" />
          <span>{formatPhoneNumber(details.phone)}</span>
        </div>
      )}
      {details.email && details.email !== "—" && (
        <div className="flex items-center gap-2">
          <FiUser className="opacity-60" />
          <span className="truncate">{details.email}</span>
        </div>
      )}
      {details.source && (
        <div className="flex items-center gap-2">
          <FiInfo className="opacity-60" />
          <span>From: {details.source}</span>
        </div>
      )}
      {details.message && details.message !== "—" && (
        <div className="flex items-center gap-2">
          <FiMessageSquare className="opacity-60" />
          <span>{details.message}</span>
        </div>
      )}
      {details.time && (
        <div className="flex items-center gap-2 opacity-70">
          <FiCalendar className="opacity-60" />
          <span>{details.time}</span>
        </div>
      )}
    </div>
  );
}

/* ---------------- Page ---------------- */
export default function Dashboard() {
  const navigate = useNavigate();
  const [notificationApi, contextHolder] = notification.useNotification();
  const { socket, isConnected } = useSocket();
  const dedupe = useEventDeduper(8000);

  usePageTitle("Admin Dashboard", "Welcome back");

  const {
    data,
    loading,
    refresh,
    datePreset,
    setDatePreset,
    customRange,
    setCustomRange,
  } = useAdminDashboard();

  /* -------- socket notifications -------- */
  useEffect(() => {
    if (!socket || !isConnected) return;

    const toneToMethod = (tone) => {
      if (tone === "success") return "success";
      if (tone === "warning") return "warning";
      if (tone === "error") return "error";
      return "info";
    };

    const notifyAndRefresh = (title, message, options = {}) => {
      const toTimeString = (d) => (d instanceof Date && !isNaN(d) ? d.toLocaleTimeString() : "Just now");
      const method = toneToMethod(options.tone);
      const leadDetails = options.leadDetails && {
        ...options.leadDetails,
        time: options.leadDetails?.time || toTimeString(new Date()),
      };

      notificationApi[method]({
        message: (
          <span>
            {title}
            {options.leadName && (
              <span className="ml-2 text-xs font-normal bg-black/10 px-2 py-0.5 rounded-full">
                {options.leadName}
              </span>
            )}
          </span>
        ),
        description: (
          <>
            {message && <div className="text-sm">{message}</div>}
            <LeadDescription details={leadDetails} />
          </>
        ),
        placement: "bottomRight",
        duration: (options.timeout ?? 12000) / 1000,
        btn: (
          <Button
            type="link"
            size="small"
            onClick={() => navigate("/admin/leads")}
          >
            {options.actionLabel || "Open Leads"}
          </Button>
        ),
      });
      refresh().catch(() => { });
    };

    const onLeadCreated = (p = {}) => {
      const s = summarizeSocketLead(p);
      if (dedupe(`lead:created:${s.id}`)) return;
      notifyAndRefresh("New lead created", "A new lead has been added to the system.", {
        leadName: s.name,
        leadDetails: { phone: s.phone, email: s.email, source: s.source, message: s.message, time: s.createdTime?.toLocaleTimeString() },
      });
    };

    const onLeadIntake = (p = {}) => {
      const s = summarizeSocketLead(p);
      if (dedupe(`lead:intake:${s.id}`)) return;
      notifyAndRefresh("New web lead", "A new lead submitted through the website.", {
        tone: "success",
        leadName: s.name,
        leadDetails: { phone: s.phone, email: s.email, source: s.source, message: s.message, time: s.createdTime?.toLocaleTimeString() },
      });
    };

    const onLeadUpdated = (p = {}) => {
      const s = summarizeSocketLead(p);
      if (dedupe(`lead:updated:${s.id}:${p.updatedAt || ""}`)) return;
      notifyAndRefresh("Lead updated", "Lead details were updated.", {
        leadName: s.name, leadDetails: { phone: s.phone, time: new Date().toLocaleTimeString() },
      });
    };

    const onStatusUpdated = (p = {}) => {
      const s = summarizeSocketLead(p);
      if (dedupe(`lead:status_updated:${s.id}:${p.status || ""}`)) return;
      notifyAndRefresh("Lead status changed", `Status updated to: ${p?.status || "updated"}.`, { leadName: s.name });
    };

    const onCallLogged = (p = {}) => {
      const id = p?.lead?.id || p?.leadId || summarizeSocketLead(p).id || "";
      if (dedupe(`call:logged:${id}:${p?.call?._id || ""}`)) return;
      notifyAndRefresh("Call logged", `Call outcome: ${p?.call?.outcome || "completed"}.`, { tone: "success" });
    };

    const onLeadsAssigned = (p = {}) => {
      const key = Array.isArray(p?.leadIds) ? p.leadIds.join(",") : String(p?.leadIds || "");
      if (dedupe(`leads:assigned:${key}`)) return;
      const n = Array.isArray(p?.leadIds) ? p.leadIds.length : 1;
      notifyAndRefresh("Leads assigned", `${n} lead(s) assigned to a caller.`);
    };

    const onActivity = (p = {}) => {
      const s = summarizeSocketLead(p);
      const act = p?.activity?._id || p?.activity?.action || "";
      if (dedupe(`lead:activity:${s.id}:${act}`)) return;
      notifyAndRefresh("Lead activity", `${p?.activity?.action || "Activity"} recorded.`, { leadName: s.name || `Lead #${s.id}` });
    };

    socket.on?.("lead:created", onLeadCreated);
    socket.on?.("lead:intake", onLeadIntake);
    socket.on?.("lead:updated", onLeadUpdated);
    socket.on?.("lead:status_updated", onStatusUpdated);
    socket.on?.("call:logged", onCallLogged);
    socket.on?.("leads:assigned", onLeadsAssigned);
    socket.on?.("lead:activity", onActivity);

    notifyAndRefresh("Connected", "Live updates are active.", { tone: "success", timeout: 2500 });

    return () => {
      socket.off?.("lead:created", onLeadCreated);
      socket.off?.("lead:intake", onLeadIntake);
      socket.off?.("lead:updated", onLeadUpdated);
      socket.off?.("lead:status_updated", onStatusUpdated);
      socket.off?.("call:logged", onCallLogged);
      socket.off?.("leads:assigned", onLeadsAssigned);
      socket.off?.("lead:activity", onActivity);
    };
  }, [socket, isConnected, navigate, notificationApi, refresh, dedupe]);

  if (loading) return <Loader fullScreen text="Loading dashboard..." />;

  return (
    <>
      {contextHolder}
      <div className="space-y-6">
        {/* Date Filter - top right */}
        <div className="flex justify-end">
          <DateRangeFilter
            datePreset={datePreset}
            setDatePreset={setDatePreset}
            customRange={customRange}
            setCustomRange={setCustomRange}
          />
        </div>

        {/* KPI Stat Cards - 2x4 grid */}
        <KpiStatCards
          kpiCards={data.kpiCards}
          onCardClick={(cardKey) => {
            const filterMap = {
              todaysLeads: { dateMode: 'Today' },
              pendingNewLeads: { leadStatus: 'new' },
              opBooked: { opdStatus: 'booked' },
              opDone: { opdStatus: 'done' },
              ipBooked: { ipdStatus: 'booked' },
              ipDone: { ipdStatus: 'done' },
              surgerySuggested: { /* surgery filter */ },
              diagnosticSuggested: { /* diagnostic filter */ },
            };
            const filter = filterMap[cardKey];
            if (filter) {
              navigate('/admin/leads', { state: { filter } });
            }
          }}
        />
        <div className="grid gap-6">
        {/* City & Doctor Summary */}
        <CityDoctorTable data={data.cityDoctorSummary} />

        {/* Campaign-Wise Leads */}
        <CampaignWiseTable data={data.campaignWise} />

        {/* Camp-Wise Leads */}
        <CampWiseTable data={data.campWise} />

        {/* BD Activity Tracker */}
        <BdActivityTracker data={data.bdActivityTracker} />

        {/* BD Performance Summary */}
        <BdPerformanceSummary data={data.bdPerformanceSummary} />
        </div>
      </div>
    </>
  );
}

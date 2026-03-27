"use client";
import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { FiList, FiActivity, FiPaperclip } from "react-icons/fi";
import { Spin, Result } from "antd";
import { useAuth } from "../../../contexts/AuthContext";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";
import Loader from "../../../components/Loader";
import AccessDenied from "../../../components/AccessDenied";
import PermissionGate from "../../../components/PermissionGate";

import useActivities from "./hooks/useActivities";
import useLeadData from "./hooks/useLeadData";
import useLeadActions from "./hooks/useLeadActions";
import useBookings from "./hooks/useBookings";
import useAlarms from "../../../hooks/useAlarms";
import useHelpRequests from "./hooks/useHelpRequests";

import LeadHeader from "./components/LeadHeader";
import LeadDetailsCard from "./components/LeadDetailsCard";
import StatusPanel from "./components/StatusPanel";
import DocumentsSection from "./components/DocumentsSection";
import BookingsSection from "./components/BookingsSection";
import ActivityTimeline from "./components/ActivityTimeline";
import TabLayout from "./components/TabLayout";
import DeferModal from "./components/DeferModal";
import WhatsAppModal from "./components/WhatsAppModal";
import HelpRequestModal from "./components/HelpRequestModal";

export default function LeadManagement() {
  const { id } = useParams();
  const { isCaller, user, hasPermission } = useAuth();
  const navigate = useNavigate();
  usePageTitle("Lead Management");

  const [activeTab, setActiveTab] = useState("activity");
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [leadAlarm, setLeadAlarm] = useState(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpModalType, setHelpModalType] = useState("share");

  // --- Hooks ---
  const {
    activities,
    actsLoading,
    callStats,
    loadActivities,
  } = useActivities(id);

  const {
    lead,
    setLead,
    loading,
    leadData,
    documents,
    setDocuments,
    leadStages,
    fieldsLoading,
    statusOptions,
    currentCampaign,
    combinedFields,
    opBookings,
    setOpBookings,
    ipBookings,
    setIpBookings,
    diagnosticBookings,
    setDiagnosticBookings,
    status,
    setStatus,
    initialStatus,
    hasStatusChanged,
    newBookingAdded,
    setNewBookingAdded,
    notes,
    setNotes,
    opdBooked,
    setOpdBooked,
    callers,
    assignedTo,
    assignedCallerName,
    loadLeadData,
    handleLeadFieldChange,
    onAddLeadOption,
  } = useLeadData(id, loadActivities);

  const {
    saving,
    calling,
    deferring,
    handleSave,
    handleRequestMobileCall,
    handleShareLead,
    showLaterModal,
    laterDate,
    setLaterDate,
    laterTime,
    setLaterTime,
    openCallYouLater,
    closeCallYouLater,
    saveCallYouLater,
    handleAssignedToChange,
  } = useLeadActions({
    id,
    lead,
    leadData,
    notes,
    status,
    isCaller,
    initialStatus,
    hasStatusChanged,
    newBookingAdded,
    setLead,
    loadActivities,
    leadStages,
    combinedFields,
    loadLeadData,
  });

  const {
    op,
    setOp,
    showOpForm,
    setShowOpForm,
    handleAddOp,
    handleRemoveOp,
    handleDoneOp,
    editingOpId,
    setEditingOpId,
    handleEditOp,
    handleUpdateOp,
    ip,
    setIp,
    showIpForm,
    setShowIpForm,
    handleAddIp,
    handleRemoveIp,
    handleDoneIp,
    editingIpId,
    setEditingIpId,
    handleEditIp,
    handleUpdateIp,
    bookingSaving,
    opFields,
    ipFields,
    fieldsLoading: bookingFieldsLoading,
    onAddOpOption,
    onAddIpOption,
    diagnostic,
    setDiagnostic,
    showDiagnosticForm,
    setShowDiagnosticForm,
    handleAddDiagnostic,
    handleRemoveDiagnostic,
    handleDoneDiagnostic,
    editingDiagnosticId,
    setEditingDiagnosticId,
    handleEditDiagnostic,
    handleUpdateDiagnostic,
    diagnosticFields,
    onAddDiagnosticOption,
  } = useBookings({
    id,
    loadActivities,
    setNewBookingAdded,
    opBookings,
    setOpBookings,
    ipBookings,
    setIpBookings,
    diagnosticBookings,
    setDiagnosticBookings,
  });

  // Help request hook
  const { sendRequest: sendHelpRequest } = useHelpRequests();

  // Alarm hook
  const { createAlarm, getAlarmForLead } = useAlarms();

  // Load alarm for this lead
  const loadLeadAlarm = async () => {
    if (id) {
      const alarm = await getAlarmForLead(id);
      setLeadAlarm(alarm);
    }
  };

  // Handle set alarm
  const handleSetAlarm = async (leadId, alarmTime, notes) => {
    await createAlarm(leadId, alarmTime, notes);
    await loadLeadAlarm();
  };

  // Load alarm when lead loads
  useEffect(() => {
    loadLeadAlarm();
  }, [id]);

  // --- Call Later date guard ---
  // True when caller has chosen an "active" stage status but hasn't set a follow-up date yet.
  const needsCallLaterDate = isCaller && (() => {
    if (!lead || !leadStages?.length) return false;
    const selectedStage = leadStages.find(
      (s) => s.displayLabel === status || s.stageName === (status || "").toLowerCase()
    );
    if (selectedStage?.stageCategory !== "active") return false;
    return !lead?.followUpAt && !leadData?.call_later_date && !leadData?.follow_up_date;
  })();

  // Block browser back button and tab close when follow-up date is missing
  useEffect(() => {
    if (!needsCallLaterDate) return;

    // Push a dummy history entry so the browser back triggers popstate instead of leaving
    window.history.pushState(null, "", window.location.href);

    const onPopState = () => {
      // Re-push to stay on the page
      window.history.pushState(null, "", window.location.href);
      toast.error("Please select a Call Later date before leaving this lead.");
      openCallYouLater();
    };

    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "Please select a Call Later date before leaving.";
    };

    window.addEventListener("popstate", onPopState);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [needsCallLaterDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Auto-save logic ---
  const autoSaveSkipCount = useRef(0);
  const autoSaveReady = useRef(false);

  // Mark auto-save as ready only after initial data is fully loaded
  useEffect(() => {
    if (lead && !autoSaveReady.current) {
      // Wait a tick so all initial state-setting effects finish
      const t = setTimeout(() => {
        autoSaveReady.current = true;
        autoSaveSkipCount.current = 0;
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [lead]);

  useEffect(() => {
    if (!autoSaveReady.current) return;

    const timer = setTimeout(() => {
      handleSave(true); // silent auto-save
    }, 1500);

    return () => clearTimeout(timer);
  }, [leadData, notes, status, handleSave]);

  // --- Back navigation guard ---
  const handleBack = () => {
    if (needsCallLaterDate) {
      toast.error("Please select a Call Later date before leaving this lead.");
      openCallYouLater();
      return;
    }
    const isInitialNew = ["new", "new lead"].includes(
      (initialStatus || "").toLowerCase()
    );
    if (isCaller && isInitialNew && !hasStatusChanged && !newBookingAdded) {
      toast.error("Please update the lead status before leaving.");
      return;
    }
    navigate(-1);
  };

  // --- Tab config ---
  const tabs = [
    {
      key: "activity",
      label: "Activity",
      icon: FiActivity,
      count: activities.length,
    },
    {
      key: "bookings",
      label: "Bookings",
      icon: FiList,
      count: opBookings.length + ipBookings.length + diagnosticBookings.length,
    },
    {
      key: "documents",
      label: "Documents",
      icon: FiPaperclip,
      count: documents.length,
    },
  ];

  // --- Permission / Loading / Not Found ---
  if (!hasPermission("leads.detail.view")) return <AccessDenied />;
  if (loading) return <Loader fullScreen text="Loading lead details..." />;

  if (!lead) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Result
          status="warning"
          title="Lead not found"
          subTitle="The lead you're looking for doesn't exist or has been removed."
          extra={
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 text-white px-4 py-2 text-sm font-medium hover:bg-violet-700"
            >
              Go Back
            </button>
          }
        />
      </main>
    );
  }

  const isLost = leadStages?.find((stage) => {
    const stageName = (stage.displayLabel || stage.stageName || "").toLowerCase();
    const currentStatus = (status || "").toLowerCase();
    return stageName === currentStatus;
  })?.stageCategory === "lost";

  return (
    <main className="min-h-screen">
      <LeadHeader
        leadName={leadData.full_name}
        status={status}
        isLost={isLost}
        rating={leadData.rating}
        onRatingChange={(val) => handleLeadFieldChange("rating", val)}
        onBack={handleBack}
        onShare={handleShareLead}
        onHelpRequest={() => { setHelpModalType("share"); setShowHelpModal(true); }}
        onTransferRequest={() => { setHelpModalType("transfer"); setShowHelpModal(true); }}
        onRequestCall={handleRequestMobileCall}
        onWhatsApp={() => setShowWhatsApp(true)}
        onScheduleFollowUp={openCallYouLater}
        onSave={handleSave}
        onRefresh={loadActivities}
        saving={saving}
        calling={calling}
        actsLoading={actsLoading}
      />

      <div className="mx-auto px-0 py-6 space-y-6">
        {/* Top: Lead Details + Status Panel + Info Cards */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <LeadDetailsCard
            combinedFields={combinedFields}
            leadData={leadData}
            fieldsLoading={fieldsLoading}
            status={status}
            onFieldChange={handleLeadFieldChange}
            onAddOption={onAddLeadOption}
            disabled={!hasPermission("leads.detail.editFields")}
          />

          <StatusPanel
            source={currentCampaign?.name || "Unknown Campaign"}
            onSourceChange={(val) => handleLeadFieldChange("source", val)}
            status={status}
            onStatusChange={setStatus}
            statusOptions={statusOptions}
            notes={notes}
            onNotesChange={setNotes}
            opdBooked={opdBooked}
            onOpdChange={setOpdBooked}
            calling={calling}
            onRequestCall={handleRequestMobileCall}
            followUpAt={lead?.followUpAt}
            onScheduleFollowUp={openCallYouLater}
            callStats={callStats}
            currentCampaign={currentCampaign}
            isAdmin={!isCaller}
            callers={callers}
            assignedTo={assignedTo}
            assignedCallerName={assignedCallerName}
            onAssignedToChange={handleAssignedToChange}
            leadId={id}
            onSetAlarm={handleSetAlarm}
            hasAlarm={!!leadAlarm}
          />
        </section>

        {/* Tabbed sections */}
        <TabLayout activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />

        <div className="mt-0">

          {activeTab === "activity" && (
            <ActivityTimeline
              activities={activities}
              actsLoading={actsLoading}
              onRefresh={loadActivities}
            />
          )}

          {activeTab === "bookings" && (
            <PermissionGate permission="leads.detail.manageBookings" fallback={<div className="text-center text-gray-400 py-8">No permission to manage bookings</div>}>
              <BookingsSection
                opBookings={opBookings}
                op={op}
                setOp={setOp}
                showOpForm={showOpForm}
                setShowOpForm={setShowOpForm}
                onAddOp={handleAddOp}
                onRemoveOp={handleRemoveOp}
                onDoneOp={handleDoneOp}
                editingOpId={editingOpId}
                setEditingOpId={setEditingOpId}
                onEditOp={handleEditOp}
                onUpdateOp={handleUpdateOp}
                ipBookings={ipBookings}
                ip={ip}
                setIp={setIp}
                showIpForm={showIpForm}
                setShowIpForm={setShowIpForm}
                onAddIp={handleAddIp}
                onRemoveIp={handleRemoveIp}
                onDoneIp={handleDoneIp}
                editingIpId={editingIpId}
                setEditingIpId={setEditingIpId}
                onEditIp={handleEditIp}
                onUpdateIp={handleUpdateIp}
                bookingSaving={bookingSaving}
                opFields={opFields}
                ipFields={ipFields}
                onAddOpOption={onAddOpOption}
                onAddIpOption={onAddIpOption}
                diagnosticBookings={diagnosticBookings}
                diagnostic={diagnostic}
                setDiagnostic={setDiagnostic}
                showDiagnosticForm={showDiagnosticForm}
                setShowDiagnosticForm={setShowDiagnosticForm}
                onAddDiagnostic={handleAddDiagnostic}
                onRemoveDiagnostic={handleRemoveDiagnostic}
                onDoneDiagnostic={handleDoneDiagnostic}
                editingDiagnosticId={editingDiagnosticId}
                setEditingDiagnosticId={setEditingDiagnosticId}
                onEditDiagnostic={handleEditDiagnostic}
                onUpdateDiagnostic={handleUpdateDiagnostic}
                diagnosticFields={diagnosticFields}
                onAddDiagnosticOption={onAddDiagnosticOption}
                fieldsLoading={bookingFieldsLoading}
                lead={leadData}
                user={user}
              />
            </PermissionGate>
          )}



          {activeTab === "documents" && (
            <PermissionGate permission="leads.detail.documents" fallback={<div className="text-center text-gray-400 py-8">No permission to view documents</div>}>
              <DocumentsSection
                documents={documents}
                leadId={id}
                onUploadComplete={loadLeadData}
                onDeleteComplete={(docId) =>
                  setDocuments((prev) => prev.filter((d) => d._id !== docId))
                }
              />
            </PermissionGate>
          )}
        </div>
      </div>

      <WhatsAppModal
        open={showWhatsApp}
        onClose={() => setShowWhatsApp(false)}
        onSuccess={() => { loadActivities(); setActiveTab("activity"); }}
        phoneNumber={leadData.phone_number || leadData.phone || leadData.alt_phone || ""}
        leadName={leadData.full_name || leadData.name || "Lead"}
        leadData={{ ...leadData, _id: id }}
        combinedFields={combinedFields}
      />

      <DeferModal
        open={showLaterModal}
        onClose={closeCallYouLater}
        laterDate={laterDate}
        laterTime={laterTime}
        onDateChange={setLaterDate}
        onTimeChange={setLaterTime}
        onSave={saveCallYouLater}
        deferring={deferring}
      />

      <HelpRequestModal
        open={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        callers={callers}
        currentUserId={user?._id || user?.id}
        defaultType={helpModalType}
        onSubmit={({ toCallerId, type, reason }) =>
          sendHelpRequest({ leadId: id, toCallerId, type, reason })
        }
      />
    </main>
  );
}

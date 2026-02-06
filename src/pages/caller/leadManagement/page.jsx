"use client";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { FiList, FiActivity, FiPaperclip } from "react-icons/fi";
import { Spin, Result } from "antd";
import { useAuth } from "../../../contexts/AuthContext";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";
import Loader from "../../../components/Loader";

import useActivities from "./hooks/useActivities";
import useLeadData from "./hooks/useLeadData";
import useLeadActions from "./hooks/useLeadActions";
import useBookings from "./hooks/useBookings";
import useAlarms from "../../../hooks/useAlarms";

import LeadHeader from "./components/LeadHeader";
import LeadDetailsCard from "./components/LeadDetailsCard";
import StatusPanel from "./components/StatusPanel";
import DocumentsSection from "./components/DocumentsSection";
import BookingsSection from "./components/BookingsSection";
import ActivityTimeline from "./components/ActivityTimeline";
import TabLayout from "./components/TabLayout";
import DeferModal from "./components/DeferModal";
import WhatsAppModal from "./components/WhatsAppModal";

export default function LeadManagement() {
  const { id } = useParams();
  const { isCaller } = useAuth();
  const navigate = useNavigate();
  usePageTitle("Lead Management");

  const [activeTab, setActiveTab] = useState("activity");
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [leadAlarm, setLeadAlarm] = useState(null);

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
  } = useBookings({
    id,
    loadActivities,
    setNewBookingAdded,
    opBookings,
    setOpBookings,
    ipBookings,
    setIpBookings,
  });

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

  // --- Back navigation guard ---
  const handleBack = () => {
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
      count: opBookings.length + ipBookings.length,
    },
    {
      key: "documents",
      label: "Documents",
      icon: FiPaperclip,
      count: documents.length,
    },
  ];

  // --- Loading / Not Found ---
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

  return (
    <main className="min-h-screen">
      <LeadHeader
        leadName={leadData.full_name}
        status={status}
        rating={leadData.rating}
        onRatingChange={(val) => handleLeadFieldChange("rating", val)}
        onBack={handleBack}
        onShare={handleShareLead}
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
            />
          )}



          {activeTab === "documents" && (
            <DocumentsSection
              documents={documents}
              leadId={id}
              onUploadComplete={loadLeadData}
              onDeleteComplete={(docId) =>
                setDocuments((prev) => prev.filter((d) => d._id !== docId))
              }
            />
          )}
        </div>
      </div>

      <WhatsAppModal
        open={showWhatsApp}
        onClose={() => setShowWhatsApp(false)}
        phoneNumber={leadData.phone_number || leadData.phone || leadData.alt_phone || ""}
        leadName={leadData.full_name || leadData.name || "Lead"}
        leadData={leadData}
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
    </main>
  );
}

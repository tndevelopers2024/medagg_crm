import { useState } from "react";
import toast from "react-hot-toast";
import {
  updateLeadDetails,
  updateLeadStatus,
  deferLeadToNextDay,
  requestMobileCall,
  assignLeadsToCaller,
} from "../../../../utils/api";
import { tomorrowYMD, timeToHHMM } from "../utils/helpers";

export default function useLeadActions({
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
}) {
  const [saving, setSaving] = useState(false);
  const [calling, setCalling] = useState(false);
  const [deferring, setDeferring] = useState(false);
  const [showLaterModal, setShowLaterModal] = useState(false);
  const [laterDate, setLaterDate] = useState("");
  const [laterTime, setLaterTime] = useState("10:00");

  const handleSave = async () => {
    if (!id) return;

    const isInitialNew = ["new", "new lead"].includes(
      (initialStatus || "").toLowerCase()
    );
    if (isCaller && isInitialNew && !hasStatusChanged && !newBookingAdded) {
      toast.error("Please update the lead status before saving.");
      return;
    }

    // Validate required fields
    const missingFields = [];

    if (combinedFields && Array.isArray(combinedFields)) {
      combinedFields.forEach((field) => {
        if (field.isRequired) {
          const value = leadData[field.fieldName];
          if (!value || String(value).trim() === "") {
            missingFields.push(field.displayLabel || field.fieldName);
          }
        }
      });
    }

    if (missingFields.length > 0) {
      toast.error(
        `Please fill in the following required fields: ${missingFields.join(", ")}`
      );
      return;
    }

    setSaving(true);
    try {
      const details = await updateLeadDetails(id, {
        fieldDataUpdates: leadData,
        notes,
        status,
      });

      await updateLeadStatus(id, { status, notes });

      setLead((prev) => ({
        ...prev,
        status: details?.status || status,
        notes: details?.notes || notes,
        fieldData: details?.fieldData || prev?.fieldData || [],
        followUpAt: details?.followUpAt || prev?.followUpAt || null,
      }));

      await loadActivities();
      toast.success("Lead saved successfully");
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to save lead";
      console.error("Save lead error:", err);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleRequestMobileCall = async () => {
    if (!id) return;

    const phone = leadData.phone_number || leadData.phone || "";
    const altPhone = leadData.alt_phone || leadData.alternate_number || "";
    let picked =
      (phone && String(phone).trim()) ||
      (altPhone && String(altPhone).trim()) ||
      "";

    if (phone && altPhone) {
      const choice = window.prompt(
        `Choose number to call:\n1) ${phone}\n2) ${altPhone}\n\nEnter 1 or 2, or type a custom phone number.`
      );
      if (!choice) return;
      if (choice === "1") picked = phone;
      else if (choice === "2") picked = altPhone;
      else picked = choice;
    } else if (!picked) {
      const custom = window.prompt("Enter a phone number to call:");
      if (!custom) return;
      picked = custom;
    }

    const num = String(picked).replace(/[^\d+]/g, "");
    if (!num || num.length < 7) {
      toast.error("Please enter a valid phone number.");
      return;
    }

    try {
      setCalling(true);
      await requestMobileCall(id, num);
      await loadActivities();
      toast.success("Call request queued successfully.");
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to queue call";
      console.error("requestMobileCall error:", err);
      toast.error(msg);
    } finally {
      setCalling(false);
    }
  };

  const handleShareLead = () => {
    if (!lead) return;

    const name = leadData.full_name || leadData.name || "Unknown";
    const statusLabel =
      leadStages.find((s) => s.stageName === status)?.displayLabel ||
      status ||
      "new";
    const createdDate = lead.createdTime
      ? new Date(lead.createdTime).toLocaleString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "2-digit",
      })
      : "N/A";

    const leadUrl = `${window.location.origin}/leads/${id}`;
    const shareText = `Checkout this lead in Medagg CRM\n\nName: ${name}\nStatus: ${statusLabel}\nAcquired On: ${createdDate}\nWorkspace: Medagg Ventures\n\nLink: ${leadUrl}`;

    navigator.clipboard
      .writeText(shareText)
      .then(() => {
        toast.success("Lead details copied to clipboard!");
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
          shareText
        )}`;
        window.open(whatsappUrl, "_blank");
      })
      .catch(() => {
        toast.error("Failed to copy to clipboard");
      });
  };

  const openCallYouLater = () => {
    setLaterDate(tomorrowYMD());
    setLaterTime(timeToHHMM(lead?.followUpAt || null));
    setShowLaterModal(true);
  };

  const closeCallYouLater = () => setShowLaterModal(false);

  const saveCallYouLater = async () => {
    if (!id) return;

    const ymd = (laterDate || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
      toast.error("Please pick a valid date (YYYY-MM-DD).");
      return;
    }

    const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec((laterTime || "").trim());
    if (!m) {
      toast.error("Invalid time. Use HH:mm (e.g., 10:00)");
      return;
    }
    const hour = parseInt(m[1], 10);
    const minute = parseInt(m[2], 10);

    setDeferring(true);
    try {
      const res = await deferLeadToNextDay(id, { date: ymd, hour, minute });
      setLead((prev) => ({ ...prev, followUpAt: res.followUpAt }));
      await loadActivities();
      closeCallYouLater();
      toast.success(
        `Follow-up scheduled for ${ymd} at ${m[1].padStart(2, "0")}:${m[2]}.`
      );
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to schedule";
      console.error("defer/reschedule error:", err);
      toast.error(msg);
    } finally {
      setDeferring(false);
    }
  };

  const handleAssignedToChange = async (newCallerId) => {
    if (!id) return;

    try {
      await assignLeadsToCaller([id], newCallerId || null);
      toast.success("Assigned caller updated");
      // Reload lead data to get updated assignedTo info
      if (loadLeadData) {
        await loadLeadData();
      }
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to update assigned caller";
      console.error("handleAssignedToChange error:", err);
      toast.error(msg);
    }
  };

  return {
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
  };
}

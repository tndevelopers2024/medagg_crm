import { useState } from "react";
import {
  assignLeadsToCaller,
  assignLeadsByLocation,
  bulkUpdateLeads,
  deleteLeads,
} from "../../../../utils/api";

export default function useBulkOperations({
  selected,
  setSelected,
  callers,
  callerCounts,
  notify,
  invalidate,
  refetchMeta,
  setLoading,
}) {
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showLocationAssignModal, setShowLocationAssignModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successText, setSuccessText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLocationAssign = async ({ state, city, callerId }) => {
    try {
      setLoading(true);
      const res = await assignLeadsByLocation({ state, city, callerId });
      setSuccessText(res.message || "Leads assigned successfully");
      setSuccessOpen(true);
      invalidate();
      refetchMeta();
      setShowLocationAssignModal(false);
    } catch (err) {
      setLoading(false);
      console.error(err);
      alert(err?.response?.data?.message || err.message || "Assignment failed");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAssignByLocation = async () => {
    if (!selected.size) return;
    if (!window.confirm(`Auto-assign ${selected.size} leads based on location match?`)) return;

    setLoading(true);
    try {
      const { assignedCount, message } = await assignLeadsByLocation({
        leadIds: Array.from(selected),
      });
      notify("Auto-assigned", message || `Assigned ${assignedCount} leads.`, { tone: "success" });
      setSelected(new Set());
      invalidate();
      refetchMeta();
    } catch (err) {
      console.error(err);
      notify("Assignment failed", "Could not auto-assign leads.", { tone: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAssign = async ({ callerId }) => {
    try {
      const ids = Array.from(selected);
      await assignLeadsToCaller(ids, callerId);
      setShowAssignModal(false);
      setSelected(new Set());
      setSuccessText(`${ids.length} lead${ids.length > 1 ? "s" : ""} successfully assigned.`);
      setSuccessOpen(true);
      invalidate();
      refetchMeta();
    } catch (e) {
      console.error(e);
      alert("Assignment failed");
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      setIsDeleting(true);
      const ids = Array.from(selected);
      await deleteLeads(ids);
      setSelected(new Set());
      setShowDeleteModal(false);
      setSuccessText(`Deleted ${ids.length} leads successfully.`);
      setSuccessOpen(true);
      invalidate();
      refetchMeta();
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Failed to delete leads");
    } finally {
      setIsDeleting(false);
    }
  };

  const smartAssign = async () => {
    if (selected.size === 0 || callers.length === 0) return;
    try {
      const ids = Array.from(selected);
      const sortedCallers = [...callers].sort(
        (a, b) => (callerCounts.get(a.id) || 0) - (callerCounts.get(b.id) || 0)
      );
      let idx = 0;
      for (const leadId of ids) {
        const c = sortedCallers[idx % sortedCallers.length];
        await assignLeadsToCaller([leadId], c.id);
        idx++;
      }
      setSelected(new Set());
      setSuccessText(`Smart assigned ${ids.length} lead${ids.length > 1 ? "s" : ""}.`);
      setSuccessOpen(true);
      invalidate();
      refetchMeta();
    } catch (e) {
      console.error(e);
      alert("Smart assign failed");
    }
  };

  const handleBulkUpdate = async (updates) => {
    try {
      const leadIds = Array.from(selected);
      const res = await bulkUpdateLeads({ leadIds, updates });
      if (res.success) {
        notify("Leads Updated", `${res.count} leads were successfully updated.`, { tone: "success" });
        invalidate();
        refetchMeta();
        setSelected(new Set());
        setShowBulkEdit(false);
      } else {
        throw new Error(res.error || "Update failed");
      }
    } catch (err) {
      console.error(err);
      notify("Update Failed", "Could not update leads. Please try again.", { tone: "error" });
    }
  };

  return {
    showBulkEdit, setShowBulkEdit,
    showAssignModal, setShowAssignModal,
    showLocationAssignModal, setShowLocationAssignModal,
    showDeleteModal, setShowDeleteModal,
    successOpen, setSuccessOpen,
    successText,
    isDeleting,
    handleLocationAssign,
    handleBulkAssignByLocation,
    handleBulkAssign,
    handleDelete,
    confirmDelete,
    smartAssign,
    handleBulkUpdate,
  };
}

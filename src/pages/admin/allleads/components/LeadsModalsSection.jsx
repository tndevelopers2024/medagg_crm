import React from "react";
import { AssignModal, AssignLocationModal, SuccessDialog, DeleteModal } from "../../../../components/admin/leads/LeadModals";
import SaveFilterTemplateModal from "../../../../components/admin/SaveFilterTemplateModal";

export default function LeadsModalsSection({
  // Assign modal
  showAssignModal,
  setShowAssignModal,
  callers,
  selectedCount,
  handleBulkAssign,
  // Location assign modal
  showLocationAssignModal,
  setShowLocationAssignModal,
  handleLocationAssign,
  // Delete modal
  showDeleteModal,
  setShowDeleteModal,
  confirmDelete,
  isDeleting,
  // Success dialog
  successOpen,
  setSuccessOpen,
  successText,
  // Save filter template modal
  showSaveTemplateModal,
  setShowSaveTemplateModal,
  currentFilters,
  handleSaveTemplate,
  // Edit filter template modal
  showEditTemplateModal,
  setShowEditTemplateModal,
  editingTemplate,
  handleUpdateTemplate,
}) {
  return (
    <>
      <AssignModal
        open={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        callers={callers}
        onConfirm={handleBulkAssign}
        count={selectedCount}
      />
      <AssignLocationModal
        open={showLocationAssignModal}
        onClose={() => setShowLocationAssignModal(false)}
        callers={callers}
        onConfirm={handleLocationAssign}
      />
      <DeleteModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        count={selectedCount}
        isDeleting={isDeleting}
      />
      <SuccessDialog
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        text={successText}
      />
      <SaveFilterTemplateModal
        isOpen={showSaveTemplateModal}
        onClose={() => setShowSaveTemplateModal(false)}
        currentFilters={currentFilters}
        currentSorting={{ field: 'createdAt', order: 'desc' }}
        onSave={handleSaveTemplate}
      />
      <SaveFilterTemplateModal
        isOpen={showEditTemplateModal}
        onClose={() => setShowEditTemplateModal(false)}
        currentFilters={currentFilters}
        currentSorting={{ field: 'createdAt', order: 'desc' }}
        onSave={(data) => handleUpdateTemplate(editingTemplate?._id, data)}
        initialData={editingTemplate}
        isEditing={true}
      />
    </>
  );
}

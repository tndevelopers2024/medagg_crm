import React, { useState } from "react";
import { Modal, Select, Radio, Input, Button } from "antd";

const { TextArea } = Input;

export default function HelpRequestModal({
  open,
  onClose,
  callers = [],
  currentUserId,
  onSubmit,
  defaultType = "share",
}) {
  const [toCallerId, setToCallerId] = useState(null);
  const [type, setType] = useState(defaultType);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!toCallerId) return;
    setSubmitting(true);
    try {
      await onSubmit({ toCallerId, type, reason });
      // Reset on success
      setToCallerId(null);
      setReason("");
      setType(defaultType);
      onClose();
    } catch {
      // Error handled in onSubmit
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setToCallerId(null);
    setReason("");
    setType(defaultType);
    onClose();
  };

  // Filter out current user from caller list
  const callerOptions = callers
    .filter((c) => {
      const id = c._id || c.id;
      return id && String(id) !== String(currentUserId);
    })
    .map((c) => ({
      value: c._id || c.id,
      label: c.name || c.email || "Unknown",
    }));

  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      title={type === "transfer" ? "Transfer Lead" : "Ask for Help"}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button
          key="send"
          type="primary"
          loading={submitting}
          disabled={!toCallerId}
          onClick={handleSubmit}
          style={{
            background: "linear-gradient(to right, #ff2e6e, #ff5aa4)",
            borderColor: "transparent",
          }}
        >
          Send Request
        </Button>,
      ]}
      destroyOnHidden
    >
      <div className="space-y-4">
        <div>
          <label className="text-xs text-gray-600 block mb-1">Request Type</label>
          <Radio.Group
            value={type}
            onChange={(e) => setType(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="share">Ask for Help</Radio.Button>
            <Radio.Button value="transfer">Transfer Lead</Radio.Button>
          </Radio.Group>
          <p className="text-xs text-gray-400 mt-1">
            {type === "share"
              ? "Both you and the selected caller will have access to this lead."
              : "The lead will be reassigned entirely to the selected caller."}
          </p>
        </div>

        <div>
          <label className="text-xs text-gray-600 block mb-1">Select Caller</label>
          <Select
            showSearch
            placeholder="Search for a caller..."
            value={toCallerId}
            onChange={setToCallerId}
            options={callerOptions}
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
            className="w-full"
          />
        </div>

        <div>
          <label className="text-xs text-gray-600 block mb-1">
            Reason <span className="text-gray-300">(optional)</span>
          </label>
          <TextArea
            rows={3}
            placeholder="e.g., Client speaks Hindi, need help communicating"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
          />
        </div>
      </div>
    </Modal>
  );
}

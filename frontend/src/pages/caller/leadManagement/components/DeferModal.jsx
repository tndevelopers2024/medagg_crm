import React from "react";
import { Modal, DatePicker, TimePicker, Button } from "antd";
import dayjs from "dayjs";
import { tomorrowYMD, toYMD } from "../utils/helpers";

export default function DeferModal({
  open,
  onClose,
  laterDate,
  laterTime,
  onDateChange,
  onTimeChange,
  onSave,
  deferring,
}) {
  const quickPicks = [
    { label: "Tomorrow", date: tomorrowYMD() },
    {
      label: "In 3 Days",
      date: toYMD(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
    },
    {
      label: "Next Week",
      date: toYMD(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Schedule follow-up"
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="save"
          type="primary"
          loading={deferring}
          onClick={onSave}
          style={{
            background: "linear-gradient(to right, #ff2e6e, #ff5aa4)",
            borderColor: "transparent",
          }}
        >
          Save
        </Button>,
      ]}
      destroyOnHidden
    >
      <p className="text-sm text-gray-600 mb-4">
        Pick a <span className="font-medium">date</span> and{" "}
        <span className="font-medium">time</span>.
      </p>

      <div className="flex items-center gap-2 mb-4">
        {quickPicks.map((qp) => (
          <Button
            key={qp.label}
            type={laterDate === qp.date ? "primary" : "default"}
            size="small"
            ghost={laterDate === qp.date}
            onClick={() => onDateChange(qp.date)}
          >
            {qp.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-gray-600 block">Date</label>
          <DatePicker
            value={laterDate ? dayjs(laterDate, "YYYY-MM-DD") : null}
            onChange={(d) => onDateChange(d ? d.format("YYYY-MM-DD") : "")}
            className="w-full"
            format="YYYY-MM-DD"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-600 block">Time</label>
          <TimePicker
            value={laterTime ? dayjs(laterTime, "HH:mm") : null}
            onChange={(t) => onTimeChange(t ? t.format("HH:mm") : "")}
            className="w-full"
            format="HH:mm"
          />
        </div>
      </div>
    </Modal>
  );
}

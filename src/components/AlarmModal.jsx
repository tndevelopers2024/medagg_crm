import React, { useState } from "react";
import { Modal, Button, DatePicker, TimePicker, Input } from "antd";
import { FiBell, FiClock } from "react-icons/fi";
import dayjs from "dayjs";
import toast from "react-hot-toast";

const { TextArea } = Input;

const QUICK_OPTIONS = [
    { label: "30 min", value: "30m" },
    { label: "1 hour", value: "1hr" },
    { label: "2 hours", value: "2hr" },
    { label: "5 PM", value: "5pm" },
    { label: "6 PM", value: "6pm" },
    { label: "Custom", value: "custom" },
];

const calculateAlarmTime = (option) => {
    const now = new Date();

    switch (option) {
        case "30m":
            return new Date(now.getTime() + 30 * 60000);
        case "1hr":
            return new Date(now.getTime() + 60 * 60000);
        case "2hr":
            return new Date(now.getTime() + 120 * 60000);
        case "5pm": {
            const fivePm = new Date(now);
            fivePm.setHours(17, 0, 0, 0);
            if (fivePm <= now) fivePm.setDate(fivePm.getDate() + 1);
            return fivePm;
        }
        case "6pm": {
            const sixPm = new Date(now);
            sixPm.setHours(18, 0, 0, 0);
            if (sixPm <= now) sixPm.setDate(sixPm.getDate() + 1);
            return sixPm;
        }
        default:
            return null;
    }
};

export default function AlarmModal({ open, onClose, onSetAlarm, leadId }) {
    const [selectedOption, setSelectedOption] = useState(null);
    const [customDate, setCustomDate] = useState(null);
    const [customTime, setCustomTime] = useState(null);
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);

    const handleOptionClick = (value) => {
        setSelectedOption(value);
        if (value !== "custom") {
            setCustomDate(null);
            setCustomTime(null);
        }
    };

    const handleSetAlarm = async () => {
        let alarmTime;

        if (selectedOption === "custom") {
            if (!customDate || !customTime) {
                toast.error("Please select both date and time");
                return;
            }
            // Combine date and time
            const dateStr = customDate.format("YYYY-MM-DD");
            const timeStr = customTime.format("HH:mm");
            alarmTime = new Date(`${dateStr}T${timeStr}:00`);
        } else if (selectedOption) {
            alarmTime = calculateAlarmTime(selectedOption);
        } else {
            toast.error("Please select an alarm time");
            return;
        }

        // Validate alarm is in the future
        if (alarmTime <= new Date()) {
            toast.error("Alarm time must be in the future");
            return;
        }

        setSaving(true);
        try {
            await onSetAlarm(leadId, alarmTime.toISOString(), notes);
            toast.success("Alarm set successfully");
            handleClose();
        } catch (error) {
            console.error("Set alarm error:", error);
            toast.error("Failed to set alarm");
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        setSelectedOption(null);
        setCustomDate(null);
        setCustomTime(null);
        setNotes("");
        onClose();
    };

    return (
        <Modal
            title={
                <div className="flex items-center gap-2">
                    <FiBell className="text-purple-600" />
                    <span>Set Alarm</span>
                </div>
            }
            open={open}
            onCancel={handleClose}
            footer={[
                <Button key="cancel" onClick={handleClose} disabled={saving}>
                    Cancel
                </Button>,
                <Button
                    key="set"
                    type="primary"
                    icon={<FiClock />}
                    onClick={handleSetAlarm}
                    loading={saving}
                >
                    Set Alarm
                </Button>,
            ]}
            width={500}
        >
            <div className="space-y-4">
                {/* Quick Options */}
                <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Quick Options
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {QUICK_OPTIONS.map((option) => (
                            <Button
                                key={option.value}
                                type={selectedOption === option.value ? "primary" : "default"}
                                onClick={() => handleOptionClick(option.value)}
                                className="w-full"
                            >
                                {option.label}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Custom Date/Time */}
                {selectedOption === "custom" && (
                    <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                        <div>
                            <label className="text-xs text-gray-600 mb-1 block">Date</label>
                            <DatePicker
                                value={customDate}
                                onChange={setCustomDate}
                                className="w-full"
                                format="DD/MM/YYYY"
                                placeholder="Select date"
                                disabledDate={(current) =>
                                    current && current < dayjs().startOf("day")
                                }
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-600 mb-1 block">Time</label>
                            <TimePicker
                                value={customTime}
                                onChange={setCustomTime}
                                className="w-full"
                                format="hh:mm A"
                                use12Hours
                                placeholder="Select time"
                            />
                        </div>
                    </div>
                )}

                {/* Notes */}
                <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Notes (Optional)
                    </label>
                    <TextArea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add a note for this alarm..."
                        rows={3}
                        maxLength={200}
                    />
                </div>

                {/* Preview */}
                {selectedOption && (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="text-xs text-purple-600 font-medium mb-1">
                            Alarm will trigger at:
                        </div>
                        <div className="text-sm text-purple-900">
                            {selectedOption === "custom" && customDate && customTime
                                ? `${customDate.format("DD/MM/YYYY")} at ${customTime.format(
                                    "hh:mm A"
                                )}`
                                : selectedOption !== "custom"
                                    ? calculateAlarmTime(selectedOption)?.toLocaleString("en-IN", {
                                        dateStyle: "medium",
                                        timeStyle: "short",
                                    })
                                    : "Select date and time"}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}

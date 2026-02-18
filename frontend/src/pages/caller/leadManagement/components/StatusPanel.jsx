import React, { useState } from "react";
import { FiPhoneCall, FiClock, FiBell } from "react-icons/fi";
import {
  Card,
  Select,
  Input,
  Checkbox,
  Button,
  Statistic,
  Descriptions,
  Tag,
} from "antd";
import { fmtDateTime } from "../utils/helpers";
import AlarmModal from "../../../../components/AlarmModal";
import PermissionGate from "../../../../components/PermissionGate";

export default function StatusPanel({
  source,
  onSourceChange,
  status,
  onStatusChange,
  statusOptions,
  notes,
  onNotesChange,
  opdBooked,
  onOpdChange,
  calling,
  onRequestCall,
  followUpAt,
  onScheduleFollowUp,
  callStats,
  currentCampaign,
  isAdmin,
  callers,
  assignedTo,
  assignedCallerName,
  onAssignedToChange,
  leadId,
  onSetAlarm,
  hasAlarm,
}) {
  const [showAlarmModal, setShowAlarmModal] = useState(false);
  // Build grouped options for Ant Select
  const buildStatusOptions = () => {
    const groups = [];
    const groupMap = [
      { key: "initial", label: "Initial" },
      { key: "active", label: "Active" },
      { key: "won", label: "Won" },
      { key: "lost", label: "Lost" },
    ];
    for (const g of groupMap) {
      if (statusOptions[g.key]?.length > 0) {
        groups.push({
          label: g.label,
          options: statusOptions[g.key].map((opt) => ({
            label: opt.label,
            value: opt.value,
          })),
        });
      }
    }
    return groups;
  };

  const campaignStatusColor =
    currentCampaign?.status === "active"
      ? "green"
      : currentCampaign?.status === "paused"
        ? "orange"
        : "default";

  return (
    <Card>
      <div className="grid grid-cols-1 gap-4">
        <PermissionGate permission="leads.detail.editStatus" fallback={
          <div className="space-y-1">
            <label className="text-xs text-gray-600">Status</label>
            <div className="text-sm font-medium">{status}</div>
          </div>
        }>
          <div className="space-y-1">
            <label className="text-xs text-gray-600">
              Status<span className="text-red-500 ml-1">*</span>
            </label>
            <Select
              value={status}
              onChange={onStatusChange}
              options={buildStatusOptions()}
              className="w-full"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </div>
        </PermissionGate>

        {/* Assigned Caller */}
        <div className="space-y-1">
          <label className="text-xs text-gray-600">Assigned To</label>
          <Select
            value={assignedTo || ""}
            onChange={onAssignedToChange}
            className="w-full"
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={[
              { label: "Unassigned", value: "" },
              ...callers.map((caller) => ({
                label: caller.name,
                value: caller._id,
              })),
            ]}
          />
        </div>

        {/* Campaign Details */}
        {currentCampaign && (
          <Descriptions
            title={
              <span className="text-xs font-semibold text-gray-700">
                Campaign Details
              </span>
            }
            size="small"
            column={1}
            items={[
              {
                key: "name",
                label: "Name",
                children: currentCampaign.name,
              },
              {
                key: "platform",
                label: "Platform",
                children: (
                  <span className="capitalize">{currentCampaign.platform}</span>
                ),
              },
              {
                key: "status",
                label: "Status",
                children: (
                  <Tag color={campaignStatusColor}>
                    {currentCampaign.status
                      ? currentCampaign.status.toUpperCase()
                      : "UNKNOWN"}
                  </Tag>
                ),
              },
            ]}
          />
        )}

        <Checkbox
          checked={opdBooked}
          onChange={(e) => onOpdChange(e.target.checked)}
        >
          OPD Booked? (Check if yes)
        </Checkbox>

        <div className="pt-2">
          <Button
            onClick={onRequestCall}
            loading={calling}
            icon={<FiPhoneCall />}
            style={{
              borderColor: "#6ee7b7",
              backgroundColor: "#ecfdf5",
              color: "#047857",
            }}
          >
            {calling ? "Queuing..." : "Request Mobile Call"}
          </Button>
        </div>

        <div className="pt-2 flex items-center gap-2">
          <div className="flex-1">
            <div className="text-xs text-gray-600 mb-1">
              Next follow-up:{" "}
              <span className="font-medium text-gray-800">
                {fmtDateTime(followUpAt)}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <PermissionGate permission="alarms.alarms.create">
              <Button
                onClick={() => setShowAlarmModal(true)}
                icon={<FiBell />}
                style={{
                  borderColor: hasAlarm ? "#a855f7" : "#d8b4fe",
                  backgroundColor: hasAlarm ? "#f3e8ff" : "#faf5ff",
                  color: "#7c3aed",
                }}
              >
                {hasAlarm ? "Alarm Set" : "Set Alarm"}
              </Button>
            </PermissionGate>
            <Button
              onClick={onScheduleFollowUp}
              icon={<FiClock />}
              style={{
                borderColor: "#c4b5fd",
                backgroundColor: "#f5f3ff",
                color: "#6d28d9",
              }}
            >
              Call later
            </Button>
          </div>
        </div>

        {/* Call Statistics */}
        <div className="pt-2 border-t border-gray-100">
          <h4 className="text-xs font-semibold text-gray-700 mb-2">
            Call Statistics
          </h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-violet-50 p-2 text-center">
              <Statistic
                title={<span className="text-xs text-violet-600">Total</span>}
                value={callStats.totalCalls}
                valueStyle={{ fontSize: 20, fontWeight: 700, color: "#6d28d9" }}
              />
            </div>
            <div className="rounded-xl bg-emerald-50 p-2 text-center">
              <Statistic
                title={<span className="text-xs text-emerald-600">Conn.</span>}
                value={callStats.connectedCalls}
                valueStyle={{ fontSize: 20, fontWeight: 700, color: "#047857" }}
              />
            </div>
            <div className="rounded-xl bg-amber-50 p-2 text-center">
              <Statistic
                title={
                  <span className="text-xs text-amber-600">Duration</span>
                }
                value={callStats.durationStr || "0s"}
                valueStyle={{ fontSize: 14, fontWeight: 700, color: "#b45309" }}
              />
            </div>
          </div>
        </div>

        {/* Call Notes */}
        <PermissionGate permission="leads.detail.addNotes">
          <div className="space-y-1">
            <label className="text-xs text-gray-600">Call Notes</label>
            <Input.TextArea
              placeholder="Type here..."
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={6}
            />
          </div>
        </PermissionGate>
      </div>

      {/* Alarm Modal */}
      <AlarmModal
        open={showAlarmModal}
        onClose={() => setShowAlarmModal(false)}
        onSetAlarm={onSetAlarm}
        leadId={leadId}
      />
    </Card>
  );
}

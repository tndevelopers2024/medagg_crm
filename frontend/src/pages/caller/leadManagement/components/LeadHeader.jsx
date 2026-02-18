import React from "react";
import {
  FiArrowLeft,
  FiSave,
  FiPhoneCall,
  FiRefreshCcw,
  FiShare2,
  FiClock,
  FiMessageCircle,
  FiStar,
  FiUsers,
  FiArrowRight,
} from "react-icons/fi";
import { Button, Rate, Space, Tooltip, Dropdown } from "antd";
import PermissionGate from "../../../../components/PermissionGate";

export default function LeadHeader({
  leadName,
  status,
  rating,
  onRatingChange,
  onBack,
  onShare,
  onHelpRequest,
  onTransferRequest,
  onRequestCall,
  onWhatsApp,
  onSave,
  onRefresh,
  onScheduleFollowUp,
  saving,
  calling,
  actsLoading,
}) {
  const currentRating = parseInt(rating || 0);

  const STATUS_COLORS = {
    new: "text-blue-600 bg-blue-50 border-blue-100",
    "new lead": "text-blue-600 bg-blue-50 border-blue-100",
    hot: "text-red-600 bg-red-50 border-red-100",
    "hot lead": "text-red-600 bg-red-50 border-red-100",
    contacted: "text-orange-600 bg-orange-50 border-orange-100",
    interested: "text-green-600 bg-green-50 border-green-100",
    converted: "text-emerald-600 bg-emerald-50 border-emerald-100",
    not_interested: "text-gray-600 bg-gray-50 border-gray-100",
    dnp: "text-rose-600 bg-rose-50 border-rose-100",
    default: "text-gray-600 bg-gray-50 border-gray-100",
  };

  const statusColorClass =
    STATUS_COLORS[(status || "").toLowerCase()] || STATUS_COLORS.default;

  return (
    <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-gray-100">
      <div className="mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Tooltip title="Back">
              <Button
                icon={<FiArrowLeft />}
                onClick={onBack}
                shape="default"
              />
            </Tooltip>
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <h1 className="text-lg md:text-xl font-semibold text-gray-900">
                  {leadName}
                </h1>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${statusColorClass}`}
                >
                  {status}
                </span>
              </div>
          
            </div>
                <div className="-ml-1">
                <Rate
                  value={currentRating}
                  onChange={(val) => onRatingChange(String(val))}
                  allowClear
                  character={({ index, value }) => {
                    const filled = index < value;
                    return (
                      <FiStar
                        fill={filled ? "#fadb14" : "transparent"}
                        stroke={filled ? "#fadb14" : "#d1d5db"} // Gold if filled, Gray-300 if empty
                        strokeWidth={filled ? 0 : 2}
                        style={{ fontSize: 16 }}
                      />
                    );
                  }}
                />
              </div>
          </div>

          <Space wrap>
            <PermissionGate permission="leads.detail.calls">
              <Tooltip title="Request Mobile Call">
                <Button
                  icon={<FiPhoneCall />}
                  onClick={onRequestCall}
                  loading={calling}
                  style={{
                    borderColor: "#6ee7b7",
                    backgroundColor: "#ecfdf5",
                    color: "#047857",
                  }}
                >
                  {calling ? "Queuing..." : "Request Call"}
                </Button>
              </Tooltip>
            </PermissionGate>
            <PermissionGate permission="leads.detail.whatsapp">
              <Tooltip title="Send WhatsApp">
                <Button
                  icon={<FiMessageCircle />}
                  onClick={onWhatsApp}
                  style={{
                    borderColor: "#86efac",
                    backgroundColor: "#f0fdf4",
                    color: "#15803d",
                  }}
                >
                  <span className="hidden md:inline">WhatsApp</span>
                </Button>
              </Tooltip>
            </PermissionGate>
            <PermissionGate permission="leads.detail.helpRequest">
              <Dropdown
                menu={{
                  items: [
                    {
                      key: "help",
                      icon: <FiUsers />,
                      label: "Ask for Help",
                      onClick: onHelpRequest,
                    },
                    {
                      key: "transfer",
                      icon: <FiArrowRight />,
                      label: "Transfer Lead",
                      onClick: onTransferRequest,
                    },
                    { type: "divider" },
                    {
                      key: "share-link",
                      icon: <FiShare2 />,
                      label: "Copy Share Link",
                      onClick: onShare,
                    },
                  ],
                }}
                trigger={["click"]}
              >
                <Button icon={<FiShare2 />}>
                  <span className="hidden md:inline">Share</span>
                </Button>
              </Dropdown>
            </PermissionGate>
            <PermissionGate permission="leads.detail.defer">
              <Tooltip title="Schedule a follow-up">
                <Button
                  icon={<FiClock />}
                  onClick={onScheduleFollowUp}
                  style={{
                    borderColor: "#c4b5fd",
                    backgroundColor: "#f5f3ff",
                    color: "#6d28d9",
                  }}
                >
                  Call later
                </Button>
              </Tooltip>
            </PermissionGate>
            <Tooltip title="Save">
              <Button
                icon={<FiSave />}
                onClick={onSave}
                loading={saving}
                style={{
                  background: "linear-gradient(to right, #ff2e6e, #ff5aa4)",
                  borderColor: "transparent",
                  color: "#fff",
                }}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </Tooltip>
            <Tooltip title="Refresh Activity">
              <Button
                icon={
                  <FiRefreshCcw
                    className={actsLoading ? "animate-spin" : ""}
                  />
                }
                onClick={onRefresh}
              >
                {actsLoading ? "Refreshing..." : "Refresh"}
              </Button>
            </Tooltip>
          </Space>
        </div>
      </div>
    </header>
  );
}

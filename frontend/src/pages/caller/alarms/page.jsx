import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    FiBell,
    FiClock,
    FiCheckCircle,
    FiXCircle,
    FiTrash2,
} from "react-icons/fi";
import { Card, Button, Empty, Tag, Select, Input, Spin } from "antd";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";
import { useAuth } from "../../../contexts/AuthContext";
import AccessDenied from "../../../components/AccessDenied";
import PermissionGate from "../../../components/PermissionGate";
import useAlarms from "../../../hooks/useAlarms";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import toast from "react-hot-toast";

dayjs.extend(relativeTime);

const { Search } = Input;

// Helper function to get lead name from alarm
const getLeadName = (alarm) => {
    if (!alarm?.lead) return "Unknown Lead";

    // Try to get from fieldData
    if (alarm.lead.fieldData && Array.isArray(alarm.lead.fieldData)) {
        const nameField = alarm.lead.fieldData.find(
            (f) => f.name === "full_name" || f.name === "name"
        );
        if (nameField?.values && nameField.values.length > 0) {
            return nameField.values[0];
        }
    }

    // Fallback to lead properties
    if (alarm.lead.name) return alarm.lead.name;
    if (alarm.lead.fullName) return alarm.lead.fullName;

    return "Unknown Lead";
};

export default function AlarmsPage() {
    const { hasPermission } = useAuth();
    usePageTitle("Alarms", "Manage your lead reminders");
    const navigate = useNavigate();
    const {
        alarms,
        loading,
        loadAlarms,
        snoozeAlarm,
        dismissAlarm,
        deleteAlarm,
    } = useAlarms();

    const [filter, setFilter] = useState("active");
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        loadAlarms(filter);
    }, [filter, loadAlarms]);

    const handleSnooze = async (id, minutes) => {
        try {
            await snoozeAlarm(id, minutes);
            toast.success(`Alarm snoozed for ${minutes} minutes`);
        } catch (error) {
            toast.error("Failed to snooze alarm");
        }
    };

    const handleDismiss = async (id) => {
        try {
            await dismissAlarm(id);
            toast.success("Alarm dismissed");
        } catch (error) {
            toast.error("Failed to dismiss alarm");
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteAlarm(id);
            toast.success("Alarm deleted");
        } catch (error) {
            toast.error("Failed to delete alarm");
        }
    };

    const handleGoToLead = (leadId) => {
        navigate(`/leads/${leadId}`);
    };

    const getAlarmStatus = (alarm) => {
        const now = new Date();
        const alarmTime = new Date(alarm.alarmTime);

        if (alarm.status === "dismissed") return { text: "Dismissed", color: "default" };
        if (alarm.status === "snoozed") return { text: "Snoozed", color: "orange" };
        if (alarmTime <= now) return { text: "Triggered", color: "red" };
        return { text: "Upcoming", color: "green" };
    };

    const filteredAlarms = alarms.filter((alarm) => {
        if (!searchTerm) return true;
        const leadName = getLeadName(alarm);
        return leadName.toLowerCase().includes(searchTerm.toLowerCase());
    });

    if (!hasPermission("alarms.alarms.view")) return <AccessDenied />;

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Alarms</h1>
                <p className="text-gray-600">Manage your lead reminders</p>
            </div>

            {/* Filters */}
            <Card className="mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <Search
                            placeholder="Search by lead name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            allowClear
                        />
                    </div>
                    <Select
                        value={filter}
                        onChange={setFilter}
                        style={{ width: 200 }}
                        options={[
                            { label: "Active", value: "active" },
                            { label: "Snoozed", value: "snoozed" },
                            { label: "Dismissed", value: "dismissed" },
                        ]}
                    />
                </div>
            </Card>

            {/* Alarms List */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Spin size="large" />
                </div>
            ) : filteredAlarms.length === 0 ? (
                <Card>
                    <Empty description="No alarms found" />
                </Card>
            ) : (
                <div className="space-y-4">
                    {filteredAlarms.map((alarm) => {
                        const leadName = getLeadName(alarm);
                        const status = getAlarmStatus(alarm);
                        const alarmTime = dayjs(alarm.alarmTime);
                        const isTriggered = new Date(alarm.alarmTime) <= new Date();

                        return (
                            <Card
                                key={alarm._id}
                                className={`${isTriggered && alarm.status === "active"
                                    ? "border-red-300 bg-red-50/30"
                                    : ""
                                    }`}
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {leadName}
                                            </h3>
                                            <Tag color={status.color}>{status.text}</Tag>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                            <FiClock />
                                            <span>
                                                {alarmTime.format("DD/MM/YYYY hh:mm A")} (
                                                {alarmTime.fromNow()})
                                            </span>
                                        </div>
                                        {alarm.notes && (
                                            <div className="text-sm text-gray-500 mt-2">
                                                {alarm.notes}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {alarm.status === "active" && (
                                            <PermissionGate permission="alarms.alarms.edit">
                                                <Button
                                                    size="small"
                                                    onClick={() => handleSnooze(alarm._id, 15)}
                                                >
                                                    15m
                                                </Button>
                                                <Button
                                                    size="small"
                                                    onClick={() => handleSnooze(alarm._id, 30)}
                                                >
                                                    30m
                                                </Button>
                                                <Button
                                                    size="small"
                                                    onClick={() => handleSnooze(alarm._id, 60)}
                                                >
                                                    1hr
                                                </Button>
                                                <Button
                                                    size="small"
                                                    icon={<FiXCircle />}
                                                    onClick={() => handleDismiss(alarm._id)}
                                                >
                                                    Dismiss
                                                </Button>
                                            </PermissionGate>
                                        )}
                                        <Button
                                            size="small"
                                            type="primary"
                                            onClick={() => handleGoToLead(alarm.lead?._id)}
                                            disabled={!alarm.lead?._id}
                                        >
                                            Go to Lead
                                        </Button>
                                        <PermissionGate permission="alarms.alarms.delete">
                                            <Button
                                                size="small"
                                                danger
                                                icon={<FiTrash2 />}
                                                onClick={() => handleDelete(alarm._id)}
                                            >
                                                Delete
                                            </Button>
                                        </PermissionGate>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

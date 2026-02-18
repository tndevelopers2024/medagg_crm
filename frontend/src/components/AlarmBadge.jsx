import React, { useState, useEffect } from "react";
import { FiBell } from "react-icons/fi";
import { Badge, Modal, Button, Empty } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import useAlarms from "../hooks/useAlarms";
import { useSocket } from "../contexts/SocketProvider";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

// Helper function to get lead name from alarm
const getLeadName = (alarm) => {
    console.log("Alarm data:", alarm);
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

export default function AlarmBadge() {
    const navigate = useNavigate();
    const location = useLocation();
    const { socket } = useSocket();
    const { activeCount, alarms, loadAlarms, dismissAlarm } = useAlarms();
    const [showTriggeredPopup, setShowTriggeredPopup] = useState(false);
    const [triggeredAlarms, setTriggeredAlarms] = useState([]);
    const [dismissing, setDismissing] = useState(false);
    const [shownAlarmIds, setShownAlarmIds] = useState(new Set());

    // Close modal when route changes
    useEffect(() => {
        setShowTriggeredPopup(false);
        setTriggeredAlarms([]);
        // Don't clear shownAlarmIds - we want to remember which alarms were shown
    }, [location.pathname]);

    // Check for triggered alarms every 30 seconds
    useEffect(() => {
        const checkTriggeredAlarms = async () => {
            await loadAlarms("active");
        };

        checkTriggeredAlarms();
        const interval = setInterval(checkTriggeredAlarms, 30000); // Every 30 seconds
        return () => clearInterval(interval);
    }, [loadAlarms]);

    // Check if any alarms have triggered
    useEffect(() => {
        const now = new Date();
        const triggered = alarms.filter((alarm) => {
            const alarmTime = new Date(alarm.alarmTime);
            // Only show if: time has passed, status is active, and we haven't shown this alarm yet
            return (
                alarmTime <= now &&
                alarm.status === "active" &&
                !shownAlarmIds.has(alarm._id)
            );
        });

        if (triggered.length > 0 && !showTriggeredPopup) {
            console.log("Triggered alarms:", triggered);
            setTriggeredAlarms(triggered);
            setShowTriggeredPopup(true);

            // Mark these alarms as shown
            setShownAlarmIds(prev => {
                const newSet = new Set(prev);
                triggered.forEach(alarm => newSet.add(alarm._id));
                return newSet;
            });

            // Request notification permission and show browser notification
            if ("Notification" in window && Notification.permission === "granted") {
                triggered.forEach((alarm) => {
                    const leadName = getLeadName(alarm);
                    new Notification("Alarm Triggered!", {
                        body: `Reminder for ${leadName}`,
                        icon: "/favicon.ico",
                    });
                });
            }
        }
    }, [alarms, showTriggeredPopup, shownAlarmIds]);

    // Request notification permission on mount
    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, []);

    // Listen for socket events for real-time updates
    useEffect(() => {
        if (!socket) return;

        const handleAlarmChange = () => {
            console.log("[Socket] Alarm changed, refreshing count...");
            loadAlarms("active");
        };

        socket.on("alarm:created", handleAlarmChange);
        socket.on("alarm:updated", handleAlarmChange);
        socket.on("alarm:deleted", handleAlarmChange);

        return () => {
            socket.off("alarm:created", handleAlarmChange);
            socket.off("alarm:updated", handleAlarmChange);
            socket.off("alarm:deleted", handleAlarmChange);
        };
    }, [socket, loadAlarms]);

    const handleBellClick = () => {
        navigate("/caller/alarms");
    };

    const handleDismissAll = async () => {
        setDismissing(true);
        try {
            // Dismiss all triggered alarms
            await Promise.all(
                triggeredAlarms.map((alarm) => dismissAlarm(alarm._id))
            );

            // Remove dismissed alarms from shown set so they can trigger again if re-set
            setShownAlarmIds(prev => {
                const newSet = new Set(prev);
                triggeredAlarms.forEach(alarm => newSet.delete(alarm._id));
                return newSet;
            });

            setShowTriggeredPopup(false);
            setTriggeredAlarms([]);
        } catch (error) {
            console.error("Failed to dismiss alarms:", error);
        } finally {
            setDismissing(false);
        }
    };

    const handleViewAlarms = () => {
        setShowTriggeredPopup(false);
        setTriggeredAlarms([]);
        // Use setTimeout to ensure modal closes before navigation
        setTimeout(() => {
            navigate("/caller/alarms");
        }, 100);
    };

    return (
        <>
            <button
                onClick={handleBellClick}
                style={{ padding: 6, borderRadius: "50%" }}
                className="relative inline-flex p-0 items-center justify-center rounded-full border border-[#e2deea] bg-white hover:bg-gray-50"
                aria-label="Alarms"
            >
                <Badge count={activeCount} offset={[-2, 2]} size="small">
                    <FiBell className="text-[18px]" />
                </Badge>
            </button>

            {/* Triggered Alarm Popup */}
            <Modal
                title={
                    <div className="flex items-center gap-2">
                        <FiBell className="text-purple-600" />
                        <span>Alarm Triggered!</span>
                    </div>
                }
                open={showTriggeredPopup}
                onCancel={() => {
                    setShowTriggeredPopup(false);
                    setTriggeredAlarms([]);
                }}
                destroyOnHidden
                maskClosable={false}
                footer={[
                    <Button
                        key="dismiss"
                        onClick={handleDismissAll}
                        loading={dismissing}
                    >
                        Dismiss All
                    </Button>,
                    <Button key="view" type="primary" onClick={handleViewAlarms}>
                        View All Alarms
                    </Button>,
                ]}
                width={400}
            >
                <div className="space-y-3">
                    {triggeredAlarms.length === 0 ? (
                        <Empty description="No triggered alarms" />
                    ) : (
                        triggeredAlarms.map((alarm) => {
                            const leadName = getLeadName(alarm);
                            return (
                                <div
                                    key={alarm._id}
                                    className="p-3 bg-purple-50 border border-purple-200 rounded-lg"
                                >
                                    <div className="font-medium text-gray-900">{leadName}</div>
                                    <div className="text-sm text-gray-600 mt-1">
                                        {dayjs(alarm.alarmTime).format("DD/MM/YYYY hh:mm A")}
                                    </div>
                                    {alarm.notes && (
                                        <div className="text-xs text-gray-500 mt-1">
                                            {alarm.notes}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </Modal>
        </>
    );
}

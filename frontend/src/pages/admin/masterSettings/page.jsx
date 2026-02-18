import React from "react";
import { Tabs, Card } from "antd";
import { useLocation } from "react-router-dom";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";
import { useAuth } from "../../../contexts/AuthContext";
import AccessDenied from "../../../components/AccessDenied";
import {
    SlidersOutlined,
    CalendarOutlined,
    BlockOutlined,
    TeamOutlined,
} from "@ant-design/icons";

// Import the individual setting pages
import FieldSettingsPage from "../fieldSettings/page";
import BookingFieldSettingsPage from "../bookingFieldSettings/page";
import LeadStagesPage from "../leadStages/page";
import RolesPage from "../roles/page";

const ALL_TABS = [
    { key: "fields", label: "Lead Fields", icon: SlidersOutlined, children: <FieldSettingsPage />, permission: "settings.fieldSettings.view" },
    { key: "booking", label: "Booking Fields", icon: CalendarOutlined, children: <BookingFieldSettingsPage />, permission: "settings.bookingFields.view" },
    { key: "stages", label: "Lead Stages", icon: BlockOutlined, children: <LeadStagesPage />, permission: "settings.leadStages.view" },
    { key: "roles", label: "Roles", icon: TeamOutlined, children: <RolesPage />, permission: "roles.roles.view" },
];

export default function MasterSettingsPage() {
    const { hasPermission } = useAuth();
    usePageTitle("Master Settings");
    const location = useLocation();
    const defaultTab = location.state?.tab || "fields";

    const tabs = ALL_TABS.filter((tab) => hasPermission(tab.permission));

    if (tabs.length === 0) return <AccessDenied />;

    return (
        <div className="p-4 md:p-8">
            <Card bordered={false} className="shadow-sm rounded-2xl overflow-hidden">
                <Tabs
                    defaultActiveKey={tabs.some(t => t.key === defaultTab) ? defaultTab : tabs[0]?.key}
                    items={tabs.map((tab) => ({
                        key: tab.key,
                        label: (
                            <span className="flex items-center gap-2">
                                <tab.icon />
                                {tab.label}
                            </span>
                        ),
                        children: (
                            <div className="pt-4">
                                {tab.children}
                            </div>
                        ),
                    }))}
                />
            </Card>
        </div>
    );
}

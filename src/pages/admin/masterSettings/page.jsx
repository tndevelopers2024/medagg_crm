import React, { useState } from "react";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";
import { FiSliders, FiCalendar, FiLayers } from "react-icons/fi";

// Import the individual setting pages
import FieldSettingsPage from "../fieldSettings/page";
import BookingFieldSettingsPage from "../bookingFieldSettings/page";
import LeadStagesPage from "../leadStages/page";

const TABS = [
    { id: "fields", label: "Lead Fields", icon: FiSliders, component: FieldSettingsPage },
    { id: "booking", label: "Booking Fields", icon: FiCalendar, component: BookingFieldSettingsPage },
    { id: "stages", label: "Lead Stages", icon: FiLayers, component: LeadStagesPage },
];

export default function MasterSettingsPage() {
    usePageTitle("Master Settings");
    const [activeTab, setActiveTab] = useState("fields");

    const ActiveComponent = TABS.find((t) => t.id === activeTab)?.component;

    return (
        <div className="flex h-full flex-col">
            {/* Tabs Header */}
            <div className="border-b border-gray-200 bg-white px-4 md:px-8">
                <div className="flex gap-1 overflow-x-auto">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                                        ? "border-violet-600 text-violet-600"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                    }`}
                            >
                                <Icon size={18} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto">
                {ActiveComponent && <ActiveComponent />}
            </div>
        </div>
    );
}

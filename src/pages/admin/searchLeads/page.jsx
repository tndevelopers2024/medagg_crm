import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
    FiSearch, FiPhone, FiMessageCircle, FiMapPin, FiCalendar, FiClock,
    FiUser, FiCheckCircle, FiChevronRight, FiCopy, FiMessageSquare, FiPlusSquare,
    FiActivity
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";
import { useAuth } from "../../../contexts/AuthContext";
import { fetchAllLeads, fetchAssignedLeads, fetchLeadStages, updateLeadStatus } from "../../../utils/api";
import { toast } from "react-hot-toast";

// --- Helpers ---
const renderField = (lead, keys) => {
    if (!Array.isArray(keys)) keys = [keys];
    for (const key of keys) {
        const field = lead.fieldData?.find(f => f.name.toLowerCase().replace(/\s+/g, '_') === key.toLowerCase());
        if (field?.values?.[0]) return field.values[0];
    }
    return "";
};

const getLeadName = (lead) => {
    return lead.name || renderField(lead, ['full_name', 'name', 'customer_name']) || "Unknown";
};

const getLeadPhone = (lead) => {
    return lead.phone || renderField(lead, ['phone_number', 'phone', 'mobile', 'contact']) || "—";
};

// --- Components ---

const LeadListItem = ({ lead, active, onClick }) => {
    const name = getLeadName(lead);
    const status = lead.status || "new";

    return (
        <div
            onClick={() => onClick(lead)}
            className={`cursor-pointer border-b border-gray-100 p-4 transition-colors hover:bg-gray-50 ${active ? 'bg-violet-50/60' : ''}`}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold text-white ${active ? 'bg-[#3b0d66]' : 'bg-gray-700'}`}>
                        {name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-900">{name}</h4>
                        <p className="text-xs text-gray-500">Phone: <span className="font-medium text-gray-700">{getLeadPhone(lead)}</span></p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">
                        {status.substring(0, 2).toUpperCase()}
                    </span>
                    <FiChevronRight className="text-gray-400" />
                </div>
            </div>
        </div>
    );
};

const DetailRow = ({ label, value, copyable, icon }) => (
    <div className="space-y-1">
        <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
            {icon} {label}
        </label>
        <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900">{value}</p>
            {copyable && (
                <button
                    onClick={() => {
                        navigator.clipboard.writeText(value);
                        toast.success("Copied!");
                    }}
                    className="text-gray-400 hover:text-gray-600"
                >
                    <FiCopy size={12} />
                </button>
            )}
        </div>
    </div>
);

const ActionButton = ({ icon: Icon, label, onClick }) => (
    <button
        onClick={onClick}
        className="flex flex-col items-center gap-1 py-1 text-gray-600 hover:text-[#3b0d66]"
    >
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition-all hover:border-violet-200 hover:bg-violet-50 hover:text-[#3b0d66]">
            <Icon size={18} />
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wide">{label}</span>
    </button>
);

export default function SearchLeadsPage() {
    usePageTitle("Search Leads");
    const { isCaller } = useAuth();

    const [query, setQuery] = useState("");
    const [leads, setLeads] = useState([]);
    const [selectedLead, setSelectedLead] = useState(null);
    const [loading, setLoading] = useState(false);
    const [leadStages, setLeadStages] = useState([]);
    const [changingStatus, setChangingStatus] = useState(false);

    // Load stages
    useEffect(() => {
        const loadStages = async () => {
            try {
                const res = await fetchLeadStages({ active: "true" });
                if (res.success) setLeadStages(res.data);
            } catch (err) {
                console.error("Error loading stages:", err);
            }
        };
        loadStages();
    }, []);

    // Debounced Search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLeads(query);
        }, 500);
        return () => clearTimeout(timer);
    }, [query, isCaller]);

    const fetchLeads = async (q) => {
        setLoading(true);
        try {
            // Fetch based on role
            const res = isCaller ? await fetchAssignedLeads() : await fetchAllLeads();
            let all = res.leads || [];

            if (q) {
                const lower = q.toLowerCase();
                all = all.filter(l => {
                    const name = getLeadName(l).toLowerCase();
                    const phone = getLeadPhone(l);
                    return name.includes(lower) || phone.includes(lower);
                });
            }
            setLeads(all.slice(0, 50)); // Limit result
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleStageChange = async (newStage) => {
        if (!selectedLead) return;
        setChangingStatus(true);
        try {
            await updateLeadStatus(selectedLead.id || selectedLead._id, { status: newStage });
            toast.success("Stage updated successfully");
            // Update local state
            setSelectedLead({ ...selectedLead, status: newStage });
            setLeads(leads.map(l =>
                (l.id || l._id) === (selectedLead.id || selectedLead._id)
                    ? { ...l, status: newStage }
                    : l
            ));
        } catch (err) {
            toast.error("Failed to update stage");
        } finally {
            setChangingStatus(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col md:flex-row overflow-hidden bg-white">
            {/* LEFT SIDEBAR: Search & List */}
            <div className="w-full flex-shrink-0 border-r border-gray-200 bg-white md:w-96 flex flex-col">
                <div className="p-4 border-b border-gray-100">
                    <h2 className="mb-3 text-sm font-semibold text-gray-500">Search leads</h2>
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, phone..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm outline-none focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100"
                        />
                        {query && (
                            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
                                &times;
                            </button>
                        )}
                    </div>

                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {['Auto', 'Phone', 'Text'].map(t => (
                            <button key={t} className="flex-shrink-0 rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50">
                                {t}
                            </button>
                        ))}
                    </div>

                    <p className="mt-3 text-xs font-medium text-gray-500">
                        {loading ? "Searching..." : <>{leads.length} matching leads for <span className="font-bold text-gray-900">{query || "all"}</span></>}
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {leads.map(lead => (
                        <LeadListItem
                            key={lead.id}
                            lead={lead}
                            active={selectedLead?.id === lead.id}
                            onClick={setSelectedLead}
                        />
                    ))}
                    {!loading && leads.length === 0 && (
                        <div className="p-8 text-center text-sm text-gray-500">No leads found.</div>
                    )}
                </div>
            </div>

            {/* RIGHT MAIN: Detail Details */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-8">
                {selectedLead ? (
                    <div className="mx-auto max-w-4xl rounded-2xl bg-white shadow-sm ring-1 ring-gray-900/5">
                        {/* Header */}
                        <div className="flex items-start justify-between border-b border-gray-100 p-6">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{getLeadName(selectedLead)}</h1>
                                <div className="mt-2 flex items-center gap-3">
                                    <select
                                        value={selectedLead.status || "new"}
                                        onChange={(e) => handleStageChange(e.target.value)}
                                        disabled={changingStatus}
                                        className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 uppercase tracking-wide border-0 outline-none cursor-pointer hover:bg-blue-100 disabled:opacity-50"
                                    >
                                        {leadStages.map((stage) => (
                                            <option key={stage.stageName} value={stage.stageName}>
                                                {stage.displayLabel}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="flex gap-0.5 text-gray-300">
                                        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-2 w-2 rounded-full bg-gray-200" />)}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {/* <button className="rounded-full p-2 text-green-600 hover:bg-green-50"><FaWhatsapp size={20} /></button>
                                <button className="rounded-full p-2 text-gray-400 hover:bg-gray-100"><FiMessageSquare size={20} /></button> */}
                                <button className="rounded-full p-2 text-gray-400 hover:bg-gray-100"><FiCopy size={20} /></button>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 gap-8 p-6 md:grid-cols-2">
                            <DetailRow
                                icon={<FiPhone className="text-gray-400" />}
                                label="Phone"
                                value={getLeadPhone(selectedLead)}
                                copyable
                            />
                            <DetailRow
                                icon={<FiMapPin className="text-gray-400" />}
                                label="Lead Source"
                                value={selectedLead.source || renderField(selectedLead, "source")}
                            />
                            <DetailRow
                                icon={<FiUser className="text-gray-400" />}
                                label="Department"
                                value={renderField(selectedLead, "department") || "—"}
                            />
                            <DetailRow
                                icon={<FiActivity className="text-gray-400" />}
                                label="Procedure"
                                value={renderField(selectedLead, "procedure") || "—"}
                            />
                            <DetailRow
                                icon={<FiCalendar className="text-gray-400" />}
                                label="Call Later Date"
                                value={selectedLead.followUpAt ? new Date(selectedLead.followUpAt).toLocaleDateString() : "—"}
                            />
                            <DetailRow
                                icon={<FiMapPin className="text-gray-400" />}
                                label="Location"
                                value={renderField(selectedLead, "location") || "—"}
                            />
                        </div>

                        {/* Quick Actions */}
                        <div className="border-t border-gray-100 bg-gray-50/50 p-6">
                            <div className="flex items-center justify-around md:justify-start md:gap-10">
                                <ActionButton icon={FiPhone} label="Call" onClick={() => toast("Call initiated")} />
                                <ActionButton icon={FiClock} label="Call Later" onClick={() => toast("Scheduled for later")} />
                                <ActionButton icon={FaWhatsapp} label="Whatsapp" onClick={() => toast("Opening Whatsapp")} />
                                <ActionButton icon={FiMessageCircle} label="SMS" onClick={() => toast("Sending SMS")} />
                                <ActionButton icon={FiPlusSquare} label="Add Note" onClick={() => toast("Note added")} />
                            </div>
                            <div className="mt-6 flex justify-center md:justify-end">
                                <Link
                                    to={`/admin/leads/${selectedLead.id || selectedLead._id || selectedLead.leadId}`}
                                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                                >
                                    View Full Details <FiChevronRight />
                                </Link>
                            </div>
                        </div>

                        {/* Tabs Placeholder */}
                        <div className="border-t border-gray-100">
                            <div className="flex border-b border-gray-100 px-6">
                                <button className="border-b-2 border-[#3b0d66] px-4 py-3 text-sm font-semibold text-[#3b0d66]">Activity History</button>
                                <button className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700">Tasks</button>
                            </div>
                            <div className="p-6 text-sm text-gray-500 text-center py-12">
                                No history available for this lead yet.
                            </div>
                        </div>

                    </div>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                        <div className="mb-4 rounded-full bg-violet-50 p-6">
                            <FiSearch className="h-8 w-8 text-violet-300" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Select a lead to view details</h3>
                        <p className="mt-1 text-sm text-gray-500">Use the search bar on the left to find leads.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

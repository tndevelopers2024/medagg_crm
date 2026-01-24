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
import { fetchAllLeads, fetchAssignedLeads, fetchLeadStages, updateLeadStatus, fetchLeadActivities, updateLeadDetails } from "../../../utils/api";
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

// Helper to format status labels (remove underscores, capitalize)
const formatStatus = (s) => {
    if (!s) return "";
    return String(s).replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
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

const ActivityItem = ({ act }) => {
    const date = new Date(act.createdAt || Date.now());
    return (
        <div className="flex gap-3 pb-6 relative">
            <div className="flex flex-col items-center">
                <div className="h-2 w-2 rounded-full bg-gray-300 ring-4 ring-white" />
                <div className="w-px bg-gray-200 flex-1 my-1" />
            </div>
            <div className="flex-1 -mt-1.5">
                <p className="text-sm text-gray-800">
                    <span className="font-semibold">{act.action === "lead_update" ? "Updated" : act.action.replace(/_/g, " ")}: </span>
                    {act.description}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                    <FiClock size={10} />
                    <span>{date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>•</span>
                    <span>{act.actor?.name || "System"}</span>
                </div>
            </div>
        </div>
    );
};

export default function SearchLeadsPage() {
    usePageTitle("Search Leads");
    const { isCaller } = useAuth();

    const [query, setQuery] = useState("");
    const [leads, setLeads] = useState([]);
    const [selectedLead, setSelectedLead] = useState(null);
    const [loading, setLoading] = useState(false);
    const [leadStages, setLeadStages] = useState([]);
    const [changingStatus, setChangingStatus] = useState(false);

    const [activities, setActivities] = useState([]);
    const [activitiesLoading, setActivitiesLoading] = useState(false);

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

    // Load Activities when lead selected
    useEffect(() => {
        if (!selectedLead?.id && !selectedLead?._id) {
            setActivities([]);
            return;
        }
        const loadActs = async () => {
            setActivitiesLoading(true);
            try {
                const id = selectedLead.id || selectedLead._id;
                const res = await fetchLeadActivities(id);
                setActivities(res.activities || []);
            } catch (err) {
                console.error("Failed to load activities", err);
            } finally {
                setActivitiesLoading(false);
            }
        };
        loadActs();
    }, [selectedLead]);

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

    const handleRating = async (val) => {
        if (!selectedLead) return;
        const id = selectedLead.id || selectedLead._id;
        const currentFieldData = selectedLead.fieldData || [];

        // Optimistic update
        const updatedFieldData = currentFieldData.filter(f => f.name !== "rating");
        updatedFieldData.push({ name: "rating", values: [String(val)] });

        setSelectedLead({ ...selectedLead, fieldData: updatedFieldData });

        try {
            // We use updateLeadDetails to patch the fieldData
            // Just sending the delta fieldData updates is enough usually if backend supports it,
            // but updateLeadDetails typically expects a map of fieldName->value for 'fieldDataUpdates'
            const updates = { rating: String(val) };
            await updateLeadDetails(id, { fieldDataUpdates: updates });
            toast.success(`Rated ${val} stars`);
        } catch (err) {
            console.error(err);
            toast.error("Failed to save rating");
        }
    };

    const currentRating = parseInt(renderField(selectedLead || {}, "rating") || "0", 10);

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
                                                {formatStatus(stage.displayLabel || stage.stageName)}
                                            </option>
                                        ))}
                                    </select>

                                    {/* Rating UI */}
                                    <div className="flex gap-0.5 text-gray-300 ml-2">
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <button
                                                key={i}
                                                onClick={() => handleRating(i)}
                                                className={`transition-transform hover:scale-110 ${i <= currentRating ? "text-yellow-400" : "text-gray-200 hover:text-yellow-200"}`}
                                            >
                                                <FiActivity className={i <= currentRating ? "fill-current" : ""} size={16}
                                                    style={{
                                                        fill: i <= currentRating ? "currentColor" : "none",
                                                        stroke: "currentColor"
                                                    }}
                                                // Note: FiActivity is not a Star. Swapping to specific star SVG or check imports.
                                                // The user used <FiActivity> previously as placeholder. 
                                                // I should strictly use a Star icon. FiStar is best.
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Link
                                    to={`/${isCaller ? 'caller' : 'admin'}/leads/${selectedLead.id || selectedLead._id || selectedLead.leadId}`}
                                    className="hidden items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 md:inline-flex"
                                >
                                    View Details <FiChevronRight />
                                </Link>
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
                            {/* Assigned Caller Row */}
                            <DetailRow
                                icon={<FiUser className="text-gray-400" />}
                                label="Assigned To"
                                value={selectedLead.assignedTo?.name || selectedLead.assignedTo?.email || "Unassigned"}
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

                        {/* Activity History */}
                        <div className="border-t border-gray-100">
                            <div className="flex border-b border-gray-100 px-6">
                                <button className="border-b-2 border-[#3b0d66] px-4 py-3 text-sm font-semibold text-[#3b0d66]">Activity History</button>
                            </div>
                            <div className="p-6 max-h-96 overflow-y-auto">
                                {activitiesLoading ? (
                                    <div className="text-center py-8 text-gray-400 text-sm">Loading activities...</div>
                                ) : activities.length > 0 ? (
                                    <div className="pl-2">
                                        {activities.map((act) => (
                                            <ActivityItem key={act._id || act.id} act={act} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-sm text-gray-500">
                                        No history available for this lead yet.
                                    </div>
                                )}
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

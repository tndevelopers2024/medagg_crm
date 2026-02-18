
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    FiArrowLeft,
    FiCalendar,
    FiClock,
    FiPhone,
    FiDollarSign,
    FiSearch,
    FiFilter,
    FiX,
    FiMessageSquare,
    FiCheckCircle,
    FiAlertCircle,
    FiUser
} from "react-icons/fi";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";
import { fetchCallerDetailStats } from "../../../utils/api";
import { useAuth } from "../../../contexts/AuthContext";
import Loader from "../../../components/Loader";
import AccessDenied from "../../../components/AccessDenied";

/* -------------------- Helper Components -------------------- */
const initialsOf = (name = "") =>
    name
        .trim()
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

const Pill = ({ children, tone = "gray" }) => {
    const tones = {
        gray: "bg-gray-100 text-gray-700",
        green: "bg-green-100 text-green-700",
        red: "bg-red-100 text-red-700",
        blue: "bg-blue-100 text-blue-700",
        violet: "bg-violet-100 text-violet-700",
        orange: "bg-orange-100 text-orange-700",
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${tones[tone] || tones.gray}`}>
            {children}
        </span>
    );
};

const StatCard = ({ title, value, icon, tone = "violet" }) => {
    const tones = {
        violet: "bg-violet-50 text-violet-700",
        gray: "bg-gray-50 text-gray-700",
        emerald: "bg-emerald-50 text-emerald-700",
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col items-center justify-center flex-1 min-w-[120px]">
            <div className={`p-2 rounded-lg mb-2 ${tones[tone]}`}>
                {icon}
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
    );
};

/* -------------------- Chart Component -------------------- */
const BarChart = ({ data = [] }) => {
    const maxCount = Math.max(...data.map(d => d.count), 1);

    return (
        <div className="flex items-end gap-2 h-64 w-full">
            {data.map((item, i) => {
                const height = (item.count / maxCount) * 100;
                return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                        <div className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">{item.count}</div>
                        <div
                            className="w-full bg-indigo-500 rounded-t hover:bg-indigo-600 transition-all cursor-pointer relative"
                            style={{ height: `${height}%`, minHeight: item.count > 0 ? '4px' : '0px' }}
                        >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition whitespace-nowrap z-10">
                                {item.count} calls at {item.hour}
                            </div>
                        </div>
                        <div className="text-[10px] text-gray-500 transform -rotate-45 origin-top-left mt-2 whitespace-nowrap">
                            {item.hour}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

/* -------------------- Lead Detail Panel -------------------- */
const LeadDetailPanel = ({ lead, onClose }) => {
    const [activeTab, setActiveTab] = useState("activity"); // activity, task

    if (!lead) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-gray-200 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-start justify-between bg-gray-50">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">{lead.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-gray-500">{lead.phone}</p>
                        <Pill tone={["won", "converted", "opd done", "ipd done"].includes(lead.status.toLowerCase()) ? "green" : "gray"}>
                            {lead.status}
                        </Pill>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition">
                    <FiX className="w-5 h-5 text-gray-500" />
                </button>
            </div>

            {/* Quick Actions */}
            <div className="p-4 grid grid-cols-3 gap-3 border-b border-gray-100">
                <button className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-gray-50 gap-1 text-gray-600">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <FiPhone className="w-4 h-4" />
                    </div>
                    <span className="text-xs">Call</span>
                </button>
                <button className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-gray-50 gap-1 text-gray-600">
                    <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                        <FiMessageSquare className="w-4 h-4" />
                    </div>
                    <span className="text-xs">Whatsapp</span>
                </button>
                <button className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-gray-50 gap-1 text-gray-600">
                    <div className="w-8 h-8 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center">
                        <FiCheckCircle className="w-4 h-4" />
                    </div>
                    <span className="text-xs">Task</span>
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab("activity")}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition ${activeTab === "activity"
                            ? "border-violet-600 text-violet-700"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                >
                    Activity History
                </button>
                <button
                    onClick={() => setActiveTab("task")}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition ${activeTab === "task"
                            ? "border-violet-600 text-violet-700"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                >
                    Task
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                {activeTab === "activity" && (
                    <div className="space-y-4">
                        {/* Timeline Item - Lead Created */}
                        <div className="flex gap-3">
                            <div className="flex flex-col items-center">
                                <div className="w-2 h-2 rounded-full bg-gray-300 mt-2" />
                                <div className="w-0.5 flex-1 bg-gray-200 my-1" />
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex-1">
                                <p className="text-sm font-medium text-gray-900">Lead Created</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {lead.createdTime ? new Date(lead.createdTime).toLocaleString() : "Unknown date"}
                                </p>
                            </div>
                        </div>

                        {/* Fallback for activity */}
                        <div className="text-center py-8 text-gray-500 text-sm">
                            No more activity history found.
                        </div>
                    </div>
                )}

                {activeTab === "task" && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <FiCheckCircle className="w-12 h-12 text-gray-300 mb-2" />
                        <p>No tasks scheduled</p>
                    </div>
                )}
            </div>
        </div>
    );
};

/* -------------------- Main Page Component -------------------- */
export default function AdminReportsPage() {
    const { hasPermission } = useAuth();
    const { callerId } = useParams();
    const navigate = useNavigate();
    usePageTitle("Reports", "Detailed caller analytics");

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [selectedLead, setSelectedLead] = useState(null);
    const [period, setPeriod] = useState("TODAY"); // TODAY, WEEK, MONTH, YEAR

    useEffect(() => {
        let mounted = true;
        const loadData = async () => {
            try {
                setLoading(true);
                // Using existing endpoint, in real app might need period filter
                const stats = await fetchCallerDetailStats(callerId);
                if (mounted) {
                    setData(stats);
                }
            } catch (err) {
                console.error("Failed to load report data:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        loadData();
        return () => { mounted = false; };
    }, [callerId, period]);

    // Update page title when data loads
    useEffect(() => {
        if (data?.caller?.name) {
            // We can't easily update title context from here dynamically if it doesn't support it
            // but the initial usePageTitle hook set a default
        }
    }, [data]);

    const recentLeads = useMemo(() => data?.recentLeads || [], [data]);

    if (!hasPermission("reports.reports.view")) return <AccessDenied />;
    if (loading) return <Loader text="Loading report..." />;
    if (!data) return <div className="p-8 text-center text-gray-500">Caller not found or error loading data.</div>;

    const { caller, stats, callsByHour } = data;

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-50">
            {/* Left Side - Main Content */}
            <div className={`flex-1 overflow-y-auto transition-all duration-300 ${selectedLead ? 'mr-0 md:mr-[450px]' : ''}`}>
                <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

                    {/* Header & Tabs */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigate(-1)} className="p-2 hover:bg-white rounded-full transition text-gray-600">
                                <FiArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    Reports
                                    <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-sm font-medium">
                                        {initialsOf(caller.name)}
                                    </span>
                                </h1>
                                <p className="text-sm text-gray-500">{caller.name} • {caller.email}</p>
                            </div>
                        </div>

                        <div className="bg-white p-1 rounded-lg border border-gray-200 flex text-sm font-medium">
                            {['TODAY', 'WEEK', 'MONTH', 'YEAR'].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={`px-4 py-1.5 rounded-md transition ${period === p
                                            ? 'bg-violet-100 text-violet-700 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Stats Cards Row */}
                    <div className="flex flex-wrap gap-4">
                        <StatCard
                            title="CALLS"
                            value={stats.totalCalls}
                            icon={<FiPhone className="w-5 h-5" />}
                            tone="violet"
                        />
                        <StatCard
                            title="TIME"
                            value={stats.totalDuration}
                            icon={<FiClock className="w-5 h-5" />}
                            tone="gray"
                        />
                        <StatCard
                            title="SALES"
                            value={`₹${stats.sales}`}
                            icon={<FiDollarSign className="w-5 h-5" />}
                            tone="emerald"
                        />
                    </div>

                    {/* Chart Section */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-6">Call Volume</h3>
                        <div className="px-2">
                            <BarChart data={callsByHour} />
                        </div>
                    </div>

                    {/* Leads List */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">
                                {recentLeads.length} matching leads
                            </h3>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search leads..."
                                        className="pl-9 pr-4 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none w-48"
                                    />
                                </div>
                                <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">
                                    <FiFilter className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-50 text-gray-600 font-medium">
                                    <tr>
                                        <th className="px-6 py-3 text-left">Lead Name</th>
                                        {/* <th className="px-6 py-3 text-left">Phone</th> */}
                                        <th className="px-6 py-3 text-left">Status</th>
                                        <th className="px-6 py-3 text-left">Created</th>
                                        <th className="px-6 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {recentLeads.map((lead) => (
                                        <tr
                                            key={lead.id}
                                            onClick={() => setSelectedLead(lead)}
                                            className={`cursor-pointer transition hover:bg-violet-50 ${selectedLead?.id === lead.id ? 'bg-violet-50' : ''}`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{lead.name}</div>
                                                <div className="text-gray-500 text-xs mt-0.5">{lead.phone}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Pill tone={["won", "converted"].includes(lead.status) ? "green" : "gray"}>
                                                    {lead.status}
                                                </Pill>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500">
                                                {lead.createdTime ? new Date(lead.createdTime).toLocaleDateString() : '—'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="text-violet-600 hover:text-violet-800 font-medium text-xs">View</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {recentLeads.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                                No recent leads found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Slide-out Panel */}
            <LeadDetailPanel
                lead={selectedLead}
                onClose={() => setSelectedLead(null)}
            />
        </div>
    );
}

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiPlus, FiFacebook, FiTrendingUp, FiCheckCircle, FiX, FiRefreshCw } from "react-icons/fi";
import { FaGoogle, FaInstagram, FaLinkedin } from "react-icons/fa";
import { fetchCampaigns, createCampaign, syncCampaign } from "../../../utils/api";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";
import toast from "react-hot-toast";

const PlatformIcon = ({ platform }) => {
    switch (platform) {
        case "facebook": return <FiFacebook className="text-blue-600" />;
        case "google": return <FaGoogle className="text-red-500" />;
        case "instagram": return <FaInstagram className="text-pink-600" />;
        case "linkedin": return <FaLinkedin className="text-blue-700" />;
        default: return <FiTrendingUp className="text-gray-500" />;
    }
};

const CreateCampaignModal = ({ onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: "",
        platform: "facebook",
        budget: "",
        status: "active",
        // Integration
        integrationProvider: "none",
        adAccountId: "",
        formId: "",
        accessToken: "",
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name) return toast.error("Name is required");

        setLoading(true);
        try {
            await createCampaign({
                name: form.name,
                platform: form.platform,
                budget: Number(form.budget),
                status: form.status,
                integration: {
                    provider: form.integrationProvider,
                    adAccountId: form.adAccountId,
                    formId: form.formId,
                    accessToken: form.accessToken,
                }
            });
            toast.success("Campaign created!");
            onSuccess();
        } catch (err) {
            console.error(err);
            toast.error("Failed to create campaign");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden my-8">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Create New Campaign</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <FiX />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700">Campaign Name</label>
                        <input
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-100"
                            placeholder="e.g. Summer Sale 2024"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-700">Platform</label>
                            <select
                                value={form.platform}
                                onChange={(e) => setForm({ ...form, platform: e.target.value })}
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-100"
                            >
                                <option value="facebook">Facebook</option>
                                <option value="google">Google</option>
                                <option value="instagram">Instagram</option>
                                <option value="linkedin">LinkedIn</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-700">Budget</label>
                            <input
                                type="number"
                                value={form.budget}
                                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-100"
                                placeholder="e.g. 5000"
                            />
                        </div>
                    </div>

                    {/* Integration Section */}
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                        <h4 className="text-sm font-semibold text-gray-900">Lead Integration (Optional)</h4>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-700">Provider</label>
                            <select
                                value={form.integrationProvider}
                                onChange={(e) => setForm({ ...form, integrationProvider: e.target.value })}
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-100"
                            >
                                <option value="none">None (Manual Only)</option>
                                <option value="meta">Meta (Facebook/Instagram)</option>
                                <option value="google">Google Ads</option>
                            </select>
                        </div>

                        {form.integrationProvider === "meta" && (
                            <>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-700">Form ID</label>
                                    <input
                                        value={form.formId}
                                        onChange={(e) => setForm({ ...form, formId: e.target.value })}
                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-100"
                                        placeholder="Facebook Lead Form ID"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-700">Access Token</label>
                                    <input
                                        value={form.accessToken}
                                        onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-100"
                                        placeholder="Long-lived User/System Access Token"
                                        type="password"
                                    />
                                </div>
                            </>
                        )}

                        {form.integrationProvider === "google" && (
                            <>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-700">Customer ID</label>
                                    <input
                                        value={form.adAccountId}
                                        onChange={(e) => setForm({ ...form, adAccountId: e.target.value })}
                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-100"
                                        placeholder="Google Ads Customer ID"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-700">Access Token</label>
                                    <input
                                        value={form.accessToken}
                                        onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-100"
                                        placeholder="OAuth Access Token"
                                        type="password"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 rounded-xl bg-[#3b0d66] py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-70"
                        >
                            {loading ? "Creating..." : "Create Campaign"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default function CampaignsPage() {
    usePageTitle("Campaigns");
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [syncing, setSyncing] = useState({});

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await fetchCampaigns();
            if (res.success) {
                setCampaigns(res.data);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to load campaigns");
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async (id) => {
        setSyncing(prev => ({ ...prev, [id]: true }));
        try {
            const res = await syncCampaign(id);
            if (res.success) {
                toast.success(res.message);
                loadData(); // Reload to see new lead counts etc
            } else {
                toast.error(res.error || "Sync failed");
            }
        } catch (err) {
            console.error(err);
            toast.error("Sync failed: " + (err.response?.data?.error || err.message));
        } finally {
            setSyncing(prev => ({ ...prev, [id]: false }));
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    return (
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
            {/* Header */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Campaign Management</h1>
                    <p className="text-sm text-gray-500">Track and manage your marketing campaigns</p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#3b0d66] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-200 hover:opacity-90"
                >
                    <FiPlus /> New Campaign
                </button>
            </div>

            {loading ? (
                <div className="py-20 text-center text-gray-500">Loading campaigns...</div>
            ) : campaigns.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 py-16 text-center">
                    <h3 className="text-lg font-medium text-gray-900">No Campaigns Yet</h3>
                    <p className="mt-1 text-sm text-gray-500">Create your first campaign to start tracking.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {campaigns.map((camp) => (
                        <div key={camp._id} className="group relative rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                            <div className="mb-4 flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-full bg-gray-50 p-3">
                                        <PlatformIcon platform={camp.platform} />
                                    </div>
                                    <div className="flex flex-col">
                                        <h3 className="text-lg font-semibold text-gray-900">{camp.name}</h3>
                                        <span className="text-xs text-gray-400">
                                            {camp.integration?.provider !== 'none' ? `Linked: ${camp.integration.provider}` : 'Manual'}
                                        </span>
                                    </div>
                                </div>
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${camp.status === 'active'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                    : 'bg-gray-100 text-gray-700 border-gray-200'
                                    }`}>
                                    {camp.status.toUpperCase()}
                                </span>
                            </div>

                            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-gray-50 pt-4">
                                <div>
                                    <p className="text-xs text-gray-500">Impressions</p>
                                    <p className="font-semibold text-gray-900">{(camp.metaData?.impressions || 0).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Clicks</p>
                                    <p className="font-semibold text-gray-900">{(camp.metaData?.clicks || 0).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Leads</p>
                                    <p className="font-semibold text-gray-900">{(camp.metaData?.leads || 0).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Spend</p>
                                    <p className="font-semibold text-gray-900">₹{(camp.metaData?.spend || 0).toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Sync Button */}
                            {(camp.integration?.provider === 'meta' || camp.integration?.provider === 'google') && (
                                <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center">
                                    <span className="text-xs text-gray-400">
                                        Last: {camp.integration.lastSyncAt ? new Date(camp.integration.lastSyncAt).toLocaleString() : 'Never'}
                                    </span>
                                    <button
                                        onClick={() => handleSync(camp._id)}
                                        disabled={syncing[camp._id]}
                                        className="text-xs font-medium flex items-center gap-1.5 text-violet-700 hover:text-violet-900 disabled:opacity-50"
                                    >
                                        <FiRefreshCw className={syncing[camp._id] ? "animate-spin" : ""} />
                                        {syncing[camp._id] ? "Syncing..." : "Sync Now"}
                                    </button>
                                </div>
                            )}

                            {/* Import Leads Button */}
                            <div className={`${(camp.integration?.provider === 'meta' || camp.integration?.provider === 'google') ? 'mt-3' : 'mt-4 pt-3 border-t border-gray-50'}`}>
                                <Link
                                    to={`/admin/campaigns/${camp._id}/import`}
                                    className="flex items-center justify-center gap-2 rounded-lg bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100 transition-colors"
                                >
                                    <FiPlus size={16} />
                                    Import Leads
                                </Link>
                            </div>

                        </div>
                    ))}
                </div>
            )}

            {showCreate && (
                <CreateCampaignModal
                    onClose={() => setShowCreate(false)}
                    onSuccess={() => {
                        setShowCreate(false);
                        loadData();
                    }}
                />
            )}
        </div>
    );
}

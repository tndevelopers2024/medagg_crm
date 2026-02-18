import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiUpload, FiTrendingUp } from "react-icons/fi";
import { fetchCampaigns } from "../../../utils/api";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";
import { useAuth } from "../../../contexts/AuthContext";
import AccessDenied from "../../../components/AccessDenied";
import toast from "react-hot-toast";

const BulkUploadPage = () => {
    const { hasPermission } = useAuth();
    usePageTitle("Bulk Upload");
    const navigate = useNavigate();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCampaigns();
    }, []);

    const loadCampaigns = async () => {
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

    const handleCampaignClick = (campaignId) => {
        navigate(`/campaigns/${campaignId}/import`);
    };

    if (!hasPermission("campaigns.import.view")) return <AccessDenied />;

    if (loading) {
        return (
            <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 text-center">
                Loading campaigns...
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-lg bg-violet-50 p-2">
                        <FiUpload className="text-violet-600" size={24} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Bulk Upload Leads</h1>
                </div>
                <p className="text-sm text-gray-500">
                    Select a campaign to upload leads in bulk via CSV or XLSX files
                </p>
            </div>

            {/* Campaigns Grid */}
            {campaigns.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 py-16 text-center">
                    <h3 className="text-lg font-medium text-gray-900">No Campaigns Available</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Create a campaign first to upload leads.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {campaigns.map((campaign) => (
                        <button
                            key={campaign._id}
                            onClick={() => handleCampaignClick(campaign._id)}
                            className="group rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm transition-all hover:shadow-md hover:border-violet-200"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-full bg-violet-50 p-3 group-hover:bg-violet-100 transition-colors">
                                        <FiTrendingUp className="text-violet-600" size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 group-hover:text-violet-700 transition-colors">
                                            {campaign.name}
                                        </h3>
                                        <p className="text-xs text-gray-500 capitalize">
                                            {campaign.platform}
                                        </p>
                                    </div>
                                </div>
                                <span
                                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${campaign.status === "active"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                        : "bg-gray-100 text-gray-700 border-gray-200"
                                        }`}
                                >
                                    {campaign.status.toUpperCase()}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                                <div>
                                    <p className="text-xs text-gray-500">Current Leads</p>
                                    <p className="font-semibold text-gray-900">
                                        {(campaign.metaData?.leads || 0).toLocaleString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Budget</p>
                                    <p className="font-semibold text-gray-900">
                                        ₹{(campaign.budget || 0).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 group-hover:bg-violet-100 transition-colors">
                                <FiUpload size={16} />
                                Upload Leads
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default BulkUploadPage;

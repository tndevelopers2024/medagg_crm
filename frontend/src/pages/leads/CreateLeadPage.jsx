import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiArrowLeft } from "react-icons/fi";
import { createLead } from "../../utils/api";
import { usePageTitle } from "../../contexts/TopbarTitleContext";
import { useAuth } from "../../contexts/AuthContext";
import AccessDenied from "../../components/AccessDenied";
import { DynamicField, objectToFieldData } from "../../components/DynamicField";
import toast from "react-hot-toast";
import { useLeadFields, useBookingFields, useLeadStages, useCampaigns, useUsers } from "../../hooks/queries/useConfigQueries";

export default function CreateLeadPage() {
    const navigate = useNavigate();
    const { isAdmin, hasPermission } = useAuth();
    usePageTitle("Create New Lead");

    // Config queries (shared 5min cache — no duplicate fetches)
    const { data: leadFields = [], isLoading: leadFieldsLoading } = useLeadFields({ active: "true" });
    const { data: opFields = [] } = useBookingFields({ type: "OP", active: "true" });
    const { data: ipFields = [] } = useBookingFields({ type: "IP", active: "true" });
    const { data: diagnosticFields = [] } = useBookingFields({ type: "DIAGNOSTIC", active: "true" });
    const { data: leadStages = [] } = useLeadStages({ active: "true" });
    const { data: users = [] } = useUsers({ role: "caller" });
    const { data: campaigns = [] } = useCampaigns();

    const [loading, setLoading] = useState(false);
    const fieldsLoading = leadFieldsLoading;

    const [leadData, setLeadData] = useState({});
    const [opBookingData, setOpBookingData] = useState({});
    const [ipBookingData, setIpBookingData] = useState({});
    const [hasOpBooking, setHasOpBooking] = useState(false);
    const [hasIpBooking, setHasIpBooking] = useState(false);
    const [hasDiagBooking, setHasDiagBooking] = useState(false);
    const [diagBookingData, setDiagBookingData] = useState({});

    // Additional fields not in dynamic config
    const [assignedTo, setAssignedTo] = useState("");
    const [campaignId, setCampaignId] = useState("");
    const [status, setStatus] = useState("new");
    const [notes, setNotes] = useState("");

    const handleLeadFieldChange = (fieldName, value) => {
        setLeadData((prev) => ({ ...prev, [fieldName]: value }));
    };

    const handleOpFieldChange = (fieldName, value) => {
        setOpBookingData((prev) => ({ ...prev, [fieldName]: value }));
    };

    const handleIpFieldChange = (fieldName, value) => {
        setIpBookingData((prev) => ({ ...prev, [fieldName]: value }));
    };

    const handleDiagFieldChange = (fieldName, value) => {
        setDiagBookingData((prev) => ({ ...prev, [fieldName]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate primary fields
        const nameField = leadFields.find((f) => f.fieldName === "full_name");
        const phoneField = leadFields.find((f) => f.fieldName === "phone_number");

        if (!leadData.full_name || !leadData.phone_number) {
            toast.error("Name and Phone are required");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                name: leadData.full_name,
                phone: leadData.phone_number,
                email: leadData.email || "",
                notes,
                status,
                assignedTo: assignedTo || undefined,
                campaignId: campaignId || undefined,
                fieldData: objectToFieldData(leadData),
                opBookings: hasOpBooking
                    ? [
                        {
                            fieldData: objectToFieldData(opBookingData),
                            status: "pending",
                        },
                    ]
                    : [],
                ipBookings: hasIpBooking
                    ? [
                        {
                            fieldData: objectToFieldData(ipBookingData),
                            status: "pending",
                        },
                    ]
                    : [],
                diagnosticBookings: hasDiagBooking
                    ? [
                        {
                            fieldData: objectToFieldData(diagBookingData),
                            status: "pending",
                        },
                    ]
                    : [],
            };

            await createLead(payload);
            toast.success("Lead created successfully");
            navigate("/leads");
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || "Failed to create lead");
        } finally {
            setLoading(false);
        }
    };

    if (fieldsLoading) {
        return (
            <div className="mx-auto px-4 py-6 md:px-8 text-center">
                <p className="text-gray-500">Loading field configurations...</p>
            </div>
        );
    }

    // Separate primary and other fields
    const primaryFields = leadFields.filter((f) => f.isPrimary);
    const otherFields = leadFields.filter((f) => !f.isPrimary);

    if (!hasPermission("leads.all.create")) return <AccessDenied />;

    return (
        <div className="mx-auto px-4 py-6 md:px-8">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
                >
                    <FiArrowLeft /> Back
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Create New Lead</h1>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Primary Fields */}
                    {primaryFields.length > 0 && (
                        <div>
                            <h3 className="mb-4 text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">
                                Contact Information
                            </h3>
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                {primaryFields.map((field) => (
                                    <DynamicField
                                        key={field._id}
                                        field={field}
                                        value={leadData[field.fieldName]}
                                        onChange={handleLeadFieldChange}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Other Lead Fields */}
                    {otherFields.length > 0 && (
                        <div>
                            <h3 className="mb-4 text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">
                                Additional Information
                            </h3>
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                {otherFields.map((field) => (
                                    <DynamicField
                                        key={field._id}
                                        field={field}
                                        value={leadData[field.fieldName]}
                                        onChange={handleLeadFieldChange}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Assignment & Campaign */}
                    <div>
                        <h3 className="mb-4 text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">
                            Assignment & Campaign
                        </h3>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Assign To Caller</label>
                                <select
                                    value={assignedTo}
                                    onChange={(e) => setAssignedTo(e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-100"
                                >
                                    <option value="">Unassigned</option>
                                    {users.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name || u.email}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Campaign</label>
                                <select
                                    value={campaignId}
                                    onChange={(e) => setCampaignId(e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-100"
                                >
                                    <option value="">Select Campaign...</option>
                                    {campaigns.map((c) => (
                                        <option key={c._id} value={c._id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Lead Status</label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-100"
                                >
                                    {leadStages
                                        .filter((s) => s.stageCategory === "initial" || s.stageCategory === "active")
                                        .map((stage) => (
                                            <option key={stage.stageName} value={stage.stageName}>
                                                {stage.displayLabel}
                                            </option>
                                        ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Initial Bookings */}
                    <div>
                        <h3 className="mb-4 text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">
                            Initial Bookings
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="hasOpBooking"
                                    checked={hasOpBooking}
                                    onChange={(e) => setHasOpBooking(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                                />
                                <label htmlFor="hasOpBooking" className="text-sm font-medium text-gray-700">
                                    Add OP Booking
                                </label>
                            </div>

                            {hasOpBooking && (
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 pl-6 border-l-2 border-violet-100">
                                    {opFields.map((field) => (
                                        <DynamicField
                                            key={field._id}
                                            field={field}
                                            value={opBookingData[field.fieldName]}
                                            onChange={handleOpFieldChange}
                                        />
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="hasIpBooking"
                                    checked={hasIpBooking}
                                    onChange={(e) => setHasIpBooking(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                                />
                                <label htmlFor="hasIpBooking" className="text-sm font-medium text-gray-700">
                                    Add IP Booking
                                </label>
                            </div>

                            {hasIpBooking && (
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 pl-6 border-l-2 border-violet-100">
                                    {ipFields.map((field) => (
                                        <DynamicField
                                            key={field._id}
                                            field={field}
                                            value={ipBookingData[field.fieldName]}
                                            onChange={handleIpFieldChange}
                                        />
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="hasDiagBooking"
                                    checked={hasDiagBooking}
                                    onChange={(e) => setHasDiagBooking(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                                />
                                <label htmlFor="hasDiagBooking" className="text-sm font-medium text-gray-700">
                                    Add Diagnostic Booking
                                </label>
                            </div>

                            {hasDiagBooking && (
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 pl-6 border-l-2 border-violet-100">
                                    {diagnosticFields.map((field) => (
                                        <DynamicField
                                            key={field._id}
                                            field={field}
                                            value={diagBookingData[field.fieldName]}
                                            onChange={handleDiagFieldChange}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <h3 className="mb-4 text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">
                            Additional Notes
                        </h3>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Notes / Comments</label>
                            <textarea
                                rows={4}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Any other details..."
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-100 placeholder:text-gray-400"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#3b0d66] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-200 hover:opacity-90 disabled:opacity-70"
                        >
                            <FiSave />
                            {loading ? "Creating..." : "Create Lead"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

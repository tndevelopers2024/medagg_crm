import React, { useState, useEffect } from "react";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";
import { FiLayers, FiPlus, FiEdit2, FiTrash2, FiMove, FiX } from "react-icons/fi";
import {
    fetchLeadStages,
    createLeadStage,
    updateLeadStage,
    deleteLeadStage,
    reorderLeadStages,
} from "../../../utils/api";
import toast from "react-hot-toast";

const STAGE_CATEGORIES = [
    { value: "initial", label: "Initial Stage" },
    { value: "active", label: "Active Stages" },
    { value: "won", label: "Won Stages" },
    { value: "lost", label: "Lost Stages" },
];

const StageModal = ({ stage, category, onClose, onSave }) => {
    const [form, setForm] = useState({
        stageName: stage?.stageName || "",
        displayLabel: stage?.displayLabel || "",
        stageCategory: stage?.stageCategory || category || "active",
        color: stage?.color || "#6B7280",
        icon: stage?.icon || "",
        isDefault: stage?.isDefault || false,
        description: stage?.description || "",
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.stageName || !form.displayLabel) {
            toast.error("Stage name and display label are required");
            return;
        }

        setLoading(true);
        try {
            await onSave(form);
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {stage ? "Edit Stage" : "Add New Stage"}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <FiX />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-700">
                                Stage Name (Internal) *
                            </label>
                            <input
                                value={form.stageName}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        stageName: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                                    })
                                }
                                disabled={!!stage}
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-100 disabled:bg-gray-50"
                                placeholder="e.g. hot_lead"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-700">Display Label *</label>
                            <input
                                value={form.displayLabel}
                                onChange={(e) => setForm({ ...form, displayLabel: e.target.value })}
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-100"
                                placeholder="e.g. Hot Lead"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-700">Category *</label>
                            <select
                                value={form.stageCategory}
                                onChange={(e) => setForm({ ...form, stageCategory: e.target.value })}
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-100"
                            >
                                {STAGE_CATEGORIES.map((cat) => (
                                    <option key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-700">Color</label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    value={form.color}
                                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                                    className="h-10 w-16 rounded-lg border border-gray-200 cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={form.color}
                                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                                    className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-100"
                                    placeholder="#6B7280"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700">Description</label>
                        <textarea
                            rows={3}
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-100"
                            placeholder="Optional description"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isDefault"
                            checked={form.isDefault}
                            onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                            className="rounded border-gray-300"
                        />
                        <label htmlFor="isDefault" className="text-sm text-gray-700">
                            Set as default stage for new leads
                        </label>
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
                            className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                        >
                            {loading ? "Saving..." : stage ? "Update Stage" : "Create Stage"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const LeadStagesPage = () => {
    usePageTitle("Lead Stages Settings");
    const [activeTab, setActiveTab] = useState("active");
    const [stages, setStages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingStage, setEditingStage] = useState(null);
    const [draggedIndex, setDraggedIndex] = useState(null);

    useEffect(() => {
        loadStages();
    }, [activeTab]);

    const loadStages = async () => {
        setLoading(true);
        try {
            const res = await fetchLeadStages({ category: activeTab });
            if (res.success) {
                setStages(res.data);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to load stages");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (formData) => {
        try {
            const res = await createLeadStage(formData);
            if (res.success) {
                toast.success("Stage created successfully");
                loadStages();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to create stage");
            throw err;
        }
    };

    const handleUpdate = async (formData) => {
        try {
            const res = await updateLeadStage(editingStage._id, formData);
            if (res.success) {
                toast.success("Stage updated successfully");
                loadStages();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to update stage");
            throw err;
        }
    };

    const handleDelete = async (stage) => {
        if (stage.isDefault) {
            toast.error("Cannot delete the default stage");
            return;
        }

        if (!confirm(`Delete stage "${stage.displayLabel}"?`)) return;

        try {
            const res = await deleteLeadStage(stage._id);
            if (res.success) {
                toast.success("Stage deleted successfully");
                loadStages();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to delete stage");
        }
    };

    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const newStages = [...stages];
        const draggedStage = newStages[draggedIndex];
        newStages.splice(draggedIndex, 1);
        newStages.splice(index, 0, draggedStage);

        setStages(newStages);
        setDraggedIndex(index);
    };

    const handleDragEnd = async () => {
        if (draggedIndex === null) return;

        const stageOrders = stages.map((stage, index) => ({
            id: stage._id,
            order: index,
        }));

        try {
            await reorderLeadStages(stageOrders);
            toast.success("Stages reordered");
        } catch (err) {
            toast.error("Failed to reorder stages");
            loadStages();
        }

        setDraggedIndex(null);
    };

    if (loading) {
        return (
            <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 text-center">Loading stages...</div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-violet-50 p-2">
                        <FiLayers className="text-violet-600" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Lead Stages Settings</h1>
                        <p className="text-sm text-gray-500">Configure your sales pipeline stages</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        setEditingStage(null);
                        setShowModal(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
                >
                    <FiPlus /> Add Stage
                </button>
            </div>

            {/* Tabs */}
            <div className="mb-6 flex gap-2 border-b border-gray-200">
                {STAGE_CATEGORIES.map((cat) => (
                    <button
                        key={cat.value}
                        onClick={() => setActiveTab(cat.value)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === cat.value
                                ? "border-violet-600 text-violet-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Stages List */}
            <div>
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase">
                        {STAGE_CATEGORIES.find((c) => c.value === activeTab)?.label}
                    </h3>
                    <span className="text-sm text-gray-500">{stages.length} stages</span>
                </div>

                {stages.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 py-12 text-center">
                        <p className="text-gray-500">No stages found</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {stages.map((stage, index) => (
                            <div
                                key={stage._id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragEnd={handleDragEnd}
                                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 cursor-move hover:border-violet-200 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="text-gray-400">
                                        <FiMove size={18} />
                                    </div>
                                    <div
                                        className="w-4 h-4 rounded"
                                        style={{ backgroundColor: stage.color }}
                                    />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-gray-900">{stage.displayLabel}</p>
                                            {stage.isDefault && (
                                                <span className="text-xs bg-violet-100 text-violet-600 px-2 py-0.5 rounded">
                                                    Default
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500">{stage.stageName}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setEditingStage(stage);
                                            setShowModal(true);
                                        }}
                                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                    >
                                        <FiEdit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(stage)}
                                        disabled={stage.isDefault}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <FiTrash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <StageModal
                    stage={editingStage}
                    category={activeTab}
                    onClose={() => {
                        setShowModal(false);
                        setEditingStage(null);
                    }}
                    onSave={editingStage ? handleUpdate : handleCreate}
                />
            )}
        </div>
    );
};

export default LeadStagesPage;

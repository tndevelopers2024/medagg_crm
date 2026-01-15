import React, { useState, useEffect } from "react";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";
import {
    FiSliders,
    FiPlus,
    FiEdit2,
    FiTrash2,
    FiMove,
    FiX,
    FiCheck,
    FiAlertCircle,
} from "react-icons/fi";
import {
    fetchLeadFields,
    createLeadField,
    updateLeadField,
    deleteLeadField,
    reorderLeadFields,
} from "../../../utils/api";
import toast from "react-hot-toast";

const FIELD_TYPES = [
    { value: "text", label: "Text" },
    { value: "phone", label: "Phone" },
    { value: "email", label: "Email" },
    { value: "number", label: "Number" },
    { value: "dropdown", label: "Dropdown" },
    { value: "date", label: "Date" },
    { value: "textarea", label: "Text Area" },
];

const ICON_OPTIONS = [
    "user", "phone", "mail", "hash", "calendar", "map-pin", "map",
    "briefcase", "clipboard", "trending-up", "message-circle", "users",
];

const FieldModal = ({ field, onClose, onSave }) => {
    const [form, setForm] = useState({
        fieldName: field?.fieldName || "",
        displayLabel: field?.displayLabel || "",
        fieldType: field?.fieldType || "text",
        isRequired: field?.isRequired || false,
        isActive: field?.isActive !== undefined ? field.isActive : true,
        options: field?.options || [],
        icon: field?.icon || "text",
        placeholder: field?.placeholder || "",
    });
    const [optionInput, setOptionInput] = useState("");
    const [loading, setLoading] = useState(false);

    const handleAddOption = () => {
        if (!optionInput.trim()) return;
        setForm({ ...form, options: [...form.options, optionInput.trim()] });
        setOptionInput("");
    };

    const handleRemoveOption = (index) => {
        setForm({ ...form, options: form.options.filter((_, i) => i !== index) });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.fieldName || !form.displayLabel) {
            toast.error("Field name and display label are required");
            return;
        }

        if (form.fieldType === "dropdown" && form.options.length === 0) {
            toast.error("Dropdown fields must have at least one option");
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl my-8">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {field ? "Edit Field" : "Add New Field"}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <FiX />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-700">
                                Field Name (Internal) *
                            </label>
                            <input
                                value={form.fieldName}
                                onChange={(e) =>
                                    setForm({ ...form, fieldName: e.target.value.toLowerCase().replace(/\s+/g, "_") })
                                }
                                disabled={!!field?.isPrimary}
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-100 disabled:bg-gray-50"
                                placeholder="e.g. phone_number"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-700">
                                Display Label *
                            </label>
                            <input
                                value={form.displayLabel}
                                onChange={(e) => setForm({ ...form, displayLabel: e.target.value })}
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-100"
                                placeholder="e.g. Phone Number"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-700">Field Type *</label>
                            <select
                                value={form.fieldType}
                                onChange={(e) => setForm({ ...form, fieldType: e.target.value })}
                                disabled={!!field?.isPrimary}
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-100 disabled:bg-gray-50"
                            >
                                {FIELD_TYPES.map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-700">Icon</label>
                            <select
                                value={form.icon}
                                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-100"
                            >
                                {ICON_OPTIONS.map((icon) => (
                                    <option key={icon} value={icon}>
                                        {icon}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700">Placeholder</label>
                        <input
                            value={form.placeholder}
                            onChange={(e) => setForm({ ...form, placeholder: e.target.value })}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-100"
                            placeholder="e.g. Enter your phone number"
                        />
                    </div>

                    {form.fieldType === "dropdown" && (
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-700">Dropdown Options *</label>
                            <div className="flex gap-2">
                                <input
                                    value={optionInput}
                                    onChange={(e) => setOptionInput(e.target.value)}
                                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddOption())}
                                    className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-100"
                                    placeholder="Add option and press Enter"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddOption}
                                    className="rounded-xl bg-violet-100 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-200"
                                >
                                    Add
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {form.options.map((option, index) => (
                                    <span
                                        key={index}
                                        className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm"
                                    >
                                        {option}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveOption(index)}
                                            className="hover:text-red-600"
                                        >
                                            <FiX size={14} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.isRequired}
                                onChange={(e) => setForm({ ...form, isRequired: e.target.checked })}
                                className="rounded border-gray-300"
                            />
                            <span className="text-sm text-gray-700">Required Field</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.isActive}
                                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                                className="rounded border-gray-300"
                            />
                            <span className="text-sm text-gray-700">Active</span>
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
                            {loading ? "Saving..." : field ? "Update Field" : "Create Field"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const FieldSettingsPage = () => {
    usePageTitle("Field Settings");
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingField, setEditingField] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [filterActive, setFilterActive] = useState("all");
    const [draggedIndex, setDraggedIndex] = useState(null);

    useEffect(() => {
        loadFields();
    }, []);

    const loadFields = async () => {
        setLoading(true);
        try {
            const res = await fetchLeadFields();
            if (res.success) {
                setFields(res.data);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to load fields");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (formData) => {
        try {
            const res = await createLeadField(formData);
            if (res.success) {
                toast.success("Field created successfully");
                loadFields();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to create field");
            throw err;
        }
    };

    const handleUpdate = async (formData) => {
        try {
            const res = await updateLeadField(editingField._id, formData);
            if (res.success) {
                toast.success("Field updated successfully");
                loadFields();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to update field");
            throw err;
        }
    };

    const handleDelete = async (field) => {
        if (field.isPrimary) {
            toast.error("Cannot delete primary fields");
            return;
        }

        if (!confirm(`Delete field "${field.displayLabel}"?`)) return;

        try {
            const res = await deleteLeadField(field._id);
            if (res.success) {
                toast.success("Field deleted successfully");
                loadFields();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to delete field");
        }
    };

    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const newFields = [...fields];
        const draggedField = newFields[draggedIndex];
        newFields.splice(draggedIndex, 1);
        newFields.splice(index, 0, draggedField);

        setFields(newFields);
        setDraggedIndex(index);
    };

    const handleDragEnd = async () => {
        if (draggedIndex === null) return;

        const fieldOrders = fields.map((field, index) => ({
            id: field._id,
            order: index,
        }));

        try {
            await reorderLeadFields(fieldOrders);
            toast.success("Fields reordered");
        } catch (err) {
            toast.error("Failed to reorder fields");
            loadFields(); // Reload to reset order
        }

        setDraggedIndex(null);
    };

    const filteredFields = fields.filter((field) => {
        const matchesSearch = field.displayLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
            field.fieldName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === "all" || field.fieldType === filterType;
        const matchesActive = filterActive === "all" ||
            (filterActive === "active" && field.isActive) ||
            (filterActive === "inactive" && !field.isActive);

        return matchesSearch && matchesType && matchesActive;
    });

    const primaryFields = filteredFields.filter((f) => f.isPrimary);
    const otherFields = filteredFields.filter((f) => !f.isPrimary);

    if (loading) {
        return (
            <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 text-center">
                Loading fields...
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-violet-50 p-2">
                        <FiSliders className="text-violet-600" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Fields Settings</h1>
                        <p className="text-sm text-gray-500">Lead Id</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        setEditingField(null);
                        setShowModal(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
                >
                    <FiPlus /> Add a new field
                </button>
            </div>

            {/* Primary Fields */}
            {primaryFields.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase">
                        Primary Fields (Assign)
                    </h3>
                    <div className="space-y-2">
                        {primaryFields.map((field) => (
                            <div
                                key={field._id}
                                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="text-gray-400">
                                        <FiMove size={18} className="opacity-30" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{field.displayLabel}</p>
                                        <p className="text-xs text-gray-500">{field.fieldName}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setEditingField(field);
                                            setShowModal(true);
                                        }}
                                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                    >
                                        <FiEdit2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 min-w-[200px] rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-100"
                />
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-100"
                >
                    <option value="all">All Types</option>
                    {FIELD_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                            {type.label}
                        </option>
                    ))}
                </select>
                <select
                    value={filterActive}
                    onChange={(e) => setFilterActive(e.target.value)}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-100"
                >
                    <option value="all">All Fields</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                </select>
                <span className="text-sm text-gray-500">
                    {filteredFields.length} results found
                </span>
            </div>

            {/* Other Fields */}
            <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase">Other Fields</h3>
                {otherFields.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 py-12 text-center">
                        <p className="text-gray-500">No fields found</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {otherFields.map((field, index) => (
                            <div
                                key={field._id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, primaryFields.length + index)}
                                onDragOver={(e) => handleDragOver(e, primaryFields.length + index)}
                                onDragEnd={handleDragEnd}
                                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 cursor-move hover:border-violet-200 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="text-gray-400">
                                        <FiMove size={18} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-gray-900">{field.displayLabel}</p>
                                            {!field.isActive && (
                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                                    Inactive
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            {field.fieldName} • {field.fieldType}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setEditingField(field);
                                            setShowModal(true);
                                        }}
                                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                    >
                                        <FiEdit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(field)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
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
                <FieldModal
                    field={editingField}
                    onClose={() => {
                        setShowModal(false);
                        setEditingField(null);
                    }}
                    onSave={editingField ? handleUpdate : handleCreate}
                />
            )}
        </div>
    );
};

export default FieldSettingsPage;

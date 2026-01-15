import { useState, useEffect } from "react";
import { FiX, FiPlus, FiUser, FiLayers } from "react-icons/fi";
import { BsLightningChargeFill } from "react-icons/bs";

const BulkEditSidebar = ({ open, onClose, selectedCount, callers = [], onUpdate, leadStages = [], availableFields = [], fieldConfigs = [], fieldNameMap = new Map() }) => {
    const [status, setStatus] = useState("");
    const [assignedTo, setAssignedTo] = useState("");
    const [fieldUpdates, setFieldUpdates] = useState([]); // [{ id, name, value, operation }]

    // Reset when opened
    useEffect(() => {
        if (open) {
            setStatus("");
            setAssignedTo("");
            setFieldUpdates([]);
        }
    }, [open]);

    const addFieldUpdate = () => {
        setFieldUpdates([...fieldUpdates, { id: Date.now(), name: "", value: "", operation: "replace" }]);
    };

    const removeFieldUpdate = (id) => {
        setFieldUpdates(fieldUpdates.filter(f => f.id !== id));
    };

    const updateFieldRow = (id, key, val) => {
        setFieldUpdates(fieldUpdates.map(f => f.id === id ? { ...f, [key]: val } : f));
    };

    // Get field config for a given display label
    const getFieldConfig = (displayLabel) => {
        const actualFieldName = fieldNameMap.get(displayLabel) || displayLabel;
        return fieldConfigs.find(cfg => cfg.fieldName === actualFieldName.toLowerCase());
    };

    const handleSubmit = () => {
        const updates = {};
        if (status) updates.status = status;
        if (assignedTo) updates.assignedTo = assignedTo;

        // Transform field updates - convert display labels to field names
        if (fieldUpdates.length > 0) {
            // Filter out empty names
            const valid = fieldUpdates.filter(f => f.name.trim());
            if (valid.length > 0) {
                updates.fieldData = valid.map(f => {
                    // Convert display label to actual field name
                    const actualFieldName = fieldNameMap.get(f.name) || f.name;
                    return {
                        name: actualFieldName,
                        value: f.value,
                        operation: f.operation
                    };
                });
            }
        }

        if (Object.keys(updates).length === 0) {
            onClose();
            return;
        }

        onUpdate(updates);
    };

    // Combine passed fields with common ones, unique and sorted
    const fieldsOptions = Array.from(new Set([
        "Source", "City", "State", "Campaign Name", "Priority", "Department",
        ...(availableFields || [])
    ])).sort();

    return (
        <>
            {/* Backdrop */}
            {open && (
                <div
                    className="fixed inset-0 bg-black/30 z-50 transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Panel */}
            <div className={`fixed top-0 right-0 h-full w-[480px] bg-white shadow-2xl z-[60] transform transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="h-full flex flex-col">

                    {/* Header */}
                    <div className="px-6 py-4 border-b flex justify-between items-center bg-white">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <span className="text-gray-900">Selected leads: {selectedCount}</span>
                                <button onClick={onClose} className="text-xs text-blue-600 hover:underline">Edit Selection</button>
                            </h2>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition">
                            <FiX className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">

                        {/* 1. Status */}
                        <div className="flex items-center gap-4">
                            <div className="w-40 text-sm font-medium text-gray-600">Update Lead/s Status:</div>
                            <div className="flex-1">
                                <select
                                    value={status}
                                    onChange={e => setStatus(e.target.value)}
                                    className="w-full bg-red-50 text-red-700 border-none rounded px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-red-200 cursor-pointer"
                                >
                                    <option value="" className="text-gray-500">No Change</option>
                                    {leadStages.map(s => (
                                        <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                                    ))}
                                    {!leadStages.length && (
                                        <>
                                            <option value="new">New</option>
                                            <option value="follow_up">Follow Up</option>
                                            <option value="converted">Converted</option>
                                        </>
                                    )}
                                </select>
                            </div>
                        </div>

                        {/* 2. Rating (Placeholder for visual match) */}
                        <div className="flex items-center gap-4 opacity-50 grayscale pointer-events-none" title="Not available yet">
                            <div className="w-40 text-sm font-medium text-gray-600">Update Lead/s Rating:</div>
                            <div className="flex-1 flex text-gray-300 text-lg">
                                Currently Unavailable
                            </div>
                        </div>

                        {/* 3. Assign */}
                        <div className="flex items-center gap-4">
                            <div className="w-40 text-sm font-medium text-gray-600 flex items-center gap-2">
                                Re/assign leads to <FiUser className="text-gray-400" />
                            </div>
                            <div className="flex-1">
                                <select
                                    value={assignedTo}
                                    onChange={e => setAssignedTo(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                                >
                                    <option value="">No Change</option>
                                    <option value="Unassigned">Unassigned (Remove Caller)</option>
                                    {callers.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-gray-100 my-2"></div>

                        {/* 4. Field Updates */}
                        <div className="space-y-3">
                            {fieldUpdates.map((field) => {
                                const fieldConfig = getFieldConfig(field.name);
                                const hasOptions = fieldConfig && fieldConfig.options && fieldConfig.options.length > 0;

                                return (
                                    <div key={field.id} className="flex items-start gap-2 group">

                                        <div className="flex-1 grid grid-cols-[1fr,130px,1fr] gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-200">
                                            {/* Field Name */}
                                            <div className="relative">
                                                <FiLayers className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                                                <input
                                                    list={`fields-${field.id}`}
                                                    type="text"
                                                    className="w-full text-sm bg-transparent border-none focus:ring-0 pl-7 placeholder-gray-400"
                                                    value={field.name}
                                                    onChange={(e) => updateFieldRow(field.id, 'name', e.target.value)}
                                                    placeholder="Select Field"
                                                />
                                                <datalist id={`fields-${field.id}`}>
                                                    {fieldsOptions.map(f => <option key={f} value={f} />)}
                                                </datalist>
                                            </div>

                                            {/* Operation */}
                                            <div>
                                                <select
                                                    className="w-full text-xs bg-white border border-gray-200 rounded px-2 py-1 text-indigo-600 font-medium focus:ring-indigo-500"
                                                    value={field.operation}
                                                    onChange={(e) => updateFieldRow(field.id, 'operation', e.target.value)}
                                                >
                                                    <option value="replace">Replace with</option>
                                                    <option value="clear">Clear</option>
                                                </select>
                                            </div>

                                            {/* Value */}
                                            <div>
                                                {field.operation === 'replace' ? (
                                                    hasOptions ? (
                                                        <select
                                                            className="w-full text-sm bg-white border border-gray-200 rounded px-2 py-1 focus:border-indigo-500 focus:ring-indigo-500"
                                                            value={field.value}
                                                            onChange={(e) => updateFieldRow(field.id, 'value', e.target.value)}
                                                        >
                                                            <option value="">Select...</option>
                                                            {fieldConfig.options.map(opt => (
                                                                <option key={opt} value={opt}>{opt}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            placeholder="Value..."
                                                            className="w-full text-sm bg-white border border-gray-200 rounded px-2 py-1 focus:border-indigo-500 focus:ring-indigo-500"
                                                            value={field.value}
                                                            onChange={(e) => updateFieldRow(field.id, 'value', e.target.value)}
                                                        />
                                                    )
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">Empty</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Delete */}
                                        <button
                                            onClick={() => removeFieldUpdate(field.id)}
                                            className="mt-2 text-gray-400 hover:text-red-500 transition p-1"
                                        >
                                            <FiX />
                                        </button>
                                    </div>
                                );
                            })}

                            <button
                                onClick={addFieldUpdate}
                                className="w-full py-2 flex items-center justify-center gap-2 text-sm text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg dashed-border border-indigo-200 transition"
                                style={{ borderStyle: 'dashed', borderWidth: 1 }}
                            >
                                <FiPlus /> Add / update another field
                            </button>
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t bg-white flex justify-end gap-3">
                        <button
                            onClick={handleSubmit}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold shadow-lg shadow-indigo-200 flex items-center gap-2 transition transform active:scale-95"
                        >
                            <BsLightningChargeFill className="text-yellow-300" />
                            PROCEED WITH {selectedCount} LEADS
                        </button>
                    </div>

                </div>
            </div>
        </>
    );
};

export default BulkEditSidebar;

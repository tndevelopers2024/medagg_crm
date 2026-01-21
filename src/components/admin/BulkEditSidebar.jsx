import { useState, useEffect, Fragment } from "react";
import { Dialog, Transition, Listbox } from "@headlessui/react";
import { XMarkIcon, PlusIcon, UserIcon, Square2StackIcon, TrashIcon, ChevronUpDownIcon, CheckIcon, BoltIcon } from "@heroicons/react/24/outline";

// Internal reusable Select component
function Select({ label, value, onChange, options, placeholder = "Select...", disabled = false, displayValue }) {
    return (
        <Listbox value={value} onChange={onChange} disabled={disabled}>
            <div className="relative mt-1">
                {label && <Listbox.Label className="block text-sm font-medium text-gray-700 mb-1">{label}</Listbox.Label>}
                <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm border border-gray-200">
                    <span className={`block truncate ${!value ? 'text-gray-400' : 'text-gray-900'}`}>
                        {displayValue ? displayValue(value) : (value || placeholder)}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </span>
                </Listbox.Button>
                <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-50">
                        {options.map((opt, optIdx) => (
                            <Listbox.Option
                                key={optIdx}
                                className={({ active }) =>
                                    `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900'
                                    }`
                                }
                                value={opt.value}
                            >
                                {({ selected }) => (
                                    <>
                                        <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                            {opt.label}
                                        </span>
                                        {selected ? (
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-600">
                                                <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                            </span>
                                        ) : null}
                                    </>
                                )}
                            </Listbox.Option>
                        ))}
                    </Listbox.Options>
                </Transition>
            </div>
        </Listbox>
    );
}

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

    // Prepare options for Select components
    const statusOptions = [
        { value: "", label: "No Change" },
        ...leadStages.map(s => ({ value: s, label: s.replace(/_/g, ' ') }))
    ];
    if (leadStages.length === 0) {
        statusOptions.push(
            { value: "new", label: "New" },
            { value: "follow_up", label: "Follow Up" },
            { value: "converted", label: "Converted" }
        );
    }

    const callerOptions = [
        { value: "", label: "No Change" },
        { value: "Unassigned", label: "Unassigned (Remove Caller)" },
        ...callers.map(c => ({ value: c.id, label: c.name }))
    ];

    const operationOptions = [
        { value: "replace", label: "Replace with" },
        { value: "clear", label: "Clear" }
    ];

    // Combine passed fields with common ones, unique and sorted
    const fieldsOptions = Array.from(new Set([
        "Source", "City", "State", "Campaign Name", "Priority", "Department",
        ...(availableFields || [])
    ])).sort();

    return (
        <Transition.Root show={open} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <div className="fixed inset-0 bg-black/30 transition-opacity" />

                <div className="fixed inset-0 overflow-hidden">
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                            <Transition.Child
                                as={Fragment}
                                enter="transform transition ease-in-out duration-300 sm:duration-500"
                                enterFrom="translate-x-full"
                                enterTo="translate-x-0"
                                leave="transform transition ease-in-out duration-300 sm:duration-500"
                                leaveFrom="translate-x-0"
                                leaveTo="translate-x-full"
                            >
                                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                                    <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl">
                                        <div className="px-6 py-4 border-b flex justify-between items-center bg-white sticky top-0 z-10">
                                            <div>
                                                <Dialog.Title className="text-lg font-semibold text-gray-900">
                                                    Bulk Edit
                                                </Dialog.Title>
                                                <p className="text-sm text-gray-500">
                                                    Updating {selectedCount} selected leads
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                                onClick={onClose}
                                            >
                                                <span className="sr-only">Close panel</span>
                                                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                                            </button>
                                        </div>

                                        <div className="flex-1 overflow-y-auto p-6 space-y-6">

                                            {/* 1. Status */}
                                            <div className="space-y-1">
                                                <label className="text-sm font-medium text-gray-900">Update Lead/s Status</label>
                                                <Select
                                                    value={status}
                                                    onChange={setStatus}
                                                    options={statusOptions}
                                                    displayValue={(val) => statusOptions.find(o => o.value === val)?.label}
                                                />
                                            </div>

                                            {/* 2. Rating (Placeholder) */}
                                            <div className="space-y-1 opacity-50 grayscale pointer-events-none">
                                                <label className="text-sm font-medium text-gray-900">Update Lead/s Rating</label>
                                                <div className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 italic">
                                                    Currently Unavailable
                                                </div>
                                            </div>

                                            {/* 3. Assign */}
                                            <div className="space-y-1">
                                                <label className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                                    Assign to <UserIcon className="h-4 w-4 text-gray-400" />
                                                </label>
                                                <Select
                                                    value={assignedTo}
                                                    onChange={setAssignedTo}
                                                    options={callerOptions}
                                                    displayValue={(val) => callerOptions.find(o => o.value === val)?.label}
                                                />
                                            </div>

                                            <div className="h-px bg-gray-100 my-4"></div>

                                            {/* 4. Field Updates */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-sm font-medium text-gray-900">Field Updates</h3>
                                                    <button
                                                        onClick={addFieldUpdate}
                                                        className="text-sm text-indigo-600 hover:text-indigo-500 font-medium flex items-center gap-1"
                                                    >
                                                        <PlusIcon className="h-4 w-4" /> Add Field
                                                    </button>
                                                </div>

                                                <div className="space-y-3">
                                                    {fieldUpdates.map((field) => {
                                                        const fieldConfig = getFieldConfig(field.name);
                                                        const hasOptions = fieldConfig && fieldConfig.options && fieldConfig.options.length > 0;

                                                        // Prepare options for value dropdown if applicable
                                                        const valueOptions = hasOptions ? [
                                                            { value: "", label: "Select..." },
                                                            ...fieldConfig.options.map(opt => ({ value: opt, label: opt }))
                                                        ] : [];

                                                        return (
                                                            <div key={field.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-3 relative group">
                                                                <button
                                                                    onClick={() => removeFieldUpdate(field.id)}
                                                                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition p-1"
                                                                >
                                                                    <TrashIcon className="h-4 w-4" />
                                                                </button>

                                                                {/* Field Name */}
                                                                <div>
                                                                    <label className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                                                                        <Square2StackIcon className="h-3 w-3" /> Field
                                                                    </label>
                                                                    <div className="relative">
                                                                        <input
                                                                            list={`fields-${field.id}`}
                                                                            type="text"
                                                                            className="w-full text-sm bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                                            value={field.name}
                                                                            onChange={(e) => updateFieldRow(field.id, 'name', e.target.value)}
                                                                            placeholder="Select field to update..."
                                                                        />
                                                                        <datalist id={`fields-${field.id}`}>
                                                                            {fieldsOptions.map(f => <option key={f} value={f} />)}
                                                                        </datalist>
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-3">
                                                                    {/* Operation */}
                                                                    <div>
                                                                        <label className="text-xs font-medium text-gray-500 mb-1 block">Action</label>
                                                                        <Select
                                                                            value={field.operation}
                                                                            onChange={(val) => updateFieldRow(field.id, 'operation', val)}
                                                                            options={operationOptions}
                                                                            displayValue={(val) => operationOptions.find(o => o.value === val)?.label}
                                                                        />
                                                                    </div>

                                                                    {/* Value */}
                                                                    <div>
                                                                        <label className="text-xs font-medium text-gray-500 mb-1 block">Value</label>
                                                                        {field.operation === 'replace' ? (
                                                                            hasOptions ? (
                                                                                <Select
                                                                                    value={field.value}
                                                                                    onChange={(val) => updateFieldRow(field.id, 'value', val)}
                                                                                    options={valueOptions}
                                                                                    displayValue={(val) => valueOptions.find(o => o.value === val)?.label}
                                                                                />
                                                                            ) : (
                                                                                <input
                                                                                    type="text"
                                                                                    placeholder="Value..."
                                                                                    className="w-full text-sm bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 mt-1"
                                                                                    value={field.value}
                                                                                    onChange={(e) => updateFieldRow(field.id, 'value', e.target.value)}
                                                                                />
                                                                            )
                                                                        ) : (
                                                                            <span className="text-xs text-gray-400 italic block mt-3">Field will be cleared</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}

                                                    {fieldUpdates.length === 0 && (
                                                        <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-500 text-sm">
                                                            No field updates added.
                                                            <button onClick={addFieldUpdate} className="text-indigo-600 hover:underline ml-1">
                                                                Add one?
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex-shrink-0 border-t border-gray-200 px-4 py-5 sm:px-6 sticky bottom-0 bg-white z-10">
                                            <div className="flex justify-end gap-3">
                                                <button
                                                    type="button"
                                                    className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                                                    onClick={onClose}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    className="inline-flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 gap-2 items-center"
                                                    onClick={handleSubmit}
                                                >
                                                    <BoltIcon className="h-4 w-4 text-yellow-300" />
                                                    PROCEED ({selectedCount})
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
};

export default BulkEditSidebar;

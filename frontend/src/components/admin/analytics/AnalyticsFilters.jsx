// src/components/admin/analytics/AnalyticsFilters.jsx
import React, { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import { FiX, FiChevronDown, FiPlus } from "react-icons/fi";

/**
 * Filter Pill Component
 */
const FilterPill = ({ filter, onRemove, filterOptions }) => {
    const getFilterLabel = () => {
        switch (filter.type) {
            case "assignee":
                const caller = filterOptions.callers?.find((c) => c.id === filter.value);
                return `Assignee ${filter.operator === "is" ? "is" : "is not"} ${filter.value === "Unassigned" ? "Unassigned" : caller?.name || "Unknown"
                    }`;
            case "leadStatus":
                return `Lead Status ${filter.operator === "is" ? "is" : "is not"} ${filter.value}`;
            case "followUp":
                return `Follow Up is ${filter.value}`;
            case "totalCalls":
                const fromText = filter.from !== undefined && filter.from !== "" ? filter.from : "";
                const toText = filter.to !== undefined && filter.to !== "" ? filter.to : "";
                return `Total calls on lead from ${fromText} to ${toText}`;
            case "source":
                return `Source ${filter.operator === "is" ? "is" : "is not"} ${filter.value}`;
            default:
                if (filter.type.startsWith("custom_")) {
                    const fieldName = filter.type.replace("custom_", "");
                    return `${fieldName} ${filter.operator === "is" ? "is" : "is not"} ${filter.value}`;
                }
                return "Unknown filter";
        }
    };

    return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200 text-sm">
            <span className="font-medium">{getFilterLabel()}</span>
            <button
                onClick={onRemove}
                className="hover:bg-indigo-100 rounded-full p-0.5 transition-colors"
                aria-label="Remove filter"
            >
                <FiX className="w-4 h-4" />
            </button>
        </div>
    );
};

/**
 * Add Filter Dropdown Component
 */
const AddFilterDropdown = ({ onAddFilter, filterOptions }) => {
    const filterTypes = [
        { value: "assignee", label: "Assignee" },
        { value: "leadStatus", label: "Lead Status" },
        { value: "followUp", label: "Follow Up" },
        { value: "totalCalls", label: "Total Calls on Lead" },
        { value: "source", label: "Source" },
    ];

    // Add custom fields
    if (filterOptions.fieldConfigs && filterOptions.fieldConfigs.length > 0) {
        filterOptions.fieldConfigs.forEach((field) => {
            filterTypes.push({
                value: `custom_${field.fieldName}`,
                label: field.displayLabel || field.fieldName,
            });
        });
    }

    return (
        <Menu as="div" className="relative inline-block text-left">
            <Menu.Button className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <FiPlus className="w-4 h-4" />
                Add a Condition
            </Menu.Button>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items className="absolute left-0 mt-2 w-56 origin-top-left bg-white divide-y divide-gray-100 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                    <div className="p-1">
                        {filterTypes.map((type) => (
                            <Menu.Item key={type.value}>
                                {({ active }) => (
                                    <button
                                        onClick={() => onAddFilter(type.value)}
                                        className={`${active ? "bg-indigo-50 text-indigo-700" : "text-gray-900"
                                            } group flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors`}
                                    >
                                        {type.label}
                                    </button>
                                )}
                            </Menu.Item>
                        ))}
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
};

/**
 * Filter Configuration Modal Component
 */
const FilterConfigModal = ({ isOpen, onClose, filterType, onSave, filterOptions }) => {
    const [operator, setOperator] = React.useState("is");
    const [value, setValue] = React.useState("");
    const [from, setFrom] = React.useState("");
    const [to, setTo] = React.useState("");

    if (!isOpen) return null;

    const handleSave = () => {
        const filter = {
            type: filterType,
            operator,
            value,
            from,
            to,
        };
        onSave(filter);
        onClose();
        // Reset
        setOperator("is");
        setValue("");
        setFrom("");
        setTo("");
    };

    const renderFilterInput = () => {
        switch (filterType) {
            case "assignee":
                return (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
                            <select
                                value={operator}
                                onChange={(e) => setOperator(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="is">Is</option>
                                <option value="isNot">Is not</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Caller</label>
                            <select
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">Select caller...</option>
                                <option value="Unassigned">Unassigned</option>
                                {filterOptions.callers?.map((caller) => (
                                    <option key={caller.id} value={caller.id}>
                                        {caller.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                );

            case "leadStatus":
                return (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
                            <select
                                value={operator}
                                onChange={(e) => setOperator(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="is">Is</option>
                                <option value="isNot">Is not</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">Select status...</option>
                                {filterOptions.leadStages?.map((stage) => (
                                    <option key={stage} value={stage}>
                                        {stage}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                );

            case "followUp":
                return (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Follow Up</label>
                        <select
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="">Select...</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                        </select>
                    </div>
                );

            case "totalCalls":
                return (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                            <input
                                type="number"
                                value={from}
                                onChange={(e) => setFrom(e.target.value)}
                                placeholder="Minimum calls"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                            <input
                                type="number"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                placeholder="Maximum calls (optional)"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>
                );

            case "source":
                return (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
                            <select
                                value={operator}
                                onChange={(e) => setOperator(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="is">Is</option>
                                <option value="isNot">Is not</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                            <select
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">Select source...</option>
                                {filterOptions.sources?.map((source) => (
                                    <option key={source} value={source}>
                                        {source}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                );

            default:
                // Custom field
                if (filterType.startsWith("custom_")) {
                    const fieldName = filterType.replace("custom_", "");
                    const fieldConfig = filterOptions.fieldConfigs?.find((f) => f.fieldName === fieldName);

                    if (fieldConfig && fieldConfig.options && fieldConfig.options.length > 0) {
                        return (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
                                    <select
                                        value={operator}
                                        onChange={(e) => setOperator(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="is">Is</option>
                                        <option value="isNot">Is not</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                                    <select
                                        value={value}
                                        onChange={(e) => setValue(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="">Select value...</option>
                                        {fieldConfig.options.map((opt) => (
                                            <option key={opt} value={opt}>
                                                {opt}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        );
                    } else {
                        // Render text input if no options are available (dynamic fields)
                        return (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
                                    <select
                                        value={operator}
                                        onChange={(e) => setOperator(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="is">Is</option>
                                        <option value="isNot">Is not</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                                    <input
                                        type="text"
                                        value={value}
                                        onChange={(e) => setValue(e.target.value)}
                                        placeholder={`Enter ${fieldConfig?.displayLabel || fieldName}...`}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                        );
                    }
                }
                return <p className="text-sm text-gray-500">No configuration needed</p>;
        }
    };

    const getFilterTitle = () => {
        switch (filterType) {
            case "assignee":
                return "Assignee Filter";
            case "leadStatus":
                return "Lead Status Filter";
            case "followUp":
                return "Follow Up Filter";
            case "totalCalls":
                return "Total Calls Filter";
            case "source":
                return "Source Filter";
            default:
                if (filterType.startsWith("custom_")) {
                    const fieldName = filterType.replace("custom_", "");
                    const fieldConfig = filterOptions.fieldConfigs?.find((f) => f.fieldName === fieldName);
                    return `${fieldConfig?.displayLabel || fieldName} Filter`;
                }
                return "Filter Configuration";
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white px-6 pt-5 pb-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">{getFilterTitle()}</h3>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-500 transition-colors"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="mt-4">{renderFilterInput()}</div>
                    </div>

                    <div className="bg-gray-50 px-6 py-3 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!value && filterType !== "totalCalls"}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Add Filter
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * Main Analytics Filters Component
 */
export default function AnalyticsFilters({
    filters,
    onFiltersChange,
    sortBy,
    onSortByChange,
    sortOrder,
    onSortOrderChange,
    filterOptions,
}) {
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [selectedFilterType, setSelectedFilterType] = React.useState(null);

    const handleAddFilter = (filterType) => {
        setSelectedFilterType(filterType);
        setIsModalOpen(true);
    };

    const handleSaveFilter = (filter) => {
        onFiltersChange([...filters, { ...filter, id: Date.now() }]);
    };

    const handleRemoveFilter = (filterId) => {
        onFiltersChange(filters.filter((f) => f.id !== filterId));
    };

    const handleResetFilters = () => {
        onFiltersChange([]);
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
                {filters.map((filter) => (
                    <FilterPill
                        key={filter.id}
                        filter={filter}
                        onRemove={() => handleRemoveFilter(filter.id)}
                        filterOptions={filterOptions}
                    />
                ))}

                <AddFilterDropdown onAddFilter={handleAddFilter} filterOptions={filterOptions} />

                {filters.length > 0 && (
                    <button
                        onClick={handleResetFilters}
                        className="text-sm text-gray-600 hover:text-gray-900 underline transition-colors"
                    >
                        Reset all
                    </button>
                )}
            </div>

            {/* Sort Options */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Sort by:</span>
                    <select
                        value={sortBy}
                        onChange={(e) => onSortByChange(e.target.value)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="createdTime">Created On</option>
                        <option value="status">Status</option>
                        <option value="assignedTo">Assignee</option>
                        <option value="callCount">Call Count</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <select
                        value={sortOrder}
                        onChange={(e) => onSortOrderChange(e.target.value)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="desc">Newest First</option>
                        <option value="asc">Oldest First</option>
                    </select>
                </div>
            </div>

            {/* Filter Config Modal */}
            <FilterConfigModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                filterType={selectedFilterType}
                onSave={handleSaveFilter}
                filterOptions={filterOptions}
            />
        </div>
    );
}

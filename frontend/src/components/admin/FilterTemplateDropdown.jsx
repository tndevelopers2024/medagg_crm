import React from 'react';
import { Menu } from '@headlessui/react';
import {
    BookmarkIcon,
    ChevronDownIcon,
    StarIcon,
    TrashIcon,
    PencilIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

export default function FilterTemplateDropdown({
    templates,
    onSelect,
    onEdit,
    onDelete,
    onSetDefault,
    currentTemplateId
}) {
    return (
        <Menu as="div" className="relative">
            <Menu.Button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                <BookmarkIcon className="w-4 h-4" />
                <span>Saved Filters</span>
                <ChevronDownIcon className="w-4 h-4" />
            </Menu.Button>

            <Menu.Items className="absolute left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 max-h-96 overflow-y-auto">
                {templates.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-500">
                        No saved filters yet
                    </div>
                ) : (
                    templates.map((template) => (
                        <Menu.Item key={template._id}>
                            {({ active }) => (
                                <div
                                    className={`px-4 py-2 ${active ? 'bg-gray-50' : ''} ${currentTemplateId === template._id ? 'bg-pink-50' : ''
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <button
                                            onClick={() => onSelect(template)}
                                            className="flex-1 text-left"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm text-gray-900">
                                                    {template.name}
                                                </span>
                                                {template.isDefault && (
                                                    <StarIconSolid className="w-4 h-4 text-yellow-500" />
                                                )}
                                            </div>
                                            {template.description && (
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {template.description}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                                <span>Used {template.usageCount} times</span>
                                                {template.lastUsedAt && (
                                                    <span>
                                                        Last used {new Date(template.lastUsedAt).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </button>

                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSetDefault(template._id);
                                                }}
                                                className="p-1 hover:bg-gray-200 rounded"
                                                title={template.isDefault ? 'Default filter' : 'Set as default'}
                                            >
                                                {template.isDefault ? (
                                                    <StarIconSolid className="w-4 h-4 text-yellow-500" />
                                                ) : (
                                                    <StarIcon className="w-4 h-4 text-gray-400" />
                                                )}
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEdit(template);
                                                }}
                                                className="p-1 hover:bg-blue-50 rounded text-gray-400 hover:text-blue-600"
                                                title="Edit template"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDelete(template._id);
                                                }}
                                                className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600"
                                                title="Delete template"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Menu.Item>
                    ))
                )}
            </Menu.Items>
        </Menu>
    );
}

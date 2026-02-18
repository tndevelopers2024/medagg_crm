import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, BookmarkIcon } from '@heroicons/react/24/outline';

export default function SaveFilterTemplateModal({
    isOpen,
    onClose,
    currentFilters,
    currentSorting,
    onSave
}) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isDefault, setIsDefault] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) return;

        setSaving(true);
        try {
            await onSave({
                name: name.trim(),
                description: description.trim(),
                filters: currentFilters,
                sorting: currentSorting,
                isDefault
            });

            setName('');
            setDescription('');
            setIsDefault(false);
            onClose();
        } catch (error) {
            console.error('Error saving template:', error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-md w-full bg-white rounded-xl shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b">
                        <div className="flex items-center gap-3">
                            <BookmarkIcon className="w-6 h-6 text-[#E9296A]" />
                            <Dialog.Title className="text-lg font-semibold">
                                Save Filter Template
                            </Dialog.Title>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Template Name *
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Hot Leads - Last 7 Days"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E9296A] focus:border-transparent"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description (Optional)
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Brief description of this filter..."
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E9296A] focus:border-transparent resize-none"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isDefault"
                                checked={isDefault}
                                onChange={(e) => setIsDefault(e.target.checked)}
                                className="w-4 h-4 text-[#E9296A] border-gray-300 rounded focus:ring-[#E9296A]"
                            />
                            <label htmlFor="isDefault" className="text-sm text-gray-700">
                                Set as default filter
                            </label>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-xl">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!name.trim() || saving}
                            className="px-4 py-2 text-sm font-medium text-white bg-[#E9296A] hover:bg-[#d12560] rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Saving...' : 'Save Template'}
                        </button>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}

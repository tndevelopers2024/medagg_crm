import React from "react";
import { FiX } from "react-icons/fi";

const LeadActions = ({ selectedCount, onEdit, onAssign, onClear }) => {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-white shadow-2xl animate-fadeUp">
            <div className="bg-white/20 px-3 py-1 rounded-lg text-sm font-semibold">
                {selectedCount} Selected
            </div>
            <div className="w-px h-6 bg-white/20 mx-1"></div>
            <button
                onClick={onEdit}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-lg transition text-sm font-medium"
            >
                Edit
            </button>
            <button
                onClick={onAssign}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-lg transition text-sm font-medium"
            >
                Assign
            </button>
            <button
                onClick={onClear}
                className="ml-2 p-1.5 hover:bg-white/10 rounded-full text-white/60 hover:text-white"
            >
                <FiX />
            </button>
        </div>
    );
};

export default LeadActions;

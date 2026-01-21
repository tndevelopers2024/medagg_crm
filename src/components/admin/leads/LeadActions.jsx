import React, { Fragment } from "react";
import { Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/20/solid";

const LeadActions = ({ selectedCount, onEdit, onAssign, onClear }) => {
    return (
        <Transition
            show={selectedCount > 0}
            as={Fragment}
            enter="transform ease-out duration-300 transition"
            enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
            enterTo="translate-y-0 opacity-100 sm:translate-x-0"
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
        >
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-white shadow-2xl">
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
                    <XMarkIcon className="h-5 w-5" />
                </button>
            </div>
        </Transition>
    );
};

export default LeadActions;

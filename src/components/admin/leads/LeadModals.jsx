import React, { useEffect, useState } from "react";
import { FiX, FiCheckCircle } from "react-icons/fi";

export function AssignModal({ open, onClose, callers, onConfirm, count }) {
    const [callerId, setCallerId] = useState("");
    useEffect(() => {
        if (!open) setCallerId("");
    }, [open]);
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
                <div className="flex items-center justify-between px-4 py-4 border-b">
                    <h3 className="font-semibold">Assign leads to caller</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-lg">
                        <FiX />
                    </button>
                </div>
                <div className="p-4 space-y-3">
                    <div className="text-xs text-gray-500">{count} selected</div>
                    <label className="block text-sm font-medium">Select Caller</label>
                    <select
                        value={callerId}
                        onChange={(e) => setCallerId(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400"
                    >
                        <option value="">Choose caller…</option>
                        {callers.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name} {c.email ? `• ${c.email}` : ""}
                            </option>
                        ))}
                    </select>

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button onClick={onClose} className="rounded-xl px-3 py-2 text-sm ring-1 ring-gray-200">
                            Cancel
                        </button>
                        <button
                            onClick={() => onConfirm({ callerId })}
                            disabled={!callerId}
                            className="rounded-xl bg-gradient-to-r from-[#ff2e6e] to-[#ff5aa4] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                            Assign
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function SuccessDialog({ open, onClose, text }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
            <div className="w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-xl ring-1 ring-black/5">
                <FiCheckCircle className="mx-auto text-3xl text-emerald-600" />
                <p className="mt-3 text-sm">{text}</p>
                <button
                    onClick={onClose}
                    className="mt-5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                >
                    Done
                </button>
            </div>
        </div>
    );
}

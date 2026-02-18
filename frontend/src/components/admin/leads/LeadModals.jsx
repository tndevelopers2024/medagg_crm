import React, { useEffect, useState, useMemo } from "react";
import { Modal, Select, Button, Result, Space, Segmented, InputNumber, Tooltip } from "antd";
import { ExclamationCircleOutlined, DeleteOutlined } from "@ant-design/icons";

export function AssignModal({ open, onClose, callers, onConfirm, count }) {
    const [mode, setMode] = useState("number"); // "number" | "percentage"
    const [selectedCallerIds, setSelectedCallerIds] = useState([]);
    const [distribution, setDistribution] = useState({}); // { callerId: number }
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!open) {
            setSelectedCallerIds([]);
            setDistribution({});
            setMode("number");
            setIsSubmitting(false);
        }
    }, [open]);

    const callerOptions = useMemo(
        () => callers.map((c) => ({
            label: `${c.name}${c.email ? ` • ${c.email}` : ""}`,
            value: c.id,
        })),
        [callers]
    );

    const callerMap = useMemo(
        () => Object.fromEntries(callers.map((c) => [c.id, c])),
        [callers]
    );

    const handleCallerChange = (ids) => {
        setSelectedCallerIds(ids);
        // Initialize new callers with 0, remove deselected
        setDistribution((prev) => {
            const next = {};
            ids.forEach((id) => { next[id] = prev[id] ?? 0; });
            return next;
        });
    };

    const handleDistChange = (callerId, val) => {
        setDistribution((prev) => ({ ...prev, [callerId]: val ?? 0 }));
    };

    const distributeEqually = () => {
        if (selectedCallerIds.length === 0) return;
        const n = selectedCallerIds.length;
        if (mode === "number") {
            const base = Math.floor(count / n);
            const remainder = count % n;
            const next = {};
            selectedCallerIds.forEach((id, i) => {
                next[id] = base + (i < remainder ? 1 : 0);
            });
            setDistribution(next);
        } else {
            const base = Math.floor(100 / n);
            const remainder = 100 % n;
            const next = {};
            selectedCallerIds.forEach((id, i) => {
                next[id] = base + (i < remainder ? 1 : 0);
            });
            setDistribution(next);
        }
    };

    const total = useMemo(
        () => selectedCallerIds.reduce((sum, id) => sum + (distribution[id] || 0), 0),
        [selectedCallerIds, distribution]
    );

    const target = mode === "number" ? count : 100;
    const remaining = target - total;
    const isValid = selectedCallerIds.length > 0 && total === target;

    const handleConfirm = async () => {
        // Build assignments array with concrete lead counts
        let assignments;
        if (mode === "number") {
            assignments = selectedCallerIds
                .filter((id) => distribution[id] > 0)
                .map((id) => ({ callerId: id, count: distribution[id] }));
        } else {
            // Convert percentages to counts
            let allocated = 0;
            const raw = selectedCallerIds
                .filter((id) => distribution[id] > 0)
                .map((id) => {
                    const exact = (distribution[id] / 100) * count;
                    const floored = Math.floor(exact);
                    allocated += floored;
                    return { callerId: id, count: floored, frac: exact - floored };
                });
            // Distribute remainder by largest fractional part
            let leftover = count - allocated;
            raw.sort((a, b) => b.frac - a.frac);
            for (let i = 0; leftover > 0 && i < raw.length; i++) {
                raw[i].count++;
                leftover--;
            }
            assignments = raw.map(({ callerId, count: c }) => ({ callerId, count: c }));
        }
        setIsSubmitting(true);
        try {
            await onConfirm({ assignments });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            title="Assign leads to callers"
            open={open}
            onCancel={onClose}
            footer={
                <Space>
                    <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button type="primary" onClick={handleConfirm} disabled={!isValid} loading={isSubmitting}>
                        Assign
                    </Button>
                </Space>
            }
            width={520}
        >
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{count} lead{count !== 1 ? "s" : ""} selected</span>
                    <Segmented
                        size="small"
                        options={[
                            { label: "By Number", value: "number" },
                            { label: "By Percentage", value: "percentage" },
                        ]}
                        value={mode}
                        onChange={(val) => {
                            setMode(val);
                            // Reset distribution values on mode switch
                            setDistribution((prev) => {
                                const next = {};
                                selectedCallerIds.forEach((id) => { next[id] = 0; });
                                return next;
                            });
                        }}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Callers</label>
                    <Select
                        mode="multiple"
                        value={selectedCallerIds}
                        onChange={handleCallerChange}
                        placeholder="Choose callers..."
                        style={{ width: "100%" }}
                        showSearch
                        filterOption={(input, option) =>
                            (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                        }
                        options={callerOptions}
                    />
                </div>

                {selectedCallerIds.length > 0 && (
                    <>
                        <div className="flex justify-end">
                            <Button size="small" onClick={distributeEqually}>
                                Distribute Equally
                            </Button>
                        </div>

                        <div className="border rounded-lg overflow-hidden">
                            <div className="grid grid-cols-[1fr_120px_32px] gap-2 px-3 py-2 bg-gray-50 text-xs font-medium text-gray-500 border-b">
                                <span>Caller</span>
                                <span className="text-right">{mode === "number" ? "Leads" : "%"}</span>
                                <span></span>
                            </div>
                            {selectedCallerIds.map((id) => {
                                const caller = callerMap[id];
                                return (
                                    <div key={id} className="grid grid-cols-[1fr_120px_32px] gap-2 items-center px-3 py-2 border-b last:border-b-0">
                                        <span className="text-sm truncate">{caller?.name || id}</span>
                                        <InputNumber
                                            size="small"
                                            min={0}
                                            max={mode === "number" ? count : 100}
                                            value={distribution[id] || 0}
                                            onChange={(val) => handleDistChange(id, val)}
                                            suffix={mode === "percentage" ? "%" : undefined}
                                            style={{ width: "100%" }}
                                        />
                                        <Tooltip title="Remove">
                                            <Button
                                                type="text"
                                                size="small"
                                                icon={<DeleteOutlined />}
                                                onClick={() => handleCallerChange(selectedCallerIds.filter((cid) => cid !== id))}
                                            />
                                        </Tooltip>
                                    </div>
                                );
                            })}
                        </div>

                        <div className={`text-sm text-right font-medium ${remaining === 0 ? "text-green-600" : "text-red-500"}`}>
                            {mode === "number"
                                ? `${total} / ${count} leads allocated`
                                : `${total}% / 100% allocated`}
                            {remaining !== 0 && (
                                <span className="ml-2">
                                    ({remaining > 0 ? `${remaining} remaining` : `${Math.abs(remaining)} over`})
                                </span>
                            )}
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}

export function SuccessDialog({ open, onClose, text }) {
    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={
                <Button type="primary" onClick={onClose} block>
                    Done
                </Button>
            }
            width={400}
        >
            <Result
                status="success"
                title="Success"
                subTitle={text}
            />
        </Modal>
    );
}

export function AssignLocationModal({ open, onClose, callers, onConfirm }) {
    const [callerId, setCallerId] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setCallerId("");
            setIsSubmitting(false);
        }
    }, [open]);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        await onConfirm({ state: "", callerId });
        setIsSubmitting(false);
    };

    return (
        <Modal
            title="Assign by State"
            open={open}
            onCancel={onClose}
            footer={
                <Space>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button type="primary" onClick={handleSubmit} loading={isSubmitting}>
                        {callerId ? "Assign to Caller" : "Auto Match Leads"}
                    </Button>
                </Space>
            }
            width={480}
        >
            <div className="space-y-4">
                <p className="text-sm text-gray-500">
                    Automatically checks <strong>all unassigned leads</strong> and assigns them to callers whose <strong>State</strong> matches the lead's state.
                </p>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Specific Caller (Optional)</label>
                    <Select
                        value={callerId || undefined}
                        onChange={setCallerId}
                        placeholder="-- No specific caller (Auto Match) --"
                        style={{ width: "100%" }}
                        allowClear
                        showSearch
                        filterOption={(input, option) =>
                            (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                        }
                        options={callers.map((c) => ({
                            label: `${c.name}${c.email ? ` • ${c.email}` : ""}`,
                            value: c.id,
                        }))}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        If selected, all unassigned leads will be assigned to this caller.
                        If left empty, leads will be distributed among callers with matching states.
                    </p>
                </div>
            </div>
        </Modal>
    );
}

export function DeleteModal({ open, onClose, onConfirm, count, isDeleting }) {
    return (
        <Modal
            title={
                <Space>
                    <ExclamationCircleOutlined style={{ color: "#ef4444" }} />
                    <span>Delete {count} Leads</span>
                </Space>
            }
            open={open}
            onCancel={onClose}
            footer={
                <Space>
                    <Button onClick={onClose} disabled={isDeleting}>Cancel</Button>
                    <Button danger type="primary" onClick={onConfirm} loading={isDeleting}>
                        {isDeleting ? "Deleting..." : "Delete Leads"}
                    </Button>
                </Space>
            }
            width={480}
        >
            <p className="text-sm text-gray-500">
                Are you sure you want to delete these {count} leads? All of their data will be permanently removed. This action cannot be undone.
            </p>
        </Modal>
    );
}

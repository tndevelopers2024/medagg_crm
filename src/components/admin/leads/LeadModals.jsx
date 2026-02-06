import React, { useEffect, useState } from "react";
import { Modal, Select, Button, Result, Space } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";

export function AssignModal({ open, onClose, callers, onConfirm, count }) {
    const [callerId, setCallerId] = useState("");
    useEffect(() => {
        if (!open) setCallerId("");
    }, [open]);

    return (
        <Modal
            title="Assign leads to caller"
            open={open}
            onCancel={onClose}
            footer={
                <Space>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button type="primary" onClick={() => onConfirm({ callerId })} disabled={!callerId}>
                        Assign
                    </Button>
                </Space>
            }
            width={400}
        >
            <div className="space-y-4">
                <div className="text-xs text-gray-500">{count} selected</div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Caller</label>
                    <Select
                        value={callerId || undefined}
                        onChange={setCallerId}
                        placeholder="Choose caller..."
                        style={{ width: "100%" }}
                        showSearch
                        filterOption={(input, option) =>
                            (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                        }
                        options={callers.map((c) => ({
                            label: `${c.name}${c.email ? ` • ${c.email}` : ""}`,
                            value: c.id,
                        }))}
                    />
                </div>
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
        await onConfirm({ state: "", city: "", callerId });
        setIsSubmitting(false);
    };

    return (
        <Modal
            title="Assign by Location"
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
                    Automatically checks <strong>all unassigned leads</strong> and assigns them to callers based on matching <strong>City</strong> or <strong>Address</strong>.
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
                        If selected, all leads from the chosen location will be assigned to this caller.
                        If left empty, leads will be distributed among all callers in that location.
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

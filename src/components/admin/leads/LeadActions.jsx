import React from "react";
import { Button, Space, Tag } from "antd";
import { CloseOutlined } from "@ant-design/icons";

const LeadActions = ({ selectedCount, onEdit, onAssign, onDelete, onClear }) => {
    if (selectedCount === 0) return null;

    return (
        <div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-white shadow-2xl"
            style={{ animation: "slideUp 0.3s ease-out" }}
        >
            <Tag color="default" style={{ background: "rgba(255,255,255,0.2)", color: "white", border: "none" }}>
                {selectedCount} Selected
            </Tag>
            <div className="w-px h-6 bg-white/20 mx-1" />
            <Space size="small">
                <Button type="text" onClick={onEdit} style={{ color: "white" }}>
                    Edit
                </Button>
                <Button type="text" onClick={onAssign} style={{ color: "white" }}>
                    Assign
                </Button>
                <Button type="text" danger onClick={onDelete}>
                    Delete
                </Button>
            </Space>
            <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={onClear}
                size="small"
                style={{ color: "rgba(255,255,255,0.6)", marginLeft: 8 }}
            />
            <style>{`
                @keyframes slideUp {
                    0% { transform: translate(-50%, 10px); opacity: 0; }
                    100% { transform: translate(-50%, 0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default LeadActions;

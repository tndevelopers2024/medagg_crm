import React, { useState, useEffect } from "react";
import { Table, Button, Tag, Space, Modal, Select, message, Tooltip } from "antd";
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    LockOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { getRoles, deleteRole } from "../../../utils/api";
import { useAuth } from "../../../contexts/AuthContext";
import AccessDenied from "../../../components/AccessDenied";
import PermissionGate from "../../../components/PermissionGate";

export default function RolesPage() {
    const { hasPermission } = useAuth();
    const navigate = useNavigate();
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(false);

    // Delete modal state
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState(null);
    const [reassignTo, setReassignTo] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const res = await getRoles();
            setRoles(res?.data || []);
        } catch (err) {
            message.error("Failed to load roles");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    const handleDelete = (role) => {
        setRoleToDelete(role);
        setReassignTo(null);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!reassignTo) {
            message.warning("Please select a role to reassign users to");
            return;
        }
        setDeleting(true);
        try {
            await deleteRole(roleToDelete._id, reassignTo);
            message.success("Role deleted successfully");
            setDeleteModalOpen(false);
            setRoleToDelete(null);
            fetchRoles();
        } catch (err) {
            message.error(err?.response?.data?.error || "Failed to delete role");
        } finally {
            setDeleting(false);
        }
    };

    const columns = [
        {
            title: "Name",
            dataIndex: "name",
            key: "name",
            render: (name, record) => (
                <Space>
                    <span className="font-medium">{name}</span>
                    {record.isSystem && (
                        <Tag color="purple" icon={<LockOutlined />}>
                            System
                        </Tag>
                    )}
                </Space>
            ),
        },
        {
            title: "Description",
            dataIndex: "description",
            key: "description",
            ellipsis: true,
        },
        {
            title: "Users",
            dataIndex: "userCount",
            key: "userCount",
            width: 90,
            align: "center",
            render: (count) => <Tag>{count}</Tag>,
        },
        {
            title: "Permissions",
            key: "permissions",
            width: 120,
            align: "center",
            render: (_, record) => (
                <Tag color="blue">{record.permissions?.length || 0}</Tag>
            ),
        },
        {
            title: "Actions",
            key: "actions",
            width: 120,
            align: "center",
            render: (_, record) => (
                <Space>
                    <PermissionGate permission="roles.roles.edit">
                        <Tooltip title="Edit">
                            <Button
                                type="text"
                                icon={<EditOutlined />}
                                onClick={() => navigate(`/roles/${record._id}`)}
                            />
                        </Tooltip>
                    </PermissionGate>
                    <PermissionGate permission="roles.roles.delete">
                        <Tooltip title={record.isSystem ? "Cannot delete system roles" : "Delete"}>
                            <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                disabled={record.isSystem}
                                onClick={() => handleDelete(record)}
                            />
                        </Tooltip>
                    </PermissionGate>
                </Space>
            ),
        },
    ];

    // Roles available for reassignment (exclude the one being deleted)
    const reassignOptions = roles.filter(
        (r) => r._id !== roleToDelete?._id
    );

    if (!hasPermission("roles.roles.view")) return <AccessDenied />;

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold m-0">Roles</h3>
                <PermissionGate permission="roles.roles.create">
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => navigate("/roles/create")}
                    >
                        Create Role
                    </Button>
                </PermissionGate>
            </div>

            <Table
                rowKey="_id"
                columns={columns}
                dataSource={roles}
                loading={loading}
                pagination={false}
                size="middle"
            />

            {/* Delete confirmation modal */}
            <Modal
                title="Delete Role"
                open={deleteModalOpen}
                onCancel={() => setDeleteModalOpen(false)}
                onOk={confirmDelete}
                confirmLoading={deleting}
                okText="Delete & Reassign"
                okButtonProps={{ danger: true }}
            >
                {roleToDelete && (
                    <div className="space-y-4">
                        <p>
                            Are you sure you want to delete the role{" "}
                            <strong>{roleToDelete.name}</strong>?
                        </p>
                        {roleToDelete.userCount > 0 && (
                            <p className="text-amber-600">
                                {roleToDelete.userCount} user(s) currently have
                                this role and will be reassigned.
                            </p>
                        )}
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Reassign users to:
                            </label>
                            <Select
                                placeholder="Select a role"
                                value={reassignTo}
                                onChange={setReassignTo}
                                style={{ width: "100%" }}
                                options={reassignOptions.map((r) => ({
                                    value: r._id,
                                    label: r.name,
                                }))}
                            />
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

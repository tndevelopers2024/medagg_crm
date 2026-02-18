import React, { useState, useEffect } from "react";
import {
    Table,
    Button,
    Input,
    Select,
    Modal,
    Form,
    Switch,
    Space,
    Tag,
    Tooltip,
    Popconfirm,
    Typography,
    Card,
    Row,
    Col,
} from "antd";
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    DragOutlined,
    SlidersOutlined,
    SearchOutlined,
} from "@ant-design/icons";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";
import { useAuth } from "../../../contexts/AuthContext";
import AccessDenied from "../../../components/AccessDenied";
import PermissionGate from "../../../components/PermissionGate";
import {
    fetchLeadFields,
    createLeadField,
    updateLeadField,
    deleteLeadField,
    reorderLeadFields,
} from "../../../utils/api";
import toast from "react-hot-toast";

const { Title, Text } = Typography;

const FIELD_TYPES = [
    { value: "text", label: "Text" },
    { value: "phone", label: "Phone" },
    { value: "email", label: "Email" },
    { value: "number", label: "Number" },
    { value: "dropdown", label: "Dropdown" },
    { value: "date", label: "Date" },
    { value: "textarea", label: "Text Area" },
];

const ICON_OPTIONS = [
    "user", "phone", "mail", "hash", "calendar", "map-pin", "map",
    "briefcase", "clipboard", "trending-up", "message-circle", "users",
];

const FieldModal = ({ field, open, onClose, onSave }) => {
    const [form] = Form.useForm();
    const [optionInput, setOptionInput] = useState("");
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            if (field) {
                form.setFieldsValue({
                    fieldName: field.fieldName,
                    displayLabel: field.displayLabel,
                    fieldType: field.fieldType,
                    isRequired: field.isRequired,
                    isActive: field.isActive !== undefined ? field.isActive : true,
                    placeholder: field.placeholder || "",
                    icon: field.icon || "user",
                });
                setOptions(field.options || []);
            } else {
                form.resetFields();
                form.setFieldsValue({
                    fieldType: "text",
                    isActive: true,
                    icon: "user",
                });
                setOptions([]);
            }
        }
    }, [open, field, form]);

    const handleAddOption = () => {
        if (!optionInput.trim()) return;
        setOptions([...options, optionInput.trim()]);
        setOptionInput("");
    };

    const handleRemoveOption = (index) => {
        setOptions(options.filter((_, i) => i !== index));
    };

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            if (values.fieldType === "dropdown" && options.length === 0) {
                toast.error("Dropdown fields must have at least one option");
                return;
            }
            setLoading(true);
            await onSave({ ...values, options });
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fieldType = Form.useWatch("fieldType", form);

    return (
        <Modal
            title={field ? "Edit Lead Field" : "Add New Lead Field"}
            open={open}
            onCancel={onClose}
            onOk={handleOk}
            confirmLoading={loading}
            width={700}
            okText={field ? "Update Field" : "Create Field"}
            className="rounded-2xl overflow-hidden"
        >
            <Form form={form} layout="vertical" className="pt-4">
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name="fieldName"
                            label="Field Name (Internal)"
                            rules={[{ required: true, message: "Required" }]}
                        >
                            <Input
                                placeholder="e.g. source_info"
                                disabled={!!field}
                                onChange={(e) => {
                                    form.setFieldValue("fieldName", e.target.value.toLowerCase().replace(/\s+/g, "_"));
                                }}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="displayLabel"
                            label="Display Label"
                            rules={[{ required: true, message: "Required" }]}
                        >
                            <Input placeholder="e.g. Lead Source" />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name="fieldType"
                            label="Field Type"
                            rules={[{ required: true, message: "Required" }]}
                        >
                            <Select>
                                {FIELD_TYPES.map((type) => (
                                    <Select.Option key={type.value} value={type.value}>
                                        {type.label}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="icon" label="Icon">
                            <Select>
                                {ICON_OPTIONS.map((icon) => (
                                    <Select.Option key={icon} value={icon}>
                                        {icon}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item name="placeholder" label="Placeholder">
                    <Input placeholder="e.g. Enter lead source" />
                </Form.Item>

                {fieldType === "dropdown" && (
                    <div className="mb-4">
                        <Text strong className="text-xs mb-1 block">Dropdown Options *</Text>
                        <Space.Compact style={{ width: '100%' }}>
                            <Input
                                value={optionInput}
                                onChange={(e) => setOptionInput(e.target.value)}
                                onPressEnter={(e) => {
                                    e.preventDefault();
                                    handleAddOption();
                                }}
                                placeholder="Add option and press Enter"
                            />
                            <Button type="primary" onClick={handleAddOption}>Add</Button>
                        </Space.Compact>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {options.map((option, index) => (
                                <Tag
                                    key={index}
                                    closable
                                    onClose={() => handleRemoveOption(index)}
                                    className="bg-gray-100 border-gray-200"
                                >
                                    {option}
                                </Tag>
                            ))}
                        </div>
                    </div>
                )}

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="isRequired" valuePropName="checked">
                            <Switch checkedChildren="Required" unCheckedChildren="Optional" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="isActive" valuePropName="checked">
                            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        </Modal>
    );
};

const FieldSettingsPage = () => {
    const { hasPermission } = useAuth();
    usePageTitle("Lead Field Settings");
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingField, setEditingField] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [draggedIndex, setDraggedIndex] = useState(null);

    useEffect(() => {
        loadFields();
    }, []);

    const loadFields = async () => {
        setLoading(true);
        try {
            const res = await fetchLeadFields();
            if (res.success) {
                setFields(res.data);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to load fields");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (formData) => {
        try {
            const res = await createLeadField(formData);
            if (res.success) {
                toast.success("Field created successfully");
                loadFields();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to create field");
            throw err;
        }
    };

    const handleUpdate = async (formData) => {
        try {
            const res = await updateLeadField(editingField._id, formData);
            if (res.success) {
                toast.success("Field updated successfully");
                loadFields();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to update field");
            throw err;
        }
    };

    const handleDelete = async (field) => {
        try {
            const res = await deleteLeadField(field._id);
            if (res.success) {
                toast.success("Field deleted successfully");
                loadFields();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to delete field");
        }
    };

    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const newFields = [...fields];
        const draggedField = newFields[draggedIndex];
        newFields.splice(draggedIndex, 1);
        newFields.splice(index, 0, draggedField);

        setFields(newFields);
        setDraggedIndex(index);
    };

    const handleDragEnd = async () => {
        if (draggedIndex === null) return;

        const fieldOrders = fields.map((field, index) => ({
            id: field._id,
            order: index,
        }));

        try {
            await reorderLeadFields(fieldOrders);
            toast.success("Fields reordered");
        } catch (err) {
            toast.error("Failed to reorder fields");
            loadFields();
        }

        setDraggedIndex(null);
    };

    const filteredFields = fields.filter(
        (f) =>
            f.displayLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.fieldName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const columns = [
        {
            title: "",
            key: "drag",
            width: 40,
            render: () => <DragOutlined className="text-gray-400 cursor-move" />,
        },
        {
            title: "Field Info",
            key: "info",
            render: (_, r) => (
                <div>
                    <div className="flex items-center gap-2">
                        <Text strong className="text-gray-900">{r.displayLabel}</Text>
                        {r.isRequired && <Tag color="red">Required</Tag>}
                        {!r.isActive && <Tag color="default">Inactive</Tag>}
                        {r.isSystemField && <Tag color="blue">System</Tag>}
                    </div>
                    <Text type="secondary" className="text-xs">{r.fieldName} • {r.fieldType}</Text>
                </div>
            ),
        },
        {
            title: "Actions",
            key: "actions",
            align: "right",
            render: (_, r) => (
                <Space>
                    <PermissionGate permission="settings.fieldSettings.edit">
                        <Tooltip title="Edit">
                            <Button
                                type="text"
                                icon={<EditOutlined style={{ color: '#1677ff' }} />}
                                onClick={() => {
                                    setEditingField(r);
                                    setShowModal(true);
                                }}
                            />
                        </Tooltip>
                    </PermissionGate>
                    {!r.isSystemField && (
                        <PermissionGate permission="settings.fieldSettings.delete">
                            <Popconfirm
                                title="Delete Field"
                                description="Are you sure? This cannot be undone."
                                onConfirm={() => handleDelete(r)}
                                okText="Yes"
                                cancelText="No"
                                okButtonProps={{ danger: true }}
                            >
                                <Button type="text" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                        </PermissionGate>
                    )}
                </Space>
            ),
        },
    ];

    if (!hasPermission("settings.fieldSettings.view")) return <AccessDenied />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Space align="center" size="middle">
                    <div className="rounded-xl bg-violet-50 p-2.5">
                        <SlidersOutlined className="text-violet-600" style={{ fontSize: 24 }} />
                    </div>
                    <div>
                        <Title level={4} style={{ margin: 0 }}>Lead Field Settings</Title>
                        <Text type="secondary" className="text-xs text-gray-500">Manage custom fields for your leads</Text>
                    </div>
                </Space>
                <PermissionGate permission="settings.fieldSettings.create">
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                            setEditingField(null);
                            setShowModal(true);
                        }}
                        size="large"
                        style={{ backgroundColor: '#7d3bd6' }}
                    >
                        Add Field
                    </Button>
                </PermissionGate>
            </div>

            <Card bordered={false} className="shadow-sm rounded-xl overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <Input
                        placeholder="Search fields..."
                        prefix={<SearchOutlined className="text-gray-400" />}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-md"
                    />
                </div>
                <Table
                    dataSource={filteredFields}
                    columns={columns}
                    pagination={false}
                    rowKey="_id"
                    loading={loading}
                    size="middle"
                    onRow={(record, index) => ({
                        index,
                        draggable: true,
                        onDragStart: (e) => handleDragStart(e, index),
                        onDragOver: (e) => handleDragOver(e, index),
                        onDragEnd: handleDragEnd,
                        className: "cursor-move",
                    })}
                />
                {filteredFields.length === 0 && !loading && (
                    <div className="text-center py-12 bg-gray-50">
                        <Text type="secondary">No fields found</Text>
                    </div>
                )}
            </Card>

            <FieldModal
                field={editingField}
                open={showModal}
                onClose={() => {
                    setShowModal(false);
                    setEditingField(null);
                }}
                onSave={editingField ? handleUpdate : handleCreate}
            />
        </div>
    );
};

export default FieldSettingsPage;

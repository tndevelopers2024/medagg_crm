import React, { useState, useEffect } from "react";
import {
    Card,
    Tabs,
    Table,
    Button,
    Modal,
    Form,
    Input,
    Select,
    Switch,
    Space,
    Tag,
    Tooltip,
    Popconfirm,
    Typography,
    Row,
    Col,
} from "antd";
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    DragOutlined,
    SlidersOutlined,
} from "@ant-design/icons";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";
import { useAuth } from "../../../contexts/AuthContext";
import AccessDenied from "../../../components/AccessDenied";
import PermissionGate from "../../../components/PermissionGate";
import {
    fetchBookingFields,
    createBookingField,
    updateBookingField,
    deleteBookingField,
    reorderBookingFields,
} from "../../../utils/api";
import toast from "react-hot-toast";

const { Title, Text } = Typography;

const FIELD_TYPES = [
    { value: "text", label: "Text" },
    { value: "number", label: "Number" },
    { value: "date", label: "Date" },
    { value: "time", label: "Time" },
    { value: "dropdown", label: "Dropdown" },
    { value: "textarea", label: "Text Area" },
];

const FieldModal = ({ field, bookingType, open, onClose, onSave }) => {
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
                });
                setOptions(field.options || []);
            } else {
                form.resetFields();
                form.setFieldsValue({
                    fieldType: "text",
                    isActive: true,
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
            await onSave({ ...values, options, bookingType: field?.bookingType || bookingType });
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
            title={field ? "Edit Field" : `Add New ${bookingType} Booking Field`}
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
                                placeholder="e.g. hospital_name"
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
                            <Input placeholder="e.g. Hospital Name" />
                        </Form.Item>
                    </Col>
                </Row>

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

                <Form.Item name="placeholder" label="Placeholder">
                    <Input placeholder="e.g. Select hospital" />
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

const BookingFieldSettingsPage = () => {
    const { hasPermission } = useAuth();
    usePageTitle("Booking Field Settings");
    const [activeTab, setActiveTab] = useState("OP");
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingField, setEditingField] = useState(null);
    const [draggedIndex, setDraggedIndex] = useState(null);

    useEffect(() => {
        loadFields();
    }, [activeTab]);

    const loadFields = async () => {
        setLoading(true);
        try {
            const res = await fetchBookingFields({ type: activeTab });
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
            const res = await createBookingField(formData);
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
            const res = await updateBookingField(editingField._id, formData);
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
            const res = await deleteBookingField(field._id);
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
            await reorderBookingFields(fieldOrders);
            toast.success("Fields reordered");
        } catch (err) {
            toast.error("Failed to reorder fields");
            loadFields();
        }

        setDraggedIndex(null);
    };

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
                    <PermissionGate permission="settings.bookingFields.edit">
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
                    <PermissionGate permission="settings.bookingFields.delete">
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
                </Space>
            ),
        },
    ];

    const tabItems = [
        { key: "OP", label: "OP Booking Fields" },
        { key: "IP", label: "IP Booking Fields" },
        { key: "DIAGNOSTIC", label: "Diagnostic Booking Fields" },
    ];

    if (!hasPermission("settings.bookingFields.view")) return <AccessDenied />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Space align="center" size="middle">
                    <div className="rounded-xl bg-violet-50 p-2.5">
                        <SlidersOutlined className="text-violet-600" style={{ fontSize: 24 }} />
                    </div>
                    <div>
                        <Title level={4} style={{ margin: 0 }}>Booking Field Settings</Title>
                        <Text type="secondary" className="text-xs">Configure OP, IP and Diagnostic booking fields</Text>
                    </div>
                </Space>
                <PermissionGate permission="settings.bookingFields.create">
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

            <Card bordered={false} className="shadow-sm rounded-xl">
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={tabItems.map(item => ({
                        key: item.key,
                        label: item.label,
                        children: (
                            <div className="pt-2">
                                <div className="mb-4 flex items-center justify-between">
                                    <Text strong className="text-xs text-gray-500 uppercase tracking-wider">
                                        {item.label}
                                    </Text>
                                    <Text type="secondary" className="text-xs">{fields.length} fields</Text>
                                </div>

                                <Table
                                    dataSource={fields}
                                    columns={columns}
                                    pagination={false}
                                    rowKey="_id"
                                    size="middle"
                                    loading={loading}
                                    onRow={(record, index) => ({
                                        index,
                                        draggable: true,
                                        onDragStart: (e) => handleDragStart(e, index),
                                        onDragOver: (e) => handleDragOver(e, index),
                                        onDragEnd: handleDragEnd,
                                        className: "cursor-move",
                                    })}
                                />
                                {fields.length === 0 && !loading && (
                                    <div className="text-center py-12 bg-gray-50 border border-dashed rounded-xl mt-4">
                                        <Text type="secondary">No fields found for this category</Text>
                                    </div>
                                )}
                            </div>
                        )
                    }))}
                />
            </Card>

            <FieldModal
                field={editingField}
                bookingType={activeTab}
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

export default BookingFieldSettingsPage;

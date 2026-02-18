import React, { useState, useEffect } from "react";
import {
    Table,
    Button,
    Input,
    Modal,
    Form,
    Space,
    Tag,
    Tooltip,
    Popconfirm,
    Typography,
    Card,
    Row,
    Col,
    Select,
    Checkbox,
    Tabs,
} from "antd";
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    BlockOutlined,
} from "@ant-design/icons";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";
import { useAuth } from "../../../contexts/AuthContext";
import AccessDenied from "../../../components/AccessDenied";
import PermissionGate from "../../../components/PermissionGate";
import {
    fetchLeadStages,
    createLeadStage,
    updateLeadStage,
    deleteLeadStage,
} from "../../../utils/api";
import toast from "react-hot-toast";

const { Title, Text } = Typography;

const STAGE_CATEGORIES = [
    { value: "initial", label: "Initial Stage" },
    { value: "active", label: "Active Stages" },
    { value: "won", label: "Won Stages" },
    { value: "lost", label: "Lost Stages" },
];

const STAGE_COLORS = [
    { label: "Blue", value: "blue" },
    { label: "Cyan", value: "cyan" },
    { label: "Green", value: "green" },
    { label: "Gold", value: "gold" },
    { label: "Orange", value: "orange" },
    { label: "Red", value: "red" },
    { label: "Purple", value: "purple" },
    { label: "Magenta", value: "magenta" },
    { label: "Gray", value: "default" },
];

const StageModal = ({ stage, open, onClose, onSave }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            if (stage) {
                form.setFieldsValue({
                    stageName: stage.stageName,
                    displayLabel: stage.displayLabel,
                    stageCategory: stage.stageCategory,
                    color: stage.color || "default",
                    isDefault: stage.isDefault || false,
                    description: stage.description || "",
                });
            } else {
                form.resetFields();
                form.setFieldsValue({
                    stageCategory: "active",
                    color: "default",
                    isDefault: false,
                });
            }
        }
    }, [open, stage, form]);

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);
            await onSave({
                ...values,
                stageName: values.stageName.toLowerCase().replace(/\s+/g, "_"),
            });
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={stage ? "Edit Lead Stage" : "Add New Lead Stage"}
            open={open}
            onCancel={onClose}
            onOk={handleOk}
            confirmLoading={loading}
            okText={stage ? "Update Stage" : "Create Stage"}
            className="rounded-2xl overflow-hidden"
        >
            <Form form={form} layout="vertical" className="pt-4">
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name="stageName"
                            label="Stage Name (Internal)"
                            rules={[{ required: true, message: "Required" }]}
                        >
                            <Input placeholder="e.g. hot_lead" disabled={!!stage} />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="displayLabel"
                            label="Display Label"
                            rules={[{ required: true, message: "Required" }]}
                        >
                            <Input placeholder="e.g. Hot Lead" />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="stageCategory" label="Category" rules={[{ required: true }]}>
                            <Select>
                                {STAGE_CATEGORIES.map((cat) => (
                                    <Select.Option key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="color" label="Color">
                            <Select>
                                {STAGE_COLORS.map((c) => (
                                    <Select.Option key={c.value} value={c.value}>
                                        <Tag color={c.value}>{c.label}</Tag>
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item name="description" label="Description">
                    <Input.TextArea rows={3} placeholder="Optional description" />
                </Form.Item>

                <Form.Item name="isDefault" valuePropName="checked">
                    <Checkbox>Set as default stage for new leads</Checkbox>
                </Form.Item>
            </Form>
        </Modal>
    );
};

const LeadStagesPage = () => {
    const { hasPermission } = useAuth();
    usePageTitle("Lead Stages Settings");
    const [activeTab, setActiveTab] = useState("initial");
    const [stages, setStages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingStage, setEditingStage] = useState(null);

    useEffect(() => {
        loadStages();
    }, []);

    const loadStages = async () => {
        setLoading(true);
        try {
            const res = await fetchLeadStages();
            if (res.success) {
                setStages(res.data);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to load stages");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (formData) => {
        try {
            const res = await createLeadStage(formData);
            if (res.success) {
                toast.success("Stage created successfully");
                loadStages();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to create stage");
            throw err;
        }
    };

    const handleUpdate = async (formData) => {
        try {
            const res = await updateLeadStage(editingStage._id, formData);
            if (res.success) {
                toast.success("Stage updated successfully");
                loadStages();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to update stage");
            throw err;
        }
    };

    const handleDelete = async (stage) => {
        try {
            const res = await deleteLeadStage(stage._id);
            if (res.success) {
                toast.success("Stage deleted successfully");
                loadStages();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to delete stage");
        }
    };

    const columns = [
        {
            title: "Stage Name",
            key: "name",
            render: (_, r) => (
                <Space size="middle">
                    <Tag color={r.color} className="font-medium px-4 py-1 rounded-full uppercase text-xs">
                        {r.displayLabel}
                    </Tag>
                    {r.isDefault && (
                        <Tag color="blue" className="text-xs">
                            Default
                        </Tag>
                    )}
                </Space>
            ),
        },
        {
            title: "Internal Name",
            dataIndex: "stageName",
            key: "stageName",
            render: (text) => (
                <Text type="secondary" className="text-sm italic text-gray-400">
                    {text}
                </Text>
            ),
        },
        {
            title: "Actions",
            key: "actions",
            align: "right",
            render: (_, r) => (
                <Space>
                    <PermissionGate permission="settings.leadStages.edit">
                        <Tooltip title="Edit">
                            <Button
                                type="text"
                                icon={<EditOutlined style={{ color: '#1677ff' }} />}
                                onClick={() => {
                                    setEditingStage(r);
                                    setShowModal(true);
                                }}
                            />
                        </Tooltip>
                    </PermissionGate>
                    {!r.isSystemStage && !r.isDefault && (
                        <PermissionGate permission="settings.leadStages.delete">
                            <Popconfirm
                                title="Delete Lead Stage"
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

    if (!hasPermission("settings.leadStages.view")) return <AccessDenied />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Space align="center" size="middle">
                    <div className="rounded-xl bg-violet-50 p-2.5">
                        <BlockOutlined className="text-violet-600" style={{ fontSize: 24 }} />
                    </div>
                    <div>
                        <Title level={4} style={{ margin: 0 }}>Lead Stages Settings</Title>
                        <Text type="secondary" className="text-xs text-gray-500">Configure your sales pipeline stages</Text>
                    </div>
                </Space>
                <PermissionGate permission="settings.leadStages.create">
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                            setEditingStage(null);
                            setShowModal(true);
                        }}
                        size="large"
                        style={{ backgroundColor: '#7d3bd6' }}
                    >
                        Add Stage
                    </Button>
                </PermissionGate>
            </div>

            <Card bordered={false} className="shadow-sm rounded-xl overflow-hidden">
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={STAGE_CATEGORIES.map((cat) => ({
                        key: cat.value,
                        label: cat.label,
                        children: (
                            <div className="pt-2">
                                <div className="mb-4 flex items-center justify-between">
                                    <Text strong className="text-xs text-gray-400 uppercase tracking-wider">
                                        {cat.label}
                                    </Text>
                                    <Text type="secondary" className="text-xs">
                                        {stages.filter(s => s.stageCategory === cat.value).length} stages
                                    </Text>
                                </div>
                                <Table
                                    dataSource={stages.filter(s => s.stageCategory === cat.value)}
                                    columns={columns}
                                    pagination={false}
                                    rowKey="_id"
                                    loading={loading}
                                    size="middle"
                                />
                                {stages.filter(s => s.stageCategory === cat.value).length === 0 && !loading && (
                                    <div className="text-center py-12 bg-gray-50 border border-dashed rounded-xl mt-4">
                                        <Text type="secondary">No stages found in this category</Text>
                                    </div>
                                )}
                            </div>
                        ),
                    }))}
                />
            </Card>

            <StageModal
                stage={editingStage}
                open={showModal}
                onClose={() => {
                    setShowModal(false);
                    setEditingStage(null);
                }}
                onSave={editingStage ? handleUpdate : handleCreate}
            />
        </div>
    );
};

export default LeadStagesPage;

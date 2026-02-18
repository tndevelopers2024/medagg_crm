import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    Button, Input, Select, Table, Tag, Modal, Tabs, Space, Segmented,
    Checkbox, InputNumber, Typography, Alert, Tooltip, Pagination, Spin, Empty, message
} from "antd";
import { FiPlus, FiFacebook, FiTrendingUp, FiRefreshCw, FiEye, FiPercent, FiHelpCircle } from "react-icons/fi";
import { FaGoogle, FaInstagram, FaLinkedin } from "react-icons/fa";
import { fetchCampaigns, createCampaign, updateCampaign, syncCampaign, getAllUsers } from "../../../utils/api";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";
import { useAuth } from "../../../contexts/AuthContext";
import AccessDenied from "../../../components/AccessDenied";
import PermissionGate from "../../../components/PermissionGate";

const { Text, Title } = Typography;

const PlatformIcon = ({ platform }) => {
    switch (platform) {
        case "facebook": return <FiFacebook className="text-blue-600" />;
        case "google": return <FaGoogle className="text-red-500" />;
        case "instagram": return <FaInstagram className="text-pink-600" />;
        case "linkedin": return <FaLinkedin className="text-blue-700" />;
        default: return <FiTrendingUp className="text-gray-500" />;
    }
};

const PLATFORM_OPTIONS = [
    { id: "facebook", label: "Facebook", icon: <FiFacebook className="text-blue-600 text-2xl" /> },
    { id: "google", label: "Google", icon: <FaGoogle className="text-red-500 text-2xl" /> },
    { id: "instagram", label: "Instagram", icon: <FaInstagram className="text-pink-600 text-2xl" /> },
    { id: "linkedin", label: "LinkedIn", icon: <FaLinkedin className="text-blue-700 text-2xl" /> },
];

const SORT_OPTIONS = [
    { value: "createdAt_desc", label: "Newest First" },
    { value: "createdAt_asc", label: "Oldest First" },
    { value: "name_asc", label: "Name (A-Z)" },
    { value: "name_desc", label: "Name (Z-A)" },
    { value: "budget_desc", label: "Budget (High-Low)" },
    { value: "budget_asc", label: "Budget (Low-High)" },
    { value: "status_asc", label: "Status (Active First)" },
    { value: "status_desc", label: "Status (Paused First)" },
];

// --- Campaign Create/Edit Modal ---
const CampaignModal = ({ open, onClose, onSuccess, initialData = null }) => {
    const [callers, setCallers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");
    const [form, setForm] = useState({
        name: "",
        platform: "facebook",
        budget: "",
        status: "active",
        assignedCallers: [],
        integrationProvider: "none",
        adAccountId: "",
        formId: "",
        accessToken: "",
    });

    const totalPercentage = form.assignedCallers.reduce((sum, c) => sum + (c.percentage || 0), 0);

    useEffect(() => {
        getAllUsers({ role: 'caller' }).then(setCallers).catch(console.error);

        if (initialData) {
            let normalizedCallers = [];
            if (Array.isArray(initialData.assignedCallers)) {
                normalizedCallers = initialData.assignedCallers.map(item => {
                    if (typeof item === 'string') return { callerId: item, percentage: 0 };
                    const cId = item.callerId?._id || item.callerId || item._id || item;
                    const pct = item.percentage || 0;
                    return { callerId: cId, percentage: pct };
                });
            }

            setForm({
                name: initialData.name,
                platform: initialData.platform,
                budget: initialData.budget,
                status: initialData.status,
                assignedCallers: normalizedCallers,
                integrationProvider: initialData.integration?.provider || "none",
                adAccountId: initialData.integration?.adAccountId || "",
                formId: initialData.integration?.formId || "",
                accessToken: initialData.integration?.accessToken || "",
            });
        }
    }, [initialData]);

    const handleSubmit = async () => {
        if (!form.name) return message.error("Name is required");

        setLoading(true);
        try {
            const payload = {
                name: form.name,
                platform: form.platform,
                budget: Number(form.budget),
                status: form.status,
                assignedCallers: form.assignedCallers,
                integration: {
                    provider: form.integrationProvider,
                    adAccountId: form.adAccountId,
                    formId: form.formId,
                    accessToken: form.accessToken,
                }
            };

            if (initialData) {
                await updateCampaign(initialData._id, payload);
                message.success("Campaign updated!");
            } else {
                await createCampaign(payload);
                message.success("Campaign created!");
            }
            onSuccess();
        } catch (err) {
            console.error(err);
            message.error(initialData ? "Failed to update campaign" : "Failed to create campaign");
        } finally {
            setLoading(false);
        }
    };

    const toggleCaller = (callerId) => {
        const exists = form.assignedCallers.find(c => c.callerId === callerId);
        if (exists) {
            setForm(prev => ({ ...prev, assignedCallers: prev.assignedCallers.filter(c => c.callerId !== callerId) }));
        } else {
            setForm(prev => ({ ...prev, assignedCallers: [...prev.assignedCallers, { callerId, percentage: 0 }] }));
        }
    };

    const distributeEvenly = () => {
        if (form.assignedCallers.length === 0) return;
        const count = form.assignedCallers.length;
        const base = Math.floor(100 / count);
        let remainder = 100 - (base * count);

        const newCallers = form.assignedCallers.map((c, idx) => ({
            ...c,
            percentage: base + (idx < remainder ? 1 : 0)
        }));
        setForm(prev => ({ ...prev, assignedCallers: newCallers }));
    };

    const tabItems = [
        {
            key: "overview",
            label: "Overview",
            children: (
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 block">Campaign Name</label>
                        <Input
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="e.g. Summer Sale 2024"
                            size="large"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 block">Platform</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {PLATFORM_OPTIONS.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => setForm({ ...form, platform: p.id })}
                                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border cursor-pointer transition-all ${form.platform === p.id
                                        ? "bg-white border-violet-500 ring-2 ring-violet-500/10 shadow-md"
                                        : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm grayscale opacity-70 hover:grayscale-0 hover:opacity-100"
                                        }`}
                                >
                                    {p.icon}
                                    <span className="text-xs font-medium text-gray-700">{p.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 block">Budget</label>
                            <InputNumber
                                value={form.budget}
                                onChange={(val) => setForm({ ...form, budget: val })}
                                placeholder="0.00"
                                prefix="₹"
                                className="w-full"
                                size="large"
                                min={0}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 block">Status</label>
                            <Segmented
                                value={form.status}
                                onChange={(val) => setForm({ ...form, status: val })}
                                options={[
                                    { label: "Active", value: "active" },
                                    { label: "Paused", value: "paused" },
                                ]}
                                block
                                size="large"
                            />
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: "distribution",
            label: "Distribution",
            children: (
                <div className="space-y-5">
                    <div className="flex items-center justify-between">
                        <Text strong>Caller Assignment</Text>
                        <Space>
                            <Button size="small" type="link" onClick={distributeEvenly}>
                                Distribute Evenly
                            </Button>
                            <Button size="small" type="link" danger onClick={() => setForm(prev => ({ ...prev, assignedCallers: [] }))}>
                                Clear All
                            </Button>
                        </Space>
                    </div>

                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                        <div className="max-h-[340px] overflow-y-auto divide-y divide-gray-100">
                            {callers.map(caller => {
                                const isSelected = form.assignedCallers.some(c => c.callerId === caller.id);
                                const assignment = form.assignedCallers.find(c => c.callerId === caller.id) || { percentage: 0 };

                                return (
                                    <div key={caller.id} className={`flex items-center justify-between p-3 transition-colors ${isSelected ? 'bg-violet-50/30' : 'hover:bg-gray-50'}`}>
                                        <div className="flex items-center gap-3 flex-1">
                                            <Checkbox
                                                checked={isSelected}
                                                onChange={() => toggleCaller(caller.id)}
                                            />
                                            <div>
                                                <Text strong className="text-sm">{caller.name}</Text>
                                                <div><Text type="secondary" className="text-xs">{(caller.email || "No email").toLowerCase()}</Text></div>
                                            </div>
                                        </div>

                                        {isSelected && (
                                            <Space size={4} className="bg-white border border-gray-200 rounded-lg px-2 py-1">
                                                <FiPercent className="text-gray-400 text-xs" />
                                                <InputNumber
                                                    min={0}
                                                    max={100}
                                                    value={assignment.percentage}
                                                    onChange={(val) => {
                                                        const v = Math.max(0, val || 0);
                                                        setForm(prev => ({
                                                            ...prev,
                                                            assignedCallers: prev.assignedCallers.map(c =>
                                                                c.callerId === caller.id ? { ...c, percentage: v } : c
                                                            )
                                                        }));
                                                    }}
                                                    size="small"
                                                    controls={false}
                                                    style={{ width: 48, textAlign: "center" }}
                                                />
                                            </Space>
                                        )}
                                    </div>
                                );
                            })}
                            {callers.length === 0 && (
                                <Empty description="No callers available to assign" className="py-8" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            )}
                        </div>
                    </div>

                    {form.assignedCallers.length > 0 && (
                        <Alert
                            type={totalPercentage === 100 ? "success" : "warning"}
                            message={
                                <div className="flex items-center justify-between">
                                    <span>Total Allocation</span>
                                    <Space>
                                        <Text strong style={{ fontSize: 18 }}>{totalPercentage}%</Text>
                                        {totalPercentage !== 100 && <Tag color="warning">Must be 100%</Tag>}
                                    </Space>
                                </div>
                            }
                            showIcon
                        />
                    )}
                </div>
            ),
        },
        {
            key: "integration",
            label: "Integration",
            children: (
                <div className="space-y-6">
                    <Alert
                        type="info"
                        showIcon
                        icon={<FiHelpCircle />}
                        message="Automatic Lead Sync"
                        description="Connect your ad platform to automatically import leads into Medagg. Credentials are stored securely."
                    />

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 block">Provider</label>
                        <Select
                            value={form.integrationProvider}
                            onChange={(val) => setForm({ ...form, integrationProvider: val })}
                            className="w-full"
                            size="large"
                            options={[
                                { value: "none", label: "None (Manual Import)" },
                                { value: "meta", label: "Meta (Facebook & Instagram)" },
                                { value: "google", label: "Google Ads" },
                            ]}
                        />
                    </div>

                    {form.integrationProvider === "meta" && (
                        <div className="space-y-4 pt-2 border-t border-gray-100">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase text-gray-500 block">Facebook Lead Form ID</label>
                                <Input
                                    value={form.formId}
                                    onChange={(e) => setForm({ ...form, formId: e.target.value })}
                                    placeholder="1202..."
                                    style={{ fontFamily: "monospace" }}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase text-gray-500 block">Page Access Token</label>
                                <Input.TextArea
                                    value={form.accessToken}
                                    onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
                                    placeholder="EAA..."
                                    rows={4}
                                    style={{ fontFamily: "monospace" }}
                                />
                                <Text type="secondary" className="text-xs block text-right">Generate from Meta Business Suite</Text>
                            </div>
                        </div>
                    )}

                    {form.integrationProvider === "google" && (
                        <div className="space-y-4 pt-2 border-t border-gray-100">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase text-gray-500 block">Customer ID</label>
                                <Input
                                    value={form.adAccountId}
                                    onChange={(e) => setForm({ ...form, adAccountId: e.target.value })}
                                    placeholder="123-456-7890"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase text-gray-500 block">Refresh Token</label>
                                <Input.Password
                                    value={form.accessToken}
                                    onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                    )}
                </div>
            ),
        },
    ];

    return (
        <Modal
            open={open}
            onCancel={onClose}
            title={
                <div>
                    <Title level={5} style={{ marginBottom: 2 }}>{initialData ? "Edit Campaign" : "Create New Campaign"}</Title>
                    <Text type="secondary" className="text-xs">Configure details, assignments and integrations</Text>
                </div>
            }
            footer={[
                <Button key="cancel" onClick={onClose}>Cancel</Button>,
                <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
                    {initialData ? "Update Campaign" : "Create Campaign"}
                </Button>,
            ]}
            width={680}
            destroyOnClose
        >
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
            />
        </Modal>
    );
};

// --- Main Page ---
export default function CampaignsPage() {
    const { hasPermission } = useAuth();
    usePageTitle("Campaigns");
    const navigate = useNavigate();

    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState(null);
    const [syncing, setSyncing] = useState({});

    const [search, setSearch] = useState("");
    const [sort, setSort] = useState("createdAt_desc");

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1
    });

    const [debouncedSearch, setDebouncedSearch] = useState("");
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
            setPagination(prev => ({ ...prev, page: 1 }));
        }, 500);
        return () => clearTimeout(handler);
    }, [search]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await fetchCampaigns({
                search: debouncedSearch,
                sort,
                page: pagination.page,
                limit: pagination.limit
            });
            if (res.success) {
                setCampaigns(res.data);
                if (res.pagination) {
                    setPagination(res.pagination);
                }
            }
        } catch (err) {
            console.error(err);
            message.error("Failed to load campaigns");
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async (id) => {
        setSyncing(prev => ({ ...prev, [id]: true }));
        try {
            const res = await syncCampaign(id);
            if (res.success) {
                message.success(res.message);
                loadData();
            } else {
                message.error(res.error || "Sync failed");
            }
        } catch (err) {
            console.error(err);
            message.error("Sync failed: " + (err.response?.data?.error || err.message));
        } finally {
            setSyncing(prev => ({ ...prev, [id]: false }));
        }
    };

    useEffect(() => {
        loadData();
    }, [debouncedSearch, sort, pagination.page]);

    const columns = [
        {
            title: "Campaign",
            dataIndex: "name",
            key: "name",
            render: (_, camp) => (
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-gray-50 p-2 text-xl">
                        <PlatformIcon platform={camp.platform} />
                    </div>
                    <div
                        className="cursor-pointer group"
                        onClick={() => navigate('/leads', { state: { filter: { campaignFilter: camp._id } } })}
                    >
                        <Text strong className="group-hover:text-violet-600 transition-colors">{camp.name}</Text>
                        <div><Text type="secondary" className="text-xs">Created: {new Date(camp.createdAt).toLocaleDateString()}</Text></div>
                        {camp.assignedCallers?.length > 0 && (
                            <Text className="text-xs text-violet-600">{camp.assignedCallers.length} Callers Assigned</Text>
                        )}
                    </div>
                </div>
            ),
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            width: 110,
            render: (status) => (
                <Tag color={status === "active" ? "green" : "default"}>
                    {status?.toUpperCase()}
                </Tag>
            ),
        },
        {
            title: "Leads",
            key: "leads",
            width: 100,
            render: (_, camp) => (
                <div
                    className="cursor-pointer group"
                    onClick={() => navigate('/admin/leads', { state: { filter: { campaignFilter: camp._id } } })}
                >
                    <Text strong className="group-hover:text-violet-600 transition-colors">
                        {(camp.metaData?.leads || 0).toLocaleString()}
                    </Text>
                    <div><Text type="secondary" className="text-xs">{(camp.metaData?.clicks || 0).toLocaleString()} Clicks</Text></div>
                </div>
            ),
        },
        {
            title: "Spend",
            key: "spend",
            width: 100,
            render: (_, camp) => (
                <Text strong>₹{(camp.metaData?.spend || 0).toLocaleString()}</Text>
            ),
        },
        {
            title: "Integration",
            key: "integration",
            width: 130,
            render: (_, camp) => (
                <div>
                    <Text className="text-sm capitalize">
                        {camp.integration?.provider !== 'none' ? camp.integration?.provider : 'Manual'}
                    </Text>
                    {(camp.integration?.provider === 'meta' || camp.integration?.provider === 'google') && (
                        <div><Text type="secondary" className="text-xs">
                            Synced: {camp.integration.lastSyncAt ? new Date(camp.integration.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                        </Text></div>
                    )}
                </div>
            ),
        },
        {
            title: "Actions",
            key: "actions",
            width: 150,
            align: "right",
            render: (_, camp) => (
                <Space>
                    {(camp.integration?.provider === 'meta' || camp.integration?.provider === 'google') && (
                        <PermissionGate permission="campaigns.campaigns.sync">
                            <Tooltip title="Sync Leads">
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<FiRefreshCw className={syncing[camp._id] ? "animate-spin" : ""} />}
                                    onClick={() => handleSync(camp._id)}
                                    disabled={syncing[camp._id]}
                                />
                            </Tooltip>
                        </PermissionGate>
                    )}
                    <Tooltip title="View Leads">
                        <Button
                            type="text"
                            size="small"
                            icon={<FiEye />}
                            onClick={() => navigate('/leads', { state: { filter: { campaignFilter: camp._id } } })}
                        />
                    </Tooltip>
                    <PermissionGate permission="campaigns.import.view">
                        <Tooltip title="Import Leads">
                            <Link to={`/campaigns/${camp._id}/import`}>
                                <Button type="text" size="small" icon={<FiPlus />} />
                            </Link>
                        </Tooltip>
                    </PermissionGate>
                    <PermissionGate permission="campaigns.campaigns.edit">
                        <Button type="link" size="small" onClick={() => setEditingCampaign(camp)}>
                            Edit
                        </Button>
                    </PermissionGate>
                </Space>
            ),
        },
    ];

    if (!hasPermission("campaigns.campaigns.view")) return <AccessDenied />;

    return (
        <div className="mx-auto px-4 py-6 md:px-8">
            {/* Header */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <Title level={3} style={{ marginBottom: 4 }}>Campaign Management</Title>
                    <Text type="secondary">Track and manage your marketing campaigns</Text>
                </div>
                <PermissionGate permission="campaigns.campaigns.create">
                    <Button type="primary" icon={<FiPlus />} size="large" onClick={() => setShowCreate(true)}>
                        New Campaign
                    </Button>
                </PermissionGate>
            </div>

            {/* Filters */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row">
                <Input.Search
                    placeholder="Search campaigns..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    allowClear
                    className="sm:max-w-md"
                    size="large"
                />
                <Select
                    value={sort}
                    onChange={(val) => {
                        setSort(val);
                        setPagination(prev => ({ ...prev, page: 1 }));
                    }}
                    options={SORT_OPTIONS}
                    style={{ minWidth: 200 }}
                    size="large"
                />
            </div>

            {/* Table */}
            <Table
                columns={columns}
                dataSource={campaigns}
                rowKey="_id"
                loading={loading}
                pagination={false}
                locale={{ emptyText: <Empty description="No campaigns found. Create your first campaign to start tracking." /> }}
                scroll={{ x: "max-content" }}
            />

            {/* Pagination */}
            {campaigns.length > 0 && (
                <div className="mt-4 flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-gray-200">
                    <Text type="secondary" className="text-sm">
                        Showing <Text strong>{((pagination.page - 1) * pagination.limit) + 1}</Text> to{" "}
                        <Text strong>{Math.min(pagination.page * pagination.limit, pagination.total)}</Text> of{" "}
                        <Text strong>{pagination.total}</Text> results
                    </Text>
                    <Pagination
                        current={pagination.page}
                        total={pagination.total}
                        pageSize={pagination.limit}
                        onChange={(page) => setPagination(prev => ({ ...prev, page }))}
                        showSizeChanger={false}
                        size="small"
                    />
                </div>
            )}

            {/* Create Modal */}
            <CampaignModal
                open={showCreate}
                onClose={() => setShowCreate(false)}
                onSuccess={() => {
                    setShowCreate(false);
                    loadData();
                }}
            />

            {/* Edit Modal */}
            <CampaignModal
                open={!!editingCampaign}
                initialData={editingCampaign}
                onClose={() => setEditingCampaign(null)}
                onSuccess={() => {
                    setEditingCampaign(null);
                    loadData();
                }}
            />
        </div>
    );
}

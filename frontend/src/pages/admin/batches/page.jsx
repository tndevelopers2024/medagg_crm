import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    Button, Input, Select, Table, Tag, Modal, Space, Checkbox, InputNumber,
    Typography, Alert, Tooltip, Pagination, Empty, message
} from "antd";
import { FiEye, FiUsers, FiPercent, FiFileText } from "react-icons/fi";
import { fetchBatches, assignBatch, getAllUsers } from "../../../utils/api";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";
import { useAuth } from "../../../contexts/AuthContext";
import AccessDenied from "../../../components/AccessDenied";
import { buildLeadsUrl } from "../../../utils/leadsNavigation";

const { Text, Title } = Typography;

const SORT_OPTIONS = [
    { value: "leadCount_desc", label: "Most Leads" },
    { value: "leadCount_asc",  label: "Fewest Leads" },
    { value: "name_asc",       label: "Name (A-Z)" },
    { value: "name_desc",      label: "Name (Z-A)" },
    { value: "newest",         label: "Latest First" },
    { value: "oldest",         label: "Oldest First" },
];

// --- Assign Modal ---
const AssignModal = ({ open, batchName, onClose, onSuccess }) => {
    const [callers, setCallers] = useState([]);
    const [selected, setSelected] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) return;
        setSelected([]);
        getAllUsers({ role: "caller" }).then(setCallers).catch(console.error);
    }, [open]);

    const totalPct = selected.reduce((s, c) => s + (c.percentage || 0), 0);

    const toggleCaller = (callerId) => {
        setSelected(prev => {
            const exists = prev.find(c => c.callerId === callerId);
            return exists
                ? prev.filter(c => c.callerId !== callerId)
                : [...prev, { callerId, percentage: 0 }];
        });
    };

    const distributeEvenly = () => {
        if (selected.length === 0) return;
        const base = Math.floor(100 / selected.length);
        const rem  = 100 - base * selected.length;
        setSelected(prev => prev.map((c, i) => ({ ...c, percentage: base + (i < rem ? 1 : 0) })));
    };

    const handleAssign = async () => {
        if (selected.length === 0) return message.warning("Select at least one caller");
        if (totalPct !== 100) return message.warning("Total percentage must be 100%");
        setLoading(true);
        try {
            const res = await assignBatch(batchName, selected);
            if (res.success) {
                message.success(`${res.assigned} leads assigned successfully`);
                onSuccess();
            } else {
                message.error(res.error || "Assignment failed");
            }
        } catch (err) {
            message.error("Failed to assign: " + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            open={open}
            onCancel={onClose}
            title={
                <div>
                    <Title level={5} style={{ marginBottom: 2 }}>Assign Leads to Callers</Title>
                    <Text type="secondary" className="text-xs break-all">{batchName}</Text>
                </div>
            }
            footer={[
                <Button key="cancel" onClick={onClose}>Cancel</Button>,
                <Button key="submit" type="primary" loading={loading} onClick={handleAssign}>
                    Assign Leads
                </Button>,
            ]}
            width={560}
            destroyOnClose
        >
            <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                    <Text strong>Select Callers</Text>
                    <Space>
                        <Button size="small" type="link" onClick={distributeEvenly}>Distribute Evenly</Button>
                        <Button size="small" type="link" danger onClick={() => setSelected([])}>Clear All</Button>
                    </Space>
                </div>

                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                    <div className="max-h-[320px] overflow-y-auto divide-y divide-gray-100">
                        {callers.map(caller => {
                            const isSel = selected.some(c => c.callerId === caller.id);
                            const assign = selected.find(c => c.callerId === caller.id) || { percentage: 0 };
                            return (
                                <div key={caller.id} className={`flex items-center justify-between p-3 transition-colors ${isSel ? "bg-violet-50/30" : "hover:bg-gray-50"}`}>
                                    <div className="flex items-center gap-3 flex-1">
                                        <Checkbox checked={isSel} onChange={() => toggleCaller(caller.id)} />
                                        <div>
                                            <Text strong className="text-sm">{caller.name}</Text>
                                            <div><Text type="secondary" className="text-xs">{(caller.email || "No email").toLowerCase()}</Text></div>
                                        </div>
                                    </div>
                                    {isSel && (
                                        <Space size={4} className="bg-white border border-gray-200 rounded-lg px-2 py-1">
                                            <FiPercent className="text-gray-400 text-xs" />
                                            <InputNumber
                                                min={0} max={100}
                                                value={assign.percentage}
                                                onChange={(val) => setSelected(prev => prev.map(c =>
                                                    c.callerId === caller.id ? { ...c, percentage: Math.max(0, val || 0) } : c
                                                ))}
                                                size="small" controls={false}
                                                style={{ width: 48, textAlign: "center" }}
                                            />
                                        </Space>
                                    )}
                                </div>
                            );
                        })}
                        {callers.length === 0 && (
                            <Empty description="No callers available" className="py-8" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        )}
                    </div>
                </div>

                {selected.length > 0 && (
                    <Alert
                        type={totalPct === 100 ? "success" : "warning"}
                        message={
                            <div className="flex items-center justify-between">
                                <span>Total Allocation</span>
                                <Space>
                                    <Text strong style={{ fontSize: 18 }}>{totalPct}%</Text>
                                    {totalPct !== 100 && <Tag color="warning">Must be 100%</Tag>}
                                </Space>
                            </div>
                        }
                        showIcon
                    />
                )}
            </div>
        </Modal>
    );
};

// --- Main Page ---
export default function BatchesPage() {
    const { hasPermission } = useAuth();
    usePageTitle("Batch Names", "Form-based lead groups");
    const navigate = useNavigate();

    const [batches, setBatches]         = useState([]);
    const [loading, setLoading]         = useState(true);
    const [search, setSearch]           = useState("");
    const [debouncedSearch, setDebounced] = useState("");
    const [sort, setSort]               = useState("leadCount_desc");
    const [assignTarget, setAssignTarget] = useState(null); // batchName to assign
    const [pagination, setPagination]   = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

    useEffect(() => {
        const t = setTimeout(() => { setDebounced(search); setPagination(p => ({ ...p, page: 1 })); }, 400);
        return () => clearTimeout(t);
    }, [search]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchBatches({ search: debouncedSearch, sort, page: pagination.page, limit: pagination.limit });
            if (res.success) {
                setBatches(res.data);
                if (res.pagination) setPagination(res.pagination);
            }
        } catch (err) {
            console.error(err);
            message.error("Failed to load batches");
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, sort, pagination.page, pagination.limit]);

    useEffect(() => { loadData(); }, [loadData]);

    const columns = [
        {
            title: "Form Name",
            dataIndex: "batchName",
            key: "batchName",
            render: (name, row) => (
                <div
                    className="flex items-start gap-3 cursor-pointer group"
                    onClick={() => navigate(buildLeadsUrl({ batch: name }))}
                >
                    <div className="mt-0.5 rounded-lg bg-violet-50 p-2 text-xl flex-shrink-0">
                        <FiFileText className="text-violet-500" />
                    </div>
                    <div>
                        <Text strong className="group-hover:text-violet-600 transition-colors">{name}</Text>
                        {row.lastLeadAt && (
                            <div><Text type="secondary" className="text-xs">
                                Last lead: {new Date(row.lastLeadAt).toLocaleDateString()}
                            </Text></div>
                        )}
                    </div>
                </div>
            ),
        },
        {
            title: "Campaign",
            key: "campaign",
            width: 220,
            render: (_, row) => row.campaignName
                ? <Text className="text-sm">{row.campaignName}</Text>
                : <Text type="secondary" className="text-xs italic">No campaign</Text>,
        },
        {
            title: "Leads",
            key: "leads",
            width: 120,
            render: (_, row) => (
                <div
                    className="cursor-pointer group"
                    onClick={() => navigate(buildLeadsUrl({ batch: row.batchName }))}
                >
                    <Text strong className="group-hover:text-violet-600 transition-colors">{row.leadCount}</Text>
                    <div className="flex gap-2 mt-0.5">
                        <Text className="text-xs text-green-600">{row.assignedCount} assigned</Text>
                        {row.unassignedCount > 0 && (
                            <Text className="text-xs text-orange-500">{row.unassignedCount} unassigned</Text>
                        )}
                    </div>
                </div>
            ),
        },
        {
            title: "Actions",
            key: "actions",
            width: 120,
            align: "right",
            render: (_, row) => (
                <Space>
                    <Tooltip title="View Leads">
                        <Button
                            type="text" size="small" icon={<FiEye />}
                            onClick={() => navigate(buildLeadsUrl({ batch: row.batchName }))}
                        />
                    </Tooltip>
                    <Tooltip title="Assign to Callers">
                        <Button
                            type="text" size="small" icon={<FiUsers />}
                            onClick={() => setAssignTarget(row.batchName)}
                        />
                    </Tooltip>
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
                    <Title level={3} style={{ marginBottom: 4 }}>Batch Names</Title>
                    <Text type="secondary">Form-based lead groups from Meta and other sources</Text>
                </div>
            </div>

            {/* Filters */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row">
                <Input.Search
                    placeholder="Search form names..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    allowClear
                    className="sm:max-w-md"
                    size="large"
                />
                <Select
                    value={sort}
                    onChange={(val) => { setSort(val); setPagination(p => ({ ...p, page: 1 })); }}
                    options={SORT_OPTIONS}
                    style={{ minWidth: 200 }}
                    size="large"
                />
            </div>

            {/* Table */}
            <Table
                columns={columns}
                dataSource={batches}
                rowKey="batchName"
                loading={loading}
                pagination={false}
                locale={{ emptyText: <Empty description="No batch names found. Leads with form names will appear here automatically." /> }}
                scroll={{ x: "max-content" }}
            />

            {/* Pagination */}
            {batches.length > 0 && (
                <div className="mt-4 flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-gray-200">
                    <Text type="secondary" className="text-sm">
                        Showing <Text strong>{((pagination.page - 1) * pagination.limit) + 1}</Text> to{" "}
                        <Text strong>{Math.min(pagination.page * pagination.limit, pagination.total)}</Text> of{" "}
                        <Text strong>{pagination.total}</Text> batches
                    </Text>
                    <Pagination
                        current={pagination.page}
                        total={pagination.total}
                        pageSize={pagination.limit}
                        onChange={(page) => setPagination(p => ({ ...p, page }))}
                        showSizeChanger={false}
                        size="small"
                    />
                </div>
            )}

            {/* Assign Modal */}
            <AssignModal
                open={!!assignTarget}
                batchName={assignTarget || ""}
                onClose={() => setAssignTarget(null)}
                onSuccess={() => { setAssignTarget(null); loadData(); }}
            />
        </div>
    );
}

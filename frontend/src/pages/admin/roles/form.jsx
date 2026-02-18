import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Card,
    Input,
    Button,
    Tree,
    message,
    Spin,
    Typography,
    Tag,
    Tooltip,
    Row,
    Col,
} from "antd";
import {
    SaveOutlined,
    ArrowLeftOutlined,
    SafetyCertificateOutlined,
    LockOutlined,
    InfoCircleOutlined,
    CheckOutlined,
    ClearOutlined,
} from "@ant-design/icons";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";
import { useAuth } from "../../../contexts/AuthContext";
import AccessDenied from "../../../components/AccessDenied";
import { getRole, getPermissions, createRole, updateRole } from "../../../utils/api";

const { Title, Text } = Typography;

/**
 * Convert the backend PERMISSION_TREE into Ant Design Tree data nodes.
 * Returns { treeData, allKeys } where allKeys is every leaf key.
 */
function buildTreeData(permTree) {
    const treeData = [];
    const allKeys = [];

    for (const [modKey, mod] of Object.entries(permTree)) {
        const modNode = {
            title: mod.label,
            key: `mod:${modKey}`,
            children: [],
        };

        for (const [screenKey, screen] of Object.entries(mod.children || {})) {
            const screenNode = {
                title: screen.label,
                key: `screen:${modKey}.${screenKey}`,
                children: [],
            };

            for (const perm of screen.permissions || []) {
                allKeys.push(perm.key);
                screenNode.children.push({
                    title: perm.label,
                    key: perm.key,
                    isLeaf: true,
                });
            }

            modNode.children.push(screenNode);
        }

        treeData.push(modNode);
    }

    return { treeData, allKeys };
}

export default function RoleFormPage() {
    const { hasPermission } = useAuth();
    const { id } = useParams();
    const isEdit = Boolean(id);
    const navigate = useNavigate();

    usePageTitle(isEdit ? "Edit Role" : "Create Role");

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [checkedKeys, setCheckedKeys] = useState([]);
    const [isSystem, setIsSystem] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [permTree, setPermTree] = useState(null);

    // Derived tree data
    const { treeData, allKeys } = useMemo(
        () => (permTree ? buildTreeData(permTree) : { treeData: [], allKeys: [] }),
        [permTree]
    );

    // Load permission tree (and apply defaults for new roles)
    useEffect(() => {
        (async () => {
            try {
                const res = await getPermissions();
                setPermTree(res?.data || {});
                // Pre-check default permissions when creating a new role
                if (!isEdit && res?.defaultPermissions?.length) {
                    setCheckedKeys(res.defaultPermissions);
                }
            } catch (err) {
                message.error("Failed to load permissions");
            }
        })();
    }, [isEdit]);

    // Load existing role data if editing
    useEffect(() => {
        if (!isEdit) return;
        (async () => {
            setLoading(true);
            try {
                const res = await getRole(id);
                const role = res?.data;
                if (role) {
                    setName(role.name || "");
                    setDescription(role.description || "");
                    setCheckedKeys(role.permissions || []);
                    setIsSystem(role.isSystem || false);
                }
            } catch (err) {
                message.error("Failed to load role");
            } finally {
                setLoading(false);
            }
        })();
    }, [id, isEdit]);

    const handleCheck = (checked) => {
        // `checked` can be an array or { checked, halfChecked } when checkStrictly is off
        const keys = Array.isArray(checked) ? checked : checked.checked || [];
        // Filter to only leaf keys (actual permissions, not synthetic parent keys)
        const leafKeys = keys.filter((k) => !k.startsWith("mod:") && !k.startsWith("screen:"));
        setCheckedKeys(leafKeys);
    };

    const handleSelectAll = () => setCheckedKeys([...allKeys]);
    const handleClearAll = () => setCheckedKeys([]);

    const handleSave = async () => {
        if (!name.trim()) {
            message.warning("Role name is required");
            return;
        }
        setSaving(true);
        try {
            const payload = {
                name: name.trim(),
                description: description.trim(),
                permissions: checkedKeys,
            };
            if (isEdit) {
                await updateRole(id, payload);
                message.success("Role updated");
            } else {
                await createRole(payload);
                message.success("Role created");
            }
            navigate("/master", { state: { tab: "roles" } });
        } catch (err) {
            message.error(err?.response?.data?.error || "Failed to save role");
        } finally {
            setSaving(false);
        }
    };

    const requiredPerm = isEdit ? "roles.roles.edit" : "roles.roles.create";
    if (!hasPermission(requiredPerm)) return <AccessDenied />;

    if (loading) {
        return (
            <div className="flex justify-center items-center p-16">
                <Spin size="large" />
            </div>
        );
    }

    // For the tree, we need to include parent keys that are fully/partially checked
    // Ant Design's Tree handles this automatically when checkStrictly is false
    // We just pass the leaf keys as checkedKeys
    const systemAdminDisabled = isSystem && name.toLowerCase() === "admin";

    const permissionCount = checkedKeys.length;
    const totalPermissions = allKeys.length;
    const permPercent = totalPermissions > 0 ? Math.round((permissionCount / totalPermissions) * 100) : 0;

    return (
        <div className="p-6 md:p-10 mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate("/master", { state: { tab: "roles" } })}
                        className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                        <ArrowLeftOutlined className="text-gray-500" />
                    </button>
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                        <SafetyCertificateOutlined className="text-violet-600" style={{ fontSize: 22 }} />
                    </div>
                    <div>
                        <Title level={3} style={{ margin: 0, fontWeight: 700 }}>
                            {isEdit ? "Edit Role" : "Create New Role"}
                        </Title>
                        <Text type="secondary" className="text-sm">
                            {isEdit
                                ? "Modify role details and manage permissions"
                                : "Define a new role with specific access permissions"}
                        </Text>
                    </div>
                </div>
                <div className="flex items-center gap-3 ml-14 md:ml-0">
                    <Button
                        size="large"
                        onClick={() => navigate("/master", { state: { tab: "roles" } })}
                        className="px-6"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={saving}
                        onClick={handleSave}
                        disabled={systemAdminDisabled && isEdit}
                        size="large"
                        className="px-6"
                        style={{ backgroundColor: '#7d3bd6', borderColor: '#7d3bd6' }}
                    >
                        {isEdit ? "Save Changes" : "Create Role"}
                    </Button>
                </div>
            </div>

            {/* System role banner */}
            {systemAdminDisabled && (
                <div className="flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <LockOutlined className="text-amber-600" style={{ fontSize: 18 }} />
                    </div>
                    <div>
                        <Text strong className="text-amber-800 text-sm block">System Protected Role</Text>
                        <Text className="text-amber-600 text-xs">
                            The Admin system role always has all permissions and cannot be modified.
                        </Text>
                    </div>
                </div>
            )}

            {/* Role Details Card */}
            <Card
                bordered={false}
                className="shadow-sm rounded-2xl"
                styles={{ body: { padding: '28px 32px', marginBottom: '30px' } }}
            >
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <InfoCircleOutlined className="text-blue-500" style={{ fontSize: 16 }} />
                    </div>
                    <Text strong className="text-gray-800 text-base">Role Details</Text>
                    {isSystem && (
                        <Tag color="purple" icon={<LockOutlined />} className="ml-auto">System</Tag>
                    )}
                </div>

                <Row gutter={24}>
                    <Col xs={24} md={12}>
                        <div className="mb-2">
                            <label className="block text-sm font-medium text-gray-500 mb-2">
                                Role Name <span className="text-red-500">*</span>
                            </label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                maxLength={50}
                                placeholder="e.g. Senior Caller"
                                disabled={isSystem}
                                size="large"
                                className="rounded-lg"
                            />
                            <Text type="secondary" className="text-xs mt-1 block">
                                Unique name to identify this role
                            </Text>
                        </div>
                    </Col>
                    <Col xs={24} md={12}>
                        <div className="mb-2">
                            <label className="block text-sm font-medium text-gray-500 mb-2">
                                Description
                            </label>
                            <Input.TextArea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                maxLength={200}
                                placeholder="Brief description of what this role can do..."
                                size="large"
                                className="rounded-lg"
                                autoSize={{ minRows: 2, maxRows: 3 }}
                            />
                            <Text type="secondary" className="text-xs mt-1 block">
                                Optional description for team reference
                            </Text>
                        </div>
                    </Col>
                </Row>
            </Card>

            {/* Permissions Card */}
            <Card
                bordered={false}
                className="shadow-sm rounded-2xl"
                styles={{ body: { padding: '28px 32px' } }}
            >
                {/* Permissions Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                            <SafetyCertificateOutlined className="text-violet-500" style={{ fontSize: 16 }} />
                        </div>
                        <div>
                            <Text strong className="text-gray-800 text-base">Permissions</Text>
                            <Text type="secondary" className="text-xs block">
                                Control what users with this role can access
                            </Text>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Tooltip title="Select all permissions">
                            <Button
                                icon={<CheckOutlined />}
                                onClick={handleSelectAll}
                                disabled={systemAdminDisabled}
                                className="rounded-lg"
                            >
                                Select All
                            </Button>
                        </Tooltip>
                        <Tooltip title="Clear all permissions">
                            <Button
                                icon={<ClearOutlined />}
                                onClick={handleClearAll}
                                disabled={systemAdminDisabled}
                                danger
                                className="rounded-lg"
                            >
                                Clear All
                            </Button>
                        </Tooltip>
                    </div>
                </div>

                {/* Permission Stats Bar */}
                <div className="bg-gray-50 rounded-xl px-5 py-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-6">
                        <div>
                            <Text type="secondary" className="text-xs block">Selected</Text>
                            <Text strong className="text-lg text-violet-600">{permissionCount}</Text>
                        </div>
                        <div className="w-px h-8 bg-gray-200" />
                        <div>
                            <Text type="secondary" className="text-xs block">Total Available</Text>
                            <Text strong className="text-lg">{totalPermissions}</Text>
                        </div>
                        <div className="w-px h-8 bg-gray-200" />
                        <div>
                            <Text type="secondary" className="text-xs block">Coverage</Text>
                            <Text strong className="text-lg" style={{ color: permPercent === 100 ? '#52c41a' : '#7d3bd6' }}>
                                {permPercent}%
                            </Text>
                        </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full md:w-48">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="h-2 rounded-full transition-all duration-500"
                                style={{
                                    width: `${permPercent}%`,
                                    backgroundColor: permPercent === 100 ? '#52c41a' : '#7d3bd6',
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Tree */}
                {treeData.length > 0 ? (
                    <div
                        className="border border-gray-100 rounded-xl p-5"
                        style={{ maxHeight: 520, overflow: "auto" }}
                    >
                        <Tree
                            checkable
                            selectable={false}
                            defaultExpandAll
                            checkedKeys={systemAdminDisabled ? allKeys : checkedKeys}
                            onCheck={systemAdminDisabled ? undefined : handleCheck}
                            treeData={treeData}
                            disabled={systemAdminDisabled}
                            className="role-permission-tree"
                        />
                    </div>
                ) : (
                    <div className="flex justify-center py-12">
                        <Spin size="large" />
                    </div>
                )}
            </Card>

            {/* Bottom Save Bar (sticky on mobile) */}
            <div className="flex justify-end gap-3 pb-4 md:hidden">
                <Button
                    size="large"
                    onClick={() => navigate("/master", { state: { tab: "roles" } })}
                    className="flex-1"
                >
                    Cancel
                </Button>
                <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={saving}
                    onClick={handleSave}
                    disabled={systemAdminDisabled && isEdit}
                    size="large"
                    className="flex-1"
                    style={{ backgroundColor: '#7d3bd6', borderColor: '#7d3bd6' }}
                >
                    {isEdit ? "Save Changes" : "Create Role"}
                </Button>
            </div>
        </div>
    );
}

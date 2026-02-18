// src/pages/admin/callers/page.jsx  —  Users Management
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Table,
  Input,
  Select,
  Button,
  Modal,
  Form,
  Tag,
  Space,
  Avatar,
  message,
  notification,
  Popconfirm,
  Card,
  Tooltip,
} from "antd";
import {
  SearchOutlined,
  UserAddOutlined,
  PhoneOutlined,
  MailOutlined,
  InfoCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  DashboardOutlined,
  UnorderedListOutlined,
  LockOutlined,
} from "@ant-design/icons";
import {
  getAllUsers,
  fetchAllLeads,
  createUser,
  updateUser,
  deleteUser,
  fetchLeadFields,
  updateLeadField,
  getRoles,
} from "../../../utils/api";
import { getRoleName } from "../../../utils/roleUtils";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";
import { useSocket } from "../../../contexts/SocketProvider";
import { useAuth } from "../../../contexts/AuthContext";
import Loader from "../../../components/Loader";
import AccessDenied from "../../../components/AccessDenied";
import PermissionGate from "../../../components/PermissionGate";

// Helpers
const avatarFor = (user) =>
  user?.avatar ||
  user?.photo ||
  (user?.email
    ? `https://api.dicebear.com/7.x/initials/svg?radius=50&seed=${encodeURIComponent(user.email)}`
    : `https://i.pravatar.cc/40?u=${encodeURIComponent(user?.name || "user")}`);

const getField = (fd = [], name) =>
  fd.find((f) => (f?.name || "").toLowerCase() === String(name).toLowerCase())?.values?.[0] || "";

const summarizeSocketLead = (p = {}) => {
  const s = p.summary || {};
  const fd = p.fieldData || p.field_data || [];
  const name = s.name || getField(fd, "full_name") || getField(fd, "name") || "—";
  const id = p.lead_id || p.id || p._id || p.leadId || "";
  return { id, name };
};

const useEventDeduper = (windowMs = 8000) => {
  const seenRef = useRef(new Map());
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      for (const [k, v] of seenRef.current.entries()) if (now - v > windowMs) seenRef.current.delete(k);
    }, windowMs);
    return () => clearInterval(t);
  }, [windowMs]);
  return useCallback((key) => {
    const k = String(key || "");
    const exists = seenRef.current.has(k);
    seenRef.current.set(k, Date.now());
    return exists;
  }, []);
};

const useSoftLeadRefresh = (setter) => {
  const lastRef = useRef(0);
  const inflightRef = useRef(false);
  return useCallback(async () => {
    const now = Date.now();
    if (inflightRef.current || now - lastRef.current < 1200) return;
    inflightRef.current = true;
    try {
      const all = await fetchAllLeads();
      setter(all.leads || []);
      lastRef.current = Date.now();
    } finally {
      inflightRef.current = false;
    }
  }, [setter]);
};

// Role color mapping
const ROLE_COLORS = {
  admin: "purple",
  caller: "blue",
  superadmin: "red",
  owner: "gold",
};

export default function UsersPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [roles, setRoles] = useState([]);
  usePageTitle("Users", "");

  // UI State
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState("leadsDesc");
  const [roleFilter, setRoleFilter] = useState("all");

  // CRUD State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedUser, setSelectedUser] = useState(null);
  const [form] = Form.useForm();
  const [submitLoading, setSubmitLoading] = useState(false);
  const [stateOptions, setStateOptions] = useState([]);
  const [stateFieldId, setStateFieldId] = useState(null);
  const [newStateName, setNewStateName] = useState("");
  const [isAddingState, setIsAddingState] = useState(false);

  // socket
  const { socket, isConnected } = useSocket();
  const dedupe = useEventDeduper(8000);
  const softRefreshLeads = useSoftLeadRefresh(setLeads);

  // Load Data
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [usersRes, leadsRes, fieldsRes, rolesRes] = await Promise.all([
          getAllUsers(),
          fetchAllLeads(),
          fetchLeadFields(),
          getRoles().catch(() => ({ data: [] })),
        ]);
        if (!mounted) return;
        setUsers(usersRes);
        setLeads(leadsRes?.leads || []);
        setRoles(rolesRes?.data || []);

        const sField = fieldsRes?.data?.find(f => f.fieldName === "states");
        if (sField) {
          setStateOptions(sField.options || []);
          setStateFieldId(sField._id);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  /* -------- Compute Rows -------- */
  const rows = useMemo(() => {
    const leadMap = new Map();
    for (const ld of leads) {
      const cid = ld.assignedTo;
      if (!cid) continue;
      if (!leadMap.has(cid)) leadMap.set(cid, { count: 0, uncontacted: 0 });
      const item = leadMap.get(cid);
      item.count += 1;
      if ((ld.callCount ?? 0) === 0) item.uncontacted += 1;
    }

    let arr = users.map((u) => {
      const rn = getRoleName(u.role);
      const stats = leadMap.get(u.id) || { count: 0, uncontacted: 0 };
      return {
        id: u.id,
        name: u.name || "—",
        email: u.email || "—",
        phone: u.phone || "—",
        state: u.state || [],
        avatar: avatarFor(u),
        roleName: rn,
        roleObj: u.role,
        leads: stats.count,
        uncontacted: stats.uncontacted,
      };
    });

    // Role filter
    if (roleFilter !== "all") {
      arr = arr.filter((r) => r.roleName === roleFilter);
    }

    // Search
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      arr = arr.filter(
        (r) =>
          r.name.toLowerCase().includes(s) ||
          r.email.toLowerCase().includes(s) ||
          String(r.phone).toLowerCase().includes(s) ||
          r.roleName.includes(s)
      );
    }

    // Sort
    arr.sort((a, b) => {
      if (sortBy === "nameAsc") return a.name.localeCompare(b.name);
      if (sortBy === "roleAsc") return a.roleName.localeCompare(b.roleName);
      if (sortBy === "uncontactedDesc") return b.uncontacted - a.uncontacted;
      return b.leads - a.leads;
    });

    return arr;
  }, [users, leads, q, sortBy, roleFilter]);

  /* -------- Handlers -------- */
  const handleCreate = () => {
    setModalMode("create");
    setSelectedUser(null);
    form.resetFields();
    // Default to first non-admin role, or first role
    const defaultRole = roles.find((r) => r.name.toLowerCase() !== "admin") || roles[0];
    if (defaultRole) form.setFieldsValue({ role: defaultRole._id });
    setModalOpen(true);
  };

  const handleEdit = (user) => {
    setModalMode("edit");
    setSelectedUser(user);
    const roleId = user.roleObj && typeof user.roleObj === "object" ? user.roleObj._id : user.roleObj;
    form.setFieldsValue({
      name: user.name,
      email: user.email,
      phone: user.phone,
      state: user.state || [],
      role: roleId,
    });
    setModalOpen(true);
  };

  const handleDelete = async (user) => {
    try {
      await deleteUser(user.id);
      setUsers((prev) => prev.filter((c) => c.id !== user.id));
      message.success("User deleted");
    } catch (err) {
      message.error("Failed to delete user");
    }
  };

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitLoading(true);

      if (modalMode === "create") {
        const newUser = await createUser(values);
        setUsers((prev) => [newUser, ...prev]);
        message.success(`${newUser.name} added successfully`);
      } else {
        const payload = { ...values };
        if (!payload.password) delete payload.password;
        const updated = await updateUser(selectedUser.id, payload);
        setUsers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        message.success("Changes saved successfully");
      }
      setModalOpen(false);
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || "Operation failed";
      message.error(msg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleAddStateOption = async () => {
    if (!newStateName.trim() || !stateFieldId) return;
    try {
      setIsAddingState(true);
      const updatedOptions = [...stateOptions, newStateName.trim()];
      const res = await updateLeadField(stateFieldId, { options: updatedOptions });
      if (res.success) {
        setStateOptions(updatedOptions);
        setNewStateName("");
        message.success(`State "${newStateName}" added`);
      }
    } catch (err) {
      message.error("Failed to add state");
    } finally {
      setIsAddingState(false);
    }
  };

  /* -------- Socket Notifications -------- */
  const notify = useCallback(
    (title, description, icon = <InfoCircleOutlined />) => {
      notification.open({
        message: title,
        description,
        icon: React.cloneElement(icon, { style: { color: "#7d3bd6" } }),
        placement: "bottomRight",
      });
    },
    []
  );

  useEffect(() => {
    if (!socket || !isConnected) return;
    const onLeadIntake = (p) => {
      const s = summarizeSocketLead(p);
      if (dedupe(`users:lead:intake:${s.id}`)) return;
      notify("New web lead", `${s.name} submitted through the website.`, <UserAddOutlined />);
      softRefreshLeads();
    };
    const onLeadCreated = (p) => {
      const s = summarizeSocketLead(p);
      if (dedupe(`users:lead:created:${s.id}`)) return;
      notify("New lead created", `${s.name} has been added.`, <UserAddOutlined />);
      softRefreshLeads();
    };
    socket.on?.("lead:intake", onLeadIntake);
    socket.on?.("lead:created", onLeadCreated);
    return () => {
      socket.off?.("lead:intake", onLeadIntake);
      socket.off?.("lead:created", onLeadCreated);
    };
  }, [socket, isConnected, notify, dedupe, softRefreshLeads]);

  // Unique role names for filter dropdown
  const roleFilterOptions = useMemo(() => {
    const names = [...new Set(users.map((u) => getRoleName(u.role)).filter(Boolean))];
    return [
      { value: "all", label: "All Roles" },
      ...names.map((n) => ({ value: n, label: n.charAt(0).toUpperCase() + n.slice(1) })),
    ];
  }, [users]);

  /* -------- Columns -------- */
  const columns = [
    {
      title: "User",
      key: "name",
      render: (_, r) => {
        const content = (
          <>
            <Avatar src={r.avatar} size={40}>
              {r.name?.[0]?.toUpperCase()}
            </Avatar>
            <div>
              <div className="font-medium text-[#3b0d66] group-hover:underline">{r.name}</div>
              <Tag
                color={ROLE_COLORS[r.roleName] || "default"}
                className="text-[10px] mt-0.5"
                style={{ lineHeight: "16px" }}
              >
                {r.roleName.charAt(0).toUpperCase() + r.roleName.slice(1)}
              </Tag>
            </div>
          </>
        );
        return (
          <PermissionGate
            permission="callers.callerDetail.view"
            fallback={<div className="flex items-center gap-3">{content}</div>}
          >
            <Link to={`/callers/${encodeURIComponent(r.id)}`} className="flex items-center gap-3 group">
              {content}
            </Link>
          </PermissionGate>
        );
      },
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "Contact Info",
      key: "contact",
      render: (_, r) => (
        <div className="text-xs space-y-1">
          <div className="flex items-center gap-2"><MailOutlined className="text-gray-400" /> {r.email}</div>
          <div className="flex items-center gap-2"><PhoneOutlined className="text-gray-400" /> {r.phone}</div>
        </div>
      ),
    },
    {
      title: "Assigned States",
      key: "location",
      render: (_, r) => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {r.state && r.state.length > 0 ? (
            r.state.map((s) => (
              <Tag key={s} className="m-0 text-[10px] px-1 bg-gray-50 border-gray-200">{s}</Tag>
            ))
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </div>
      ),
    },
    {
      title: "Performance",
      key: "leads",
      sorter: (a, b) => b.leads - a.leads,
      render: (_, r) => (
        <div className="flex gap-2">
          <Tag color="purple">{r.leads} Leads</Tag>
          {r.uncontacted > 0 && <Tag color="red">{r.uncontacted} New</Tag>}
        </div>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, r) => (
        <Space>
          <PermissionGate permission="callers.callerDetail.view">
            <Tooltip title="View Dashboard">
              <Button
                type="text"
                icon={<DashboardOutlined />}
                onClick={() => navigate(`/callers/${encodeURIComponent(r.id)}`)}
              />
            </Tooltip>
          </PermissionGate>
          <PermissionGate permission="callers.callers.edit">
            <Tooltip title="Edit">
              <Button
                type="text"
                icon={<EditOutlined style={{ color: "#1677ff" }} />}
                onClick={() => handleEdit(r)}
              />
            </Tooltip>
          </PermissionGate>
          <Tooltip title="View Leads">
            <Button
              type="text"
              icon={<UnorderedListOutlined />}
              onClick={() => navigate(`/leads?callerId=${encodeURIComponent(r.id)}`)}
            />
          </Tooltip>
          <PermissionGate permission="callers.callers.delete">
            <Popconfirm
              title="Delete User"
              description="Are you sure? This cannot be undone."
              onConfirm={() => handleDelete(r)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </PermissionGate>
        </Space>
      ),
    },
  ];

  if (!hasPermission("callers.callers.view") && !hasPermission("callers.team.view")) return <AccessDenied />;
  if (loading) return <Loader fullScreen text="Loading users..." />;

  return (
    <div className="p-6 space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <Space size="middle" wrap>
          <Input.Search
            placeholder="Search name, email, phone..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ width: 280 }}
            allowClear
          />
          <Select
            value={roleFilter}
            onChange={setRoleFilter}
            style={{ width: 160 }}
            options={roleFilterOptions}
          />
          <Select
            value={sortBy}
            onChange={setSortBy}
            style={{ width: 180 }}
            options={[
              { value: "leadsDesc", label: "Most Leads First" },
              { value: "nameAsc", label: "Name (A-Z)" },
              { value: "roleAsc", label: "Role (A-Z)" },
              { value: "uncontactedDesc", label: "Most Uncontacted" },
            ]}
          />
        </Space>

        <PermissionGate permission="callers.callers.create">
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={handleCreate}
            size="large"
          >
            Create User
          </Button>
        </PermissionGate>
      </div>

      {/* Table */}
      <Card bodyStyle={{ padding: 0 }} bordered={false} className="shadow-sm overflow-hidden rounded-xl">
        <Table
          columns={columns}
          dataSource={rows}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={modalMode === "create" ? "Create New User" : "Edit User"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleModalSubmit}
        confirmLoading={submitLoading}
        okText={modalMode === "create" ? "Create" : "Save Changes"}
      >
        <Form form={form} layout="vertical" className="pt-4">
          <Form.Item
            name="name"
            label="Full Name"
            rules={[{ required: true, message: "Please enter a name" }]}
          >
            <Input placeholder="e.g. John Doe" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email Address"
            rules={[
              { required: true, message: "Please enter an email" },
              { type: "email", message: "Invalid email" },
            ]}
          >
            <Input placeholder="john@example.com" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="phone"
              label="Phone Number"
              rules={[{ required: true, message: "Please enter phone number" }]}
            >
              <Input placeholder="+91 9876543210" />
            </Form.Item>

            <Form.Item
              name="role"
              label="Role"
              rules={[{ required: true, message: "Please select a role" }]}
            >
              <Select
                placeholder="Select role"
                options={roles.map((r) => ({
                  value: r._id,
                  label: (
                    <span className="flex items-center gap-2">
                      {r.name}
                      {r.isSystem && <LockOutlined className="text-gray-400 text-[10px]" />}
                    </span>
                  ),
                }))}
              />
            </Form.Item>
          </div>

          <Form.Item
            name="state"
            label="Assigned States"
            extra="Leads from these states will be visible to this user"
          >
            <Select
              mode="multiple"
              placeholder="Select states"
              options={stateOptions.map((s) => ({ label: s, value: s }))}
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <div className="p-2 border-t flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add new state"
                        value={newStateName}
                        onChange={(e) => setNewStateName(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                      <Button
                        type="primary"
                        onClick={handleAddStateOption}
                        loading={isAddingState}
                        disabled={!newStateName.trim()}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </>
              )}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={modalMode === "create" ? "Password" : "New Password (Optional)"}
            rules={
              modalMode === "create"
                ? [{ required: true, message: "Password is required" }, { min: 6 }]
                : [{ min: 6 }]
            }
            extra={modalMode === "edit" ? "Leave blank to keep current password" : ""}
          >
            <Input.Password placeholder="******" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

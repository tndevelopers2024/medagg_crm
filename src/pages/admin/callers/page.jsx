// src/pages/Callers.jsx
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
  App,
  Avatar,
  message,
  notification,
  Popconfirm,
  Badge,
  Card,
  Tooltip,
} from "antd";
import {
  SearchOutlined,
  UserAddOutlined,
  BellOutlined,
  PhoneOutlined,
  MailOutlined,
  InfoCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  DashboardOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { getAllUsers, fetchAllLeads, createUser, updateUser, deleteUser } from "../../../utils/api";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";
import { useSocket } from "../../../contexts/SocketProvider";
import Loader from "../../../components/Loader";

// Helpers
const avatarFor = (user) =>
  user?.avatar ||
  user?.photo ||
  (user?.email
    ? `https://api.dicebear.com/7.x/initials/svg?radius=50&seed=${encodeURIComponent(user.email)}`
    : `https://i.pravatar.cc/40?u=${encodeURIComponent(user?.name || "user")}`);

/* -------- socket helpers -------- */
const getField = (fd = [], name) =>
  fd.find((f) => (f?.name || "").toLowerCase() === String(name).toLowerCase())?.values?.[0] || "";

const summarizeSocketLead = (p = {}) => {
  const s = p.summary || {};
  const fd = p.fieldData || p.field_data || [];

  const name =
    s.name || getField(fd, "full_name") || getField(fd, "name") || getField(fd, "lead_name") || "—";
  const phone =
    s.phone || getField(fd, "phone_number") || getField(fd, "phone") || getField(fd, "mobile") || "—";
  const email = s.email || getField(fd, "email") || getField(fd, "email_address") || "—";
  const source = s.source || getField(fd, "source") || getField(fd, "page_name") || "Website";
  const message =
    s.concern ||
    s.message ||
    getField(fd, "concern") ||
    getField(fd, "message") ||
    getField(fd, "comments") ||
    getField(fd, "notes") ||
    "—";

  const createdRaw =
    p.created_time || p.createdTime || p.createdAt || p.created_at || Date.now();
  const createdTime = createdRaw ? new Date(createdRaw) : new Date();

  const id = p.lead_id || p.id || p._id || p.leadId || "";
  return { id, name, phone, email, source, message, createdTime };
};

/* -------- socket dedupe -------- */
const useEventDeduper = (windowMs = 8000) => {
  const seenRef = useRef(new Map());
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      for (const [k, v] of seenRef.current.entries()) if (now - v > windowMs) seenRef.current.delete(k);
    }, windowMs);
    return () => clearInterval(t);
  }, [windowMs]);

  const seen = useCallback((key) => {
    const k = String(key || "");
    const now = Date.now();
    const exists = seenRef.current.has(k);
    seenRef.current.set(k, now);
    return exists;
  }, []);

  return seen;
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

export default function Callers() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [callers, setCallers] = useState([]);
  const [leads, setLeads] = useState([]);
  usePageTitle("Callers List", "");

  // UI State
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState("leadsDesc");

  // CRUD State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" | "edit"
  const [selectedCaller, setSelectedCaller] = useState(null);
  const [form] = Form.useForm();
  const [submitLoading, setSubmitLoading] = useState(false);

  // socket
  const { socket, isConnected } = useSocket();
  const dedupe = useEventDeduper(8000);
  const softRefreshLeads = useSoftLeadRefresh(setLeads);

  // Load Data
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [usersRes, leadsRes] = await Promise.all([getAllUsers({ role: "caller" }), fetchAllLeads()]);
        if (!mounted) return;
        setCallers(usersRes);
        setLeads(leadsRes?.leads || []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /* -------- Compute Rows -------- */
  const rows = useMemo(() => {
    const map = new Map();
    callers.forEach((c) =>
      map.set(c.id, {
        id: c.id,
        name: c.name || "—",
        email: c.email || "—",
        phone: c.phone || "—",
        city: c.city || "",
        state: c.state || "",
        avatar: avatarFor(c),
        leads: 0,
        uncontacted: 0,
        lastUpdate: null,
      })
    );

    for (const ld of leads) {
      const cid = ld.assignedTo;
      if (!cid || !map.has(cid)) continue;
      const item = map.get(cid);
      item.leads += 1;
      if ((ld.callCount ?? 0) === 0) item.uncontacted += 1;
      const last =
        (ld.lastCallAt && new Date(ld.lastCallAt)) ||
        (ld.updatedAt && new Date(ld.updatedAt)) ||
        (ld.createdAt && new Date(ld.createdAt)) ||
        (ld.createdTime && new Date(ld.createdTime));
      if (last && (!item.lastUpdate || last > item.lastUpdate)) item.lastUpdate = last;
    }

    let arr = Array.from(map.values());

    // Filter
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      arr = arr.filter(
        (r) =>
          r.name.toLowerCase().includes(s) ||
          r.email.toLowerCase().includes(s) ||
          String(r.phone).toLowerCase().includes(s)
      );
    }

    // Sort
    arr.sort((a, b) => {
      if (sortBy === "nameAsc") return a.name.localeCompare(b.name);
      if (sortBy === "uncontactedDesc") return b.uncontacted - a.uncontacted;
      if (sortBy === "updatedDesc")
        return (b.lastUpdate?.getTime() || 0) - (a.lastUpdate?.getTime() || 0);
      return b.leads - a.leads; // leadsDesc default
    });

    return arr;
  }, [callers, leads, q, sortBy]);

  /* -------- Handlers -------- */
  const handleCreate = () => {
    setModalMode("create");
    setSelectedCaller(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (caller) => {
    setModalMode("edit");
    setSelectedCaller(caller);
    form.setFieldsValue({
      name: caller.name,
      email: caller.email,
      phone: caller.phone,
      city: caller.city,
      state: caller.state,
    });
    setModalOpen(true);
  };

  const handleDelete = async (caller) => {
    try {
      await deleteUser(caller.id);
      setCallers((prev) => prev.filter((c) => c.id !== caller.id));
      message.success("Caller deleted");
    } catch (err) {
      console.error(err);
      message.error("Failed to delete caller");
    }
  };

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitLoading(true);

      if (modalMode === "create") {
        const payload = { ...values, role: "caller" };
        const newCaller = await createUser(payload);
        setCallers((prev) => [newCaller, ...prev]);
        message.success(`${newCaller.name} added successfully`);
      } else {
        const payload = { ...values };
        if (!payload.password) delete payload.password;
        const updated = await updateUser(selectedCaller.id, payload);
        setCallers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        message.success("Changes saved successfully");
      }
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.error || err.message || "Operation failed";
      message.error(msg);
    } finally {
      setSubmitLoading(false);
    }
  };


  /* -------- Socket Notifications -------- */
  const notify = useCallback(
    (title, description, icon = <InfoCircleOutlined />) => {
      notification.open({
        message: title,
        description,
        icon: React.cloneElement(icon, { style: { color: '#7d3bd6' } }),
        placement: "bottomRight",
      });
    },
    []
  );

  useEffect(() => {
    if (!socket || !isConnected) return;

    const onLeadIntake = (p) => {
      const s = summarizeSocketLead(p);
      if (dedupe(`callers:lead:intake:${s.id}`)) return;
      notify("New web lead", `${s.name} submitted through the website.`, <UserAddOutlined />);
      softRefreshLeads();
    };

    const onLeadCreated = (p) => {
      const s = summarizeSocketLead(p);
      if (dedupe(`callers:lead:created:${s.id}`)) return;
      notify("New lead created", `${s.name} has been added.`, <UserAddOutlined />);
      softRefreshLeads();
    };

    // ... (other listeners can be simplified or omitted for brevity if redundant, keeping key ones)

    socket.on?.("lead:intake", onLeadIntake);
    socket.on?.("lead:created", onLeadCreated);

    return () => {
      socket.off?.("lead:intake", onLeadIntake);
      socket.off?.("lead:created", onLeadCreated);
    };
  }, [socket, isConnected, notify, dedupe, softRefreshLeads]);


  /* -------- Columns -------- */
  const columns = [
    {
      title: "Caller",
      key: "name",
      render: (_, r) => (
        <Link to={`/admin/callers/${encodeURIComponent(r.id)}`} className="flex items-center gap-3 group">
          <Avatar src={r.avatar} size={40}>
            {r.name?.[0]?.toUpperCase()}
          </Avatar>
          <div>
            <div className="font-medium text-[#3b0d66] group-hover:underline">{r.name}</div>
            <div className="text-xs text-gray-500">Caller</div>
          </div>
        </Link>
      ),
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
      title: "Location",
      key: "location",
      render: (_, r) => (
        <div className="text-xs text-gray-600">
          {r.city || r.state ? [r.city, r.state].filter(Boolean).join(", ") : "—"}
        </div>
      )
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
          <Tooltip title="View Dashboard">
            <Button
              type="text"
              icon={<DashboardOutlined />}
              onClick={() => navigate(`/admin/callers/${encodeURIComponent(r.id)}`)}
            />
          </Tooltip>
          <Tooltip title="Edit Details">
            <Button
              type="text"
              icon={<EditOutlined style={{ color: '#1677ff' }} />}
              onClick={() => handleEdit(r)}
            />
          </Tooltip>
          <Tooltip title="View Leads">
            <Button
              type="text"
              icon={<UnorderedListOutlined />}
              onClick={() => navigate(`/admin/leads?callerId=${encodeURIComponent(r.id)}`)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete Caller"
            description="Are you sure? This cannot be undone."
            onConfirm={() => handleDelete(r)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (loading) return <Loader fullScreen text="Loading callers..." />;

  return (
    <div className="p-6 space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <Space size="middle">
          <Input.Search
            placeholder="Search name, email, phone..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
          <Select
            value={sortBy}
            onChange={setSortBy}
            style={{ width: 200 }}
            options={[
              { value: "leadsDesc", label: "Most Leads First" },
              { value: "nameAsc", label: "Name (A-Z)" },
              { value: "uncontactedDesc", label: "Most Uncontacted" },
              { value: "updatedDesc", label: "Recently Active" },
            ]}
          />
        </Space>

        <Button
          type="primary"
          icon={<UserAddOutlined />}
          onClick={handleCreate}
          size="large"
          style={{ backgroundColor: '#7d3bd6' }}
        >
          Create Caller
        </Button>
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

      {/* Modal */}
      <Modal
        title={modalMode === "create" ? "Create New Caller" : "Edit Caller Details"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleModalSubmit}
        confirmLoading={submitLoading}
        okText={modalMode === "create" ? "Create" : "Save Changes"}
        className="rounded-xl"
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
              { type: 'email', message: "Invalid email" }
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
            <Form.Item name="city" label="City">
              <Input placeholder="e.g. Chennai" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="state" label="State" rules={[{ required: true, message: "Required" }]}>
              <Input placeholder="e.g. Tamil Nadu" />
            </Form.Item>
          </div>

          <Form.Item
            name="password"
            label={modalMode === "create" ? "Password" : "New Password (Optional)"}
            rules={modalMode === 'create' ? [{ required: true, message: "Password is required" }, { min: 6 }] : [{ min: 6 }]}
            extra={modalMode === 'edit' ? "Leave blank to keep current password" : ""}
          >
            <Input.Password placeholder="******" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

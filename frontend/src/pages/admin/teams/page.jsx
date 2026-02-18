import React, { useState, useEffect } from "react";
import {
    Table,
    Button,
    Modal,
    Form,
    Input,
    Select,
    message,
    Popconfirm,
    Tag,
    Tooltip,
} from "antd";
import {
    EditOutlined,
    DeleteOutlined,
    PlusOutlined,
    TeamOutlined,
} from "@ant-design/icons";
import {
    getAllTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    getAllUsers,
} from "../../../utils/api";
import { useTopbarTitle } from "../../../contexts/TopbarTitleContext";

const { Option } = Select;

export default function TeamsPage() {
    const { setSubtitle } = useTopbarTitle();
    const [teams, setTeams] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingTeam, setEditingTeam] = useState(null);
    const [form] = Form.useForm();

    useEffect(() => {
        setSubtitle("Manage Teams");
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [teamsData, usersData] = await Promise.all([
                getAllTeams(),
                getAllUsers(),
            ]);
            setTeams(teamsData.data || []);
            setUsers(usersData || []);
        } catch (err) {
            console.error(err);
            message.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingTeam(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingTeam(record);
        form.setFieldsValue({
            name: record.name,
            description: record.description,
            managers: record.managers.map((u) => u._id || u.id),
            members: record.members.map((u) => u._id || u.id),
        });
        setModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await deleteTeam(id);
            message.success("Team deleted");
            fetchData();
        } catch (err) {
            message.error(err.response?.data?.error || "Failed to delete team");
        }
    };

    const handleSubmit = async (values) => {
        try {
            if (editingTeam) {
                await updateTeam(editingTeam._id || editingTeam.id, values);
                message.success("Team updated");
            } else {
                await createTeam(values);
                message.success("Team created");
            }
            setModalVisible(false);
            fetchData();
        } catch (err) {
            message.error(err.response?.data?.error || "Operation failed");
        }
    };

    // Filter potential managers (exclude Callers)
    const managerCandidates = users.filter(
        (u) => (u.role?.name || "").toLowerCase() !== "caller"
    );

    // Format options
    const userOptions = (list) =>
        list.map((u) => (
            <Option key={u.id} value={u.id}>
                {u.name} <span className="text-gray-400 text-xs">({u.role?.name})</span>
            </Option>
        ));

    const columns = [
        {
            title: "Name",
            dataIndex: "name",
            key: "name",
            render: (text) => <span className="font-semibold">{text}</span>,
        },
        {
            title: "Description",
            dataIndex: "description",
            key: "description",
            ellipsis: true,
        },
        {
            title: "Managers",
            dataIndex: "managers",
            key: "managers",
            render: (list) => (
                <div className="flex flex-wrap gap-1">
                    {list && list.length > 0 ? (
                        list.map((u) => (
                            <Tag key={u._id || u.id} color="blue">
                                {u.name}
                            </Tag>
                        ))
                    ) : (
                        <span className="text-gray-400">-</span>
                    )}
                </div>
            ),
        },
        {
            title: "Members",
            dataIndex: "members",
            key: "members",
            render: (list) => (
                <div className="flex flex-wrap gap-1">
                    {list && list.length > 0 ? (
                        list.map((u) => (
                            <Tag key={u._id || u.id}>
                                {u.name}
                            </Tag>
                        ))
                    ) : (
                        <span className="text-gray-400">-</span>
                    )}
                </div>
            ),
        },
        {
            title: "Actions",
            key: "actions",
            width: 120,
            render: (_, record) => (
                <div className="flex gap-2">
                    <Tooltip title="Edit">
                        <Button
                            icon={<EditOutlined />}
                            size="small"
                            onClick={() => handleEdit(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Are you sure?"
                        onConfirm={() => handleDelete(record._id || record.id)}
                    >
                        <Tooltip title="Delete">
                            <Button icon={<DeleteOutlined />} size="small" danger />
                        </Tooltip>
                    </Popconfirm>
                </div>
            ),
        },
    ];

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Teams</h1>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                    Create Team
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={teams}
                rowKey={(r) => r._id || r.id}
                loading={loading}
                pagination={{ pageSize: 10 }}
            />

            <Modal
                title={editingTeam ? "Edit Team" : "Create Team"}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={form.submit}
                destroyOnClose
                width={600}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item
                        name="name"
                        label="Team Name"
                        rules={[{ required: true, message: "Please enter a name" }]}
                    >
                        <Input placeholder="e.g. Sales Team Alpha" />
                    </Form.Item>

                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={2} placeholder="Optional description" />
                    </Form.Item>

                    <Form.Item
                        name="managers"
                        label="Managers"
                        tooltip="Users who can view team analytics (Callers excluded)"
                    >
                        <Select
                            mode="multiple"
                            placeholder="Select managers"
                            filterOption={(input, option) =>
                                option.children[0].toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {userOptions(managerCandidates)}
                        </Select>
                    </Form.Item>

                    <Form.Item name="members" label="Members">
                        <Select
                            mode="multiple"
                            placeholder="Select team members"
                            filterOption={(input, option) =>
                                option.children[0].toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {userOptions(users)}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

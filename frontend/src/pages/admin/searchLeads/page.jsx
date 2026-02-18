import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    Input, Card, Select, Rate, Tag, Timeline, Empty, Button, Space, Spin, Avatar,
    Typography, Descriptions, Tooltip, message, Divider, Modal, DatePicker, TimePicker
} from "antd";
import dayjs from "dayjs";
import {
    FiPhone, FiMapPin, FiCalendar, FiClock,
    FiUser, FiChevronRight, FiCopy, FiActivity,
    FiBell, FiPhoneCall
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";
import { useAuth } from "../../../contexts/AuthContext";
import AccessDenied from "../../../components/AccessDenied";
import {
    fetchAllLeads, fetchAssignedLeads, fetchLeadStages,
    updateLeadStatus, fetchLeadActivities, updateLeadDetails,
    requestMobileCall, createAlarm, deferLeadToNextDay
} from "../../../utils/api";
import WhatsAppModal from "../../caller/leadManagement/components/WhatsAppModal";
import AlarmModal from "../../../components/AlarmModal";

const { Text, Title } = Typography;

// --- Helpers ---
const renderField = (lead, keys) => {
    if (!Array.isArray(keys)) keys = [keys];
    for (const key of keys) {
        const field = lead.fieldData?.find(f => f.name.toLowerCase().replace(/\s+/g, '_') === key.toLowerCase());
        if (field?.values?.[0]) return field.values[0];
    }
    return "";
};

const getLeadName = (lead) => {
    return lead.name || renderField(lead, ['full_name', 'name', 'customer_name']) || "Unknown";
};

const getLeadPhone = (lead) => {
    return lead.phone || renderField(lead, ['phone_number', 'phone', 'mobile', 'contact']) || "—";
};

const getLeadEmail = (lead) => {
    return lead.email || renderField(lead, ['email', 'email_address', 'mail']) || "";
};

const formatStatus = (s) => {
    if (!s) return "";
    return String(s).replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
};

// Date helpers for defer/call-later
const pad2 = (n) => String(n).padStart(2, "0");
const toYMD = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const tomorrowYMD = () => toYMD(new Date(Date.now() + 24 * 60 * 60 * 1000));

// --- Sub-components ---

const LeadListItem = ({ lead, active, onClick }) => {
    const name = getLeadName(lead);
    const status = lead.status || "new";

    return (
        <div
            onClick={() => onClick(lead)}
            className={`cursor-pointer border-b border-gray-100 p-4 transition-colors hover:bg-gray-50 ${active ? 'bg-violet-50/60' : ''}`}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Avatar
                        size={40}
                        style={{ backgroundColor: active ? '#3b0d66' : '#374151', fontWeight: 700 }}
                    >
                        {name.charAt(0).toUpperCase()}
                    </Avatar>
                    <div>
                        <Text strong>{name}</Text>
                        <div>
                            <Text type="secondary" className="text-xs">
                                Phone: <Text className="text-xs" strong>{getLeadPhone(lead)}</Text>
                            </Text>
                        </div>
                    </div>
                </div>
                <Space size={4}>
                    <Tag color="purple" style={{ fontSize: 10, margin: 0 }}>
                        {status.substring(0, 2).toUpperCase()}
                    </Tag>
                    <FiChevronRight className="text-gray-400" />
                </Space>
            </div>
        </div>
    );
};

export default function SearchLeadsPage() {
    usePageTitle("Search Leads");
    const { user, isCaller, hasPermission } = useAuth();

    const [query, setQuery] = useState("");
    const [leads, setLeads] = useState([]);
    const [selectedLead, setSelectedLead] = useState(null);
    const [loading, setLoading] = useState(false);
    const [leadStages, setLeadStages] = useState([]);
    const [changingStatus, setChangingStatus] = useState(false);

    const [activities, setActivities] = useState([]);
    const [activitiesLoading, setActivitiesLoading] = useState(false);

    // Action modals state
    const [whatsAppOpen, setWhatsAppOpen] = useState(false);
    const [alarmOpen, setAlarmOpen] = useState(false);
    const [deferOpen, setDeferOpen] = useState(false);
    const [laterDate, setLaterDate] = useState(tomorrowYMD());
    const [laterTime, setLaterTime] = useState("10:00");
    const [deferring, setDeferring] = useState(false);
    const [requestingCall, setRequestingCall] = useState(false);

    // Load stages
    useEffect(() => {
        const loadStages = async () => {
            try {
                const res = await fetchLeadStages({ active: "true" });
                if (res.success) setLeadStages(res.data);
            } catch (err) {
                console.error("Error loading stages:", err);
            }
        };
        loadStages();
    }, []);

    // Load Activities when lead selected
    useEffect(() => {
        if (!selectedLead?.id && !selectedLead?._id) {
            setActivities([]);
            return;
        }
        const loadActs = async () => {
            setActivitiesLoading(true);
            try {
                const id = selectedLead.id || selectedLead._id;
                const res = await fetchLeadActivities(id);
                setActivities(res.activities || []);
            } catch (err) {
                console.error("Failed to load activities", err);
            } finally {
                setActivitiesLoading(false);
            }
        };
        loadActs();
    }, [selectedLead]);

    // Debounced Search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLeadsData(query);
        }, 500);
        return () => clearTimeout(timer);
    }, [query, isCaller]);

    const fetchLeadsData = async (q) => {
        setLoading(true);
        try {
            // Requirement update: All users can search all leads, but details are restricted.
            // We use fetchAllLeads for everyone now (consistent broad search).
            const params = { limit: 50 };
            if (q) params.q = q;
            const res = await fetchAllLeads(params);
            setLeads(res.leads || []);
        } catch (err) {
            console.error(err);
            message.error("Search failed");
        } finally {
            setLoading(false);
        }
    };

    // Permission logic for "View Details"
    const canViewFullDetails = (lead) => {
        if (!user) return false;
        if (user.role?.name === 'Admin' || user.isSystemAdmin) return true;

        // Use flag from backend if present
        if (lead.canViewDetails !== undefined) return lead.canViewDetails;

        const assignedId = lead.assignedTo?.id || lead.assignedTo?._id || lead.assignedTo;
        const myId = user.id || user._id;

        if (assignedId && String(assignedId) === String(myId)) return true;

        // Managers of a team searching for their members' leads
        // Note: frontend might not have full team info here easily without another API call or context,
        // but 'assignedTo' being 'me' is the primary check. 
        // For simplicity and immediate request: check admin vs self.
        return false;
    };

    const handleStageChange = async (newStage) => {
        if (!selectedLead) return;
        setChangingStatus(true);
        try {
            await updateLeadStatus(selectedLead.id || selectedLead._id, { status: newStage });
            message.success("Stage updated successfully");
            setSelectedLead({ ...selectedLead, status: newStage });
            setLeads(leads.map(l =>
                (l.id || l._id) === (selectedLead.id || selectedLead._id)
                    ? { ...l, status: newStage }
                    : l
            ));
        } catch (err) {
            message.error("Failed to update stage");
        } finally {
            setChangingStatus(false);
        }
    };

    const handleRating = async (val) => {
        if (!selectedLead) return;
        const id = selectedLead.id || selectedLead._id;
        const currentFieldData = selectedLead.fieldData || [];

        const updatedFieldData = currentFieldData.filter(f => f.name !== "rating");
        updatedFieldData.push({ name: "rating", values: [String(val)] });

        setSelectedLead({ ...selectedLead, fieldData: updatedFieldData });

        try {
            const updates = { rating: String(val) };
            await updateLeadDetails(id, { fieldDataUpdates: updates });
            message.success(`Rated ${val} stars`);
        } catch (err) {
            console.error(err);
            message.error("Failed to save rating");
        }
    };

    // --- Action handlers ---
    const leadId = selectedLead?.id || selectedLead?._id;

    const handleRequestCall = async () => {
        if (!selectedLead) return;
        const phone = getLeadPhone(selectedLead);
        if (!phone || phone === "—") {
            message.warning("No phone number available");
            return;
        }
        setRequestingCall(true);
        try {
            await requestMobileCall(leadId, phone);
            message.success("Call request sent");
        } catch (err) {
            message.error("Failed to request call");
        } finally {
            setRequestingCall(false);
        }
    };

    const handleSetAlarm = async (alarmLeadId, alarmTime, notes) => {
        await createAlarm(alarmLeadId, alarmTime, notes);
    };

    const handleDeferSave = async () => {
        if (!laterDate) {
            message.warning("Please select a date");
            return;
        }
        setDeferring(true);
        try {
            await deferLeadToNextDay(leadId, {
                followUpDate: laterDate,
                followUpTime: laterTime || "10:00",
            });
            message.success("Follow-up scheduled");
            setSelectedLead({ ...selectedLead, followUpAt: `${laterDate}T${laterTime || "10:00"}:00` });
            setDeferOpen(false);
        } catch (err) {
            message.error("Failed to schedule follow-up");
        } finally {
            setDeferring(false);
        }
    };

    const currentRating = parseInt(renderField(selectedLead || {}, "rating") || "0", 10);

    // Build leadData map for WhatsApp template interpolation
    const leadDataMap = selectedLead ? (() => {
        const map = {
            name: getLeadName(selectedLead),
            phone: getLeadPhone(selectedLead),
            email: getLeadEmail(selectedLead),
            source: selectedLead.source || "",
        };
        (selectedLead.fieldData || []).forEach(f => {
            const key = (f.name || "").toLowerCase().replace(/\s+/g, "_");
            if (f.values?.[0]) map[key] = f.values[0];
        });
        return map;
    })() : {};

    // Quick pick dates for defer modal
    const deferQuickPicks = [
        { label: "Tomorrow", date: tomorrowYMD() },
        { label: "In 3 Days", date: toYMD(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)) },
        { label: "Next Week", date: toYMD(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) },
    ];

    if (!hasPermission("leads.search.view")) return <AccessDenied />;

    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col md:flex-row overflow-hidden bg-white">
            {/* LEFT SIDEBAR: Search & List */}
            <div className="w-full flex-shrink-0 border-r border-gray-200 bg-white md:w-96 flex flex-col">
                <div className="p-4 border-b border-gray-100">
                    <Text type="secondary" strong className="text-sm mb-3 block">Search leads</Text>
                    <Input.Search
                        placeholder="Search by name, phone, email..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        allowClear
                        onSearch={(val) => setQuery(val)}
                    />

                    <div className="mt-3">
                        <Text type="secondary" className="text-xs">
                            {loading ? "Searching..." : <>{leads.length} matching leads for <Text strong className="text-xs">{query || "all"}</Text></>}
                        </Text>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading && leads.length === 0 ? (
                        <div className="flex justify-center py-12">
                            <Spin />
                        </div>
                    ) : leads.length > 0 ? (
                        leads.map(lead => (
                            <LeadListItem
                                key={lead.id || lead._id}
                                lead={lead}
                                active={(selectedLead?.id || selectedLead?._id) === (lead.id || lead._id)}
                                onClick={setSelectedLead}
                            />
                        ))
                    ) : (
                        <div className="p-8">
                            <Empty description="No leads found" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT MAIN: Lead Details */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-8">
                {selectedLead ? (
                    <Card className="mx-auto max-w-4xl" styles={{ body: { padding: 0 } }}>
                        {/* Header */}
                        <div className="flex items-start justify-between border-b border-gray-100 p-6">
                            <div>
                                <Title level={4} style={{ marginBottom: 8 }}>{getLeadName(selectedLead)}</Title>
                                <Space size={12} wrap>
                                    <Select
                                        value={selectedLead.status || "new"}
                                        onChange={handleStageChange}
                                        loading={changingStatus}
                                        disabled={changingStatus}
                                        size="small"
                                        style={{ minWidth: 140 }}
                                        options={leadStages.map(stage => ({
                                            value: stage.stageName,
                                            label: formatStatus(stage.displayLabel || stage.stageName),
                                        }))}
                                    />
                                    <Rate
                                        value={currentRating}
                                        onChange={handleRating}
                                        style={{ fontSize: 16 }}
                                    />
                                </Space>
                            </div>
                            <Space>
                                {canViewFullDetails(selectedLead) && (
                                    <Link to={`/leads/${selectedLead.id || selectedLead._id || selectedLead.leadId}`}>
                                        <Button size="small">
                                            View Details <FiChevronRight />
                                        </Button>
                                    </Link>
                                )}
                                <Tooltip title="Copy lead ID">
                                    <Button
                                        type="text"
                                        icon={<FiCopy />}
                                        onClick={() => {
                                            navigator.clipboard.writeText(selectedLead.id || selectedLead._id || "");
                                            message.success("Lead ID copied");
                                        }}
                                    />
                                </Tooltip>
                            </Space>
                        </div>

                        {/* Action Buttons */}
                        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50">
                            <Space size={8} wrap>
                                <Button
                                    icon={<FiPhoneCall />}
                                    onClick={handleRequestCall}
                                    loading={requestingCall}
                                >
                                    Request Call
                                </Button>
                                <Button
                                    icon={<FaWhatsapp />}
                                    onClick={() => setWhatsAppOpen(true)}
                                    style={{ color: "#16a34a", borderColor: "#16a34a" }}
                                >
                                    WhatsApp
                                </Button>
                                <Button
                                    icon={<FiBell />}
                                    onClick={() => setAlarmOpen(true)}
                                >
                                    Set Alarm
                                </Button>
                                <Button
                                    icon={<FiCalendar />}
                                    onClick={() => {
                                        setLaterDate(tomorrowYMD());
                                        setLaterTime("10:00");
                                        setDeferOpen(true);
                                    }}
                                >
                                    Call Later
                                </Button>
                            </Space>
                        </div>

                        {/* Details Grid */}
                        <div className="p-6">
                            <Descriptions column={{ xs: 1, md: 2 }} size="small" colon={false}>
                                <Descriptions.Item label={<Space size={4}><FiPhone className="text-gray-400" /> Phone</Space>}>
                                    <Space>
                                        <Text>{getLeadPhone(selectedLead)}</Text>
                                        <Tooltip title="Copy phone">
                                            <Button
                                                type="text"
                                                size="small"
                                                icon={<FiCopy size={12} />}
                                                onClick={() => {
                                                    navigator.clipboard.writeText(getLeadPhone(selectedLead));
                                                    message.success("Copied!");
                                                }}
                                            />
                                        </Tooltip>
                                    </Space>
                                </Descriptions.Item>
                                <Descriptions.Item label={<Space size={4}><FiMapPin className="text-gray-400" /> Lead Source</Space>}>
                                    {selectedLead.source || renderField(selectedLead, "source") || "—"}
                                </Descriptions.Item>
                                <Descriptions.Item label={<Space size={4}><FiUser className="text-gray-400" /> Department</Space>}>
                                    {renderField(selectedLead, "department") || "—"}
                                </Descriptions.Item>
                                <Descriptions.Item label={<Space size={4}><FiUser className="text-gray-400" /> Assigned To</Space>}>
                                    {selectedLead.assignedTo?.name || selectedLead.assignedTo?.email || "Unassigned"}
                                </Descriptions.Item>
                                <Descriptions.Item label={<Space size={4}><FiActivity className="text-gray-400" /> Procedure</Space>}>
                                    {renderField(selectedLead, "procedure") || "—"}
                                </Descriptions.Item>
                                <Descriptions.Item label={<Space size={4}><FiCalendar className="text-gray-400" /> Call Later Date</Space>}>
                                    {selectedLead.followUpAt ? new Date(selectedLead.followUpAt).toLocaleDateString() : "—"}
                                </Descriptions.Item>
                                <Descriptions.Item label={<Space size={4}><FiMapPin className="text-gray-400" /> Location</Space>}>
                                    {renderField(selectedLead, "location") || "—"}
                                </Descriptions.Item>
                            </Descriptions>
                        </div>

                        {/* Activity History */}
                        <div className="border-t border-gray-100">
                            <div className="px-6 pt-4 pb-2">
                                <Text strong style={{ color: "#3b0d66" }}>Activity History</Text>
                            </div>
                            <Divider style={{ margin: 0 }} />
                            <div className="p-6 max-h-96 overflow-y-auto">
                                {activitiesLoading ? (
                                    <div className="flex justify-center py-8">
                                        <Spin size="small" />
                                    </div>
                                ) : activities.length > 0 ? (
                                    <Timeline
                                        items={activities.map(act => {
                                            const date = new Date(act.createdAt || Date.now());
                                            return {
                                                key: act._id || act.id,
                                                children: (
                                                    <div>
                                                        <Text className="text-sm">
                                                            <Text strong>
                                                                {act.action === "lead_update" ? "Updated" : act.action.replace(/_/g, " ")}:
                                                            </Text>{" "}
                                                            {act.description}
                                                        </Text>
                                                        <div className="mt-1">
                                                            <Text type="secondary" className="text-xs">
                                                                <FiClock size={10} className="inline mr-1" />
                                                                {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                {" • "}
                                                                {act.actor?.name || "System"}
                                                            </Text>
                                                        </div>
                                                    </div>
                                                ),
                                            };
                                        })}
                                    />
                                ) : (
                                    <Empty
                                        description="No history available for this lead yet"
                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    />
                                )}
                            </div>
                        </div>
                    </Card>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                        <Empty
                            description={
                                <div>
                                    <Title level={5} style={{ marginBottom: 4 }}>Select a lead to view details</Title>
                                    <Text type="secondary">Use the search bar on the left to find leads.</Text>
                                </div>
                            }
                        />
                    </div>
                )}
            </div>

            {/* --- Action Modals --- */}
            {selectedLead && (
                <>
                    <WhatsAppModal
                        open={whatsAppOpen}
                        onClose={() => setWhatsAppOpen(false)}
                        phoneNumber={getLeadPhone(selectedLead)}
                        leadName={getLeadName(selectedLead)}
                        leadData={leadDataMap}
                    />

                    <AlarmModal
                        open={alarmOpen}
                        onClose={() => setAlarmOpen(false)}
                        onSetAlarm={handleSetAlarm}
                        leadId={leadId}
                    />

                    {/* Call Later / Defer Modal */}
                    <Modal
                        open={deferOpen}
                        onCancel={() => setDeferOpen(false)}
                        title="Schedule Follow-up"
                        footer={[
                            <Button key="cancel" onClick={() => setDeferOpen(false)}>Cancel</Button>,
                            <Button key="save" type="primary" loading={deferring} onClick={handleDeferSave}>Save</Button>,
                        ]}
                        destroyOnClose
                    >
                        <p className="text-sm text-gray-600 mb-4">
                            Pick a <span className="font-medium">date</span> and <span className="font-medium">time</span>.
                        </p>

                        <div className="flex items-center gap-2 mb-4">
                            {deferQuickPicks.map(qp => (
                                <Button
                                    key={qp.label}
                                    type={laterDate === qp.date ? "primary" : "default"}
                                    size="small"
                                    ghost={laterDate === qp.date}
                                    onClick={() => setLaterDate(qp.date)}
                                >
                                    {qp.label}
                                </Button>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs text-gray-600 block">Date</label>
                                <DatePicker
                                    value={laterDate ? dayjs(laterDate, "YYYY-MM-DD") : null}
                                    onChange={(d) => setLaterDate(d ? d.format("YYYY-MM-DD") : "")}
                                    className="w-full"
                                    format="YYYY-MM-DD"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-600 block">Time</label>
                                <TimePicker
                                    value={laterTime ? dayjs(laterTime, "HH:mm") : null}
                                    onChange={(t) => setLaterTime(t ? t.format("HH:mm") : "")}
                                    className="w-full"
                                    format="HH:mm"
                                />
                            </div>
                        </div>
                    </Modal>
                </>
            )}
        </div>
    );
}

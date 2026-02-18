import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Steps, Upload, Button, Select, Input, Card, Statistic, Alert, Checkbox,
    Space, Typography, Empty, Spin, Tag, message
} from "antd";
import {
    FiUpload, FiCheck, FiAlertCircle, FiUser, FiLayers, FiDatabase,
    FiSmartphone, FiMail, FiCalendar, FiMapPin, FiType
} from "react-icons/fi";
import * as XLSX from "xlsx";
import {
    fetchCampaigns,
    fetchLeadFields,
    checkDuplicates,
    bulkImportLeads,
    getAllUsers,
    createCampaign,
} from "../../../../utils/api";
import { useAuth } from "../../../../contexts/AuthContext";
import AccessDenied from "../../../../components/AccessDenied";

const { Text, Title } = Typography;
const { Dragger } = Upload;

const STEPS = [
    { title: "Upload File", icon: <FiUpload /> },
    { title: "Map Columns", icon: <FiLayers /> },
    { title: "Check Duplicates", icon: <FiDatabase /> },
    { title: "Select Campaign", icon: <FiAlertCircle /> },
    { title: "Assign Callers", icon: <FiUser /> },
];

const ImportLeadsPage = () => {
    const { hasPermission } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();

    const [activeStep, setActiveStep] = useState(0); // Ant Steps is 0-indexed
    const [isLoading, setIsLoading] = useState(false);

    const [file, setFile] = useState(null);
    const [csvHeaders, setCsvHeaders] = useState([]);
    const [parsedRows, setParsedRows] = useState([]);
    const [originalRows, setOriginalRows] = useState([]);

    const [systemFields, setSystemFields] = useState([]);
    const [columnMapping, setColumnMapping] = useState({});

    const [duplicates, setDuplicates] = useState([]);
    const [duplicateStats, setDuplicateStats] = useState(null);

    const [campaigns, setCampaigns] = useState([]);
    const [selectedCampaignId, setSelectedCampaignId] = useState(id || "");
    const [newCampaignName, setNewCampaignName] = useState("");
    const [showNewCampaignInput, setShowNewCampaignInput] = useState(false);

    const [callers, setCallers] = useState([]);
    const [selectedCallerIds, setSelectedCallerIds] = useState([]);

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            const fieldRes = await fetchLeadFields();
            const campRes = await fetchCampaigns();
            const userRes = await getAllUsers({ role: "caller" });

            setSystemFields(fieldRes.data || []);
            setCampaigns(campRes.data || []);

            const allUsers = Array.isArray(userRes) ? userRes : (userRes.data || []);
            const getRName = (r) => r && typeof r === "object" ? (r.name || "").toLowerCase() : String(r || "").toLowerCase();
            const validCallers = allUsers.filter(u => {
                const rn = getRName(u.role);
                return ["caller", "admin", "sales_executive", "owner", "superadmin"].includes(rn);
            });
            setCallers(validCallers);

            if (id) setSelectedCampaignId(id);
        } catch (err) {
            console.error(err);
            message.error("Failed to load system data");
        }
    };

    // --- Step 1: Upload ---
    const handleFileUpload = (uploadedFile) => {
        setFile(uploadedFile);
        setIsLoading(true);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const wsName = wb.SheetNames[0];
                const ws = wb.Sheets[wsName];
                const data = XLSX.utils.sheet_to_json(ws, { defval: "" });

                if (data.length === 0) {
                    message.error("File is empty");
                    setFile(null);
                    setIsLoading(false);
                    return;
                }

                const headers = Object.keys(data[0]);
                setCsvHeaders(headers);
                setParsedRows(data);
                setOriginalRows(data);

                const initialMapping = {};
                headers.forEach(header => {
                    const lowerHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "");
                    if (lowerHeader.includes("name") || lowerHeader === "fullname") initialMapping[header] = "full_name";
                    if (lowerHeader.includes("phone") || lowerHeader.includes("mobile") || lowerHeader.includes("contact")) initialMapping[header] = "phone_number";
                    if (lowerHeader.includes("email")) initialMapping[header] = "email";
                    if (lowerHeader.includes("source")) initialMapping[header] = "lead_source";
                    if (lowerHeader.includes("city") || lowerHeader.includes("location") || lowerHeader.includes("address")) initialMapping[header] = "location";
                    if (lowerHeader.includes("state")) initialMapping[header] = "states";
                    if (lowerHeader.includes("department")) initialMapping[header] = "department";
                    if (lowerHeader.includes("procedure")) initialMapping[header] = "procedure";
                    if (lowerHeader.includes("date")) initialMapping[header] = "call_later_date";
                });
                setColumnMapping(initialMapping);

                message.success(`Parsed ${data.length} rows`);
                setIsLoading(false);
            } catch (err) {
                console.error(err);
                message.error("Failed to parse file");
                setFile(null);
                setIsLoading(false);
            }
        };
        reader.readAsBinaryString(uploadedFile);
        return false; // Prevent default upload behavior
    };

    // --- Step 2: Mapping ---
    const handleMappingChange = (header, systemField) => {
        setColumnMapping(prev => ({ ...prev, [header]: systemField }));
    };

    const getIconForField = (key) => {
        if (!key) return null;
        if (key === "phone_number" || key === "whatsapp_number") return <FiSmartphone />;
        if (key === "email") return <FiMail />;
        if (key.includes("date") || key.includes("time") || key.includes("created")) return <FiCalendar />;
        if (key === "location" || key === "states" || key === "city") return <FiMapPin />;
        return <FiType />;
    };

    // --- Step 3: Duplicates ---
    const handleCheckDuplicates = async () => {
        setIsLoading(true);
        const mappedForCheck = parsedRows.map(row => {
            const phoneHeader = Object.keys(columnMapping).find(key => columnMapping[key] === "phone_number");
            const emailHeader = Object.keys(columnMapping).find(key => columnMapping[key] === "email");
            return {
                phone: phoneHeader ? String(row[phoneHeader]).replace(/\D/g, "") : null,
                email: emailHeader ? row[emailHeader] : null,
            };
        });

        try {
            const res = await checkDuplicates(mappedForCheck);
            if (res.success) {
                setDuplicates(res.duplicates || []);

                const duplicateValues = new Set(res.duplicates.map(d => d.value));
                let duplicateRowCount = 0;
                parsedRows.forEach(row => {
                    const phoneHeader = Object.keys(columnMapping).find(key => columnMapping[key] === "phone_number");
                    const emailHeader = Object.keys(columnMapping).find(key => columnMapping[key] === "email");
                    const phone = phoneHeader ? String(row[phoneHeader]).replace(/\D/g, "") : null;
                    const email = emailHeader ? row[emailHeader] : null;
                    if ((phone && duplicateValues.has(phone)) || (email && duplicateValues.has(email))) {
                        duplicateRowCount++;
                    }
                });

                setDuplicateStats({
                    totalRows: parsedRows.length,
                    duplicatesFound: duplicateRowCount,
                    uniqueLeads: parsedRows.length - duplicateRowCount
                });
                setActiveStep(2);
            }
        } catch (err) {
            message.error("Failed to check duplicates");
        } finally {
            setIsLoading(false);
        }
    };

    const removeDuplicates = () => {
        if (!duplicateStats) return;
        const duplicateValues = new Set(duplicates.map(d => d.value));
        const cleanRows = parsedRows.filter(row => {
            const phoneHeader = Object.keys(columnMapping).find(key => columnMapping[key] === "phone_number");
            const emailHeader = Object.keys(columnMapping).find(key => columnMapping[key] === "email");
            const phone = phoneHeader ? String(row[phoneHeader]).replace(/\D/g, "") : null;
            const email = emailHeader ? row[emailHeader] : null;
            if (phone && duplicateValues.has(phone)) return false;
            if (email && duplicateValues.has(email)) return false;
            return true;
        });

        if (cleanRows.length === 0) {
            message.success("Removed all duplicates. 0 unique leads remain.");
        } else {
            message.success(`Removed duplicates. ${cleanRows.length} unique leads remaining.`);
        }

        setParsedRows(cleanRows);
        setDuplicateStats({
            totalRows: cleanRows.length,
            duplicatesFound: 0,
            uniqueLeads: cleanRows.length
        });
    };

    const restoreOriginal = () => {
        if (originalRows.length > 0) {
            setParsedRows(originalRows);
            setDuplicateStats(null);
            message.success("Restored original list");
        }
    };

    const downloadDuplicates = () => {
        if (!duplicates || duplicates.length === 0) return;
        const duplicateValues = new Set(duplicates.map(d => d.value));
        const duplicateRows = parsedRows.filter(row => {
            const phoneHeader = Object.keys(columnMapping).find(key => columnMapping[key] === "phone_number");
            const phone = phoneHeader ? String(row[phoneHeader]).replace(/\D/g, "") : null;
            return phone && duplicateValues.has(phone);
        });

        const ws = XLSX.utils.json_to_sheet(duplicateRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Duplicates");
        XLSX.writeFile(wb, "duplicate_leads.csv");
    };

    // --- Step 4: Campaign ---
    const handleCampaignSelect = (val) => {
        if (val === "NEW") {
            setShowNewCampaignInput(true);
        } else {
            setShowNewCampaignInput(false);
            setSelectedCampaignId(val);
        }
    };

    const handleCreateCampaign = async () => {
        if (!newCampaignName) return;
        try {
            const res = await createCampaign({ name: newCampaignName, platform: "manual" });
            if (res.success) {
                setCampaigns([res.data, ...campaigns]);
                setSelectedCampaignId(res.data._id);
                setShowNewCampaignInput(false);
                setNewCampaignName("");
                message.success("Campaign created");
            }
        } catch (err) {
            message.error("Failed to create campaign");
        }
    };

    // --- Step 5: Assignment ---
    const toggleCaller = (callerId) => {
        setSelectedCallerIds(prev => {
            if (prev.includes(callerId)) return prev.filter(cid => cid !== callerId);
            return [...prev, callerId];
        });
    };

    const currentStepIsValid = () => {
        if (activeStep === 0) return file && parsedRows.length > 0;
        if (activeStep === 1) {
            const values = Object.values(columnMapping);
            return values.includes("phone_number");
        }
        if (activeStep === 2) return true;
        if (activeStep === 3) return !!selectedCampaignId;
        if (activeStep === 4) return true;
        return false;
    };

    const handleNext = () => {
        if (activeStep === 1) {
            handleCheckDuplicates();
            return;
        }
        setActiveStep(prev => Math.min(prev + 1, 4));
    };

    const handleBack = () => {
        setActiveStep(prev => Math.max(prev - 1, 0));
    };

    const handleFinalImport = async () => {
        setIsLoading(true);
        const leadsPayload = parsedRows.map(row => {
            const fieldData = [];
            Object.entries(columnMapping).forEach(([header, sysField]) => {
                if (sysField && sysField !== "custom" && row[header]) {
                    fieldData.push({ name: sysField, values: [String(row[header])] });
                }
            });
            return { fieldData };
        });

        const payload = {
            leads: leadsPayload,
            campaignId: selectedCampaignId,
            callers: selectedCallerIds
        };

        try {
            const res = await bulkImportLeads(payload);
            if (res.success) {
                message.success(res.message);
                setParsedRows([]);
                setFile(null);
                setActiveStep(0);
            }
        } catch (err) {
            console.error(err);
            message.error("Import failed: " + (err.response?.data?.error || err.message));
        } finally {
            setIsLoading(false);
        }
    };

    // Build system field options for the mapping Select
    const systemFieldOptions = [
        { value: "", label: "[ Select Field To Map ]" },
        ...systemFields.map(f => ({
            value: f.fieldName,
            label: `${f.displayLabel || f.fieldName}${f.isRequired ? " *" : ""}`,
        })),
    ];

    // Build campaign options for the Select
    const campaignOptions = [
        { value: "", label: "-- Select Campaign --" },
        ...campaigns.map(c => ({ value: c._id, label: c.name })),
        { value: "NEW", label: "+ Create New Campaign" },
    ];

    if (!hasPermission("campaigns.import.view")) return <AccessDenied />;

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-8">
                <Title level={3} style={{ marginBottom: 4 }}>Bulk Lead Import</Title>
                <Text type="secondary">Follow the steps to import valid leads into your system.</Text>
            </div>

            {/* Stepper */}
            <Steps
                current={activeStep}
                items={STEPS}
                className="mb-8"
            />

            {/* Content Area */}
            <Card className="min-h-[400px]">
                {/* Step 1: Upload */}
                {activeStep === 0 && (
                    <div className="py-6">
                        <Dragger
                            accept=".csv,.xlsx,.xls"
                            beforeUpload={handleFileUpload}
                            showUploadList={false}
                            disabled={isLoading}
                        >
                            <p className="ant-upload-drag-icon">
                                <FiUpload className="w-12 h-12 text-indigo-400 mx-auto" />
                            </p>
                            <p className="ant-upload-text">Click to upload or drag and drop</p>
                            <p className="ant-upload-hint">CSV or Excel files (max 10MB)</p>
                        </Dragger>

                        {file && (
                            <Alert
                                type="success"
                                showIcon
                                icon={<FiCheck />}
                                message={`${file.name} (${parsedRows.length} rows parsed)`}
                                className="mt-4"
                            />
                        )}
                    </div>
                )}

                {/* Step 2: Mapping */}
                {activeStep === 1 && (
                    <div className="max-w-4xl mx-auto">
                        <Text type="secondary" strong className="text-xs uppercase tracking-wider block mb-6">
                            Map Your Data
                        </Text>

                        <div className="grid grid-cols-2 gap-8 mb-4 px-1">
                            <Space className="font-bold text-green-700">
                                <FiLayers /> Excel Sheet Column
                            </Space>
                            <Space className="font-bold text-indigo-700">
                                <FiDatabase /> System Field
                            </Space>
                        </div>

                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 pb-10">
                            {csvHeaders.map((header) => {
                                const selectedKey = columnMapping[header] || "";

                                return (
                                    <div key={header} className="grid grid-cols-2 gap-8 items-center">
                                        <Card size="small" className="shadow-sm">
                                            <Text strong>{header}</Text>
                                        </Card>

                                        <Select
                                            value={selectedKey}
                                            onChange={(val) => handleMappingChange(header, val)}
                                            options={systemFieldOptions}
                                            className="w-full"
                                            size="large"
                                            suffixIcon={selectedKey ? getIconForField(selectedKey) : undefined}
                                            status={selectedKey ? "" : undefined}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Step 3: Duplicates */}
                {activeStep === 2 && (
                    <div className="text-center py-10">
                        {isLoading ? (
                            <Spin tip="Checking for duplicates..." size="large" />
                        ) : duplicateStats ? (
                            <div className="max-w-md mx-auto">
                                <Statistic
                                    title="Duplicate leads found in the database"
                                    value={duplicateStats.duplicatesFound}
                                    className="mb-8"
                                    valueStyle={{ fontSize: 48, fontWeight: 700 }}
                                />

                                <Card className="mb-8 text-left">
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <Text>Leads in List:</Text>
                                            <Text strong>{duplicateStats.totalRows}</Text>
                                        </div>
                                        <div className="flex justify-between text-red-600">
                                            <Text type="danger">Duplicates Found:</Text>
                                            <Text type="danger" strong>{duplicateStats.duplicatesFound}</Text>
                                        </div>
                                        <div className="flex justify-between border-t pt-2">
                                            <Text type="success">Unique Leads to Import:</Text>
                                            <Text type="success" strong>{duplicateStats.uniqueLeads}</Text>
                                        </div>
                                    </div>
                                </Card>

                                {duplicateStats.duplicatesFound > 0 ? (
                                    <div className="flex flex-col gap-4 items-center">
                                        <Space>
                                            <Button danger onClick={removeDuplicates}>
                                                Remove Duplicates
                                            </Button>
                                            <Button onClick={downloadDuplicates}>
                                                Download Duplicates
                                            </Button>
                                        </Space>
                                        <Button type="link" onClick={handleNext}>
                                            Proceed with duplicates (Not Recommended)
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-4">
                                        <Alert
                                            type="success"
                                            showIcon
                                            message="No duplicates found! You are good to go."
                                        />
                                        {parsedRows.length < originalRows.length && (
                                            <Button type="link" onClick={restoreOriginal}>
                                                Restore Original Data
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Spin tip="Analyzing..." />
                        )}
                    </div>
                )}

                {/* Step 4: Campaign */}
                {activeStep === 3 && (
                    <div className="max-w-xl mx-auto py-10">
                        <Title level={4} className="text-center mb-6">Select or Create Campaign</Title>

                        <div className="mb-6 space-y-2">
                            <label className="text-sm font-medium text-gray-700 block">Target Campaign</label>
                            <Select
                                value={selectedCampaignId || undefined}
                                onChange={handleCampaignSelect}
                                options={campaignOptions}
                                className="w-full"
                                size="large"
                                placeholder="-- Select Campaign --"
                                showSearch
                                optionFilterProp="label"
                            />
                        </div>

                        {showNewCampaignInput && (
                            <Card className="bg-indigo-50 border-indigo-100">
                                <label className="text-sm font-medium text-indigo-900 block mb-2">New Campaign Name</label>
                                <Space.Compact className="w-full">
                                    <Input
                                        placeholder="e.g., Summer Sale 2024"
                                        value={newCampaignName}
                                        onChange={(e) => setNewCampaignName(e.target.value)}
                                        size="large"
                                    />
                                    <Button type="primary" onClick={handleCreateCampaign} size="large">
                                        Create
                                    </Button>
                                </Space.Compact>
                            </Card>
                        )}
                    </div>
                )}

                {/* Step 5: Assignment */}
                {activeStep === 4 && (
                    <div>
                        <Title level={4} style={{ marginBottom: 4 }}>Assign Leads to Callers</Title>
                        <Text type="secondary" className="mb-6 block">
                            Selected leads will be distributed (Round Robin) among selected callers.
                        </Text>

                        <div className="flex items-center justify-between mb-4">
                            <Text strong>{selectedCallerIds.length} callers selected</Text>
                            <Space>
                                <Button type="link" size="small" onClick={() => setSelectedCallerIds(callers.map(u => u._id))}>
                                    Select All
                                </Button>
                                <Button type="link" size="small" danger onClick={() => setSelectedCallerIds([])}>
                                    Clear
                                </Button>
                            </Space>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto">
                            {callers.map(user => (
                                <Card
                                    key={user._id}
                                    size="small"
                                    hoverable
                                    onClick={() => toggleCaller(user._id)}
                                    className={selectedCallerIds.includes(user._id)
                                        ? "border-violet-500 bg-violet-50/50"
                                        : ""
                                    }
                                >
                                    <div className="flex items-center gap-3">
                                        <Checkbox checked={selectedCallerIds.includes(user._id)} />
                                        <div>
                                            <Text strong>{user.name}</Text>
                                            <div><Text type="secondary" className="text-xs">{user.email}</Text></div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        {selectedCallerIds.length === 0 && (
                            <Alert
                                type="warning"
                                showIcon
                                message="Leads will be unassigned if no caller is selected."
                                className="mt-6"
                            />
                        )}
                    </div>
                )}
            </Card>

            {/* Footer Controls */}
            <div className="flex justify-between items-center mt-8">
                <Button
                    disabled={activeStep === 0 || isLoading}
                    onClick={handleBack}
                    size="large"
                >
                    Back
                </Button>

                <Text type="secondary">Step {activeStep + 1} of 5</Text>

                <Button
                    type="primary"
                    size="large"
                    disabled={!currentStepIsValid() || isLoading}
                    loading={isLoading}
                    onClick={activeStep === 4 ? handleFinalImport : handleNext}
                >
                    {activeStep === 4 ? "Import Leads" : "Next Step"}
                </Button>
            </div>
        </div>
    );
};

export default ImportLeadsPage;

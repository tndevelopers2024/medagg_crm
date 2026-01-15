import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";
import {
    fetchCampaigns,
    fetchLeadFields,
    checkDuplicates,
    bulkImportLeads,
    getAllUsers, // Corrected from fetchUsers
    createCampaign,
} from "../../../../utils/api";
import { FiUpload, FiCheck, FiAlertCircle, FiUser, FiLayers, FiDatabase, FiChevronDown, FiType, FiSmartphone, FiMail, FiCalendar, FiMapPin } from "react-icons/fi";

const STEPS = [
    { id: 1, title: "Upload File", icon: <FiUpload /> },
    { id: 2, title: "Map Columns", icon: <FiLayers /> },
    { id: 3, title: "Check Duplicates", icon: <FiDatabase /> },
    { id: 4, title: "Select Campaign", icon: <FiAlertCircle /> },
    { id: 5, title: "Assign Callers", icon: <FiUser /> },
];

const ImportLeadsPage = () => {
    const { id } = useParams(); // Optional campaign ID from URL
    const navigate = useNavigate();

    // Global State
    const [activeStep, setActiveStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    // Data State
    const [file, setFile] = useState(null);
    const [csvHeaders, setCsvHeaders] = useState([]);
    const [parsedRows, setParsedRows] = useState([]); // Raw JSON from CSV

    const [systemFields, setSystemFields] = useState([]); // From API
    const [columnMapping, setColumnMapping] = useState({}); // { "csv_header": "system_field_name" }

    const [duplicates, setDuplicates] = useState([]); // Array of { type: 'phone', value: '...' }
    const [duplicateStats, setDuplicateStats] = useState(null); // { totalRows, duplicatesFound, uniqueLeads }

    const [campaigns, setCampaigns] = useState([]);
    const [selectedCampaignId, setSelectedCampaignId] = useState(id || "");
    const [newCampaignName, setNewCampaignName] = useState("");
    const [showNewCampaignInput, setShowNewCampaignInput] = useState(false);

    const [callers, setCallers] = useState([]);
    const [selectedCallerIds, setSelectedCallerIds] = useState([]);

    // Fetch initial data
    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            const fieldRes = await fetchLeadFields();
            const campRes = await fetchCampaigns();
            const userRes = await getAllUsers({ role: "caller" }); // Fetch callers

            setSystemFields(fieldRes.data || []);
            setCampaigns(campRes.data || []);

            // Filter for callers/admins who can take leads
            // getAllUsers likely returns the array directly based on other usage
            const allUsers = Array.isArray(userRes) ? userRes : (userRes.data || []);
            const validCallers = allUsers.filter(u =>
                u.role === "caller" || u.role === "admin" || u.role === "sales_executive" || u.role === "owner" || u.role === "superadmin"
            );
            setCallers(validCallers);

            // Auto-select "Imported Leads" campaign if exists, or current ID
            if (id) {
                setSelectedCampaignId(id);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to load system data");
        }
    };

    // --- Step 1: Upload ---
    const handleFileUpload = (e) => {
        const uploadedFile = e.target.files[0];
        if (!uploadedFile) return;

        setFile(uploadedFile);
        setIsLoading(true);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const wsName = wb.SheetNames[0];
                const ws = wb.Sheets[wsName];
                const data = XLSX.utils.sheet_to_json(ws, { defval: "" }); // Raw data

                if (data.length === 0) {
                    toast.error("File is empty");
                    setFile(null);
                    setIsLoading(false);
                    return;
                }

                // Get headers from first row
                const headers = Object.keys(data[0]);
                setCsvHeaders(headers);
                setParsedRows(data);

                // Auto-map columns
                const initialMapping = {};
                headers.forEach(header => {
                    const lowerHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "");
                    // Simple heuristics matching DB fieldNames
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

                toast.success(`Parsed ${data.length} rows`);
                setIsLoading(false);
            } catch (err) {
                console.error(err);
                toast.error("Failed to parse file");
                setFile(null);
                setIsLoading(false);
            }
        };
        reader.readAsBinaryString(uploadedFile);
    };

    // --- Step 2: Mapping ---
    const handleMappingChange = (header, systemField) => {
        setColumnMapping(prev => ({ ...prev, [header]: systemField }));
    };

    // --- Step 3: Duplicates ---
    const handleCheckDuplicates = async () => {
        setIsLoading(true);
        // Prepare minimal payload for check
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
                setDuplicates(res.duplicates || []); // Array of { type: 'phone', value: '...' }
                const uniqueDupes = new Set(res.duplicates.map(d => d.value));
                setDuplicateStats({
                    totalRows: parsedRows.length,
                    duplicatesFound: uniqueDupes.size,
                    uniqueLeads: parsedRows.length - uniqueDupes.size
                });
                setActiveStep(3);
            }
        } catch (err) {
            toast.error("Failed to check duplicates");
        } finally {
            setIsLoading(false);
        }
    };

    const removeDuplicates = () => {
        if (!duplicateStats) return;

        const duplicateValues = new Set(duplicates.map(d => d.value));

        // Filter parsedRows
        const cleanRows = parsedRows.filter(row => {
            const phoneHeader = Object.keys(columnMapping).find(key => columnMapping[key] === "phone_number");
            const emailHeader = Object.keys(columnMapping).find(key => columnMapping[key] === "email");

            const phone = phoneHeader ? String(row[phoneHeader]).replace(/\D/g, "") : null;
            const email = emailHeader ? row[emailHeader] : null;

            if (phone && duplicateValues.has(phone)) return false;
            if (email && duplicateValues.has(email)) return false;
            return true;
        });

        setParsedRows(cleanRows);
        setDuplicateStats({
            totalRows: cleanRows.length,
            duplicatesFound: 0,
            uniqueLeads: cleanRows.length
        });
        toast.success("Duplicates removed from list");
    };

    const downloadDuplicates = () => {
        // Create CSV of duplicates
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
    const handleCreateCampaign = async () => {
        if (!newCampaignName) return;
        try {
            const res = await createCampaign({ name: newCampaignName, platform: "manual" });
            if (res.success) {
                setCampaigns([res.data, ...campaigns]);
                setSelectedCampaignId(res.data._id);
                setShowNewCampaignInput(false);
                setNewCampaignName("");
                toast.success("Campaign created");
            }
        } catch (err) {
            toast.error("Failed to create campaign");
        }
    };

    // --- Step 5: Assignment ---
    const toggleCaller = (callerId) => {
        setSelectedCallerIds(prev => {
            if (prev.includes(callerId)) return prev.filter(id => id !== callerId);
            return [...prev, callerId];
        });
    };

    const currentStepIsValid = () => {
        if (activeStep === 1) return file && parsedRows.length > 0;
        if (activeStep === 2) {
            // Must map phone number at minimum
            const values = Object.values(columnMapping);
            return values.includes("phone_number");
        }
        if (activeStep === 3) return true; // Can skip duplicate check or proceed after it
        if (activeStep === 4) return !!selectedCampaignId;
        if (activeStep === 5) return true; // Can import without assignment (unassigned)
        return false;
    };


    const getIconForField = (key) => {
        if (!key) return null;
        // Phone is handled separately in render for the flag look, but fallback here
        if (key === "phone_number" || key === "whatsapp_number") return <FiSmartphone />;
        if (key === "email") return <FiMail />;
        if (key.includes("date") || key.includes("time") || key.includes("created")) return <FiCalendar />;
        if (key === "location" || key === "states" || key === "city") return <FiMapPin />;
        return <FiType />;
    };

    const handleNext = () => {
        if (activeStep === 2) {
            // Trigger duplicate check before moving to step 3 UI
            handleCheckDuplicates();
            return;
        }
        setActiveStep(prev => Math.min(prev + 1, 5));
    };

    const handleBack = () => {
        setActiveStep(prev => Math.max(prev - 1, 1));
    };

    const handleFinalImport = async () => {
        setIsLoading(true);

        // Transform rows to final payload
        const leadsPayload = parsedRows.map(row => {
            const fieldData = [];
            // Standard mappings
            Object.entries(columnMapping).forEach(([header, sysField]) => {
                if (sysField && sysField !== "custom" && row[header]) {
                    const val = String(row[header]);
                    // Store as fieldData
                    fieldData.push({ name: sysField, values: [val] });
                }
                // Handle custom fields if needed?? 
                // For simplicity, we just map known system fields.
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
                toast.success(res.message);
                // Redirect or Reset
                // navigate("/admin/leads"); 
                // Or show success screen/modal
                setParsedRows([]);
                setFile(null);
                setActiveStep(1);
            }
        } catch (err) {
            console.error(err);
            toast.error("Import failed: " + (err.response?.data?.error || err.message));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-2">Bulk Lead Import</h1>
                <p className="text-gray-500">Follow the steps to import valid leads into your system.</p>
            </div>

            {/* Stepper */}
            <div className="flex items-center justify-between mb-8 px-4">
                {STEPS.map((step, idx) => (
                    <div key={step.id} className="flex flex-col items-center relative z-10 w-full">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 mb-2 transition-colors
                ${activeStep >= step.id ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-gray-300 text-gray-400"}
             `}>
                            {activeStep > step.id ? <FiCheck /> : step.icon}
                        </div>
                        <span className={`text-sm font-medium ${activeStep >= step.id ? "text-indigo-600" : "text-gray-400"}`}>
                            {step.title}
                        </span>
                        {/* Connector Line */}
                        {idx < STEPS.length - 1 && (
                            <div className={`absolute top-5 left-[50%] w-full h-[2px] -z-10
                 ${activeStep > step.id ? "bg-indigo-600" : "bg-gray-200"}
               `} />
                        )}
                    </div>
                ))}
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 min-h-[400px]">
                {/* Step 1: Upload */}
                {activeStep === 1 && (
                    <div className="text-center py-10">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 hover:border-indigo-500 transition-colors bg-gray-50 cursor-pointer relative"
                            onClick={() => document.getElementById("fileInput").click()}>
                            <input type="file" id="fileInput" accept=".csv, .xlsx, .xls" className="hidden" onChange={handleFileUpload} />
                            <FiUpload className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
                            <p className="text-lg font-medium text-gray-700">Click to upload or drag and drop</p>
                            <p className="text-sm text-gray-500 mt-2">CSV or Excel files (max 10MB)</p>
                        </div>
                        {file && (
                            <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-lg inline-flex items-center gap-2">
                                <FiCheck /> {file.name} ({parsedRows.length} rows parsed)
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: Mapping */}
                {activeStep === 2 && (
                    <div className="max-w-4xl mx-auto">
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-6">MAP YOUR DATA</div>

                        <div className="grid grid-cols-2 gap-8 mb-4 px-1">
                            <div className="flex items-center gap-2 font-bold text-green-700">
                                <FiLayers /> Excel Sheet Column
                            </div>
                            <div className="flex items-center gap-2 font-bold text-indigo-700">
                                <FiDatabase /> System Field
                            </div>
                        </div>

                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 pb-10">
                            {csvHeaders.map((header) => {
                                const selectedKey = columnMapping[header] || "";

                                return (
                                    <div key={header} className="grid grid-cols-2 gap-8 items-center group">
                                        {/* Left: CSV Header */}
                                        <div className="w-full p-3 bg-white border border-gray-300 rounded text-gray-700 shadow-sm font-medium">
                                            {header}
                                        </div>

                                        {/* Right: System Field Select */}
                                        <div className="relative">
                                            {/* Icon Overlay */}
                                            <div className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-2 z-10
                                        ${selectedKey ? "text-indigo-600" : "text-gray-400"}
                                    `}>
                                                {selectedKey === "phone_number" ? (
                                                    <div className="flex items-center gap-2 bg-indigo-50 px-1 rounded">
                                                        <span className="text-lg leading-none">🇮🇳</span>
                                                        <span className="text-sm font-bold text-gray-700">+91</span>
                                                    </div>
                                                ) : (
                                                    selectedKey ? getIconForField(selectedKey) : null
                                                )}
                                            </div>

                                            <select
                                                className={`w-full p-3 border rounded shadow-sm appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer relative z-0
                                            ${selectedKey ? "bg-indigo-50 border-indigo-200 text-indigo-900 font-bold pl-12" : "text-gray-500 pl-3 border-gray-300 bg-gray-50 hover:bg-white"}
                                            ${selectedKey === "phone_number" ? "pl-20" : selectedKey ? "pl-10" : ""}
                                        `}
                                                value={selectedKey}
                                                onChange={(e) => handleMappingChange(header, e.target.value)}
                                            >
                                                <option value="" className="text-gray-500">[ Select Field To Map ]</option>
                                                {systemFields.map(f => (
                                                    <option key={f._id || f.fieldName} value={f.fieldName} className="text-gray-900">
                                                        {f.displayLabel || f.fieldName} {f.isRequired ? "*" : ""}
                                                    </option>
                                                ))}
                                            </select>

                                            {/* Select Arrow (Custom) */}
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                <FiChevronDown />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Step 3: Duplicates */}
                {activeStep === 3 && (
                    <div className="text-center py-10">
                        {isLoading ? (
                            <div>Checking for duplicates...</div>
                        ) : duplicateStats ? (
                            <div className="max-w-md mx-auto">
                                <div className="text-5xl font-bold text-gray-800 mb-2">{duplicateStats.duplicatesFound}</div>
                                <div className="text-gray-500 mb-8">Duplicate leads found in the database</div>

                                <div className="bg-gray-50 p-6 rounded-lg text-left space-y-3 mb-8">
                                    <div className="flex justify-between">
                                        <span>Total Rows in File:</span>
                                        <span className="font-bold">{duplicateStats.totalRows}</span>
                                    </div>
                                    <div className="flex justify-between text-red-600">
                                        <span>Duplicates Found:</span>
                                        <span className="font-bold">{duplicateStats.duplicatesFound}</span>
                                    </div>
                                    <div className="flex justify-between text-green-600 border-t pt-2">
                                        <span>Unique Leads to Import:</span>
                                        <span className="font-bold">{duplicateStats.uniqueLeads}</span>
                                    </div>
                                </div>

                                {duplicateStats.duplicatesFound > 0 ? (
                                    <div className="flex flex-col gap-4 items-center">
                                        <div className="flex gap-4">
                                            <button
                                                onClick={removeDuplicates}
                                                className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 font-medium"
                                            >
                                                Remove Duplicates
                                            </button>
                                            <button
                                                onClick={downloadDuplicates}
                                                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                                            >
                                                Download Duplicates
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => handleNext()} // Just proceed
                                            className="text-sm text-gray-500 underline decoration-dotted hover:text-gray-700"
                                        >
                                            Proceed with duplicates (Not Recommended)
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-green-600 font-medium  mb-4">
                                        <FiCheck className="inline mr-2" /> No duplicates found! You are good to go.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div>Analyzing...</div>
                        )}
                    </div>
                )}

                {/* Step 4: Campaign */}
                {activeStep === 4 && (
                    <div className="max-w-xl mx-auto py-10">
                        <h3 className="text-lg font-bold mb-6 text-center">Select or Create Campaign</h3>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Target Campaign</label>
                            <select
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                value={selectedCampaignId}
                                onChange={(e) => {
                                    if (e.target.value === "NEW") setShowNewCampaignInput(true);
                                    else {
                                        setShowNewCampaignInput(false);
                                        setSelectedCampaignId(e.target.value);
                                    }
                                }}
                            >
                                <option value="">-- Select Campaign --</option>
                                {campaigns.map(c => (
                                    <option key={c._id} value={c._id}>{c.name}</option>
                                ))}
                                <option value="NEW" className="font-bold text-indigo-600">+ Create New Campaign</option>
                            </select>
                        </div>

                        {showNewCampaignInput && (
                            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                                <label className="block text-sm font-medium text-indigo-900 mb-2">New Campaign Name</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className="flex-1 p-2 border rounded focus:outline-none focus:border-indigo-500"
                                        placeholder="e.g., Summer Sale 2024"
                                        value={newCampaignName}
                                        onChange={(e) => setNewCampaignName(e.target.value)}
                                    />
                                    <button
                                        onClick={handleCreateCampaign}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                    >
                                        Create
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 5: Assignment */}
                {activeStep === 5 && (
                    <div>
                        <h3 className="text-lg font-bold mb-4">Assign Leads to Callers</h3>
                        <p className="text-sm text-gray-500 mb-6">Selected leads will be distributed (Round Robin) among selected callers.</p>

                        <div className="flex items-center justify-between mb-4">
                            <span className="font-medium">{selectedCallerIds.length} callers selected</span>
                            <div className="space-x-2">
                                <button onClick={() => setSelectedCallerIds(callers.map(u => u._id))} className="text-sm text-indigo-600 hover:underline">Select All</button>
                                <button onClick={() => setSelectedCallerIds([])} className="text-sm text-gray-500 hover:underline">Clear</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto">
                            {callers.map(user => (
                                <div
                                    key={user._id}
                                    onClick={() => toggleCaller(user._id)}
                                    className={`p-3 rounded-lg border cursor-pointer flex items-center gap-3 transition-all
                                ${selectedCallerIds.includes(user._id) ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-indigo-300"}
                            `}
                                >
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center
                                 ${selectedCallerIds.includes(user._id) ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-400"}
                             `}>
                                        {selectedCallerIds.includes(user._id) && <FiCheck size={14} />}
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-800">{user.name}</div>
                                        <div className="text-xs text-gray-500 truncate">{user.email}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {selectedCallerIds.length === 0 && (
                            <div className="mt-6 p-4 bg-yellow-50 text-yellow-800 rounded border border-yellow-200 text-sm">
                                <FiAlertCircle className="inline mr-2" /> Leads will be unassigned if no caller is selected.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer Controls */}
            <div className="flex justify-between items-center mt-8">
                <button
                    disabled={activeStep === 1 || isLoading}
                    onClick={handleBack}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                    Back
                </button>

                <div className="text-sm text-gray-400">Step {activeStep} of 5</div>

                <button
                    disabled={!currentStepIsValid() || isLoading}
                    onClick={activeStep === 5 ? handleFinalImport : handleNext}
                    className={`px-8 py-2 rounded-lg text-white font-medium transition-all shadow-md
                ${isLoading ? "bg-gray-400 cursor-wait" : "bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg"}
                disabled:opacity-50 disabled:cursor-not-allowed
            `}
                >
                    {isLoading ? "Processing..." : activeStep === 5 ? "Import Leads" : "Next Step"}
                </button>
            </div>
        </div>
    );
};

export default ImportLeadsPage;

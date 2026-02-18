const Campaign = require("../models/Campaign");
const { fetchMetaLeads, fetchGoogleLeads } = require("../services/integrationService");
const Lead = require("../models/Lead");
const LeadUpload = require("../models/LeadUpload");
const xlsx = require("xlsx");

// Helper to generate lead ID if not imported from util (since it's not exported there)
const makeLeadId = (type = "MANUAL") => {
    const prefix = type.toUpperCase().substring(0, 3);
    const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, ""); // YYMMDD
    const randomPart = Math.floor(Math.random() * 9000) + 1000;
    return `${prefix}${datePart}-${randomPart}`;
};

// GET /api/v1/campaigns
const getCampaigns = async (req, res) => {
    try {
        const { search, sort } = req.query;

        let query = {};
        if (search) {
            query.name = { $regex: search, $options: "i" };
        }

        let sortOption = { createdAt: -1 }; // Default new to old
        if (sort) {
            switch (sort) {
                case "name_asc": sortOption = { name: 1 }; break;
                case "name_desc": sortOption = { name: -1 }; break;
                case "date_asc": sortOption = { createdAt: 1 }; break;
                case "date_desc": sortOption = { createdAt: -1 }; break;
                case "budget_asc": sortOption = { budget: 1 }; break;
                case "budget_desc": sortOption = { budget: -1 }; break;
                case "status_asc": sortOption = { status: 1 }; break; // Active first (a-z)
                case "status_desc": sortOption = { status: -1 }; break; // Paused first (z-a)
                default: sortOption = { createdAt: -1 };
            }
        }

        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const total = await Campaign.countDocuments(query);
        const campaigns = await Campaign.find(query).sort(sortOption).skip(skip).limit(limit);

        return res.json({
            success: true,
            data: campaigns,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error("Error fetching campaigns:", err);
        return res.status(500).json({ success: false, error: "Server Error" });
    }
};

// POST /api/v1/campaigns
const createCampaign = async (req, res) => {
    try {
        const { name, platform, status, startDate, endDate, budget, metaData, integration, assignedCallers } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, error: "Campaign name is required" });
        }

        const defaultMeta = {
            impressions: 0,
            clicks: 0,
            spend: 0,
            leads: 0,
            ctr: 0,
            cpc: 0,
        };

        const campaign = await Campaign.create({
            name,
            platform: platform || "facebook",
            status: status || "active",
            startDate: startDate || new Date(),
            endDate: endDate || null,
            budget: Number(budget) || 0,
            metaData: metaData || defaultMeta,
            integration: integration || { provider: "none" },
            assignedCallers: assignedCallers || [],
        });

        return res.status(201).json({ success: true, data: campaign });
    } catch (err) {
        console.error("Error creating campaign:", err);
        return res.status(500).json({ success: false, error: "Server Error" });
    }
};

// PUT /api/v1/campaigns/:id
const updateCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, platform, status, startDate, endDate, budget, integration, assignedCallers } = req.body;

        let campaign = await Campaign.findById(id);
        if (!campaign) {
            return res.status(404).json({ success: false, error: "Campaign not found" });
        }

        // Update fields
        if (name) campaign.name = name;
        if (platform) campaign.platform = platform;
        if (status) campaign.status = status;
        if (startDate) campaign.startDate = startDate;
        if (endDate) campaign.endDate = endDate;
        if (budget !== undefined) campaign.budget = Number(budget);
        if (assignedCallers) campaign.assignedCallers = assignedCallers;

        if (integration) {
            campaign.integration = {
                ...campaign.integration,
                ...integration
            };
        }

        await campaign.save();

        return res.json({ success: true, data: campaign });
    } catch (err) {
        console.error("Error updating campaign:", err);
        return res.status(500).json({ success: false, error: "Server Error" });
    }
};

// POST /api/v1/campaigns/:id/sync
const syncCampaignLeads = async (req, res) => {
    try {
        const { id } = req.params;
        const campaign = await Campaign.findById(id);
        if (!campaign) return res.status(404).json({ success: false, error: "Campaign not found" });

        const { provider, formId, accessToken, adAccountId } = campaign.integration || {};

        if (provider === "none" || !accessToken) {
            return res.status(400).json({ success: false, error: "Integration not configured" });
        }

        let rawLeads = [];
        if (provider === "meta") {
            try {
                rawLeads = await fetchMetaLeads({ formId, accessToken });
            } catch (e) {
                console.error("Meta Sync Error:", e.response?.data || e.message);
                return res.status(502).json({ success: false, error: "Failed to fetch from Meta: " + (e.response?.data?.error?.message || e.message) });
            }
        } else if (provider === "google") {
            rawLeads = await fetchGoogleLeads({ adAccountId, accessToken });
        }

        // Process raw leads and save to DB
        // Meta returns { field_data: [{name: "full_name", values: ["..."]}] }
        let addedCount = 0;

        for (const raw of rawLeads) {
            const externalId = raw.id;
            // Check if lead already exists based on some unique ID (fieldData match or external ID)
            // For now, we use a simplistic check or just insert new ones with new Lead IDs

            // Extract phone/email from field_data
            const fName = raw.field_data?.find(f => f.name === "full_name")?.values?.[0] || "Unknown Meta Lead";
            const fPhone = raw.field_data?.find(f => f.name === "phone_number")?.values?.[0] || "";

            // Very basic existence check
            const exists = await Lead.findOne({ "fieldData.values": fPhone });
            if (!exists) {
                // Weighted Random Assignment
                let assignedTo = null;
                if (campaign.assignedCallers && campaign.assignedCallers.length > 0) {
                    const totalWeight = campaign.assignedCallers.reduce((sum, c) => sum + (c.percentage || 0), 0);
                    if (totalWeight > 0) {
                        let random = Math.random() * totalWeight;
                        for (const caller of campaign.assignedCallers) {
                            random -= (caller.percentage || 0);
                            if (random <= 0) {
                                assignedTo = caller.callerId;
                                break;
                            }
                        }
                    } else {
                        // If no weights or all 0, fallback to random or round robin
                        // Fallback to random uniform
                        const randomIndex = Math.floor(Math.random() * campaign.assignedCallers.length);
                        assignedTo = campaign.assignedCallers[randomIndex].callerId;
                    }
                }

                await Lead.create({
                    leadId: makeLeadId(provider),
                    campaignId: campaign._id.toString(),
                    createdTime: raw.created_time || new Date(),
                    fieldData: raw.field_data,
                    status: "new",
                    source: `${provider} Ads`,
                    assignedTo
                });
                addedCount++;
            }
        }

        campaign.integration.lastSyncAt = new Date();
        campaign.metaData.leads = (campaign.metaData.leads || 0) + addedCount;
        await campaign.save();

        return res.json({ success: true, message: `Synced. Added ${addedCount} new leads.`, count: addedCount });
    } catch (err) {
        console.error("Sync Error:", err);
        return res.status(500).json({ success: false, error: "Server Error" });
    }
};

// POST /api/v1/campaigns/:id/upload
const uploadLeads = async (req, res) => {
    try {
        const { id } = req.params;
        const campaign = await Campaign.findById(id);
        if (!campaign) return res.status(404).json({ success: false, error: "Campaign not found" });

        if (!req.files || !req.files.file) {
            return res.status(400).json({ success: false, error: "No file uploaded" });
        }

        const file = req.files.file;
        const allowedTypes = [
            "text/csv",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            return res.status(400).json({ success: false, error: "Invalid file type. Only CSV and XLSX files are allowed." });
        }

        // Create upload record
        const uploadRecord = await LeadUpload.create({
            campaignId: id,
            fileName: file.name,
            uploadedBy: req.user._id,
            uploadedByName: req.user.name,
            status: "processing",
        });

        try {

            // Parse file
            let workbook;
            if (file.tempFilePath) {
                // Read from temp file path if available (useTempFiles: true)
                workbook = xlsx.readFile(file.tempFilePath);
            } else {
                // Read from buffer
                workbook = xlsx.read(file.data, { type: "buffer" });
            }

            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rows = xlsx.utils.sheet_to_json(sheet);

            console.log(`📊 Parsed ${rows.length} rows from file`);
            if (rows.length > 0) {
                console.log("First row sample:", rows[0]);
            }

            let successCount = 0;
            let errorCount = 0;
            const errors = [];

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                try {
                    // Expected columns: name, phone, email (optional), and any other custom fields
                    const name = row.name || row.Name || row.full_name || row["Full Name"];
                    const phone = row.phone || row.Phone || row.phone_number || row["Phone Number"];
                    const email = row.email || row.Email || "";

                    if (!name || !phone) {
                        console.log(`Row ${i + 2}: Missing data - name: ${name}, phone: ${phone}`);
                        errors.push({ row: i + 2, message: "Missing name or phone" });
                        errorCount++;
                        continue;
                    }

                    // Normalize phone
                    const normalizedPhone = String(phone).replace(/\D/g, "");
                    if (normalizedPhone.length < 7 || normalizedPhone.length > 15) {
                        errors.push({ row: i + 2, message: "Invalid phone number" });
                        errorCount++;
                        continue;
                    }

                    // Build fieldData
                    const fieldData = [
                        { name: "full_name", values: [String(name)] },
                        { name: "phone_number", values: [normalizedPhone] },
                    ];
                    if (email) fieldData.push({ name: "email", values: [String(email)] });

                    // Add any extra columns as custom fields
                    const standardFields = ["name", "Name", "full_name", "Full Name", "phone", "Phone", "phone_number", "Phone Number", "email", "Email"];
                    for (const [key, value] of Object.entries(row)) {
                        if (!standardFields.includes(key) && value) {
                            fieldData.push({ name: String(key), values: [String(value)] });
                        }
                    }

                    // Check for duplicates
                    const exists = await Lead.findOne({ "fieldData.values": normalizedPhone });
                    if (exists) {
                        errors.push({ row: i + 2, message: "Duplicate phone number" });
                        errorCount++;
                        continue;
                    }

                    // Create lead
                    await Lead.create({
                        leadId: makeLeadId("UPLOAD"),
                        campaignId: id,
                        createdTime: new Date(),
                        fieldData,
                        status: "new",
                        source: "Bulk Upload",
                    });

                    successCount++;
                    console.log(`✅ Row ${i + 2}: Created lead for ${name}`);
                } catch (err) {
                    console.error(`❌ Error processing row ${i + 2}:`, err);
                    errors.push({ row: i + 2, message: err.message || "Processing error" });
                    errorCount++;
                }
            }

            console.log(`📊 Upload complete: ${successCount} success, ${errorCount} errors`);

            // Update upload record
            uploadRecord.status = errorCount === rows.length ? "failed" : "uploaded";
            uploadRecord.totalLeads = rows.length;
            uploadRecord.successCount = successCount;
            uploadRecord.errorCount = errorCount;
            uploadRecord.errors = errors.slice(0, 100); // Limit to first 100 errors
            await uploadRecord.save();

            // Update campaign lead count
            campaign.metaData.leads = (campaign.metaData.leads || 0) + successCount;
            await campaign.save();

            return res.json({
                success: true,
                message: `Upload complete. ${successCount} leads added, ${errorCount} errors.`,
                data: {
                    uploadId: uploadRecord._id,
                    totalLeads: rows.length,
                    successCount,
                    errorCount,
                    errors: errors.slice(0, 10), // Return first 10 errors in response
                }
            });
        } catch (parseErr) {
            console.error("File parsing error:", parseErr);
            uploadRecord.status = "failed";
            uploadRecord.errors = [{ row: 0, message: parseErr.message || "Failed to parse file" }];
            await uploadRecord.save();
            return res.status(400).json({ success: false, error: "Failed to parse file: " + parseErr.message });
        }
    } catch (err) {
        console.error("Upload Error:", err);
        return res.status(500).json({ success: false, error: "Server Error" });
    }
};

// POST /api/v1/campaigns/check-duplicates
const checkDuplicates = async (req, res) => {
    try {
        const { leads } = req.body; // Array of objects with phone/email
        if (!leads || !Array.isArray(leads)) {
            return res.status(400).json({ success: false, error: "Invalid leads data" });
        }

        const phones = leads.map(l => l.phone).filter(Boolean);
        const emails = leads.map(l => l.email).filter(Boolean);

        const duplicates = [];

        if (phones.length > 0) {
            const existing = await Lead.find({ "fieldData.values": { $in: phones } }).select("fieldData");
            existing.forEach(lead => {
                const phoneField = lead.fieldData.find(f => f.name === "phone_number");
                if (phoneField && phoneField.values[0]) {
                    duplicates.push({ type: "phone", value: phoneField.values[0] });
                }
            });
        }

        if (emails.length > 0) {
            const existing = await Lead.find({ "fieldData.values": { $in: emails } }).select("fieldData");
            existing.forEach(lead => {
                const emailField = lead.fieldData.find(f => f.name === "email");
                if (emailField && emailField.values[0]) {
                    duplicates.push({ type: "email", value: emailField.values[0] });
                }
            });
        }

        return res.json({ success: true, duplicates });
    } catch (err) {
        console.error("Check Duplicates Error:", err);
        return res.status(500).json({ success: false, error: "Server Error" });
    }
};

// POST /api/v1/campaigns/bulk-import
const bulkImportLeads = async (req, res) => {
    try {
        const { leads, campaignId, callers } = req.body;

        if (!leads || !Array.isArray(leads)) {
            return res.status(400).json({ success: false, error: "Invalid leads format" });
        }

        if (leads.length === 0) {
            return res.json({
                success: true,
                message: "No unique leads to import.",
                count: 0
            });
        }

        if (!campaignId) {
            return res.status(400).json({ success: false, error: "Campaign ID is required" });
        }

        let campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            // Check if we need to create a new campaign
            // (The frontend might send a string name instead of ID if it's new, but let's assume frontend creates campaign first)
            return res.status(404).json({ success: false, error: "Campaign not found" });
        }

        // Prepare lead documents
        const leadDocs = leads.map(lead => ({
            leadId: makeLeadId("BULK"),
            campaignId: campaignId,
            createdTime: new Date(),
            fieldData: lead.fieldData,
            status: "new",
            source: "Bulk Import",
            // Assignment logic could go here if callers are provided
            // For example, round-robin assignment or specific assignment
            // assignedTo: ...
        }));

        // Assign to callers if provided (Round Robin)
        if (callers && Array.isArray(callers) && callers.length > 0) {
            leadDocs.forEach((doc, index) => {
                doc.assignedTo = callers[index % callers.length];
            });
        }

        const inserted = await Lead.insertMany(leadDocs);

        // Update campaign stats
        campaign.metaData.leads = (campaign.metaData.leads || 0) + inserted.length;
        await campaign.save();

        return res.json({
            success: true,
            message: `Successfully imported ${inserted.length} leads.`,
            count: inserted.length
        });

    } catch (err) {
        console.error("Bulk Import Error:", err);
        return res.status(500).json({ success: false, error: "Server Error: " + err.message });
    }
};

// GET /api/v1/campaigns/:id/uploads
const getUploadHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const uploads = await LeadUpload.find({ campaignId: id })
            .populate("uploadedBy", "name email")
            .sort({ createdAt: -1 });

        return res.json({ success: true, count: uploads.length, data: uploads });
    } catch (err) {
        console.error("Error fetching upload history:", err);
        return res.status(500).json({ success: false, error: "Server Error" });
    }
};

// POST /api/v1/campaigns/sync-meta (Global sync for campaigns)
const syncMetaCampaignsHandler = async (req, res) => {
    try {
        const { syncMetaCampaigns } = require("../services/metaLeadSyncService");
        const summary = await syncMetaCampaigns();
        return res.json({ success: true, summary });
    } catch (err) {
        console.error("Meta Campaign Sync Error:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = {
    getCampaigns,
    createCampaign,
    updateCampaign,
    syncCampaignLeads,
    uploadLeads,
    getUploadHistory,
    checkDuplicates,
    bulkImportLeads,
    syncMetaCampaignsHandler,
};

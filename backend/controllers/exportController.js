const Lead = require("../models/Lead");
const { Parser } = require("json2csv");

// Export leads to CSV
exports.exportLeads = async (req, res) => {
    try {
        const {
            filters = {},
            columns = [],
            exportAll = false,
            page = 1,
            pageSize = 20,
        } = req.body;

        console.log("Export request received:", { filters, columnsCount: columns.length, exportAll });

        const userId = req.user._id;
        const { role } = req.user || {};
        const isAdmin = ["admin", "superadmin", "owner"].includes(role);

        // Build query — mirror the working getAllLeads filter logic
        const query = {};

        // Access control - callers only see their assigned leads
        if (!isAdmin) {
            query.assignedTo = userId;
        }

        // Status (case-insensitive, supports array)
        if (filters.leadStatus && (Array.isArray(filters.leadStatus) ? filters.leadStatus.length > 0 : filters.leadStatus !== "Lead Status")) {
            const statusValues = Array.isArray(filters.leadStatus) ? filters.leadStatus : [filters.leadStatus];
            const regexes = statusValues.map(s => new RegExp(`^${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
            query.status = regexes.length === 1 ? { $regex: regexes[0] } : { $in: regexes };
        }

        // Assigned caller (supports array)
        if (filters.callerFilter && isAdmin) {
            const callerValues = Array.isArray(filters.callerFilter) ? filters.callerFilter : [filters.callerFilter];
            if (callerValues.length > 0 && !(callerValues.length === 1 && callerValues[0] === "All Callers")) {
                const hasUnassigned = callerValues.some(v => v === 'null' || v === 'Unassigned');
                const realIds = callerValues.filter(v => v !== 'null' && v !== 'Unassigned');
                const conditions = [];
                if (hasUnassigned) conditions.push({ assignedTo: null });
                if (realIds.length > 0) conditions.push({ assignedTo: { $in: realIds } });
                if (conditions.length > 1) {
                    query.$and = query.$and || [];
                    query.$and.push({ $or: conditions });
                } else if (conditions.length === 1) {
                    Object.assign(query, conditions[0]);
                }
            }
        }

        // Source — check both top-level source and fieldData
        if (filters.source && filters.source !== "All Sources") {
            query.$and = query.$and || [];
            const escaped = filters.source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.$and.push({
                $or: [
                    { source: { $regex: new RegExp(`^${escaped}$`, 'i') } },
                    { fieldData: { $elemMatch: { name: { $regex: /^source$/i }, values: { $regex: new RegExp(`^${escaped}$`, 'i') } } } },
                ],
            });
        }

        // Campaign — match multiple possible IDs
        if (filters.campaignFilter && filters.campaignFilter !== "All Campaigns") {
            const Campaign = require("../models/Campaign");
            const campaign = await Campaign.findById(filters.campaignFilter).lean();
            if (campaign) {
                const possibleIds = [filters.campaignFilter, campaign._id?.toString()];
                if (campaign.integration?.externalId) possibleIds.push(campaign.integration.externalId);
                if (campaign.integration?.metaCampaignId) possibleIds.push(campaign.integration.metaCampaignId);
                query.campaignId = { $in: [...new Set(possibleIds.filter(Boolean))] };
            } else {
                query.campaignId = filters.campaignFilter;
            }
        }

        // Text search across fieldData values
        if (filters.debouncedSearch && filters.debouncedSearch.trim()) {
            const escaped = filters.debouncedSearch.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query['fieldData.values'] = { $regex: escaped, $options: 'i' };
        }

        // Date range — Lead model uses createdTime
        if (filters.dateMode && filters.dateMode !== "" && filters.dateMode !== "All Time") {
            const now = new Date();
            const dayStart = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
            const dayEnd = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

            if (filters.dateMode === 'Today') {
                query.createdTime = { $gte: dayStart(now), $lte: dayEnd(now) };
            } else if (filters.dateMode === 'Yesterday') {
                const y = new Date(now);
                y.setDate(y.getDate() - 1);
                query.createdTime = { $gte: dayStart(y), $lte: dayEnd(y) };
            } else if (filters.dateMode === 'This Week' || filters.dateMode === '7d') {
                const d = new Date(now);
                d.setDate(d.getDate() - 6);
                query.createdTime = { $gte: dayStart(d), $lte: dayEnd(now) };
            } else if (filters.dateMode === 'This Month' || filters.dateMode === '30d') {
                const d = new Date(now);
                d.setDate(d.getDate() - 29);
                query.createdTime = { $gte: dayStart(d), $lte: dayEnd(now) };
            } else if (filters.dateMode === 'Custom') {
                if (filters.customFrom && filters.customTo) {
                    query.createdTime = {
                        $gte: new Date(`${filters.customFrom}T00:00:00`),
                        $lte: new Date(`${filters.customTo}T23:59:59.999`),
                    };
                } else if (filters.customFrom) {
                    query.createdTime = { $gte: new Date(`${filters.customFrom}T00:00:00`) };
                } else if (filters.customTo) {
                    query.createdTime = { $lte: new Date(`${filters.customTo}T23:59:59.999`) };
                }
            } else if (filters.dateMode === 'Tomorrow') {
                const tmr = new Date(now);
                tmr.setDate(tmr.getDate() + 1);
                query.createdTime = { $gte: dayStart(tmr), $lte: dayEnd(tmr) };
            }
        }

        // Follow-up filter
        if (filters.followupFilter && filters.followupFilter !== "All") {
            const now = new Date();
            const dayStart = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
            const dayEnd = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

            if (filters.followupFilter === 'Scheduled') {
                query.followUpAt = { $gt: now };
            } else if (filters.followupFilter === 'Today') {
                query.followUpAt = { $gte: dayStart(now), $lte: dayEnd(now) };
            } else if (filters.followupFilter === 'Tomorrow') {
                const tmr = new Date(now);
                tmr.setDate(tmr.getDate() + 1);
                query.followUpAt = { $gte: dayStart(tmr), $lte: dayEnd(tmr) };
            } else if (filters.followupFilter === 'This Week') {
                const weekEnd = new Date(now);
                weekEnd.setDate(weekEnd.getDate() + 7);
                query.followUpAt = { $gte: now, $lte: weekEnd };
            } else if (filters.followupFilter === 'Overdue') {
                query.followUpAt = { $lt: now, $ne: null };
            } else if (filters.followupFilter === 'Not Scheduled') {
                query.$and = query.$and || [];
                query.$and.push({
                    $or: [{ followUpAt: null }, { followUpAt: { $exists: false } }],
                });
            }
        }

        // OPD Status filter - check opBookings array
        if (filters.opdStatus && filters.opdStatus !== "OPD Status") {
            const escaped = filters.opdStatus.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.opBookings = {
                $elemMatch: {
                    status: { $regex: new RegExp(`^${escaped}$`, 'i') }
                }
            };
        }

        // IPD Status filter - check ipBookings array
        if (filters.ipdStatus && filters.ipdStatus !== "IPD Status") {
            const escaped = filters.ipdStatus.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.ipBookings = {
                $elemMatch: {
                    status: { $regex: new RegExp(`^${escaped}$`, 'i') }
                }
            };
        }

        // Diagnostics filter
        if (filters.diagnostics && filters.diagnostics !== "Diagnostics") {
            query.$and = query.$and || [];
            const escaped = filters.diagnostics.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.$and.push({
                fieldData: {
                    $elemMatch: {
                        name: { $regex: /^diagnostic[s]?$|^diagnostic[_ ]?(non|status)$/i },
                        values: { $regex: new RegExp(`^${escaped}$`, 'i') }
                    }
                }
            });
        }

        // Custom field filters — frontend sends object { fieldName: { value, operator } }
        if (filters.customFieldFilters && typeof filters.customFieldFilters === 'object') {
            for (const [fieldName, filterDef] of Object.entries(filters.customFieldFilters)) {
                const value = filterDef?.value || filterDef;
                const operator = filterDef?.operator || 'is';
                if (value) {
                    query.$and = query.$and || [];
                    const escaped = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const nameVariants = [
                        fieldName,
                        fieldName.replace(/_/g, ' '),
                        fieldName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                    ];
                    const elemMatch = {
                        name: { $in: nameVariants },
                        values: { $regex: new RegExp(`^${escaped}$`, 'i') },
                    };

                    if (operator === 'is_not') {
                        query.$and.push({
                            $nor: [{ fieldData: { $elemMatch: elemMatch } }],
                        });
                    } else {
                        query.$and.push({ fieldData: { $elemMatch: elemMatch } });
                    }
                }
            }
        }

        console.log("Export query:", JSON.stringify(query, null, 2));

        // Build the leads query
        let leadsQuery = Lead.find(query).populate("assignedTo", "name email");

        // Pagination for current page export
        if (!exportAll) {
            leadsQuery = leadsQuery
                .skip((page - 1) * pageSize)
                .limit(pageSize);
        } else {
            // Limit to prevent memory issues
            leadsQuery = leadsQuery.limit(10000);
        }

        const leads = await leadsQuery.sort({ createdTime: -1 });

        console.log(`Found ${leads.length} leads to export`);

        // Helper to get header name
        const getHeaderName = (columnId) => {
            switch (columnId) {
                case "name":
                case "full_name": return "Full Name";

                case "phone":
                case "phone_number": return "Phone Number";

                case "leadStatus":
                case "lead_status": return "Status";

                case "assignedTo":
                case "assigned_to": return "Assigned To";

                case "date":
                case "created_at": return "Created Date";

                case "campaign": return "Campaign";
                case "source": return "Source";
                case "city": return "City";

                case "opdStatus":
                case "opd_status": return "OPD Status";

                case "ipdStatus":
                case "ipd_status": return "IPD Status";

                case "diagnostic": return "Diagnostic";

                case "checkbox": return null; // Skip checkbox

                default:
                    // Convert snake_case or camelCase to Title Case
                    return columnId
                        .replace(/([A-Z])/g, ' $1') // Space before camelCase caps
                        .replace(/_/g, " ")         // Space for underscores
                        .trim()
                        .replace(/\b\w/g, l => l.toUpperCase()); // Title Case
            }
        };

        const fields = columns
            .map(getHeaderName)
            .filter(header => header !== null);

        // Transform leads data based on selected columns
        const transformedData = leads.map(lead => {
            const row = {};

            // Helper to find field value from fieldData
            const getFieldValue = (fieldNames) => {
                if (!lead.fieldData) return "";
                const names = Array.isArray(fieldNames) ? fieldNames : [fieldNames];
                for (const name of names) {
                    const field = lead.fieldData.find(f =>
                        f.name && f.name.toLowerCase() === name.toLowerCase()
                    );
                    if (field && field.values && field.values[0]) {
                        return field.values[0];
                    }
                }
                return "";
            };

            columns.forEach(columnId => {
                if (columnId === 'checkbox') return;

                try {
                    switch (columnId) {
                        case "name":
                        case "full_name":
                            row["Full Name"] = getFieldValue(["full_name", "name"]) || lead.name || "";
                            break;

                        case "phone":
                        case "phone_number":
                            row["Phone Number"] = getFieldValue(["phone_number", "phone"]) || lead.phone || "";
                            break;

                        case "leadStatus":
                        case "lead_status":
                            row["Status"] = lead.status || "";
                            break;

                        case "assignedTo":
                        case "assigned_to":
                            row["Assigned To"] = lead.assignedTo?.name || "";
                            break;

                        case "date":
                        case "created_at":
                            const dateVal = lead.createdTime || lead.createdAt;
                            row["Created Date"] = dateVal ? new Date(dateVal).toLocaleDateString("en-IN") : "";
                            break;

                        case "campaign":
                            row["Campaign"] = lead.campaignId || "";
                            break;

                        case "source":
                            row["Source"] = getFieldValue(["source"]) || lead.source || "";
                            break;

                        case "city":
                            row["City"] = getFieldValue(["city"]) || "";
                            break;

                        case "opdStatus":
                        case "opd_status": {
                            const latestOp = lead.opBookings && lead.opBookings.length > 0
                                ? lead.opBookings[lead.opBookings.length - 1]
                                : null;
                            row["OPD Status"] = latestOp?.status || getFieldValue(["opd_status", "opdstatus", "opd"]) || "";
                            break;
                        }

                        case "ipdStatus":
                        case "ipd_status": {
                            const latestIp = lead.ipBookings && lead.ipBookings.length > 0
                                ? lead.ipBookings[lead.ipBookings.length - 1]
                                : null;
                            row["IPD Status"] = latestIp?.status || getFieldValue(["ipd_status", "ipdstatus", "ipd"]) || "";
                            break;
                        }

                        case "diagnostic":
                            row["Diagnostic"] = getFieldValue(["diagnostics", "diagnostic", "diagnostic_non", "diagnostic_status"]) || "";
                            break;

                        default:
                            // Handle custom fields from fieldData
                            if (lead.fieldData) {
                                const fieldVal = getFieldValue([columnId]);
                                const fieldName = getHeaderName(columnId);
                                row[fieldName] = fieldVal;
                            }
                    }
                } catch (err) {
                    console.error(`Error processing column ${columnId} for lead ${lead._id}:`, err);
                    row[getHeaderName(columnId)] = "Error";
                }
            });

            return row;
        });

        console.log("Data transformed, generating CSV...");

        // Generate CSV with explicit fields to handle empty data case
        const parser = new Parser({ fields });
        const csv = parser.parse(transformedData);
        console.log("CSV generated, length:", csv.length);

        // Set headers for CSV download
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=leads-export-${Date.now()}.csv`);
        res.send(csv);

    } catch (error) {
        console.error("Export leads error:", error);
        res.status(500).json({ error: "Failed to export leads" });
    }
};

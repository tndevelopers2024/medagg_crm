// controllers/analyticsController.js
const mongoose = require("mongoose");
const Lead = require("../models/Lead");
const User = require("../models/User");
const { getRoleIdByName } = require("../utils/roleHelpers");
const LeadStageConfig = require("../models/LeadStageConfig");
const FieldConfig = require("../models/LeadFieldConfig");
const Call = require("../models/CallLog");

/**
 * Build MongoDB query from filter conditions
 * @param {Array} filters - Array of filter objects {type, operator, value, from, to}
 * @returns {Object} MongoDB query object
 */
const buildFilterQuery = async (filters = []) => {
    const query = {};
    const andConditions = [];

    for (const filter of filters) {
        const { type, operator, value, from, to } = filter;

        switch (type) {
            case "assignee":
                if (value === "Unassigned") {
                    query.assignedTo = operator === "is" ? null : { $ne: null };
                } else {
                    const assigneeId = mongoose.Types.ObjectId.isValid(value)
                        ? new mongoose.Types.ObjectId(value)
                        : value;
                    query.assignedTo = operator === "is" ? assigneeId : { $ne: assigneeId };
                }
                break;

            case "user":
                break;

            case "leadStatus":
                query.status = operator === "is" ? value : { $ne: value };
                break;

            case "followUp": {
                const now = new Date();
                const dayStart = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
                const dayEnd = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

                if (value === "Yes" || value === "Scheduled") {
                    query.followUpAt = { $gt: now };
                } else if (value === "No" || value === "Not Scheduled") {
                    andConditions.push({
                        $or: [
                            { followUpAt: null },
                            { followUpAt: { $exists: false } },
                        ],
                    });
                } else if (value === "Today") {
                    query.followUpAt = { $gte: dayStart(now), $lte: dayEnd(now) };
                } else if (value === "Tomorrow") {
                    const tmr = new Date(now); tmr.setDate(tmr.getDate() + 1);
                    query.followUpAt = { $gte: dayStart(tmr), $lte: dayEnd(tmr) };
                } else if (value === "This Week") {
                    const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7);
                    query.followUpAt = { $gte: now, $lte: weekEnd };
                } else if (value === "Overdue") {
                    query.followUpAt = { $lt: now, $ne: null };
                }
                break;
            }

            case "callStatus":
                query.lastCallOutcome = operator === "is" ? value : { $ne: value };
                break;

            case "totalCalls": {
                const callQuery = {};
                if (from !== undefined && from !== "") {
                    callQuery.$gte = parseInt(from);
                }
                if (to !== undefined && to !== "") {
                    callQuery.$lte = parseInt(to);
                }
                if (Object.keys(callQuery).length > 0) {
                    query.callCount = callQuery;
                }
                break;
            }

            case "source": {
                // Source may be in top-level field or fieldData — check both
                const escaped = (value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const sourceRegex = new RegExp(`^${escaped}$`, 'i');
                if (operator === "is") {
                    andConditions.push({
                        $or: [
                            { source: { $regex: sourceRegex } },
                            { fieldData: { $elemMatch: { name: { $regex: /^source$/i }, values: { $regex: sourceRegex } } } },
                        ],
                    });
                } else {
                    andConditions.push({
                        source: { $not: sourceRegex },
                        fieldData: { $not: { $elemMatch: { name: { $regex: /^source$/i }, values: { $regex: sourceRegex } } } },
                    });
                }
                break;
            }

            case "campaign": {
                // Campaign: frontend sends mongo _id, leads store external campaign IDs
                const Campaign = require("../models/Campaign");
                const campaign = await Campaign.findById(value).lean();
                const possibleIds = [value];
                if (campaign) {
                    if (campaign._id) possibleIds.push(campaign._id.toString());
                    if (campaign.integration?.externalId) possibleIds.push(campaign.integration.externalId);
                    if (campaign.integration?.metaCampaignId) possibleIds.push(campaign.integration.metaCampaignId);
                }
                const uniqueIds = [...new Set(possibleIds.filter(Boolean))];
                if (operator === "is") {
                    query.campaignId = { $in: uniqueIds };
                } else {
                    query.campaignId = { $nin: uniqueIds };
                }
                break;
            }

            case "dateRange":
                if (from && to) {
                    query.createdTime = {
                        $gte: new Date(from),
                        $lte: new Date(to),
                    };
                }
                break;

            default:
                // Handle custom fields — flexible name matching
                if (type.startsWith("custom_")) {
                    const fieldName = type.replace("custom_", "");
                    const nameVariants = [
                        fieldName,
                        fieldName.replace(/_/g, ' '),
                        fieldName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                    ];
                    const escaped = (value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const elemMatch = {
                        name: { $in: nameVariants },
                        values: { $regex: new RegExp(`^${escaped}$`, 'i') },
                    };
                    if (operator === "is_not" || operator === "is not") {
                        andConditions.push({
                            $nor: [{ fieldData: { $elemMatch: elemMatch } }],
                        });
                    } else {
                        andConditions.push({ fieldData: { $elemMatch: elemMatch } });
                    }
                }
                break;
        }
    }

    // Combine all conditions
    if (andConditions.length > 0) {
        if (Object.keys(query).length > 0) {
            return { $and: [query, ...andConditions] };
        } else {
            return andConditions.length === 1 ? andConditions[0] : { $and: andConditions };
        }
    }

    return query;
};

/**
 * Get lead analytics with filtering
 * @route GET /api/v1/analytics/leads
 */
exports.getLeadAnalytics = async (req, res) => {
    try {
        const { filters = [], chartType = "status", sortBy = "createdTime", sortOrder = "desc" } = req.body || req.query;

        // Parse filters if string
        const parsedFilters = typeof filters === "string" ? JSON.parse(filters) : filters;

        // Build query from filters
        const query = await buildFilterQuery(parsedFilters);

        console.log("🔍 Analytics Request:");
        console.log("  - Chart Type:", chartType);
        console.log("  - Filters:", JSON.stringify(parsedFilters, null, 2));
        console.log("  - Built Query:", JSON.stringify(query, null, 2));

        // Get total count
        const totalCount = await Lead.countDocuments(query);
        console.log("  - Total Count:", totalCount);

        let chartData = {};

        switch (chartType) {
            case "status":
                chartData = await getStatusDistribution(query);
                break;

            case "lostReasons":
                chartData = await getLostReasonsDistribution(query);
                break;

            case "assignee":
                chartData = await getAssigneeDistribution(query);
                break;

            case "rating":
                chartData = await getRatingDistribution(query);
                break;

            case "callStatus":
                chartData = await getCallStatusDistribution(query);
                break;

            case "numberOfCalls":
                chartData = await getNumberOfCallsDistribution(query);
                break;

            case "city":
                chartData = await getCustomFieldDistribution(query, "city");
                break;

            case "state":
                chartData = await getCustomFieldDistribution(query, "state");
                break;

            case "custom":
                const { fieldName } = req.body || req.query;
                chartData = await getCustomFieldDistribution(query, fieldName);
                break;

            default:
                chartData = await getStatusDistribution(query);
        }

        console.log(`📊 Analytics Response - Type: ${chartType}, Count: ${totalCount}, Data length: ${chartData?.length || 0}`);
        if (chartData?.length > 0) {
            console.log("📊 First data item:", JSON.stringify(chartData[0]));
        }

        res.status(200).json({
            success: true,
            totalCount,
            chartType,
            data: chartData,
        });
    } catch (error) {
        console.error("Analytics error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch analytics",
            error: error.message,
        });
    }
};

/**
 * Get status distribution
 */
const getStatusDistribution = async (query) => {
    const results = await Lead.aggregate([
        { $match: query },
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 },
            },
        },
        { $sort: { count: -1 } },
    ]);

    const total = results.reduce((sum, item) => sum + item.count, 0);

    return results.map((item) => ({
        name: item._id || "Unknown",
        count: item.count,
        percentage: total > 0 ? ((item.count / total) * 100).toFixed(2) : 0,
    }));
};

/**
 * Get lost reasons distribution
 */
const getLostReasonsDistribution = async (query) => {
    // Lost reason is typically in fieldData
    const results = await Lead.aggregate([
        { $match: query },
        { $unwind: "$fieldData" },
        { $match: { "fieldData.name": "lost_reason" } },
        { $unwind: "$fieldData.values" },
        {
            $group: {
                _id: "$fieldData.values",
                count: { $sum: 1 },
            },
        },
        { $sort: { count: -1 } },
    ]);

    const total = results.reduce((sum, item) => sum + item.count, 0);

    return results.map((item) => ({
        name: item._id || "Unknown",
        count: item.count,
        percentage: total > 0 ? ((item.count / total) * 100).toFixed(2) : 0,
    }));
};

/**
 * Get assignee distribution
 */
const getAssigneeDistribution = async (query) => {
    const results = await Lead.aggregate([
        { $match: query },
        {
            $group: {
                _id: "$assignedTo",
                count: { $sum: 1 },
            },
        },
        { $sort: { count: -1 } },
    ]);

    // Get user names
    const userIds = results.map((r) => r._id).filter((id) => id);
    const users = await User.find({ _id: { $in: userIds } }).select("name");
    const userMap = new Map(users.map((u) => [u._id.toString(), u.name]));

    const total = results.reduce((sum, item) => sum + item.count, 0);

    return results.map((item) => ({
        name: item._id ? userMap.get(item._id.toString()) || "Unknown" : "Unassigned",
        count: item.count,
        percentage: total > 0 ? ((item.count / total) * 100).toFixed(2) : 0,
        userId: item._id,
    }));
};

/**
 * Get rating distribution
 */
const getRatingDistribution = async (query) => {
    const results = await Lead.aggregate([
        { $match: query },
        { $unwind: "$fieldData" },
        { $match: { "fieldData.name": "rating" } },
        { $unwind: "$fieldData.values" },
        {
            $group: {
                _id: "$fieldData.values",
                count: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    const total = results.reduce((sum, item) => sum + item.count, 0);

    return results.map((item) => ({
        name: item._id || "No Rating",
        count: item.count,
        percentage: total > 0 ? ((item.count / total) * 100).toFixed(2) : 0,
    }));
};

/**
 * Get call status distribution
 */
const getCallStatusDistribution = async (query) => {
    const results = await Lead.aggregate([
        { $match: query },
        {
            $group: {
                _id: "$lastCallOutcome",
                count: { $sum: 1 },
            },
        },
        { $sort: { count: -1 } },
    ]);

    const total = results.reduce((sum, item) => sum + item.count, 0);

    return results.map((item) => ({
        name: item._id || "No Calls",
        count: item.count,
        percentage: total > 0 ? ((item.count / total) * 100).toFixed(2) : 0,
    }));
};

/**
 * Get number of calls distribution (histogram)
 */
const getNumberOfCallsDistribution = async (query) => {
    const results = await Lead.aggregate([
        { $match: query },
        {
            $bucket: {
                groupBy: "$callCount",
                boundaries: [0, 1, 2, 3, 5, 10, 20, 50, 100],
                default: "100+",
                output: {
                    count: { $sum: 1 },
                },
            },
        },
    ]);

    const total = results.reduce((sum, item) => sum + item.count, 0);

    return results.map((item) => {
        let label;
        if (item._id === "100+") {
            label = "100+";
        } else if (item._id === 0) {
            label = "No calls";
        } else {
            const nextBoundary = [1, 2, 3, 5, 10, 20, 50, 100].find((b) => b > item._id);
            label = nextBoundary ? `${item._id}-${nextBoundary - 1}` : `${item._id}+`;
        }

        return {
            name: label,
            count: item.count,
            percentage: total > 0 ? ((item.count / total) * 100).toFixed(2) : 0,
        };
    });
};

/**
 * Get custom field distribution
 */
const getCustomFieldDistribution = async (query, fieldName) => {
    if (!fieldName) {
        return [];
    }

    const results = await Lead.aggregate([
        { $match: query },
        { $unwind: "$fieldData" },
        { $match: { "fieldData.name": fieldName } },
        { $unwind: "$fieldData.values" },
        {
            $group: {
                _id: "$fieldData.values",
                count: { $sum: 1 },
            },
        },
        { $sort: { count: -1 } },
        { $limit: 20 }, // Limit to top 20 values
    ]);

    const total = results.reduce((sum, item) => sum + item.count, 0);

    return results.map((item) => ({
        name: item._id || "Unknown",
        count: item.count,
        percentage: total > 0 ? ((item.count / total) * 100).toFixed(2) : 0,
    }));
};

/**
 * Get available filter options
 * @route GET /api/v1/analytics/filters
 */
exports.getFilterOptions = async (req, res) => {
    try {
        // Get callers
        const callerRoleId = await getRoleIdByName("Caller");
        const callers = await User.find({ role: callerRoleId }).select("_id name").lean();

        // Get lead stages
        const leadStages = await LeadStageConfig.find({ active: true })
            .select("stageName")
            .lean();

        // Get field configs for custom fields
        const fieldConfigs = await FieldConfig.find({ active: true })
            .select("fieldName displayLabel fieldType options")
            .lean();

        // Dynamically discover all unique field names from actual lead data
        const dynamicFieldNames = await Lead.distinct("fieldData.name");

        // Merge dynamic fields with configured fields
        // Create a map of existing configs for quick lookup
        const configMap = new Map(fieldConfigs.map(fc => [fc.fieldName, fc]));

        const allFieldConfigs = [...fieldConfigs];

        // Add any dynamic fields that aren't in the config
        dynamicFieldNames.forEach(fieldName => {
            if (fieldName && !configMap.has(fieldName) &&
                !["source", "rating", "lost_reason"].includes(fieldName)) { // Exclude standard fields handled elsewhere
                allFieldConfigs.push({
                    fieldName: fieldName,
                    displayLabel: fieldName.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()), // Format label
                    fieldType: "text", // Default type
                    options: []
                });
            }
        });

        // Get unique sources from leads
        const sources = await Lead.distinct("fieldData.values", {
            "fieldData.name": "source",
        });

        res.status(200).json({
            success: true,
            data: {
                callers: callers.map((c) => ({ id: c._id, name: c.name })),
                leadStages: leadStages.map((s) => s.stageName),
                fieldConfigs: allFieldConfigs.sort((a, b) => a.displayLabel.localeCompare(b.displayLabel)),
                sources: sources.filter(Boolean),
            },
        });
    } catch (error) {
        console.error("Filter options error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch filter options",
            error: error.message,
        });
    }
};

/**
 * Export analytics data
 * @route POST /api/v1/analytics/export
 */
exports.exportAnalytics = async (req, res) => {
    try {
        const { filters = [], format = "csv" } = req.body;

        // Parse filters if string
        const parsedFilters = typeof filters === "string" ? JSON.parse(filters) : filters;

        // Build query from filters
        const query = await buildFilterQuery(parsedFilters);

        // Fetch leads
        const leads = await Lead.find(query)
            .populate("assignedTo", "name")
            .sort({ createdTime: -1 })
            .lean();

        if (format === "csv") {
            // Generate CSV
            const csv = generateCSV(leads);
            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", "attachment; filename=analytics.csv");
            res.send(csv);
        } else {
            // Return JSON for other formats
            res.status(200).json({
                success: true,
                data: leads,
            });
        }
    } catch (error) {
        console.error("Export error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to export analytics",
            error: error.message,
        });
    }
};

/**
 * Generate CSV from leads data
 */
const generateCSV = (leads) => {
    if (leads.length === 0) return "No data";

    // Headers
    const headers = [
        "Lead ID",
        "Created Time",
        "Status",
        "Assigned To",
        "Call Count",
        "Last Call Outcome",
        "Follow Up At",
    ];

    // Rows
    const rows = leads.map((lead) => [
        lead.leadId,
        lead.createdTime ? new Date(lead.createdTime).toISOString() : "",
        lead.status || "",
        lead.assignedTo?.name || "Unassigned",
        lead.callCount || 0,
        lead.lastCallOutcome || "",
        lead.followUpAt ? new Date(lead.followUpAt).toISOString() : "",
    ]);

    // Combine
    const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n");

    return csvContent;
};

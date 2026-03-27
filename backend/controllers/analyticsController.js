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
const dayBoundsIST = (dateStr) => {
    const d = new Date(typeof dateStr === 'string' ? `${dateStr}T00:00:00+05:30` : dateStr);
    const istDate = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
    istDate.setUTCHours(0, 0, 0, 0);
    const start = new Date(istDate.getTime() - (5.5 * 60 * 60 * 1000));
    return { start, end: new Date(start.getTime() + 86399999) };
};

const buildFilterQuery = async (filters = []) => {
    const query = {};
    const andConditions = [];

    for (const filter of filters) {
        const { type, operator, value, values, from, to } = filter;

        switch (type) {
            case "assignee": {
                if (operator === 'is_empty') {
                    andConditions.push({ $or: [{ assignedTo: null }, { assignedTo: { $exists: false } }] });
                    break;
                }
                const assigneeList = values || (value ? [value] : []);
                if (assigneeList.length === 0) break;
                const ids = assigneeList.map(v =>
                    v === "Unassigned" ? null
                        : mongoose.Types.ObjectId.isValid(v) ? new mongoose.Types.ObjectId(v) : v
                );
                const hasUnassigned = assigneeList.includes("Unassigned");
                if (operator === "is_not") {
                    // exclude all listed: not null AND not in ids
                    andConditions.push({ assignedTo: { $nin: ids } });
                } else {
                    // is: match any in list (including null for Unassigned)
                    if (hasUnassigned && ids.length === 1) {
                        andConditions.push({ $or: [{ assignedTo: null }, { assignedTo: { $exists: false } }] });
                    } else {
                        andConditions.push({ assignedTo: { $in: ids } });
                    }
                }
                break;
            }

            case "user":
                break;

            case "leadStatus": {
                if (operator === 'is_empty') {
                    andConditions.push({ $or: [{ status: null }, { status: '' }, { status: { $exists: false } }] });
                    break;
                }
                if (operator === 'is_include' && value) {
                    const esc = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    andConditions.push({ status: { $regex: esc, $options: 'i' } });
                    break;
                }
                if (operator === 'between') {
                    const { statusFrom, statusTo, statusDate, statusDateTo } = filter;
                    try {
                        const LeadActivity = require('../models/LeadActivity');
                        const activityQuery = { action: 'lead_update' };
                        const esc = (s) => (s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        if (statusFrom) activityQuery['diff.before.status'] = new RegExp(`^${esc(statusFrom)}$`, 'i');
                        if (statusTo)   activityQuery['diff.after.status']  = new RegExp(`^${esc(statusTo)}$`,   'i');

                        if (statusDate || statusDateTo) {
                            activityQuery.createdAt = {};
                            if (statusDate)   activityQuery.createdAt.$gte = new Date(`${statusDate}T00:00:00+05:30`);
                            if (statusDateTo) activityQuery.createdAt.$lte = new Date(`${statusDateTo}T23:59:59.999+05:30`);
                        }

                        const leadIds = await LeadActivity.distinct('lead', activityQuery);
                        andConditions.push({ _id: { $in: leadIds } });
                    } catch (e) { /* ignore lookups */ }
                    break;
                }
                const statusList = values || (value ? value.split(',').filter(Boolean) : []);
                if (statusList.length === 0) break;
                if (operator === 'is_not') {
                    query.status = { $nin: statusList };
                } else {
                    query.status = statusList.length === 1 ? statusList[0] : { $in: statusList };
                }
                break;
            }

            case "lostStatus": {
                const list = values || (value ? value.split(',').filter(Boolean) : []);
                if (list.length === 0) break;
                if (operator === 'is_not') {
                    andConditions.push({ status: { $nin: list } });
                } else {
                    andConditions.push({ status: { $in: list } });
                }
                break;
            }
            case "followUp": {
                const now = new Date();
                if (operator === 'is_empty') {
                    andConditions.push({ $or: [{ followUpAt: null }, { followUpAt: { $exists: false } }] });
                    break;
                }
                if (operator === 'after' && from) {
                    query.followUpAt = { $gt: dayBoundsIST(from).end };
                    break;
                }
                if (operator === 'before' && to) {
                    query.followUpAt = { $lt: dayBoundsIST(to).start };
                    break;
                }
                if (value === "Yes" || value === "Scheduled") {
                    query.followUpAt = { $gt: now };
                } else if (value === "No" || value === "Not Scheduled") {
                    andConditions.push({ $or: [{ followUpAt: null }, { followUpAt: { $exists: false } }] });
                } else if (value === "Today") {
                    const { start, end } = dayBoundsIST(now);
                    query.followUpAt = { $gte: start, $lte: end };
                } else if (value === "Tomorrow") {
                    const tmr = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                    const { start, end } = dayBoundsIST(tmr);
                    query.followUpAt = { $gte: start, $lte: end };
                } else if (value === "This Week") {
                    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                    const { end: weekEndBound } = dayBoundsIST(weekEnd);
                    query.followUpAt = { $gte: now, $lte: weekEndBound };
                } else if (value === "Overdue") {
                    query.followUpAt = { $lt: now, $ne: null };
                } else if (value === "Custom" && from && to) {
                    query.followUpAt = {
                        $gte: dayBoundsIST(from).start,
                        $lte: dayBoundsIST(to).end,
                    };
                }
                break;
            }

            case "callStatus":
                query.lastCallOutcome = operator === "is" ? value : { $ne: value };
                break;

            case "totalCalls": {
                const callQuery = {};
                if (from !== undefined && from !== "") callQuery.$gte = parseInt(from);
                if (to !== undefined && to !== "") callQuery.$lte = parseInt(to);
                if (Object.keys(callQuery).length > 0) query.callCount = callQuery;
                break;
            }

            case "source": {
                if (operator === 'is_empty') {
                    andConditions.push({
                        $and: [
                            { $or: [{ source: null }, { source: '' }, { source: { $exists: false } }] },
                            { $nor: [{ fieldData: { $elemMatch: { name: { $regex: /^source$/i }, values: { $gt: [] } } } }] },
                        ],
                    });
                    break;
                }
                const escaped = (value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                if (operator === 'is_include') {
                    andConditions.push({
                        $or: [
                            { source: { $regex: escaped, $options: 'i' } },
                            { fieldData: { $elemMatch: { name: { $regex: /^source$/i }, values: { $elemMatch: { $regex: escaped, $options: 'i' } } } } },
                        ],
                    });
                } else if (operator === 'is_not') {
                    const rx = new RegExp(`^${escaped}$`, 'i');
                    andConditions.push({
                        $nor: [
                            { source: { $regex: rx } },
                            { fieldData: { $elemMatch: { name: { $regex: /^source$/i }, values: { $regex: rx } } } },
                        ],
                    });
                } else {
                    const sourceRegex = new RegExp(`^${escaped}$`, 'i');
                    andConditions.push({
                        $or: [
                            { source: { $regex: sourceRegex } },
                            { fieldData: { $elemMatch: { name: { $regex: /^source$/i }, values: { $regex: sourceRegex } } } },
                        ],
                    });
                }
                break;
            }

            case "campaign": {
                const Campaign = require("../models/Campaign");
                if (operator === 'is_empty') {
                    andConditions.push({ $or: [{ campaignId: null }, { campaignId: '' }, { campaignId: { $exists: false } }] });
                    break;
                }
                const campaignList = values || (value ? value.split(',').filter(Boolean) : []);
                if (campaignList.length === 0) break;
                const allPossibleIds = [];
                for (const cid of campaignList) {
                    const camp = await Campaign.findById(cid).lean();
                    const ids = [cid];
                    if (camp) {
                        if (camp._id) ids.push(camp._id.toString());
                        if (camp.integration?.externalId) ids.push(camp.integration.externalId);
                        if (camp.integration?.metaCampaignId) ids.push(camp.integration.metaCampaignId);
                    }
                    allPossibleIds.push(...ids);
                }
                const uniqueIds = [...new Set(allPossibleIds.filter(Boolean))];
                query.campaignId = operator === "is_not" ? { $nin: uniqueIds } : { $in: uniqueIds };
                break;
            }

            case "dateRange":
                if (operator === 'after' && from) {
                    query.createdTime = { $gt: new Date(from) };
                } else if (operator === 'before' && to) {
                    query.createdTime = { $lt: new Date(to) };
                } else if (from && to) {
                    query.createdTime = { $gte: new Date(from), $lte: new Date(to) };
                }
                break;

            // OPD Booking Status — stored in opBookings[].status
            case "opdStatus": {
                if (operator === 'is_empty') {
                    andConditions.push({ $or: [{ opBookings: null }, { opBookings: { $exists: false } }, { opBookings: { $size: 0 } }] });
                    break;
                }
                const escaped = (value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                if (operator === 'is_include') {
                    andConditions.push({ opBookings: { $elemMatch: { status: { $regex: escaped, $options: 'i' } } } });
                } else if (operator === 'is_not') {
                    andConditions.push({ $nor: [{ opBookings: { $elemMatch: { status: { $regex: new RegExp(`^${escaped}$`, 'i') } } } }] });
                } else {
                    andConditions.push({ opBookings: { $elemMatch: { status: { $regex: new RegExp(`^${escaped}$`, 'i') } } } });
                }
                break;
            }

            // IPD Booking Status — stored in ipBookings[].status
            case "ipdStatus": {
                if (operator === 'is_empty') {
                    andConditions.push({ $or: [{ ipBookings: null }, { ipBookings: { $exists: false } }, { ipBookings: { $size: 0 } }] });
                    break;
                }
                const escaped = (value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                if (operator === 'is_include') {
                    andConditions.push({ ipBookings: { $elemMatch: { status: { $regex: escaped, $options: 'i' } } } });
                } else if (operator === 'is_not') {
                    andConditions.push({ $nor: [{ ipBookings: { $elemMatch: { status: { $regex: new RegExp(`^${escaped}$`, 'i') } } } }] });
                } else {
                    andConditions.push({ ipBookings: { $elemMatch: { status: { $regex: new RegExp(`^${escaped}$`, 'i') } } } });
                }
                break;
            }

            // OPD Booking Date — IST-aware day bounds on opBookings[].date
            case "opdDate": {
                if (!from) break;
                const { start: opdStart, end: opdEnd } = dayBoundsIST(from);
                if (operator === 'after') {
                    andConditions.push({ opBookings: { $elemMatch: { date: { $gt: opdEnd } } } });
                } else if (operator === 'before') {
                    andConditions.push({ opBookings: { $elemMatch: { date: { $lt: opdStart } } } });
                } else if (operator === 'custom' && to) {
                    const { end: toEnd } = dayBoundsIST(to);
                    andConditions.push({ opBookings: { $elemMatch: { date: { $gte: opdStart, $lte: toEnd } } } });
                } else {
                    andConditions.push({ opBookings: { $elemMatch: { date: { $gte: opdStart, $lte: opdEnd } } } });
                }
                break;
            }

            // IPD Booking Date — IST-aware day bounds on ipBookings[].date
            case "ipdDate": {
                if (!from) break;
                const { start: ipdStart, end: ipdEnd } = dayBoundsIST(from);
                if (operator === 'after') {
                    andConditions.push({ ipBookings: { $elemMatch: { date: { $gt: ipdEnd } } } });
                } else if (operator === 'before') {
                    andConditions.push({ ipBookings: { $elemMatch: { date: { $lt: ipdStart } } } });
                } else if (operator === 'custom' && to) {
                    const { end: toEnd } = dayBoundsIST(to);
                    andConditions.push({ ipBookings: { $elemMatch: { date: { $gte: ipdStart, $lte: toEnd } } } });
                } else {
                    andConditions.push({ ipBookings: { $elemMatch: { date: { $gte: ipdStart, $lte: ipdEnd } } } });
                }
                break;
            }

            // Lost reason drill-down — status IS the lost reason (displayLabel)
            case "custom_lost_reason": {
                if (value) {
                    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    if (operator === "is_not" || operator === "is not") {
                        andConditions.push({ status: { $not: new RegExp(`^${escaped}$`, 'i') } });
                    } else {
                        andConditions.push({ status: { $regex: new RegExp(`^${escaped}$`, 'i') } });
                    }
                }
                break;
            }

            default:
                // Handle custom fields — flexible name matching
                if (type.startsWith("custom_")) {
                    const fieldName = type.replace("custom_", "");
                    const nameVariants = [
                        fieldName,
                        fieldName.replace(/_/g, ' '),
                        fieldName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                    ];
                    if (operator === 'is_empty') {
                        andConditions.push({ $nor: [{ fieldData: { $elemMatch: { name: { $in: nameVariants }, values: { $exists: true, $not: { $size: 0 } } } } }] });
                    } else if (operator === 'is_include' && value) {
                        const esc = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        andConditions.push({ fieldData: { $elemMatch: { name: { $in: nameVariants }, values: { $elemMatch: { $regex: esc, $options: 'i' } } } } });
                    } else if (value) {
                        const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const elemMatch = {
                            name: { $in: nameVariants },
                            values: { $regex: new RegExp(`^${escaped}$`, 'i') },
                        };
                        if (operator === "is_not" || operator === "is not") {
                            andConditions.push({ $nor: [{ fieldData: { $elemMatch: elemMatch } }] });
                        } else {
                            andConditions.push({ fieldData: { $elemMatch: elemMatch } });
                        }
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
                chartData = await getLostReasonsDistribution(query, parsedFilters);
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
 * Lost statuses are aggregated into a single "Lost" bar.
 */
const getStatusDistribution = async (query) => {
    const lostStages = await LeadStageConfig.find({ stageCategory: "lost", isActive: { $ne: false } }).select("displayLabel");
    const lostLabels = new Set([...lostStages.map(s => s.displayLabel).filter(Boolean), "Lost", "lost"]);

    // If a status filter is already applied, use it as-is; otherwise query everything
    const matchStage = { ...query };
    if (!matchStage.status) delete matchStage.status; // let all statuses through; we group below

    const results = await Lead.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 },
            },
        },
        { $sort: { count: -1 } },
    ]);

    // Separate lost vs non-lost, accumulate lost into one bucket
    let lostTotal = 0;
    const nonLost = [];

    for (const item of results) {
        const label = item._id || "Unknown";
        if (lostLabels.has(label)) {
            lostTotal += item.count;
        } else {
            nonLost.push(item);
        }
    }

    const allItems = [...nonLost];
    if (lostTotal > 0) {
        allItems.push({ _id: "Lost", count: lostTotal });
    }

    const total = allItems.reduce((sum, item) => sum + item.count, 0);

    return allItems.map((item) => ({
        name: item._id || "Unknown",
        count: item.count,
        percentage: total > 0 ? ((item.count / total) * 100).toFixed(2) : 0,
    }));
};

/**
 * Get lost reasons distribution
 */
const getLostReasonsDistribution = async (query, parsedFilters = []) => {
    // If a specific lost_reason drill-down filter is already applied, use query as-is
    const hasLostReasonFilter = parsedFilters.some(f => f.type === "custom_lost_reason");

    let lostQuery;
    if (hasLostReasonFilter) {
        lostQuery = query;
    } else {
        // No specific filter — scope to all lost stages
        const lostStages = await LeadStageConfig.find({ stageCategory: "lost", isActive: { $ne: false } }).select("displayLabel");
        const lostDisplayLabels = lostStages.map(s => s.displayLabel).filter(Boolean);

        if (!lostDisplayLabels.length) return [];

        // Intersect with any existing status filter from the caller
        const existingStatuses = query.status?.$in;
        const effectiveStatuses = existingStatuses
            ? lostDisplayLabels.filter(s => existingStatuses.includes(s))
            : lostDisplayLabels;

        if (!effectiveStatuses.length) return [];

        lostQuery = { ...query, status: { $in: effectiveStatuses } };
    }

    const results = await Lead.aggregate([
        { $match: lostQuery },
        { $group: { _id: "$status", count: { $sum: 1 } } },
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
            .select("stageName displayLabel")
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
                leadStages: leadStages.map((s) => s.displayLabel || s.stageName),
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

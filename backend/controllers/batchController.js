const Lead = require("../models/Lead");
const Campaign = require("../models/Campaign");
const User = require("../models/User");

/**
 * GET /api/v1/batches
 * Aggregate unique form (batch) names from leads.
 */
const getBatches = async (req, res) => {
  try {
    const { search = "", sort = "leadCount_desc", page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const matchStage = { batch: { $exists: true, $ne: "" } };
    if (search.trim()) {
      matchStage.batch = { $regex: search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    }

    const sortStage =
      sort === "name_asc"   ? { _id: 1 } :
      sort === "name_desc"  ? { _id: -1 } :
      sort === "newest"     ? { lastLeadAt: -1 } :
      sort === "oldest"     ? { firstLeadAt: 1 } :
                              { leadCount: -1 };

    const results = await Lead.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$batch",
          leadCount:       { $sum: 1 },
          assignedCount:   { $sum: { $cond: [{ $and: [{ $ne: ["$assignedTo", null] }, { $ne: ["$assignedTo", ""] }] }, 1, 0] } },
          unassignedCount: { $sum: { $cond: [{ $or:  [{ $eq: ["$assignedTo", null] }, { $eq: ["$assignedTo", ""] }] }, 1, 0] } },
          campaignId:  { $first: "$campaignId" },
          firstLeadAt: { $min: "$createdTime" },
          lastLeadAt:  { $max: "$createdTime" },
        },
      },
      { $sort: sortStage },
      {
        $facet: {
          data:  [{ $skip: (pageNum - 1) * limitNum }, { $limit: limitNum }],
          total: [{ $count: "count" }],
        },
      },
    ]);

    const batches = results[0].data;
    const total   = results[0].total[0]?.count || 0;

    // Resolve campaign names
    const campaignIds = [...new Set(batches.map(b => b.campaignId).filter(Boolean))];
    const campaigns   = await Campaign.find({ _id: { $in: campaignIds } }).select("_id name");
    const campMap     = Object.fromEntries(campaigns.map(c => [String(c._id), c.name]));

    const data = batches.map(b => ({
      batchName:       b._id,
      leadCount:       b.leadCount,
      assignedCount:   b.assignedCount,
      unassignedCount: b.unassignedCount,
      campaignId:      b.campaignId || null,
      campaignName:    b.campaignId ? (campMap[String(b.campaignId)] || null) : null,
      firstLeadAt:     b.firstLeadAt,
      lastLeadAt:      b.lastLeadAt,
    }));

    res.json({
      success: true,
      data,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    console.error("[getBatches]", err);
    res.status(500).json({ error: "Failed to fetch batches", details: err.message });
  }
};

/**
 * POST /api/v1/batches/assign
 * Reassign all leads belonging to a batch to selected callers (weighted).
 * Body: { batchName: string, callers: [{ callerId, percentage }] }
 */
const assignBatch = async (req, res) => {
  try {
    const { batchName, callers } = req.body;
    if (!batchName || !Array.isArray(callers) || callers.length === 0) {
      return res.status(400).json({ error: "batchName and callers array are required" });
    }

    // Validate callers exist
    const callerIds = callers.map(c => c.callerId);
    const validCallers = await User.find({ _id: { $in: callerIds } }).select("_id");
    const validIds = new Set(validCallers.map(c => String(c._id)));
    const filtered = callers.filter(c => validIds.has(String(c.callerId)));
    if (filtered.length === 0) {
      return res.status(400).json({ error: "No valid callers found" });
    }

    // Normalize percentages into weights
    const totalPct = filtered.reduce((s, c) => s + (c.percentage || 0), 0);
    const weighted = filtered.map(c => ({
      callerId: c.callerId,
      weight: totalPct > 0 ? (c.percentage || 0) / totalPct : 1 / filtered.length,
    }));

    const leads = await Lead.find({ batch: batchName }).select("_id");
    if (leads.length === 0) return res.json({ success: true, assigned: 0 });

    // Weighted random assignment per lead — group by caller for bulk update
    const grouped = {};
    for (const lead of leads) {
      const r = Math.random();
      let acc = 0;
      let chosen = weighted[0].callerId;
      for (const w of weighted) {
        acc += w.weight;
        if (r <= acc) { chosen = w.callerId; break; }
      }
      const key = String(chosen);
      grouped[key] = grouped[key] || [];
      grouped[key].push(lead._id);
    }

    await Promise.all(
      Object.entries(grouped).map(([callerId, ids]) =>
        Lead.updateMany({ _id: { $in: ids } }, { $set: { assignedTo: callerId } })
      )
    );

    res.json({ success: true, assigned: leads.length, batchName });
  } catch (err) {
    console.error("[assignBatch]", err);
    res.status(500).json({ error: "Failed to assign batch", details: err.message });
  }
};

module.exports = { getBatches, assignBatch };

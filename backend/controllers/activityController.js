// controllers/activityController.js
const LeadActivity = require("../models/LeadActivity");
const Lead = require("../models/Lead");

// Build a flexible query from querystring
function buildQueryParams(qs) {
  const q = {};
  if (qs.lead) q.lead = qs.lead;
  if (qs.actor) q.actor = qs.actor;
  if (qs.action) q.action = qs.action;

  // time range
  if (qs.from || qs.to) {
    q.createdAt = {};
    if (qs.from) q.createdAt.$gte = new Date(qs.from);
    if (qs.to) q.createdAt.$lte = new Date(qs.to);
  }
  return q;
}

/**
 * GET /caller/leads/:id/activity
 * Caller can only read activity for leads assigned to them.
 */
exports.listByLead = async (req, res) => {
  try {
    const callerId = req.user._id;
    const { id } = req.params;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const skip = Math.max(Number(req.query.skip) || 0, 0);

    // Ownership
    const lead = await Lead.findOne({ _id: id, assignedTo: callerId });
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const items = await LeadActivity.find({ lead: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("actor", "name email");

    res.json({
      count: items.length,
      data: items.map(a => ({
        id: a._id,
        action: a.action,
        description: a.description,
        diff: a.diff,
        meta: a.meta,
        actor: a.actor ? { id: a.actor._id, name: a.actor.name, email: a.actor.email } : null,
        createdAt: a.createdAt,
      })),
    });
  } catch (e) {
    console.error("listByLead error:", e);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
};

/**
 * GET /caller/activity/mine
 * Recent activity the caller themselves performed (across their leads).
 */
exports.listMine = async (req, res) => {
  try {
    const actorId = req.user._id;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const skip = Math.max(Number(req.query.skip) || 0, 0);

    const items = await LeadActivity.find({ actor: actorId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      count: items.length,
      data: items.map(a => ({
        id: a._id,
        lead: a.lead,
        action: a.action,
        description: a.description,
        createdAt: a.createdAt,
      })),
    });
  } catch (e) {
    console.error("listMine error:", e);
    res.status(500).json({ error: "Failed to fetch my activities" });
  }
};

/**
 * GET /caller/activity/search
 * Search within caller's own leads (filters: lead, action, from, to).
 */
exports.searchMyLeadActivities = async (req, res) => {
  try {
    const callerId = req.user._id;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const skip = Math.max(Number(req.query.skip) || 0, 0);

    // find leads owned by caller
    const myLeadIds = await Lead.find({ assignedTo: callerId }).distinct("_id");

    const q = buildQueryParams(req.query);
    q.lead = q.lead ? q.lead : { $in: myLeadIds };

    const items = await LeadActivity.find(q)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("actor", "name email");

    res.json({
      count: items.length,
      data: items.map(a => ({
        id: a._id,
        lead: a.lead,
        action: a.action,
        description: a.description,
        diff: a.diff,
        meta: a.meta,
        actor: a.actor ? { id: a.actor._id, name: a.actor.name, email: a.actor.email } : null,
        createdAt: a.createdAt,
      })),
    });
  } catch (e) {
    console.error("searchMyLeadActivities error:", e);
    res.status(500).json({ error: "Failed to search activities" });
  }
};

/**
 * (Optional admin) DELETE /admin/activity/:activityId
 * Guard with your admin auth middleware if you expose this.
 */
exports.deleteActivity = async (req, res) => {
  try {
    const { activityId } = req.params;
    await LeadActivity.deleteOne({ _id: activityId });
    res.json({ message: "Activity deleted" });
  } catch (e) {
    console.error("deleteActivity error:", e);
    res.status(500).json({ error: "Failed to delete activity" });
  }
};

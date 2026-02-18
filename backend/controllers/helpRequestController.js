const HelpRequest = require("../models/HelpRequest");
const Lead = require("../models/Lead");
const User = require("../models/User");
const { safeEmit, room } = require("../utils/socket");

/**
 * POST /caller/help-request
 * Body: { leadId, toCallerId, type: "transfer"|"share", reason? }
 */
const createHelpRequest = async (req, res) => {
  try {
    const io = req.app.get("io");
    const fromCallerId = req.user._id;
    const { leadId, toCallerId, type, reason } = req.body;

    if (!leadId || !toCallerId || !type) {
      return res.status(400).json({ error: "leadId, toCallerId, and type are required" });
    }
    if (!["transfer", "share"].includes(type)) {
      return res.status(400).json({ error: "type must be 'transfer' or 'share'" });
    }
    if (String(fromCallerId) === String(toCallerId)) {
      return res.status(400).json({ error: "Cannot send a help request to yourself" });
    }

    // Verify lead belongs to requesting caller (or caller is admin)
    const { role } = req.user || {};
    const leadQuery = { _id: leadId };
    if (!["admin", "superadmin", "owner"].includes(role)) {
      leadQuery.$or = [{ assignedTo: fromCallerId }, { sharedWith: fromCallerId }];
    }
    const lead = await Lead.findOne(leadQuery);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found or not assigned to you" });
    }

    // Verify target caller exists
    const targetCaller = await User.findById(toCallerId).select("name email role");
    if (!targetCaller) {
      return res.status(404).json({ error: "Target caller not found" });
    }

    // Check no pending request for same lead + toCaller
    const existing = await HelpRequest.findOne({
      lead: leadId,
      toCaller: toCallerId,
      status: "pending",
    });
    if (existing) {
      return res.status(409).json({ error: "A pending request already exists for this lead and caller" });
    }

    const helpRequest = await HelpRequest.create({
      lead: leadId,
      fromCaller: fromCallerId,
      toCaller: toCallerId,
      type,
      reason: reason || "",
    });

    // Extract lead name for the notification
    const leadName = (lead.fieldData || []).find(
      (f) => f.name && f.name.toLowerCase().includes("name")
    )?.values?.[0] || "Unknown Lead";

    // Emit socket event to target caller
    safeEmit(io, "help:request:new", {
      requestId: helpRequest._id,
      lead: { id: lead._id, name: leadName },
      fromCaller: { id: fromCallerId, name: req.user.name || "" },
      type,
      reason: reason || "",
    }, { to: [room.caller(toCallerId)], includeAdmins: false, broadcastOnZero: false });

    res.status(201).json({
      message: "Help request sent",
      request: {
        id: helpRequest._id,
        lead: leadId,
        toCaller: toCallerId,
        type,
        status: "pending",
      },
    });
  } catch (err) {
    console.error("createHelpRequest error:", err);
    res.status(500).json({ error: "Failed to create help request" });
  }
};

/**
 * GET /caller/help-requests
 * Query: ?status=pending (default)
 * Returns incoming requests for current user.
 */
const getIncomingRequests = async (req, res) => {
  try {
    const callerId = req.user._id;
    const status = req.query.status || "pending";

    const requests = await HelpRequest.find({ toCaller: callerId, status })
      .populate("lead", "fieldData status")
      .populate("fromCaller", "name email")
      .sort({ createdAt: -1 });

    const data = requests.map((r) => {
      const leadName = (r.lead?.fieldData || []).find(
        (f) => f.name && f.name.toLowerCase().includes("name")
      )?.values?.[0] || "Unknown Lead";

      return {
        id: r._id,
        lead: { id: r.lead?._id, name: leadName, status: r.lead?.status },
        fromCaller: r.fromCaller ? { id: r.fromCaller._id, name: r.fromCaller.name, email: r.fromCaller.email } : null,
        type: r.type,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt,
      };
    });

    res.json({ count: data.length, data });
  } catch (err) {
    console.error("getIncomingRequests error:", err);
    res.status(500).json({ error: "Failed to fetch help requests" });
  }
};

/**
 * PATCH /caller/help-request/:id/respond
 * Body: { action: "accept"|"reject" }
 */
const respondToRequest = async (req, res) => {
  try {
    const io = req.app.get("io");
    const callerId = req.user._id;
    const { id } = req.params;
    const { action } = req.body;

    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({ error: "action must be 'accept' or 'reject'" });
    }

    const helpRequest = await HelpRequest.findOne({ _id: id, toCaller: callerId, status: "pending" });
    if (!helpRequest) {
      return res.status(404).json({ error: "Help request not found or already responded" });
    }

    const lead = await Lead.findById(helpRequest.lead);
    if (!lead) {
      return res.status(404).json({ error: "Associated lead not found" });
    }

    if (action === "accept") {
      helpRequest.status = "accepted";

      if (helpRequest.type === "share") {
        // Add toCaller to sharedWith (avoid duplicates)
        const alreadyShared = (lead.sharedWith || []).some(
          (uid) => String(uid) === String(callerId)
        );
        if (!alreadyShared) {
          lead.sharedWith.push(callerId);
          await lead.save();
        }
      } else if (helpRequest.type === "transfer") {
        // Remove fromCaller from sharedWith if present, reassign lead
        lead.sharedWith = (lead.sharedWith || []).filter(
          (uid) => String(uid) !== String(helpRequest.fromCaller)
        );
        lead.assignedTo = callerId;
        await lead.save();
      }
    } else {
      helpRequest.status = "rejected";
    }

    await helpRequest.save();

    // Notify the original caller
    safeEmit(io, "help:request:responded", {
      requestId: helpRequest._id,
      leadId: lead._id,
      action,
      type: helpRequest.type,
      byCaller: { id: callerId, name: req.user.name || "" },
    }, { to: [room.caller(helpRequest.fromCaller)], includeAdmins: false, broadcastOnZero: false });

    res.json({
      message: `Help request ${action}ed`,
      request: {
        id: helpRequest._id,
        status: helpRequest.status,
        type: helpRequest.type,
      },
    });
  } catch (err) {
    console.error("respondToRequest error:", err);
    res.status(500).json({ error: "Failed to respond to help request" });
  }
};

/**
 * GET /caller/help-requests/sent
 * Query: ?status=pending (default)
 * Returns outgoing requests sent by current user.
 */
const getSentRequests = async (req, res) => {
  try {
    const callerId = req.user._id;
    const status = req.query.status || "pending";

    const requests = await HelpRequest.find({ fromCaller: callerId, status })
      .populate("lead", "fieldData status")
      .populate("toCaller", "name email")
      .sort({ createdAt: -1 });

    const data = requests.map((r) => {
      const leadName = (r.lead?.fieldData || []).find(
        (f) => f.name && f.name.toLowerCase().includes("name")
      )?.values?.[0] || "Unknown Lead";

      return {
        id: r._id,
        lead: { id: r.lead?._id, name: leadName, status: r.lead?.status },
        toCaller: r.toCaller ? { id: r.toCaller._id, name: r.toCaller.name, email: r.toCaller.email } : null,
        type: r.type,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt,
      };
    });

    res.json({ count: data.length, data });
  } catch (err) {
    console.error("getSentRequests error:", err);
    res.status(500).json({ error: "Failed to fetch sent help requests" });
  }
};

module.exports = {
  createHelpRequest,
  getIncomingRequests,
  respondToRequest,
  getSentRequests,
};

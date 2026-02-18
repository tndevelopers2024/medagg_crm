// controllers/callerController.js
const mongoose = require("mongoose");
const Lead = require("../models/Lead");
const LeadActivity = require("../models/LeadActivity");
const CallLog = require("../models/CallLog");
const { safeEmit, room } = require("../utils/socket");

/* ---------- helpers ---------- */
const pick = (obj = {}, keys = []) =>
  keys.reduce((acc, k) => (obj[k] !== undefined ? ((acc[k] = obj[k]), acc) : acc), {});

// Access control helper: callers see assigned OR shared leads
const callerLeadQuery = (leadId, callerId, role) => {
  const query = { _id: leadId };
  const roleLower = (typeof role === 'string' ? role : '').toLowerCase();
  if (!["admin", "superadmin", "owner"].includes(roleLower)) {
    query.$or = [{ assignedTo: callerId }, { sharedWith: callerId }];
  }
  return query;
};

const OP_FIELDS = ["booked", "date", "time", "hospital", "doctor", "status", "surgery", "payment", "remarks", "doneDate", "fieldData"];
const IP_FIELDS = ["booked", "date", "time", "hospital", "doctor", "caseType", "status", "payment", "remarks", "doneDate", "fieldData"];
const DIAGNOSTIC_FIELDS = ["booked", "date", "time", "hospital", "doctor", "status", "payment", "remarks", "doneDate", "fieldData"];
const VALID_BOOKING_STATUS = new Set(["pending", "booked", "done", "cancelled"]);
const norm = (s = "") => String(s).toLowerCase().trim().replace(/\s+/g, "_");
const sameDate = (a, b) => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return new Date(a).getTime() === new Date(b).getTime();
};

// Build a UTC Date that represents a given IST calendar date at HH:mm (IST)
const atDateIST = (ymd, hour = DEFAULT_FOLLOWUP_HOUR, minute = DEFAULT_FOLLOWUP_MIN) => {
  // ymd can be 'YYYY-MM-DD' or a full ISO/string parseable by Date
  if (typeof ymd === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    const [y, m, d] = ymd.split("-").map((n) => parseInt(n, 10));
    // UTC time when it's 00:00 IST on that Y-M-D
    const istMidnightUtcMs = Date.UTC(y, m - 1, d, 0, 0, 0) - IST_OFFSET_MIN * 60000;
    return new Date(istMidnightUtcMs + (hour * 60 + minute) * 60000);
  }
  // Fall back to native Date parse (accepts full ISO w/ timezone)
  const dt = new Date(ymd);
  return isNaN(+dt) ? null : dt;
};


// ---- Date helpers tuned for IST without extra deps ----
const IST_OFFSET_MIN = 330; // +05:30
const DEFAULT_FOLLOWUP_HOUR = Number(process.env.FOLLOWUP_DEFAULT_HOUR || 10);
const DEFAULT_FOLLOWUP_MIN = Number(process.env.FOLLOWUP_DEFAULT_MIN || 0);

// Return start/end of the given day in IST, as UTC Date objects
const dayBoundsIST = (d = new Date()) => {
  const utcMinutes = Math.floor(d.getTime() / 60000);
  const istMinutes = utcMinutes + IST_OFFSET_MIN;
  const day = Math.floor(istMinutes / 1440);
  const startUtcMin = day * 1440 - IST_OFFSET_MIN; // midnight IST represented in UTC minutes
  const start = new Date(startUtcMin * 60000);
  const end = new Date(start.getTime() + 86399999);
  return { start, end };
};

// Build a UTC Date that represents tomorrow in IST at HH:mm (IST)
const nextDayAtIST = (hour = DEFAULT_FOLLOWUP_HOUR, minute = DEFAULT_FOLLOWUP_MIN) => {
  const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
  const { start } = dayBoundsIST(tomorrow); // IST midnight of tomorrow, represented in UTC
  const dt = new Date(start.getTime() + (hour * 60 + minute) * 60000);
  return dt;
};

// Extract hour/minute in IST from a Date
const getISTHourMinute = (d) => {
  if (!d) return { hr: DEFAULT_FOLLOWUP_HOUR, min: DEFAULT_FOLLOWUP_MIN };
  const totalMinIST = Math.floor(d.getTime() / 60000) + IST_OFFSET_MIN;
  const minInDay = ((totalMinIST % 1440) + 1440) % 1440;
  const hr = Math.floor(minInDay / 60);
  const min = minInDay % 60;
  return { hr, min };
};

// statuses we won't carry forward automatically (terminal)
const TERMINAL_STATUSES = new Set(["converted", "not_interested", "dnp"]);

// io-aware activity logger
const logActivity = async (io, { leadId, actorId, action, description, diff = {}, meta = {} }) => {
  try {
    const a = await LeadActivity.create({ lead: leadId, actor: actorId, action, description, diff, meta });
    safeEmit(
      io,
      "lead:activity",
      {
        leadId,
        activity: {
          id: a._id,
          action: a.action,
          description: a.description,
          diff: a.diff,
          meta: a.meta,
          actor: actorId,
          createdAt: a.createdAt,
        },
      },
      { to: [room.lead(leadId), ...(actorId ? [room.caller(actorId)] : [])] }
    );
  } catch (e) {
    console.error("activity log failed:", e);
  }
};

/* -------- Caller lead lists & details -------- */

const getMyAssignedLeads = async (req, res) => {
  try {
    const callerId = req.user._id;
    const { status, q, page = 1, limit = 20 } = req.query;

    const ownershipFilter = { $or: [{ assignedTo: callerId }, { sharedWith: callerId }] };
    const filter = { ...ownershipFilter };
    if (status) filter.status = status;
    if (q) {
      filter.$and = [
        {
          $or: [
            { "fieldData.values": { $regex: q, $options: "i" } },
            { notes: { $regex: q, $options: "i" } },
          ]
        },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Lead.find(filter).sort({ followUpAt: 1, createdTime: -1 }).skip(skip).limit(Number(limit)),
      Lead.countDocuments(filter),
    ]);

    res.json({
      page: Number(page),
      limit: Number(limit),
      total,
      data: items.map(l => ({
        id: l._id,
        created_time: l.createdTime,
        field_data: l.fieldData,
        status: l.status,
        notes: l.notes,
        followUpAt: l.followUpAt,
        lastCallAt: l.lastCallAt,
        callCount: l.callCount,
        lastCallOutcome: l.lastCallOutcome,
        campaignId: l.campaignId,
      })),
    });
  } catch (err) {
    console.error("getMyAssignedLeads error:", err);
    res.status(500).json({ error: "Failed to fetch assigned leads" });
  }
};

const getLeadDetail = async (req, res) => {
  try {
    const callerId = req.user._id;
    const { id } = req.params;

    const roleName = req.user.roleName || '';
    const query = callerLeadQuery(id, callerId, roleName);

    const lead = await Lead.findOne(query).populate("assignedTo", "name email");
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    // Resolve campaign name
    let campaignName = "Unknown Campaign";
    if (lead.campaignId) {
      const Campaign = require("../models/Campaign");
      const campaign = await Campaign.findOne({
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(lead.campaignId) ? lead.campaignId : null },
          { name: lead.campaignId },
          { "integration.externalId": lead.campaignId },
          { "integration.metaCampaignId": lead.campaignId }
        ]
      }).select("name").lean();
      if (campaign) campaignName = campaign.name;
    }

    res.json({
      id: lead._id,
      created_time: lead.createdTime,
      field_data: lead.fieldData,
      status: lead.status,
      notes: lead.notes,
      followUpAt: lead.followUpAt,
      lastCallAt: lead.lastCallAt,
      callCount: lead.callCount,
      lastCallOutcome: lead.lastCallOutcome,
      campaignId: lead.campaignId,
      campaignName, // Include resolved name
      assignedTo: lead.assignedTo,
      sharedWith: lead.sharedWith || [],
      opBookings: lead.opBookings || [],
      ipBookings: lead.ipBookings || [],
      diagnosticBookings: lead.diagnosticBookings || [],
      documents: lead.documents || [],
    });
  } catch (err) {
    console.error("getLeadDetail error:", err);
    res.status(500).json({ error: "Failed to fetch lead" });
  }
};

/* -------- Update lead basic fields -------- */

const updateLeadStatus = async (req, res) => {
  try {
    const io = req.app.get("io");
    const callerId = req.user._id;
    const { id } = req.params;
    const { status, notes, followUpAt } = req.body;

    const roleName = req.user.roleName || '';
    const query = callerLeadQuery(id, callerId, roleName);

    const lead = await Lead.findOne(query);
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const before = { status: lead.status, notes: lead.notes, followUpAt: lead.followUpAt };

    if (status) {
      const statusChanged = lead.status !== status;
      lead.status = status;
      if (statusChanged) lead.lastStatusChangeAt = new Date();
    }
    if (typeof notes === "string") lead.notes = notes;
    if (followUpAt) lead.followUpAt = new Date(followUpAt);

    await lead.save();

    const after = { status: lead.status, notes: lead.notes, followUpAt: lead.followUpAt };
    const parts = [];
    if (before.status !== after.status) parts.push(`status: ${before.status || "—"} → ${after.status}`);
    if (before.notes !== after.notes) parts.push("notes updated");
    if (!sameDate(before.followUpAt, after.followUpAt)) parts.push(`follow-up: ${before.followUpAt || "—"} → ${after.followUpAt}`);

    if (parts.length) {
      await logActivity(io, {
        leadId: lead._id, actorId: callerId, action: "lead_update",
        description: parts.join(" | "), diff: { before, after },
      });
    }

    safeEmit(io, "lead:status_updated", {
      id: lead._id, status: lead.status, followUpAt: lead.followUpAt, notes: lead.notes,
    }, { to: [room.lead(lead._id), room.caller(callerId)] });

    res.json({ message: "Lead updated", id: lead._id });
  } catch (err) {
    console.error("updateLeadStatus error:", err);
    res.status(500).json({ error: "Failed to update lead" });
  }
};

/* -------- Update lead details & bookings -------- */

const updateLeadDetails = async (req, res) => {
  try {
    const io = req.app.get("io");
    const callerId = req.user._id;
    const { id } = req.params;
    const {
      fieldData, fieldDataUpdates, notes, status, followUpAt,
      opBookingsAdd, opBookingsUpdate, opBookingsRemove,
      ipBookingsAdd, ipBookingsUpdate, ipBookingsRemove,
      diagnosticBookingsAdd, diagnosticBookingsUpdate, diagnosticBookingsRemove,
    } = req.body;

    const roleName = req.user.roleName || '';
    const query = callerLeadQuery(id, callerId, roleName);

    const lead = await Lead.findOne(query);
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const logTasks = [];

    // Replace mode
    if (Array.isArray(fieldData)) {
      const beforeFD = (lead.fieldData || []).map(f => ({ name: f.name, values: f.values }));
      lead.fieldData = fieldData.map((f) => ({
        name: f?.name,
        values: Array.isArray(f?.values) ? f.values.map(String) : (f?.values != null ? [String(f.values)] : []),
      })).filter((f) => f.name && f.values.length);

      const afterFD = lead.fieldData.map(f => ({ name: f.name, values: f.values }));
      logTasks.push(logActivity(io, {
        leadId: lead._id, actorId: callerId, action: "fielddata_replace",
        description: `fieldData replaced (${beforeFD.length} → ${afterFD.length})`,
        diff: { before: beforeFD, after: afterFD },
      }));
    }

    // Merge mode
    if (fieldDataUpdates && typeof fieldDataUpdates === "object") {
      const indexMap = new Map();
      (lead.fieldData || []).forEach((f, idx) => {
        const key = norm(f?.name || "");
        if (key) indexMap.set(key, idx);
      });

      const touched = [];
      const before = {};
      const after = {};

      for (const [k, v] of Object.entries(fieldDataUpdates)) {
        const key = norm(k);
        if (!key) continue;
        const values = Array.isArray(v) ? v.map(String) : (v == null ? [] : [String(v)]);
        if (!values.length) continue;

        if (indexMap.has(key)) {
          const idx = indexMap.get(key);
          before[k] = (lead.fieldData[idx] || {}).values || [];
          lead.fieldData[idx].values = values;
          after[k] = values;
        } else {
          before[k] = [];
          lead.fieldData.push({ name: k, values });
          after[k] = values;
        }
        touched.push(k);
      }

      if (touched.length) {
        logTasks.push(logActivity(io, {
          leadId: lead._id, actorId: callerId, action: "fielddata_merge",
          description: `fieldData merged: ${touched.join(", ")}`,
          diff: { before, after },
        }));
      }
    }

    // OP/IP bookings add/update/remove
    if (Array.isArray(opBookingsAdd)) {
      opBookingsAdd.forEach((p) => {
        const payload = pick(p || {}, OP_FIELDS);
        if (payload.status && !VALID_BOOKING_STATUS.has(payload.status)) return;
        lead.opBookings.push(payload);
      });
    }
    if (Array.isArray(ipBookingsAdd)) {
      ipBookingsAdd.forEach((p) => {
        const payload = pick(p || {}, IP_FIELDS);
        if (payload.status && !VALID_BOOKING_STATUS.has(payload.status)) return;
        lead.ipBookings.push(payload);
      });
    }
    if (Array.isArray(diagnosticBookingsAdd)) {
      diagnosticBookingsAdd.forEach((p) => {
        const payload = pick(p || {}, DIAGNOSTIC_FIELDS);
        if (payload.status && !VALID_BOOKING_STATUS.has(payload.status)) return;
        lead.diagnosticBookings.push(payload);
      });
    }
    if (Array.isArray(opBookingsUpdate)) {
      opBookingsUpdate.forEach((u) => {
        const b = u && (lead.opBookings.id(u._id || u.bookingId));
        if (b) {
          const before = { ...b.toObject() };
          Object.assign(b, pick(u, OP_FIELDS));
          const after = { ...b.toObject() };
          const changed = Object.keys(pick(u, OP_FIELDS)).filter(k => before[k] !== after[k]);
          logTasks.push(logActivity(io, {
            leadId: lead._id, actorId: callerId, action: "op_booking_update",
            description: `OP booking ${String(b._id)} updated: ${changed.join(", ") || "no-op"}`,
            diff: { before, after }, meta: { bookingId: String(b._id) },
          }));
        }
      });
    }
    if (Array.isArray(ipBookingsUpdate)) {
      ipBookingsUpdate.forEach((u) => {
        const b = u && (lead.ipBookings.id(u._id || u.bookingId));
        if (b) {
          const before = { ...b.toObject() };
          Object.assign(b, pick(u, IP_FIELDS));
          const after = { ...b.toObject() };
          const changed = Object.keys(pick(u, IP_FIELDS)).filter(k => before[k] !== after[k]);
          logTasks.push(logActivity(io, {
            leadId: lead._id, actorId: callerId, action: "ip_booking_update",
            description: `IP booking ${String(b._id)} updated: ${changed.join(", ") || "no-op"}`,
            diff: { before, after }, meta: { bookingId: String(b._id) },
          }));
        }
      });
    }
    if (Array.isArray(diagnosticBookingsUpdate)) {
      diagnosticBookingsUpdate.forEach((u) => {
        const b = u && (lead.diagnosticBookings.id(u._id || u.bookingId));
        if (b) {
          const before = { ...b.toObject() };
          Object.assign(b, pick(u, DIAGNOSTIC_FIELDS));
          const after = { ...b.toObject() };
          const changed = Object.keys(pick(u, DIAGNOSTIC_FIELDS)).filter(k => before[k] !== after[k]);
          logTasks.push(logActivity(io, {
            leadId: lead._id, actorId: callerId, action: "diagnostic_booking_update",
            description: `Diagnostic booking ${String(b._id)} updated: ${changed.join(", ") || "no-op"}`,
            diff: { before, after }, meta: { bookingId: String(b._id) },
          }));
        }
      });
    }
    if (Array.isArray(opBookingsRemove) && lead.opBookings?.length) {
      const removed = [];
      lead.opBookings = lead.opBookings.filter(b => {
        const rm = opBookingsRemove.includes(String(b._id));
        if (rm) removed.push({ id: String(b._id), booked: b.booked, hospital: b.hospital, doctor: b.doctor });
        return !rm;
      });
      if (removed.length) {
        logTasks.push(logActivity(io, {
          leadId: lead._id, actorId: callerId, action: "op_booking_remove",
          description: `OP bookings removed: ${removed.map(r => r.id).join(", ")}`,
          meta: { removed },
        }));
      }
    }
    if (Array.isArray(ipBookingsRemove) && lead.ipBookings?.length) {
      const removed = [];
      lead.ipBookings = lead.ipBookings.filter(b => {
        const rm = ipBookingsRemove.includes(String(b._id));
        if (rm) removed.push({ id: String(b._id), booked: b.booked, hospital: b.hospital, doctor: b.doctor });
        return !rm;
      });
      if (removed.length) {
        logTasks.push(logActivity(io, {
          leadId: lead._id, actorId: callerId, action: "ip_booking_remove",
          description: `IP bookings removed: ${removed.map(r => r.id).join(", ")}`,
          meta: { removed },
        }));
      }
    }
    if (Array.isArray(diagnosticBookingsRemove) && lead.diagnosticBookings?.length) {
      const removed = [];
      lead.diagnosticBookings = lead.diagnosticBookings.filter(b => {
        const rm = diagnosticBookingsRemove.includes(String(b._id));
        if (rm) removed.push({ id: String(b._id), booked: b.booked, hospital: b.hospital, doctor: b.doctor });
        return !rm;
      });
      if (removed.length) {
        logTasks.push(logActivity(io, {
          leadId: lead._id, actorId: callerId, action: "diagnostic_booking_remove",
          description: `Diagnostic bookings removed: ${removed.map(r => r.id).join(", ")}`,
          meta: { removed },
        }));
      }
    }

    const beforeBasic = { notes: lead.notes, status: lead.status, followUpAt: lead.followUpAt };
    if (typeof notes === "string") lead.notes = notes;
    if (status) {
      const statusChanged = lead.status !== status;
      lead.status = status;
      if (statusChanged) lead.lastStatusChangeAt = new Date();
    }
    if (followUpAt) lead.followUpAt = new Date(followUpAt);
    const afterBasic = { notes: lead.notes, status: lead.status, followUpAt: lead.followUpAt };

    await lead.save();
    await Promise.all(logTasks);

    const basicParts = [];
    if (beforeBasic.status !== afterBasic.status) basicParts.push(`status: ${beforeBasic.status || "—"} → ${afterBasic.status}`);
    if (beforeBasic.notes !== afterBasic.notes) basicParts.push("notes updated");
    if (!sameDate(beforeBasic.followUpAt, afterBasic.followUpAt)) basicParts.push(`follow-up: ${beforeBasic.followUpAt || "—"} → ${afterBasic.followUpAt}`);

    if (basicParts.length) {
      await logActivity(io, {
        leadId: lead._id, actorId: callerId, action: "lead_update",
        description: basicParts.join(" | "), diff: { before: beforeBasic, after: afterBasic },
      });
    }

    safeEmit(io, "lead:updated", {
      id: lead._id,
      field_data: lead.fieldData,
      status: lead.status,
      notes: lead.notes,
      followUpAt: lead.followUpAt,
      opBookings: lead.opBookings || [],
      ipBookings: lead.ipBookings || [],
    }, { to: [room.lead(lead._id), room.caller(callerId)] });

    res.json({
      message: "Lead details updated",
      id: lead._id,
      field_data: lead.fieldData,
      status: lead.status,
      notes: lead.notes,
      followUpAt: lead.followUpAt,
      opBookings: lead.opBookings || [],
      ipBookings: lead.ipBookings || [],
      diagnosticBookings: lead.diagnosticBookings || [],
    });
  } catch (err) {
    console.error("updateLeadDetails error:", err);
    res.status(500).json({ error: "Failed to update lead details" });
  }
};

/* -------- Call logs -------- */

const logCall = async (req, res) => {
  try {
    const io = req.app.get("io");
    const callerId = req.user._id;
    const { id } = req.params;
    const { durationSec = 0, outcome, notes = "", recordingUrl = "", nextFollowUpAt, setStatus } = req.body;

    const roleName = req.user.roleName || '';
    const query = callerLeadQuery(id, callerId, roleName);

    const lead = await Lead.findOne(query);
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    if (!outcome) return res.status(400).json({ error: "outcome is required" });

    const log = await CallLog.create({ lead: lead._id, caller: callerId, durationSec, outcome, notes, recordingUrl });

    const before = { status: lead.status, followUpAt: lead.followUpAt };
    lead.callCount = (lead.callCount || 0) + 1;
    lead.lastCallAt = new Date();
    lead.lastCallOutcome = outcome;

    if (nextFollowUpAt) lead.followUpAt = new Date(nextFollowUpAt);

    if (setStatus) {
      const changed = lead.status !== setStatus;
      lead.status = setStatus;
      if (changed) lead.lastStatusChangeAt = new Date();
    } else {
      const prev = lead.status;
      if (outcome === "connected") lead.status = "contacted";
      if (outcome === "interested") lead.status = "interested";
      if (outcome === "not_interested") lead.status = "not_interested";
      if (outcome === "converted") lead.status = "converted";
      if (["no_answer", "busy", "switched_off", "callback", "voicemail"].includes(outcome)) {
        lead.status = lead.status === "new" ? "in_progress" : lead.status;
      }
      if (prev !== lead.status) lead.lastStatusChangeAt = new Date();
    }

    await lead.save();

    const after = { status: lead.status, followUpAt: lead.followUpAt };
    await logActivity(io, {
      leadId: lead._id, actorId: callerId, action: "call_logged",
      description:
        `Call logged: outcome=${outcome}, duration=${durationSec}s` +
        (nextFollowUpAt ? `, next follow-up=${new Date(nextFollowUpAt).toISOString()}` : "") +
        (setStatus ? `, status set=${setStatus}` : ""),
      diff: { before, after },
      meta: { callLogId: String(log._id) },
    });

    safeEmit(io, "call:logged", {
      leadId: lead._id,
      call: { id: log._id, durationSec, outcome, notes, recordingUrl, createdAt: new Date() },
      lead: {
        id: lead._id,
        status: lead.status,
        followUpAt: lead.followUpAt,
        callCount: lead.callCount,
        lastCallAt: lead.lastCallAt,
        lastCallOutcome: lead.lastCallOutcome,
      },
    }, { to: [room.lead(lead._id), room.caller(callerId)] });

    res.status(201).json({ message: "Call logged", callLogId: log._id });
  } catch (err) {
    console.error("logCall error:", err);
    res.status(500).json({ error: "Failed to log call" });
  }
};

const getLeadCallLogs = async (req, res) => {
  try {
    const callerId = req.user._id;
    const { id } = req.params;

    const roleName = req.user.roleName || '';
    const query = callerLeadQuery(id, callerId, roleName);

    const lead = await Lead.findOne(query);
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const logs = await CallLog.find({ lead: id, caller: callerId }).sort({ createdAt: -1 });

    res.json({
      count: logs.length,
      data: logs.map(l => ({
        id: l._id,
        timestamp: l.createdAt,
        durationSec: l.durationSec,
        outcome: l.outcome,
        notes: l.notes,
        recordingUrl: l.recordingUrl,
      })),
    });
  } catch (err) {
    console.error("getLeadCallLogs error:", err);
    res.status(500).json({ error: "Failed to fetch call logs" });
  }
};

/* -------- Follow-ups & stats -------- */

const getTodayFollowUps = async (_req, res) => {
  try {
    const callerId = _req.user._id;
    const now = new Date();
    const { start, end } = dayBoundsIST(now);

    const leads = await Lead.find({
      assignedTo: callerId,
      followUpAt: { $gte: start, $lte: end },
    }).sort({ followUpAt: 1 });

    res.json({
      count: leads.length,
      data: leads.map(l => ({
        id: l._id,
        followUpAt: l.followUpAt,
        status: l.status,
        field_data: l.fieldData,
        notes: l.notes,
      })),
    });
  } catch (err) {
    console.error("getTodayFollowUps error:", err);
    res.status(500).json({ error: "Failed to fetch follow-ups" });
  }
};

const getFollowUpsByRange = async (req, res) => {
  try {
    const callerId = req.user._id;
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: "from and to (YYYY-MM-DD) are required" });

    const start = new Date(`${from}T00:00:00.000Z`);
    const end = new Date(`${to}T23:59:59.999Z`);

    const leads = await Lead.find({
      assignedTo: callerId,
      followUpAt: { $gte: start, $lte: end },
    }).sort({ followUpAt: 1 });

    res.json({
      count: leads.length,
      data: leads.map(l => ({
        id: l._id,
        followUpAt: l.followUpAt,
        status: l.status,
        field_data: l.fieldData,
        notes: l.notes,
      })),
    });
  } catch (err) {
    console.error("getFollowUpsByRange error:", err);
    res.status(500).json({ error: "Failed to fetch follow-ups" });
  }
};

const getMyStats = async (req, res) => {
  try {
    const callerId = req.user._id;
    const { start, end } = dayBoundsIST(new Date());

    const opdBookedAgg = Lead.aggregate([
      { $match: { assignedTo: callerId } },
      { $unwind: "$opBookings" },
      { $match: { "opBookings.createdAt": { $gte: start, $lte: end } } },
      { $count: "count" },
    ]);

    const opdDoneAgg = Lead.aggregate([
      { $match: { assignedTo: callerId } },
      { $unwind: "$opBookings" },
      {
        $match: {
          "opBookings.status": "done",
          $or: [
            { "opBookings.doneDate": { $gte: start, $lte: end } },
            {
              "opBookings.doneDate": { $exists: false },
              "opBookings.updatedAt": { $gte: start, $lte: end },
            },
          ],
        },
      },
      { $count: "count" },
    ]);

    const ipdDoneAgg = Lead.aggregate([
      { $match: { assignedTo: callerId } },
      { $unwind: "$ipBookings" },
      {
        $match: {
          "ipBookings.status": "done",
          $or: [
            { "ipBookings.doneDate": { $gte: start, $lte: end } },
            {
              "ipBookings.doneDate": { $exists: false },
              "ipBookings.updatedAt": { $gte: start, $lte: end },
            },
          ],
        },
      },
      { $count: "count" },
    ]);

    const [
      totalAssigned,
      contacted,
      interested,
      converted,
      notInterested,
      inProgress,
      todayNewLeads,
      opdBookedRes,
      opdDoneRes,
      ipdDoneRes,
    ] = await Promise.all([
      Lead.countDocuments({ assignedTo: callerId }),
      Lead.countDocuments({ assignedTo: callerId, status: "contacted" }),
      Lead.countDocuments({ assignedTo: callerId, status: "interested" }),
      Lead.countDocuments({ assignedTo: callerId, status: "converted" }),
      Lead.countDocuments({ assignedTo: callerId, status: "not_interested" }),
      Lead.countDocuments({ assignedTo: callerId, status: "in_progress" }),
      Lead.countDocuments({ assignedTo: callerId, createdTime: { $gte: start, $lte: end } }),
      opdBookedAgg,
      opdDoneAgg,
      ipdDoneAgg,
    ]);

    res.json({
      totalAssigned,
      contacted,
      interested,
      converted,
      notInterested,
      inProgress,
      todayNewLeads,
      opdBookedToday: opdBookedRes[0]?.count || 0,
      opdDoneToday: opdDoneRes[0]?.count || 0,
      ipdDoneToday: ipdDoneRes[0]?.count || 0,
    });
  } catch (err) {
    console.error("getMyStats error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};



const getDashboardStats = async (req, res) => {
  try {
    if (!req.user || !req.user._id) return res.status(401).json({ error: "Unauthorized" });
    const callerId = req.user._id;
    const now = new Date();
    const { start: todayStart, end: todayEnd } = dayBoundsIST(now);

    // Tomorrow bounds
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const { start: tomorrowStart, end: tomorrowEnd } = dayBoundsIST(tomorrow);

    // 1. Calls Made & Duration (Today)
    // We store durationSec in CallLog
    const callStats = await CallLog.aggregate([
      { $match: { caller: callerId, createdAt: { $gte: todayStart, $lte: todayEnd } } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          durationSec: { $sum: "$durationSec" }
        }
      }
    ]);
    const callsMadeToday = callStats[0]?.count || 0;
    const callDurationMin = Math.round((callStats[0]?.durationSec || 0) / 60);

    // 2. Buckets
    // We need to normalize status to buckets: "new lead", "hot", "hot-ip", "prospective", "recapture", "dnp", etc.
    // We'll fetch status counts and map them in code or usually just counts
    const statusCounts = await Lead.aggregate([
      { $match: { assignedTo: callerId } },
      { $group: { _id: { $toLower: "$status" }, count: { $sum: 1 } } }
    ]);

    // Helper to sum up statuses into buckets
    const getCount = (s) => statusCounts.find(x => x._id === s)?.count || 0;
    const buckets = {
      "new lead": getCount("new") + getCount("new lead"),
      "hot": getCount("hot") + getCount("hot lead"),
      "hot-ip": getCount("hot-ip") + getCount("hot ip") + getCount("hot_inpatient"),
      "prospective": getCount("prospective") + getCount("prospect"),
      "recapture": getCount("recapture") + getCount("re-capture"),
      "dnp": getCount("dnp") + getCount("do_not_proceed") + getCount("do_not_disturb") // maybe DND is DNP?
    };

    // 3. Tasks
    // Count: Follow-ups for today OR New leads created today
    const tasksTodayCount = await Lead.countDocuments({
      assignedTo: callerId,
      $or: [
        { followUpAt: { $gte: todayStart, $lte: todayEnd } },
        { createdTime: { $gte: todayStart, $lte: todayEnd } }
      ]
    });
    const tasksTomorrowCount = await Lead.countDocuments({
      assignedTo: callerId,
      followUpAt: { $gte: tomorrowStart, $lte: tomorrowEnd }
    });

    // 4. OP/IP stats (Today)
    // Reuse specific aggregation logic or just count
    // NOTE: This logic mimics getMyStats but efficiently
    const opdBookedToday = await Lead.aggregate([
      { $match: { assignedTo: callerId } },
      { $unwind: "$opBookings" },
      { $match: { "opBookings.createdAt": { $gte: todayStart, $lte: todayEnd } } },
      { $count: "count" }
    ]);

    const opdDoneToday = await Lead.aggregate([
      { $match: { assignedTo: callerId } },
      { $unwind: "$opBookings" },
      {
        $match: {
          "opBookings.status": "done",
          $or: [
            { "opBookings.doneDate": { $gte: todayStart, $lte: todayEnd } },
            { "opBookings.doneDate": { $exists: false }, "opBookings.updatedAt": { $gte: todayStart, $lte: todayEnd } }
          ]
        }
      },
      { $count: "count" }
    ]);

    const ipdBookedToday = await Lead.aggregate([
      { $match: { assignedTo: callerId } },
      { $unwind: "$ipBookings" },
      { $match: { "ipBookings.createdAt": { $gte: todayStart, $lte: todayEnd } } },
      { $count: "count" }
    ]);

    const ipdDoneToday = await Lead.aggregate([
      { $match: { assignedTo: callerId } },
      { $unwind: "$ipBookings" },
      {
        $match: {
          "ipBookings.status": "done",
          $or: [
            { "ipBookings.doneDate": { $gte: todayStart, $lte: todayEnd } },
            { "ipBookings.doneDate": { $exists: false }, "ipBookings.updatedAt": { $gte: todayStart, $lte: todayEnd } }
          ]
        }
      },
      { $count: "count" }
    ]);

    const diagnosticBookedToday = await Lead.aggregate([
      { $match: { assignedTo: callerId } },
      { $unwind: "$diagnosticBookings" },
      { $match: { "diagnosticBookings.createdAt": { $gte: todayStart, $lte: todayEnd } } },
      { $count: "count" }
    ]);

    const diagnosticDoneToday = await Lead.aggregate([
      { $match: { assignedTo: callerId } },
      { $unwind: "$diagnosticBookings" },
      {
        $match: {
          "diagnosticBookings.status": "done",
          $or: [
            { "diagnosticBookings.doneDate": { $gte: todayStart, $lte: todayEnd } },
            { "diagnosticBookings.doneDate": { $exists: false }, "diagnosticBookings.updatedAt": { $gte: todayStart, $lte: todayEnd } }
          ]
        }
      },
      { $count: "count" }
    ]);

    // 5. Today New Leads
    const todayNewLeads = await Lead.countDocuments({
      assignedTo: callerId,
      createdTime: { $gte: todayStart, $lte: todayEnd }
    });

    // 6. Last call time & Idle time
    // We can query the most recent CallLog
    const lastCallLog = await CallLog.findOne({ caller: callerId })
      .sort({ createdAt: -1 })
      .select("createdAt durationSec");

    let lastCallAgoMin = null;
    let idleMin = 0;

    if (lastCallLog) {
      const lastCallStart = lastCallLog.createdAt.getTime();
      const lastCallDurationMs = (lastCallLog.durationSec || 0) * 1000;
      const lastCallEnd = lastCallStart + lastCallDurationMs;

      lastCallAgoMin = Math.max(0, Math.round((now.getTime() - lastCallStart) / 60000));
      idleMin = Math.max(0, Math.round((now.getTime() - lastCallEnd) / 60000));
    }

    res.json({
      callsMadeToday,
      callDurationMin,
      idleMin,
      lastCallAgoMin,
      tasksTodayCount,
      tasksTomorrowCount,
      todayNewLeads,
      opdBookedToday: opdBookedToday[0]?.count || 0,
      opdDoneToday: opdDoneToday[0]?.count || 0,
      ipdBookedToday: ipdBookedToday[0]?.count || 0,
      ipdDoneToday: ipdDoneToday[0]?.count || 0,
      diagnosticBookedToday: diagnosticBookedToday[0]?.count || 0,
      diagnosticDoneToday: diagnosticDoneToday[0]?.count || 0,
      buckets
    });

  } catch (err) {
    console.error("getDashboardStats error:", err);
    res.status(500).json({ error: "Failed to fetch dashboard stats", details: err.message });
  }
};

const getLeadActivities = async (req, res) => {
  try {
    const callerId = req.user._id;
    const { id } = req.params;
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const roleName = req.user.roleName || '';
    const query = callerLeadQuery(id, callerId, roleName);

    const lead = await Lead.findOne(query);
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const items = await LeadActivity.find({ lead: id })
      .sort({ createdAt: -1 })
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
    console.error("getLeadActivities error:", e);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
};

/* -------- New: move to next day (manual) -------- */

const moveLeadToNextDay = async (req, res) => {
  try {
    const io = req.app.get("io");
    const callerId = req.user._id;
    const { id } = req.params;

    // New: optional `date` (string). Accepts 'YYYY-MM-DD' (IST day) or full ISO.
    // Optional `hour`/`minute` (IST). `keepTime` retains existing followUpAt time if present.
    const { date, keepTime = false, hour, minute } = req.body || {};

    const roleName = req.user.roleName || '';
    const query = callerLeadQuery(id, callerId, roleName);

    const lead = await Lead.findOne(query);
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const before = { followUpAt: lead.followUpAt };
    let newFollowUp;

    // Helper to pick IST time safely
    const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
    const pickIstTime = () => {
      if (keepTime && lead.followUpAt) {
        const { hr, min } = getISTHourMinute(new Date(lead.followUpAt));
        return { hr: clamp(hr, 0, 23), min: clamp(min, 0, 59) };
      }
      const hr = Number.isFinite(Number(hour)) ? clamp(Number(hour), 0, 23) : DEFAULT_FOLLOWUP_HOUR;
      const min = Number.isFinite(Number(minute)) ? clamp(Number(minute), 0, 59) : DEFAULT_FOLLOWUP_MIN;
      return { hr, min };
    };

    if (date) {
      // Schedule for specific date
      const { hr, min } = pickIstTime();
      // If 'date' is Y-M-D, interpret as IST day; if full ISO, trust as absolute
      newFollowUp = atDateIST(date, hr, min);
      if (!newFollowUp) return res.status(400).json({ error: "Invalid date format" });
    } else {
      // Backward-compatible: move to tomorrow at given/kept time
      if (keepTime && lead.followUpAt) {
        const { hr, min } = getISTHourMinute(new Date(lead.followUpAt));
        newFollowUp = nextDayAtIST(hr, min);
      } else {
        const hr = Number.isFinite(Number(hour)) ? clamp(Number(hour), 0, 23) : DEFAULT_FOLLOWUP_HOUR;
        const min = Number.isFinite(Number(minute)) ? clamp(Number(minute), 0, 59) : DEFAULT_FOLLOWUP_MIN;
        newFollowUp = nextDayAtIST(hr, min);
      }
    }

    lead.followUpAt = newFollowUp;
    await lead.save();

    await logActivity(io, {
      leadId: lead._id,
      actorId: callerId,
      action: date ? "followup_rescheduled" : "followup_deferred",
      description: date
        ? `Follow-up rescheduled to ${newFollowUp.toISOString()}`
        : `Follow-up moved to next day (${newFollowUp.toISOString()})`,
      diff: { before, after: { followUpAt: newFollowUp } },
      meta: date ? { requestedDate: date, keepTime, hour, minute } : { keepTime, hour, minute },
    });

    safeEmit(
      io,
      "lead:status_updated",
      { id: lead._id, status: lead.status, followUpAt: lead.followUpAt, notes: lead.notes },
      { to: [room.lead(lead._id), room.caller(callerId)] }
    );

    res.json({
      message: date ? "Follow-up rescheduled" : "Follow-up moved to next day",
      followUpAt: lead.followUpAt,
    });
  } catch (e) {
    console.error("moveLeadToNextDay error:", e);
    res.status(500).json({ error: "Failed to reschedule follow-up" });
  }
};


/* -------- New: nightly auto-carry-forward (no status change today) -------- */

const carryForwardUnchangedToday = async (io) => {
  const { start } = dayBoundsIST(new Date());
  const hh = DEFAULT_FOLLOWUP_HOUR, mm = DEFAULT_FOLLOWUP_MIN;

  // candidates: follow-ups scheduled today (IST), not terminal, status didn't change today
  const candidates = await Lead.find({
    followUpAt: { $gte: start, $lte: new Date(start.getTime() + 86399999) },
    status: { $nin: Array.from(TERMINAL_STATUSES) },
    $or: [
      { lastStatusChangeAt: { $exists: false } },
      { lastStatusChangeAt: { $lt: start } },
    ],
  }).select("_id assignedTo followUpAt status notes");

  if (!candidates.length) return { moved: 0 };

  let moved = 0;
  for (const lead of candidates) {
    const before = { followUpAt: lead.followUpAt };
    const newFollowUp = nextDayAtIST(hh, mm);
    lead.followUpAt = newFollowUp;
    await lead.save();

    await logActivity(io, {
      leadId: lead._id,
      actorId: null,
      action: "auto_followup_carry_forward",
      description: `Auto-moved to next day (${newFollowUp.toISOString()})`,
      diff: { before, after: { followUpAt: newFollowUp } },
      meta: { reason: "no_status_change_today" },
    });

    safeEmit(
      io,
      "lead:status_updated",
      { id: lead._id, status: lead.status, followUpAt: lead.followUpAt, notes: lead.notes },
      { to: [room.lead(lead._id)] }
    );

    moved++;
  }

  return { moved };
};

/* -------- Follow-ups: tomorrow (IST) -------- */
const getTomorrowFollowUps = async (req, res) => {
  try {
    const callerId = req.user._id;
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    const { start, end } = dayBoundsIST(tomorrow);

    const leads = await Lead.find({
      assignedTo: callerId,
      followUpAt: { $gte: start, $lte: end },
    }).sort({ followUpAt: 1 });

    res.json({
      count: leads.length,
      data: leads.map((l) => ({
        id: l._id,
        followUpAt: l.followUpAt,
        status: l.status,
        field_data: l.fieldData,
        notes: l.notes,
      })),
    });
  } catch (err) {
    console.error("getTomorrowFollowUps error:", err);
    res.status(500).json({ error: "Failed to fetch tomorrow's follow-ups" });
  }
};

/* -------- Lists: yesterday's assigned leads (IST) -------- */
const getYesterdayAssignedLeads = async (req, res) => {
  try {
    const callerId = req.user._id;
    const { q, page = 1, limit = 20 } = req.query;

    // IST midnight bounds for "yesterday"
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000);
    const { start, end } = dayBoundsIST(yesterday);

    // Prefer assignedAt if your schema has it, fall back to createdTime otherwise
    const assignedWindow = {
      $or: [
        { assignedAt: { $gte: start, $lte: end } },
        {
          $and: [
            { assignedAt: { $exists: false } },
            { createdTime: { $gte: start, $lte: end } },
          ],
        },
      ],
    };

    const filter = {
      assignedTo: callerId,
      $and: [assignedWindow],
    };

    if (q) {
      filter.$and.push({
        $or: [
          { "fieldData.values": { $regex: q, $options: "i" } },
          { notes: { $regex: q, $options: "i" } },
        ],
      });
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Lead.find(filter)
        .sort({ followUpAt: 1, createdTime: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Lead.countDocuments(filter),
    ]);

    res.json({
      page: Number(page),
      limit: Number(limit),
      total,
      data: items.map((l) => ({
        id: l._id,
        created_time: l.createdTime,
        field_data: l.fieldData,
        status: l.status,
        notes: l.notes,
        followUpAt: l.followUpAt,
        lastCallAt: l.lastCallAt,
        callCount: l.callCount,
        lastCallOutcome: l.lastCallOutcome,
      })),
    });
  } catch (err) {
    console.error("getYesterdayAssignedLeads error:", err);
    res.status(500).json({ error: "Failed to fetch yesterday's assigned leads" });
  }
};


module.exports = {
  // lists & detail
  getMyAssignedLeads,
  getLeadDetail,

  // updates
  updateLeadStatus,
  updateLeadDetails,

  // manual defer
  moveLeadToNextDay,

  // bookings
  addOpBooking: async (req, res) => {
    try {
      const io = req.app.get("io");
      const callerId = req.user._id;
      const { id } = req.params;
      const roleName = req.user.roleName || '';

      const query = callerLeadQuery(id, callerId, roleName);

      const lead = await Lead.findOne(query);
      if (!lead) return res.status(404).json({ error: "Lead not found" });

      const payload = pick(req.body || {}, OP_FIELDS);
      if (payload.status && !VALID_BOOKING_STATUS.has(payload.status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      lead.opBookings.push(payload);
      await lead.save();
      const created = lead.opBookings[lead.opBookings.length - 1];

      await logActivity(io, {
        leadId: lead._id, actorId: callerId, action: "op_booking_add",
        description: `OP booking added (${String(created._id)})`,
        diff: { before: null, after: created }, meta: { bookingId: String(created._id) },
      });

      safeEmit(io, "lead:op_booking:add", { leadId: lead._id, booking: created }, { to: room.lead(lead._id) });
      res.status(201).json({ message: "OP booking added", booking: created });
    } catch (e) {
      console.error("addOpBooking error:", e);
      res.status(500).json({ error: "Failed to add OP booking" });
    }
  },
  updateOpBooking: async (req, res) => {
    try {
      const io = req.app.get("io");
      const callerId = req.user._id;
      const { id, bookingId } = req.params;
      const roleName = req.user.roleName || '';

      const query = callerLeadQuery(id, callerId, roleName);

      const lead = await Lead.findOne(query);
      if (!lead) {
        console.log(`[updateOpBooking] Lead not found. ID: ${id}, Query:`, query);
        return res.status(404).json({ error: "Lead not found" });
      }

      console.log(`[updateOpBooking] Lead found: ${lead._id}. Searching for booking: ${bookingId}`);
      console.log(`[updateOpBooking] Available OP bookings:`, lead.opBookings.map(b => String(b._id)));

      const b = lead.opBookings.id(bookingId);
      if (!b) return res.status(404).json({ error: "OP booking not found" });

      const patch = pick(req.body || {}, OP_FIELDS);
      if (patch.status && !VALID_BOOKING_STATUS.has(patch.status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      const before = { ...b.toObject() };
      Object.assign(b, patch);
      await lead.save();
      const after = { ...b.toObject() };
      const changed = Object.keys(patch).filter(k => before[k] !== after[k]);

      await logActivity(io, {
        leadId: lead._id, actorId: callerId, action: "op_booking_update",
        description: `OP booking ${String(b._id)} updated: ${changed.join(", ") || "no-op"}`,
        diff: { before, after }, meta: { bookingId: String(b._id) },
      });

      safeEmit(io, "lead:op_booking:update", { leadId: lead._id, booking: b }, { to: room.lead(lead._id) });
      res.json({ message: "OP booking updated", booking: b });
    } catch (e) {
      console.error("updateOpBooking error:", e);
      res.status(500).json({ error: "Failed to update OP booking" });
    }
  },
  removeOpBooking: async (req, res) => {
    try {
      const io = req.app.get("io");
      const callerId = req.user._id;
      const { id, bookingId } = req.params;
      const roleName = req.user.roleName || '';

      const query = callerLeadQuery(id, callerId, roleName);

      const lead = await Lead.findOne(query);
      if (!lead) return res.status(404).json({ error: "Lead not found" });

      const b = lead.opBookings.id(bookingId);
      if (!b) return res.status(404).json({ error: "OP booking not found" });

      const before = { ...b.toObject() };
      b.deleteOne();
      await lead.save();

      await logActivity(io, {
        leadId: lead._id, actorId: callerId, action: "op_booking_remove",
        description: `OP booking removed (${bookingId})`,
        diff: { before, after: null }, meta: { bookingId },
      });

      safeEmit(io, "lead:op_booking:remove", { leadId: lead._id, bookingId }, { to: room.lead(lead._id) });
      res.json({ message: "OP booking removed" });
    } catch (e) {
      console.error("removeOpBooking error:", e);
      res.status(500).json({ error: "Failed to remove OP booking" });
    }
  },
  addIpBooking: async (req, res) => {
    try {
      const io = req.app.get("io");
      const callerId = req.user._id;
      const { id } = req.params;
      const roleName = req.user.roleName || '';

      const query = callerLeadQuery(id, callerId, roleName);

      const lead = await Lead.findOne(query);
      if (!lead) return res.status(404).json({ error: "Lead not found" });

      const payload = pick(req.body || {}, IP_FIELDS);
      if (payload.status && !VALID_BOOKING_STATUS.has(payload.status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      lead.ipBookings.push(payload);
      await lead.save();
      const created = lead.ipBookings[lead.ipBookings.length - 1];

      await logActivity(io, {
        leadId: lead._id, actorId: callerId, action: "ip_booking_add",
        description: `IP booking added (${String(created._id)})`,
        diff: { before: null, after: created }, meta: { bookingId: String(created._id) },
      });

      safeEmit(io, "lead:ip_booking:add", { leadId: lead._id, booking: created }, { to: room.lead(lead._id) });
      res.status(201).json({ message: "IP booking added", booking: created });
    } catch (e) {
      console.error("addIpBooking error:", e);
      res.status(500).json({ error: "Failed to add IP booking" });
    }
  },
  updateIpBooking: async (req, res) => {
    try {
      const io = req.app.get("io");
      const callerId = req.user._id;
      const { id, bookingId } = req.params;
      const roleName = req.user.roleName || '';

      const query = callerLeadQuery(id, callerId, roleName);

      const lead = await Lead.findOne(query);
      if (!lead) return res.status(404).json({ error: "Lead not found" });

      const b = lead.ipBookings.id(bookingId);
      if (!b) return res.status(404).json({ error: "IP booking not found" });

      const patch = pick(req.body || {}, IP_FIELDS);
      if (patch.status && !VALID_BOOKING_STATUS.has(patch.status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const before = { ...b.toObject() };
      Object.assign(b, patch);
      await lead.save();
      const after = { ...b.toObject() };
      const changed = Object.keys(patch).filter(k => before[k] !== after[k]);

      await logActivity(io, {
        leadId: lead._id, actorId: callerId, action: "ip_booking_update",
        description: `IP booking ${String(b._id)} updated: ${changed.join(", ") || "no-op"}`,
        diff: { before, after }, meta: { bookingId: String(b._id) },
      });

      safeEmit(io, "lead:ip_booking:update", { leadId: lead._id, booking: b }, { to: room.lead(lead._id) });
      res.json({ message: "IP booking updated", booking: b });
    } catch (e) {
      console.error("updateIpBooking error:", e);
      res.status(500).json({ error: "Failed to update IP booking" });
    }
  },
  removeIpBooking: async (req, res) => {
    try {
      const io = req.app.get("io");
      const callerId = req.user._id;
      const { id, bookingId } = req.params;
      const roleName = req.user.roleName || '';

      const query = callerLeadQuery(id, callerId, roleName);

      const lead = await Lead.findOne(query);
      if (!lead) return res.status(404).json({ error: "Lead not found" });

      const b = lead.ipBookings.id(bookingId);
      if (!b) return res.status(404).json({ error: "IP booking not found" });

      const before = { ...b.toObject() };
      b.deleteOne();
      await lead.save();

      await logActivity(io, {
        leadId: lead._id, actorId: callerId, action: "ip_booking_remove",
        description: `IP booking removed (${bookingId})`,
        diff: { before, after: null }, meta: { bookingId },
      });

      safeEmit(io, "lead:ip_booking:remove", { leadId: lead._id, bookingId }, { to: room.lead(lead._id) });
      res.json({ message: "IP booking removed" });
    } catch (e) {
      console.error("removeIpBooking error:", e);
      res.status(500).json({ error: "Failed to remove IP booking" });
    }
  },

  addDiagnosticBooking: async (req, res) => {
    try {
      const io = req.app.get("io");
      const callerId = req.user._id;
      const { id } = req.params;
      const roleName = req.user.roleName || '';

      const query = callerLeadQuery(id, callerId, roleName);

      const lead = await Lead.findOne(query);
      if (!lead) return res.status(404).json({ error: "Lead not found" });

      const payload = pick(req.body || {}, DIAGNOSTIC_FIELDS);
      if (payload.status && !VALID_BOOKING_STATUS.has(payload.status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      lead.diagnosticBookings.push(payload);
      await lead.save();
      const created = lead.diagnosticBookings[lead.diagnosticBookings.length - 1];

      await logActivity(io, {
        leadId: lead._id, actorId: callerId, action: "diagnostic_booking_add",
        description: `Diagnostic booking added (${String(created._id)})`,
        diff: { before: null, after: created }, meta: { bookingId: String(created._id) },
      });

      safeEmit(io, "lead:diagnostic_booking:add", { leadId: lead._id, booking: created }, { to: room.lead(lead._id) });
      res.status(201).json({ message: "Diagnostic booking added", booking: created });
    } catch (e) {
      console.error("addDiagnosticBooking error:", e);
      res.status(500).json({ error: "Failed to add Diagnostic booking" });
    }
  },
  updateDiagnosticBooking: async (req, res) => {
    try {
      const io = req.app.get("io");
      const callerId = req.user._id;
      const { id, bookingId } = req.params;
      const roleName = req.user.roleName || '';

      const query = callerLeadQuery(id, callerId, roleName);

      const lead = await Lead.findOne(query);
      if (!lead) return res.status(404).json({ error: "Lead not found" });

      const b = lead.diagnosticBookings.id(bookingId);
      if (!b) return res.status(404).json({ error: "Diagnostic booking not found" });

      const patch = pick(req.body || {}, DIAGNOSTIC_FIELDS);
      if (patch.status && !VALID_BOOKING_STATUS.has(patch.status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const before = { ...b.toObject() };
      Object.assign(b, patch);
      await lead.save();
      const after = { ...b.toObject() };
      const changed = Object.keys(patch).filter(k => before[k] !== after[k]);

      await logActivity(io, {
        leadId: lead._id, actorId: callerId, action: "diagnostic_booking_update",
        description: `Diagnostic booking ${String(b._id)} updated: ${changed.join(", ") || "no-op"}`,
        diff: { before, after }, meta: { bookingId: String(b._id) },
      });

      safeEmit(io, "lead:diagnostic_booking:update", { leadId: lead._id, booking: b }, { to: room.lead(lead._id) });
      res.json({ message: "Diagnostic booking updated", booking: b });
    } catch (e) {
      console.error("updateDiagnosticBooking error:", e);
      res.status(500).json({ error: "Failed to update Diagnostic booking" });
    }
  },
  removeDiagnosticBooking: async (req, res) => {
    try {
      const io = req.app.get("io");
      const callerId = req.user._id;
      const { id, bookingId } = req.params;
      const roleName = req.user.roleName || '';

      const query = callerLeadQuery(id, callerId, roleName);

      const lead = await Lead.findOne(query);
      if (!lead) return res.status(404).json({ error: "Lead not found" });

      const b = lead.diagnosticBookings.id(bookingId);
      if (!b) return res.status(404).json({ error: "Diagnostic booking not found" });

      const before = { ...b.toObject() };
      b.deleteOne();
      await lead.save();

      await logActivity(io, {
        leadId: lead._id, actorId: callerId, action: "diagnostic_booking_remove",
        description: `Diagnostic booking removed (${bookingId})`,
        diff: { before, after: null }, meta: { bookingId },
      });

      safeEmit(io, "lead:diagnostic_booking:remove", { leadId: lead._id, bookingId }, { to: room.lead(lead._id) });
      res.json({ message: "Diagnostic booking removed" });
    } catch (e) {
      console.error("removeDiagnosticBooking error:", e);
      res.status(500).json({ error: "Failed to remove Diagnostic booking" });
    }
  },



  // calls / follow-ups / stats / activities
  logCall,
  getLeadCallLogs,
  getTodayFollowUps,
  getFollowUpsByRange,
  getMyStats,
  getLeadActivities,
  getTomorrowFollowUps,
  getYesterdayAssignedLeads,
  getDashboardStats, // Added

  // cron helper
  carryForwardUnchangedToday,
};

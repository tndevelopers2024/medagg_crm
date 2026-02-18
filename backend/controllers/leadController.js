// controllers/leadController.js
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Lead = require("../models/Lead");
const { safeEmit, room } = require("../utils/socket");
const User = require("../models/User");
const { getRoleIdByName } = require("../utils/roleHelpers");

/* ---------- helpers ---------- */
const normalizePhone = (raw) => (String(raw || "")).replace(/\D/g, "");
const isValidPhone = (raw) => {
  const d = normalizePhone(raw);
  return d.length >= 7 && d.length <= 15;
};

/**
 * Build a Mongo filter object from query params.
 * Shared between getAllLeads and bulkUpdateByFilter.
 */
const buildLeadFilter = async (query) => {
  const filter = {};
  const {
    status, assignedTo, source, campaignId,
    dateMode, from, to, followup, q,
    callStatus, callCountFrom, callCountTo,
    opdStatus, ipdStatus, diagnostics,
    statusOp, sourceOp, assignedToOp, campaignOp,
    followupOp, opdStatusOp, ipdStatusOp, diagnosticsOp,
  } = query;

  // Status (case-insensitive, supports comma-separated multi-values)
  if (status) {
    const statusValues = status.includes(',') ? status.split(',').filter(Boolean) : [status];
    const regexes = statusValues.map(s => new RegExp(`^${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
    if (statusOp === 'is_not') {
      filter.status = { $nin: regexes };
    } else {
      filter.status = regexes.length === 1 ? { $regex: regexes[0] } : { $in: regexes };
    }
  }

  // Assigned caller (supports comma-separated multi-values)
  if (assignedTo) {
    const callerValues = assignedTo.includes(',') ? assignedTo.split(',').filter(Boolean) : [assignedTo];
    const hasUnassigned = callerValues.some(v => v === 'null' || v === 'Unassigned');
    const realIds = callerValues.filter(v => v !== 'null' && v !== 'Unassigned');
    const isNot = assignedToOp === 'is_not';

    if (isNot) {
      const conditions = [];
      if (hasUnassigned) conditions.push({ assignedTo: { $ne: null } });
      if (realIds.length > 0) conditions.push({ assignedTo: { $nin: realIds } });
      if (conditions.length > 1) {
        filter.$and = filter.$and || [];
        filter.$and.push(...conditions);
      } else if (conditions.length === 1) {
        Object.assign(filter, conditions[0]);
      }
    } else {
      const conditions = [];
      if (hasUnassigned) conditions.push({ assignedTo: null });
      if (realIds.length > 0) conditions.push({ assignedTo: { $in: realIds } });
      if (conditions.length > 1) {
        filter.$and = filter.$and || [];
        filter.$and.push({ $or: conditions });
      } else if (conditions.length === 1) {
        Object.assign(filter, conditions[0]);
      }
    }
  }

  // Source — check both top-level source and fieldData
  if (source) {
    filter.$and = filter.$and || [];
    const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (sourceOp === 'is_not') {
      filter.$and.push({
        $and: [
          { source: { $not: new RegExp(`^${escaped}$`, 'i') } },
          { $nor: [{ fieldData: { $elemMatch: { name: { $regex: /^source$/i }, values: { $regex: new RegExp(`^${escaped}$`, 'i') } } } }] },
        ],
      });
    } else {
      filter.$and.push({
        $or: [
          { source: { $regex: new RegExp(`^${escaped}$`, 'i') } },
          { fieldData: { $elemMatch: { name: { $regex: /^source$/i }, values: { $regex: new RegExp(`^${escaped}$`, 'i') } } } },
        ],
      });
    }
  }

  // Campaign — frontend sends mongo _id(s); leads may store external campaignId
  if (campaignId) {
    const Campaign = require("../models/Campaign");
    const ids = campaignId.includes(',') ? campaignId.split(',').filter(Boolean) : [campaignId];
    const allPossibleIds = [];

    // Search for campaigns matching any of the provided IDs in any of the identifier fields
    const campaigns = await Campaign.find({
      $or: [
        { _id: { $in: ids.filter(id => mongoose.Types.ObjectId.isValid(id)) } },
        { name: { $in: ids } },
        { "integration.externalId": { $in: ids } },
        { "integration.metaCampaignId": { $in: ids } }
      ]
    }).lean();

    // Map all potential identifiers associated with these campaigns
    campaigns.forEach(c => {
      allPossibleIds.push(c._id.toString());
      if (c.name) allPossibleIds.push(c.name);
      if (c.integration?.externalId) allPossibleIds.push(c.integration.externalId);
      if (c.integration?.metaCampaignId) allPossibleIds.push(c.integration.metaCampaignId);
    });

    // Also include the original IDs just in case they are already correct externalIds
    ids.forEach(id => allPossibleIds.push(id));

    const uniqueIds = [...new Set(allPossibleIds.filter(Boolean))];
    if (campaignOp === 'is_not') {
      filter.campaignId = { $nin: uniqueIds };
    } else {
      filter.campaignId = { $in: uniqueIds };
    }
  }

  // Date range
  if (dateMode) {
    const now = new Date();
    const dayStart = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
    const dayEnd = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

    if (dateMode === 'Today') {
      filter.createdTime = { $gte: dayStart(now), $lte: dayEnd(now) };
    } else if (dateMode === 'Yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      filter.createdTime = { $gte: dayStart(y), $lte: dayEnd(y) };
    } else if (dateMode === '7d') {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      filter.createdTime = { $gte: dayStart(d), $lte: dayEnd(now) };
    } else if (dateMode === '30d') {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      filter.createdTime = { $gte: dayStart(d), $lte: dayEnd(now) };
    } else if (dateMode === 'Custom' && from && to) {
      filter.createdTime = {
        $gte: new Date(`${from}T00:00:00`),
        $lte: new Date(`${to}T23:59:59.999`),
      };
    }
  }

  // Follow-up filter
  if (followup && followup !== 'All') {
    const now = new Date();
    const dayStart = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
    const dayEnd = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
    const isNot = followupOp === 'is_not';

    if (followup === 'Scheduled') {
      if (isNot) {
        filter.$and = filter.$and || [];
        filter.$and.push({
          $or: [{ followUpAt: null }, { followUpAt: { $exists: false } }, { followUpAt: { $lte: now } }],
        });
      } else {
        filter.followUpAt = { $gt: now };
      }
    } else if (followup === 'Today') {
      if (isNot) {
        filter.$and = filter.$and || [];
        filter.$and.push({
          $or: [{ followUpAt: { $lt: dayStart(now) } }, { followUpAt: { $gt: dayEnd(now) } }, { followUpAt: null }, { followUpAt: { $exists: false } }],
        });
      } else {
        filter.followUpAt = { $gte: dayStart(now), $lte: dayEnd(now) };
      }
    } else if (followup === 'Tomorrow') {
      const tmr = new Date(now);
      tmr.setDate(tmr.getDate() + 1);
      if (isNot) {
        filter.$and = filter.$and || [];
        filter.$and.push({
          $or: [{ followUpAt: { $lt: dayStart(tmr) } }, { followUpAt: { $gt: dayEnd(tmr) } }, { followUpAt: null }, { followUpAt: { $exists: false } }],
        });
      } else {
        filter.followUpAt = { $gte: dayStart(tmr), $lte: dayEnd(tmr) };
      }
    } else if (followup === 'This Week') {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 7);
      if (isNot) {
        filter.$and = filter.$and || [];
        filter.$and.push({
          $or: [{ followUpAt: { $lt: now } }, { followUpAt: { $gt: weekEnd } }, { followUpAt: null }, { followUpAt: { $exists: false } }],
        });
      } else {
        filter.followUpAt = { $gte: now, $lte: weekEnd };
      }
    } else if (followup === 'Overdue') {
      if (isNot) {
        filter.$and = filter.$and || [];
        filter.$and.push({
          $or: [{ followUpAt: null }, { followUpAt: { $exists: false } }, { followUpAt: { $gte: now } }],
        });
      } else {
        filter.followUpAt = { $lt: now, $ne: null };
      }
    } else if (followup === 'Not Scheduled') {
      filter.$and = filter.$and || [];
      if (isNot) {
        filter.$and.push({ followUpAt: { $ne: null, $exists: true } });
      } else {
        filter.$and.push({
          $or: [{ followUpAt: null }, { followUpAt: { $exists: false } }],
        });
      }
    }
  }

  // Call status filter
  if (callStatus) {
    filter.lastCallOutcome = callStatus;
  }

  // Call count range filter
  if (callCountFrom !== undefined || callCountTo !== undefined) {
    const callCountFilter = {};
    if (callCountFrom !== undefined && callCountFrom !== '') {
      callCountFilter.$gte = parseInt(callCountFrom);
    }
    if (callCountTo !== undefined && callCountTo !== '') {
      callCountFilter.$lte = parseInt(callCountTo);
    }
    if (Object.keys(callCountFilter).length > 0) {
      filter.callCount = callCountFilter;
    }
  }

  // Text search across fieldData values
  if (q && q.trim()) {
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter['fieldData.values'] = { $regex: escaped, $options: 'i' };
  }

  // OPD Status filter
  if (opdStatus && opdStatus !== 'OPD Status') {
    const opdEscaped = opdStatus.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (opdStatusOp === 'is_not') {
      filter.opBookings = {
        $not: { $elemMatch: { status: { $regex: new RegExp(`^${opdEscaped}$`, 'i') } } }
      };
    } else {
      filter.opBookings = {
        $elemMatch: { status: { $regex: new RegExp(`^${opdEscaped}$`, 'i') } }
      };
    }
  }

  // IPD Status filter
  if (ipdStatus && ipdStatus !== 'IPD Status') {
    const ipdEscaped = ipdStatus.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (ipdStatusOp === 'is_not') {
      filter.ipBookings = {
        $not: { $elemMatch: { status: { $regex: new RegExp(`^${ipdEscaped}$`, 'i') } } }
      };
    } else {
      filter.ipBookings = {
        $elemMatch: { status: { $regex: new RegExp(`^${ipdEscaped}$`, 'i') } }
      };
    }
  }

  // Diagnostics filter
  if (diagnostics && diagnostics !== 'Diagnostics') {
    filter.$and = filter.$and || [];
    const diagEscaped = diagnostics.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const diagElemMatch = {
      name: { $regex: /^diagnostic[s]?$|^diagnostic[_ ]?(non|status)$/i },
      values: { $regex: new RegExp(`^${diagEscaped}$`, 'i') }
    };
    if (diagnosticsOp === 'is_not') {
      filter.$and.push({
        $nor: [{ fieldData: { $elemMatch: diagElemMatch } }],
      });
    } else {
      filter.$and.push({
        fieldData: { $elemMatch: diagElemMatch }
      });
    }
  }

  // Generic custom field filters — field__<name>=<value>, fieldOp__<name>=is_not
  for (const key of Object.keys(query)) {
    if (key.startsWith('field__')) {
      const fieldName = key.slice(7);
      const value = query[key];
      const opKey = `fieldOp__${fieldName}`;
      const operator = query[opKey] || 'is';

      if (value) {
        filter.$and = filter.$and || [];
        const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
          filter.$and.push({
            $nor: [{ fieldData: { $elemMatch: elemMatch } }],
          });
        } else {
          filter.$and.push({ fieldData: { $elemMatch: elemMatch } });
        }
      }
    }
  }

  return filter;
};

/* ---------- New: Duplicate Management ---------- */

const findDuplicates = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Aggregation to find duplicates by phone number
    const pipeline = [
      // 1. Unwind fieldData to separate documents per field
      { $unwind: "$fieldData" },
      // 2. Filter only phone_number fields
      { $match: { "fieldData.name": "phone_number" } },
      // 3. Unwind values (phone numbers)
      { $unwind: "$fieldData.values" },
      // 4. Group by phone number
      {
        $group: {
          _id: "$fieldData.values",
          count: { $sum: 1 },
          leads: { $push: { id: "$_id", name: "$fieldData.name", created: "$createdTime", status: "$status" } }
        }
      },
      // 5. Filter groups with more than 1 lead
      { $match: { count: { $gt: 1 } } },
      // 6. Sort by count descending
      { $sort: { count: -1 } }
    ];

    const result = await Lead.aggregate([
      ...pipeline,
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: limit }]
        }
      }
    ]);

    const total = result[0].metadata[0]?.total || 0;
    const groups = result[0].data;

    return res.json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: groups
    });

  } catch (err) {
    console.error("findDuplicates error:", err);
    return res.status(500).json({ error: "Failed to scan for duplicates" });
  }
};

const mergeLeads = async (req, res) => {
  const { primaryId, secondaryIds } = req.body;
  if (!primaryId || !Array.isArray(secondaryIds) || secondaryIds.length === 0) {
    return res.status(400).json({ error: "Invalid primaryId or secondaryIds" });
  }

  const session = await Lead.startSession();
  session.startTransaction();

  try {
    const primary = await Lead.findById(primaryId).session(session);
    if (!primary) throw new Error("Primary lead not found");

    const secondaries = await Lead.find({ _id: { $in: secondaryIds } }).session(session);
    if (secondaries.length !== secondaryIds.length) throw new Error("Some secondary leads not found");

    const notesToAppend = [];
    let bookingsMoved = 0;

    for (const sec of secondaries) {
      // 1. Merge Bookings
      if (sec.opBookings && sec.opBookings.length) {
        primary.opBookings.push(...sec.opBookings);
        bookingsMoved += sec.opBookings.length;
      }
      if (sec.ipBookings && sec.ipBookings.length) {
        primary.ipBookings.push(...sec.ipBookings);
        bookingsMoved += sec.ipBookings.length;
      }

      // 2. Merge Field Data (Only if primary is missing it)
      // This is tricky with arrays. Strategy: IF primary doesn't have the field at all, add it.
      // If primary has it but empty values, take secondary's.
      if (sec.fieldData) {
        sec.fieldData.forEach(secField => {
          const primField = primary.fieldData.find(f => f.name === secField.name);
          if (!primField) {
            primary.fieldData.push(secField);
          } else if (primField.values.length === 0 && secField.values.length > 0) {
            primField.values = secField.values;
          }
        });
      }

      // 3. Collect Notes
      if (sec.notes) {
        notesToAppend.push(`[Merged from ${sec.leadId}]: ${sec.notes}`);
      }

      // 4. Move Activities & Call Logs (Re-parenting)
      // We cannot use session for cross-collection updates easily unless replica set is enabled.
      // Assuming replica set or single node with transaction support.
      // If no transaction support, we just do it.
      await require("../models/LeadActivity").updateMany(
        { lead: sec._id },
        { $set: { lead: primary._id } }
      ).session(session);

      await require("../models/CallLog").updateMany(
        { lead: sec._id },
        { $set: { lead: primary._id } }
      ).session(session);
    }

    // Append collected notes
    if (notesToAppend.length > 0) {
      primary.notes = (primary.notes || "") + "\n\n" + notesToAppend.join("\n");
    }

    await primary.save({ session });

    // Delete secondaries
    await Lead.deleteMany({ _id: { $in: secondaryIds } }).session(session);

    await session.commitTransaction();
    session.endSession();

    return res.json({ success: true, message: `Merged ${secondaryIds.length} leads into primary.`, primaryId });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("mergeLeads error:", err);
    return res.status(500).json({ error: "Merge failed: " + err.message });
  }
};

const bulkUpdateLeads = async (req, res) => {
  const { leadIds, updates } = req.body;
  if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({ error: "No leads selected" });
  }
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ error: "No updates provided" });
  }

  const session = await Lead.startSession();
  session.startTransaction();

  try {
    const io = req.app.get("io");

    // 1. Top-level updates (Status, AssignedTo)
    const topLevelSet = {};
    if (updates.status) topLevelSet.status = updates.status;
    if (updates.assignedTo !== undefined) {
      // Handle "Unassigned" or explicit null
      topLevelSet.assignedTo = updates.assignedTo === "Unassigned" ? null : updates.assignedTo;
    }

    if (Object.keys(topLevelSet).length > 0) {
      await Lead.updateMany({ _id: { $in: leadIds } }, { $set: topLevelSet }).session(session);
    }

    // 2. Field Data Updates (Complex)
    // If we have field updates, we must iterate to ensure "upsert" behavior for nested array items
    if (updates.fieldData && Array.isArray(updates.fieldData) && updates.fieldData.length > 0) {
      console.log('[BULK UPDATE] Field updates requested:', JSON.stringify(updates.fieldData, null, 2));
      const leads = await Lead.find({ _id: { $in: leadIds } }).session(session);
      console.log(`[BULK UPDATE] Processing ${leads.length} leads`);

      for (const lead of leads) {
        let changed = false;
        console.log(`[BULK UPDATE] Lead ${lead._id} has ${lead.fieldData.length} existing fields:`, lead.fieldData.map(f => f.name));

        updates.fieldData.forEach(({ name, value, operation }) => {
          const targetNameLower = String(name).toLowerCase().trim();
          // Find existing field (case-insensitive)
          const field = lead.fieldData.find(f => (f.name || '').toLowerCase() === targetNameLower);

          console.log(`[BULK UPDATE] Looking for field "${name}" (normalized: "${targetNameLower}"), found:`, field ? `YES (${field.name})` : 'NO');

          if (operation === 'clear') {
            if (field) {
              field.values = [];
              changed = true;
              console.log(`[BULK UPDATE] Cleared field "${field.name}"`);
            }
          } else if (operation === 'replace') {
            if (field) {
              // Only update if different to avoid noise
              if (!field.values || field.values[0] !== value) {
                const oldValue = field.values?.[0];
                field.values = [value];
                changed = true;
                console.log(`[BULK UPDATE] Updated field "${field.name}" from "${oldValue}" to "${value}"`);
              } else {
                console.log(`[BULK UPDATE] Field "${field.name}" already has value "${value}", skipping`);
              }
            } else {
              // Create new field - use the name provided by user
              lead.fieldData.push({ name: name, values: [value] });
              changed = true;
              console.log(`[BULK UPDATE] Created new field "${name}" with value "${value}"`);
            }
          }
        });

        if (changed) {
          lead.markModified('fieldData'); // Explicitly mark array modified
          await lead.save({ session });
          console.log(`[BULK UPDATE] Saved changes for lead ${lead._id}`);
        } else {
          console.log(`[BULK UPDATE] No changes for lead ${lead._id}`);
        }
      }
    }

    await session.commitTransaction();
    session.endSession();

    // 3. Notify Sockets (Best effort, outside transaction)
    // We can just trigger a general refresh or try to be granular.
    // For bulk, "leads:bulk_updated" might be better, or just rely on the client refreshing.
    // Re-using 'lead:updated' loop might be spammy for 100 leads.
    // Let's emit a specific bulk event or just let the caller handle refresh.
    // Ideally, emit event:
    safeEmit(io, "leads:bulk_updated", { count: leadIds.length, leadIds }, { broadcastOnZero: true });

    return res.json({ success: true, count: leadIds.length, message: "Leads updated successfully" });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("bulkUpdateLeads error:", err);
    return res.status(500).json({ error: "Bulk update failed: " + err.message });
  }
};

// Bulk update all leads matching a filter (admin only)
const bulkUpdateByFilter = async (req, res) => {
  const { filters, updates } = req.body;
  if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No updates provided" });
  }

  try {
    const io = req.app.get("io");
    const filter = await buildLeadFilter(filters || {});

    // Count matching leads first
    const count = await Lead.countDocuments(filter);
    if (count === 0) {
      return res.status(404).json({ error: "No leads match the current filters" });
    }

    const session = await Lead.startSession();
    session.startTransaction();

    try {
      // 1. Top-level updates (Status, AssignedTo) via updateMany
      const topLevelSet = {};
      if (updates.status) topLevelSet.status = updates.status;
      if (updates.assignedTo !== undefined) {
        topLevelSet.assignedTo = updates.assignedTo === "Unassigned" ? null : updates.assignedTo;
      }

      if (Object.keys(topLevelSet).length > 0) {
        await Lead.updateMany(filter, { $set: topLevelSet }).session(session);
      }

      // 2. Field Data Updates — must iterate for upsert behavior on nested arrays
      if (updates.fieldData && Array.isArray(updates.fieldData) && updates.fieldData.length > 0) {
        const leads = await Lead.find(filter).session(session);

        for (const lead of leads) {
          let changed = false;

          updates.fieldData.forEach(({ name, value, operation }) => {
            const targetNameLower = String(name).toLowerCase().trim();
            const field = lead.fieldData.find(f => (f.name || '').toLowerCase() === targetNameLower);

            if (operation === 'clear') {
              if (field) {
                field.values = [];
                changed = true;
              }
            } else if (operation === 'replace') {
              if (field) {
                if (!field.values || field.values[0] !== value) {
                  field.values = [value];
                  changed = true;
                }
              } else {
                lead.fieldData.push({ name: name, values: [value] });
                changed = true;
              }
            }
          });

          if (changed) {
            lead.markModified('fieldData');
            await lead.save({ session });
          }
        }
      }

      await session.commitTransaction();
      session.endSession();

      // 3. Socket notification
      safeEmit(io, "leads:bulk_updated", { count }, { broadcastOnZero: true });

      return res.json({ success: true, count, message: `${count} leads updated successfully` });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } catch (err) {
    console.error("bulkUpdateByFilter error:", err);
    return res.status(500).json({ error: "Bulk update by filter failed: " + err.message });
  }
};

const makeLeadId = (prefix = "manual") => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/* -----------------------------------------
 * ADMIN/GENERAL: CREATE / INTAKE / IMPORT
 * ----------------------------------------- */

// Manual create (admin)
const createLead = async (req, res) => {
  try {
    const io = req.app.get("io");
    const {
      name, phone, email, notes,
      assignedTo, status, extraFields,
      fieldData: providedFieldData,
      // Expanded fields
      campaignId, adId, adCreativeId,
      followUpAt, lastCallAt, callCount, lastCallOutcome,
      opBookings, ipBookings
    } = req.body || {};

    // Determine which fieldData to use
    let fieldData;

    if (providedFieldData && Array.isArray(providedFieldData) && providedFieldData.length > 0) {
      // Use provided fieldData from frontend
      fieldData = providedFieldData;

      // Validate required fields are present
      const hasName = fieldData.some(f => f.name === "full_name" && f.values?.[0]);
      const hasPhone = fieldData.some(f => f.name === "phone_number" && f.values?.[0]);

      if (!hasName || !hasPhone) {
        return res.status(400).json({ error: "fieldData must include full_name and phone_number" });
      }

      // Validate phone number from fieldData
      const phoneValue = fieldData.find(f => f.name === "phone_number")?.values?.[0];
      if (!isValidPhone(phoneValue)) {
        return res.status(400).json({ error: "Phone number is invalid. Provide 7–15 digits." });
      }
    } else {
      // Fallback: manual construction for backward compatibility
      if (!name || !phone) return res.status(400).json({ error: "Both 'name' and 'phone' are required." });
      if (!isValidPhone(phone)) return res.status(400).json({ error: "Phone number is invalid. Provide 7–15 digits." });

      fieldData = [
        { name: "full_name", values: [String(name)] },
        { name: "phone_number", values: [normalizePhone(phone)] },
      ];
      if (email) fieldData.push({ name: "email", values: [String(email)] });

      if (extraFields && typeof extraFields === "object") {
        for (const [k, v] of Object.entries(extraFields)) {
          if (v == null) continue;
          fieldData.push({ name: String(k), values: Array.isArray(v) ? v.map(String) : [String(v)] });
        }
      }
    }

    const allowedStatuses = [
      "new", "hot", "hot-ip", "prospective", "recapture", "dnp", "opd_booked",
      "in_progress", "contacted", "not_reachable", "not_interested", "interested", "converted",
    ];

    const { getStateFromCity } = require("../utils/cityStateMap");

    // ... existing code ...

    // --- City/State Auto-fill Logic ---
    // Check if we have city but no state in fieldData
    if (fieldData) {
      const cityField = fieldData.find(f => f.name === "city");
      const stateField = fieldData.find(f => f.name === "state");

      if (cityField && cityField.values && cityField.values.length > 0) {
        if (!stateField || !stateField.values || stateField.values.length === 0) {
          // Try to derive state
          const derivedState = getStateFromCity(cityField.values[0]);
          if (derivedState) {
            // Push new state field
            if (!stateField) {
              fieldData.push({ name: "state", values: [derivedState] });
            } else {
              // Update existing empty state field
              stateField.values = [derivedState];
            }
          }
        }
      }
    }
    // ----------------------------------

    const doc = await Lead.create({
      leadId: makeLeadId("manual"),
      createdTime: new Date(),
      fieldData,
      notes: notes || "",
      status: allowedStatuses.includes(status) ? status : undefined,
      assignedTo: assignedTo || null,

      // New fields
      campaignId: campaignId || undefined,
      adId: adId || undefined,
      adCreativeId: adCreativeId || undefined,

      followUpAt: followUpAt ? new Date(followUpAt) : null,
      lastCallAt: lastCallAt ? new Date(lastCallAt) : null,
      callCount: callCount ? Number(callCount) : 0,
      lastCallOutcome: lastCallOutcome || null,

      opBookings: Array.isArray(opBookings) ? opBookings : [],
      ipBookings: Array.isArray(ipBookings) ? ipBookings : [],
      diagnosticBookings: Array.isArray(diagnosticBookings) ? diagnosticBookings : [],
    });

    // Notify assigned caller (if any) & lead room
    safeEmit(io, "lead:created", {
      id: doc._id,
      lead_id: doc.leadId,

      created_time: doc.createdTime,
      status: doc.status,
      assigned_to: doc.assignedTo,
    }, { to: [room.lead(doc._id), doc.assignedTo && room.caller(doc.assignedTo)], });

    return res.status(201).json({
      message: "Lead created",
      data: {
        id: doc._id,
        lead_id: doc.leadId,
        created_time: doc.createdTime,
        field_data: doc.fieldData,
        status: doc.status,
        assigned_to: doc.assignedTo,
        notes: doc.notes,
        // Echo new fields if needed, but client usually reloads or just needs ID
      },
    });
  } catch (err) {
    if (err?.code === 11000 && err?.keyPattern?.leadId) {
      return res.status(409).json({ error: "Lead ID collision, please retry." });
    }
    console.error("Error creating lead:", err);
    return res.status(500).json({ error: "Failed to create lead" });
  }
};

function leadToSocket(doc) {
  const fd = Array.isArray(doc.fieldData) ? doc.fieldData : [];
  const get = (k) => fd.find((f) => f?.name === k)?.values?.[0] || "";

  return {
    id: String(doc._id),
    lead_id: doc.leadId,
    created_time: doc.createdTime,
    status: doc.status || "new",
    assigned_to: doc.assignedTo || null,

    // keep original array for clients that parse field_data/fieldData
    field_data: fd,
    fieldData: fd, // (both keys for compatibility)

    // quick summary for toasts
    summary: {
      name: get("full_name"),
      phone: get("phone_number"),
      source: get("source") || "Website",
      page_name: get("page_name"),
      concern: get("concern"),
    },
  };
}

// Public intake (web form)
const intakeLead = async (req, res) => {
  try {
    const io = req.app.get("io");
    const { name, phone, concern, metadata, source, pageName, _hp } = req.body || {};

    if (_hp) return res.status(400).json({ error: "Bot detected" });
    if (!name || !phone) return res.status(400).json({ error: "Both 'name' and 'phone' are required." });
    if (!isValidPhone(phone)) return res.status(400).json({ error: "Phone number is invalid (7–15 digits)." });

    const fieldData = [
      { name: "full_name", values: [String(name)] },
      { name: "phone_number", values: [normalizePhone(phone)] },
    ];
    if (source) fieldData.push({ name: "source", values: [String(source)] });
    if (pageName) fieldData.push({ name: "page_name", values: [String(pageName)] });
    if (concern) fieldData.push({ name: "concern", values: [String(concern)] });

    if (metadata && typeof metadata === "object") {
      for (const [k, v] of Object.entries(metadata)) {
        if (v == null) continue;
        fieldData.push({ name: `meta_${k}`, values: [String(v)] });
      }
    }

    const doc = await Lead.create({
      leadId: makeLeadId("web"),
      createdTime: new Date(),
      fieldData,
      notes: concern || "",
      status: "new",
      assignedTo: null,
    });

    // ---- SOCKET EMIT (admins + per-lead room, fallback to broadcast if empty) ----
    const payload = leadToSocket(doc);

    // includeAdmins=true by default, so admins will get it.
    // target the specific lead room too (for live lead pages).
    safeEmit(io, "lead:intake", payload, {
      to: room.lead(doc._id),          // "lead:<id>"
      includeAdmins: true,             // send to "admins" room as well
      broadcastOnZero: true,           // if no listeners in rooms, broadcast to all
    });

    // (optional) also emit a generic "lead:created" for any other subscribers
    // safeEmit(io, "lead:created", payload, { includeAdmins: true });

    return res.status(201).json({
      message: "Lead submitted",
      data: { id: doc._id, lead_id: doc.leadId, created_time: doc.createdTime },
    });
  } catch (err) {
    console.error("Error in intakeLead:", err);
    return res.status(500).json({ error: "Failed to submit lead" });
  }
};


const getAllLeads = async (req, res) => {
  try {
    const {
      page: rawPage = 1,
      limit: rawLimit = 20,
    } = req.query;

    const page = Math.max(1, Number(rawPage) || 1);
    const limit = Math.min(100, Math.max(1, Number(rawLimit) || 20));

    // Permission Check
    const permissions = req.user.permissions || [];
    const canViewAll = req.user.isSystemAdmin || permissions.includes("leads.all.view");
    const canViewTeam = permissions.includes("leads.team.view");
    const canViewAssigned = permissions.includes("leads.assigned.view");

    if (!canViewAll && !canViewTeam && !canViewAssigned) {
      return res.status(403).json({ error: "Access denied. Missing permission." });
    }

    // Build filter using shared helper
    const filter = await buildLeadFilter(req.query);

    const isSearching = !!req.query.q;
    const hasSearchPermission = permissions.includes("leads.search.view");

    if (!canViewAll && (!isSearching || !hasSearchPermission)) {
      let allowedIds = [];

      if (canViewTeam) {
        // Fetch teams managed by user
        const Team = require("../models/Team");
        const teams = await Team.find({ managers: req.user._id });
        teams.forEach((t) => allowedIds.push(...t.members));
      }

      // If user has viewAssigned OR if allowedIds is empty (fallback to self)
      // Usually managers also want to see their own data
      if (canViewAssigned || (canViewTeam && allowedIds.length === 0)) {
        allowedIds.push(req.user._id);
      }

      // Allow user to see leads assigned to anyone in allowedIds list
      allowedIds = [...new Set(allowedIds.map((id) => id.toString()))];

      if (allowedIds.length === 0) {
        // Should not happen if fallback is active, but safe guard
        return res.json({ page, limit, total: 0, totalPages: 0, leads: [] });
      }

      // Apply restriction
      if (filter.assignedTo) {
        // Intersect existing filter with allowedIds
        const existing = filter.assignedTo;
        delete filter.assignedTo;
        filter.$and = [
          { assignedTo: existing },
          { assignedTo: { $in: allowedIds } }
        ];
      } else {
        filter.assignedTo = { $in: allowedIds };
      }
    }

    // Projection: exclude only heavy documents array
    const projection = { documents: 0 };

    const [leads, total] = await Promise.all([
      Lead.find(filter, projection)
        .sort({ createdTime: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("assignedTo", "name email"),
      Lead.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Add canViewDetails flag for frontend convenience
    const Team = require("../models/Team");
    const myManagedTeams = await Team.find({ managers: req.user._id });
    const managedMemberIds = new Set(myManagedTeams.flatMap(t => t.members.map(m => m.toString())));

    const leadsWithPermissions = leads.map(l => {
      const leadObj = l.toObject();
      const assignedId = l.assignedTo?._id || l.assignedTo?.id || l.assignedTo;

      leadObj.canViewDetails =
        canViewAll ||
        (assignedId && (String(assignedId) === String(req.user._id) || managedMemberIds.has(String(assignedId))));

      return leadObj;
    });

    res.json({ page, limit, total, totalPages, leads: leadsWithPermissions });
  } catch (err) {
    console.error("getAllLeads error:", err);
    res.status(500).json({ error: "Failed to fetch leads" });
  }
};

const getTodayLeads = async (_req, res) => {
  try {
    const today = new Date();
    const start = new Date(today.setHours(0, 0, 0, 0));
    const end = new Date(today.setHours(23, 59, 59, 999));

    const leads = await Lead.find({ createdTime: { $gte: start, $lte: end } });
    res.status(200).json({
      count: leads.length,
      data: leads.map((lead) => ({
        created_time: lead.createdTime,
        id: lead._id,
        field_data: lead.fieldData,
      })),
    });
  } catch (err) {
    console.error("Error fetching today's leads:", err);
    res.status(500).json({ error: "Failed to fetch today's leads" });
  }
};

const getLeadsByDate = async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: "Missing 'date' query (format: YYYY-MM-DD)" });

  try {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);

    const leads = await Lead.find({ createdTime: { $gte: start, $lte: end } });
    res.status(200).json({
      count: leads.length,
      data: leads.map((lead) => ({
        created_time: lead.createdTime,
        id: lead._id,
        field_data: lead.fieldData,
      })),
    });
  } catch (err) {
    console.error("Error fetching leads by date:", err);
    res.status(500).json({ error: "Failed to fetch leads from database" });
  }
};

// Bulk assign (admin)
const assignLeadsToCaller = async (req, res) => {
  const { leadIds, callerId } = req.body;
  if (!Array.isArray(leadIds) || !leadIds.length) return res.status(400).json({ error: "leadIds must be a non-empty array" });
  if (!callerId) return res.status(400).json({ error: "callerId is required" });

  try {
    const io = req.app.get("io");
    const result = await Lead.updateMany({ _id: { $in: leadIds } }, { $set: { assignedTo: callerId } });

    // Notify the caller and any open lead rooms
    safeEmit(io, "leads:assigned", { callerId, leadIds }, { to: room.caller(callerId) });
    leadIds.forEach((lid) => safeEmit(io, "lead:assigned", { id: lid, callerId }, { to: room.lead(lid) }));

    res.status(200).json({ message: `Assigned ${result.modifiedCount} lead(s) to caller` });
  } catch (err) {
    console.error("Error assigning leads:", err);
    res.status(500).json({ error: "Failed to assign leads" });
  }
};



// Smart assignment: City -> Caller Address/State
// Smart assignment: City -> Caller Address/State
const assignLeadsByLocation = async (req, res) => {
  const { leadIds: inputLeadIds, state, city, callerId } = req.body;

  // Logic: If everything is empty (no IDs, no State, no City), it's a "Global Auto-Match" request.
  // Validation: Only fail if nothing provided AND user didn't imply global (which is just empty inputs)
  // Actually, we can just proceed. If all empty -> Fetch ALL unassigned.

  try {
    const io = req.app.get("io");

    // 1. Fetch leads
    let leads = [];
    if (Array.isArray(inputLeadIds) && inputLeadIds.length > 0) {
      leads = await Lead.find({ _id: { $in: inputLeadIds } });
    } else {
      // Find unassigned leads matching state/city OR all if empty
      const criteria = [
        { assignedTo: null } // Only pick unassigned
      ];

      if (city && city.trim()) {
        criteria.push({
          fieldData: {
            $elemMatch: {
              name: { $in: ["city", "location", "district"] },
              values: { $regex: city.trim(), $options: "i" }
            }
          }
        });
      }

      if (state && state.trim()) {
        criteria.push({
          fieldData: {
            $elemMatch: {
              name: { $in: ["state", "states", "province"] },
              values: { $regex: state.trim(), $options: "i" }
            }
          }
        });
      }

      // If criteria has only 1 element (assignedTo: null), it means no Location filters -> Global Match
      leads = await Lead.find({ $and: criteria });
    }

    if (leads.length === 0) {
      return res.status(200).json({ message: "No unassigned leads found matching criteria.", assignedCount: 0 });
    }

    let assignedCount = 0;

    // --- MODE 1: Specific Caller Assignment ---
    if (callerId) {
      const caller = await User.findById(callerId);
      if (!caller) return res.status(404).json({ error: "Selected caller not found" });

      const idsToAssign = [];
      for (const lead of leads) {
        if (lead.assignedTo) continue; // Skip if already assigned

        lead.assignedTo = caller._id;
        await lead.save();
        idsToAssign.push(lead._id);
        assignedCount++;
      }

      if (assignedCount > 0) {
        // Notify caller
        safeEmit(io, "leads:assigned", { callerId: caller._id, leadIds: idsToAssign }, { to: room.caller(caller._id) });
        // Notify leads
        idsToAssign.forEach(lid => safeEmit(io, "lead:assigned", { id: lid, callerId: caller._id }, { to: room.lead(lid) }));
      }

      return res.status(200).json({
        message: `Assigned ${assignedCount} leads to ${caller.name}.`,
        assignedCount,
      });
    }

    // --- MODE 2: Auto Match (City/State matching) ---
    // Works for both Filtered (if state/city provided) and Global (if empty)

    const callerRoleId = await getRoleIdByName("Caller");
    const callers = await User.find({ role: callerRoleId });
    const assignments = []; // { leadId, callerId }

    for (const lead of leads) {
      if (lead.assignedTo) continue;

      const fieldData = lead.fieldData || [];
      const getVal = (k) => fieldData.find((f) => (f.name || "").toLowerCase() === k)?.values?.[0] || "";

      // Check THIS lead's state (stored as "state" or "states")
      const lState = (getVal("state") || getVal("states") || "").toLowerCase().trim();

      // If lead has no state info, skip (can't route)
      if (!lState) continue;


      // Find callers whose state matches
      const matches = callers.filter((c) => {
        const cStates = (Array.isArray(c.state) ? c.state : [c.state]).filter(Boolean).map(s => String(s).toLowerCase());

        let match = false;
        // Check if lead state is in any of the caller's states
        if (lState && cStates.some(s => s.includes(lState) || lState.includes(s))) match = true;

        return match;
      });

      if (matches.length > 0) {
        // Round-robin or random? Random for simplicity now
        const chosen = matches[Math.floor(Math.random() * matches.length)];

        lead.assignedTo = chosen._id;
        await lead.save();

        assignments.push({ leadId: lead._id, callerId: chosen._id });
        assignedCount++;
      }
    }

    // 3. Notify
    // Group by caller for efficient socket emit
    const byCaller = assignments.reduce((acc, curr) => {
      acc[curr.callerId] = acc[curr.callerId] || [];
      acc[curr.callerId].push(curr.leadId);
      return acc;
    }, {});

    for (const [cid, lids] of Object.entries(byCaller)) {
      safeEmit(io, "leads:assigned", { callerId: cid, leadIds: lids }, { to: room.caller(cid) });
      lids.forEach(lid => safeEmit(io, "lead:assigned", { id: lid, callerId: cid }, { to: room.lead(lid) }));
    }

    return res.status(200).json({
      message: `Assigned ${assignedCount} leads based on location match.`,
      assignedCount,
    });

  } catch (err) {
    console.error("Error in assignLeadsByLocation:", err);
    return res.status(500).json({ error: "Smart assignment failed" });
  }
};

// Legacy/simple: get all leads assigned to the logged-in caller (if you still use /api/v1/leads/assigned)
const getAssignedLeads = async (req, res) => {
  try {
    const callerId = req.user._id;
    const leads = await Lead.find({ assignedTo: callerId })
      .sort({ createdTime: -1 })
      .populate("assignedTo", "name email");
    res.status(200).json({
      count: leads.length,
      data: leads.map((lead) => ({
        created_time: lead.createdTime,
        id: lead._id,
        field_data: lead.fieldData,
      })),
    });
  } catch (err) {
    console.error("Error fetching assigned leads:", err);
    res.status(500).json({ error: "Failed to fetch assigned leads" });
  }
};



// Document Management
const uploadLeadDocument = async (req, res) => {
  try {
    const { id } = req.params;

    // express-fileupload specific: properties on req.files
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.files.file;
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ error: "Invalid file type" });
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      return res.status(400).json({ error: "File too large (>10MB)" });
    }

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    // Ensure directory exists
    const uploadDir = path.join(__dirname, '../uploads/lead_documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate strict unique filename
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${Date.now()}-${safeName}`;
    const targetPath = path.join(uploadDir, filename);

    // move file
    await file.mv(targetPath);

    const doc = {
      name: file.name,
      path: filename,
      mimetype: file.mimetype,
      size: file.size,
      uploadedAt: new Date(),
      uploadedBy: req.user._id,
    };

    lead.documents.push(doc);
    await lead.save();

    res.status(200).json({ success: true, message: "Document uploaded", document: doc });
  } catch (err) {
    console.error("uploadLeadDocument error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
};

const deleteLeadDocument = async (req, res) => {
  try {
    const { id, docId } = req.params;
    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const docIndex = lead.documents.findIndex((d) => String(d._id) === docId);
    if (docIndex === -1) return res.status(404).json({ error: "Document not found" });

    const doc = lead.documents[docIndex];
    // Path resolution needs to match middleware upload path
    const filePath = path.join(__dirname, "../uploads/lead_documents", doc.path);

    // Delete from FS
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from DB
    lead.documents.splice(docIndex, 1);
    await lead.save();

    res.json({ success: true, message: "Document deleted" });
  } catch (err) {
    console.error("deleteLeadDocument error:", err);
    res.status(500).json({ error: "Delete failed" });
  }
};

// Bulk delete (admin)
const deleteLeads = async (req, res) => {
  const { leadIds } = req.body;
  if (!Array.isArray(leadIds) || !leadIds.length) {
    return res.status(400).json({ error: "leadIds must be a non-empty array" });
  }

  try {
    const io = req.app.get("io");
    const result = await Lead.deleteMany({ _id: { $in: leadIds } });

    // Notify clients to remove these leads
    safeEmit(io, "leads:deleted", { leadIds }, { broadcastOnZero: true });

    return res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} leads.`,
      count: result.deletedCount
    });
  } catch (err) {
    console.error("Error deleting leads:", err);
    return res.status(500).json({ error: "Failed to delete leads" });
  }
};



// This part was originally inside module.exports, but the instruction implies it should be outside or handled differently.
// For now, I'm keeping the original structure of the functions as they were defined before the module.exports block.
// The instruction's module.exports block lists these functions as direct references, implying they are defined as const functions.
// I will assume the instruction's module.exports is the definitive list of exports.

const getAdminDashboardStats = async (req, res) => {
  try {
    const CallLog = require("../models/CallLog");

    // Permission check
    // Permission check
    const permissions = req.user.permissions || [];
    const viewAll = req.user.isSystemAdmin || permissions.includes("dashboard.dashboard.view");
    const viewAssigned = permissions.includes("dashboard.dashboard.viewAssigned");

    // Check if user is a manager of any team
    const Team = require("../models/Team");
    const managedTeams = await Team.find({ managers: req.user._id });
    const isManager = managedTeams.length > 0;
    const viewTeam = permissions.includes("leads.team.view") || isManager;

    if (!viewAll && !viewTeam && !viewAssigned) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { scope } = req.query;

    // Determine effective scope based on permissions and request
    let effectiveScope = scope;
    if (!effectiveScope) {
      effectiveScope = viewAll ? "all" : (viewTeam ? "team" : "assigned");
    }

    // Strict validation: Downgrade if unauthorized
    if (effectiveScope === "all" && !viewAll) {
      effectiveScope = viewTeam ? "team" : "assigned";
    }
    if (effectiveScope === "team" && !viewTeam) {
      effectiveScope = "assigned";
    }

    let filterIds = null;
    if (effectiveScope === "team") {
      filterIds = managedTeams.reduce((acc, t) => acc.concat(t.members), []);
      filterIds.push(req.user._id);
    } else if (effectiveScope === "assigned") {
      filterIds = [req.user._id];
    }
    // if effectiveScope is 'all', filterIds remains null (full access)

    const leadMatch = {};
    const callMatch = {};

    if (filterIds !== null) {
      // Ensure unique IDs and cast to ObjectId
      filterIds = [...new Set(filterIds.map(id => id.toString()))].map(id => new mongoose.Types.ObjectId(id));
      leadMatch.assignedTo = { $in: filterIds };
      callMatch.caller = { $in: filterIds };
    }

    const now = new Date();

    // Helper to get IST day bounds
    // Helper to get IST day bounds
    const dayBoundsIST = (date) => {
      const d = new Date(date);
      // Add 5.5 hours to get current IST time
      const istDate = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
      // Reset to midnight IST
      istDate.setUTCHours(0, 0, 0, 0);
      // Subtract 5.5 hours to get corresponding UTC time
      const start = new Date(istDate.getTime() - (5.5 * 60 * 60 * 1000));
      return {
        start,
        end: new Date(start.getTime() + 86399999)
      };
    };

    const { start: todayStart, end: todayEnd } = dayBoundsIST(now);

    // Tomorrow bounds
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const { start: tomorrowStart, end: tomorrowEnd } = dayBoundsIST(tomorrow);

    // 1. Calls Made & Duration (Today)
    const callStats = await CallLog.aggregate([
      { $match: { createdAt: { $gte: todayStart, $lte: todayEnd }, ...callMatch } },
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
    const statusCounts = await Lead.aggregate([
      { $match: leadMatch },
      { $group: { _id: { $toLower: "$status" }, count: { $sum: 1 } } }
    ]);

    const getCount = (s) => statusCounts.find(x => x._id === s)?.count || 0;
    const buckets = {
      "new lead": getCount("new") + getCount("new lead"),
      "hot": getCount("hot") + getCount("hot lead"),
      "hot-ip": getCount("hot-ip") + getCount("hot ip") + getCount("hot_inpatient"),
      "prospective": getCount("prospective") + getCount("prospect"),
      "recapture": getCount("recapture") + getCount("re-capture"),
      "dnp": getCount("dnp") + getCount("do_not_proceed") + getCount("do not disturb")
    };

    // 3. Tasks
    const tasksTodayCount = await Lead.countDocuments({
      ...leadMatch,
      $or: [
        { followUpAt: { $gte: todayStart, $lte: todayEnd } },
        { createdTime: { $gte: todayStart, $lte: todayEnd } }
      ]
    });

    const tasksTomorrowCount = await Lead.countDocuments({
      ...leadMatch,
      followUpAt: { $gte: tomorrowStart, $lte: tomorrowEnd }
    });

    // 4. OP/IP stats (Today) - Fix duplicates by grouping
    const opdBookedToday = await Lead.aggregate([
      { $match: leadMatch },
      { $unwind: "$opBookings" },
      { $match: { "opBookings.createdAt": { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: "$_id" } }, // Deduplicate by Lead ID
      { $count: "count" }
    ]);

    const opdDoneToday = await Lead.aggregate([
      { $match: leadMatch },
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
      { $group: { _id: "$_id" } },
      { $count: "count" }
    ]);

    const ipdDoneToday = await Lead.aggregate([
      { $match: leadMatch },
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
      { $group: { _id: "$_id" } },
      { $count: "count" }
    ]);

    const diagnosticBookedToday = await Lead.aggregate([
      { $match: leadMatch },
      { $unwind: "$diagnosticBookings" },
      { $match: { "diagnosticBookings.createdAt": { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: "$_id" } },
      { $count: "count" }
    ]);

    const diagnosticDoneToday = await Lead.aggregate([
      { $match: leadMatch },
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
      { $group: { _id: "$_id" } },
      { $count: "count" }
    ]);

    // 5. Today New Leads
    const todayNewLeads = await Lead.countDocuments({
      ...leadMatch,
      createdTime: { $gte: todayStart, $lte: todayEnd }
    });

    // 6. Average idle time across all callers (optional - can be complex)
    // For now, we'll skip individual caller idle times and focus on aggregates

    res.json({
      callsMadeToday,
      callDurationMin,
      tasksTodayCount,
      tasksTomorrowCount,
      todayNewLeads,
      opdBookedToday: opdBookedToday[0]?.count || 0,
      opdDoneToday: opdDoneToday[0]?.count || 0,
      ipdDoneToday: ipdDoneToday[0]?.count || 0,
      diagnosticBookedToday: diagnosticBookedToday[0]?.count || 0,
      diagnosticDoneToday: diagnosticDoneToday[0]?.count || 0,
      buckets
    });

  } catch (err) {
    console.error("getAdminDashboardStats error:", err);
    res.status(500).json({ error: "Failed to fetch admin dashboard stats", details: err.message });
  }
};

const getAdminActivityStats = async (req, res) => {
  try {
    const CallLog = require("../models/CallLog");
    const User = require("../models/User");
    const now = new Date();

    // Helper to get IST day bounds
    const dayBoundsIST = (date) => {
      const d = new Date(date);
      const offset = 5.5 * 60; // IST offset in minutes
      const utcMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const istMidnight = new Date(utcMidnight.getTime() - offset * 60 * 1000);
      return {
        start: istMidnight,
        end: new Date(istMidnight.getTime() + 86399999)
      };
    };

    const { start: todayStart, end: todayEnd } = dayBoundsIST(now);

    // Get all callers
    const callerRoleId2 = await getRoleIdByName("Caller");
    const callers = await User.find({ role: callerRoleId2 }).select("_id name email");

    // Build activity stats for each caller
    const callerStats = await Promise.all(callers.map(async (caller) => {
      const callerId = caller._id;

      // 1. Calls and Duration (today)
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
      const calls = callStats[0]?.count || 0;
      const durationSec = callStats[0]?.durationSec || 0;

      // Format duration as "1h 23m" or "45m" or "0s"
      const formatDuration = (sec) => {
        if (sec === 0) return "0s";
        const hours = Math.floor(sec / 3600);
        const minutes = Math.floor((sec % 3600) / 60);
        if (hours > 0) return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
        return `${minutes}m`;
      };
      const duration = formatDuration(durationSec);

      // 2. Revenue (from OPD/IPD bookings payment field)
      const revenueAgg = await Lead.aggregate([
        { $match: { assignedTo: callerId } },
        {
          $project: {
            opPayments: {
              $map: {
                input: { $ifNull: ["$opBookings", []] },
                as: "booking",
                in: { $toDouble: { $ifNull: ["$$booking.payment", 0] } }
              }
            },
            ipPayments: {
              $map: {
                input: { $ifNull: ["$ipBookings", []] },
                as: "booking",
                in: { $toDouble: { $ifNull: ["$$booking.payment", 0] } }
              }
            },
            diagnosticPayments: {
              $map: {
                input: { $ifNull: ["$diagnosticBookings", []] },
                as: "booking",
                in: { $toDouble: { $ifNull: ["$$booking.payment", 0] } }
              }
            },
            diagnosticPayments: {
              $map: {
                input: { $ifNull: ["$diagnosticBookings", []] },
                as: "booking",
                in: { $toDouble: { $ifNull: ["$$booking.payment", 0] } }
              }
            },
            diagnosticPayments: {
              $map: {
                input: { $ifNull: ["$diagnosticBookings", []] },
                as: "booking",
                in: { $toDouble: { $ifNull: ["$$booking.payment", 0] } }
              }
            }
          }
        },
        {
          $project: {
            totalPayment: {
              $add: [
                { $sum: "$opPayments" },
                { $sum: "$ipPayments" },
                { $sum: "$diagnosticPayments" }
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            revenue: { $sum: "$totalPayment" }
          }
        }
      ]);
      const revenue = Math.round(revenueAgg[0]?.revenue || 0);

      // 3. Follow-ups breakdown
      const allLeads = await Lead.find({ assignedTo: callerId }).select("followUpAt status");

      let upcoming = 0, late = 0, done = 0, cancel = 0;

      allLeads.forEach(lead => {
        if (lead.followUpAt) {
          const fuDate = new Date(lead.followUpAt);
          if (fuDate > now) {
            upcoming++;
          } else if (fuDate < now) {
            // Check if it's done or still late
            if (["converted", "opd done", "ipd done", "opd_done", "ipd_done"].includes((lead.status || "").toLowerCase())) {
              done++;
            } else if (["dnp", "do_not_proceed", "not_interested"].includes((lead.status || "").toLowerCase())) {
              cancel++;
            } else {
              late++;
            }
          }
        }
      });

      // 4. Leads by stage
      const stageMap = {
        fresh: 0,
        active: 0,
        won: 0,
        lost: 0
      };

      const stageCounts = await Lead.aggregate([
        { $match: { assignedTo: callerId } },
        { $group: { _id: { $toLower: "$status" }, count: { $sum: 1 } } }
      ]);

      stageCounts.forEach(s => {
        const status = s._id;
        const count = s.count;

        // Map statuses to stages
        if (["new", "new lead"].includes(status)) {
          stageMap.fresh += count;
        } else if (["in_progress", "contacted", "interested", "hot", "hot lead", "prospective"].includes(status)) {
          stageMap.active += count;
        } else if (["converted", "opd done", "ipd done", "opd_done", "ipd_done"].includes(status)) {
          stageMap.won += count;
        } else if (["not_interested", "dnp", "do_not_proceed"].includes(status)) {
          stageMap.lost += count;
        }
      });

      return {
        id: caller._id.toString(),
        name: caller.name,
        email: caller.email,
        calls,
        duration,
        durationSec,
        revenue,
        followUps: {
          upcoming,
          late,
          done,
          cancel
        },
        leadsByStage: stageMap
      };
    }));

    // Calculate totals
    const totals = {
      calls: callerStats.reduce((sum, c) => sum + c.calls, 0),
      durationSec: callerStats.reduce((sum, c) => sum + c.durationSec, 0),
      revenue: callerStats.reduce((sum, c) => sum + c.revenue, 0),
      followUps: {
        upcoming: callerStats.reduce((sum, c) => sum + c.followUps.upcoming, 0),
        late: callerStats.reduce((sum, c) => sum + c.followUps.late, 0),
        done: callerStats.reduce((sum, c) => sum + c.followUps.done, 0),
        cancel: callerStats.reduce((sum, c) => sum + c.followUps.cancel, 0)
      },
      leadsByStage: {
        fresh: callerStats.reduce((sum, c) => sum + c.leadsByStage.fresh, 0),
        active: callerStats.reduce((sum, c) => sum + c.leadsByStage.active, 0),
        won: callerStats.reduce((sum, c) => sum + c.leadsByStage.won, 0),
        lost: callerStats.reduce((sum, c) => sum + c.leadsByStage.lost, 0)
      }
    };

    // Format total duration
    const formatDuration = (sec) => {
      if (sec === 0) return "0s";
      const hours = Math.floor(sec / 3600);
      const minutes = Math.floor((sec % 3600) / 60);
      if (hours > 0) return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
      return `${minutes}m`;
    };
    totals.duration = formatDuration(totals.durationSec);

    res.json({
      callers: callerStats,
      totals
    });

  } catch (err) {
    console.error("getAdminActivityStats error:", err);
    res.status(500).json({ error: "Failed to fetch admin activity stats", details: err.message });
  }
};

const getCallerDetailStats = async (req, res) => {
  try {
    const CallLog = require("../models/CallLog");
    const User = require("../models/User");
    const { callerId } = req.params;
    const now = new Date();

    // Helper to get IST day bounds
    const dayBoundsIST = (date) => {
      const d = new Date(date);
      const offset = 5.5 * 60; // IST offset in minutes
      const utcMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const istMidnight = new Date(utcMidnight.getTime() - offset * 60 * 1000);
      return {
        start: istMidnight,
        end: new Date(istMidnight.getTime() + 86399999)
      };
    };

    const { start: todayStart, end: todayEnd } = dayBoundsIST(now);

    // Get caller info
    const caller = await User.findById(callerId).select("_id name email");
    if (!caller) {
      return res.status(404).json({ error: "Caller not found" });
    }

    // 1. Total calls and duration (all time)
    const allCallStats = await CallLog.aggregate([
      { $match: { caller: caller._id } },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          totalDurationSec: { $sum: "$durationSec" }
        }
      }
    ]);
    const totalCalls = allCallStats[0]?.totalCalls || 0;
    const totalDurationSec = allCallStats[0]?.totalDurationSec || 0;

    // Format duration
    const formatDuration = (sec) => {
      if (sec === 0) return "0s";
      const hours = Math.floor(sec / 3600);
      const minutes = Math.floor((sec % 3600) / 60);
      if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}h`;
      return `${minutes}m`;
    };
    const totalDuration = formatDuration(totalDurationSec);

    // 2. First and last call times
    const firstCallLog = await CallLog.findOne({ caller: caller._id })
      .sort({ createdAt: 1 })
      .select("createdAt");
    const lastCallLog = await CallLog.findOne({ caller: caller._id })
      .sort({ createdAt: -1 })
      .select("createdAt");

    const firstCall = firstCallLog ? firstCallLog.createdAt : null;
    const lastCall = lastCallLog ? lastCallLog.createdAt : null;

    // 3. Revenue (from OPD/IPD bookings)
    const revenueAgg = await Lead.aggregate([
      { $match: { assignedTo: caller._id } },
      {
        $project: {
          opPayments: {
            $map: {
              input: { $ifNull: ["$opBookings", []] },
              as: "booking",
              in: { $toDouble: { $ifNull: ["$$booking.payment", 0] } }
            }
          },
          ipPayments: {
            $map: {
              input: { $ifNull: ["$ipBookings", []] },
              as: "booking",
              in: { $toDouble: { $ifNull: ["$$booking.payment", 0] } }
            }
          },
          diagnosticPayments: {
            $map: {
              input: { $ifNull: ["$diagnosticBookings", []] },
              as: "booking",
              in: { $toDouble: { $ifNull: ["$$booking.payment", 0] } }
            }
          }
        }
      },
      {
        $project: {
          totalPayment: {
            $add: [
              { $sum: "$opPayments" },
              { $sum: "$ipPayments" }
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          sales: { $sum: "$totalPayment" }
        }
      }
    ]);
    const sales = Math.round(revenueAgg[0]?.sales || 0);

    // 4. Calls by hour (today) for chart
    const callsByHourAgg = await CallLog.aggregate([
      { $match: { caller: caller._id, createdAt: { $gte: todayStart, $lte: todayEnd } } },
      {
        $project: {
          // Convert to IST by adding 5.5 hours (330 minutes)
          istDate: { $add: ["$createdAt", 330 * 60 * 1000] },
        }
      },
      {
        $project: {
          hour: { $hour: "$istDate" }
        }
      },
      {
        $group: {
          _id: "$hour",
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Create 24-hour array with counts
    const callsByHour = Array.from({ length: 24 }, (_, i) => {
      const hourData = callsByHourAgg.find(h => h._id === i);
      const hour12 = i === 0 ? 12 : i > 12 ? i - 12 : i;
      const ampm = i < 12 ? "AM" : "PM";
      return {
        hour: `${hour12.toString().padStart(2, '0')} ${ampm}`,
        count: hourData?.count || 0
      };
    });

    // 5. Tasks breakdown
    const allLeads = await Lead.find({ assignedTo: caller._id }).select("followUpAt status createdTime");

    let late = 0, pending = 0, done = 0, created = 0;

    allLeads.forEach(lead => {
      // Created today
      if (lead.createdTime && lead.createdTime >= todayStart && lead.createdTime <= todayEnd) {
        created++;
      }

      // Follow-ups
      if (lead.followUpAt) {
        const fuDate = new Date(lead.followUpAt);
        if (fuDate > now) {
          pending++;
        } else if (fuDate < now) {
          if (["converted", "opd done", "ipd done", "opd_done", "ipd_done"].includes((lead.status || "").toLowerCase())) {
            done++;
          } else if (!["dnp", "do_not_proceed", "not_interested"].includes((lead.status || "").toLowerCase())) {
            late++;
          }
        }
      }
    });

    const tasks = { late, pending, done, created };

    // 6. Lead stages
    const stageCounts = await Lead.aggregate([
      { $match: { assignedTo: caller._id } },
      { $group: { _id: { $toLower: "$status" }, count: { $sum: 1 } } }
    ]);

    const leadsByStage = {
      fresh: 0,
      active: 0,
      won: 0,
      lost: 0
    };

    stageCounts.forEach(s => {
      const status = s._id;
      const count = s.count;

      if (["new", "new lead"].includes(status)) {
        leadsByStage.fresh += count;
      } else if (["in_progress", "contacted", "interested", "hot", "hot lead", "prospective"].includes(status)) {
        leadsByStage.active += count;
      } else if (["converted", "opd done", "ipd done", "opd_done", "ipd_done"].includes(status)) {
        leadsByStage.won += count;
      } else if (["not_interested", "dnp", "do_not_proceed"].includes(status)) {
        leadsByStage.lost += count;
      }
    });

    // 7. Recent leads (top 10)
    const recentLeads = await Lead.find({ assignedTo: caller._id })
      .sort({ createdTime: -1 })
      .limit(10)
      .select("_id fieldData status createdTime");

    const recentLeadsFormatted = recentLeads.map(lead => {
      const nameField = (lead.fieldData || []).find(f =>
        /(full_name|^name$|lead_name|first_name)/.test((f?.name || "").toLowerCase())
      );
      const phoneField = (lead.fieldData || []).find(f =>
        /(phone_number|phone|mobile|contact)/.test((f?.name || "").toLowerCase())
      );

      return {
        id: lead._id.toString(),
        name: nameField?.values?.[0] || "—",
        phone: phoneField?.values?.[0] || "—",
        status: lead.status || "new",
        createdTime: lead.createdTime
      };
    });

    res.json({
      caller: {
        id: caller._id.toString(),
        name: caller.name,
        email: caller.email
      },
      stats: {
        totalCalls,
        totalDuration,
        firstCall,
        lastCall,
        sales
      },
      callsByHour,
      tasks,
      leadsByStage,
      recentLeads: recentLeadsFormatted
    });

  } catch (err) {
    console.error("getCallerDetailStats error:", err);
    res.status(500).json({ error: "Failed to fetch caller detail stats", details: err.message });
  }
};

/* ---------- Dashboard V2 ---------- */

const resolveDateRange = (preset, from, to) => {
  const now = new Date();
  const offset = 5.5 * 60; // IST offset in minutes

  const dayBoundsIST = (date) => {
    const d = new Date(date);
    const istDate = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
    istDate.setUTCHours(0, 0, 0, 0);
    const start = new Date(istDate.getTime() - (5.5 * 60 * 60 * 1000));
    return {
      start,
      end: new Date(start.getTime() + 86399999),
    };
  };

  switch (preset) {
    case "yesterday": {
      const y = new Date(now.getTime() - 86400000);
      return dayBoundsIST(y);
    }
    case "this_week": {
      const d = new Date(now);
      const day = d.getDay() || 7; // Mon=1
      d.setDate(d.getDate() - day + 1);
      return { start: dayBoundsIST(d).start, end: dayBoundsIST(now).end };
    }
    case "last_week": {
      const d = new Date(now);
      const day = d.getDay() || 7;
      const thisMonday = new Date(d);
      thisMonday.setDate(d.getDate() - day + 1);
      const lastMonday = new Date(thisMonday.getTime() - 7 * 86400000);
      const lastSunday = new Date(thisMonday.getTime() - 86400000);
      return { start: dayBoundsIST(lastMonday).start, end: dayBoundsIST(lastSunday).end };
    }
    case "this_month": {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: dayBoundsIST(first).start, end: dayBoundsIST(now).end };
    }
    case "last_month": {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: dayBoundsIST(first).start, end: dayBoundsIST(last).end };
    }
    case "custom": {
      if (from && to) {
        return { start: dayBoundsIST(new Date(from)).start, end: dayBoundsIST(new Date(to)).end };
      }
      return dayBoundsIST(now);
    }
    default: // "today"
      return dayBoundsIST(now);
  }
};

const getAdminDashboardV2 = async (req, res) => {
  try {
    const CallLog = require("../models/CallLog");
    const Campaign = require("../models/Campaign");

    // Permission check
    // Permission check
    const permissions = req.user.permissions || [];
    const viewAll = req.user.isSystemAdmin || permissions.includes("dashboard.dashboard.view");
    const viewAssigned = permissions.includes("dashboard.dashboard.viewAssigned");

    // Check if user is a manager of any team
    const Team = require("../models/Team");
    const managedTeams = await Team.find({ managers: req.user._id });
    const isManager = managedTeams.length > 0;
    const viewTeam = permissions.includes("leads.team.view") || isManager;

    if (!viewAll && !viewTeam && !viewAssigned) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { datePreset = "today", from, to, scope } = req.query;

    // Determine effective scope based on permissions and request
    let effectiveScope = scope;
    if (!effectiveScope) {
      effectiveScope = viewAll ? "all" : (viewTeam ? "team" : "assigned");
    }

    // Strict validation: Downgrade if unauthorized
    if (effectiveScope === "all" && !viewAll) {
      effectiveScope = viewTeam ? "team" : "assigned";
    }
    if (effectiveScope === "team" && !viewTeam) {
      effectiveScope = "assigned";
    }

    let filterIds = null;
    if (effectiveScope === "team") {
      filterIds = managedTeams.reduce((acc, t) => acc.concat(t.members), []);
      filterIds.push(req.user._id);
    } else if (effectiveScope === "assigned") {
      filterIds = [req.user._id];
    }
    // if effectiveScope is 'all', filterIds remains null (full access)

    const leadMatch = {};
    const callMatch = {};
    if (filterIds !== null) {
      // Ensure unique IDs and cast to ObjectId
      filterIds = [...new Set(filterIds.map(id => id.toString()))].map(id => new mongoose.Types.ObjectId(id));
      leadMatch.assignedTo = { $in: filterIds };
      callMatch.caller = { $in: filterIds };
    }
    const { start, end } = resolveDateRange(datePreset, from, to);
    const dateFilter = { $gte: start, $lte: end };

    // ---- KPI Cards ----
    const [
      todaysLeads,
      pendingNewLeads,
      opBookedAgg,
      opDoneAgg,
      ipBookedAgg,
      ipDoneAgg,
      surgerySuggestedAgg,
      diagnosticSuggestedAgg,
      diagnosticBookedAgg,
      diagnosticDoneAgg,
    ] = await Promise.all([
      Lead.countDocuments({ createdTime: dateFilter, ...leadMatch }),
      Lead.countDocuments({ createdTime: dateFilter, assignedTo: null, ...leadMatch }),
      Lead.aggregate([
        { $match: leadMatch },
        { $unwind: "$opBookings" },
        { $match: { "opBookings.status": "booked", "opBookings.createdAt": dateFilter } },
        { $group: { _id: "$_id" } },
        { $count: "c" },
      ]),
      Lead.aggregate([
        { $match: leadMatch },
        { $unwind: "$opBookings" },
        {
          $match: {
            "opBookings.status": "done",
            $or: [
              { "opBookings.doneDate": dateFilter },
              { "opBookings.doneDate": { $exists: false }, "opBookings.updatedAt": dateFilter },
            ],
          },
        },
        { $group: { _id: "$_id" } },
        { $count: "c" },
      ]),
      Lead.aggregate([
        { $match: leadMatch },
        { $unwind: "$ipBookings" },
        { $match: { "ipBookings.status": "booked", "ipBookings.createdAt": dateFilter } },
        { $group: { _id: "$_id" } },
        { $count: "c" },
      ]),
      Lead.aggregate([
        { $match: leadMatch },
        { $unwind: "$ipBookings" },
        {
          $match: {
            "ipBookings.status": "done",
            $or: [
              { "ipBookings.doneDate": dateFilter },
              { "ipBookings.doneDate": { $exists: false }, "ipBookings.updatedAt": dateFilter },
            ],
          },
        },
        { $group: { _id: "$_id" } },
        { $count: "c" },
      ]),
      Lead.aggregate([
        { $match: { createdTime: dateFilter, ...leadMatch } },
        { $unwind: "$opBookings" },
        { $match: { "opBookings.surgery": { $exists: true, $ne: "" } } },
        { $group: { _id: "$_id" } },
        { $count: "c" },
      ]),
      Lead.aggregate([
        { $match: { createdTime: dateFilter, ...leadMatch } },
        {
          $match: {
            $or: [
              { "opBookings.caseType": { $regex: /diagnostic/i } },
              { "ipBookings.caseType": { $regex: /diagnostic/i } },
            ],
          },
        },
        { $count: "c" },
      ]),
      Lead.aggregate([
        { $match: leadMatch },
        { $unwind: "$diagnosticBookings" },
        { $match: { "diagnosticBookings.status": "booked", "diagnosticBookings.createdAt": dateFilter } },
        { $group: { _id: "$_id" } },
        { $count: "c" },
      ]),
      Lead.aggregate([
        { $match: leadMatch },
        { $unwind: "$diagnosticBookings" },
        {
          $match: {
            "diagnosticBookings.status": "done",
            $or: [
              { "diagnosticBookings.doneDate": dateFilter },
              { "diagnosticBookings.doneDate": { $exists: false }, "diagnosticBookings.updatedAt": dateFilter },
            ],
          },
        },
        { $group: { _id: "$_id" } },
        { $count: "c" },
      ]),
    ]);

    const kpiCards = {
      todaysLeads,
      pendingNewLeads,
      opBooked: opBookedAgg[0]?.c || 0,
      opDone: opDoneAgg[0]?.c || 0,
      ipBooked: ipBookedAgg[0]?.c || 0,
      ipDone: ipDoneAgg[0]?.c || 0,
      surgerySuggested: surgerySuggestedAgg[0]?.c || 0,
      diagnosticSuggested: diagnosticSuggestedAgg[0]?.c || 0,
      diagnosticBooked: diagnosticBookedAgg[0]?.c || 0,
      diagnosticDone: diagnosticDoneAgg[0]?.c || 0,
    };

    // ---- City & Doctor Summary ----
    const cityDoctorRaw = await Lead.aggregate([
      { $match: { createdTime: dateFilter, ...leadMatch } },
      { $unwind: { path: "$fieldData", preserveNullAndEmptyArrays: false } },
      {
        $match: {
          "fieldData.name": { $regex: /^(city|location|district)$/i },
        },
      },
      { $unwind: { path: "$fieldData.values", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: "$_id",
          city: { $first: "$fieldData.values" },
          doc: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: {
          newRoot: { $mergeObjects: ["$doc", { _city: "$city" }] },
        },
      },
      { $unwind: { path: "$opBookings", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            city: { $toLower: "$_city" },
            doctor: { $ifNull: [{ $toLower: "$opBookings.doctor" }, "unassigned"] },
          },
          totalLeads: { $addToSet: "$_id" },
          opBooked: {
            $sum: { $cond: [{ $eq: ["$opBookings.status", "booked"] }, 1, 0] },
          },
          opDone: {
            $sum: { $cond: [{ $eq: ["$opBookings.status", "done"] }, 1, 0] },
          },
          ipBooked: {
            $sum: {
              $cond: [
                { $gt: [{ $size: { $ifNull: ["$ipBookings", []] } }, 0] },
                1,
                0,
              ],
            },
          },
          ipDone: {
            $sum: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$ipBookings", []] },
                  as: "b",
                  cond: { $eq: ["$$b.status", "done"] },
                },
              },
            },
          },
          diagnosticBooked: {
            $sum: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$diagnosticBookings", []] },
                  as: "b",
                  cond: { $eq: ["$$b.status", "booked"] },
                },
              },
            },
          },
          diagnosticDone: {
            $sum: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$diagnosticBookings", []] },
                  as: "b",
                  cond: { $eq: ["$$b.status", "done"] },
                },
              },
            },
          },
          surgerySuggested: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: [{ $ifNull: ["$opBookings.surgery", ""] }, ""] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          revenue: {
            $sum: {
              $add: [
                { $toDouble: { $ifNull: ["$opBookings.payment", 0] } },
                { $sum: { $map: { input: { $ifNull: ["$ipBookings", []] }, as: "b", in: { $toDouble: { $ifNull: ["$$b.payment", 0] } } } } },
                { $sum: { $map: { input: { $ifNull: ["$diagnosticBookings", []] }, as: "b", in: { $toDouble: { $ifNull: ["$$b.payment", 0] } } } } }
              ]
            }
          },
        },
      },
      {
        $group: {
          _id: "$_id.city",
          doctors: {
            $push: {
              doctor: "$_id.doctor",
              totalLeads: { $size: "$totalLeads" },
              opBooked: "$opBooked",
              opDone: "$opDone",
              ipBooked: "$ipBooked",
              ipDone: "$ipDone",
              diagnosticBooked: "$diagnosticBooked",
              diagnosticDone: "$diagnosticDone",
              surgerySuggested: "$surgerySuggested",
              revenue: "$revenue",
            },
          },
          totalLeads: { $sum: { $size: "$totalLeads" } },
          opBooked: { $sum: "$opBooked" },
          opDone: { $sum: "$opDone" },
          ipBooked: { $sum: "$ipBooked" },
          ipDone: { $sum: "$ipDone" },
          diagnosticBooked: { $sum: "$diagnosticBooked" },
          diagnosticDone: { $sum: "$diagnosticDone" },
          surgerySuggested: { $sum: "$surgerySuggested" },
          revenue: { $sum: "$revenue" },
        },
      },
      { $sort: { totalLeads: -1 } },
    ]);

    const cityDoctorSummary = cityDoctorRaw.map((r) => ({
      city: r._id || "Unknown",
      totalLeads: r.totalLeads,
      opBooked: r.opBooked,
      opDone: r.opDone,
      ipBooked: r.ipBooked,
      ipDone: r.ipDone,
      diagnosticBooked: r.diagnosticBooked,
      diagnosticDone: r.diagnosticDone,
      surgerySuggested: r.surgerySuggested,
      revenue: r.revenue,
      doctors: r.doctors,
    }));

    // ---- Campaign-Wise ----
    const campaignRaw = await Lead.aggregate([
      { $match: { createdTime: dateFilter, campaignId: { $exists: true, $ne: "" }, ...leadMatch } },
      { $unwind: { path: "$fieldData", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          "fieldData.name": { $regex: /^(city|location|district)$/i },
        },
      },
      { $unwind: { path: "$fieldData.values", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            campaignId: "$campaignId",
            city: { $ifNull: [{ $toLower: "$fieldData.values" }, "unknown"] },
          },
          totalLeads: { $addToSet: "$_id" },
          opBooked: {
            $sum: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$opBookings", []] },
                  as: "b",
                  cond: { $eq: ["$$b.status", "booked"] },
                },
              },
            },
          },
          opDone: {
            $sum: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$opBookings", []] },
                  as: "b",
                  cond: { $eq: ["$$b.status", "done"] },
                },
              },
            },
          },
          ipBooked: {
            $sum: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$ipBookings", []] },
                  as: "b",
                  cond: { $eq: ["$$b.status", "booked"] },
                },
              },
            },
          },
          ipDone: {
            $sum: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$ipBookings", []] },
                  as: "b",
                  cond: { $eq: ["$$b.status", "done"] },
                },
              },
            },
          },
          diagnosticBooked: {
            $sum: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$diagnosticBookings", []] },
                  as: "b",
                  cond: { $eq: ["$$b.status", "booked"] },
                },
              },
            },
          },
          diagnosticDone: {
            $sum: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$diagnosticBookings", []] },
                  as: "b",
                  cond: { $eq: ["$$b.status", "done"] },
                },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: "$_id.campaignId",
          cities: {
            $push: {
              city: "$_id.city",
              totalLeads: { $size: "$totalLeads" },
              opBooked: "$opBooked",
              opDone: "$opDone",
              ipBooked: "$ipBooked",
              ipDone: "$ipDone",
              diagnosticBooked: "$diagnosticBooked",
              diagnosticDone: "$diagnosticDone",
            },
          },
          totalLeads: { $sum: { $size: "$totalLeads" } },
          opBooked: { $sum: "$opBooked" },
          opDone: { $sum: "$opDone" },
          ipBooked: { $sum: "$ipBooked" },
          ipDone: { $sum: "$ipDone" },
          diagnosticBooked: { $sum: "$diagnosticBooked" },
          diagnosticDone: { $sum: "$diagnosticDone" },
        },
      },
      { $sort: { totalLeads: -1 } },
    ]);

    // Lookup campaign names
    const campaignIds = campaignRaw.map((c) => c._id).filter(Boolean);
    const campaigns = await Campaign.find(
      {
        $or: [
          { _id: { $in: campaignIds.filter((id) => /^[0-9a-fA-F]{24}$/.test(id)) } },
          { name: { $in: campaignIds } },
          { "integration.externalId": { $in: campaignIds } },
          { "integration.metaCampaignId": { $in: campaignIds } }
        ]
      },
      { name: 1, "integration.externalId": 1, "integration.metaCampaignId": 1 }
    ).lean();

    const campaignNameMap = new Map();
    campaigns.forEach((c) => {
      campaignNameMap.set(String(c._id), c.name);
      campaignNameMap.set(c.name, c.name);
      if (c.integration?.externalId) campaignNameMap.set(c.integration.externalId, c.name);
      if (c.integration?.metaCampaignId) campaignNameMap.set(c.integration.metaCampaignId, c.name);
    });

    const campaignWise = campaignRaw.map((r) => ({
      campaignId: r._id,
      campaignName: campaignNameMap.get(String(r._id)) || r._id || "Unknown",
      totalLeads: r.totalLeads,
      opBooked: r.opBooked,
      opDone: r.opDone,
      ipBooked: r.ipBooked,
      ipDone: r.ipDone,
      diagnosticBooked: r.diagnosticBooked,
      diagnosticDone: r.diagnosticDone,
      cities: r.cities,
    }));

    // ---- Camp-Wise (City first, then campaign) ----
    const campRaw = await Lead.aggregate([
      { $match: { createdTime: dateFilter, ...leadMatch } },
      { $unwind: { path: "$fieldData", preserveNullAndEmptyArrays: false } },
      {
        $match: {
          "fieldData.name": { $regex: /^(city|location|district)$/i },
        },
      },
      { $unwind: { path: "$fieldData.values", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: {
            city: { $toLower: "$fieldData.values" },
            campaignId: { $ifNull: ["$campaignId", "unknown"] },
          },
          totalLeads: { $addToSet: "$_id" },
          opBooked: {
            $sum: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$opBookings", []] },
                  as: "b",
                  cond: { $eq: ["$$b.status", "booked"] },
                },
              },
            },
          },
          opDone: {
            $sum: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$opBookings", []] },
                  as: "b",
                  cond: { $eq: ["$$b.status", "done"] },
                },
              },
            },
          },
          ipBooked: {
            $sum: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$ipBookings", []] },
                  as: "b",
                  cond: { $eq: ["$$b.status", "booked"] },
                },
              },
            },
          },
          ipDone: {
            $sum: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$ipBookings", []] },
                  as: "b",
                  cond: { $eq: ["$$b.status", "done"] },
                },
              },
            },
          },
          diagnosticBooked: {
            $sum: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$diagnosticBookings", []] },
                  as: "b",
                  cond: { $eq: ["$$b.status", "booked"] },
                },
              },
            },
          },
          diagnosticDone: {
            $sum: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$diagnosticBookings", []] },
                  as: "b",
                  cond: { $eq: ["$$b.status", "done"] },
                },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: "$_id.city",
          campaigns: {
            $push: {
              campaignId: "$_id.campaignId",
              totalLeads: { $size: "$totalLeads" },
              opBooked: "$opBooked",
              opDone: "$opDone",
              ipBooked: "$ipBooked",
              ipDone: "$ipDone",
              diagnosticBooked: "$diagnosticBooked",
              diagnosticDone: "$diagnosticDone",
            },
          },
          totalLeads: { $sum: { $size: "$totalLeads" } },
          opBooked: { $sum: "$opBooked" },
          opDone: { $sum: "$opDone" },
          ipBooked: { $sum: "$ipBooked" },
          ipDone: { $sum: "$ipDone" },
          diagnosticBooked: { $sum: "$diagnosticBooked" },
          diagnosticDone: { $sum: "$diagnosticDone" },
        },
      },
      { $sort: { totalLeads: -1 } },
    ]);

    const campWise = campRaw.map((r) => ({
      city: r._id || "Unknown",
      totalLeads: r.totalLeads,
      opBooked: r.opBooked,
      opDone: r.opDone,
      ipBooked: r.ipBooked,
      ipDone: r.ipDone,
      diagnosticBooked: r.diagnosticBooked,
      diagnosticDone: r.diagnosticDone,
      campaigns: r.campaigns.map((c) => ({
        ...c,
        campaignName: campaignNameMap.get(String(c.campaignId)) || c.campaignId || "Unknown",
      })),
    }));

    // ---- BD Activity Tracker ----
    const bdActivityRaw = await CallLog.aggregate([
      { $match: { createdAt: dateFilter, ...callMatch } },
      {
        $group: {
          _id: "$caller",
          callsMade: { $sum: 1 },
          uniqueDials: { $addToSet: "$lead" },
          totalDuration: { $sum: "$durationSec" },
          lastCall: { $max: "$createdAt" },
          outcomes: { $push: "$outcome" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      { $sort: { callsMade: -1 } },
    ]);

    const nowMs = Date.now();
    const bdActivityTracker = bdActivityRaw.map((r) => {
      const dropouts = r.outcomes.filter(
        (o) => ["no_answer", "busy", "switched_off", "wrong_number"].includes(o)
      ).length;
      const booked = r.outcomes.filter((o) => o === "converted").length;
      const lastCallMs = r.lastCall ? new Date(r.lastCall).getTime() : null;
      const idleMin = lastCallMs ? Math.round((nowMs - lastCallMs) / 60000) : null;
      const idleHour = idleMin !== null ? `${Math.floor(idleMin / 60)}h ${idleMin % 60}m` : "N/A";

      const dur = r.totalDuration || 0;
      const h = Math.floor(dur / 3600);
      const m = Math.floor((dur % 3600) / 60);
      const s = dur % 60;
      const callDuration = h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;

      return {
        callerId: r._id,
        callerName: r.user?.name || "Unknown",
        callsMade: r.callsMade,
        uniqueDials: r.uniqueDials.length,
        callDuration,
        lastCall: r.lastCall,
        idleHour,
        dropouts,
        bookedLeads: booked,
      };
    });

    // ---- BD Performance Summary ----
    const callerRoleId3 = await getRoleIdByName("Caller");
    const callers = await User.find({ role: callerRoleId3 }, { name: 1, target: 1 }).lean();
    const callerIds = callers.map((c) => c._id);

    const perfRaw = await Lead.aggregate([
      { $match: { assignedTo: { $in: callerIds }, createdTime: dateFilter } },
      {
        $project: {
          assignedTo: 1,
          opBooked: {
            $size: {
              $filter: {
                input: { $ifNull: ["$opBookings", []] },
                as: "b",
                cond: { $eq: ["$$b.status", "booked"] },
              },
            },
          },
          opCancelled: {
            $size: {
              $filter: {
                input: { $ifNull: ["$opBookings", []] },
                as: "b",
                cond: { $eq: ["$$b.status", "cancelled"] },
              },
            },
          },
          ipBooked: {
            $size: {
              $filter: {
                input: { $ifNull: ["$ipBookings", []] },
                as: "b",
                cond: { $eq: ["$$b.status", "booked"] },
              },
            },
          },
          ipDone: {
            $size: {
              $filter: {
                input: { $ifNull: ["$ipBookings", []] },
                as: "b",
                cond: { $eq: ["$$b.status", "done"] },
              },
            },
          },
          diagnosticBooked: {
            $size: {
              $filter: {
                input: { $ifNull: ["$diagnosticBookings", []] },
                as: "b",
                cond: { $eq: ["$$b.status", "booked"] },
              },
            },
          },
          diagnosticDone: {
            $size: {
              $filter: {
                input: { $ifNull: ["$diagnosticBookings", []] },
                as: "b",
                cond: { $eq: ["$$b.status", "done"] },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: "$assignedTo",
          totalLeads: { $sum: 1 },
          opBooked: { $sum: "$opBooked" },
          opCancelled: { $sum: "$opCancelled" },
          ipBooked: { $sum: "$ipBooked" },
          ipDone: { $sum: "$ipDone" },
          diagnosticBooked: { $sum: "$diagnosticBooked" },
          diagnosticDone: { $sum: "$diagnosticDone" },
        },
      },
    ]);

    const perfMap = new Map();
    perfRaw.forEach((r) => perfMap.set(String(r._id), r));

    const bdPerformanceSummary = callers.map((c) => {
      const p = perfMap.get(String(c._id)) || {};
      return {
        callerId: c._id,
        callerName: c.name,
        target: c.target || 0,
        totalLeads: p.totalLeads || 0,
        opBooked: p.opBooked || 0,
        opCancelled: p.opCancelled || 0,
        ipBooked: p.ipBooked || 0,
        ipDone: p.ipDone || 0,
        diagnosticBooked: p.diagnosticBooked || 0,
        diagnosticDone: p.diagnosticDone || 0,
      };
    });

    res.json({
      kpiCards,
      cityDoctorSummary,
      campaignWise,
      campWise,
      bdActivityTracker,
      bdPerformanceSummary,
    });
  } catch (err) {
    console.error("getAdminDashboardV2 error:", err);
    res.status(500).json({ error: "Failed to fetch dashboard v2 stats", details: err.message });
  }
};

const getLead = async (req, res) => {
  try {
    const { id } = req.params;
    const LeadActivity = require("../models/LeadActivity");

    const [lead, activity] = await Promise.all([
      Lead.findById(id).populate("assignedTo", "name email"),
      LeadActivity.find({ lead: id }).sort({ createdAt: -1 }).limit(20)
    ]);

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

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

    res.json({ lead: { ...lead.toObject(), campaignName }, activity });
  } catch (err) {
    console.error("getLead error:", err);
    res.status(500).json({ error: "Failed to fetch lead details" });
  }
};

const getLeadFilterMeta = async (req, res) => {
  try {
    const LeadFieldConfig = require("../models/LeadFieldConfig");

    // Permission check
    const permissions = req.user.permissions || [];
    const canViewAll = req.user.isSystemAdmin || permissions.includes("leads.all.view");
    const canViewAssigned = permissions.includes("leads.assigned.view");

    if (!canViewAll && !canViewAssigned) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Filter caller counts if restricted
    const matchStage = { assignedTo: { $ne: null } };
    if (!canViewAll && canViewAssigned) {
      matchStage.assignedTo = req.user._id;
    }

    const [sources, statuses, callerCountsAgg, fieldConfigs] = await Promise.all([
      Lead.distinct('source'),
      Lead.distinct('status'),
      Lead.aggregate([
        { $match: matchStage },
        { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
      ]),
      LeadFieldConfig.find({ active: true }).lean(),
    ]);

    // Build field options map from configs
    const fieldOptions = {};
    for (const fc of fieldConfigs) {
      if (fc.options && fc.options.length > 0) {
        fieldOptions[fc.fieldName] = fc.options;
      }
    }

    res.json({
      sources: sources.filter(Boolean).sort(),
      statuses: statuses.filter(Boolean).sort(),
      callerCounts: Object.fromEntries(callerCountsAgg.map(c => [String(c._id), c.count])),
      fieldOptions,
    });
  } catch (err) {
    console.error("getLeadFilterMeta error:", err);
    res.status(500).json({ error: "Failed to fetch filter metadata" });
  }
};

module.exports = {
  getAllLeads,
  getLeadFilterMeta,
  getTodayLeads,
  getLeadsByDate,
  assignLeadsToCaller,
  getAssignedLeads,
  createLead,
  intakeLead,
  assignLeadsByLocation,
  findDuplicates,
  mergeLeads,
  bulkUpdateLeads,
  bulkUpdateByFilter,
  uploadLeadDocument,
  deleteLeadDocument,
  deleteLeads,
  getAdminDashboardStats,
  getAdminActivityStats,
  getCallerDetailStats,
  getAdminDashboardV2,
  getLead
};

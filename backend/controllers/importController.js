// controllers/importController.js
const Lead = require("../models/Lead");
const Campaign = require("../models/Campaign");
const User = require("../models/User");
const ImportMapping = require("../models/ImportMapping");
const { safeEmit, room } = require("../utils/socket");

/* ---------- helpers (mirrored from leadController) ---------- */
const normalizePhone = (raw) => (String(raw || "")).replace(/\D/g, "");
const isValidPhone = (raw) => {
  const d = normalizePhone(raw);
  return d.length >= 7 && d.length <= 30;
};

/**
 * Ensure a phone number has the +91 country code prefix.
 * Handles: "9876543210" → "+919876543210", "919876543210" → "+919876543210",
 * "09876543210" → "+919876543210", "+919876543210" → "+919876543210"
 */
const normalizePhoneWithCode = (raw) => {
  // Strip everything except digits and leading +
  let s = String(raw || "").trim();
  const hasPlus = s.startsWith("+");
  const digits = s.replace(/\D/g, "");
  if (!digits) return s;

  // Already has +91
  if (hasPlus && digits.startsWith("91") && digits.length >= 12) return "+" + digits;

  // 12+ digits starting with 91 (e.g. 919876543210)
  if (digits.startsWith("91") && digits.length >= 12) return "+" + digits;

  // 11 digits starting with 0 (e.g. 09876543210)
  if (digits.startsWith("0") && digits.length === 11) return "+91" + digits.slice(1);

  // 10 digits (Indian local number)
  if (digits.length === 10) return "+91" + digits;

  // Fallback: just prepend +
  return "+" + digits;
};

const makeLeadId = (prefix = "import") =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// TelCRM placeholder values that mean "empty"
const BLANK_PLACEHOLDERS = new Set(["_", "-", "--", "---", "n/a", "na", "nil", "none", "null", ""]);

const isBlankValue = (raw) => BLANK_PLACEHOLDERS.has(String(raw ?? "").toLowerCase().trim());

/**
 * Parse a date string from TelCRM exports.
 *
 * Supported formats (with optional HH:MM:SS time component):
 *   DD/MM/YYYY [HH:MM:SS]   ← TelCRM default e.g. "13/12/2025 07:30:37"
 *   DD-MM-YYYY [HH:MM:SS]
 *   DD.MM.YYYY [HH:MM:SS]
 *   ISO 8601 / RFC 2822       ← handled by native Date()
 *   Excel serial numbers       ← numeric cell values from .xlsx
 *
 * Returns a valid Date, or null (never throws, never returns Invalid Date).
 */
const parseDate = (raw) => {
  if (raw == null || raw === "") return null;

  const sanitize = (dt) => {
    if (!dt) return null;
    if (isNaN(dt)) throw new Error(`Could not parse date from value: "${raw}"`);
    const y = dt.getFullYear();
    if (y < 1970 || y > 2100) throw new Error(`Year ${y} is out of bounds (1970-2100) for value: "${raw}"`);
    return dt;
  };

  // Excel serial number (days since 1900-01-01, off-by-two corrected)
  if (typeof raw === "number") {
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + raw * 86400000);
    return sanitize(d);
  }

  const s = String(raw).trim();
  if (!s) return null;

  // Split into date part and optional time part: "13/12/2025 07:30:37" → ["13/12/2025", "07:30:37"]
  const parts = s.split(/\s+/);
  const datePart = parts[0];
  const timePart = parts[1]; // may be undefined

  /**
   * Build a Date using new Date(year, month, day, h, m, s) — always local time,
   * never ISO string construction (avoids 1-digit hour bug in ISO 8601).
   */
  const buildDate = (d, m, y, time) => {
    const year = String(y).length === 2
      ? (Number(y) > 50 ? 1900 + Number(y) : 2000 + Number(y))
      : Number(y);
    let h = 0, min = 0, sec = 0;
    if (time) {
      const tp = String(time).split(":");
      h = Number(tp[0]) || 0;
      min = Number(tp[1]) || 0;
      sec = Number(tp[2]) || 0;
    }
    const dt = new Date(year, Number(m) - 1, Number(d), h, min, sec);
    return sanitize(dt);
  };

  // DD/MM/YYYY or D/M/YY
  const dmySlash = datePart.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (dmySlash) {
    const result = buildDate(dmySlash[1], dmySlash[2], dmySlash[3], timePart);
    if (result) return result;
  }

  // DD-MM-YYYY or D-M-YY
  const dmyDash = datePart.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (dmyDash) {
    const result = buildDate(dmyDash[1], dmyDash[2], dmyDash[3], timePart);
    if (result) return result;
  }

  // DD.MM.YYYY
  const dmyDot = datePart.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (dmyDot) {
    const result = buildDate(dmyDot[1], dmyDot[2], dmyDot[3], timePart);
    if (result) return result;
  }

  // YYYY-MM-DD (ISO-like date-only format)
  const ymdDash = datePart.match(/^(\d{4})-(0?\d{1,2})-(0?\d{1,2})$/);
  if (ymdDash) {
    const result = buildDate(ymdDash[3], ymdDash[2], ymdDash[1], timePart);
    if (result) return result;
  }

  // Excel serial number as STRING (e.g. "46056.00011574074" from TelCRM exports)
  const num = Number(s);
  if (!isNaN(num) && num > 25000 && num < 100000) {
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + num * 86400000);
    return sanitize(d);
  }

  // Last-resort: try native parse (handles ISO, RFC 2822, etc.)
  const native = new Date(s);
  return sanitize(native);
};

/* ---------- OPD / IPD status normalizers ---------- */
// Map TelCRM status text to Mongoose enum values: pending | booked | done | cancelled
const normalizeOpdStatus = (raw) => {
  const s = String(raw).toLowerCase().trim();
  if (s.includes("done")) return "done";
  if (s.includes("booked")) return "booked";
  if (s.includes("cancel")) return "cancelled";
  return "pending";
};

const normalizeIpdStatus = (raw) => {
  const s = String(raw).toLowerCase().trim();
  if (s.includes("done")) return "done";
  if (s.includes("booked")) return "booked";
  if (s.includes("cancel")) return "cancelled";
  return "pending";
};

/* ---------- importLeads ---------- */
const importLeads = async (req, res) => {
  try {
    const io = req.app.get("io");
    const {
      rows = [],
      mappings = {},
      defaultCampaignId,
      defaultStatus = "New Lead",
      defaultPlatform = "telcrm",
      duplicateHandling = "skip",
    } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "No rows provided." });
    }

    // Pre-load all campaigns and callers to avoid per-row DB hits
    const [allCampaigns, allCallers] = await Promise.all([
      Campaign.find({}, "_id name").lean(),
      User.find({}, "_id name email").lean(),
    ]);

    const campaignCache = {};
    const callerCache = {};

    const resolveCampaign = (name) => {
      if (!name) return null;
      const key = String(name).toLowerCase().trim();
      if (key in campaignCache) return campaignCache[key];
      const found = allCampaigns.find((c) =>
        c.name.toLowerCase().includes(key) || key.includes(c.name.toLowerCase())
      );
      campaignCache[key] = found?._id?.toString() || null;
      return campaignCache[key];
    };

    const resolveCaller = (nameOrEmail) => {
      if (!nameOrEmail) return null;
      const key = String(nameOrEmail).toLowerCase().trim();
      if (key in callerCache) return callerCache[key];
      const found = allCallers.find(
        (u) =>
          (u.name && (u.name.toLowerCase().includes(key) || key.includes(u.name.toLowerCase()))) ||
          u.email?.toLowerCase() === key
      );
      callerCache[key] = found?._id?.toString() || null;
      return callerCache[key];
    };

    let imported = 0;
    let skipped = 0;
    let failed = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        // 1. Apply mappings → build intermediate object
        let name = "";
        let phone = "";
        let email = "";
        let status = "";
        let source = "";
        let notes = "";
        let createdTime = null;
        let metaLeadId = null;
        let telcrmLeadId = null;
        let campaignName = "";
        let callerName = "";
        const customFields = [];
        // OPD / IPD accumulator objects (merge all mapped columns into one booking)
        const opdData = {};
        const ipdData = {};
        let sharedHospital = ""; // hospital applies to both OPD and IPD
        let rating = 0;
        let followUpAt = null;

        for (const [csvHeader, mapping] of Object.entries(mappings)) {
          const rawVal = row[csvHeader];
          // Skip null/undefined/blank/TelCRM placeholder values
          if (rawVal == null || isBlankValue(rawVal)) continue;
          const val = String(rawVal).trim();
          if (!val) continue;
          const { targetType, targetField } = mapping || {};

          if (targetType === "skip" || !targetType) continue;

          if (targetType === "core") {
            if (targetField === "name") name = val;
            else if (targetField === "phone") phone = val;
            else if (targetField === "email") email = val;
            else if (targetField === "status") status = val;
            else if (targetField === "source") source = val;
            else if (targetField === "notes") notes = val;
            else if (targetField === "metaLeadId") metaLeadId = val;
            else if (targetField === "telcrmLeadId") telcrmLeadId = val;
            else if (targetField === "hospital") sharedHospital = val;
            else if (targetField === "rating") rating = Number(val) || 0;
            else if (targetField === "lastCallOutcome") notes = notes ? `${notes} | Outcome: ${val}` : `Outcome: ${val}`;
            else if (targetField === "followUpAt") {
              try { followUpAt = parseDate(rawVal); } catch { followUpAt = null; }
            }
            else if (targetField === "createdTime") {
              try {
                createdTime = parseDate(rawVal);
              } catch (dateErr) {
                // Soft failure: log a warning but don't skip the row
                console.warn(`Row ${i + 2}: Could not parse date in column '${csvHeader}' (value: "${rawVal}"): ${dateErr.message}. Using current time.`);
                createdTime = null; // will fall back to new Date() below
              }
            }
          } else if (targetType === "campaign") {
            campaignName = val;
          } else if (targetType === "caller") {
            callerName = val;
          } else if (targetType === "opBooking" && targetField) {
            // Accumulate OPD booking fields
            if (targetField === "status") opdData.status = val;
            else if (targetField === "date" || targetField === "booked_date") {
              const parsed = (() => { try { return parseDate(rawVal); } catch { return null; } })();
              if (parsed) { opdData[targetField === "booked_date" ? "bookedDate" : "date"] = parsed; }
            }
            else if (targetField === "sub_status") opdData.subStatus = val;
            else if (targetField === "diagnostics") opdData.diagnostics = val;
          } else if (targetType === "ipBooking" && targetField) {
            // Accumulate IPD booking fields
            if (targetField === "status") ipdData.status = val;
            else if (targetField === "date") {
              const parsed = (() => { try { return parseDate(rawVal); } catch { return null; } })();
              if (parsed) ipdData.date = parsed;
            }
          } else if (targetType === "fieldData" && targetField) {
            // Normalize date values if the field name suggests a date
            const isDateField = /date|time|created|booked|follow/i.test(targetField);
            if (isDateField) {
              try {
                const parsed = parseDate(rawVal);
                if (parsed) {
                  const dd = String(parsed.getDate()).padStart(2, '0');
                  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
                  const yyyy = parsed.getFullYear();
                  customFields.push({ name: targetField, values: [`${dd}/${mm}/${yyyy}`] });
                } else {
                  customFields.push({ name: targetField, values: [val] });
                }
              } catch {
                customFields.push({ name: targetField, values: [val] });
              }
            } else {
              customFields.push({ name: targetField, values: [val] });
            }
          }
        }

        // 2. Validate phone — treat blanks and placeholders as missing
        if (!phone || isBlankValue(phone)) {
          errors.push({ row: i + 2, reason: "Missing phone number" });
          failed++;
          continue;
        }
        if (!isValidPhone(phone)) {
          errors.push({ row: i + 2, reason: `Invalid phone: ${phone}` });
          failed++;
          continue;
        }

        const normalizedPhone = normalizePhoneWithCode(phone);

        // 3. Build fieldData
        const fieldData = [];
        if (name) fieldData.push({ name: "full_name", values: [name] });
        fieldData.push({ name: "phone_number", values: [normalizedPhone] });
        if (email) fieldData.push({ name: "email", values: [email] });
        for (const cf of customFields) {
          fieldData.push(cf);
        }

        // 4. Duplicate check — match both +91 and digits-only formats
        const digitsOnly = normalizedPhone.replace(/\D/g, "");
        const existingLead = await Lead.findOne({
          fieldData: {
            $elemMatch: {
              name: "phone_number",
              values: { $in: [normalizedPhone, digitsOnly] },
            },
          },
        }).lean();

        if (existingLead) {
          if (duplicateHandling === "skip") {
            skipped++;
            continue;
          } else if (duplicateHandling === "update") {
            // Update existing lead fields
            const updateData = {};
            if (name) updateData.source = source || existingLead.source;
            if (notes) updateData.notes = notes;
            if (status) updateData.status = status;
            await Lead.findByIdAndUpdate(existingLead._id, { $set: updateData });
            imported++;
            continue;
          }
        }

        // 5. Resolve campaign and caller
        const resolvedCampaignId = resolveCampaign(campaignName) || defaultCampaignId || null;
        const resolvedCallerId = resolveCaller(callerName) || null;

        // 6. Create lead
        // Build OPD booking entry if any OPD field was mapped
        const opBookingEntry = Object.keys(opdData).length > 0
          ? [{
            fieldData: [],
            status: opdData.status ? normalizeOpdStatus(opdData.status) : "pending",
            date: opdData.date || null,
            hospital: sharedHospital || undefined,
            remarks: [opdData.subStatus, opdData.diagnostics].filter(Boolean).join(" | ") || undefined,
          }]
          : [];

        // Build IPD booking entry if any IPD field was mapped
        const ipBookingEntry = Object.keys(ipdData).length > 0
          ? [{
            fieldData: [],
            status: ipdData.status ? normalizeIpdStatus(ipdData.status) : "pending",
            date: ipdData.date || null,
            hospital: sharedHospital || undefined,
          }]
          : [];

        // Extract call_later_date from customFields to set followUpAt if not already set
        if (!followUpAt) {
          const callLaterField = customFields.find(cf =>
            /call_later_date|call_later|calllater/i.test(cf.name)
          );
          if (callLaterField && callLaterField.values && callLaterField.values[0]) {
            try {
              followUpAt = parseDate(callLaterField.values[0]);
            } catch { /* ignore parse errors */ }
          }
        }

        let doc;
        try {
          doc = await Lead.create({
            leadId: makeLeadId("import"),
            ...(metaLeadId ? { metaLeadId } : {}),
            ...(telcrmLeadId ? { telcrmLeadId } : {}),
            createdTime: (createdTime instanceof Date && !isNaN(createdTime)) ? createdTime : new Date(),
            fieldData,
            notes: notes || "",
            rating: rating || 0,
            status: status || defaultStatus || "New Lead",
            source: source || "",
            platform: defaultPlatform || "telcrm",
            assignedTo: resolvedCallerId,
            campaignId: resolvedCampaignId,
            followUpAt: (followUpAt instanceof Date && !isNaN(followUpAt)) ? followUpAt : null,
            ...(opBookingEntry.length > 0 ? { opBookings: opBookingEntry } : {}),
            ...(ipBookingEntry.length > 0 ? { ipBookings: ipBookingEntry } : {}),
          });
        } catch (dbErr) {
          if (dbErr.name === "ValidationError") {
            const messages = Object.values(dbErr.errors).map(e => `${e.path}: ${e.message}`).join(', ');
            throw new Error(`Database validation failed: ${messages}`);
          }
          throw dbErr;
        }

        // 7. Socket notification
        safeEmit(
          io,
          "lead:created",
          {
            id: doc._id,
            lead_id: doc.leadId,
            created_time: doc.createdTime,
            status: doc.status,
            assigned_to: doc.assignedTo,
          },
          {
            to: [
              room.lead(doc._id),
              doc.assignedTo && room.caller(doc.assignedTo),
            ],
          }
        );

        imported++;
      } catch (rowErr) {
        console.error(`importLeads row ${i + 2} error:`, rowErr.message);
        errors.push({ row: i + 2, reason: rowErr.message });
        failed++;
      }
    }

    // Broadcast bulk update event so admin list refreshes
    safeEmit(io, "leads:bulk_updated", { count: imported }, { broadcastOnZero: true });

    return res.json({
      success: true,
      imported,
      skipped,
      failed,
      errors,
    });
  } catch (err) {
    console.error("importLeads error:", err);
    return res.status(500).json({ error: "Import failed: " + err.message });
  }
};

/* ---------- Mapping Templates ---------- */

const getMappings = async (req, res) => {
  try {
    const mappings = await ImportMapping.find({ createdBy: req.user._id })
      .sort({ name: 1 })
      .lean();
    return res.json({ success: true, data: mappings });
  } catch (err) {
    console.error("getMappings error:", err);
    return res.status(500).json({ error: "Failed to fetch mappings" });
  }
};

const saveMappings = async (req, res) => {
  try {
    const { name, mappings } = req.body;
    if (!name) return res.status(400).json({ error: "Template name is required." });
    if (!mappings || typeof mappings !== "object") {
      return res.status(400).json({ error: "Mappings object is required." });
    }

    const doc = await ImportMapping.findOneAndUpdate(
      { createdBy: req.user._id, name },
      { mappings },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({ success: true, data: doc });
  } catch (err) {
    console.error("saveMappings error:", err);
    return res.status(500).json({ error: "Failed to save mapping template" });
  }
};

const deleteMapping = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await ImportMapping.findOneAndDelete({
      _id: id,
      createdBy: req.user._id,
    });
    if (!doc) return res.status(404).json({ error: "Mapping template not found." });
    return res.json({ success: true, message: "Template deleted." });
  } catch (err) {
    console.error("deleteMapping error:", err);
    return res.status(500).json({ error: "Failed to delete mapping template" });
  }
};

module.exports = { importLeads, getMappings, saveMappings, deleteMapping, parseDate, normalizePhoneWithCode };

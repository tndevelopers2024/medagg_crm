// controllers/activityImportController.js
const Lead = require("../models/Lead");
const LeadActivity = require("../models/LeadActivity");
const User = require("../models/User");

/* ---------- Phone normalizer ---------- */
function normalizePhone(raw) {
    if (!raw) return "";
    let digits = raw.replace(/[^0-9]/g, "");
    if (digits.length >= 12 && digits.startsWith("91")) {
        digits = digits.slice(2);
    }
    return digits.slice(-10);
}

/* ---------- Date parser (DD/MM/YYYY or DD/MM/YYYY HH:mm:ss) ---------- */
function parseTelcrmDate(raw) {
    if (!raw) return null;
    const s = String(raw).trim();
    // DD/MM/YYYY or DD/MM/YYYY HH:mm:ss
    const match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (match) {
        const [, d, m, y, hh, mm, ss] = match;
        return new Date(Number(y), Number(m) - 1, Number(d), Number(hh || 0), Number(mm || 0), Number(ss || 0));
    }
    // Fallback: try native parse
    const dt = new Date(s);
    return isNaN(dt) ? null : dt;
}

/**
 * POST /api/import/activities
 * Body: { rows: [...], fileType: "call" | "note" | "systemNote" | "whatsapp" }
 *
 * Creates individual LeadActivity records for each row.
 * Matches leads via telcrmLeadId first, then falls back to phone number.
 */
const importActivities = async (req, res) => {
    try {
        const { rows = [], fileType } = req.body;
        const importingUserId = req.user?._id; // current logged-in user as fallback actor

        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ error: "No rows provided." });
        }
        if (!["call", "note", "systemNote", "whatsapp"].includes(fileType)) {
            return res.status(400).json({ error: `Invalid fileType: "${fileType}".` });
        }

        let imported = 0;
        let skipped = 0;
        let failed = 0;
        const errors = [];

        // ── Pre-load caches ────────────────────────────────────────────────

        // Cache 1: telcrmLeadId → lead
        const telcrmIds = [...new Set(
            rows.map(r => String(r["Lead id"] || "").trim()).filter(Boolean)
        )];
        const leadsByTelcrm = await Lead.find(
            { telcrmLeadId: { $in: telcrmIds } }, "_id telcrmLeadId"
        );
        const telcrmMap = new Map();
        leadsByTelcrm.forEach(l => telcrmMap.set(l.telcrmLeadId, l));

        // Cache 2: phone → lead (fallback)
        const allLeads = await Lead.find(
            { "fieldData.name": "phone_number" }, "_id telcrmLeadId fieldData"
        );
        const phoneMap = new Map();
        allLeads.forEach(l => {
            const phoneField = (l.fieldData || []).find(f => f.name === "phone_number");
            if (phoneField) {
                phoneField.values.forEach(v => {
                    const norm = normalizePhone(v);
                    if (norm) phoneMap.set(norm, l);
                });
            }
        });

        // Cache 3: user name/email → userId (for actor resolution)
        const allUsers = await User.find({}, "_id name email").lean();
        const userNameMap = new Map();
        const userEmailMap = new Map();
        allUsers.forEach(u => {
            if (u.name) userNameMap.set(u.name.toLowerCase().trim(), u._id);
            if (u.email) userEmailMap.set(u.email.toLowerCase().trim(), u._id);
        });

        // ── Action type mapping ──────────────────────────────────────────
        const ACTION_MAP = {
            call: "telcrm_call",
            note: "telcrm_note",
            systemNote: "telcrm_system_note",
            whatsapp: "telcrm_whatsapp",
        };

        // ── Process rows ─────────────────────────────────────────────────
        const activitiesToInsert = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            try {
                const telcrmId = String(row["Lead id"] || "").trim();
                const phone = normalizePhone(String(row["Phone"] || ""));

                // Match lead: telcrmLeadId first, then phone
                let lead = telcrmId ? telcrmMap.get(telcrmId) : null;
                if (!lead && phone) lead = phoneMap.get(phone);

                if (!lead) {
                    skipped++;
                    continue;
                }

                // Backfill telcrmLeadId if missing
                if (telcrmId && !lead.telcrmLeadId) {
                    await Lead.findByIdAndUpdate(lead._id, { $set: { telcrmLeadId: telcrmId } });
                }

                // Resolve actor
                const actorId = resolveActor(row, fileType, userNameMap, userEmailMap, importingUserId);

                // Build activity record
                const activity = buildActivity(row, fileType, lead._id, actorId, ACTION_MAP[fileType]);
                if (!activity) {
                    skipped++;
                    continue;
                }

                activitiesToInsert.push(activity);
                imported++;
            } catch (rowErr) {
                console.error(`importActivities row ${i + 2}:`, rowErr.message);
                errors.push({ row: i + 2, reason: rowErr.message });
                failed++;
            }
        }

        // Bulk insert all activities at once (much faster than per-row)
        if (activitiesToInsert.length > 0) {
            await LeadActivity.insertMany(activitiesToInsert, { ordered: false });
        }

        return res.json({
            success: true,
            imported,
            skipped,
            failed,
            errors: errors.slice(0, 50),
            total: rows.length,
        });
    } catch (err) {
        console.error("importActivities error:", err);
        return res.status(500).json({ error: err.message });
    }
};

/* ── Helpers ─────────────────────────────────────────────────────────── */

function isBlank(val) {
    if (val == null) return true;
    const s = String(val).trim();
    return !s || s === "-" || s === "_" || s === "NA" || s === "N/A";
}

/** Resolve the actor (User _id) from the row's caller/creator fields */
function resolveActor(row, fileType, nameMap, emailMap, fallbackId) {
    let name, email;

    if (fileType === "call") {
        name = row["Caller name"];
        email = row["Caller emailid"];
    } else {
        name = row["Action Created By name"];
        email = row["Action Created By emailid"];
    }

    // Try email first (most reliable)
    if (!isBlank(email)) {
        const id = emailMap.get(String(email).toLowerCase().trim());
        if (id) return id;
    }
    // Then name
    if (!isBlank(name)) {
        const id = nameMap.get(String(name).toLowerCase().trim());
        if (id) return id;
    }

    // Try Assignee
    if (!isBlank(row["Assignee emailid"])) {
        const id = emailMap.get(String(row["Assignee emailid"]).toLowerCase().trim());
        if (id) return id;
    }
    if (!isBlank(row["Assignee name"])) {
        const id = nameMap.get(String(row["Assignee name"]).toLowerCase().trim());
        if (id) return id;
    }

    return fallbackId; // current logged-in user
}

/** Build a LeadActivity document from a row */
function buildActivity(row, fileType, leadId, actorId, action) {
    switch (fileType) {
        case "call": {
            const date = parseTelcrmDate(row["Call Start Time"] || row["Called On"]);
            const callType = String(row["Call Type"] || "").includes("Incoming") ? "Incoming" : "Outgoing";
            const duration = row["Duration(in sec)"] || "0";
            const feedback = isBlank(row["Feedback"]) ? "" : row["Feedback"];
            const caller = isBlank(row["Caller name"]) ? "" : row["Caller name"];
            const note = isBlank(row["Note"]) ? "" : row["Note"];

            const desc = `${callType} call (${duration}s)${feedback ? ` — ${feedback}` : ""}${caller ? ` by ${caller}` : ""}`;

            return {
                lead: leadId,
                actor: actorId,
                action,
                description: desc,
                diff: {},
                meta: {
                    callType,
                    duration: Number(duration) || 0,
                    feedback,
                    note,
                    source: "telcrm_import",
                },
                createdAt: date || new Date(),
                updatedAt: date || new Date(),
            };
        }

        case "note": {
            const date = parseTelcrmDate(row["Action Created At"]);
            const createdBy = isBlank(row["Action Created By name"]) ? "" : row["Action Created By name"];
            const noteText = row["User Note"] || "";
            if (isBlank(noteText)) return null;

            return {
                lead: leadId,
                actor: actorId,
                action,
                description: `Note${createdBy ? ` by ${createdBy}` : ""}: ${noteText.substring(0, 200)}${noteText.length > 200 ? "..." : ""}`,
                diff: {},
                meta: {
                    fullNote: noteText,
                    createdBy,
                    source: "telcrm_import",
                },
                createdAt: date || new Date(),
                updatedAt: date || new Date(),
            };
        }

        case "systemNote": {
            const date = parseTelcrmDate(row["Action Created At"]);
            const noteText = row["System Note"] || "";
            if (isBlank(noteText)) return null;

            return {
                lead: leadId,
                actor: actorId,
                action,
                description: `System: ${noteText.substring(0, 200)}${noteText.length > 200 ? "..." : ""}`,
                diff: {},
                meta: {
                    fullNote: noteText,
                    source: "telcrm_import",
                },
                createdAt: date || new Date(),
                updatedAt: date || new Date(),
            };
        }

        case "whatsapp": {
            const date = parseTelcrmDate(row["Action Created At"]);
            const msgType = String(row["WhatsApp Message Type"] || "").includes("Incoming")
                ? "Incoming" : "Outgoing";
            const messageText = row["WhatsApp Message"] || "";
            if (isBlank(messageText)) return null;

            return {
                lead: leadId,
                actor: actorId,
                action,
                description: `WhatsApp ${msgType}: ${messageText.substring(0, 200)}${messageText.length > 200 ? "..." : ""}`,
                diff: {},
                meta: {
                    fullMessage: messageText,
                    messageType: msgType,
                    source: "telcrm_import",
                },
                createdAt: date || new Date(),
                updatedAt: date || new Date(),
            };
        }

        default:
            return null;
    }
}

module.exports = { importActivities };

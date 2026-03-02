/**
 * fix_followup_dates.js
 *
 * Migration script: corrects followUpAt for leads where the call_later_date
 * custom field (stored as DD/MM/YYYY) differs from what's in followUpAt.
 *
 * Root cause: on import, dates like "02/03/2026" were parsed as MM/DD (Feb 3)
 * instead of DD/MM (March 2). This script re-parses them correctly.
 *
 * Run with: node fix_followup_dates.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Lead = require("./models/Lead");

const IST_OFFSET_MIN = 330; // +05:30
const DEFAULT_HOUR = 10;
const DEFAULT_MIN = 0;

// Convert YYYY-MM-DD string + IST hour/minute to a UTC Date
const atDateIST = (ymd, hour = DEFAULT_HOUR, minute = DEFAULT_MIN) => {
    const [y, m, d] = ymd.split("-").map(Number);
    const istMidnightUtcMs = Date.UTC(y, m - 1, d, 0, 0, 0) - IST_OFFSET_MIN * 60000;
    return new Date(istMidnightUtcMs + (hour * 60 + minute) * 60000);
};

// Return IST day bounds as UTC Dates
const dayBoundsIST = (dt) => {
    const utcMin = Math.floor(dt.getTime() / 60000);
    const istMin = utcMin + IST_OFFSET_MIN;
    const day = Math.floor(istMin / 1440);
    const startUtcMin = day * 1440 - IST_OFFSET_MIN;
    const start = new Date(startUtcMin * 60000);
    const end = new Date(start.getTime() + 86399999);
    return { start, end };
};

// Get IST hour/minute from a Date
const getISTHourMinute = (dt) => {
    const totalMinIST = Math.floor(dt.getTime() / 60000) + IST_OFFSET_MIN;
    const minInDay = ((totalMinIST % 1440) + 1440) % 1440;
    return { hr: Math.floor(minInDay / 60), min: minInDay % 60 };
};

// Parse raw date string (DD/MM/YYYY or YYYY-MM-DD) → YYYY-MM-DD string
const parseToYMD = (raw) => {
    const s = String(raw || "").trim();
    if (!s) return null;
    // YYYY-MM-DD
    const m1 = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m1) return `${m1[1]}-${m1[2].padStart(2, "0")}-${m1[3].padStart(2, "0")}`;
    // DD/MM/YYYY or DD-MM-YYYY
    const m2 = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (m2) return `${m2[3]}-${m2[2].padStart(2, "0")}-${m2[1].padStart(2, "0")}`;
    return null;
};

const norm = (s = "") => String(s).toLowerCase().trim().replace(/\s+/g, "_");

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Find all leads that have a call_later_date field
    const leads = await Lead.find({
        "fieldData.name": { $regex: /call_later/i },
    }).select("_id fieldData followUpAt");

    console.log(`Found ${leads.length} leads with a call_later_date field`);

    let fixed = 0;
    let skipped = 0;
    let errors = 0;

    for (const lead of leads) {
        try {
            const clEntry = (lead.fieldData || []).find((f) =>
                /call_later_date|call_later|calllater/i.test(norm(f?.name || ""))
            );
            const rawDate = clEntry?.values?.[0] ? String(clEntry.values[0]).trim() : null;
            if (!rawDate) { skipped++; continue; }

            const ymd = parseToYMD(rawDate);
            if (!ymd) { skipped++; continue; }

            // Preserve existing time-of-day in IST
            const existHr = lead.followUpAt ? getISTHourMinute(new Date(lead.followUpAt)).hr : DEFAULT_HOUR;
            const existMin = lead.followUpAt ? getISTHourMinute(new Date(lead.followUpAt)).min : DEFAULT_MIN;

            const newFollowUp = atDateIST(ymd, existHr, existMin);

            // Check if the calendar date differs
            const { start: existStart } = lead.followUpAt
                ? dayBoundsIST(new Date(lead.followUpAt))
                : { start: null };
            const { start: newStart } = dayBoundsIST(newFollowUp);

            if (existStart && existStart.getTime() === newStart.getTime()) {
                skipped++;
                continue; // Already correct
            }

            await Lead.updateOne(
                { _id: lead._id },
                { $set: { followUpAt: newFollowUp } }
            );

            console.log(
                `Fixed lead ${lead._id}: ${rawDate} → ${ymd} (was ${lead.followUpAt?.toISOString() || "null"} → ${newFollowUp.toISOString()})`
            );
            fixed++;
        } catch (err) {
            console.error(`Error on lead ${lead._id}:`, err.message);
            errors++;
        }
    }

    console.log(`\nDone. Fixed: ${fixed}, Skipped (already correct): ${skipped}, Errors: ${errors}`);
    await mongoose.disconnect();
}

run().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});

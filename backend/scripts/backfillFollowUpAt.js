/**
 * Backfill followUpAt from fieldData.call_later_date for existing leads
 * Handles DD/MM/YYYY, YYYY-MM-DD, Excel serial numbers, etc.
 * Run: node scripts/backfillFollowUpAt.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('../models/Lead');

// Excel epoch: Jan 1, 1900 (with the Lotus 123 bug that counts Feb 29, 1900)
function excelSerialToDate(serial) {
    const num = Number(serial);
    if (isNaN(num) || num < 1 || num > 100000) return null;
    // Excel epoch is Dec 30, 1899 (accounting for the 1900 leap year bug)
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const ms = epoch.getTime() + num * 86400000;
    const d = new Date(ms);
    // Set time to noon to avoid timezone edge issues
    d.setHours(12, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d;
}

function parseDate(raw) {
    if (!raw) return null;
    const s = String(raw).trim();
    if (!s) return null;

    // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const ddmmyyyy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (ddmmyyyy) {
        const [, dd, mm, yyyy] = ddmmyyyy;
        const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
        if (!isNaN(d.getTime())) return d;
    }

    // YYYY-MM-DD
    const yyyymmdd = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (yyyymmdd) {
        const [, yyyy, mm, dd] = yyyymmdd;
        const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
        if (!isNaN(d.getTime())) return d;
    }

    // Excel serial number (e.g., 46056.00011574074)
    const num = Number(s);
    if (!isNaN(num) && num > 25000 && num < 100000) {
        return excelSerialToDate(num);
    }

    // Native parse fallback
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;

    return null;
}

async function backfill() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find leads that have call_later_date in fieldData but no followUpAt
    const leads = await Lead.find({
        $or: [
            { followUpAt: null },
            { followUpAt: { $exists: false } },
        ],
        fieldData: {
            $elemMatch: {
                name: { $regex: /call_later_date|call_later/i },
                values: { $exists: true, $ne: [] },
            },
        },
    });

    console.log(`Found ${leads.length} leads to backfill`);

    let updated = 0;
    let skipped = 0;

    for (const lead of leads) {
        const dateField = lead.fieldData.find(f =>
            /call_later_date|call_later/i.test(f.name)
        );
        const rawValue = dateField?.values?.[0];
        if (!rawValue) { skipped++; continue; }

        const parsed = parseDate(rawValue);
        if (!parsed) {
            console.warn(`  Lead ${lead.leadId}: Could not parse "${rawValue}"`);
            skipped++;
            continue;
        }

        // Also normalize the fieldData value to DD/MM/YYYY
        const dd = String(parsed.getDate()).padStart(2, '0');
        const mm = String(parsed.getMonth() + 1).padStart(2, '0');
        const yyyy = parsed.getFullYear();
        dateField.values = [`${dd}/${mm}/${yyyy}`];

        lead.followUpAt = parsed;
        lead.markModified('fieldData');
        await lead.save();
        updated++;
    }

    console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}`);
    process.exit(0);
}

backfill().catch(e => { console.error(e); process.exit(1); });

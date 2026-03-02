/**
 * Sync followUpAt from fieldData.call_later_date for leads where they're out of sync.
 * Run: node scripts/syncCallLaterFollowUpAt.js [--dry-run]
 *
 * Safe to run multiple times — only updates leads where IST day differs.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('../models/Lead');

const IST_OFFSET_MIN = 330; // +05:30
const DEFAULT_HOUR = 10;    // 10 AM IST, same as DEFAULT_FOLLOWUP_HOUR

const DRY_RUN = process.argv.includes('--dry-run');

function parseDateToYMD(raw) {
  const s = String(raw || '').trim();
  // YYYY-MM-DD
  const m1 = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m1) return `${m1[1]}-${String(m1[2]).padStart(2, '0')}-${String(m1[3]).padStart(2, '0')}`;
  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const m2 = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (m2) return `${m2[3]}-${String(m2[2]).padStart(2, '0')}-${String(m2[1]).padStart(2, '0')}`;
  return null;
}

function atDateIST(ymd, hour = DEFAULT_HOUR) {
  const [y, m, d] = ymd.split('-').map(Number);
  const istMidnightMs = Date.UTC(y, m - 1, d, 0, 0, 0) - IST_OFFSET_MIN * 60000;
  return new Date(istMidnightMs + hour * 3600000);
}

function dayStartIST(date) {
  const utcMin = Math.floor(date.getTime() / 60000);
  const istMin = utcMin + IST_OFFSET_MIN;
  const day = Math.floor(istMin / 1440);
  return new Date((day * 1440 - IST_OFFSET_MIN) * 60000);
}

async function sync() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Connected to MongoDB${DRY_RUN ? ' (DRY RUN — no writes)' : ''}`);

  const leads = await Lead.find({
    fieldData: {
      $elemMatch: {
        name: { $regex: /call_later_date|call_later|calllater/i },
        values: { $exists: true, $ne: [] },
      },
    },
  });

  console.log(`Found ${leads.length} leads with call_later_date field`);
  let updated = 0, skipped = 0, errored = 0;

  for (const lead of leads) {
    const f = lead.fieldData.find(f => /call_later_date|call_later|calllater/i.test(f.name));
    const raw = f?.values?.[0];
    if (!raw) { skipped++; continue; }

    const ymd = parseDateToYMD(raw);
    if (!ymd) {
      console.warn(`  Lead ${lead.leadId}: Cannot parse "${raw}" — skipped`);
      skipped++;
      continue;
    }

    const newFollowUp = atDateIST(ymd);
    const existDayStart = lead.followUpAt ? dayStartIST(new Date(lead.followUpAt)) : null;
    const newDayStart = dayStartIST(newFollowUp);

    if (existDayStart && existDayStart.getTime() === newDayStart.getTime()) {
      skipped++;
      continue;
    }

    console.log(
      `  Lead ${lead.leadId || lead._id}: followUpAt ${lead.followUpAt ? lead.followUpAt.toISOString() : 'null'} → ${newFollowUp.toISOString()} (from "${raw}")`
    );

    if (!DRY_RUN) {
      try {
        lead.followUpAt = newFollowUp;
        await lead.save();
        updated++;
      } catch (e) {
        console.error(`  ERROR saving lead ${lead._id}: ${e.message}`);
        errored++;
      }
    } else {
      updated++;
    }
  }

  console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}, Errors: ${errored}`);
  if (DRY_RUN) console.log('(Dry run — no changes saved)');
  process.exit(0);
}

sync().catch(e => { console.error(e); process.exit(1); });

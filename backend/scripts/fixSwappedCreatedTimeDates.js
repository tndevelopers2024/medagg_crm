/**
 * Fix leads whose createdTime was stored in MM/DD/YYYY order instead of DD/MM/YYYY.
 * Effect: month and day are swapped (e.g., December 3, 2026 → March 12, 2026).
 *
 * Targets all leads with createdTime in the future (after today) where a valid
 * swap produces a date in the past — those are the miscoded ones.
 *
 * Run (dry-run first, then apply):
 *   DRY=1 node scripts/fixSwappedCreatedTimeDates.js
 *   node scripts/fixSwappedCreatedTimeDates.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('../models/Lead');

const DRY = process.env.DRY === '1';

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(uri);
  console.log('Connected. DRY RUN:', DRY);

  const now = new Date();

  // Find all leads with createdTime in the future
  const leads = await Lead.find({ createdTime: { $gt: now } }).select('_id createdTime fieldData');
  console.log(`Found ${leads.length} leads with future createdTime.`);

  let fixed = 0, skipped = 0;

  for (const lead of leads) {
    const d = new Date(lead.createdTime);
    const year  = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;  // 1-12
    const day   = d.getUTCDate();       // 1-31
    const hh    = d.getUTCHours();
    const min   = d.getUTCMinutes();
    const sec   = d.getUTCSeconds();

    // Swap: newMonth = originalDay, newDay = originalMonth
    const newMonth = day;
    const newDay   = month;

    // Validate: newMonth must be 1-12
    if (newMonth < 1 || newMonth > 12) {
      console.log(`  SKIP ${lead._id}: stored ${d.toISOString()} → swap month=${newMonth} invalid`);
      skipped++;
      continue;
    }

    // Build candidate date (UTC)
    const candidate = new Date(Date.UTC(year, newMonth - 1, newDay, hh, min, sec));

    // Validate no day-overflow (e.g., Feb 30 rolls over)
    if (candidate.getUTCMonth() + 1 !== newMonth) {
      console.log(`  SKIP ${lead._id}: day overflow for ${year}-${newMonth}-${newDay}`);
      skipped++;
      continue;
    }

    // Only accept if the resulting date is in the past (not another future date)
    if (candidate > now) {
      console.log(`  SKIP ${lead._id}: swapped date ${candidate.toISOString()} is still in the future`);
      skipped++;
      continue;
    }

    const name = (lead.fieldData || []).find(f => /^(full_name|name|lead_name)$/i.test(f.name))?.values?.[0] || '';
    console.log(`  FIX  ${lead._id} [${name}]: ${d.toISOString()} → ${candidate.toISOString()}`);

    if (!DRY) {
      await Lead.updateOne({ _id: lead._id }, { $set: { createdTime: candidate } });
    }
    fixed++;
  }

  console.log(`\nDone. Fixed: ${fixed}, Skipped: ${skipped}${DRY ? ' (DRY RUN — no changes written)' : ''}`);
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });

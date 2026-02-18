/**
 * DANGEROUS: Wipe ALL leads (and related collections) from MongoDB.
 *
 * Safety gates:
 * - Requires WIPE_LEADS=YES
 *
 * Usage:
 *   WIPE_LEADS=YES node scripts/wipeLeadsAndRelated.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

async function main() {
  if (String(process.env.WIPE_LEADS || "").trim().toUpperCase() !== "YES") {
    throw new Error("Refusing to run. Set WIPE_LEADS=YES to proceed.");
  }

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI missing");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });

  // Use models if present; fall back to raw collection deletes if not.
  // Leads
  let deletedLeads = 0;
  try {
    const Lead = require("../models/Lead");
    const res = await Lead.deleteMany({});
    deletedLeads = res.deletedCount || 0;
  } catch (e) {
    const res = await mongoose.connection.db.collection("leads").deleteMany({});
    deletedLeads = res.deletedCount || 0;
  }

  // Related collections (best-effort)
  const related = [
    { name: "leadactivities", modelPath: "../models/LeadActivity" },
    { name: "calllogs", modelPath: "../models/CallLog" },
  ];

  const relatedDeleted = {};
  for (const r of related) {
    try {
      // eslint-disable-next-line import/no-dynamic-require, global-require
      const M = require(r.modelPath);
      const res = await M.deleteMany({});
      relatedDeleted[r.name] = res.deletedCount || 0;
    } catch (e) {
      try {
        const res = await mongoose.connection.db.collection(r.name).deleteMany({});
        relatedDeleted[r.name] = res.deletedCount || 0;
      } catch (_) {
        relatedDeleted[r.name] = "skipped";
      }
    }
  }

  console.log("[wipe] done", { deletedLeads, relatedDeleted });
}

main()
  .catch((e) => {
    console.error("[wipe] failed:", e?.message || e);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.connection.close();
    } catch (_) {}
  });


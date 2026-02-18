/**
 * Seed / Migration script for the Role Management System.
 *
 * Run:  node scripts/seedRoles.js
 *
 * 1. Creates "Admin" system role with ALL permissions.
 * 2. Creates "Caller" system role with a default permission subset.
 * 3. Migrates existing users whose `role` field is a string ("admin"/"caller")
 *    to point at the corresponding Role ObjectId.
 *
 * Idempotent — safe to run multiple times.
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Role = require("../models/Role");
const User = require("../models/User");
const { ALL_PERMISSION_KEYS } = require("../constants/permissions");

// Default permissions for the Caller role
const CALLER_PERMISSIONS = [
  "dashboard.dashboard.view",
  "dashboard.dashboard.kpiStats",
  "leads.search.view",
  "leads.all.view",
  "leads.all.create",
  "leads.all.filters.status",
  "leads.all.filters.source",
  "leads.all.filters.campaign",
  "leads.all.filters.opdStatus",
  "leads.all.filters.ipdStatus",
  "leads.all.filters.diagnostics",
  "leads.all.filters.followup",
  "leads.all.filters.date",
  "leads.all.filters.customFields",
  "leads.detail.view",
  "leads.detail.editFields",
  "leads.detail.editStatus",
  "leads.detail.addNotes",
  "leads.detail.viewActivities",
  "leads.detail.manageBookings",
  "leads.detail.whatsapp",
  "leads.detail.documents",
  "leads.detail.calls",
  "leads.detail.defer",
  "leads.detail.helpRequest",
  "leads.duplicates.view",
  "leads.duplicates.merge",
  "alarms.alarms.view",
  "alarms.alarms.create",
  "alarms.alarms.edit",
  "alarms.alarms.delete",
];

async function seed() {
  await connectDB();

  // 1. Upsert Admin role
  let adminRole = await Role.findOne({ name: "Admin" });
  if (!adminRole) {
    adminRole = await Role.create({
      name: "Admin",
      description: "Full system access",
      permissions: ALL_PERMISSION_KEYS,
      isSystem: true,
    });
    console.log("Created Admin role:", adminRole._id);
  } else {
    // Always sync admin permissions to include any newly-added keys
    adminRole.permissions = ALL_PERMISSION_KEYS;
    await adminRole.save();
    console.log("Admin role already exists — permissions synced:", adminRole._id);
  }

  // 2. Upsert Caller role
  let callerRole = await Role.findOne({ name: "Caller" });
  if (!callerRole) {
    callerRole = await Role.create({
      name: "Caller",
      description: "Default caller access",
      permissions: CALLER_PERMISSIONS,
      isSystem: true,
    });
    console.log("Created Caller role:", callerRole._id);
  } else {
    console.log("Caller role already exists:", callerRole._id);
  }

  // 3. Migrate users with string-based role to ObjectId
  //    We need to find users whose `role` field is still a string (not an ObjectId).
  //    Since we're changing the schema, we use the raw collection to query.
  const usersColl = mongoose.connection.db.collection("users");
  const usersWithStringRole = await usersColl
    .find({ role: { $type: "string" } })
    .toArray();

  if (usersWithStringRole.length === 0) {
    console.log("No users with string-based role found — migration not needed.");
  } else {
    let adminCount = 0;
    let callerCount = 0;

    for (const u of usersWithStringRole) {
      const roleName = (u.role || "").toLowerCase();
      let targetRoleId;

      if (["admin", "superadmin", "owner"].includes(roleName)) {
        targetRoleId = adminRole._id;
        adminCount++;
      } else {
        targetRoleId = callerRole._id;
        callerCount++;
      }

      await usersColl.updateOne(
        { _id: u._id },
        { $set: { role: targetRoleId } }
      );
    }

    console.log(
      `Migrated ${usersWithStringRole.length} users (${adminCount} admin, ${callerCount} caller).`
    );
  }

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

/**
 * Script to delete all users and create new users with Manager role.
 * 
 * Run: node scripts/resetUsersWithManager.js
 * 
 * This script will:
 * 1. Create a "Manager" role with comprehensive permissions
 * 2. Delete all existing users
 * 3. Create new users with the Manager role
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Role = require("../models/Role");
const User = require("../models/User");
const { ALL_PERMISSION_KEYS } = require("../constants/permissions");

// Manager permissions - comprehensive access but not full admin
const MANAGER_PERMISSIONS = [
    // Dashboard - Full access
    "dashboard.dashboard.view",
    "dashboard.dashboard.kpiStats",
    "dashboard.dashboard.cityTable",
    "dashboard.dashboard.doctorTable",
    "dashboard.dashboard.campaignAnalytics",
    "dashboard.dashboard.bdPerformance",
    "dashboard.dashboard.dateFilter",

    // Leads - Full access
    "leads.search.view",
    "leads.all.view",
    "leads.all.create",
    "leads.all.edit",
    "leads.all.delete",
    "leads.all.assign",
    "leads.all.bulkUpdate",
    "leads.all.export",
    "leads.all.filters.status",
    "leads.all.filters.caller",
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

    // Campaigns - Full access
    "campaigns.campaigns.view",
    "campaigns.campaigns.create",
    "campaigns.campaigns.edit",
    "campaigns.campaigns.delete",
    "campaigns.campaigns.sync",
    "campaigns.import.view",
    "campaigns.import.import",
    "campaigns.import.mapColumns",
    "campaigns.import.assignCallers",

    // Callers - Full access
    "callers.callers.view",
    "callers.callers.create",
    "callers.callers.edit",
    "callers.callers.delete",
    "callers.callerDetail.view",
    "callers.callerDetail.viewStats",

    // Analytics - Full access
    "analytics.analytics.view",
    "analytics.analytics.statusChart",
    "analytics.analytics.lostReasons",
    "analytics.analytics.assigneeChart",
    "analytics.analytics.ratingChart",
    "analytics.analytics.callStatusChart",
    "analytics.analytics.callsCountChart",
    "analytics.analytics.customFieldCharts",
    "analytics.analytics.export",

    // Reports - Full access
    "reports.reports.view",
    "reports.reports.callerPerformance",

    // Settings - View only (no create/edit/delete)
    "settings.fieldSettings.view",
    "settings.bookingFields.view",
    "settings.leadStages.view",

    // Roles - View only
    "roles.roles.view",

    // Alarms - Full access
    "alarms.alarms.view",
    "alarms.alarms.create",
    "alarms.alarms.edit",
    "alarms.alarms.delete",
];

// New users to create
const NEW_USERS = [
    {
        name: "Manager User 1",
        email: "manager1@medagg.com",
        password: "manager123",
        phone: "9876543210",
        state: ["Tamil Nadu"],
        isVerified: true,
    },
    {
        name: "Manager User 2",
        email: "manager2@medagg.com",
        password: "manager123",
        phone: "9876543211",
        state: ["Karnataka"],
        isVerified: true,
    },
    {
        name: "Manager User 3",
        email: "manager3@medagg.com",
        password: "manager123",
        phone: "9876543212",
        state: ["Maharashtra"],
        isVerified: true,
    },
];

async function resetUsers() {
    await connectDB();

    console.log("=== Starting User Reset Process ===\n");

    try {
        // Step 1: Create or update Manager role
        console.log("Step 1: Creating/Updating Manager role...");
        let managerRole = await Role.findOne({ name: "Manager" });

        if (!managerRole) {
            managerRole = await Role.create({
                name: "Manager",
                description: "Manager with comprehensive access to leads, campaigns, and analytics",
                permissions: MANAGER_PERMISSIONS,
                isSystem: true,
            });
            console.log("✓ Created Manager role:", managerRole._id);
        } else {
            // Update permissions if role exists
            managerRole.permissions = MANAGER_PERMISSIONS;
            await managerRole.save();
            console.log("✓ Updated Manager role:", managerRole._id);
        }

        // Step 2: Delete all existing users
        console.log("\nStep 2: Deleting all existing users...");
        const deleteResult = await User.deleteMany({});
        console.log(`✓ Deleted ${deleteResult.deletedCount} users`);

        // Step 3: Create new users with Manager role
        console.log("\nStep 3: Creating new users with Manager role...");
        for (const userData of NEW_USERS) {
            const user = await User.create({
                ...userData,
                role: managerRole._id,
            });
            console.log(`✓ Created user: ${user.email} (${user.name})`);
        }

        console.log("\n=== User Reset Complete ===");
        console.log("\nNew Users Created:");
        console.log("-------------------");
        NEW_USERS.forEach((user) => {
            console.log(`Email: ${user.email}`);
            console.log(`Password: ${user.password}`);
            console.log(`Role: Manager`);
            console.log("-------------------");
        });

    } catch (error) {
        console.error("\n❌ Error during user reset:", error.message);
        throw error;
    }

    process.exit(0);
}

resetUsers().catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
});

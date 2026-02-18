const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

// Reduced list of statuses to avoid invalid parameter or URL length issues
process.env.META_AD_EFFECTIVE_STATUS = JSON.stringify([
    "ACTIVE",
    "PAUSED",
    "ARCHIVED",
    "IN_PROCESS",
    "WITH_ISSUES",
    "PENDING_REVIEW",
    "DISAPPROVED"
]);

const { syncMetaCampaigns, syncMetaLeads } = require("../services/metaLeadSyncService");

const runForceSync = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.error("MONGODB_URI not found");
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        console.log("--- STARTING FORCE CAMPAIGN SYNC ---");
        const campaignSummary = await syncMetaCampaigns();
        console.log("Campaign Sync Summary:", JSON.stringify(campaignSummary, null, 2));

        console.log("--- STARTING FORCE LEADS SYNC (Status Overridden) ---");
        console.log(`Using Effective Status: ${process.env.META_AD_EFFECTIVE_STATUS}`);

        const leadSummary = await syncMetaLeads();
        console.log("Leads Sync Summary:", JSON.stringify(leadSummary, null, 2));

        console.log("--- FORCE SYNC COMPLETE ---");

    } catch (err) {
        console.error("Error during sync:", err);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected");
        process.exit(0);
    }
};

runForceSync();

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { syncMetaCampaigns, syncMetaLeads } = require("../services/metaLeadSyncService");

const runFullSync = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.error("MONGODB_URI not found");
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        console.log("--- STARTING CAMPAIGN SYNC ---");
        const campaignSummary = await syncMetaCampaigns();
        console.log("Campaign Sync Summary:", JSON.stringify(campaignSummary, null, 2));

        console.log("--- STARTING LEADS SYNC ---");
        const leadSummary = await syncMetaLeads();
        console.log("Leads Sync Summary:", JSON.stringify(leadSummary, null, 2));

        console.log("--- FULL SYNC COMPLETE ---");

    } catch (err) {
        console.error("Error during sync:", err);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected");
        process.exit(0);
    }
};

runFullSync();

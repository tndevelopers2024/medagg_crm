const mongoose = require("mongoose");
const path = require("path");
const { syncMetaLeads, syncMetaCampaigns } = require("../services/metaLeadSyncService");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const manualSync = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.error("MONGODB_URI not found");
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        console.log("Starting Campaign Sync...");
        const campSummary = await syncMetaCampaigns();
        console.log("Campaign Sync Summary:", JSON.stringify(campSummary, null, 2));

        console.log("Starting Lead Sync...");
        const leadSummary = await syncMetaLeads();
        console.log("Lead Sync Summary:", JSON.stringify(leadSummary, null, 2));

    } catch (err) {
        console.error("Sync Failed:", err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

manualSync();

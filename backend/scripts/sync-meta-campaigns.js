require("dotenv").config();
const mongoose = require("mongoose");
const { syncMetaCampaigns } = require("../services/metaLeadSyncService");

// Connect to MongoDB
if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => console.log("✅ Database Connected"))
        .catch(err => console.error("❌ Database Connection Error:", err));
} else {
    console.error("❌ MONGODB_URI is missing in environment variables");
    process.exit(1);
}

async function run() {
    try {
        console.log("🔄 Starting Meta Campaign Sync...");

        // Call the sync function
        const summary = await syncMetaCampaigns();

        console.log("\n✅ Sync Completed Successfully!");
        console.log("-----------------------------------");
        console.log(JSON.stringify(summary, null, 2));

    } catch (error) {
        console.error("\n❌ Sync Failed:", error);
    } finally {
        await mongoose.disconnect();
        console.log("👋 Disconnected from DB");
        process.exit(0);
    }
}

// Allow DB connection to establish before running
setTimeout(run, 1000);

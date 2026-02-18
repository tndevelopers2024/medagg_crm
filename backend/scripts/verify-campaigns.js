require("dotenv").config();
const mongoose = require("mongoose");
const Campaign = require("../models/Campaign");

if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => console.log("✅ Database Connected"))
        .catch(err => console.error("❌ Database Connection Error:", err));
}

async function run() {
    try {
        const campaigns = await Campaign.find({ "integration.provider": "meta" }).limit(5).sort({ createdAt: -1 });
        console.log(`Found ${campaigns.length} Meta campaigns.`);
        if (campaigns.length > 0) {
            console.log("Sample Campaign:", JSON.stringify(campaigns[0], null, 2));
        }
    } catch (err) {
        console.error(err);
    } finally {
        const count = await Campaign.countDocuments({ "integration.provider": "meta" });
        console.log(`Total Meta Campaigns in DB: ${count}`);
        await mongoose.disconnect();
        process.exit(0);
    }
}

setTimeout(run, 1000);

const mongoose = require("mongoose");
require("dotenv").config({ path: __dirname + "/../.env" });
const Lead = require("../models/Lead");
const Campaign = require("../models/Campaign");

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        // The ID we found earlier that actually has leads
        const metaId = "120210722012080571";

        // Find the campaign
        const c = await Campaign.findOne({ "integration.metaCampaignId": metaId });
        if (!c) {
            console.log("Campaign not found for ID:", metaId);
            return;
        }
        console.log(`Campaign: ${c.name} (ID: ${c._id})`);

        // Count leads
        const query = {
            $or: [
                { campaignId: c._id },
                { campaignId: String(c._id) },
                { campaignId: metaId }
            ]
        };

        const leadCount = await Lead.countDocuments(query);
        console.log(` - Total Leads: ${leadCount}`);

        if (leadCount > 0) {
            const firstLead = await Lead.findOne(query).sort({ createdTime: 1 });
            const lastLead = await Lead.findOne(query).sort({ createdTime: -1 });

            console.log(` - First Lead Date: ${firstLead.createdTime}`);
            console.log(` - Last Lead Date: ${lastLead.createdTime}`);

            // Check if any in last 7 days
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const recentCount = await Lead.countDocuments({ ...query, createdTime: { $gte: sevenDaysAgo } });
            console.log(` - Leads in last 7 days: ${recentCount}`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

run();

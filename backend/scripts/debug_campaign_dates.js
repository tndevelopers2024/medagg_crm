cconst mongoose = require("mongoose");
require("dotenv").config({ path: __dirname + "/../.env" });
const Lead = require("../models/Lead");
const Campaign = require("../models/Campaign");

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        // 1. Find the campaign from the screenshot
        // "22 June, 24"
        const campaigns = await Campaign.find({ name: { $regex: /22 June, 24/i } });
        console.log(`Found ${campaigns.length} campaigns matching "22 June, 24"`);

        for (const c of campaigns) {
            console.log(`\nCampaign: ${c.name} (ID: ${c._id})`);

            // Check integration IDs
            if (c.integration?.metaCampaignId) console.log(` - Meta ID: ${c.integration.metaCampaignId}`);
            if (c.integration?.externalId) console.log(` - External ID: ${c.integration.externalId}`);

            // Find leads
            // We match by Mongo ID OR Meta ID
            const query = {
                $or: [
                    { campaignId: c._id },
                    { campaignId: String(c._id) }
                ]
            };

            if (c.integration?.metaCampaignId) {
                query.$or.push({ campaignId: c.integration.metaCampaignId });
            }

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
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

run();

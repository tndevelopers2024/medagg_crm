const mongoose = require("mongoose");
require("dotenv").config({ path: __dirname + "/../.env" });
const Lead = require("../models/Lead");
const Campaign = require("../models/Campaign");

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        // Get all campaigns
        const campaigns = await Campaign.find({}, "_id name");
        console.log(`\nTotal Campaigns: ${campaigns.length}`);
        const campaignMap = new Map(campaigns.map(c => [String(c._id), c.name]));

        // Get sample leads with campaignId
        const leads = await Lead.find({ campaignId: { $ne: null } }).limit(20);
        console.log(`\nInspecting ${leads.length} leads with campaignId:`);

        let matchCount = 0;
        leads.forEach(l => {
            const cidString = String(l.campaignId);
            const name = campaignMap.get(cidString);
            const isMatch = !!name;
            if (isMatch) matchCount++;

            console.log(`Lead ${l._id}: campaignId=${l.campaignId} (Type: ${typeof l.campaignId}) | Matches Campaign? ${isMatch ? "YES (" + name + ")" : "NO"}`);
        });

        console.log(`\nMatches found in sample: ${matchCount}/${leads.length}`);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

run();

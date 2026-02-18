const mongoose = require("mongoose");
const path = require("path");
const Campaign = require("../models/Campaign");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const listCampaigns = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.error("MONGODB_URI not found");
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);

        const campaigns = await Campaign.find({}, "name _id status platform");
        console.log(`Found ${campaigns.length} campaigns:`);
        campaigns.forEach(c => console.log(`- [${c.status}] ${c.name} (${c._id})`));

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

listCampaigns();

const mongoose = require("mongoose");
require("dotenv").config({ path: __dirname + "/../.env" });
const Campaign = require("../models/Campaign");

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        const targetId = "120210722012080571";
        console.log(`Searching for campaign with ID: ${targetId}`);

        // Search in integration fields
        const c1 = await Campaign.findOne({ "integration.metaCampaignId": targetId });
        if (c1) console.log("Found in integration.metaCampaignId:", c1.name, c1._id);

        const c2 = await Campaign.findOne({ "integration.externalId": targetId });
        if (c2) console.log("Found in integration.externalId:", c2.name, c2._id);

        // Search anywhere via regex just in case
        // This is expensive but fine for a debug script
        // Actually regex on all fields is hard. Let's list all campaigns and inspect.

        if (!c1 && !c2) {
            console.log("Not found in standard fields. Listing all campaigns with integration data:");
            const all = await Campaign.find({});
            all.forEach(c => {
                if (JSON.stringify(c).includes(targetId)) {
                    console.log("MATCH FOUND IN GENERIC INSPECTION:", c.name, c._id);
                    console.log(JSON.stringify(c, null, 2));
                }
            });
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

run();

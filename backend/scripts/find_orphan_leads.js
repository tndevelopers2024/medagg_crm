const mongoose = require("mongoose");
const path = require("path");
const Lead = require("../models/Lead");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const findOrphanLeads = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.error("MONGODB_URI not found");
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);

        const names = ["summer sale", "new one", "Pongal offer"];

        // Check if leads exist with these names as campaignId or source
        const countCampId = await Lead.countDocuments({ campaignId: { $in: names } });
        const countSource = await Lead.countDocuments({ source: { $in: names } });

        console.log(`Leads with campaignId in [${names}]: ${countCampId}`);
        console.log(`Leads with source in [${names}]: ${countSource}`);

        if (countCampId > 0 || countSource > 0) {
            console.log("Found orphan leads. Deleting...");
            if (countCampId > 0) await Lead.deleteMany({ campaignId: { $in: names } });
            if (countSource > 0) await Lead.deleteMany({ source: { $in: names } });
            console.log("Deleted orphan leads.");
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

findOrphanLeads();

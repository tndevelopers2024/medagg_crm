const mongoose = require("mongoose");
const path = require("path");
const Lead = require("../models/Lead");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const cleanup = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.error("MONGODB_URI not found");
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);

        const ids = [
            "696238e44b1f151695462fa1",
            "696239e486a389cd5c1bedc3",
            "696575b5543f769ed4e65036"
        ];

        const count = await Lead.countDocuments({ campaignId: { $in: ids } });
        console.log(`Leads found with deleted campaign IDs: ${count}`);

        if (count > 0) {
            await Lead.deleteMany({ campaignId: { $in: ids } });
            console.log("Deleted remaining leads.");
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

cleanup();

require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const Lead = require("../models/Lead");

const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is undefined");
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connected");
    } catch (err) {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    }
};

const inspectLead = async () => {
    await connectDB();
    try {
        // Look for the specific name seen in the screenshot
        const lead = await Lead.findOne({ "fieldData.values": "Lorenzo Schmidt" });
        if (lead) {
            console.log("Found 'Lorenzo Schmidt':");
            console.log(JSON.stringify(lead, null, 2));
        } else {
            console.log("Could not find 'Lorenzo Schmidt' by name in fieldData.");
            // Try searching strict text match on common fields just in case
            const looseMatch = await Lead.findOne({ $text: { $search: "Lorenzo Schmidt" } });
            if (looseMatch) {
                console.log("Found via text search:");
                console.log(JSON.stringify(looseMatch, null, 2));
            } else {
                // Fallback: list a few leads created today to identify the pattern
                const recent = await Lead.find().sort({ _id: -1 }).limit(3);
                console.log("Most recent 3 leads:");
                console.log(JSON.stringify(recent, null, 2));
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
};

inspectLead();

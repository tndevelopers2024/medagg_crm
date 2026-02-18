const mongoose = require("mongoose");
const path = require("path");
const Lead = require("../models/Lead");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const inspectLeads = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.error("MONGODB_URI not found in .env");
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        // Fetch first 5 leads
        const leads = await Lead.find().limit(5);
        console.log(`Found ${leads.length} leads. Inspecting first 5:`);

        leads.forEach((l, i) => {
            console.log(`\n--- Lead ${i + 1} ---`);
            console.log("ID:", l._id);
            console.log("Source:", l.source); // Check source field
            console.log("CampaignID:", l.campaignId);
            // Check fieldData for source or campaign_name
            const campaignNameField = l.fieldData.find(f => f.name === "campaign_name");
            if (campaignNameField) console.log("FieldData.campaign_name:", campaignNameField.values);

            const sourceField = l.fieldData.find(f => f.name === "source");
            if (sourceField) console.log("FieldData.source:", sourceField.values);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

inspectLeads();

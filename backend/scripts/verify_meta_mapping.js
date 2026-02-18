const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Lead = require("../models/Lead");

async function verifyMapping() {
    try {
        await connectDB();
        console.log("✅ Connected to MongoDB");

        // Test data
        const testLeadData = {
            leadId: "test-mapping-" + Date.now(),
            platform: "meta",
            fieldData: [
                { name: "city", values: ["Bangalore"] }
            ]
        };

        console.log("Creating test lead with city: Bangalore...");
        const lead = await Lead.create(testLeadData);

        console.log("Lead created. Checking fieldData...");

        const fields = {};
        lead.fieldData.forEach(f => {
            fields[f.name] = f.values[0];
        });

        console.log("Source:", lead.source);
        console.log("Fields:", JSON.stringify(fields, null, 2));

        let success = true;
        if (fields.states !== "Karnataka") {
            console.error("❌ State mapping failed: expected Karnataka, got", fields.states);
            success = false;
        } else {
            console.log("✅ State mapping correct");
        }

        if (fields.location !== "Bangalore") {
            console.error("❌ Location mapping failed: expected Bangalore, got", fields.location);
            success = false;
        } else {
            console.log("✅ Location mapping correct");
        }

        // Cleanup
        await Lead.deleteOne({ _id: lead._id });
        console.log("🗑️ Test lead cleaned up");

        process.exit(success ? 0 : 1);
    } catch (err) {
        console.error("❌ Verification failed:", err);
        process.exit(1);
    }
}

verifyMapping();

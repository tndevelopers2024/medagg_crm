const mongoose = require("mongoose");
const path = require("path");
const LeadFieldConfig = require("../models/LeadFieldConfig");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const listFieldConfigs = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.error("MONGODB_URI not found");
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);

        const fields = await LeadFieldConfig.find({
            fieldName: { $in: ["city", "state", "location"] }
        });

        console.log("Found Fields:", fields.length);
        fields.forEach(f => {
            console.log(`\nName: ${f.fieldName}`);
            console.log(`Type: ${f.fieldType}`);
            console.log(`Options (${f.options.length}):`, f.options.slice(0, 10)); // Show first 10
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

listFieldConfigs();

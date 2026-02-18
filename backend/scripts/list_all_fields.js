const mongoose = require("mongoose");
const path = require("path");
const LeadFieldConfig = require("../models/LeadFieldConfig");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const listAllFields = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.error("MONGODB_URI not found");
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);

        const fields = await LeadFieldConfig.find({}).sort({ order: 1 });

        console.log("Found Fields:", fields.length);
        fields.forEach(f => {
            console.log(`- ${f.fieldName} (${f.fieldType}) [${f.displayLabel}]`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

listAllFields();

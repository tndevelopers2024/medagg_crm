const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const Lead = require("../models/Lead");

const count = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const c = await Lead.countDocuments();
        console.log(`Current Lead Count: ${c}`);
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};
count();

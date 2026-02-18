require("dotenv").config({ path: "./.env" });
const mongoose = require("mongoose");
const Lead = require("./models/Lead");

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI || "mongodb+srv://medagg:Medagg%40%232k25@medagg.sumfi06.mongodb.net/medagg?retryWrites=true&w=majority&appName=medagg";
        await mongoose.connect(uri);
        console.log("MongoDB Connected");
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

const inspectLeads = async () => {
    await connectDB();

    // Phone from screenshot: 6379034696
    const phoneNumber = "6379034696";

    console.log(`Searching for phone: ${phoneNumber}...`);

    // We search broadly in fieldData.values to find anything that matches
    const leads = await Lead.find({
        "fieldData.values": { $regex: phoneNumber }
    });

    console.log(`Found ${leads.length} leads.`);

    leads.forEach(l => {
        console.log("---------------------------------------------------");
        console.log(`ID: ${l._id} (${l.leadId})`);
        console.log(`Status: ${l.status}`);
        console.log("FieldData:", JSON.stringify(l.fieldData, null, 2));
    });

    process.exit(0);
};

inspectLeads();

require("dotenv").config({ path: "./.env" });
const mongoose = require("mongoose");
const Lead = require("./models/Lead");

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI || "mongodb+srv://medagg:Medagg%40%232k25@medagg.sumfi06.mongodb.net/medagg?retryWrites=true&w=majority&appName=medagg";
        await mongoose.connect(uri);
    } catch (err) {
        process.exit(1);
    }
};

const checkSpecificLeads = async () => {
    await connectDB();
    const phones = ["9743295046", "9444644910", "9747869908", "9188284676", "8075674421"];

    // They are stored possibly with +91 or raw
    const leads = await Lead.find({
        "fieldData": { $elemMatch: { name: "phone_number", values: { $in: phones.map(p => "+91" + p).concat(phones) } } }
    });

    leads.forEach(l => {
        console.log(`Lead Name: ${l.fieldData.find(f => f.name === 'full_name')?.values[0]}`);
        console.log(`Phone: ${l.fieldData.find(f => f.name === 'phone_number')?.values[0]}`);
        console.log(`FollowUpAt: ${l.followUpAt} (UTC string: ${l.followUpAt ? new Date(l.followUpAt).toUTCString() : "null"})`);
        console.log("----------------------");
    });
    process.exit(0);
};

checkSpecificLeads();

// scripts/viewLeads.js
// Quick script to view the current leads in the database

const mongoose = require("mongoose");
const Lead = require("../models/Lead");
require("dotenv").config();

async function viewLeads() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Connected to MongoDB\n");

        const leads = await Lead.find().sort({ createdTime: -1 }).limit(10);
        const totalCount = await Lead.countDocuments();

        console.log(`📊 Total Leads in Database: ${totalCount}\n`);
        console.log("📋 Latest 10 Leads:\n");

        leads.forEach((lead, index) => {
            const getName = (fd) => fd.find((f) => f.name === "full_name")?.values?.[0] || "N/A";
            const getPhone = (fd) => fd.find((f) => f.name === "phone_number")?.values?.[0] || "N/A";
            const getCity = (fd) => fd.find((f) => f.name === "city")?.values?.[0] || "N/A";
            const getGender = (fd) => fd.find((f) => f.name === "gender")?.values?.[0] || "N/A";

            console.log(`${index + 1}. ${getName(lead.fieldData)}`);
            console.log(`   Phone: ${getPhone(lead.fieldData)}`);
            console.log(`   City: ${getCity(lead.fieldData)}`);
            console.log(`   Gender: ${getGender(lead.fieldData)}`);
            console.log(`   Status: ${lead.status}`);
            console.log(`   Created: ${lead.createdTime.toISOString()}`);
            console.log(`   Assigned: ${lead.assignedTo ? "Yes" : "No"}\n`);
        });

        // Show status distribution
        const statusCounts = await Lead.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        console.log("📈 Status Distribution:");
        statusCounts.forEach(({ _id, count }) => {
            console.log(`   ${_id}: ${count}`);
        });

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

viewLeads();

require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('../models/Lead');

async function removeAllLeads() {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error("MONGODB_URI is missing");

        await mongoose.connect(uri);
        console.log("Connected to MongoDB.");

        const result = await Lead.deleteMany({});
        console.log(`Deleted ${result.deletedCount} leads.`);

        // Optional: Delete related activities/calls/notifications if necessary,
        // but the instruction just says "remove all leads". We'll stick to just leads.

        console.log("Successfully removed all leads.");
        process.exit(0);
    } catch (error) {
        console.error("Error removing leads:", error);
        process.exit(1);
    }
}

removeAllLeads();

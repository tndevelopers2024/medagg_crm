require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('../models/Lead');

async function checkLeads() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const count = await Lead.countDocuments();
        console.log(`Current leads count: ${count}`);
        const leads = await Lead.find({}).limit(5).lean();
        console.log('Sample leads:', JSON.stringify(leads, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkLeads();

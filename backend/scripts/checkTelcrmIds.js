require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('../models/Lead');

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);

    const total = await Lead.countDocuments();
    const withTelcrmId = await Lead.countDocuments({ telcrmLeadId: { $exists: true, $ne: null, $ne: '' } });
    const withoutTelcrmId = await Lead.countDocuments({
        $or: [
            { telcrmLeadId: { $exists: false } },
            { telcrmLeadId: null },
            { telcrmLeadId: '' },
        ]
    });

    console.log(`Total leads: ${total}`);
    console.log(`With telcrmLeadId: ${withTelcrmId}`);
    console.log(`Without telcrmLeadId: ${withoutTelcrmId}`);

    // Show a few samples without telcrmLeadId
    if (withoutTelcrmId > 0) {
        const samples = await Lead.find({
            $or: [
                { telcrmLeadId: { $exists: false } },
                { telcrmLeadId: null },
                { telcrmLeadId: '' },
            ]
        }).limit(3).select('leadId telcrmLeadId platform source').lean();
        console.log('\nSample leads WITHOUT telcrmLeadId:', JSON.stringify(samples, null, 2));
    }

    process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });

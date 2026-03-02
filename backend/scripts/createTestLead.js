/**
 * Creates a test lead directly in MongoDB to verify lead creation works.
 * Run: node scripts/createTestLead.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('../models/Lead');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const lead = await Lead.create({
    leadId: `manual_test_${Date.now()}`,
    createdTime: new Date(),
    fieldData: [
      { name: 'full_name', values: ['Claude Test Lead'] },
      { name: 'phone_number', values: ['9999999999'] },
      { name: 'lead_source', values: ['Manual'] },
    ],
    status: 'New Lead',
    notes: 'Test lead created by script to verify createLead fix',
    opBookings: [],
    ipBookings: [],
    diagnosticBookings: [],
  });

  console.log('✅ Test lead created:');
  console.log(`  ID: ${lead._id}`);
  console.log(`  Lead ID: ${lead.leadId}`);
  console.log(`  Status: ${lead.status}`);
  console.log(`  Name: ${lead.fieldData.find(f => f.name === 'full_name')?.values[0]}`);
  console.log(`  Phone: ${lead.fieldData.find(f => f.name === 'phone_number')?.values[0]}`);

  process.exit(0);
}

run().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });

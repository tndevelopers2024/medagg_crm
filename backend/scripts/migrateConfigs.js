const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const LeadFieldConfig = require('../models/LeadFieldConfig');
const BookingFieldConfig = require('../models/BookingFieldConfig');
const LeadStageConfig = require('../models/LeadStageConfig');

const SOURCE_URI = "mongodb+srv://medagg:Medagg%40%232k25@medagg.sumfi06.mongodb.net/medagg?retryWrites=true&w=majority&appName=medagg";

async function migrate() {
    console.log("Connecting to Source DB...");
    // Create a separate connection for source to avoid conflict with default connection used by models
    const sourceConn = await mongoose.createConnection(SOURCE_URI).asPromise();
    console.log("Connected to Source.");

    try {
        // Read Data
        const sourceLeadFields = await sourceConn.collection('leadfieldconfigs').find({}).toArray();
        console.log(`Fetched ${sourceLeadFields.length} LeadFieldConfigs from source.`);

        const sourceBookingFields = await sourceConn.collection('bookingfieldconfigs').find({}).toArray();
        console.log(`Fetched ${sourceBookingFields.length} BookingFieldConfigs from source.`);

        const sourceLeadStages = await sourceConn.collection('leadstageconfigs').find({}).toArray();
        console.log(`Fetched ${sourceLeadStages.length} LeadStageConfigs from source.`);

        await sourceConn.close();
        console.log("Closed Source Connection.\n");

        console.log("Connecting to Target DB...");
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is not defined");
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to Target.");

        // 1. Migrate LeadFieldConfig
        console.log("Migrating LeadFieldConfig...");
        let lfCount = 0;
        for (const doc of sourceLeadFields) {
            delete doc._id; // Remove _id to let target DB handle it or avoid conflicts, upserting by unique key
            delete doc.__v;

            await LeadFieldConfig.findOneAndUpdate(
                { fieldName: doc.fieldName },
                { $set: doc },
                { upsert: true, new: true }
            );
            lfCount++;
        }
        console.log(`LeadFieldConfigs migrated: ${lfCount}`);

        // 2. Migrate BookingFieldConfig
        console.log("Migrating BookingFieldConfig...");
        let bfCount = 0;
        for (const doc of sourceBookingFields) {
            delete doc._id;
            delete doc.__v;

            await BookingFieldConfig.findOneAndUpdate(
                { bookingType: doc.bookingType, fieldName: doc.fieldName },
                { $set: doc },
                { upsert: true, new: true }
            );
            bfCount++;
        }
        console.log(`BookingFieldConfigs migrated: ${bfCount}`);

        // 3. Migrate LeadStageConfig
        console.log("Migrating LeadStageConfig...");
        let lsCount = 0;
        for (const doc of sourceLeadStages) {
            delete doc._id;
            delete doc.__v;

            await LeadStageConfig.findOneAndUpdate(
                { stageName: doc.stageName },
                { $set: doc },
                { upsert: true, new: true }
            );
            lsCount++;
        }
        console.log(`LeadStageConfigs migrated: ${lsCount}`);

    } catch (err) {
        console.error("Migration Error:", err);
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
            console.log("Disconnected Target.");
        }
        process.exit(0);
    }
}

migrate();

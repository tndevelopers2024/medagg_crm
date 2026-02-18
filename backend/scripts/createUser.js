const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("../models/User");

// Load env vars from backend/.env
dotenv.config({ path: path.join(__dirname, "../.env") });

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const createUsers = async () => {
    await connectDB();

    console.log("Starting User Creation...");

    const usersToCreate = [
        {
            name: "Caller One",
            email: "Caller1@medagg.com",
            password: "123456",
            role: "caller",
            phone: "1234567891",
            isVerified: true
        },
        {
            name: "Caller Two",
            email: "Caller2@medagg.com",
            password: "123456",
            role: "caller",
            phone: "1234567892",
            isVerified: true
        }
    ];

    for (const userData of usersToCreate) {
        try {
            const exists = await User.findOne({ email: userData.email });
            if (exists) {
                console.log(`[SKIP] User already exists (${userData.email})`);
                // Update password anyway if user exists to ensure consistency? 
                // No, let's just skip to be safe.
            } else {
                await User.create(userData);
                console.log(`[CREATED] User: ${userData.email} / ${userData.password}`);
            }
        } catch (err) {
            console.error(`[ERROR] Failed to create user ${userData.email}:`, err.message);
        }
    }

    console.log(`\nDone!`);
    process.exit();
};

createUsers();

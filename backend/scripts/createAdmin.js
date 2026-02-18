const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("../models/User");

// Load env vars from backend/.env (sibling to scripts folder)
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

const createAdmin = async () => {
    await connectDB();

    console.log("Starting Admin Creation...");

    const email = "admin@medagg.com";
    const phone = "9999999999";

    try {
        const exists = await User.findOne({ email });
        if (exists) {
            console.log(`[SKIP] Admin already exists (${email})`);
        } else {
            await User.create({
                name: "Admin User",
                email,
                password: "password123", // Default password
                role: "admin",
                state: "Tamil Nadu", // Required field
                city: "Chennai",
                phone: phone,
                isVerified: true
            });
            console.log(`[CREATED] Admin: ${email} / password123`);
        }

    } catch (err) {
        console.error(`[ERROR] Failed to create Admin:`, err.message);
    }

    console.log(`\nDone!`);
    process.exit();
};

createAdmin();

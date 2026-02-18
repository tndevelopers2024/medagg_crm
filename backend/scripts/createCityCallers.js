const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("../models/User");

// Load env vars from backend/.env (sibling to scripts folder)
dotenv.config({ path: path.join(__dirname, "../.env") });

const cityToState = {
    "Chennai": "Tamil Nadu", "Coimbatore": "Tamil Nadu",
    "Bangalore": "Karnataka",
    "Mumbai": "Maharashtra", "Pune": "Maharashtra",
    "Delhi": "Delhi",
    "Hyderabad": "Telangana",
    "Kolkata": "West Bengal",
    "Ahmedabad": "Gujarat",
    "Jaipur": "Rajasthan",
    "Lucknow": "Uttar Pradesh"
};

const connectDB = async () => {
    try {
        const conn = await mongoose.connect('mongodb+srv://medagg:Medagg%40%232k25@medagg.sumfi06.mongodb.net/medagg?retryWrites=true&w=majority&appName=medagg');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const seedCallers = async () => {
    await connectDB();

    console.log("Starting Caller Creation...");
    let count = 0;

    for (const [city, state] of Object.entries(cityToState)) {
        const citySlug = city.toLowerCase().replace(/\s+/g, "");
        const email = `caller.${citySlug}@medagg.com`; // Convention: caller.chennai@medagg.com
        const phone = `90000${String(count).padStart(5, '0')}`; // 9000000000, 9000000001...

        try {
            const exists = await User.findOne({ email });
            if (exists) {
                console.log(`[SKIP] User for ${city} already exists (${email})`);
                continue;
            }

            await User.create({
                name: `Caller - ${city}`,
                email,
                password: "password123", // Default password
                role: "caller",
                city: city,
                state: state,
                phone: phone,
                isVerified: true
            });

            console.log(`[CREATED] Caller for ${city}: ${email} / password123`);
            count++;

        } catch (err) {
            console.error(`[ERROR] Failed to create for ${city}:`, err.message);
        }
    }

    console.log(`\nDone! Created ${count} new callers.`);
    process.exit();
};

seedCallers();

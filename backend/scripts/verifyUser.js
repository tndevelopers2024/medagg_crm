const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const connectDB = require("../config/db");
const User = require("../models/User");

async function verifyUser(email) {
    try {
        await connectDB();
        console.log("✅ Connected to MongoDB");

        if (!email) {
            console.log("📝 No email provided. Verifying all users...");
            const result = await User.updateMany(
                { isVerified: false },
                { $set: { isVerified: true } }
            );
            console.log(`✅ Verified ${result.modifiedCount} users.`);
        } else {
            const user = await User.findOne({ email });
            if (!user) {
                console.log(`❌ User with email ${email} not found.`);
                process.exit(1);
            }

            user.isVerified = true;
            user.emailVerificationToken = undefined;
            user.emailVerificationExpire = undefined;
            await user.save();

            console.log(`✅ User ${email} has been verified.`);
        }

        process.exit(0);
    } catch (error) {
        console.error("❌ verification failed:", error);
        process.exit(1);
    }
}

const email = process.argv[2];
verifyUser(email);

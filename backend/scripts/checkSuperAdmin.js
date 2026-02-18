const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("../models/User");
const Role = require("../models/Role");

dotenv.config({ path: path.join(__dirname, "../.env") });

const checkSuperAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB\n");

        const user = await User.findOne({ email: "superadmin@medagg.com" }).populate("role");

        if (!user) {
            console.log("❌ Super admin user NOT found in database");
        } else {
            console.log("✓ Super admin user found:");
            console.log("  Email:", user.email);
            console.log("  Name:", user.name);
            console.log("  Role:", user.role ? user.role.name : "NO ROLE");
            console.log("  Role ID:", user.role ? user.role._id : "NO ROLE");
            console.log("  isSystemAdmin:", user.role ? user.role.isSystemAdmin : "N/A");
            console.log("  isVerified:", user.isVerified);
            console.log("  State:", user.state);
            console.log("  Phone:", user.phone);
        }

        process.exit(0);
    } catch (error) {
        console.error("Error:", error.message);
        process.exit(1);
    }
};

checkSuperAdmin();

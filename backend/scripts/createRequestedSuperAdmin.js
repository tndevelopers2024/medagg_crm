const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("../models/User");
const Role = require("../models/Role");

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

const createSuperAdmin = async () => {
    await connectDB();

    console.log("Starting Super Admin Creation...\n");

    const email = "superadmin@nosurgeries.in";
    const phone = "0000000000";

    try {
        // Find or create System Admin role
        let superAdminRole = await Role.findOne({ isSystemAdmin: true });

        if (!superAdminRole) {
            console.log("Creating System Admin role...");
            superAdminRole = await Role.create({
                name: "System Admin",
                isSystemAdmin: true,
                permissions: [], // System admins bypass all permission checks
            });
            console.log("✓ System Admin role created");
        } else {
            console.log(`✓ Found existing System Admin role: ${superAdminRole.name}`);
        }

        // Check if super admin user already exists
        const exists = await User.findOne({ email });
        if (exists) {
            console.log(`\n[SKIP] Super Admin already exists (${email})`);
            console.log(`Current role: ${exists.role}`);
        } else {
            await User.create({
                name: "Super Admin",
                email,
                password: "SuperAdmin@123",
                role: superAdminRole._id,
                state: ["All"], // Access to all states
                phone: phone,
                isVerified: true,
            });
            console.log(`\n✓ [CREATED] Super Admin User`);
            console.log(`   Email: ${email}`);
            console.log(`   Password: SuperAdmin@123`);
            console.log(`   Role: ${superAdminRole.name}`);
            console.log(`\n⚠️  IMPORTANT: Change this password after first login!`);
        }
    } catch (err) {
        console.error(`\n[ERROR] Failed to create Super Admin:`, err.message);
    }

    console.log(`\nDone!`);
    process.exit();
};

createSuperAdmin();

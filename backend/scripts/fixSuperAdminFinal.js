const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Role = require("../models/Role");
const User = require("../models/User");

dotenv.config({ path: path.join(__dirname, "../.env") });

const fixSuperAdminFinal = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB\n");

        // Check if "Admin" role exists
        let adminRole = await Role.findOne({ name: /^admin$/i });

        if (!adminRole) {
            console.log("Creating Admin role with system privileges...");
            adminRole = await Role.create({
                name: "Admin",
                description: "System administrator with full access",
                isSystem: true,
                permissions: []
            });
            console.log("✓ Admin role created");
        } else {
            console.log("Found existing Admin role");
            if (!adminRole.isSystem) {
                adminRole.isSystem = true;
                await adminRole.save();
                console.log("✓ Updated Admin role with isSystem: true");
            } else {
                console.log("✓ Admin role already has isSystem: true");
            }
        }

        // Update super admin user to use Admin role
        const user = await User.findOne({ email: "superadmin@medagg.com" });

        if (user) {
            console.log("\n✓ Super admin user found");
            user.role = adminRole._id;
            await user.save();
            console.log("✓ Updated super admin to use Admin role");
        } else {
            console.log("\n❌ Super admin user not found");
            console.log("Creating super admin user...");
            await User.create({
                name: "Super Admin",
                email: "superadmin@medagg.com",
                password: "SuperAdmin@123",
                role: adminRole._id,
                state: ["All"],
                phone: "8888888888",
                isVerified: true
            });
            console.log("✓ Super admin user created");
        }

        // Clean up old "System Admin" role if it exists and has no users
        const oldRole = await Role.findOne({ name: "System Admin" });
        if (oldRole) {
            const usersWithOldRole = await User.countDocuments({ role: oldRole._id });
            if (usersWithOldRole === 0) {
                await Role.deleteOne({ _id: oldRole._id });
                console.log("\n✓ Removed unused 'System Admin' role");
            }
        }

        console.log("\n✅ Super admin setup complete!");
        console.log("\nLogin credentials:");
        console.log("  Email: superadmin@medagg.com");
        console.log("  Password: SuperAdmin@123");
        console.log("  Role: Admin (with system privileges)");

        process.exit(0);
    } catch (error) {
        console.error("\n❌ Error:", error.message);
        console.error(error);
        process.exit(1);
    }
};

fixSuperAdminFinal();

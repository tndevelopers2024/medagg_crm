const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Role = require("../models/Role");
const User = require("../models/User");

dotenv.config({ path: path.join(__dirname, "../.env") });

const fixSuperAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB\n");

        // Find or update the System Admin role to have isSystem: true
        let systemAdminRole = await Role.findOne({ name: "System Admin" });

        if (systemAdminRole) {
            console.log("Updating existing System Admin role...");
            systemAdminRole.isSystem = true;
            await systemAdminRole.save();
            console.log("✓ System Admin role updated with isSystem: true");
        } else {
            console.log("Creating System Admin role...");
            systemAdminRole = await Role.create({
                name: "System Admin",
                description: "System administrator with full access to all features",
                isSystem: true,
                permissions: [] // System admins bypass all permission checks
            });
            console.log("✓ System Admin role created");
        }

        // Verify the super admin user
        const user = await User.findOne({ email: "superadmin@medagg.com" });

        if (user) {
            console.log("\n✓ Super admin user exists");
            console.log("  Email:", user.email);
            console.log("  Role ID:", user.role);

            // Make sure user is assigned to the System Admin role
            if (user.role.toString() !== systemAdminRole._id.toString()) {
                user.role = systemAdminRole._id;
                await user.save();
                console.log("  ✓ Updated user role assignment");
            }
        } else {
            console.log("\n❌ Super admin user not found - run createSuperAdmin.js first");
        }

        console.log("\n✅ Super admin setup complete!");
        console.log("\nLogin credentials:");
        console.log("  Email: superadmin@medagg.com");
        console.log("  Password: SuperAdmin@123");

        process.exit(0);
    } catch (error) {
        console.error("\n❌ Error:", error.message);
        process.exit(1);
    }
};

fixSuperAdmin();

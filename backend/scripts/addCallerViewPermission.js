const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Role = require('../models/Role');

const addPermissionToManager = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const managerRole = await Role.findOne({ name: 'Manager' });
        if (!managerRole) {
            console.log('❌ Manager role not found');
            process.exit(1);
        }

        const permission = 'callers.callers.view';
        const hasPermission = managerRole.permissions.includes(permission);

        console.log(`\nManager role currently has ${managerRole.permissions.length} permissions`);
        console.log(`Has ${permission}: ${hasPermission}`);

        if (!hasPermission) {
            console.log(`\n✓ Adding ${permission} to Manager role...`);
            managerRole.permissions.push(permission);
            await managerRole.save();
            console.log('✓ Permission added successfully');
        } else {
            console.log(`\n✓ Manager already has ${permission}`);
        }

        console.log(`\nManager permissions (${managerRole.permissions.length} total):`);
        managerRole.permissions.sort().forEach(p => console.log(`  - ${p}`));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

addPermissionToManager();

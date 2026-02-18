const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '../backend/.env' });

const testAdminScoping = async () => {
    const adminId = "69918bf174e7eabd3098dd2f"; // Super Admin
    const secret = process.env.JWT_SECRET || "medagg_secret_key_2024";

    const token = jwt.sign({ id: adminId, roleName: "admin" }, secret);

    console.log("Simulating Admin request with scope=assigned...");
    try {
        const response = await axios.get('http://localhost:5099/api/v1/leads/admin/stats/dashboard-v2?scope=assigned', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log("Status:", response.status);
        console.log("Todays Leads Count:", response.data.kpiCards?.todaysLeads);
        // Add more checks if needed
    } catch (err) {
        console.error("Error:", err.response?.data || err.message);
    }
};

testAdminScoping();

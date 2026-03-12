const axios = require('axios');
require("dotenv").config({ path: "../frontend/.env" });

async function run() {
  try {
    const loginRes = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'admin@telcrm.com', // Change this if you have a different email
      password: 'password123'    // Change this if you have a different password
    });
    
    const token = loginRes.data.token;
    
    // Now hit the log-send API
    const res = await axios.post('http://localhost:5000/api/v1/wa-templates/log-send', 
      {
        leadId: "69adcfc9e340ae5af7780530",
        message: "Test message from API script",
        templateName: "Test Template"
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    console.log("Response:", res.data);
  } catch (err) {
    console.error("Error:", err.response ? err.response.data : err.message);
  }
}
run();

const express = require("express");
const router = express.Router();
const { protect, checkPermission } = require("../middleware/auth");
const { exportLeads } = require("../controllers/exportController");

// @route   POST /api/v1/export/leads
// @desc    Export leads to CSV
// @access  Private
router.post("/leads", protect, checkPermission("leads.all.export"), exportLeads);

module.exports = router;

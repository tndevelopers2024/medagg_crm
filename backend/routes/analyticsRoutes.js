// routes/analyticsRoutes.js
const express = require("express");
const router = express.Router();
const { protect, authorize, checkPermission } = require("../middleware/auth");
const {
    getLeadAnalytics,
    getFilterOptions,
    exportAnalytics,
} = require("../controllers/analyticsController");

// All routes require authentication
router.use(protect);

// @route   POST /api/v1/analytics/leads
// @desc    Get lead analytics with filters
// @access  Private
router.post("/leads", checkPermission("analytics.analytics.view"), getLeadAnalytics);

// @route   GET /api/v1/analytics/filters
// @desc    Get available filter options
// @access  Private
router.get("/filters", checkPermission("analytics.analytics.view"), getFilterOptions);

// @route   POST /api/v1/analytics/export
// @desc    Export analytics data
// @access  Private
router.post("/export", checkPermission("analytics.analytics.export"), exportAnalytics);

module.exports = router;

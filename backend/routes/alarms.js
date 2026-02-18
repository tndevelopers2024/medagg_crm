const express = require("express");
const router = express.Router();
const {
    createAlarm,
    getUserAlarms,
    getActiveAlarmsCount,
    updateAlarm,
    deleteAlarm,
    getLeadAlarm,
} = require("../controllers/alarmController");
const { protect, checkPermission } = require("../middleware/auth");

// All routes require authentication
router.use(protect);

// Create alarm
router.post("/", checkPermission("alarms.alarms.create"), createAlarm);

// Get user's alarms
router.get("/", checkPermission("alarms.alarms.view"), getUserAlarms);

// Get active alarms count
router.get("/count", checkPermission("alarms.alarms.view"), getActiveAlarmsCount);

// Get alarm for specific lead
router.get("/lead/:leadId", checkPermission("alarms.alarms.view"), getLeadAlarm);

// Update alarm
router.patch("/:id", checkPermission("alarms.alarms.edit"), updateAlarm);

// Delete alarm
router.delete("/:id", checkPermission("alarms.alarms.delete"), deleteAlarm);

module.exports = router;

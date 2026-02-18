const express = require("express");
const {
  listAllActivities,        // admin
  listByLead,               // caller (only their own lead)
  listMine,                 // caller (their own actions)
  searchMyLeadActivities,   // caller (search within their leads)
  deleteActivity,           // admin
} = require("../controllers/activityController");

const router = express.Router();

const { protect, authorize, checkPermission } = require("../middleware/auth");


// CALLER — my recent actions across my leads
router.get("/mine", protect, checkPermission("leads.detail.viewActivities"), listMine);

// CALLER — activity for a specific lead I own
router.get("/lead/:id", protect, checkPermission("leads.detail.viewActivities"), listByLead);

// CALLER — search within my leads (same query params as admin)
router.get("/search", protect, checkPermission("leads.detail.viewActivities"), searchMyLeadActivities);

// ADMIN — delete a specific activity log
router.delete("/:activityId", protect, checkPermission("leads.detail.viewActivities"), deleteActivity);

module.exports = router;

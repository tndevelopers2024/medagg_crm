// routes/importRoutes.js
const express = require("express");
const router = express.Router();
const { protect, checkPermission } = require("../middleware/auth");
const {
  importLeads,
  getMappings,
  saveMappings,
  deleteMapping,
} = require("../controllers/importController");
const { importActivities } = require("../controllers/activityImportController");

// All routes require auth + import permission
router.use(protect);
router.use(checkPermission("campaigns.import.import"));

router.post("/leads", importLeads);
router.post("/activities", importActivities);
router.get("/mappings", getMappings);
router.post("/mappings", saveMappings);
router.delete("/mappings/:id", deleteMapping);

module.exports = router;

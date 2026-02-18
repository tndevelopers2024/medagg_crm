const express = require("express");
const router = express.Router();
const {
    getLeadStages,
    createLeadStage,
    updateLeadStage,
    deleteLeadStage,
    reorderLeadStages,
} = require("../controllers/leadStageController");
const { protect, authorize, checkPermission } = require("../middleware/auth");

// GET route
router.route("/").get(protect, checkPermission("settings.leadStages.view"), getLeadStages);

// POST route
router.route("/").post(protect, checkPermission("settings.leadStages.create"), createLeadStage);

// PUT/DELETE routes
router.route("/:id")
    .put(protect, checkPermission("settings.leadStages.edit"), updateLeadStage)
    .delete(protect, checkPermission("settings.leadStages.delete"), deleteLeadStage);

router.patch("/reorder", protect, checkPermission("settings.leadStages.reorder"), reorderLeadStages);

module.exports = router;

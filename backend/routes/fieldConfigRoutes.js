const express = require("express");
const router = express.Router();
const {
    getFieldConfigs,
    createFieldConfig,
    updateFieldConfig,
    deleteFieldConfig,
    reorderFields,
} = require("../controllers/fieldConfigController");
const { protect, authorize, checkPermission } = require("../middleware/auth");

// GET route
router.route("/").get(protect, checkPermission("settings.fieldSettings.view"), getFieldConfigs);

// POST route
router.route("/").post(protect, checkPermission("settings.fieldSettings.create"), createFieldConfig);

// PUT/DELETE routes
router.route("/:id")
    .put(protect, checkPermission("settings.fieldSettings.edit"), updateFieldConfig)
    .delete(protect, checkPermission("settings.fieldSettings.delete"), deleteFieldConfig);

router.patch("/reorder", protect, checkPermission("settings.fieldSettings.reorder"), reorderFields);

module.exports = router;

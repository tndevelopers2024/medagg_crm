const express = require("express");
const adminOrSyncKey = require("../middleware/adminOrSyncKey");
const { syncMeta } = require("../controllers/integrationController");

const router = express.Router();

// Manual/scheduled trigger (protected)
router.post("/meta/sync", adminOrSyncKey(), syncMeta);

module.exports = router;


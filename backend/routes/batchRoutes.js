const express = require("express");
const router = express.Router();
const { protect, checkPermission } = require("../middleware/auth");
const { getBatches, assignBatch } = require("../controllers/batchController");

router.get("/", protect, checkPermission("campaigns.campaigns.view"), getBatches);
router.post("/assign", protect, checkPermission("campaigns.campaigns.edit"), assignBatch);

module.exports = router;

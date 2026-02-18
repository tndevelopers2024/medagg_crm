const express = require("express");
const router = express.Router();
const { getCampaigns, createCampaign, syncCampaignLeads, uploadLeads, getUploadHistory, checkDuplicates, bulkImportLeads, updateCampaign } = require("../controllers/campaignController");
const { protect, authorize, checkPermission } = require("../middleware/auth");

router
    .route("/")
    .get(protect, checkPermission("campaigns.campaigns.view"), getCampaigns)
    .post(protect, checkPermission("campaigns.campaigns.create"), createCampaign);

router
    .route("/:id")
    .put(protect, checkPermission("campaigns.campaigns.edit"), updateCampaign);

router.post("/:id/sync", protect, checkPermission("campaigns.campaigns.sync"), syncCampaignLeads);
router.post("/:id/upload", protect, checkPermission("campaigns.import.import"), uploadLeads);
router.get("/:id/uploads", protect, checkPermission("campaigns.import.view"), getUploadHistory);
router.post("/check-duplicates", protect, checkPermission("campaigns.import.import"), checkDuplicates);
router.post("/bulk-import", protect, checkPermission("campaigns.import.import"), bulkImportLeads);
router.post("/sync-meta", protect, checkPermission("campaigns.campaigns.sync"), require("../controllers/campaignController").syncMetaCampaignsHandler);


module.exports = router;


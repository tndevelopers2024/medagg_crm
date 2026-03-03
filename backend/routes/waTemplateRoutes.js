const express = require("express");
const router = express.Router();
const { protect, authorize, checkPermission } = require("../middleware/auth");
const {
  getWaTemplates,
  createWaTemplate,
  updateWaTemplate,
  deleteWaTemplate,
  bulkCreateWaTemplates,
  logWhatsAppSend,
} = require("../controllers/waTemplateController");

router.use(protect);

router.route("/").get(checkPermission("leads.detail.whatsapp"), getWaTemplates).post(checkPermission("leads.detail.whatsapp"), createWaTemplate);
router.post("/bulk", checkPermission("leads.detail.whatsapp"), bulkCreateWaTemplates);
router.post("/log-send", checkPermission("leads.detail.whatsapp"), logWhatsAppSend);
router.route("/:id").put(checkPermission("leads.detail.whatsapp"), updateWaTemplate).delete(checkPermission("leads.detail.whatsapp"), deleteWaTemplate);

module.exports = router;

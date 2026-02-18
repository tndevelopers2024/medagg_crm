const express = require("express");
const router = express.Router();
const { protect, authorize, checkPermission } = require("../middleware/auth");
const {
  getWaTemplates,
  createWaTemplate,
  updateWaTemplate,
  deleteWaTemplate,
} = require("../controllers/waTemplateController");

router.use(protect);

router.route("/").get(checkPermission("leads.detail.whatsapp"), getWaTemplates).post(checkPermission("leads.detail.whatsapp"), createWaTemplate);
router.route("/:id").put(checkPermission("leads.detail.whatsapp"), updateWaTemplate).delete(checkPermission("leads.detail.whatsapp"), deleteWaTemplate);

module.exports = router;

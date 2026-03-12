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

router.route("/").get(getWaTemplates).post(createWaTemplate);
router.post("/bulk", bulkCreateWaTemplates);
router.post("/log-send", logWhatsAppSend);
router.route("/:id").put(updateWaTemplate).delete(deleteWaTemplate);

module.exports = router;


const express = require("express");
const { checkPermission } = require("../middleware/auth");
const {
  createHelpRequest,
  getIncomingRequests,
  respondToRequest,
  getSentRequests,
} = require("../controllers/helpRequestController");

const router = express.Router();

// All routes are already protected by caller route middleware (protect + authorize)

// POST   /caller/help-request          — Create a new help/transfer request
router.post("/", checkPermission("leads.detail.helpRequest"), createHelpRequest);

// GET    /caller/help-request          — List incoming requests
router.get("/", checkPermission("leads.detail.helpRequest"), getIncomingRequests);

// GET    /caller/help-request/sent     — List sent requests
router.get("/sent", checkPermission("leads.detail.helpRequest"), getSentRequests);

// PATCH  /caller/help-request/:id/respond — Accept or reject a request
router.patch("/:id/respond", checkPermission("leads.detail.helpRequest"), respondToRequest);

module.exports = router;

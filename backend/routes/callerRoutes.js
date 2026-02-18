const express = require("express");
const { protect, authorize, checkPermission } = require("../middleware/auth");
const {
  // Leads & details
  getMyAssignedLeads,
  getLeadDetail,
  updateLeadStatus,
  updateLeadDetails,

  // Calls
  logCall,
  getLeadCallLogs,

  // Follow-ups & stats
  getTodayFollowUps,
  getFollowUpsByRange,
  getMyStats,
  getDashboardStats,

  // Bookings
  addOpBooking,
  updateOpBooking,
  removeOpBooking,
  addIpBooking,
  updateIpBooking,
  removeIpBooking,
  addDiagnosticBooking,
  updateDiagnosticBooking,
  removeDiagnosticBooking,
  getTomorrowFollowUps,
  getYesterdayAssignedLeads,
  // Activities
  getLeadActivities,

  // NEW: manual defer to next day
  moveLeadToNextDay,
} = require("../controllers/callerController");

const helpRequestRoutes = require("./helpRequestRoutes");

const router = express.Router();

// All endpoints here require auth + caller/admin role
router.use(protect);

// Help request / transfer sub-routes
router.use("/help-request", helpRequestRoutes);

// Leads — named routes must come before /:id to avoid matching as an ID param
router.get("/leads/assigned", checkPermission("leads.all.view"), getMyAssignedLeads);
router.get("/leads/yesterday", checkPermission("leads.all.view"), getYesterdayAssignedLeads);
router.get("/leads/:id", checkPermission("leads.detail.view"), getLeadDetail);
router.patch("/leads/:id/status", checkPermission("leads.detail.editStatus"), updateLeadStatus);
router.patch("/leads/:id", checkPermission("leads.detail.editFields"), updateLeadDetails);

// Manual defer follow-up to next day
router.post("/leads/:id/defer", checkPermission("leads.detail.defer"), moveLeadToNextDay);

// Call logs
router.post("/leads/:id/calls", checkPermission("leads.detail.calls"), logCall);
router.get("/leads/:id/calls", checkPermission("leads.detail.calls"), getLeadCallLogs);

// Follow-ups
router.get("/followups/today", checkPermission("leads.all.view"), getTodayFollowUps);
router.get("/followups", checkPermission("leads.all.view"), getFollowUpsByRange);
router.get("/followups/tomorrow", checkPermission("leads.all.view"), getTomorrowFollowUps);

// Stats
router.get("/stats/dashboard", checkPermission("dashboard.dashboard.view"), getDashboardStats);
router.get("/stats", checkPermission("dashboard.dashboard.view"), getMyStats);

// OP bookings
router.post("/leads/:id/op-bookings", checkPermission("leads.detail.manageBookings"), addOpBooking);
router.patch("/leads/:id/op-bookings/:bookingId", checkPermission("leads.detail.manageBookings"), updateOpBooking);
router.delete("/leads/:id/op-bookings/:bookingId", checkPermission("leads.detail.manageBookings"), removeOpBooking);

// IP bookings
router.post("/leads/:id/ip-bookings", checkPermission("leads.detail.manageBookings"), addIpBooking);
router.patch("/leads/:id/ip-bookings/:bookingId", checkPermission("leads.detail.manageBookings"), updateIpBooking);
router.delete("/leads/:id/ip-bookings/:bookingId", checkPermission("leads.detail.manageBookings"), removeIpBooking);

// Diagnostic bookings
router.post("/leads/:id/diagnostic-bookings", checkPermission("leads.detail.manageBookings"), addDiagnosticBooking);
router.patch("/leads/:id/diagnostic-bookings/:bookingId", checkPermission("leads.detail.manageBookings"), updateDiagnosticBooking);
router.delete("/leads/:id/diagnostic-bookings/:bookingId", checkPermission("leads.detail.manageBookings"), removeDiagnosticBooking);

// Activities
router.get("/leads/:id/activities", checkPermission("leads.detail.viewActivities"), getLeadActivities);

module.exports = router;

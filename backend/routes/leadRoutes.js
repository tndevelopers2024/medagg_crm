// routes/leadRoutes.js
const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  getAllLeads,
  getLeadFilterMeta,
  getTodayLeads,
  getLeadsByDate,
  assignLeadsToCaller,
  getAssignedLeads,
  createLead,   // your admin/caller-only create
  intakeLead,   // ⬅️ NEW public intake
  assignLeadsByLocation,
  findDuplicates,
  mergeLeads,
  bulkUpdateLeads,
  bulkUpdateByFilter,
  getAdminDashboardStats,
  getAdminActivityStats,
  getCallerDetailStats,
  getAdminDashboardV2,
  uploadLeadDocument,
  deleteLeadDocument,
  deleteLeads,
  getLead,
} = require("../controllers/leadController");

const { protect, authorize, checkPermission } = require("../middleware/auth");
const router = express.Router();

// Public rate limit (e.g., 20 submissions per 15 min per IP)
const intakeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

// ---- Public (no auth) ----
router.post("/intake", intakeLimiter, intakeLead);

// ---- Admin/Caller secured endpoints ----
router.post("/", protect, checkPermission("leads.all.create"), createLead);

// Duplicate Management
router.get("/duplicates", protect, checkPermission("leads.duplicates.view"), findDuplicates);
router.post("/merge", protect, checkPermission("leads.duplicates.merge"), mergeLeads);

// Bulk operations
router.post("/bulk-update", protect, checkPermission("leads.all.bulkUpdate"), bulkUpdateLeads);
router.post("/bulk-update-by-filter", protect, checkPermission("leads.all.bulkUpdate"), bulkUpdateByFilter);

router.get("/filter-meta", protect, getLeadFilterMeta);
router.get("/", protect, getAllLeads);
router.get("/today", protect, checkPermission("leads.all.view"), getTodayLeads);
router.get("/by-date", protect, checkPermission("leads.all.view"), getLeadsByDate);
router.post("/assign", protect, checkPermission("leads.all.assign"), assignLeadsToCaller);
router.post("/assign-location", protect, checkPermission("leads.all.assign"), assignLeadsByLocation);
router.post("/delete", protect, checkPermission("leads.all.delete"), deleteLeads);

// Assigned leads (must be before /:id to avoid "assigned" matching as an ID)
router.get("/assigned", protect, checkPermission("leads.all.view"), getAssignedLeads);

// Single lead detail
router.get("/:id", protect, checkPermission("leads.detail.view"), getLead);

// Dashboard stats
router.get("/admin/stats/dashboard", protect, getAdminDashboardStats);
router.get("/admin/stats/dashboard-v2", protect, getAdminDashboardV2);
router.get("/admin/stats/activity", protect, checkPermission("dashboard.dashboard.view"), getAdminActivityStats);
router.get("/admin/stats/caller/:callerId", protect, checkPermission("callers.callerDetail.viewStats"), getCallerDetailStats);

// Documents
router.post("/:id/documents", protect, checkPermission("leads.detail.documents"), uploadLeadDocument);
router.delete("/:id/documents/:docId", protect, checkPermission("leads.detail.documents"), deleteLeadDocument);

module.exports = router;

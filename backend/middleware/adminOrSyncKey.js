const { protect, authorize } = require("./auth");

/**
 * Allow access if:
 * - `x-sync-key` matches `INTEGRATIONS_SYNC_KEY`, OR
 * - valid JWT for an admin/superadmin/owner user
 *
 * This supports secure server-to-server cron/manual triggers without hardcoding tokens.
 */
module.exports = function adminOrSyncKey() {
  return (req, res, next) => {
    const configuredKey = String(process.env.INTEGRATIONS_SYNC_KEY || "").trim();
    const providedKey = String(req.headers["x-sync-key"] || "").trim();

    if (configuredKey && providedKey && providedKey === configuredKey) {
      // Treat as a trusted system request
      req.user = {
        _id: "system",
        role: { name: "admin" },
        roleName: "admin",
        isSystemAdmin: true,
        permissions: [],
      };
      return next();
    }

    // Fall back to JWT-based auth
    return protect(req, res, (err) => {
      if (err) return next(err);
      return authorize("admin", "superadmin", "owner")(req, res, next);
    });
  };
};

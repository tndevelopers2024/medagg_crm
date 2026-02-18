// services/activityLogger.js
const LeadActivity = require("../models/LeadActivity");

/**
 * Strict logger: throws on error (useful in tests/migrations).
 */
async function logLeadActivity({ leadId, actorId, action, description, diff = {}, meta = {} }) {
  if (!leadId || !actorId || !action || !description) {
    throw new Error("logLeadActivity: missing required args");
  }
  return LeadActivity.create({
    lead: leadId,
    actor: actorId,
    action,
    description,
    diff,
    meta,
  });
}

/**
 * Safe logger: never throws. Use this in controllers.
 */
async function safeLogLeadActivity(args) {
  try {
    await logLeadActivity(args);
  } catch (e) {
    console.error("[activityLogger] failed:", e?.message || e);
  }
}

module.exports = {
  logLeadActivity,
  safeLogLeadActivity,
};

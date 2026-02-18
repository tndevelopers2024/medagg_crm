const { syncMetaLeads } = require("../services/metaLeadSyncService");

// POST /api/v1/integrations/meta/sync
exports.syncMeta = async (req, res) => {
  try {
    // Optional body overrides (validated lightly)
    const adAccountIds = Array.isArray(req.body?.adAccountIds) ? req.body.adAccountIds : undefined;
    const formIds = Array.isArray(req.body?.formIds) ? req.body.formIds : undefined;
    const pageLimit = req.body?.pageLimit != null ? Number(req.body.pageLimit) : undefined;

    if (pageLimit != null && (!Number.isFinite(pageLimit) || pageLimit <= 0 || pageLimit > 500)) {
      return res.status(400).json({ success: false, error: "pageLimit must be a number between 1 and 500" });
    }

    const summary = await syncMetaLeads({ adAccountIds, formIds, pageLimit });
    return res.json({ success: true, summary });
  } catch (err) {
    const msg = err?.response?.data?.error?.message || err?.message || String(err);
    return res.status(500).json({ success: false, error: msg });
  }
};


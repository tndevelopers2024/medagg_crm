const axios = require("axios");
const mongoose = require("mongoose");
const Lead = require("../models/Lead");
const { extractLeadFormIdsFromCreative, normalizeMetaFieldData } = require("../utils/metaLeadUtils");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseCsvEnv(v) {
  if (!v) return [];
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseJsonArrayEnv(v) {
  if (!v) return null;
  try {
    const parsed = JSON.parse(String(v));
    return Array.isArray(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
}

function graphBaseUrl() {
  const version = process.env.META_GRAPH_VERSION || "v19.0";
  return `https://graph.facebook.com/${version}`;
}

function isRetryableGraphError(err) {
  const status = err?.response?.status;
  if (status === 429) return true;
  if (status >= 500 && status <= 599) return true;

  const code = err?.response?.data?.error?.code;
  const subcode = err?.response?.data?.error?.error_subcode;

  // Meta rate limit / transient style codes seen in practice
  if ([1, 2, 4, 17, 32, 341, 613].includes(code)) return true;
  if ([99].includes(subcode)) return true;
  return false;
}

async function graphGet(pathOrUrl, { accessToken, params = {} }, { maxAttempts = 6 } = {}) {
  const baseURL = graphBaseUrl();
  const isFullUrl = /^https?:\/\//i.test(pathOrUrl);

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempt++;
    try {
      const url = isFullUrl ? pathOrUrl : `${baseURL}/${String(pathOrUrl).replace(/^\//, "")}`;
      const res = await axios.get(url, {
        timeout: 30000,
        params: {
          ...params,
          access_token: accessToken,
        },
      });
      return res.data;
    } catch (err) {
      const retryable = isRetryableGraphError(err);
      const retryAfterSec = Number(err?.response?.headers?.["retry-after"] || "0") || 0;

      if (!retryable || attempt >= maxAttempts) {
        throw err;
      }

      // Exponential backoff with jitter; respect Retry-After if present
      const backoffMs = Math.min(30000, 500 * Math.pow(2, attempt - 1));
      const jitterMs = Math.floor(Math.random() * 250);
      const waitMs = Math.max(retryAfterSec * 1000, backoffMs + jitterMs);

      console.warn(
        `[meta-sync] retrying Graph GET (attempt ${attempt}/${maxAttempts}) in ${waitMs}ms`,
        err?.response?.data?.error?.message || err.message
      );
      await sleep(waitMs);
    }
  }
}

async function listAdsWithCreatives({ adAccountId, accessToken, limit = 200 }) {
  // We need ad -> {campaign_id, adset_id, id} and creative payload to detect form id.
  const account = String(adAccountId).startsWith("act_") ? String(adAccountId) : `act_${adAccountId}`;

  const fields = [
    "id",
    "name",
    "campaign_id",
    "adset_id",
    "creative{id,object_story_spec,asset_feed_spec,call_to_action,effective_object_story_id}",
  ].join(",");

  let url = `${account}/ads`;
  let out = [];

  // paginate via "paging.next"
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const effectiveStatus =
      parseJsonArrayEnv(process.env.META_AD_EFFECTIVE_STATUS) || ["ACTIVE"];

    const data = await graphGet(
      url,
      {
        accessToken,
        params: {
          fields,
          limit,
          effective_status: effectiveStatus,
        },
      },
      { maxAttempts: 6 }
    );

    const rows = Array.isArray(data?.data) ? data.data : [];
    out = out.concat(rows);

    const next = data?.paging?.next;
    if (!next) break;
    url = next;
  }

  return out;
}

function buildAdAttributionIndex(ads) {
  const byAdId = new Map();
  for (const ad of ads || []) {
    if (!ad?.id) continue;
    byAdId.set(String(ad.id), {
      adId: String(ad.id),
      adsetId: ad?.adset_id ? String(ad.adset_id) : undefined,
      campaignId: ad?.campaign_id ? String(ad.campaign_id) : undefined,
      adCreativeId: ad?.creative?.id ? String(ad.creative.id) : undefined,
    });
  }
  return byAdId;
}

function detectFormIdsFromAds(ads) {
  const forms = new Set();
  for (const ad of ads || []) {
    const creative = ad?.creative;
    if (!creative) continue;
    const ids = extractLeadFormIdsFromCreative(creative);
    for (const id of ids) forms.add(String(id));
  }
  return Array.from(forms);
}

/**
 * Fetch leads from a form in pages and process them immediately (Streaming/Batching).
 * This avoids loading thousands of leads into memory at once.
 */
async function processFormLeadsBatch({ formId, accessToken, pageLimit = 100, processor }) {
  const fields = "created_time,id,ad_id,adset_id,campaign_id,form_id,field_data";
  let url = `${formId}/leads`;
  let processedCount = 0;

  // Filter for Feb 16, 2026 00:00:00 IST onwards
  const sinceTimestamp = process.env.META_SYNC_SINCE || 1771180200;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const params = { fields, limit: pageLimit };
    if (sinceTimestamp) {
      params.filtering = JSON.stringify([{ field: "time_created", operator: "GREATER_THAN_OR_EQUAL", value: Number(sinceTimestamp) }]);
    }

    const data = await graphGet(
      url,
      {
        accessToken,
        params,
      },
      { maxAttempts: 6 }
    );

    const rows = Array.isArray(data?.data) ? data.data : [];
    if (rows.length > 0) {
      await processor(rows);
      processedCount += rows.length;
    }

    const next = data?.paging?.next;
    if (!next) break;
    url = next;
  }

  return processedCount;
}

async function upsertMetaLead(rawLead, fallbackAttr = {}) {
  const metaLeadId = rawLead?.id ? String(rawLead.id) : "";
  if (!metaLeadId) return { inserted: 0, updated: 0, skipped: 1 };

  const createdTime = rawLead?.created_time ? new Date(rawLead.created_time) : new Date();
  const normalizedFieldData = normalizeMetaFieldData(rawLead?.field_data);

  const adId = rawLead?.ad_id ? String(rawLead.ad_id) : fallbackAttr.adId;
  const adsetId = rawLead?.adset_id ? String(rawLead.adset_id) : fallbackAttr.adsetId;
  const campaignId = rawLead?.campaign_id ? String(rawLead.campaign_id) : fallbackAttr.campaignId;
  const formId = rawLead?.form_id ? String(rawLead.form_id) : fallbackAttr.formId;

  // Fetch campaign to get assigned callers
  let assignedTo = null;
  if (campaignId) {
    try {
      // Optimization: Ideally passed in fallbackAttr or cached, but fetching here is safer for consistency
      const Campaign = require("../models/Campaign");

      const campaign = await Campaign.findOne({
        $or: [{ "integration.externalId": campaignId }, { "integration.adAccountId": fallbackAttr.adAccountId }] // Attempt to find campaign document
      });

      if (campaign && campaign.assignedCallers && campaign.assignedCallers.length > 0) {
        // Weighted Random Assignment
        const totalWeight = campaign.assignedCallers.reduce((sum, c) => sum + (c.percentage || 0), 0);
        if (totalWeight > 0) {
          let random = Math.random() * totalWeight;
          for (const caller of campaign.assignedCallers) {
            random -= (caller.percentage || 0);
            if (random <= 0) {
              assignedTo = caller.callerId;
              break;
            }
          }
        } else {
          // Fallback to random uniform if no weights
          const randomIndex = Math.floor(Math.random() * campaign.assignedCallers.length);
          assignedTo = campaign.assignedCallers[randomIndex].callerId; // callerId if object, or caller if direct ID (handle mixed for safety?)
          if (assignedTo && assignedTo.callerId) assignedTo = assignedTo.callerId; // In case it was populated or object
        }
      }
    } catch (e) {
      console.warn("Error fetching campaign for auto-assignment:", e);
    }
  }

  // Ensure Lead Source is present in fieldData
  const hasLeadSource = normalizedFieldData.some(f => f.name === "lead_source");
  if (!hasLeadSource) {
    normalizedFieldData.push({ name: "lead_source", values: ["Facebook"] });
  }

  const doc = {
    // keep `leadId` stable and unique; for Meta leads we make it the raw lead id
    leadId: metaLeadId,
    metaLeadId,
    platform: "meta",
    source: "Facebook",
    formId,
    campaignId,
    adId,
    adsetId,
    adCreativeId: fallbackAttr.adCreativeId,
    createdTime,
    fieldData: normalizedFieldData,
    status: "new",
    assignedTo,
  };

  // Upsert by metaLeadId if present; fall back to leadId for older rows.
  const q = { $or: [{ metaLeadId }, { leadId: metaLeadId }] };

  const res = await Lead.updateOne(q, { $setOnInsert: doc }, { upsert: true });
  if (res.upsertedCount === 1) return { inserted: 1, updated: 0, skipped: 0 };
  return { inserted: 0, updated: 0, skipped: 1 };
}

/**
 * Main entrypoint:
 * - uses META_AD_ACCOUNT_IDS and META_ACCESS_TOKEN by default
 * - discovers lead forms via ad creatives (per account)
 * - fetches leads from each form (in batches)
 * - stores leads without duplicates (metaLeadId)
 */
async function syncMetaLeads(options = {}) {
  // Ensure DB connection exists (cron/server will already be connected).
  // This makes one-off runs safe too.
  if (mongoose.connection.readyState !== 1) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is missing");
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
  }

  const accessToken = options.accessToken || process.env.META_ACCESS_TOKEN;
  const adAccountIds = options.adAccountIds || parseCsvEnv(process.env.META_AD_ACCOUNT_IDS);
  const pageLimit = Number(options.pageLimit || process.env.META_SYNC_PAGE_LIMIT || 100);

  if (!accessToken) {
    throw new Error("META_ACCESS_TOKEN is missing");
  }
  if (!adAccountIds.length) {
    throw new Error("META_AD_ACCOUNT_IDS is missing/empty (comma-separated)");
  }

  const allowlistForms = (options.formIds || parseCsvEnv(process.env.META_FORM_IDS)).filter(Boolean);
  const allowlistSet = new Set(allowlistForms.map(String));

  const summary = {
    adAccounts: adAccountIds.length,
    formsDetected: 0,
    formsSynced: 0,
    leadsFetched: 0,
    leadsInserted: 0,
    leadsSkipped: 0,
    errors: [],
  };

  for (const adAccountId of adAccountIds) {
    try {
      console.log(`[meta-sync] scanning ad account ${adAccountId} for creatives/forms`);
      const ads = await listAdsWithCreatives({ adAccountId, accessToken, limit: 200 });
      const attrIndex = buildAdAttributionIndex(ads);

      let formIds = detectFormIdsFromAds(ads);
      summary.formsDetected += formIds.length;

      if (allowlistSet.size) {
        formIds = formIds.filter((id) => allowlistSet.has(String(id)));
      }

      for (const formId of formIds) {
        summary.formsSynced += 1;
        console.log(`[meta-sync] fetching leads for form ${formId}`);

        // Define batch processor
        const batchProcessor = async (leadsBatch) => {
          summary.leadsFetched += leadsBatch.length;

          for (const rawLead of leadsBatch) {
            const adId = rawLead?.ad_id ? String(rawLead.ad_id) : "";
            const fallback = {
              ...(attrIndex.get(adId) || {}),
              formId: String(formId),
            };

            try {
              const r = await upsertMetaLead(rawLead, fallback);
              summary.leadsInserted += r.inserted;
              summary.leadsSkipped += r.skipped;
            } catch (e) {
              // Handle unique race conditions gracefully
              const msg = e?.message || String(e);
              if (e?.code === 11000) {
                summary.leadsSkipped += 1;
                continue;
              }
              console.error("[meta-sync] lead upsert failed:", msg);
              summary.errors.push({ scope: "lead-upsert", message: msg });
            }
          }
        };

        // Run batch processing
        await processFormLeadsBatch({
          formId,
          accessToken,
          pageLimit,
          processor: batchProcessor
        });
      }
    } catch (e) {
      const msg = e?.response?.data?.error?.message || e?.message || String(e);
      console.error(`[meta-sync] account ${adAccountId} failed:`, msg);
      summary.errors.push({ scope: "ad-account", adAccountId: String(adAccountId), message: msg });
    }
  }

  return summary;
}

module.exports = {
  syncMetaLeads,
  syncMetaCampaigns,
};

async function syncMetaCampaigns(options = {}) {
  const Campaign = require("../models/Campaign");

  if (mongoose.connection.readyState !== 1) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is missing");
    await mongoose.connect(uri);
  }

  const accessToken = options.accessToken || process.env.META_ACCESS_TOKEN;
  const adAccountIds = options.adAccountIds || parseCsvEnv(process.env.META_AD_ACCOUNT_IDS);

  if (!accessToken) throw new Error("META_ACCESS_TOKEN is missing");
  if (!adAccountIds.length) throw new Error("META_AD_ACCOUNT_IDS is missing");

  const summary = {
    adAccounts: adAccountIds.length,
    campaignsFetched: 0,
    campaignsUpserted: 0,
    errors: [],
  };

  for (const adAccountId of adAccountIds) {
    try {
      const accountId = String(adAccountId).startsWith("act_") ? String(adAccountId) : `act_${adAccountId}`;
      console.log(`[meta-sync] Fetching campaigns for ${accountId}`);

      const fields = [
        "id",
        "name",
        "status",
        "start_time",
        "stop_time",
        "daily_budget",
        "lifetime_budget",
        "objective",
        "insights{impressions,clicks,spend,cpc,ctr,actions}" // Basic insights
      ].join(",");

      // Fetch active and paused campaigns mostly
      const params = {
        fields,
        limit: 100,
        effective_status: ["ACTIVE", "PAUSED", "ARCHIVED"],
      };

      const data = await graphGet(`${accountId}/campaigns`, { accessToken, params });
      const rows = data?.data || [];
      summary.campaignsFetched += rows.length;

      for (const row of rows) {
        try {
          // Insights is often an array with 1 item if aggregated by default
          const insights = row.insights?.data?.[0] || {};

          // Calculate leads count from actions
          const actions = insights.actions || [];
          const leadAction = actions.find(a => a.action_type === "lead" || a.action_type === "leadgen.other");
          const leadsCount = leadAction ? Number(leadAction.value) : 0;

          // Normalize Status
          let localStatus = "draft";
          if (row.status === "ACTIVE") localStatus = "active";
          else if (row.status === "PAUSED") localStatus = "paused";
          else if (row.status === "COMPLETED") localStatus = "completed";
          else if (row.status === "ARCHIVED") localStatus = "completed";

          // Budget (Meta returns in cents/lowest unit usually, but check currency. Assuming standard)
          // daily_budget is string in cents
          let budget = 0;
          if (row.daily_budget) budget = Number(row.daily_budget) / 100;
          else if (row.lifetime_budget) budget = Number(row.lifetime_budget) / 100;

          const doc = {
            name: row.name,
            platform: "facebook", // Meta
            status: localStatus,
            startDate: row.start_time ? new Date(row.start_time) : Date.now(),
            endDate: row.stop_time ? new Date(row.stop_time) : null,
            budget: budget,
            integration: {
              provider: "meta",
              adAccountId: accountId,
              // We don't necessarily know the Form ID at campaign level easily without drilling down, 
              // keep existing if present or leave blank.
              // For sync purposes, we mainly want the ID match.
              accessToken: accessToken, // Store token used? Or maybe just keep what's there.
              lastSyncAt: new Date(),
              metaCampaignId: row.id, // Store external ID in integration or add a new field to schema?
              // The schema has `integration` but no specific `externalId` field at top level.
              // Let's rely on finding by integration.metaCampaignId if we add it, or name?
              // Ideally we should add `metaCampaignId` to the schema or use `integration.externalId`.
              // Looking at Campaign.js, it has `integration`. Let's add `externalId` to schema or use a query.
            },
            metaData: {
              impressions: Number(insights.impressions || 0),
              clicks: Number(insights.clicks || 0),
              spend: Number(insights.spend || 0),
              leads: leadsCount,
              ctr: Number(insights.ctr || 0),
              cpc: Number(insights.cpc || 0),
            }
          };

          // Upsert Logic
          // We need a unique identifier. Name is risky. 
          // Best to use a new field `integration.externalId` or search by `integration.adAccountId` + `name`?
          // Let's modify the Schema safely or use `metaData` to store ID?
          // Actually, let's put `externalId` inside `integration` in dynamic update if schema allows flexible props,
          // OR match by name for now if clean, BUT name changes.
          // Correct approach: Add `externalId` to Campaign Schema. 
          // For now, I'll update the Schema in next step. 
          // Here I will assume I can filter by `integration.externalId`: row.id.

          doc.integration.externalId = row.id;

          await Campaign.updateOne(
            { "integration.externalId": row.id },
            { $set: doc },
            { upsert: true }
          );
          summary.campaignsUpserted++;

        } catch (innerErr) {
          console.error(`[meta-sync] Failed to upsert campaign ${row.id}`, innerErr);
        }
      }

    } catch (e) {
      const msg = e?.response?.data?.error?.message || e?.message || String(e);
      console.error(`[meta-sync] Failed to sync campaigns for ${adAccountId}:`, msg);
      summary.errors.push({ adAccountId, message: msg });
    }
  }

  return summary;
}


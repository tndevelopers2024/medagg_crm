# medagg backend

## Meta Lead Ads automated sync

This backend supports **automated lead ingestion from Meta Lead Ads**:

- **Auto-detects lead forms** by scanning ad creatives in your Meta ad accounts
- **Fetches leads** via `/{FORM_ID}/leads` with **pagination**
- **Normalizes** Meta `field_data` into your existing `Lead.fieldData` format
- **Upserts** into MongoDB **without duplicates** using `Lead.metaLeadId` (and a safe fallback to `leadId`)
- Runs on **cron** and supports **manual sync**
- Designed so you can later add **webhook ingestion** (store the same `metaLeadId`, use same normalizer/upsert)

### Environment variables

Copy `.env.example` to `.env` and set values via your deployment environment (never hardcode access tokens).

Key variables:

- `META_ACCESS_TOKEN`: Meta Graph API access token (system/user token with Lead Ads permissions)
- `META_AD_ACCOUNT_IDS`: comma-separated ad accounts (`act_...`)
- `META_SYNC_ENABLED`: `true` to enable cron runner
- `META_SYNC_CRON`: cron expression (UTC)
- `INTEGRATIONS_SYNC_KEY`: protects the manual sync endpoint

### Manual sync endpoint

`POST /api/v1/integrations/meta/sync`

Auth options:

- Provide `x-sync-key: <INTEGRATIONS_SYNC_KEY>` **OR**
- Call as an authenticated **admin** user (Bearer JWT)

Optional JSON body:

```json
{
  "adAccountIds": ["act_123"],
  "formIds": ["1200..."],
  "pageLimit": 100
}
```

### Cron sync

Enable with:

- `META_SYNC_ENABLED=true`
- `META_SYNC_CRON=*/10 * * * *` (example)

The server will run the sync on the configured schedule and skip overlapping runs.

# medagg_crm_backend

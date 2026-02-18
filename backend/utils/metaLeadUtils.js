function safeLower(s) {
  return String(s || "").trim().toLowerCase();
}

function uniq(arr) {
  return Array.from(new Set((arr || []).filter((x) => x != null).map((x) => String(x))));
}

const { getStateFromCity } = require("./cityStateMap");

/**
 * Normalize Meta "field_data" into the app's { name, values[] }[] shape.
 * - lowercases field name
 * - coerces values to strings
 * - de-duplicates values
 * - [NEW] Auto-populates state from city if state is missing
 */
function normalizeMetaFieldData(fieldData) {
  if (!Array.isArray(fieldData)) return [];

  const out = [];
  const map = new Map();

  // First pass: normalize and store in map
  for (const f of fieldData) {
    const name = safeLower(f?.name);
    if (!name) continue;
    const values = uniq(Array.isArray(f?.values) ? f.values : []);
    map.set(name, values);
    out.push({ name, values });
  }

  // Second pass: Check for City/State logic
  // We need to check if 'city' exists and 'states' or 'location' is missing
  const cityVals = map.get("city");
  const stateVals = map.get("states") || map.get("state");
  const locationVals = map.get("location");

  if (cityVals && cityVals.length > 0) {
    const city = cityVals[0];

    // 1. Deriving states from city if missing
    if (!stateVals || stateVals.length === 0) {
      const derivedState = getStateFromCity(city);
      if (derivedState) {
        out.push({ name: "states", values: [derivedState] });
        map.set("states", [derivedState]);
      }
    }

    // 2. Map city to location if location is missing
    if (!locationVals || locationVals.length === 0) {
      out.push({ name: "location", values: [city] });
      map.set("location", [city]);
    }
  }

  return out;
}

/**
 * Extract lead form IDs from Meta adcreative payloads.
 * We intentionally try multiple known locations because creative payload shapes vary.
 *
 * Common places:
 * - object_story_spec.link_data.call_to_action.value.lead_gen_form_id
 * - object_story_spec.video_data.call_to_action.value.lead_gen_form_id
 * - asset_feed_spec.call_to_action_types + related CTA specs (best-effort)
 *
 * Returns an array because one creative can theoretically reference multiple CTAs.
 */
function extractLeadFormIdsFromCreative(creative) {
  const ids = [];

  const oss = creative?.object_story_spec;
  const linkCta = oss?.link_data?.call_to_action?.value?.lead_gen_form_id;
  const videoCta = oss?.video_data?.call_to_action?.value?.lead_gen_form_id;
  if (linkCta) ids.push(String(linkCta));
  if (videoCta) ids.push(String(videoCta));

  // Some creatives embed CTA in a generic "call_to_action" object
  const directCta = creative?.call_to_action?.value?.lead_gen_form_id;
  if (directCta) ids.push(String(directCta));

  // NOTE:
  // We intentionally do NOT deep-scan the full creative object because it can contain
  // many unrelated numeric IDs (page IDs, post IDs, etc.) and lead to syncing hundreds
  // of bogus "forms". If you have a new creative shape, add an explicit path above.

  return uniq(ids);
}

module.exports = {
  normalizeMetaFieldData,
  extractLeadFormIdsFromCreative,
};


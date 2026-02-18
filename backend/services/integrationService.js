const axios = require("axios");

/**
 * Fetch leads from Meta (Facebook) Graph API.
 * Docs: https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving-leads/
 */
const fetchMetaLeads = async (config) => {
    const { formId, accessToken } = config;
    if (!formId || !accessToken) {
        throw new Error("Missing Form ID or Access Token for Meta integration");
    }

    // Basic implementation: Fetch leads from specific form
    const url = `https://graph.facebook.com/v19.0/${formId}/leads`;
    const response = await axios.get(url, {
        params: {
            access_token: accessToken,
            fields: "created_time,id,ad_id,form_id,field_data",
            limit: 100, // batch size
        },
    });

    return response.data?.data || [];
};

/**
 * Fetch leads from Google Ads API.
 * This is highly complex requiring OAuth2 refreshing.
 * For now, this is a placeholder or assumes a direct access token if possible (rare).
 * In a real scenario, we'd need a full OAuth Service.
 */
const fetchGoogleLeads = async (config) => {
    const { adAccountId, accessToken } = config;
    // Placeholder logic
    console.log("Fetching Google leads for", adAccountId);
    // Simulating an empty fetch for now as Google Ads API is strict
    return [];
};

module.exports = {
    fetchMetaLeads,
    fetchGoogleLeads,
};

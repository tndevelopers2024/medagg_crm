const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        platform: {
            type: String,
            enum: ["facebook", "google", "instagram", "linkedin", "email", "sms", "other", "manual"],
            default: "facebook",
        },
        status: {
            type: String,
            enum: ["active", "paused", "completed", "draft"],
            default: "active",
        },
        startDate: { type: Date, default: Date.now },
        endDate: { type: Date },
        budget: { type: Number, default: 0 },

        // Auto-assignment
        assignedCallers: [{
            callerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            percentage: { type: Number, default: 0 } // 0-100
        }],

        // Integration config
        integration: {
            provider: {
                type: String,
                enum: ["meta", "google", "none"],
                default: "none",
            },
            adAccountId: { type: String, default: "" }, // Facebook Ad Account ID or Google Customer ID
            formId: { type: String, default: "" }, // Facebook Lead Gen Form ID
            accessToken: { type: String, default: "" }, // Long-lived access token
            externalId: { type: String, default: "" }, // External Campaign ID from provider
            metaCampaignId: { type: String, default: "" }, // Specific field for Meta ID if needed
            lastSyncAt: { type: Date },
        },

        // Demo metrics or real synced metrics
        metaData: {
            impressions: { type: Number, default: 0 },
            clicks: { type: Number, default: 0 },
            spend: { type: Number, default: 0 },
            leads: { type: Number, default: 0 },
            ctr: { type: Number, default: 0 }, // Click-through rate in %
            cpc: { type: Number, default: 0 }, // Cost per click
        },

    },
    { timestamps: true }
);

module.exports = mongoose.model("Campaign", campaignSchema);

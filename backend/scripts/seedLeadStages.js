// scripts/seedLeadStages.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const connectDB = require("../config/db");
const LeadStageConfig = require("../models/LeadStageConfig");

const stages = [
    // INITIAL STAGE
    {
        stageName: "new",
        displayLabel: "New Lead",
        stageCategory: "initial",
        color: "#9CA3AF",
        order: 0,
        isDefault: true,
        description: "Default stage for new leads",
    },

    // ACTIVE STAGES
    {
        stageName: "hot",
        displayLabel: "Hot",
        stageCategory: "active",
        color: "#EC4899",
        order: 0,
    },
    {
        stageName: "hot_ip",
        displayLabel: "Hot - IP",
        stageCategory: "active",
        color: "#EC4899",
        order: 1,
    },
    {
        stageName: "prospective",
        displayLabel: "Prospective",
        stageCategory: "active",
        color: "#F59E0B",
        order: 2,
    },
    {
        stageName: "follow_up",
        displayLabel: "Follow Up",
        stageCategory: "active",
        color: "#3B82F6",
        order: 3,
    },
    {
        stageName: "recaptured_new",
        displayLabel: "Recaptured New",
        stageCategory: "active",
        color: "#6B7280",
        order: 4,
    },
    {
        stageName: "dnp",
        displayLabel: "DNP",
        stageCategory: "active",
        color: "#6B7280",
        order: 5,
    },
    {
        stageName: "diagnostic",
        displayLabel: "Diagnostic",
        stageCategory: "active",
        color: "#EF4444",
        order: 6,
    },
    {
        stageName: "only_opd",
        displayLabel: "Only OPD",
        stageCategory: "active",
        color: "#10B981",
        order: 7,
    },
    {
        stageName: "camp_case",
        displayLabel: "Camp Case",
        stageCategory: "active",
        color: "#6B7280",
        order: 8,
    },
    {
        stageName: "interview_candidates",
        displayLabel: "Interview Candidates",
        stageCategory: "active",
        color: "#EC4899",
        order: 9,
    },
    {
        stageName: "marketing_leads",
        displayLabel: "Marketing Leads",
        stageCategory: "active",
        color: "#EC4899",
        order: 10,
    },
    {
        stageName: "only_circum_piles",
        displayLabel: "Only Circum and Piles",
        stageCategory: "active",
        color: "#EC4899",
        order: 11,
    },
    {
        stageName: "doctors",
        displayLabel: "Doctors",
        stageCategory: "active",
        color: "#3B82F6",
        order: 12,
    },
    {
        stageName: "isvir_dr_list",
        displayLabel: "ISVIR DR LIST",
        stageCategory: "active",
        color: "#EC4899",
        order: 13,
    },
    {
        stageName: "only_bengali",
        displayLabel: "Only Bengali",
        stageCategory: "active",
        color: "#EC4899",
        order: 14,
    },

    // WON STAGE
    {
        stageName: "surgery_done",
        displayLabel: "Surgery Done",
        stageCategory: "won",
        color: "#10B981",
        order: 0,
    },

    // LOST STAGES
    {
        stageName: "surgery_not_required",
        displayLabel: "Surgery not Required",
        stageCategory: "lost",
        color: "#6B7280",
        order: 0,
    },
    {
        stageName: "junk_irrelevant",
        displayLabel: "Junk/Irrelevant",
        stageCategory: "lost",
        color: "#6B7280",
        order: 1,
    },
    {
        stageName: "lost_to_competitor",
        displayLabel: "Lost to Competitor",
        stageCategory: "lost",
        color: "#6B7280",
        order: 2,
    },
    {
        stageName: "unknown_reason",
        displayLabel: "Unknown Reason",
        stageCategory: "lost",
        color: "#6B7280",
        order: 3,
    },
    {
        stageName: "dnp_7_days",
        displayLabel: "DNP for more than 7 days",
        stageCategory: "lost",
        color: "#6B7280",
        order: 4,
    },
    {
        stageName: "budget_issues",
        displayLabel: "Budget Issues",
        stageCategory: "lost",
        color: "#6B7280",
        order: 5,
    },
    {
        stageName: "only_enquiry",
        displayLabel: "Only Enquiry",
        stageCategory: "lost",
        color: "#6B7280",
        order: 6,
    },
    {
        stageName: "followup_5months",
        displayLabel: "Follow-up > 5 months",
        stageCategory: "lost",
        color: "#6B7280",
        order: 7,
    },
    {
        stageName: "location_issue",
        displayLabel: "Location Issue",
        stageCategory: "lost",
        color: "#6B7280",
        order: 8,
    },
    {
        stageName: "api_lost",
        displayLabel: "API Lost",
        stageCategory: "lost",
        color: "#6B7280",
        order: 9,
    },
];

async function seedLeadStages() {
    try {
        await connectDB();
        console.log("✅ Connected to MongoDB");

        console.log("\n📋 Seeding Lead Stages...");
        for (const stage of stages) {
            const existing = await LeadStageConfig.findOne({
                stageName: stage.stageName,
            });
            if (!existing) {
                await LeadStageConfig.create(stage);
                console.log(`✅ Created stage: ${stage.displayLabel} (${stage.stageCategory})`);
            } else {
                console.log(`⏭️  Skipped existing stage: ${stage.displayLabel}`);
            }
        }

        console.log("\n🎉 Lead stages seed completed successfully!");
        console.log(`📊 Total stages: ${stages.length}`);
        console.log(`   - Initial: 1`);
        console.log(`   - Active: 15`);
        console.log(`   - Won: 1`);
        console.log(`   - Lost: 10`);

        process.exit(0);
    } catch (error) {
        console.error("❌ Seed failed:", error);
        process.exit(1);
    }
}

seedLeadStages();

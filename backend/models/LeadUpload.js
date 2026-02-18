const mongoose = require("mongoose");

const leadUploadSchema = new mongoose.Schema(
    {
        campaignId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Campaign",
            required: true,
        },
        fileName: {
            type: String,
            required: true,
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        uploadedByName: {
            type: String,
            default: "",
        },
        status: {
            type: String,
            enum: ["processing", "uploaded", "failed"],
            default: "processing",
        },
        totalLeads: {
            type: Number,
            default: 0,
        },
        successCount: {
            type: Number,
            default: 0,
        },
        errorCount: {
            type: Number,
            default: 0,
        },
        errors: [
            {
                row: Number,
                message: String,
            },
        ],
    },
    { timestamps: true }
);

module.exports = mongoose.model("LeadUpload", leadUploadSchema);

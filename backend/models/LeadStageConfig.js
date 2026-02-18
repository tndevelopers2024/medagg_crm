const mongoose = require("mongoose");

const leadStageConfigSchema = new mongoose.Schema(
    {
        stageName: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        displayLabel: {
            type: String,
            required: true,
            trim: true,
        },
        stageCategory: {
            type: String,
            enum: ["initial", "active", "won", "lost"],
            default: "active",
        },
        color: {
            type: String,
            default: "#6B7280", // gray-500
        },
        icon: {
            type: String,
            default: "",
        },
        order: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        isDefault: {
            type: Boolean,
            default: false,
        },
        description: {
            type: String,
            default: "",
        },
    },
    { timestamps: true }
);

// Indexes
leadStageConfigSchema.index({ stageCategory: 1, order: 1 });
leadStageConfigSchema.index({ isActive: 1 });

// Ensure only one default stage
leadStageConfigSchema.pre("save", async function (next) {
    if (this.isDefault) {
        await this.constructor.updateMany(
            { _id: { $ne: this._id }, isDefault: true },
            { $set: { isDefault: false } }
        );
    }
    next();
});

module.exports = mongoose.model("LeadStageConfig", leadStageConfigSchema);

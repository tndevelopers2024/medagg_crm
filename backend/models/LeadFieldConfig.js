const mongoose = require("mongoose");

const leadFieldConfigSchema = new mongoose.Schema(
    {
        fieldName: {
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
        fieldType: {
            type: String,
            enum: ["text", "phone", "email", "number", "dropdown", "date", "textarea"],
            default: "text",
        },
        isPrimary: {
            type: Boolean,
            default: false,
        },
        isRequired: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        order: {
            type: Number,
            default: 0,
        },
        options: {
            type: [String],
            default: [],
        },
        icon: {
            type: String,
            default: "text",
        },
        validation: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        defaultValue: {
            type: String,
            default: "",
        },
        placeholder: {
            type: String,
            default: "",
        },
    },
    { timestamps: true }
);

// Index for efficient querying
leadFieldConfigSchema.index({ order: 1 });
leadFieldConfigSchema.index({ isActive: 1 });

module.exports = mongoose.model("LeadFieldConfig", leadFieldConfigSchema);

const mongoose = require("mongoose");

const bookingFieldConfigSchema = new mongoose.Schema(
    {
        bookingType: {
            type: String,
            enum: ["OP", "IP", "DIAGNOSTIC"],
            required: true,
        },
        fieldName: {
            type: String,
            required: true,
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
            enum: ["text", "number", "date", "time", "dropdown", "textarea"],
            default: "text",
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
        defaultValue: {
            type: String,
            default: "",
        },
        placeholder: {
            type: String,
            default: "",
        },
        validation: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    { timestamps: true }
);

// Compound index for bookingType + fieldName uniqueness
bookingFieldConfigSchema.index({ bookingType: 1, fieldName: 1 }, { unique: true });
bookingFieldConfigSchema.index({ bookingType: 1, order: 1 });

module.exports = mongoose.model("BookingFieldConfig", bookingFieldConfigSchema);

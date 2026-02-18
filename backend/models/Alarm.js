const mongoose = require("mongoose");

const alarmSchema = new mongoose.Schema({
    lead: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lead",
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    alarmTime: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        enum: ["active", "snoozed", "dismissed", "completed"],
        default: "active",
    },
    snoozedUntil: {
        type: Date,
    },
    notes: {
        type: String,
        default: "",
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Index for efficient queries
alarmSchema.index({ user: 1, status: 1, alarmTime: 1 });
alarmSchema.index({ lead: 1, user: 1 });

module.exports = mongoose.model("Alarm", alarmSchema);

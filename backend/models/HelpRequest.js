const mongoose = require("mongoose");

const helpRequestSchema = new mongoose.Schema(
  {
    lead: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true },
    fromCaller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    toCaller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["transfer", "share"], required: true },
    reason: { type: String, default: "" },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
  },
  { timestamps: true }
);

helpRequestSchema.index({ toCaller: 1, status: 1 });
helpRequestSchema.index({ lead: 1, status: 1 });
helpRequestSchema.index({ fromCaller: 1, status: 1 });

module.exports = mongoose.model("HelpRequest", helpRequestSchema);

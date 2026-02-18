const mongoose = require("mongoose");

const LeadActivitySchema = new mongoose.Schema(
  {
    lead: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // caller/admin
    action: {
      type: String,
      enum: [
        "lead_update",
        "status_update",
        "notes_update",
        "followup_update",
        "followup_rescheduled",
        "fielddata_replace",
        "fielddata_merge",
        "op_booking_add",
        "op_booking_update",
        "op_booking_remove",
        "ip_booking_add",
        "ip_booking_update",
        "ip_booking_remove",
        "call_logged",
        "recording_uploaded",
      ],
      required: true,
    },
    description: { type: String, required: true },  // nice human summary
    diff: { type: Object, default: {} },            // { before: {...}, after: {...} }
    meta: { type: Object, default: {} },            // any ids/extra small payload
  },
  { timestamps: true }
);

LeadActivitySchema.index({ lead: 1, createdAt: -1 });

module.exports = mongoose.model("LeadActivity", LeadActivitySchema);

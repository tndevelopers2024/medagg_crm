// models/Lead.js
const mongoose = require("mongoose");

const bookingStatusEnum = ["pending", "booked", "done", "cancelled"];

// Flexible booking schema with dynamic fields
const bookingSchema = new mongoose.Schema(
  {
    fieldData: [
      {
        name: { type: String, required: true },
        values: [String],
      },
    ],
    status: { type: String, enum: bookingStatusEnum, default: "pending" },

    // Explicit fields to match OP/IP keys (prevent strict mode stripping)
    booked: { type: Boolean, default: false },
    date: Date,
    time: String,
    hospital: String,
    doctor: String,
    surgery: String,
    caseType: String,
    payment: String, // or Number
    remarks: String,
    doneDate: Date,
  },
  { _id: true, timestamps: true }
);

const leadSchema = new mongoose.Schema(
  {
    leadId: { type: String, required: true, unique: true },
    // Meta Lead Ads identifiers (for dedupe & attribution)
    metaLeadId: { type: String, unique: true, sparse: true, index: true },
    formId: { type: String, index: true },
    campaignId: String,
    adId: String,
    adsetId: String,
    adCreativeId: String,
    createdTime: Date,
    fieldData: [{ name: String, values: [String] }],

    // Source/platform metadata
    source: { type: String, default: "" },
    platform: { type: String, default: "" }, // e.g. "meta", "web", "upload"

    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    status: {
      type: String,
      default: "new",
      // Enum removed to support dynamic stages from LeadStageConfig
    },

    notes: { type: String, default: "" },
    lastCallAt: { type: Date, default: null },
    followUpAt: { type: Date, default: null },
    callCount: { type: Number, default: 0 },
    lastCallOutcome: { type: String, default: null },

    // ⬇️ Dynamic OP/IP/DIAGNOSTIC bookings with flexible fields
    opBookings: { type: [bookingSchema], default: [] },
    ipBookings: { type: [bookingSchema], default: [] },
    diagnosticBookings: { type: [bookingSchema], default: [] },

    // ⬇️ Documents/Attachments
    documents: [
      {
        name: String, // original filename
        path: String, // stored filename/path
        mimetype: String,
        size: Number,
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
  },
  { timestamps: true }
);

// Helpful indexes
leadSchema.index({ assignedTo: 1, status: 1 });
leadSchema.index({ sharedWith: 1, status: 1 });
leadSchema.index({ followUpAt: 1 });
leadSchema.index({ createdTime: -1 });
leadSchema.index({ platform: 1, createdTime: -1 });
// Query nested dates efficiently
leadSchema.index({ "opBookings.date": 1 });
leadSchema.index({ "ipBookings.date": 1 });
leadSchema.index({ "diagnosticBookings.date": 1 });
leadSchema.index({ campaignId: 1, createdTime: -1 });
leadSchema.index({ status: 1, createdTime: -1 });
leadSchema.index({ source: 1, createdTime: -1 });

// Pre-save hook for data normalization (City -> State, etc.)
leadSchema.pre("save", function (next) {
  if (!this.fieldData || !Array.isArray(this.fieldData)) return next();

  const fd = this.fieldData;
  const map = new Map();
  fd.forEach((f) => {
    if (f.name) map.set(f.name.toLowerCase(), f.values);
  });

  const cityVals = map.get("city");
  const stateVals = map.get("states") || map.get("state");
  const locationVals = map.get("location");

  if (cityVals && cityVals.length > 0) {
    const city = cityVals[0];

    // 1. Derive states from city if missing
    if (!stateVals || stateVals.length === 0) {
      const { getStateFromCity } = require("../utils/cityStateMap");
      const derivedState = getStateFromCity(city);
      if (derivedState) {
        fd.push({ name: "states", values: [derivedState] });
      }
    }

    // 2. Map city to location if location is missing
    if (!locationVals || locationVals.length === 0) {
      fd.push({ name: "location", values: [city] });
    }
  }

  next();
});

module.exports = mongoose.model("Lead", leadSchema);

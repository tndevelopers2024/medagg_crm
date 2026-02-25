// models/ImportMapping.js
const mongoose = require("mongoose");

const importMappingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    mappings: { type: mongoose.Schema.Types.Mixed, default: {} },
    // { csvHeader: { targetType: "core"|"fieldData"|"campaign"|"caller"|"skip", targetField: String } }
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

importMappingSchema.index({ createdBy: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("ImportMapping", importMappingSchema);

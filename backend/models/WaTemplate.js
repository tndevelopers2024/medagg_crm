const mongoose = require("mongoose");

const waTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Template name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    body: {
      type: String,
      required: [true, "Template body is required"],
      maxlength: [2000, "Body cannot exceed 2000 characters"],
    },
    // Global templates created by admin are visible to everyone
    isGlobal: {
      type: Boolean,
      default: false,
    },
    // Owner of the template — null for legacy global, otherwise user id
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index for efficient queries
waTemplateSchema.index({ userId: 1, isGlobal: 1 });

module.exports = mongoose.model("WaTemplate", waTemplateSchema);

const mongoose = require("mongoose");
const { ALL_PERMISSION_KEYS } = require("../constants/permissions");

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Role name is required"],
      unique: true,
      trim: true,
      maxlength: [50, "Role name cannot exceed 50 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, "Description cannot exceed 200 characters"],
      default: "",
    },
    permissions: {
      type: [String],
      default: [],
      validate: {
        validator(arr) {
          return arr.every((key) => ALL_PERMISSION_KEYS.includes(key));
        },
        message: "One or more permission keys are invalid",
      },
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Prevent deletion of system roles
roleSchema.pre(
  "deleteOne",
  { document: true, query: false },
  function (next) {
    if (this.isSystem) {
      return next(new Error("System roles cannot be deleted"));
    }
    next();
  }
);

roleSchema.pre("findOneAndDelete", async function (next) {
  const role = await this.model.findOne(this.getFilter());
  if (role && role.isSystem) {
    return next(new Error("System roles cannot be deleted"));
  }
  next();
});

module.exports = mongoose.model("Role", roleSchema);

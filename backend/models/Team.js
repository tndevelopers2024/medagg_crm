const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please add a team name"],
        unique: true,
        trim: true,
        maxlength: [50, "Name cannot be more than 50 characters"],
    },
    description: {
        type: String,
        maxlength: [500, "Description cannot be more than 500 characters"],
    },
    managers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Helper to ensure managers are not callers (implemented in controller for better error messages, but could be pre-save hook)
// For now, we keep the schema flexible.

module.exports = mongoose.model("Team", teamSchema);

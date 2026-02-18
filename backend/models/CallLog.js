// models/CallLog.js
const mongoose = require('mongoose');

const CallLogSchema = new mongoose.Schema(
  {
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true,
    },
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    durationSec: {
      type: Number,
      default: 0,
      min: 0,
    },
    outcome: {
      type: String,
      required: true,
      // Keep these aligned with your controller logic
      enum: [
        'connected',
        'interested',
        'not_interested',
        'converted',
        'no_answer',
        'busy',
        'switched_off',
        'callback',
        'voicemail',
        'wrong_number',
        'do_not_disturb',
      ],
    },
    notes: { type: String, default: '' },
    recordingUrl: { type: String, default: '' },

    // Kept because your code reads l.timestamp in one place
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true } // adds createdAt & updatedAt
);

// Helpful compound index for queries used in controllers
CallLogSchema.index({ lead: 1, caller: 1, createdAt: -1 });

module.exports = mongoose.model('CallLog', CallLogSchema);

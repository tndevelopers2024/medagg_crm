// models/CallTask.js
const mongoose = require('mongoose');

const callTaskSchema = new mongoose.Schema({
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  caller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  phoneNumber: { type: String, required: true },

  // lifecycle
  status: {
    type: String,
    enum: ['pending', 'sent', 'in_progress', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  createdAt: { type: Date, default: Date.now },
  sentAt: { type: Date },
  ackAt: { type: Date },
  startedAt: { type: Date },
  endedAt: { type: Date },

  // results (from mobile)
  durationSec: { type: Number, default: 0 },
  outcome: { type: String, default: '' }, // connected, not_interested, no_answer, busy, switched_off, voicemail, interested, converted, etc.
  notes: { type: String, default: '' },

  // call recording
  recordingPath: { type: String },
  recordingFilename: { type: String },
  recordingSize: { type: Number },
  recordingDuration: { type: Number },
  recordingUploadedAt: { type: Date },

  // diagnostics
  deviceInfo: { type: Object, default: {} },
  error: { type: String, default: '' },
}, { timestamps: true });

callTaskSchema.index({ caller: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('CallTask', callTaskSchema);

const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    recipients: {
      type: [String],
      required: true,
      validate: [(value) => value.length > 0, 'At least one recipient is required.'],
    },
    status: {
      type: String,
      enum: ['sent', 'partial', 'failed'],
      required: true,
    },
    successCount: {
      type: Number,
      default: 0,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    failedRecipients: {
      type: [String],
      default: [],
    },
    errorMessages: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.EmailLog || mongoose.model('EmailLog', emailLogSchema);

import mongoose from 'mongoose';

const notificationOutboxSchema = new mongoose.Schema(
  {
    outboxId: {
      type: String,
      unique: true,
      index: true,
      default: () => `OUTBOX-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    aggregateType: {
      type: String,
      required: true,
      default: 'EmergencyRequest',
      index: true,
    },
    aggregateId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 4,
    },
    errorReason: {
      type: String,
      default: null,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    nextRetryAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

notificationOutboxSchema.index({ status: 1, nextRetryAt: 1, createdAt: 1 });

export const NotificationOutbox = mongoose.model('NotificationOutbox', notificationOutboxSchema);


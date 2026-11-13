import mongoose from 'mongoose';

const emergencyNotificationOutboxSchema = new mongoose.Schema(
  {
    outboxId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      default: () => `OUTBOX-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    },
    eventType: {
      type: String,
      required: true,
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
      default: 3,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    lastError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

emergencyNotificationOutboxSchema.index({ status: 1, createdAt: 1 });

export const EmergencyNotificationOutbox = mongoose.model(
  'EmergencyNotificationOutbox',
  emergencyNotificationOutboxSchema
);


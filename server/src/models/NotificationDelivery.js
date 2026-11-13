import mongoose from 'mongoose';

const notificationDeliverySchema = new mongoose.Schema(
  {
    deliveryId: {
      type: String,
      unique: true,
      index: true,
      default: () => `DELIV-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    },
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Notification',
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ['IN_APP', 'WEBSOCKET', 'EMAIL', 'SMS', 'PUSH'],
      required: true,
      index: true,
    },
    providerName: {
      type: String,
      default: 'INTERNAL',
    },
    providerMessageId: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'DELIVERED', 'FAILED', 'RETRY_PENDING'],
      default: 'PENDING',
      index: true,
    },
    attemptCount: {
      type: Number,
      default: 0,
    },
    lastAttemptAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    failureReason: {
      type: String,
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

notificationDeliverySchema.index({ status: 1, nextRetryAt: 1 });
notificationDeliverySchema.index({ notificationId: 1, channel: 1 });

export const NotificationDelivery = mongoose.model('NotificationDelivery', notificationDeliverySchema);


import mongoose from 'mongoose';

const notificationPreferenceSchema = new mongoose.Schema(
  {
    preferenceId: {
      type: String,
      unique: true,
      index: true,
      default: () => `PREF-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    notificationType: {
      type: String,
      required: true,
      default: 'ALL',
      index: true,
    },
    channel: {
      type: String,
      enum: ['IN_APP', 'WEBSOCKET', 'EMAIL', 'SMS', 'PUSH'],
      required: true,
      index: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

notificationPreferenceSchema.index({ userId: 1, notificationType: 1, channel: 1 }, { unique: true });

export const NotificationPreference = mongoose.model('NotificationPreference', notificationPreferenceSchema);


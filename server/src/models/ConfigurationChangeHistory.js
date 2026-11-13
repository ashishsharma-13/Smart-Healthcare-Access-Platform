import mongoose from 'mongoose';

const configurationChangeHistorySchema = new mongoose.Schema(
  {
    historyId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    configKey: {
      type: String,
      required: true,
      index: true,
    },
    previousValue: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    changeReason: {
      type: String,
      required: [true, 'A change reason is required for platform configuration updates.'],
      trim: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    changedByEmail: {
      type: String,
      required: true,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

configurationChangeHistorySchema.index({ configKey: 1, timestamp: -1 });

export const ConfigurationChangeHistory = mongoose.model(
  'ConfigurationChangeHistory',
  configurationChangeHistorySchema
);


import mongoose from 'mongoose';

const platformConfigurationSchema = new mongoose.Schema(
  {
    configKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    configName: {
      type: String,
      required: true,
    },
    configGroup: {
      type: String,
      required: true,
      enum: ['EMERGENCY', 'RESOURCES', 'APPOINTMENTS', 'SECURITY', 'SYSTEM'],
      default: 'SYSTEM',
      index: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    valueType: {
      type: String,
      required: true,
      enum: ['NUMBER', 'STRING', 'BOOLEAN', 'JSON'],
      default: 'STRING',
    },
    unit: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    defaultValue: {
      type: mongoose.Schema.Types.Mixed,
    },
    minValue: {
      type: Number,
    },
    maxValue: {
      type: Number,
    },
    isEditable: {
      type: Boolean,
      default: true,
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    lastUpdatedByEmail: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const PlatformConfiguration = mongoose.model(
  'PlatformConfiguration',
  platformConfigurationSchema
);


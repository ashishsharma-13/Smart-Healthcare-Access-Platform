import mongoose from 'mongoose';

const emergencyCapabilitySchema = new mongoose.Schema(
  {
    capabilityCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    capabilityName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      enum: ['CRITICAL_CARE', 'SURGICAL', 'DIAGNOSTIC', 'SPECIALTY', 'SUPPORT'],
      default: 'CRITICAL_CARE',
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const EmergencyCapability = mongoose.model('EmergencyCapability', emergencyCapabilitySchema);


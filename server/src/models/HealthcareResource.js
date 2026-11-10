import mongoose from 'mongoose';

const healthcareResourceSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    resourceType: {
      type: String,
      enum: ['icu_bed', 'er_bay', 'ventilator', 'operating_theatre', 'oxygen_bed'],
      required: true,
    },
    totalCapacity: {
      type: Number,
      required: true,
      min: 0,
      default: 10,
    },
    availableCapacity: {
      type: Number,
      required: true,
      min: 0,
      default: 10,
    },
    reservedCapacity: {
      type: Number,
      default: 0,
      min: 0,
    },
    occupiedCapacity: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

healthcareResourceSchema.index({ organizationId: 1, resourceType: 1 }, { unique: true });

export const HealthcareResource = mongoose.model('HealthcareResource', healthcareResourceSchema);


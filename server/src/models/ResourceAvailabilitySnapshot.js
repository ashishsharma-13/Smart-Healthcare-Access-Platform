import mongoose from 'mongoose';

const resourceAvailabilitySnapshotSchema = new mongoose.Schema(
  {
    snapshotId: {
      type: String,
      unique: true,
      index: true,
      trim: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HealthcareResource',
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    totalQuantity: {
      type: Number,
      default: 0,
    },
    availableQuantity: {
      type: Number,
      default: 0,
    },
    reservedQuantity: {
      type: Number,
      default: 0,
    },
    allocatedQuantity: {
      type: Number,
      default: 0,
    },
    unavailableQuantity: {
      type: Number,
      default: 0,
    },
    operationalStatus: {
      type: String,
      default: 'OPERATIONAL',
    },
    capturedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

resourceAvailabilitySnapshotSchema.pre('save', function (next) {
  if (!this.snapshotId) {
    this.snapshotId = `SNAP-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
  }
  next();
});

resourceAvailabilitySnapshotSchema.index({ organizationId: 1, capturedAt: -1 });
resourceAvailabilitySnapshotSchema.index({ resourceId: 1, capturedAt: -1 });

export const ResourceAvailabilitySnapshot = mongoose.model(
  'ResourceAvailabilitySnapshot',
  resourceAvailabilitySnapshotSchema
);


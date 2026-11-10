import mongoose from 'mongoose';

const resourceReservationSchema = new mongoose.Schema(
  {
    emergencyRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyRequest',
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HealthcareResource',
      required: true,
    },
    resourceType: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['TEMPORARILY_RESERVED', 'PATIENT_EN_ROUTE', 'ALLOCATED', 'RELEASED', 'EXPIRED', 'CANCELLED'],
      default: 'TEMPORARILY_RESERVED',
      index: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    reservedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    releasedAt: Date,
    allocatedAt: Date,
    releaseReason: String,
  },
  {
    timestamps: true,
  }
);

export const ResourceReservation = mongoose.model('ResourceReservation', resourceReservationSchema);


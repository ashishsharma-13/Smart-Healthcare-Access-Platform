import mongoose from 'mongoose';

const resourceReservationSchema = new mongoose.Schema(
  {
    reservationId: {
      type: String,
      unique: true,
      index: true,
    },
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
    destinationSelectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyDestinationSelection',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: [
        'TEMPORARILY_RESERVED',
        'PATIENT_EN_ROUTE',
        'PATIENT_ARRIVED',
        'ALLOCATED',
        'EXPIRED',
        'CANCELLED',
        'RESOURCE_RELEASED',
        'RELEASED',
      ],
      default: 'TEMPORARILY_RESERVED',
      index: true,
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
    patientEnRouteAt: {
      type: Date,
      default: null,
    },
    patientArrivedAt: {
      type: Date,
      default: null,
    },
    allocatedAt: {
      type: Date,
      default: null,
    },
    releasedAt: {
      type: Date,
      default: null,
    },
    releaseReason: {
      type: String,
      default: null,
    },
    version: {
      type: Number,
      default: 0,
    },
    // Backward compatibility fields
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HealthcareResource',
      default: null,
    },
    resourceType: {
      type: String,
      default: 'er_bay',
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

resourceReservationSchema.pre('validate', function (next) {
  if (!this.reservationId) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.reservationId = `RES-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;
  }
  next();
});

export const ResourceReservation = mongoose.model('ResourceReservation', resourceReservationSchema);

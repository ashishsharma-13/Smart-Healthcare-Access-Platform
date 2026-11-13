import mongoose from 'mongoose';

const resourceReservationItemSchema = new mongoose.Schema(
  {
    reservationItemId: {
      type: String,
      unique: true,
      index: true,
    },
    reservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ResourceReservation',
      required: true,
      index: true,
    },
    healthcareResourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HealthcareResource',
      required: true,
      index: true,
    },
    resourceType: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    status: {
      type: String,
      enum: ['RESERVED', 'ALLOCATED', 'RELEASED'],
      default: 'RESERVED',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

resourceReservationItemSchema.pre('validate', function (next) {
  if (!this.reservationItemId) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.reservationItemId = `RSI-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;
  }
  next();
});

export const ResourceReservationItem = mongoose.model(
  'ResourceReservationItem',
  resourceReservationItemSchema
);


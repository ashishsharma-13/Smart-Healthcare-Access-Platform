import mongoose from 'mongoose';

const resourceAllocationSchema = new mongoose.Schema(
  {
    allocationId: {
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
    reservationItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ResourceReservationItem',
      default: null,
    },
    healthcareResourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HealthcareResource',
      default: null,
    },
    resourceType: {
      type: String,
      default: 'er_bay',
    },
    allocatedQuantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    allocationStatus: {
      type: String,
      enum: ['ALLOCATED', 'PARTIAL', 'FAILED'],
      default: 'ALLOCATED',
      index: true,
    },
    allocatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    allocatedAt: {
      type: Date,
      default: Date.now,
    },
    remarks: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

resourceAllocationSchema.pre('validate', function (next) {
  if (!this.allocationId) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.allocationId = `ALC-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;
  }
  next();
});

export const ResourceAllocation = mongoose.model('ResourceAllocation', resourceAllocationSchema);


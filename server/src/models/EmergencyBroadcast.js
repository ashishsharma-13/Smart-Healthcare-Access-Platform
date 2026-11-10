import mongoose from 'mongoose';

const emergencyBroadcastSchema = new mongoose.Schema(
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
    broadcastedAt: {
      type: Date,
      default: Date.now,
    },
    responseStatus: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'TIMEOUT'],
      default: 'PENDING',
      index: true,
    },
    respondedAt: Date,
    distanceKm: {
      type: Number,
      required: true,
    },
    estimatedTravelMinutes: {
      type: Number,
      required: true,
    },
    suitabilityScore: {
      type: Number,
      default: 0,
    },
    offeredResources: {
      icuBed: { type: Boolean, default: false },
      erBay: { type: Boolean, default: true },
      ventilator: { type: Boolean, default: false },
      specialistOnDuty: { type: String, default: '' },
    },
    declineReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

emergencyBroadcastSchema.index({ emergencyRequestId: 1, organizationId: 1 }, { unique: true });

export const EmergencyBroadcast = mongoose.model('EmergencyBroadcast', emergencyBroadcastSchema);


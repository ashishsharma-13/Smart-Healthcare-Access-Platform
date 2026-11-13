import mongoose from 'mongoose';

const emergencyBroadcastRecipientSchema = new mongoose.Schema(
  {
    recipientId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      default: () => `RCP-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    },
    broadcastId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyBroadcast',
      required: true,
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
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyMatchResult',
      default: null,
    },
    deliveryStatus: {
      type: String,
      enum: ['PENDING', 'DELIVERED', 'VIEWED', 'DELIVERY_FAILED'],
      default: 'PENDING',
      index: true,
    },
    responseStatus: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'NO_RESPONSE', 'EXPIRED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    viewedAt: {
      type: Date,
      default: null,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    responseBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    declineReason: {
      type: String,
      default: '',
    },
    // Dimensional telemetry cache
    distanceKm: {
      type: Number,
      default: 0,
    },
    estimatedTravelMinutes: {
      type: Number,
      default: 0,
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
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate recipients for the same organization in the same broadcast
emergencyBroadcastRecipientSchema.index(
  { broadcastId: 1, organizationId: 1 },
  { unique: true }
);

emergencyBroadcastRecipientSchema.index({ organizationId: 1, responseStatus: 1 });
emergencyBroadcastRecipientSchema.index({ emergencyRequestId: 1, responseStatus: 1 });

export const EmergencyBroadcastRecipient = mongoose.model(
  'EmergencyBroadcastRecipient',
  emergencyBroadcastRecipientSchema
);


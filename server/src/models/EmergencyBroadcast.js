import mongoose from 'mongoose';

const emergencyBroadcastSchema = new mongoose.Schema(
  {
    broadcastId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      default: () => `EBR-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    },
    emergencyRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyRequest',
      required: true,
      index: true,
    },
    broadcastRound: {
      type: Number,
      default: 1,
      min: 1,
    },
    broadcastStatus: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED'],
      default: 'ACTIVE',
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    responseDeadline: {
      type: Date,
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    totalRecipients: {
      type: Number,
      default: 0,
    },
    acceptedCount: {
      type: Number,
      default: 0,
    },
    declinedCount: {
      type: Number,
      default: 0,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Legacy single-recipient backwards-compatibility fields (Modules 8 & 9)
    // ─────────────────────────────────────────────────────────────────────────
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'resolved', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED'],
      default: 'active',
      index: true,
    },
    broadcastedAt: {
      type: Date,
      default: Date.now,
    },
    responseStatus: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'TIMEOUT', 'REJECTED', 'CAN_RECEIVE', 'NO_RESPONSE', 'EXPIRED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    respondedAt: Date,
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
    declineReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

emergencyBroadcastSchema.index({ emergencyRequestId: 1, broadcastRound: 1 });
emergencyBroadcastSchema.index({ emergencyRequestId: 1, organizationId: 1 });

export const EmergencyBroadcast = mongoose.model('EmergencyBroadcast', emergencyBroadcastSchema);

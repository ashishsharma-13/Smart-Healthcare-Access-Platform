import mongoose from 'mongoose';

const emergencyOrganizationResponseSchema = new mongoose.Schema(
  {
    responseId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      default: () => `EOR-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyBroadcastRecipient',
      required: true,
      index: true,
    },
    broadcastId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyBroadcast',
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
    responseType: {
      type: String,
      enum: ['ACCEPT', 'DECLINE', 'TIMEOUT'],
      required: true,
      index: true,
    },
    responseReason: {
      type: String,
      default: '',
    },
    offeredResources: {
      icuBed: { type: Boolean, default: false },
      erBay: { type: Boolean, default: true },
      ventilator: { type: Boolean, default: false },
      specialistOnDuty: { type: String, default: '' },
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    respondedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    ipAddress: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

emergencyOrganizationResponseSchema.index({ recipientId: 1, responseType: 1 });
emergencyOrganizationResponseSchema.index({ emergencyRequestId: 1, organizationId: 1 });

export const EmergencyOrganizationResponse = mongoose.model(
  'EmergencyOrganizationResponse',
  emergencyOrganizationResponseSchema
);


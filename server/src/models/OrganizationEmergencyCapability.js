import mongoose from 'mongoose';

const organizationEmergencyCapabilitySchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    capabilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyCapability',
      required: true,
      index: true,
    },
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrganizationFacility',
      default: null,
    },
    verificationStatus: {
      type: String,
      enum: ['SELF_DECLARED', 'VERIFIED', 'UNVERIFIED'],
      default: 'SELF_DECLARED',
      index: true,
    },
    lastVerifiedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

organizationEmergencyCapabilitySchema.index(
  { organizationId: 1, capabilityId: 1 },
  { unique: true }
);

export const OrganizationEmergencyCapability = mongoose.model(
  'OrganizationEmergencyCapability',
  organizationEmergencyCapabilitySchema
);


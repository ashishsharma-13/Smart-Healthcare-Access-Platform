import mongoose from 'mongoose';

const emergencyCategoryCapabilitySchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyCategory',
      required: true,
      index: true,
    },
    capabilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyCapability',
      required: true,
      index: true,
    },
    requirementType: {
      type: String,
      enum: ['MANDATORY', 'OPTIONAL'],
      default: 'OPTIONAL',
      index: true,
    },
    priority: {
      type: Number,
      default: 1,
      min: 1,
    },
    active: {
      type: Boolean,
      default: true,
    },
    // OPEN DECISION: clinical mappings below are DRAFT and require clinical review
    approvalStatus: {
      type: String,
      enum: ['DRAFT', 'APPROVED'],
      default: 'DRAFT',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

emergencyCategoryCapabilitySchema.index(
  { categoryId: 1, capabilityId: 1 },
  { unique: true }
);

export const EmergencyCategoryCapability = mongoose.model(
  'EmergencyCategoryCapability',
  emergencyCategoryCapabilitySchema
);


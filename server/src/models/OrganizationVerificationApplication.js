import mongoose from 'mongoose';

const applicationHistorySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'RESUBMITTED', 'SUSPENDED'],
      required: true,
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    remarks: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const organizationVerificationApplicationSchema = new mongoose.Schema(
  {
    applicationReference: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    applicationStatus: {
      type: String,
      enum: ['PENDING_VERIFICATION', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'RESUBMITTED'],
      default: 'PENDING_VERIFICATION',
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    history: [applicationHistorySchema],
  },
  {
    timestamps: true,
  }
);

export const OrganizationVerificationApplication = mongoose.model(
  'OrganizationVerificationApplication',
  organizationVerificationApplicationSchema
);


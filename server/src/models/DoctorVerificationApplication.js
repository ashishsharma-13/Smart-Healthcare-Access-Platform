import mongoose from 'mongoose';

const doctorVerificationApplicationSchema = new mongoose.Schema(
  {
    applicationReference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
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
      enum: ['PENDING_VERIFICATION', 'APPROVED', 'REJECTED'],
      default: 'PENDING_VERIFICATION',
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    remarks: {
      type: String,
      default: '',
    },
    history: [
      {
        action: {
          type: String,
          enum: ['SUBMITTED', 'APPROVED', 'REJECTED', 'RESUBMITTED'],
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
    ],
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export const DoctorVerificationApplication = mongoose.model(
  'DoctorVerificationApplication',
  doctorVerificationApplicationSchema
);


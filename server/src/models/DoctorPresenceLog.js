import mongoose from 'mongoose';

const doctorPresenceLogSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ['CHECK_IN', 'CHECK_OUT'],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    method: {
      type: String,
      enum: ['QR_SCAN', 'MANUAL_VERIFIED'],
      default: 'QR_SCAN',
    },
    tokenUsed: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const DoctorPresenceLog = mongoose.model('DoctorPresenceLog', doctorPresenceLogSchema);


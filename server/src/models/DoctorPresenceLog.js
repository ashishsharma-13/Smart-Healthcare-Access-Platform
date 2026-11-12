import mongoose from 'mongoose';

const doctorPresenceLogSchema = new mongoose.Schema(
  {
    presenceId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      default: () => `PRES-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    },
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
    affiliationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DoctorAffiliation',
      index: true,
    },
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrganizationFacility',
    },
    checkInAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    checkOutAt: {
      type: Date,
    },
    durationMinutes: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'MANUAL_CORRECTED'],
      default: 'CHECKED_IN',
      index: true,
    },
    checkInMethod: {
      type: String,
      enum: ['QR_SCAN', 'MANUAL_VERIFIED', 'MANUAL_CORRECTED', 'EMERGENCY_OVERRIDE'],
      default: 'QR_SCAN',
    },
    checkOutMethod: {
      type: String,
      enum: ['QR_SCAN', 'AUTO_CHECKOUT', 'MANUAL_CORRECTED'],
    },
    tokenUsed: {
      type: String,
    },
    // Backwards-compatible legacy fields
    action: {
      type: String,
      enum: ['CHECK_IN', 'CHECK_OUT'],
      default: 'CHECK_IN',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    method: {
      type: String,
      enum: ['QR_SCAN', 'MANUAL_VERIFIED', 'MANUAL_CORRECTED'],
      default: 'QR_SCAN',
    },
    manualCorrection: {
      correctedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      correctedAt: Date,
      reason: String,
      originalCheckInAt: Date,
      originalCheckOutAt: Date,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
doctorPresenceLogSchema.index({ doctorId: 1, status: 1 });
doctorPresenceLogSchema.index({ organizationId: 1, status: 1 });
doctorPresenceLogSchema.index({ organizationId: 1, checkInAt: -1 });

export const DoctorPresenceLog = mongoose.model('DoctorPresenceLog', doctorPresenceLogSchema);

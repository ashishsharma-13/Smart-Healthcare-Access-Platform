import mongoose from 'mongoose';

const patientConsentSchema = new mongoose.Schema(
  {
    consentId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      default: () => `CNS-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: [
        'REGULAR_HEALTHCARE_SHARING',
        'EMERGENCY_COORDINATION',
        'MEDICAL_DOCUMENT_SHARING',
        'EMERGENCY_CONTACT_NOTIFICATION',
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ['GRANTED', 'REVOKED'],
      default: 'GRANTED',
    },
    policyVersion: {
      type: String,
      default: '1.0',
    },
    grantedAt: {
      type: Date,
      default: Date.now,
    },
    revokedAt: {
      type: Date,
      default: null,
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

patientConsentSchema.index({ userId: 1, purpose: 1 });

export const PatientConsent = mongoose.model('PatientConsent', patientConsentSchema);


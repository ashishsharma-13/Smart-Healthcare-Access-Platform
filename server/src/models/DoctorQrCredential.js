import mongoose from 'mongoose';

const doctorQrCredentialSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true,
    },
    doctorUniqueId: {
      type: String,
      required: true,
      index: true,
    },
    credentialToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    qrDataPayload: {
      type: String,
      required: true,
    },
    qrDataUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'REVOKED', 'EXPIRED'],
      default: 'ACTIVE',
      index: true,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    revokedAt: {
      type: Date,
    },
    revocationReason: {
      type: String,
      default: '',
    },
    reissuedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DoctorQrCredential',
      default: null,
    },
  },
  { timestamps: true }
);

export const DoctorQrCredential = mongoose.model('DoctorQrCredential', doctorQrCredentialSchema);


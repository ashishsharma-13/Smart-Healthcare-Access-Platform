import mongoose from 'mongoose';

const organizationQRCodeSchema = new mongoose.Schema(
  {
    qrId: {
      type: String,
      unique: true,
      index: true,
      default: () => `ORGQR-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrganizationFacility',
      index: true,
    },
    location: {
      type: String,
      default: 'Main Reception & Triage Desk',
      trim: true,
    },
    codeType: {
      type: String,
      enum: ['STATIC', 'ROTATING', 'DYNAMIC'],
      default: 'STATIC',
    },
    qrToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tokenHash: {
      type: String,
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
    expiresAt: {
      type: Date,
    },
    revokedAt: {
      type: Date,
    },
    revocationReason: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

organizationQRCodeSchema.index({ organizationId: 1, status: 1 });

export const OrganizationQRCode = mongoose.model('OrganizationQRCode', organizationQRCodeSchema);


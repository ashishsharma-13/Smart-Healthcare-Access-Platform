import mongoose from 'mongoose';
import { OrganizationQRCode } from '../models/OrganizationQRCode.js';

export class OrganizationQRCodeRepository {
  async create(qrData) {
    const qr = new OrganizationQRCode(qrData);
    return await qr.save();
  }

  async findById(id) {
    return await OrganizationQRCode.findById(id)
      .populate('organizationId', 'name legalName uniqueOrganizationCode address verificationStatus')
      .populate('facilityId')
      .populate('createdBy', 'name email role')
      .exec();
  }

  async findByQrId(qrId) {
    return await OrganizationQRCode.findOne({ qrId })
      .populate('organizationId', 'name legalName uniqueOrganizationCode address verificationStatus')
      .populate('facilityId')
      .exec();
  }

  async findByToken(token) {
    if (!token || !mongoose.connection?.readyState) return null;
    try {
      return await OrganizationQRCode.findOne({
        $or: [{ qrToken: token }, { tokenHash: token }, { qrDataPayload: token }],
      })
        .populate('organizationId', 'name legalName uniqueOrganizationCode address verificationStatus')
        .populate('facilityId')
        .exec();
    } catch {
      return null;
    }
  }

  async listByOrganization(organizationId, filter = {}) {
    return await OrganizationQRCode.find({ organizationId, ...filter })
      .populate('facilityId')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findActiveByOrganization(organizationId) {
    return await OrganizationQRCode.findOne({
      organizationId,
      status: 'ACTIVE',
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    })
      .populate('organizationId', 'name legalName uniqueOrganizationCode address')
      .populate('facilityId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async revoke(id, reason, revokedBy = null) {
    return await OrganizationQRCode.findByIdAndUpdate(
      id,
      {
        status: 'REVOKED',
        revokedAt: new Date(),
        revocationReason: reason || 'Revoked by authorized personnel',
      },
      { new: true }
    ).exec();
  }

  async count(filter = {}) {
    return await OrganizationQRCode.countDocuments(filter).exec();
  }
}

export const organizationQRCodeRepository = new OrganizationQRCodeRepository();


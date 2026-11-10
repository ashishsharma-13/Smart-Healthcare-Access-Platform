import QRCode from 'qrcode';
import { organizationRepository } from '../repositories/OrganizationRepository.js';
import { resourceRepository } from '../repositories/ResourceRepository.js';
import { Doctor } from '../models/Doctor.js';

export class OrganizationService {
  async approveOrganization(orgId) {
    return await organizationRepository.updateById(orgId, {
      verificationStatus: 'verified',
    });
  }

  async rejectOrganization(orgId) {
    return await organizationRepository.updateById(orgId, {
      verificationStatus: 'rejected',
    });
  }

  async getOrganizationQrCode(orgId) {
    const org = await organizationRepository.findById(orgId);
    if (!org) throw new Error('Organization not found');

    const qrDataUrl = await QRCode.toDataURL(org.qrCheckinCode);
    return {
      qrDataUrl,
      qrCheckinCode: org.qrCheckinCode,
      organizationName: org.name,
    };
  }

  async getPresentDoctors(orgId) {
    return await Doctor.find({
      'currentPresence.organizationId': orgId,
      'currentPresence.isPresent': true,
    })
      .populate('userId', 'name email phone avatar')
      .exec();
  }

  async getResources(orgId) {
    return await resourceRepository.findByOrg(orgId);
  }

  async updateResource(orgId, resourceType, totalCapacity, availableCapacity) {
    return await resourceRepository.upsertResource(orgId, resourceType, totalCapacity, availableCapacity);
  }
}

export const organizationService = new OrganizationService();


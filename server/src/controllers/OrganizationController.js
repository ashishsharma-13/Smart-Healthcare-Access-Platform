import { organizationRepository } from '../repositories/OrganizationRepository.js';
import { organizationService } from '../services/OrganizationService.js';
import { emergencyRepository } from '../repositories/EmergencyRepository.js';

export class OrganizationController {
  async searchOrganizations(req, res, next) {
    try {
      const filter = { verificationStatus: 'verified' };
      if (req.query.type) {
        filter.orgType = req.query.type;
      }
      if (req.query.emergencyOnly === 'true') {
        filter.emergencyCapable = true;
      }

      const orgs = await organizationRepository.listAll(filter);
      res.json({ success: true, count: orgs.length, data: orgs });
    } catch (err) {
      next(err);
    }
  }

  async getOrganizationById(req, res, next) {
    try {
      const org = await organizationRepository.findById(req.params.id);
      if (!org) {
        return res.status(404).json({ success: false, message: 'Organization not found' });
      }
      const resources = await organizationService.getResources(org._id);
      const doctorsPresent = await organizationService.getPresentDoctors(org._id);

      res.json({
        success: true,
        data: {
          ...org.toObject(),
          resources,
          doctorsPresent,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async getMyOrganizationProfile(req, res, next) {
    try {
      const org = await organizationRepository.findByUserId(req.user._id);
      if (!org) {
        return res.status(404).json({ success: false, message: 'Organization profile not found' });
      }
      const resources = await organizationService.getResources(org._id);
      const doctorsPresent = await organizationService.getPresentDoctors(org._id);

      res.json({
        success: true,
        data: {
          ...org.toObject(),
          resources,
          doctorsPresent,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async getQrCheckinCode(req, res, next) {
    try {
      const org = await organizationRepository.findByUserId(req.user._id);
      if (!org) {
        return res.status(404).json({ success: false, message: 'Organization profile not found' });
      }
      const qrData = await organizationService.getOrganizationQrCode(org._id);
      res.json({ success: true, data: qrData });
    } catch (err) {
      next(err);
    }
  }

  async updateResources(req, res, next) {
    try {
      const org = await organizationRepository.findByUserId(req.user._id);
      if (!org) {
        return res.status(404).json({ success: false, message: 'Organization profile not found' });
      }

      const { resourceType, totalCapacity, availableCapacity } = req.body;
      const updated = await organizationService.updateResource(org._id, resourceType, totalCapacity, availableCapacity);
      res.json({ success: true, message: 'Resource capacity updated', data: updated });
    } catch (err) {
      next(err);
    }
  }

  async getIncomingEmergencyBroadcasts(req, res, next) {
    try {
      const org = await organizationRepository.findByUserId(req.user._id);
      if (!org) {
        return res.status(404).json({ success: false, message: 'Organization profile not found' });
      }

      const broadcasts = await emergencyRepository.listActiveBroadcastsForOrg(org._id);
      res.json({ success: true, data: broadcasts });
    } catch (err) {
      next(err);
    }
  }
}

export const organizationController = new OrganizationController();


import { organizationRepository } from '../repositories/OrganizationRepository.js';
import { organizationService } from '../services/OrganizationService.js';
import { emergencyRepository } from '../repositories/EmergencyRepository.js';
import { User } from '../models/index.js';

export class OrganizationController {
  async searchOrganizations(req, res, next) {
    try {
      const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
      const filter = {};
      // In local development mode, allow unverified or pending organizations to appear
      if (!isDev || req.query.verifiedOnly === 'true') {
        filter.verificationStatus = 'verified';
      }

      if (req.query.type) {
        filter.orgType = req.query.type;
      }
      if (req.query.emergencyOnly === 'true') {
        filter.emergencyCapable = true;
      }

      const q = req.query.q || req.query.search || '';
      if (q && q.trim()) {
        const queryTerm = q.trim();
        let userIds = [];
        try {
          const matchingUsers = await User.find({
            role: 'organization',
            $or: [
              { email: { $regex: queryTerm, $options: 'i' } },
              { name: { $regex: queryTerm, $options: 'i' } },
            ],
          }).select('_id');
          userIds = matchingUsers.map((u) => u._id);
        } catch (err) {}

        filter.$or = [
          { name: { $regex: queryTerm, $options: 'i' } },
          { organizationName: { $regex: queryTerm, $options: 'i' } },
          { email: { $regex: queryTerm, $options: 'i' } },
          ...(userIds.length > 0 ? [{ userId: { $in: userIds } }] : []),
          { 'address.city': { $regex: queryTerm, $options: 'i' } },
          { 'operatingAddress.city': { $regex: queryTerm, $options: 'i' } },
        ];
      }

      const orgs = await organizationRepository.listAll(filter);
      // Ensure sensitive legal verification documents are never exposed through public search
      const sanitized = orgs.map((o) => {
        const obj = o.toObject ? o.toObject() : { ...o };
        delete obj.licenseDocumentUrl;
        delete obj.registrationCertificateUrl;
        delete obj.taxIdDocumentUrl;
        delete obj.verificationNotes;
        return obj;
      });
      res.json({ success: true, count: sanitized.length, data: sanitized });
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

  async updateOrganizationAddress(req, res, next) {
    try {
      const org = await organizationRepository.findByUserId(req.user._id);
      if (!org) {
        return res.status(404).json({ success: false, message: 'Organization profile not found' });
      }

      const { registeredAddress, operatingAddress, location, coordinates, latitude, longitude } = req.body;

      // Validate PIN code format if provided
      if (registeredAddress?.pinCode && !/^\d{6}$/.test(String(registeredAddress.pinCode).trim())) {
        return res.status(400).json({
          success: false,
          message: 'Registered address PIN code must be exactly 6 digits.',
        });
      }

      const isSameAsRegistered = operatingAddress?.isSameAsRegistered !== false;
      if (!isSameAsRegistered && operatingAddress?.pinCode && !/^\d{6}$/.test(String(operatingAddress.pinCode).trim())) {
        return res.status(400).json({
          success: false,
          message: 'Operating address PIN code must be exactly 6 digits.',
        });
      }

      // Validate Coordinates
      let coords = org.location?.coordinates || [77.2090, 28.6139];
      if (location?.coordinates && Array.isArray(location.coordinates)) {
        coords = location.coordinates.map(Number);
      } else if (coordinates && Array.isArray(coordinates)) {
        coords = coordinates.map(Number);
      } else if (latitude !== undefined && longitude !== undefined) {
        coords = [parseFloat(longitude), parseFloat(latitude)];
      }

      const [lng, lat] = coords;
      if (
        typeof lng !== 'number' ||
        typeof lat !== 'number' ||
        isNaN(lng) ||
        isNaN(lat) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid GPS coordinates. Latitude must be between -90 and 90, and longitude between -180 and 180.',
        });
      }

      // Update addresses and location
      if (registeredAddress) {
        org.registeredAddress = { ...(org.registeredAddress?.toObject?.() || {}), ...registeredAddress };
      }

      if (operatingAddress) {
        org.operatingAddress = {
          ...(org.operatingAddress?.toObject?.() || {}),
          ...operatingAddress,
          isSameAsRegistered,
        };
      } else if (isSameAsRegistered && registeredAddress) {
        org.operatingAddress = {
          ...(org.registeredAddress?.toObject?.() || {}),
          isSameAsRegistered: true,
        };
      }

      org.location = {
        type: 'Point',
        coordinates: [lng, lat],
      };

      const updated = await org.save();

      res.json({
        success: true,
        message: 'Organization address and operating GPS coordinates updated successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const organizationController = new OrganizationController();


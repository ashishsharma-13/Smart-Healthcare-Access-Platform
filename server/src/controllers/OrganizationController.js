import { organizationRepository } from '../repositories/OrganizationRepository.js';
import { organizationService } from '../services/OrganizationService.js';
import { emergencyRepository } from '../repositories/EmergencyRepository.js';
import { User } from '../models/index.js';

export const calculateHaversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const numLat1 = Number(lat1);
  const numLon1 = Number(lon1);
  const numLat2 = Number(lat2);
  const numLon2 = Number(lon2);
  if (isNaN(numLat1) || isNaN(numLon1) || isNaN(numLat2) || isNaN(numLon2)) return null;

  const R = 6371; // Earth's mean radius in km
  const dLat = ((numLat2 - numLat1) * Math.PI) / 180;
  const dLon = ((numLon2 - numLon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((numLat1 * Math.PI) / 180) *
      Math.cos((numLat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

export class OrganizationController {
  async searchOrganizations(req, res, next) {
    try {
      const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
      const filter = {};
      // In local development mode, allow unverified or pending organizations to appear
      if (!isDev || req.query.verifiedOnly === 'true') {
        filter.verificationStatus = 'verified';
      }

      const originLat = req.query.lat != null && req.query.lat !== '' ? Number(req.query.lat) : (req.query.latitude != null ? Number(req.query.latitude) : null);
      const originLng = req.query.lng != null && req.query.lng !== '' ? Number(req.query.lng) : (req.query.longitude != null ? Number(req.query.longitude) : null);
      const hasCoordinates = originLat != null && originLng != null && !isNaN(originLat) && !isNaN(originLng) && originLat >= -90 && originLat <= 90 && originLng >= -180 && originLng <= 180;
      const maxRadius = req.query.radiusKm != null && req.query.radiusKm !== '' ? Number(req.query.radiusKm) : null;
      const sortBy = req.query.sortBy || 'name';

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
      let sanitized = orgs.map((o) => {
        const obj = o.toObject ? o.toObject() : { ...o };
        delete obj.licenseDocumentUrl;
        delete obj.registrationCertificateUrl;
        delete obj.taxIdDocumentUrl;
        delete obj.verificationNotes;

        // Calculate Haversine distance if patient coordinates are available
        let distanceKm = null;
        const coords = obj.location?.coordinates || obj.coordinates;
        if (hasCoordinates && Array.isArray(coords) && coords.length === 2) {
          const orgLng = coords[0];
          const orgLat = coords[1];
          distanceKm = calculateHaversineDistanceKm(originLat, originLng, orgLat, orgLng);
        }
        obj.distanceKm = distanceKm;
        return obj;
      });

      // Radius filter
      if (hasCoordinates && maxRadius != null && !isNaN(maxRadius)) {
        sanitized = sanitized.filter((o) => o.distanceKm != null && o.distanceKm <= maxRadius);
      }

      // Sort by distance if requested
      if (sortBy === 'distance' && hasCoordinates) {
        sanitized.sort((a, b) => {
          if (a.distanceKm == null) return 1;
          if (b.distanceKm == null) return -1;
          return a.distanceKm - b.distanceKm;
        });
      }

      res.json({ success: true, count: sanitized.length, hasCoordinates, data: sanitized });
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

  async registerOrganization(req, res, next) {
    try {
      const result = await organizationService.registerOrganization(req.body);
      res.status(201).json({
        success: true,
        message: 'Organization registration application submitted. Status is PENDING_VERIFICATION.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getMyVerificationStatus(req, res, next) {
    try {
      const org = await organizationRepository.findByUserId(req.user._id);
      if (!org) {
        return res.status(404).json({ success: false, message: 'Organization profile not found.' });
      }
      const status = await organizationService.getOrganizationVerificationStatus(org._id);
      res.json({ success: true, data: status });
    } catch (err) {
      next(err);
    }
  }

  async getMyFacilities(req, res, next) {
    try {
      const org = await organizationRepository.findByUserId(req.user._id);
      if (!org) {
        return res.status(404).json({ success: false, message: 'Organization profile not found.' });
      }
      const facilities = await organizationService.getOrganizationFacilities(org._id);
      res.json({ success: true, count: facilities.length, data: facilities });
    } catch (err) {
      next(err);
    }
  }

  async addFacility(req, res, next) {
    try {
      const org = await organizationRepository.findByUserId(req.user._id);
      if (!org) {
        return res.status(404).json({ success: false, message: 'Organization profile not found.' });
      }
      const facility = await organizationService.addOrganizationFacility(org._id, req.body);
      res.status(201).json({ success: true, message: 'Facility added successfully', data: facility });
    } catch (err) {
      next(err);
    }
  }

  async uploadDocument(req, res, next) {
    try {
      const org = await organizationRepository.findByUserId(req.user._id);
      if (!org) {
        return res.status(404).json({ success: false, message: 'Organization profile not found.' });
      }
      const { documentType, documentName, storageReference, mimeType, fileSize } = req.body;
      if (!documentType || !documentName) {
        return res.status(400).json({ success: false, message: 'documentType and documentName are required.' });
      }

      const docRecord = {
        documentType,
        documentName,
        storageReference: storageReference || 'https://storage.shap.health/docs/' + documentName,
        mimeType: mimeType || 'application/pdf',
        fileSize: fileSize || 1048576,
        uploadedAt: new Date(),
      };

      org.documents.push(docRecord);
      await org.save();

      res.status(201).json({ success: true, message: 'Document uploaded successfully', data: docRecord });
    } catch (err) {
      next(err);
    }
  }

  async resubmitApplication(req, res, next) {
    try {
      const org = await organizationRepository.findByUserId(req.user._id);
      if (!org) {
        return res.status(404).json({ success: false, message: 'Organization profile not found.' });
      }
      const updated = await organizationService.resubmitOrganizationApplication(org._id, req.body, req.user._id);
      res.json({ success: true, message: 'Application successfully resubmitted for verification.', data: updated });
    } catch (err) {
      next(err);
    }
  }

  async getMyDashboard(req, res, next) {
    try {
      const org = await organizationRepository.findByUserId(req.user._id);
      if (!org) {
        return res.status(404).json({ success: false, message: 'Organization profile not found.' });
      }
      const metrics = await organizationService.getOrganizationDashboardMetrics(org._id);
      res.json({ success: true, data: metrics });
    } catch (err) {
      next(err);
    }
  }

  async updateMyOrganization(req, res, next) {
    try {
      const org = await organizationRepository.findByUserId(req.user._id);
      if (!org) {
        return res.status(404).json({ success: false, message: 'Organization profile not found.' });
      }

      const allowedFields = [
        'name',
        'legalName',
        'website',
        'description',
        'officialEmail',
        'contactNumber',
        'emergencyContactPhone',
        'emergencyCapable',
        'facilities',
        'healthcareCapabilities',
        'specializations',
      ];

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          org[field] = req.body[field];
        }
      }

      const updated = await org.save();
      res.json({ success: true, message: 'Organization profile updated successfully', data: updated });
    } catch (err) {
      next(err);
    }
  }
}

export const organizationController = new OrganizationController();


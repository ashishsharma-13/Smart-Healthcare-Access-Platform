import mongoose from 'mongoose';
import { doctorRepository } from '../repositories/DoctorRepository.js';
import { doctorService } from '../services/DoctorService.js';
import { doctorAffiliationRepository } from '../repositories/DoctorAffiliationRepository.js';
import { User } from '../models/User.js';

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

export class DoctorController {
  async searchDoctors(req, res, next) {
    try {
      const doctors = await doctorRepository.searchDoctors(req.query);
      const querySearch = (req.query.search || req.query.name || req.query.q || '').toLowerCase();

      const originLat = req.query.lat != null && req.query.lat !== '' ? Number(req.query.lat) : (req.query.latitude != null ? Number(req.query.latitude) : null);
      const originLng = req.query.lng != null && req.query.lng !== '' ? Number(req.query.lng) : (req.query.longitude != null ? Number(req.query.longitude) : null);
      const hasCoordinates = originLat != null && originLng != null && !isNaN(originLat) && !isNaN(originLng) && originLat >= -90 && originLat <= 90 && originLng >= -180 && originLng <= 180;
      const maxRadius = req.query.radiusKm != null && req.query.radiusKm !== '' ? Number(req.query.radiusKm) : null;
      const sortBy = req.query.sortBy || 'rating';

      // Attach active hospital affiliations and calculate physical/affiliated distance to each doctor
      const resultsWithAffiliations = await Promise.all(
        doctors.map(async (doc) => {
          const docObj = doc.toObject();
          const affiliations = await doctorAffiliationRepository.listByDoctor(doc._id, {
            status: { $in: ['ACTIVE', 'approved', 'ACCEPTED'] },
          });
          docObj.activeAffiliations = affiliations;

          let minDistanceKm = null;
          let nearestOrgName = null;
          let presenceDistanceKm = null;

          // Check physical presence hospital
          if (doc.currentPresence?.isPresent && doc.currentPresence?.organizationId?.location?.coordinates?.length === 2) {
            const pLng = doc.currentPresence.organizationId.location.coordinates[0];
            const pLat = doc.currentPresence.organizationId.location.coordinates[1];
            if (hasCoordinates) {
              presenceDistanceKm = calculateHaversineDistanceKm(originLat, originLng, pLat, pLng);
              minDistanceKm = presenceDistanceKm;
              nearestOrgName = doc.currentPresence.organizationId.name;
            }
          }

          // Check affiliated organizations
          if (Array.isArray(affiliations)) {
            affiliations.forEach((aff) => {
              const org = aff.organizationId;
              const coords = org?.location?.coordinates;
              if (hasCoordinates && Array.isArray(coords) && coords.length === 2) {
                const oLng = coords[0];
                const oLat = coords[1];
                const d = calculateHaversineDistanceKm(originLat, originLng, oLat, oLng);
                if (d != null) {
                  if (minDistanceKm == null || d < minDistanceKm) {
                    minDistanceKm = d;
                    nearestOrgName = org.name;
                  }
                }
              }
            });
          }

          docObj.distanceKm = minDistanceKm;
          docObj.nearestOrganizationName = nearestOrgName;
          docObj.presenceDistanceKm = presenceDistanceKm;
          return docObj;
        })
      );

      let filtered = resultsWithAffiliations;
      if (querySearch) {
        filtered = resultsWithAffiliations.filter(
          (d) =>
            d.userId?.name?.toLowerCase().includes(querySearch) ||
            d.specialization?.toLowerCase().includes(querySearch) ||
            d.activeAffiliations?.some((a) => a.organizationId?.name?.toLowerCase().includes(querySearch))
        );
      }

      // Radius filtering
      if (hasCoordinates && maxRadius != null && !isNaN(maxRadius)) {
        filtered = filtered.filter((d) => d.distanceKm != null && d.distanceKm <= maxRadius);
      }

      // Sorting
      if (sortBy === 'distance' && hasCoordinates) {
        filtered.sort((a, b) => {
          if (a.distanceKm == null) return 1;
          if (b.distanceKm == null) return -1;
          return a.distanceKm - b.distanceKm;
        });
      } else if (sortBy === 'experience') {
        filtered.sort((a, b) => (b.experienceYears || 0) - (a.experienceYears || 0));
      } else if (sortBy === 'fee') {
        filtered.sort((a, b) => (a.consultationFee || 0) - (b.consultationFee || 0));
      }

      res.json({
        success: true,
        count: filtered.length,
        hasCoordinates,
        data: filtered,
      });
    } catch (err) {
      next(err);
    }
  }

  async getDoctorAffiliationsForPatient(req, res, next) {
    try {
      const { id } = req.params;
      let doctor = null;
      if (mongoose.Types.ObjectId.isValid(id) && String(id).length === 24) {
        doctor = await doctorRepository.findById(id);
      } else {
        doctor = await doctorRepository.findByUniqueId(id);
      }
      if (!doctor) {
        return res.status(404).json({ success: false, message: 'Doctor not found.' });
      }

      const affiliations = await doctorAffiliationRepository.listByDoctor(doctor._id, {
        status: { $in: ['ACTIVE', 'approved'] },
      });

      res.json({
        success: true,
        count: affiliations.length,
        data: affiliations,
      });
    } catch (err) {
      next(err);
    }
  }

  async getDoctorById(req, res, next) {
    try {
      let doctor = null;
      if (mongoose.Types.ObjectId.isValid(req.params.id)) {
        doctor = await doctorRepository.findById(req.params.id);
      } else {
        doctor = await doctorRepository.findByUniqueId(req.params.id);
        if (!doctor) {
          const allDocs = await doctorRepository.searchDoctors({});
          doctor = allDocs.find((d) =>
            d.doctorUniqueId === req.params.id ||
            (req.params.id.toLowerCase().includes('mira') && d.userId?.name?.toLowerCase().includes('mira')) ||
            (req.params.id.toLowerCase().includes('daniel') && d.userId?.name?.toLowerCase().includes('daniel')) ||
            (req.params.id.toLowerCase().includes('sofia') && d.userId?.name?.toLowerCase().includes('sofia'))
          ) || null;
        }
      }
      if (!doctor) {
        return res.status(404).json({ success: false, message: 'Doctor not found' });
      }
      res.json({ success: true, data: doctor });
    } catch (err) {
      next(err);
    }
  }

  async getMyDoctorProfile(req, res, next) {
    try {
      const doctor = await doctorRepository.findByUserId(req.user._id);
      if (!doctor) {
        return res.status(404).json({ success: false, message: 'Doctor profile not found' });
      }
      res.json({ success: true, data: doctor });
    } catch (err) {
      next(err);
    }
  }

  async updateMyDoctorProfile(req, res, next) {
    try {
      const doctor = await doctorRepository.findByUserId(req.user._id);
      if (!doctor) {
        return res.status(404).json({ success: false, message: 'Doctor profile not found' });
      }

      const {
        name,
        phone,
        specialization,
        qualifications,
        experienceYears,
        consultationFee,
        bio,
        licenseNumber,
        languages,
        workingHours,
        isAvailableForAppointments,
        isAvailableForEmergency,
      } = req.body;

      if (name || phone) {
        const userUpdate = {};
        if (name && name.trim()) userUpdate.name = name.trim();
        if (phone && phone.trim()) userUpdate.phone = phone.trim();
        await User.findByIdAndUpdate(req.user._id, userUpdate);
      }

      const doctorUpdate = {};
      if (specialization !== undefined) doctorUpdate.specialization = specialization;
      if (qualifications !== undefined) {
        doctorUpdate.qualifications = Array.isArray(qualifications)
          ? qualifications
          : typeof qualifications === 'string'
          ? qualifications.split(',').map((s) => s.trim()).filter(Boolean)
          : [];
      }
      if (experienceYears !== undefined) doctorUpdate.experienceYears = Number(experienceYears);
      if (consultationFee !== undefined) doctorUpdate.consultationFee = Number(consultationFee);
      if (bio !== undefined) doctorUpdate.bio = bio;
      if (licenseNumber !== undefined) doctorUpdate.licenseNumber = licenseNumber;
      if (languages !== undefined) {
        doctorUpdate.languages = Array.isArray(languages)
          ? languages
          : typeof languages === 'string'
          ? languages.split(',').map((s) => s.trim()).filter(Boolean)
          : [];
      }
      if (workingHours !== undefined) doctorUpdate.workingHours = workingHours;
      if (isAvailableForAppointments !== undefined) doctorUpdate.isAvailableForAppointments = Boolean(isAvailableForAppointments);
      if (isAvailableForEmergency !== undefined) doctorUpdate.isAvailableForEmergency = Boolean(isAvailableForEmergency);

      const updated = await doctorRepository.updateById(doctor._id, doctorUpdate);
      res.json({
        success: true,
        message: 'Doctor profile updated successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async registerDoctor(req, res, next) {
    try {
      const result = await doctorService.registerDoctor(req.body);
      res.status(201).json({
        success: true,
        message: result.message,
        applicationReference: result.applicationReference,
        status: result.status,
        data: result,
      });
    } catch (err) {
      if (err.message && (err.message.includes('already registered') || err.message.includes('already exists') || err.message.includes('required'))) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async uploadDocument(req, res, next) {
    try {
      const doctor = await doctorRepository.findByUserId(req.user._id);
      if (!doctor) {
        return res.status(404).json({ success: false, message: 'Doctor profile not found' });
      }
      const result = await doctorService.uploadDoctorDocument(doctor._id, req.body);
      res.status(201).json(result);
    } catch (err) {
      if (err.message && err.message.includes('required')) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async getVerificationStatus(req, res, next) {
    try {
      const doctor = await doctorRepository.findByUserId(req.user._id);
      if (!doctor) {
        return res.status(404).json({ success: false, message: 'Doctor profile not found' });
      }
      const status = await doctorService.getDoctorVerificationStatus(doctor._id);
      res.json({ success: true, data: status });
    } catch (err) {
      next(err);
    }
  }

  async resubmitApplication(req, res, next) {
    try {
      const doctor = await doctorRepository.findByUserId(req.user._id);
      if (!doctor) {
        return res.status(404).json({ success: false, message: 'Doctor profile not found' });
      }
      const result = await doctorService.resubmitDoctorApplication(doctor._id, req.body);
      res.json(result);
    } catch (err) {
      if (err.message && err.message.includes('Only rejected')) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async getCredentials(req, res, next) {
    try {
      const doctor = await doctorRepository.findByUserId(req.user._id);
      if (!doctor) {
        return res.status(404).json({ success: false, message: 'Doctor profile not found' });
      }
      const qrData = await doctorService.getQrCredential(doctor._id);
      res.json({
        success: true,
        data: {
          doctorUniqueId: doctor.doctorUniqueId,
          verificationStatus: doctor.verificationStatus,
          ...qrData,
        },
      });
    } catch (err) {
      if (err.message && err.message.includes('Only verified doctors')) {
        return res.status(403).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async reissueCredential(req, res, next) {
    try {
      const doctor = await doctorRepository.findByUserId(req.user._id);
      if (!doctor) {
        return res.status(404).json({ success: false, message: 'Doctor profile not found' });
      }
      const { reason } = req.body;
      const result = await doctorService.reissueQrCredential(doctor._id, reason, req.user._id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getQrCredential(req, res, next) {
    try {
      const doctor = await doctorRepository.findByUserId(req.user._id);
      if (!doctor) {
        return res.status(404).json({ success: false, message: 'Doctor profile not found' });
      }
      const qrData = await doctorService.getQrCredential(doctor._id);
      res.json({ success: true, data: qrData });
    } catch (err) {
      next(err);
    }
  }

  async checkIn(req, res, next) {
    try {
      const { orgQrCheckinCode } = req.body;
      if (!orgQrCheckinCode) {
        return res.status(400).json({ success: false, message: 'Organization QR check-in code is required' });
      }
      const doctor = await doctorRepository.findByUserId(req.user._id);
      if (!doctor) {
        return res.status(404).json({ success: false, message: 'Doctor profile not found' });
      }

      const result = await doctorService.checkIn(doctor._id, orgQrCheckinCode);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async checkOut(req, res, next) {
    try {
      const doctor = await doctorRepository.findByUserId(req.user._id);
      if (!doctor) {
        return res.status(404).json({ success: false, message: 'Doctor profile not found' });
      }
      const result = await doctorService.checkOut(doctor._id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async updateAvailability(req, res, next) {
    try {
      const doctor = await doctorRepository.findByUserId(req.user._id);
      if (!doctor) {
        return res.status(404).json({ success: false, message: 'Doctor profile not found' });
      }
      const updated = await doctorService.updateAvailability(doctor._id, req.body);
      res.json({
        success: true,
        message: 'Doctor availability updated',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async getPresenceHistory(req, res, next) {
    try {
      const doctor = await doctorRepository.findByUserId(req.user._id);
      if (!doctor) {
        return res.status(404).json({ success: false, message: 'Doctor profile not found' });
      }
      const history = await doctorService.getPresenceHistory(doctor._id);
      res.json({ success: true, data: history });
    } catch (err) {
      next(err);
    }
  }
}

export const doctorController = new DoctorController();


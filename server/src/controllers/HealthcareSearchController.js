import { healthcareSearchService } from '../services/HealthcareSearchService.js';
import { Specialization, HealthcareResourceType } from '../models/index.js';

export class HealthcareSearchController {
  async searchDoctors(req, res, next) {
    try {
      const userContext = req.user ? { userId: req.user._id, role: req.user.role } : null;
      const results = await healthcareSearchService.searchDoctors(req.query, userContext);
      res.json(results);
    } catch (err) {
      next(err);
    }
  }

  async searchOrganizations(req, res, next) {
    try {
      const userContext = req.user ? { userId: req.user._id, role: req.user.role } : null;
      const results = await healthcareSearchService.searchOrganizations(req.query, userContext);
      res.json(results);
    } catch (err) {
      next(err);
    }
  }

  async getNearbyOrganizations(req, res, next) {
    try {
      const { lat, lng, radiusKm, type, limit } = req.query;
      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          message: 'Query parameters lat and lng are required for nearby organization search.',
        });
      }
      const results = await healthcareSearchService.getNearbyOrganizations(
        lat,
        lng,
        radiusKm,
        type,
        limit
      );
      res.json(results);
    } catch (err) {
      next(err);
    }
  }

  async getDoctorProfile(req, res, next) {
    try {
      const { id } = req.params;
      const profile = await healthcareSearchService.getDoctorProfile(id);
      res.json({
        success: true,
        data: profile,
      });
    } catch (err) {
      if (err.message?.includes('not found')) {
        return res.status(404).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async getDoctorAvailability(req, res, next) {
    try {
      const { id } = req.params;
      const { organizationId, date } = req.query;
      const availability = await healthcareSearchService.getDoctorAvailability(
        id,
        organizationId,
        date
      );
      res.json({
        success: true,
        data: availability,
      });
    } catch (err) {
      if (err.message?.includes('not found')) {
        return res.status(404).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async getDoctorAffiliations(req, res, next) {
    try {
      const { id } = req.params;
      const profile = await healthcareSearchService.getDoctorProfile(id);
      res.json({
        success: true,
        count: profile.activeAffiliations.length,
        data: profile.activeAffiliations,
      });
    } catch (err) {
      if (err.message?.includes('not found')) {
        return res.status(404).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async getOrganizationProfile(req, res, next) {
    try {
      const { id } = req.params;
      const profile = await healthcareSearchService.getOrganizationProfile(id);
      res.json({
        success: true,
        data: profile,
      });
    } catch (err) {
      if (err.message?.includes('not found')) {
        return res.status(404).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async getOrganizationDoctors(req, res, next) {
    try {
      const { id } = req.params;
      const doctors = await healthcareSearchService.getOrganizationDoctors(id);
      res.json(doctors);
    } catch (err) {
      if (err.message?.includes('not found')) {
        return res.status(404).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async getOrganizationSpecializations(req, res, next) {
    try {
      const { id } = req.params;
      const specs = await healthcareSearchService.getOrganizationSpecializations(id);
      res.json(specs);
    } catch (err) {
      if (err.message?.includes('not found')) {
        return res.status(404).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async getOrganizationCapabilities(req, res, next) {
    try {
      const { id } = req.params;
      const capabilities = await healthcareSearchService.getOrganizationCapabilities(id);
      res.json(capabilities);
    } catch (err) {
      if (err.message?.includes('not found')) {
        return res.status(404).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async getSearchHistory(req, res, next) {
    try {
      if (!req.user) {
        return res.json({ success: true, count: 0, data: [] });
      }
      const history = await healthcareSearchService.getSearchHistory(req.user._id);
      res.json({
        success: true,
        count: history.length,
        data: history,
      });
    } catch (err) {
      next(err);
    }
  }

  async recordSearchHistory(req, res, next) {
    try {
      const userId = req.user ? req.user._id : null;
      const entry = await healthcareSearchService.recordSearchHistory(userId, req.body || {});
      res.status(201).json({
        success: true,
        data: entry,
      });
    } catch (err) {
      next(err);
    }
  }

  async clearSearchHistory(req, res, next) {
    try {
      if (!req.user) {
        return res.json({ success: true, deletedCount: 0 });
      }
      const result = await healthcareSearchService.clearSearchHistory(req.user._id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getSavedProviders(req, res, next) {
    try {
      if (!req.user) {
        return res.json({ success: true, count: 0, data: [] });
      }
      const items = await healthcareSearchService.getSavedProviders(req.user._id);
      res.json({
        success: true,
        count: items.length,
        data: items,
      });
    } catch (err) {
      next(err);
    }
  }

  async saveProvider(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }
      const { providerType, providerId, notes } = req.body;
      if (!providerType || !providerId) {
        return res.status(400).json({
          success: false,
          message: 'providerType (DOCTOR or ORGANIZATION) and providerId are required.',
        });
      }
      const item = await healthcareSearchService.saveProvider(
        req.user._id,
        providerType,
        providerId,
        notes
      );
      res.status(201).json({
        success: true,
        message: 'Provider bookmarked successfully.',
        data: item,
      });
    } catch (err) {
      next(err);
    }
  }

  async removeSavedProvider(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }
      const { id } = req.params;
      const result = await healthcareSearchService.removeSavedProvider(req.user._id, id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getSearchMetadata(req, res, next) {
    try {
      const activeSpecs = await Specialization.find({ isActive: true })
        .sort({ name: 1 })
        .select('name category code')
        .lean()
        .exec();

      const defaultSpecs = [
        'Cardiology',
        'Neurology',
        'Pediatrics',
        'Orthopedics',
        'Ophthalmology',
        'General Medicine',
        'Emergency Medicine',
        'Obstetrics & Gynecology',
        'Dermatology',
        'Oncology',
        'Gastroenterology',
        'Pulmonology',
      ];

      const specializations = activeSpecs.length > 0 ? activeSpecs.map((s) => s.name) : defaultSpecs;

      const facilityTypes = [
        { key: 'hospital', label: 'Hospitals & Medical Centers' },
        { key: 'clinic', label: 'Outpatient Specialty Clinics' },
        { key: 'specialty_center', label: 'Super-Specialty Centers' },
      ];

      const capabilities = [
        'Level 1 Trauma',
        'Level 2 Trauma',
        'Emergency Department',
        'Adult ICU',
        'Pediatric ICU (PICU)',
        'Neonatal ICU (NICU)',
        'Cardiac Cath Lab',
        'MRI & CT Diagnostics',
        'Hemodialysis Unit',
        'Advanced Operation Theaters',
        '24/7 Stroke Unit',
        'Burn Care Unit',
      ];

      res.json({
        success: true,
        data: {
          specializations,
          facilityTypes,
          capabilities,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const healthcareSearchController = new HealthcareSearchController();


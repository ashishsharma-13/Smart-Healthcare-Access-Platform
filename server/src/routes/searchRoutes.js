import express from 'express';
import jwt from 'jsonwebtoken';
import { healthcareSearchController } from '../controllers/HealthcareSearchController.js';
import { authenticate } from '../middleware/auth.js';
import { userRepository } from '../repositories/UserRepository.js';
import { isTokenRevoked } from '../controllers/AuthController.js';

const router = express.Router();

const optionalAuthenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  try {
    const token = authHeader.split(' ')[1];
    if (!isTokenRevoked(token)) {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'shap_super_secret_jwt_key_2025_access_health'
      );
      const user = await userRepository.findById(decoded.id);
      if (user && user.isActive && user.status !== 'suspended') {
        req.user = user;
      }
    }
  } catch (err) {
    // Graceful fallback to unauthenticated guest search
  }
  next();
};

// Search discovery metadata
router.get('/metadata', (req, res, next) =>
  healthcareSearchController.getSearchMetadata(req, res, next)
);

// Doctor Search & Profiles
router.get('/doctors', optionalAuthenticate, (req, res, next) =>
  healthcareSearchController.searchDoctors(req, res, next)
);
router.get('/doctors/:id', (req, res, next) =>
  healthcareSearchController.getDoctorProfile(req, res, next)
);
router.get('/doctors/:id/availability', (req, res, next) =>
  healthcareSearchController.getDoctorAvailability(req, res, next)
);
router.get('/doctors/:id/affiliations', (req, res, next) =>
  healthcareSearchController.getDoctorAffiliations(req, res, next)
);

// Organization Search & Profiles
router.get('/organizations/nearby', (req, res, next) =>
  healthcareSearchController.getNearbyOrganizations(req, res, next)
);
router.get('/organizations', optionalAuthenticate, (req, res, next) =>
  healthcareSearchController.searchOrganizations(req, res, next)
);
router.get('/organizations/:id', (req, res, next) =>
  healthcareSearchController.getOrganizationProfile(req, res, next)
);
router.get('/organizations/:id/doctors', (req, res, next) =>
  healthcareSearchController.getOrganizationDoctors(req, res, next)
);
router.get('/organizations/:id/specializations', (req, res, next) =>
  healthcareSearchController.getOrganizationSpecializations(req, res, next)
);
router.get('/organizations/:id/capabilities', (req, res, next) =>
  healthcareSearchController.getOrganizationCapabilities(req, res, next)
);

// Search History
router.get('/history', optionalAuthenticate, (req, res, next) =>
  healthcareSearchController.getSearchHistory(req, res, next)
);
router.post('/history', optionalAuthenticate, (req, res, next) =>
  healthcareSearchController.recordSearchHistory(req, res, next)
);
router.delete('/history', authenticate, (req, res, next) =>
  healthcareSearchController.clearSearchHistory(req, res, next)
);

// Bookmarked / Saved Providers
router.get('/saved', authenticate, (req, res, next) =>
  healthcareSearchController.getSavedProviders(req, res, next)
);
router.post('/saved', authenticate, (req, res, next) =>
  healthcareSearchController.saveProvider(req, res, next)
);
router.delete('/saved/:id', authenticate, (req, res, next) =>
  healthcareSearchController.removeSavedProvider(req, res, next)
);

export default router;


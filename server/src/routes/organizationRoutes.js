import express from 'express';
import { organizationController } from '../controllers/OrganizationController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public discovery
router.get('/', (req, res, next) => organizationController.searchOrganizations(req, res, next));
router.get('/:id', (req, res, next) => organizationController.getOrganizationById(req, res, next));

// Authenticated organization portal endpoints
router.get('/portal/me', authenticate, authorize('organization'), (req, res, next) => organizationController.getMyOrganizationProfile(req, res, next));
router.get('/portal/qr-code', authenticate, authorize('organization'), (req, res, next) => organizationController.getQrCheckinCode(req, res, next));
router.put('/portal/resources', authenticate, authorize('organization'), (req, res, next) => organizationController.updateResources(req, res, next));
router.get('/portal/broadcasts', authenticate, authorize('organization'), (req, res, next) => organizationController.getIncomingEmergencyBroadcasts(req, res, next));

export default router;


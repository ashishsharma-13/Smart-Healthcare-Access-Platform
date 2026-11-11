import express from 'express';
import { organizationController } from '../controllers/OrganizationController.js';
import { doctorAffiliationController } from '../controllers/DoctorAffiliationController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public discovery
router.get('/', (req, res, next) => organizationController.searchOrganizations(req, res, next));

// Authenticated organization portal endpoints (must be before /:id)
router.get('/portal/me', authenticate, authorize('organization'), (req, res, next) => organizationController.getMyOrganizationProfile(req, res, next));
router.put('/portal/address', authenticate, authorize('organization'), (req, res, next) => organizationController.updateOrganizationAddress(req, res, next));
router.get('/portal/qr-code', authenticate, authorize('organization'), (req, res, next) => organizationController.getQrCheckinCode(req, res, next));
router.put('/portal/resources', authenticate, authorize('organization'), (req, res, next) => organizationController.updateResources(req, res, next));
router.get('/portal/broadcasts', authenticate, authorize('organization'), (req, res, next) => organizationController.getIncomingEmergencyBroadcasts(req, res, next));
router.get('/portal/doctors', authenticate, authorize('organization'), (req, res, next) => doctorAffiliationController.getOrganizationAffiliations(req, res, next));

// Organization Doctor Affiliation Module endpoints
router.get('/affiliations', authenticate, authorize('organization'), (req, res, next) => doctorAffiliationController.getOrganizationAffiliations(req, res, next));
router.get('/affiliations/pending', authenticate, authorize('organization'), (req, res, next) => doctorAffiliationController.getPendingAffiliationsForOrg(req, res, next));
router.get('/doctors/search', authenticate, authorize('organization'), (req, res, next) => doctorAffiliationController.searchDoctorsForOrg(req, res, next));
router.get('/doctors', authenticate, authorize('organization'), (req, res, next) => doctorAffiliationController.getOrganizationAffiliations(req, res, next));
router.post('/affiliations/invite', authenticate, authorize('organization'), (req, res, next) => doctorAffiliationController.inviteDoctor(req, res, next));
router.post('/affiliations/:id/approve', authenticate, authorize('organization'), (req, res, next) => doctorAffiliationController.approveAffiliation(req, res, next));
router.post('/affiliations/:id/reject', authenticate, authorize('organization'), (req, res, next) => doctorAffiliationController.rejectAffiliation(req, res, next));
router.post('/affiliations/:id/terminate', authenticate, authorize('organization'), (req, res, next) => doctorAffiliationController.requestTerminationByOrg(req, res, next));

// Public parameterized routes
router.get('/:id/doctors', (req, res, next) => doctorAffiliationController.getAffiliatedDoctorsForOrg(req, res, next));
router.get('/:id', (req, res, next) => organizationController.getOrganizationById(req, res, next));

export default router;

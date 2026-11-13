import express from 'express';
import authRoutes from './authRoutes.js';
import doctorRoutes from './doctorRoutes.js';
import organizationRoutes from './organizationRoutes.js';
import appointmentRoutes from './appointmentRoutes.js';
import emergencyRoutes from './emergencyRoutes.js';
import adminRoutes from './adminRoutes.js';
import matchingRoutes from './matchingRoutes.js';
import emergencyBeepRoutes from './emergencyBeepRoutes.js';
import emergencyFallbackRoutes from './emergencyFallbackRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import { internalReservationRoutes, emergencyDestinationRoutes, organizationReservationRoutes } from './destinationReservationRoutes.js';
import { healthcareResourceTypeController } from '../controllers/HealthcareResourceTypeController.js';
import { healthcareResourceController } from '../controllers/HealthcareResourceController.js';
import { doctorAffiliationController } from '../controllers/DoctorAffiliationController.js';
import { authenticate, authorize } from '../middleware/auth.js';

// Dedicated Doctor Affiliation sub-router
export const doctorAffiliationRoutes = express.Router();
doctorAffiliationRoutes.get('/', authenticate, authorize('doctor'), (req, res, next) => doctorAffiliationController.getDoctorAffiliations(req, res, next));
doctorAffiliationRoutes.post('/', authenticate, authorize('doctor'), (req, res, next) => doctorAffiliationController.requestAffiliation(req, res, next));
doctorAffiliationRoutes.get('/organizations/search', authenticate, authorize('doctor'), (req, res, next) => doctorAffiliationController.searchOrganizations(req, res, next));
doctorAffiliationRoutes.get('/search-organizations', authenticate, authorize('doctor'), (req, res, next) => doctorAffiliationController.searchOrganizations(req, res, next));
doctorAffiliationRoutes.post('/:id/accept', authenticate, authorize('doctor'), (req, res, next) => doctorAffiliationController.acceptInvitation(req, res, next));
doctorAffiliationRoutes.post('/:id/decline', authenticate, authorize('doctor'), (req, res, next) => doctorAffiliationController.declineInvitation(req, res, next));
doctorAffiliationRoutes.post('/:id/terminate', authenticate, authorize('doctor'), (req, res, next) => doctorAffiliationController.requestTerminationByDoctor(req, res, next));

// Dedicated Organization Affiliation sub-router
export const organizationAffiliationRoutes = express.Router();
organizationAffiliationRoutes.get('/', authenticate, authorize('organization'), (req, res, next) => doctorAffiliationController.getOrganizationAffiliations(req, res, next));
organizationAffiliationRoutes.get('/pending', authenticate, authorize('organization'), (req, res, next) => doctorAffiliationController.getPendingAffiliationsForOrg(req, res, next));
organizationAffiliationRoutes.get('/doctors/search', authenticate, authorize('organization'), (req, res, next) => doctorAffiliationController.searchDoctorsForOrg(req, res, next));
organizationAffiliationRoutes.get('/search-doctors', authenticate, authorize('organization'), (req, res, next) => doctorAffiliationController.searchDoctorsForOrg(req, res, next));
organizationAffiliationRoutes.post('/invite', authenticate, authorize('organization'), (req, res, next) => doctorAffiliationController.inviteDoctor(req, res, next));
organizationAffiliationRoutes.post('/:id/approve', authenticate, authorize('organization'), (req, res, next) => doctorAffiliationController.approveAffiliation(req, res, next));
organizationAffiliationRoutes.post('/:id/reject', authenticate, authorize('organization'), (req, res, next) => doctorAffiliationController.rejectAffiliation(req, res, next));
organizationAffiliationRoutes.post('/:id/terminate', authenticate, authorize('organization'), (req, res, next) => doctorAffiliationController.requestTerminationByOrg(req, res, next));

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    platform: 'SHAP (Smart Healthcare Access Platform)',
    timestamp: new Date(),
    architecture: 'Layered Architecture (Presentation, Business Logic, Data Access, Database)',
  });
});

router.use('/auth', authRoutes);
router.use('/doctor/affiliations', doctorAffiliationRoutes);
router.use('/doctors/affiliations', doctorAffiliationRoutes);
router.use('/doctors', doctorRoutes);
router.use('/doctor', doctorRoutes);
router.use('/organization/affiliations', organizationAffiliationRoutes);
router.use('/organizations/affiliations', organizationAffiliationRoutes);
router.use('/organizations', organizationRoutes);
router.use('/organization', organizationRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/emergency', emergencyRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/internal/emergency-matching', matchingRoutes);
router.use('/emergency-matching', matchingRoutes);
router.use('/internal/emergency-beep', emergencyBeepRoutes);
router.use('/emergency-beep', emergencyBeepRoutes);
router.use('/internal/emergency-fallback', emergencyFallbackRoutes);
router.use('/emergency-fallback', emergencyFallbackRoutes);
router.use('/internal/reservations', internalReservationRoutes);
router.use('/reservations', internalReservationRoutes);

// Module 14: Public Resource Types & Internal Resource Operations
router.get('/resource-types', (req, res, next) => healthcareResourceTypeController.listActive(req, res, next));
router.get('/internal/organizations/:organizationId/resources', (req, res, next) => healthcareResourceController.getInternalOrgResources(req, res, next));
router.get('/internal/resources/:resourceId/availability', (req, res, next) => healthcareResourceController.getInternalResourceAvailability(req, res, next));
router.post('/internal/resources/:resourceId/reconcile', (req, res, next) => healthcareResourceController.reconcileResource(req, res, next));

export default router;

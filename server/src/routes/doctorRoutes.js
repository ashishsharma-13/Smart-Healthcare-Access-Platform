import express from 'express';
import { doctorController } from '../controllers/DoctorController.js';
import { doctorAffiliationController } from '../controllers/DoctorAffiliationController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public doctor discovery (verified doctors only)
router.get('/', (req, res, next) => doctorController.searchDoctors(req, res, next));

// Public doctor registration
router.post('/register', (req, res, next) => doctorController.registerDoctor(req, res, next));

// Authenticated doctor profile, verification & credentials endpoints (must be defined BEFORE parameterized /:id)
router.get('/me', authenticate, authorize('doctor'), (req, res, next) => doctorController.getMyDoctorProfile(req, res, next));
router.put('/me', authenticate, authorize('doctor'), (req, res, next) => doctorController.updateMyDoctorProfile(req, res, next));
router.post('/me/documents', authenticate, authorize('doctor'), (req, res, next) => doctorController.uploadDocument(req, res, next));
router.get('/me/verification', authenticate, authorize('doctor'), (req, res, next) => doctorController.getVerificationStatus(req, res, next));
router.post('/me/resubmit', authenticate, authorize('doctor'), (req, res, next) => doctorController.resubmitApplication(req, res, next));
router.get('/me/credentials', authenticate, authorize('doctor'), (req, res, next) => doctorController.getCredentials(req, res, next));
router.post('/me/credentials/reissue', authenticate, authorize('doctor'), (req, res, next) => doctorController.reissueCredential(req, res, next));
router.get('/qr-credential', authenticate, authorize('doctor'), (req, res, next) => doctorController.getQrCredential(req, res, next));
router.post('/presence/check-in', authenticate, authorize('doctor'), (req, res, next) => doctorController.checkIn(req, res, next));
router.post('/presence/check-out', authenticate, authorize('doctor'), (req, res, next) => doctorController.checkOut(req, res, next));
router.put('/availability', authenticate, authorize('doctor'), (req, res, next) => doctorController.updateAvailability(req, res, next));
router.get('/presence/history', authenticate, authorize('doctor'), (req, res, next) => doctorController.getPresenceHistory(req, res, next));

// Doctor Affiliation Module endpoints (Module 4 standards, must be defined BEFORE parameterized /:id)
router.get('/me/affiliation-requests', authenticate, authorize('doctor'), (req, res, next) => doctorAffiliationController.getDoctorIncomingRequests(req, res, next));
router.post('/me/affiliation-requests/:id/accept', authenticate, authorize('doctor'), (req, res, next) => doctorAffiliationController.acceptAffiliationRequest(req, res, next));
router.post('/me/affiliation-requests/:id/reject', authenticate, authorize('doctor'), (req, res, next) => doctorAffiliationController.rejectAffiliationRequest(req, res, next));
router.get('/me/affiliations', authenticate, authorize('doctor'), (req, res, next) => doctorAffiliationController.getDoctorAffiliations(req, res, next));
router.post('/me/affiliations/:id/terminate', authenticate, authorize('doctor'), (req, res, next) => doctorAffiliationController.terminateAffiliationDirectly(req, res, next));

// Doctor Affiliation Module legacy/backwards compatible endpoints
router.get('/affiliations', authenticate, authorize('doctor'), (req, res, next) => doctorAffiliationController.getDoctorAffiliations(req, res, next));
router.get('/affiliation', authenticate, authorize('doctor'), (req, res, next) => doctorAffiliationController.getDoctorAffiliations(req, res, next));
router.post('/affiliations', authenticate, authorize('doctor'), (req, res, next) => doctorAffiliationController.requestAffiliation(req, res, next));
router.get('/organizations/search', authenticate, authorize('doctor'), (req, res, next) => doctorAffiliationController.searchOrganizations(req, res, next));
router.post('/affiliations/:id/accept', authenticate, authorize('doctor'), (req, res, next) => doctorAffiliationController.acceptInvitation(req, res, next));
router.post('/affiliations/:id/decline', authenticate, authorize('doctor'), (req, res, next) => doctorAffiliationController.declineInvitation(req, res, next));
router.post('/affiliations/:id/terminate', authenticate, authorize('doctor'), (req, res, next) => doctorAffiliationController.requestTerminationByDoctor(req, res, next));

// Public parameterized routes (must come AFTER specific static endpoints)
router.get('/profile/:id', (req, res, next) => doctorController.getDoctorById(req, res, next));
router.get('/:id/organizations', (req, res, next) => doctorAffiliationController.getAffiliatedOrgsForDoctor(req, res, next));
router.get('/:id', (req, res, next) => doctorController.getDoctorById(req, res, next));

export default router;

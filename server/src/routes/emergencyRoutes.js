import express from 'express';
import { emergencyController } from '../controllers/EmergencyController.js';
import { emergencyBeepController } from '../controllers/EmergencyBeepController.js';
import { destinationReservationController } from '../controllers/DestinationReservationController.js';
import { emergencyJourneyController } from '../controllers/EmergencyJourneyController.js';
import { emergencyFallbackController } from '../controllers/EmergencyFallbackController.js';
import { patientProfileController } from '../controllers/PatientProfileController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// --- MODULE 8: EMERGENCY CATEGORIES & GUIDANCE ---
router.get('/categories', (req, res, next) => emergencyController.getCategories(req, res, next));
router.get('/guidance/:categoryId', (req, res, next) => emergencyController.getGuidance(req, res, next));
router.get('/profile-summary', authenticate, (req, res, next) => patientProfileController.getPreflightEmergencySummary(req, res, next));

// --- MODULE 8: EMERGENCY REQUEST CREATION & MANAGEMENT ---
router.post('/requests', authenticate, (req, res, next) => emergencyController.createEmergencyRequest(req, res, next));
router.get('/requests/my', authenticate, (req, res, next) => emergencyController.getMyEmergencyRequests(req, res, next));
router.get('/requests/:id', authenticate, (req, res, next) => emergencyController.getEmergencyRequestDetails(req, res, next));
router.post('/requests/:id/cancel', authenticate, (req, res, next) => emergencyController.cancelEmergencyRequest(req, res, next));

// --- MODULE 18: EMERGENCY MEDICAL SNAPSHOT & SUMMARY ---
router.post('/requests/:id/medical-snapshot', authenticate, (req, res, next) => patientProfileController.createEmergencyMedicalSnapshot(req, res, next));
router.get('/requests/:id/medical-summary', authenticate, (req, res, next) => patientProfileController.getEmergencyMedicalSummary(req, res, next));

// --- MODULE 10: EMERGENCY BEEP PATIENT RESPONSES & BROADCAST STATUS ---
router.get('/requests/:id/responses', authenticate, (req, res, next) => emergencyBeepController.getPatientResponses(req, res, next));
router.get('/requests/:id/broadcast-status', authenticate, (req, res, next) => emergencyBeepController.getPatientBroadcastStatus(req, res, next));

// --- MODULE 11: EMERGENCY DESTINATION SELECTION & RESOURCE RESERVATION ---
router.get('/requests/:requestId/accepted-organizations', authenticate, (req, res, next) => destinationReservationController.getAcceptedOrganizations(req, res, next));
router.get('/requests/:requestId/recommendation', authenticate, (req, res, next) => destinationReservationController.getRecommendation(req, res, next));
router.post('/requests/:requestId/select-destination', authenticate, (req, res, next) => destinationReservationController.selectDestination(req, res, next));
router.get('/requests/:requestId/destination', authenticate, (req, res, next) => destinationReservationController.getDestination(req, res, next));
router.get('/requests/:requestId/reservation', authenticate, (req, res, next) => destinationReservationController.getReservation(req, res, next));
router.post('/requests/:requestId/confirm-en-route', authenticate, (req, res, next) => destinationReservationController.confirmEnRoute(req, res, next));

// --- MODULE 12: EMERGENCY JOURNEY TRACKING, NAVIGATION, ARRIVAL, COMPLETION & HISTORY ---
router.post('/requests/:requestId/journey/start', authenticate, (req, res) => emergencyJourneyController.startJourney(req, res));
router.get('/requests/:requestId/journey', authenticate, (req, res) => emergencyJourneyController.getJourney(req, res));
router.post('/requests/:requestId/journey/location', authenticate, (req, res) => emergencyJourneyController.recordLocationUpdate(req, res));
router.get('/requests/:requestId/journey/location', authenticate, (req, res) => emergencyJourneyController.getLatestLocation(req, res));
router.post('/requests/:requestId/journey/stop-sharing', authenticate, (req, res) => emergencyJourneyController.stopLocationSharing(req, res));
router.post('/requests/:requestId/journey/confirm-arrival', authenticate, (req, res) => emergencyJourneyController.confirmPatientArrival(req, res));
router.post('/requests/:requestId/complete', authenticate, (req, res) => emergencyJourneyController.completeEmergency(req, res));
router.get('/requests/:requestId/history', authenticate, (req, res) => emergencyJourneyController.getEmergencyHistory(req, res));

// --- MODULE 15: EMERGENCY FALLBACK & RECOVERY MANAGEMENT ---
router.get('/requests/:requestId/external-facilities', (req, res, next) => emergencyFallbackController.getExternalFacilities(req, res, next));
router.get('/external-facilities/:facilityId', (req, res, next) => emergencyFallbackController.getExternalFacilityById(req, res, next));
router.get('/requests/:requestId/fallback-options', (req, res, next) => emergencyFallbackController.getFallbackOptions(req, res, next));
router.post('/requests/:requestId/select-external-facility', authenticate, (req, res, next) => emergencyFallbackController.selectExternalFacility(req, res, next));
router.post('/requests/:requestId/retry-matching', authenticate, (req, res, next) => emergencyFallbackController.retryMatching(req, res, next));
router.post('/requests/:requestId/change-destination', authenticate, (req, res, next) => emergencyFallbackController.changeDestination(req, res, next));
router.get('/requests/:requestId/recovery-status', (req, res, next) => emergencyFallbackController.getRecoveryStatus(req, res, next));

// Query nearby emergency-enabled facilities and their offerings
router.get('/nearby-facilities', (req, res, next) => emergencyController.getNearbyFacilities(req, res, next));

// Patient dispatches Emergency Beep to chosen hospital(s)
router.post('/dispatch', authenticate, (req, res, next) => emergencyController.dispatchEmergency(req, res, next));

// Patient creates Emergency Beep (parallel blast compatibility)
router.post('/beep', authenticate, (req, res, next) => emergencyController.activateEmergencyBeep(req, res, next));

// Hospital fetches incoming active emergency broadcasts (must be placed before /:id)
router.get('/incoming', authenticate, (req, res, next) => emergencyController.getIncomingForOrganization(req, res, next));

// List emergencies for current user / admin
router.get('/user/history', authenticate, (req, res, next) => emergencyController.listMyEmergencies(req, res, next));

// View details / live responses
router.get('/:id', (req, res, next) => emergencyController.getEmergencyDetails(req, res, next));
router.get('/:id/responses', (req, res, next) => emergencyController.getResponses(req, res, next));

// Organization responds: ACCEPT / DECLINE
router.post('/:id/respond', authenticate, authorize('organization'), (req, res, next) => emergencyController.respondToBroadcast(req, res, next));

// Patient selects destination hospital among the accepted facilities
router.post('/:id/select-destination', authenticate, (req, res, next) => emergencyController.selectDestination(req, res, next));

// Organization gives final confirmation & triggers temporary resource reservation
router.post('/:id/confirm-reservation', authenticate, authorize('organization'), (req, res, next) => emergencyController.confirmAndReserve(req, res, next));

// Tracking actions
router.post('/:id/en-route', authenticate, (req, res, next) => emergencyController.markPatientEnRoute(req, res, next));
router.post('/:id/arrived', authenticate, authorize('organization'), (req, res, next) => emergencyController.markPatientArrived(req, res, next));
router.post('/:id/cancel', authenticate, (req, res, next) => emergencyController.cancelEmergency(req, res, next));

export default router;

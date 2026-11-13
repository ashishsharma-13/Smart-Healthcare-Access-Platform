import express from 'express';
import { emergencyJourneyController } from '../controllers/EmergencyJourneyController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// ── PATIENT JOURNEY & NAVIGATION (Prefix: /api/emergency/requests) ───────────
export const patientJourneyRoutes = express.Router();

// Start Journey (valid reservation required)
patientJourneyRoutes.post('/:requestId/journey/start', authenticate, (req, res) =>
  emergencyJourneyController.startJourney(req, res)
);

// Get Journey details & telemetry
patientJourneyRoutes.get('/:requestId/journey', authenticate, (req, res) =>
  emergencyJourneyController.getJourney(req, res)
);

// Record live location update (permission-controlled, rate-limited)
patientJourneyRoutes.post('/:requestId/journey/location', authenticate, (req, res) =>
  emergencyJourneyController.recordLocationUpdate(req, res)
);

// Get latest location & status
patientJourneyRoutes.get('/:requestId/journey/location', authenticate, (req, res) =>
  emergencyJourneyController.getLatestLocation(req, res)
);

// Stop location sharing
patientJourneyRoutes.post('/:requestId/journey/stop-sharing', authenticate, (req, res) =>
  emergencyJourneyController.stopLocationSharing(req, res)
);

// Confirm patient arrival (explicit confirmation)
patientJourneyRoutes.post('/:requestId/journey/confirm-arrival', authenticate, (req, res) =>
  emergencyJourneyController.confirmPatientArrival(req, res)
);

// Complete emergency coordination workflow
patientJourneyRoutes.post('/:requestId/complete', authenticate, (req, res) =>
  emergencyJourneyController.completeEmergency(req, res)
);

// Comprehensive Emergency History (aggregated audit trail)
patientJourneyRoutes.get('/:requestId/history', authenticate, (req, res) =>
  emergencyJourneyController.getEmergencyHistory(req, res)
);

// ── ORGANIZATION INCOMING PATIENTS & ALLOCATION (Prefix: /api/organizations/me) ─
export const organizationJourneyRoutes = express.Router();

// Incoming en-route patients dashboard
organizationJourneyRoutes.get('/incoming-patients', authenticate, authorize('organization'), (req, res) =>
  emergencyJourneyController.getIncomingPatients(req, res)
);

// Incoming patient detailed journey telemetry
organizationJourneyRoutes.get('/incoming-patients/:requestId', authenticate, authorize('organization'), (req, res) =>
  emergencyJourneyController.getIncomingPatientDetails(req, res)
);

// Verify arrival at reception (staff verification / QR scan)
organizationJourneyRoutes.post('/emergency-requests/:requestId/verify-arrival', authenticate, authorize('organization'), (req, res) =>
  emergencyJourneyController.verifyStaffArrival(req, res)
);

// Allocate reserved resources (transitions reservedCapacity -> occupiedCapacity)
organizationJourneyRoutes.post('/reservations/:reservationId/allocate', authenticate, authorize('organization'), (req, res) =>
  emergencyJourneyController.allocateResource(req, res)
);

// List resource allocations for reservation
organizationJourneyRoutes.get('/reservations/:reservationId/allocations', authenticate, authorize('organization'), (req, res) =>
  emergencyJourneyController.getAllocations(req, res)
);

// Complete emergency coordination workflow from organization side
organizationJourneyRoutes.post('/emergency-requests/:requestId/complete', authenticate, authorize('organization'), (req, res) =>
  emergencyJourneyController.completeEmergency(req, res)
);

export default router;


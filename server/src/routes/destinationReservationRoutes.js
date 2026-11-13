import express from 'express';
import { destinationReservationController } from '../controllers/DestinationReservationController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// ── PATIENT DESTINATION WORKFLOW ROUTES ─────────────────────────────────────
// Prefix: /api/emergency/requests
export const emergencyDestinationRoutes = express.Router();

emergencyDestinationRoutes.get('/:requestId/accepted-organizations', authenticate, (req, res, next) =>
  destinationReservationController.getAcceptedOrganizations(req, res, next)
);

emergencyDestinationRoutes.get('/:requestId/recommendation', authenticate, (req, res, next) =>
  destinationReservationController.getRecommendation(req, res, next)
);

emergencyDestinationRoutes.post('/:requestId/select-destination', authenticate, (req, res, next) =>
  destinationReservationController.selectDestination(req, res, next)
);

emergencyDestinationRoutes.get('/:requestId/destination', authenticate, (req, res, next) =>
  destinationReservationController.getDestination(req, res, next)
);

emergencyDestinationRoutes.get('/:requestId/reservation', authenticate, (req, res, next) =>
  destinationReservationController.getReservation(req, res, next)
);

emergencyDestinationRoutes.post('/:requestId/confirm-en-route', authenticate, (req, res, next) =>
  destinationReservationController.confirmEnRoute(req, res, next)
);

// ── ORGANIZATION CONFIRMATION & RESERVATION ROUTES ──────────────────────────
// Prefix: /api/organizations/me
export const organizationReservationRoutes = express.Router();

organizationReservationRoutes.get('/destination-confirmations', authenticate, authorize('organization'), (req, res, next) =>
  destinationReservationController.getOrgDestinationConfirmations(req, res, next)
);

organizationReservationRoutes.get('/destination-confirmations/:selectionId', authenticate, authorize('organization'), (req, res, next) =>
  destinationReservationController.getOrgDestinationConfirmationDetails(req, res, next)
);

organizationReservationRoutes.post('/destination-confirmations/:selectionId/confirm', authenticate, authorize('organization'), (req, res, next) =>
  destinationReservationController.confirmDestination(req, res, next)
);

organizationReservationRoutes.post('/destination-confirmations/:selectionId/decline', authenticate, authorize('organization'), (req, res, next) =>
  destinationReservationController.declineDestination(req, res, next)
);

organizationReservationRoutes.get('/reservations', authenticate, authorize('organization'), (req, res, next) =>
  destinationReservationController.getOrgReservations(req, res, next)
);

organizationReservationRoutes.get('/reservations/:reservationId', authenticate, authorize('organization'), (req, res, next) =>
  destinationReservationController.getOrgReservationDetails(req, res, next)
);

organizationReservationRoutes.post('/reservations/:reservationId/mark-arrived', authenticate, authorize('organization'), (req, res, next) =>
  destinationReservationController.markPatientArrived(req, res, next)
);

organizationReservationRoutes.post('/reservations/:reservationId/allocate', authenticate, authorize('organization'), (req, res, next) =>
  destinationReservationController.allocateReservation(req, res, next)
);

// ── INTERNAL RESERVATIONS ROUTES ────────────────────────────────────────────
// Prefix: /api/internal/reservations
export const internalReservationRoutes = express.Router();

internalReservationRoutes.post('/:selectionId/create', (req, res, next) =>
  destinationReservationController.internalCreateReservation(req, res, next)
);

internalReservationRoutes.post('/:reservationId/expire', (req, res, next) =>
  destinationReservationController.internalExpireReservation(req, res, next)
);

internalReservationRoutes.post('/:reservationId/release', (req, res, next) =>
  destinationReservationController.internalReleaseReservation(req, res, next)
);

export default router;


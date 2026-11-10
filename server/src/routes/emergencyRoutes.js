import express from 'express';
import { emergencyController } from '../controllers/EmergencyController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Patient creates Emergency Beep
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

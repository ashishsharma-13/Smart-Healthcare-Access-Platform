import express from 'express';
import { doctorController } from '../controllers/DoctorController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public doctor discovery (verified doctors only)
router.get('/', (req, res, next) => doctorController.searchDoctors(req, res, next));
router.get('/profile/:id', (req, res, next) => doctorController.getDoctorById(req, res, next));

// Authenticated doctor endpoints
router.get('/me', authenticate, authorize('doctor'), (req, res, next) => doctorController.getMyDoctorProfile(req, res, next));
router.get('/qr-credential', authenticate, authorize('doctor'), (req, res, next) => doctorController.getQrCredential(req, res, next));
router.post('/presence/check-in', authenticate, authorize('doctor'), (req, res, next) => doctorController.checkIn(req, res, next));
router.post('/presence/check-out', authenticate, authorize('doctor'), (req, res, next) => doctorController.checkOut(req, res, next));
router.put('/availability', authenticate, authorize('doctor'), (req, res, next) => doctorController.updateAvailability(req, res, next));
router.get('/presence/history', authenticate, authorize('doctor'), (req, res, next) => doctorController.getPresenceHistory(req, res, next));

export default router;


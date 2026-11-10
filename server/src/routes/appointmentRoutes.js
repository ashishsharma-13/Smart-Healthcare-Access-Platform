import express from 'express';
import { appointmentController } from '../controllers/AppointmentController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/slots/:doctorId', (req, res, next) => appointmentController.getAvailableSlots(req, res, next));
router.post('/book', authenticate, (req, res, next) => appointmentController.bookAppointment(req, res, next));
router.get('/my', authenticate, (req, res, next) => appointmentController.getMyAppointments(req, res, next));
router.get('/:id', authenticate, (req, res, next) => appointmentController.getAppointmentById(req, res, next));
router.put('/:id/reschedule', authenticate, (req, res, next) => appointmentController.rescheduleAppointment(req, res, next));
router.put('/:id/cancel', authenticate, (req, res, next) => appointmentController.cancelAppointment(req, res, next));

export default router;


import express from 'express';
import { appointmentController } from '../controllers/AppointmentController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/slots/:doctorId', (req, res, next) => appointmentController.getAvailableSlots(req, res, next));
router.post('/book', authenticate, (req, res, next) => appointmentController.bookAppointment(req, res, next));
router.get('/my', authenticate, (req, res, next) => appointmentController.getMyAppointments(req, res, next));
router.get('/:id', authenticate, (req, res, next) => appointmentController.getAppointmentById(req, res, next));

// Reschedule appointment - supports PUT, PATCH, and POST
router.put('/:id/reschedule', authenticate, (req, res, next) => appointmentController.rescheduleAppointment(req, res, next));
router.patch('/:id/reschedule', authenticate, (req, res, next) => appointmentController.rescheduleAppointment(req, res, next));
router.post('/:id/reschedule', authenticate, (req, res, next) => appointmentController.rescheduleAppointment(req, res, next));

// Cancel appointment - supports PUT, PATCH, and POST
router.put('/:id/cancel', authenticate, (req, res, next) => appointmentController.cancelAppointment(req, res, next));
router.patch('/:id/cancel', authenticate, (req, res, next) => appointmentController.cancelAppointment(req, res, next));
router.post('/:id/cancel', authenticate, (req, res, next) => appointmentController.cancelAppointment(req, res, next));

// Complete appointment - supports POST and PUT
router.post('/:id/complete', authenticate, (req, res, next) => appointmentController.completeAppointment(req, res, next));
router.put('/:id/complete', authenticate, (req, res, next) => appointmentController.completeAppointment(req, res, next));

export default router;

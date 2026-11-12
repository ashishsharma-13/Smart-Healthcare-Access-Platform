import express from 'express';
import { appointmentController } from '../controllers/AppointmentController.js';
import { doctorScheduleController } from '../controllers/DoctorScheduleController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Module 5 & 6 standards exact endpoints
router.get('/available-slots', (req, res, next) => doctorScheduleController.getAvailableSlots(req, res, next));
router.get('/slots/:doctorId', (req, res, next) => appointmentController.getAvailableSlots(req, res, next));
router.post('/book', authenticate, (req, res, next) => appointmentController.bookAppointment(req, res, next));
router.post('/', authenticate, (req, res, next) => appointmentController.bookAppointment(req, res, next));
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

// No-Show appointment - supports POST and PUT
router.post('/:id/no-show', authenticate, (req, res, next) => appointmentController.markNoShow(req, res, next));
router.put('/:id/no-show', authenticate, (req, res, next) => appointmentController.markNoShow(req, res, next));

export default router;

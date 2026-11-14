import express from 'express';
import { feedbackController } from '../controllers/FeedbackController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Protected: Patient submits feedback for completed visit/treatment
router.post('/', authenticate, (req, res, next) => feedbackController.submitFeedback(req, res, next));

// Protected: Patient gets their submitted feedbacks
router.get('/my', authenticate, (req, res, next) => feedbackController.getMyFeedbacks(req, res, next));

// Protected: Check if feedback has already been submitted for a target visit
router.get('/check/:type/:id', authenticate, (req, res, next) => feedbackController.checkFeedbackStatus(req, res, next));

// Public / Authenticated: Hospital / Clinic reviews
router.get('/organization/:orgId', (req, res, next) => feedbackController.getOrganizationFeedbacks(req, res, next));

// Public / Authenticated: Doctor reviews
router.get('/doctor/:doctorId', (req, res, next) => feedbackController.getDoctorFeedbacks(req, res, next));

export default router;

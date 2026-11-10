import express from 'express';
import { adminController } from '../controllers/AdminController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/stats', (req, res, next) => adminController.getDashboardStats(req, res, next));
router.get('/doctors/pending', (req, res, next) => adminController.getPendingDoctors(req, res, next));
router.post('/doctors/:id/approve', (req, res, next) => adminController.approveDoctor(req, res, next));
router.post('/doctors/:id/reject', (req, res, next) => adminController.rejectDoctor(req, res, next));
router.get('/organizations/pending', (req, res, next) => adminController.getPendingOrganizations(req, res, next));
router.post('/organizations/:id/approve', (req, res, next) => adminController.approveOrganization(req, res, next));
router.post('/organizations/:id/reject', (req, res, next) => adminController.rejectOrganization(req, res, next));

export default router;


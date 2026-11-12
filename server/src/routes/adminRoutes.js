import express from 'express';
import { adminController } from '../controllers/AdminController.js';
import { doctorAffiliationController } from '../controllers/DoctorAffiliationController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/stats', (req, res, next) => adminController.getDashboardStats(req, res, next));
router.get('/doctors/pending', (req, res, next) => adminController.getPendingDoctors(req, res, next));
router.get('/doctors/verified', (req, res, next) => adminController.getVerifiedDoctors(req, res, next));
router.get('/doctors/rejected', (req, res, next) => adminController.getRejectedDoctors(req, res, next));
router.get('/doctors/:id', (req, res, next) => adminController.getDoctorApplication(req, res, next));
router.post('/doctors/:id/approve', (req, res, next) => adminController.approveDoctor(req, res, next));
router.post('/doctors/:id/reject', (req, res, next) => adminController.rejectDoctor(req, res, next));
router.post('/doctors/:id/credentials/reissue', (req, res, next) => adminController.reissueDoctorCredential(req, res, next));
router.get('/organizations/pending', (req, res, next) => adminController.getPendingOrganizations(req, res, next));
router.get('/organizations/verified', (req, res, next) => adminController.getVerifiedOrganizations(req, res, next));
router.get('/organizations/rejected', (req, res, next) => adminController.getRejectedOrganizations(req, res, next));
router.get('/organizations/:id', (req, res, next) => adminController.getOrganizationDetails(req, res, next));
router.post('/organizations/:id/approve', (req, res, next) => adminController.approveOrganization(req, res, next));
router.post('/organizations/:id/reject', (req, res, next) => adminController.rejectOrganization(req, res, next));

// Module 4: Admin overview of doctor affiliations
router.get('/affiliations', (req, res, next) => doctorAffiliationController.getAdminAffiliations(req, res, next));

export default router;


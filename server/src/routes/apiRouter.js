import express from 'express';
import authRoutes from './authRoutes.js';
import doctorRoutes from './doctorRoutes.js';
import organizationRoutes from './organizationRoutes.js';
import appointmentRoutes from './appointmentRoutes.js';
import emergencyRoutes from './emergencyRoutes.js';
import adminRoutes from './adminRoutes.js';

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    platform: 'SHAP (Smart Healthcare Access Platform)',
    timestamp: new Date(),
    architecture: 'Layered Architecture (Presentation, Business Logic, Data Access, Database)',
  });
});

router.use('/auth', authRoutes);
router.use('/doctors', doctorRoutes);
router.use('/organizations', organizationRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/emergency', emergencyRoutes);
router.use('/admin', adminRoutes);

export default router;


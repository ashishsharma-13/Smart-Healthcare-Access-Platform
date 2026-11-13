import express from 'express';
import { emergencyMatchingController } from '../controllers/EmergencyMatchingController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Internal matching triggers (authenticated — patient or admin)
router.post('/:requestId/evaluate', authenticate, (req, res, next) =>
  emergencyMatchingController.evaluate(req, res, next)
);
router.get('/:requestId/results', authenticate, (req, res, next) =>
  emergencyMatchingController.getResults(req, res, next)
);
router.post('/:requestId/refresh', authenticate, authorize('admin'), (req, res, next) =>
  emergencyMatchingController.refresh(req, res, next)
);
router.get('/:requestId/status', authenticate, (req, res, next) =>
  emergencyMatchingController.getStatus(req, res, next)
);

export default router;


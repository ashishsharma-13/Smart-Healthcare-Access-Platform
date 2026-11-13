import express from 'express';
import { emergencyBeepController } from '../controllers/EmergencyBeepController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Internal & Dispatcher endpoints
router.post('/:requestId/broadcast', authenticate, (req, res, next) =>
  emergencyBeepController.broadcast(req, res, next)
);
router.get('/:requestId/status', authenticate, (req, res, next) =>
  emergencyBeepController.getStatus(req, res, next)
);
router.get('/:requestId/recipients', authenticate, (req, res, next) =>
  emergencyBeepController.getRecipients(req, res, next)
);
router.post('/:requestId/finalize', authenticate, (req, res, next) =>
  emergencyBeepController.finalize(req, res, next)
);

export default router;


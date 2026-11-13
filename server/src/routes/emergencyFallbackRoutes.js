import express from 'express';
import { emergencyFallbackController } from '../controllers/EmergencyFallbackController.js';

const router = express.Router();

// Internal Emergency Fallback Endpoints
// Mounted at /internal/emergency-fallback and /emergency-fallback
router.post('/:requestId/start', (req, res, next) =>
  emergencyFallbackController.startFallback(req, res, next)
);

router.post('/:requestId/expand-search', (req, res, next) =>
  emergencyFallbackController.expandSearch(req, res, next)
);

router.get('/:requestId/status', (req, res, next) =>
  emergencyFallbackController.getFallbackStatus(req, res, next)
);

router.get('/:requestId/search-history', (req, res, next) =>
  emergencyFallbackController.getSearchHistory(req, res, next)
);

router.post('/:requestId/complete', (req, res, next) =>
  emergencyFallbackController.completeFallback(req, res, next)
);

export default router;


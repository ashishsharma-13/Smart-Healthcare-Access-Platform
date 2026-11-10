import express from 'express';
import { authController } from '../controllers/AuthController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', (req, res, next) => authController.register(req, res, next));
router.post('/login', (req, res, next) => authController.login(req, res, next));
router.get('/me', authenticate, (req, res, next) => authController.getProfile(req, res, next));

export default router;


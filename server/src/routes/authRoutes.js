import express from 'express';
import { register, login, getMe, updateMe, sendOtp, verifyOtp } from '../controllers/AuthController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.put('/me', authenticate, updateMe);

export default router;
import express from 'express';
import { notificationController } from '../controllers/NotificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All notification routes require authenticated user
router.use(authenticate);

router.get('/my', (req, res, next) => notificationController.getMyNotifications(req, res, next));
router.get('/my/unread', (req, res, next) => notificationController.getMyUnreadNotifications(req, res, next));
router.get('/my/count', (req, res, next) => notificationController.getMyUnreadCount(req, res, next));
router.get('/my/preferences', (req, res, next) => notificationController.getMyPreferences(req, res, next));
router.put('/my/preferences', (req, res, next) => notificationController.updateMyPreferences(req, res, next));
router.post('/my/read-all', (req, res, next) => notificationController.markAllNotificationsAsRead(req, res, next));

router.get('/:notificationId', (req, res, next) => notificationController.getNotificationDetails(req, res, next));
router.post('/:notificationId/read', (req, res, next) => notificationController.markNotificationAsRead(req, res, next));

export default router;


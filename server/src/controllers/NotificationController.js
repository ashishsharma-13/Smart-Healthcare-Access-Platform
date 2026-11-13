import { notificationService } from '../services/NotificationService.js';
import { notificationPreferenceService } from '../services/NotificationPreferenceService.js';
import { organizationRepository } from '../repositories/OrganizationRepository.js';

export class NotificationController {
  // --- Patient & User Endpoints ---

  async getMyNotifications(req, res, next) {
    try {
      const { notificationType, priority, unreadOnly, limit, skip } = req.query;
      const notifications = await notificationService.listMyNotifications(req.user._id, {
        notificationType,
        priority,
        unreadOnly: unreadOnly === 'true',
        limit: limit ? parseInt(limit, 10) : 50,
        skip: skip ? parseInt(skip, 10) : 0,
      });

      return res.json({
        success: true,
        data: notifications,
      });
    } catch (err) {
      next(err);
    }
  }

  async getMyUnreadNotifications(req, res, next) {
    try {
      const unread = await notificationService.listMyUnread(req.user._id);
      return res.json({
        success: true,
        data: unread,
      });
    } catch (err) {
      next(err);
    }
  }

  async getMyUnreadCount(req, res, next) {
    try {
      const countData = await notificationService.getMyUnreadCount(req.user._id);
      return res.json({
        success: true,
        data: countData,
        ...countData,
      });
    } catch (err) {
      next(err);
    }
  }

  async getNotificationDetails(req, res, next) {
    try {
      const { notificationId } = req.params;
      const result = await notificationService.getNotificationById(
        notificationId,
        req.user._id,
        req.user.role
      );

      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async markNotificationAsRead(req, res, next) {
    try {
      const { notificationId } = req.params;
      const updated = await notificationService.markAsRead(notificationId, req.user._id);

      return res.json({
        success: true,
        message: 'Notification marked as read',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async markAllNotificationsAsRead(req, res, next) {
    try {
      const result = await notificationService.markAllAsRead(req.user._id);
      return res.json({
        success: true,
        message: 'All notifications marked as read',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getMyPreferences(req, res, next) {
    try {
      const preferences = await notificationPreferenceService.getUserPreferences(req.user._id);
      return res.json({
        success: true,
        data: preferences,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateMyPreferences(req, res, next) {
    try {
      const { preferences } = req.body;
      const updated = await notificationPreferenceService.updatePreferences(
        req.user._id,
        preferences || []
      );
      return res.json({
        success: true,
        message: 'Notification preferences updated successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  // --- Organization Endpoints ---

  async getOrganizationNotifications(req, res, next) {
    try {
      const org = await organizationRepository.findByUserId(req.user._id);
      if (!org) {
        return res.status(404).json({ success: false, message: 'Organization profile not found' });
      }

      const { unreadOnly, limit, skip } = req.query;
      const notifications = await notificationService.listOrganizationNotifications(org._id, {
        unreadOnly: unreadOnly === 'true',
        limit: limit ? parseInt(limit, 10) : 50,
        skip: skip ? parseInt(skip, 10) : 0,
      });

      return res.json({
        success: true,
        data: notifications,
      });
    } catch (err) {
      next(err);
    }
  }

  async getOrganizationUnreadNotifications(req, res, next) {
    try {
      const org = await organizationRepository.findByUserId(req.user._id);
      if (!org) {
        return res.status(404).json({ success: false, message: 'Organization profile not found' });
      }

      const unread = await notificationService.listOrganizationUnread(org._id);
      return res.json({
        success: true,
        data: unread,
      });
    } catch (err) {
      next(err);
    }
  }

  async markOrganizationNotificationAsRead(req, res, next) {
    try {
      const org = await organizationRepository.findByUserId(req.user._id);
      if (!org) {
        return res.status(404).json({ success: false, message: 'Organization profile not found' });
      }

      const { id } = req.params;
      const updated = await notificationService.markOrganizationNotificationAsRead(id, org._id);

      return res.json({
        success: true,
        message: 'Organization notification marked as read',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  // --- Admin Endpoints ---

  async getAdminNotifications(req, res, next) {
    try {
      const { status, priority, notificationType, limit, skip } = req.query;
      const result = await notificationService.listAdminNotifications({
        status,
        priority,
        notificationType,
        limit: limit ? parseInt(limit, 10) : 50,
        skip: skip ? parseInt(skip, 10) : 0,
      });

      return res.json({
        success: true,
        data: result.items,
        total: result.total,
      });
    } catch (err) {
      next(err);
    }
  }

  async getFailedDeliveries(req, res, next) {
    try {
      const { limit, skip } = req.query;
      const result = await notificationService.listFailedDeliveries({
        limit: limit ? parseInt(limit, 10) : 50,
        skip: skip ? parseInt(skip, 10) : 0,
      });

      return res.json({
        success: true,
        data: result.items,
        total: result.total,
      });
    } catch (err) {
      next(err);
    }
  }

  async getNotificationDeliveries(req, res, next) {
    try {
      const { id } = req.params;
      const result = await notificationService.getNotificationDeliveries(id);

      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async retryNotification(req, res, next) {
    try {
      const { id } = req.params;
      const result = await notificationService.retryNotification(id);

      return res.json({
        success: true,
        message: 'Notification retry initiated successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getNotificationMetrics(req, res, next) {
    try {
      const metrics = await notificationService.getNotificationMetrics();
      return res.json({
        success: true,
        data: metrics,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const notificationController = new NotificationController();


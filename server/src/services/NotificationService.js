import { notificationRepository } from '../repositories/NotificationRepository.js';
import { notificationDeliveryRepository } from '../repositories/NotificationDeliveryRepository.js';
import { notificationDeliveryService } from './NotificationDeliveryService.js';
import { notificationOutboxService } from './NotificationOutboxService.js';
import { notificationRetryService } from './NotificationRetryService.js';
import { notificationPreferenceService } from './NotificationPreferenceService.js';
import { notificationEscalationService } from './NotificationEscalationService.js';
import { organizationRepository } from '../repositories/OrganizationRepository.js';

export class NotificationService {
  /**
   * Primary entry point for creating and dispatching a notification.
   */
  async createNotification({
    recipientUserId,
    organizationId = null,
    emergencyRequestId = null,
    notificationType,
    title,
    message,
    priority = 'NORMAL',
    actionUrl = null,
    useOutbox = false,
  }) {
    if (!recipientUserId) {
      throw new Error('recipientUserId is required to create a notification');
    }

    if (useOutbox) {
      return await notificationOutboxService.enqueueEvent({
        eventType: notificationType,
        aggregateType: emergencyRequestId ? 'EmergencyRequest' : 'User',
        aggregateId: emergencyRequestId || recipientUserId,
        payload: {
          recipientUserId,
          organizationId,
          emergencyRequestId,
          notificationType,
          title,
          message,
          priority,
          actionUrl,
        },
      });
    }

    const notification = await notificationRepository.create({
      recipientUserId,
      organizationId,
      emergencyRequestId,
      notificationType,
      title,
      message,
      priority,
      actionUrl,
      status: 'PENDING',
    });

    // Asynchronously dispatch without blocking
    notificationDeliveryService.dispatch(notification).catch((err) => {
      console.warn('[NotificationService] Async dispatch error:', err.message);
    });

    return notification;
  }

  // --- Patient & Common User APIs ---

  async listMyNotifications(userId, options = {}) {
    return await notificationRepository.findForUser(userId, options);
  }

  async listMyUnread(userId) {
    return await notificationRepository.findUnreadForUser(userId);
  }

  async getMyUnreadCount(userId) {
    const count = await notificationRepository.countUnreadForUser(userId);
    return { unreadCount: count };
  }

  async getNotificationById(idOrNotificationId, userId, userRole) {
    let notification = await notificationRepository.findById(idOrNotificationId);
    if (!notification) {
      notification = await notificationRepository.findByNotificationId(idOrNotificationId);
    }

    if (!notification) {
      const error = new Error('Notification not found');
      error.statusCode = 404;
      throw error;
    }

    // Role-based access control check
    const isOwner = notification.recipientUserId?._id
      ? notification.recipientUserId._id.toString() === userId.toString()
      : notification.recipientUserId?.toString() === userId.toString();

    const isAdmin = userRole === 'admin' || userRole === 'web_admin';

    if (!isOwner && !isAdmin) {
      const error = new Error('Access denied. You do not own this notification.');
      error.statusCode = 403;
      throw error;
    }

    const deliveries = await notificationDeliveryRepository.findByNotificationId(notification._id);

    return {
      notification,
      deliveries,
    };
  }

  async markAsRead(idOrNotificationId, userId) {
    const updated = await notificationRepository.markAsRead(idOrNotificationId, userId);
    if (!updated) {
      const error = new Error('Notification not found or access denied');
      error.statusCode = 404;
      throw error;
    }
    return updated;
  }

  async markAllAsRead(userId) {
    const result = await notificationRepository.markAllAsReadForUser(userId);
    return { success: true, updatedCount: result.modifiedCount || result.nModified || 0 };
  }

  // --- Organization APIs ---

  async listOrganizationNotifications(organizationId, options = {}) {
    return await notificationRepository.findForOrganization(organizationId, options);
  }

  async listOrganizationUnread(organizationId) {
    return await notificationRepository.findUnreadForOrg(organizationId);
  }

  async markOrganizationNotificationAsRead(idOrNotificationId, organizationId) {
    const updated = await notificationRepository.markAsReadForOrg(idOrNotificationId, organizationId);
    if (!updated) {
      const error = new Error('Organization notification not found');
      error.statusCode = 404;
      throw error;
    }
    return updated;
  }

  // --- Admin APIs ---

  async listAdminNotifications(options = {}) {
    return await notificationRepository.listAll(options);
  }

  async listFailedDeliveries(options = {}) {
    return await notificationDeliveryRepository.findFailedDeliveries(options);
  }

  async getNotificationDeliveries(notificationId) {
    let notif = await notificationRepository.findById(notificationId);
    if (!notif) {
      notif = await notificationRepository.findByNotificationId(notificationId);
    }
    if (!notif) {
      const error = new Error('Notification not found');
      error.statusCode = 404;
      throw error;
    }

    const deliveries = await notificationDeliveryRepository.findByNotificationId(notif._id);
    return {
      notification: notif,
      deliveries,
    };
  }

  async retryNotification(idOrNotificationId) {
    return await notificationRetryService.manualRetryNotification(idOrNotificationId);
  }

  async getNotificationMetrics() {
    const metrics = await notificationRepository.getMetrics();
    const channelMetrics = await notificationDeliveryRepository.getMetricsByChannel();
    return {
      ...metrics,
      channels: channelMetrics,
    };
  }
}

export const notificationService = new NotificationService();


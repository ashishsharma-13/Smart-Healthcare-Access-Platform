import { notificationDeliveryRepository } from '../repositories/NotificationDeliveryRepository.js';
import { notificationRepository } from '../repositories/NotificationRepository.js';
import { userRepository } from '../repositories/UserRepository.js';
import { notificationDeliveryService } from './NotificationDeliveryService.js';

export class NotificationRetryService {
  /**
   * Processes all pending or retryable deliveries whose nextRetryAt has arrived.
   */
  async processPendingRetries(limit = 50) {
    const pendingDeliveries = await notificationDeliveryRepository.findPendingOrRetryable(new Date(), limit);
    const results = [];

    for (const delivery of pendingDeliveries) {
      try {
        const notification = delivery.notificationId;
        if (!notification) {
          await notificationDeliveryRepository.updateDelivery(delivery._id, {
            status: 'FAILED',
            failureReason: 'Associated notification record not found',
          });
          continue;
        }

        let user = null;
        if (notification.recipientUserId) {
          const uid = notification.recipientUserId._id || notification.recipientUserId;
          user = await userRepository.findById(uid);
        }

        const updated = await notificationDeliveryService.deliverToChannel(delivery, notification, user);
        results.push({ deliveryId: delivery._id, status: updated.status });
      } catch (err) {
        console.warn(`[NotificationRetryService] Retry error for delivery ${delivery._id}:`, err.message);
        results.push({ deliveryId: delivery._id, status: 'FAILED', error: err.message });
      }
    }

    return results;
  }

  /**
   * Administrator manual retry of a specific failed notification delivery.
   */
  async manualRetryDelivery(deliveryId) {
    const delivery = await notificationDeliveryRepository.findById(deliveryId);
    if (!delivery) {
      throw new Error(`Delivery record not found for id: ${deliveryId}`);
    }

    const notification = delivery.notificationId;
    if (!notification) {
      throw new Error('Associated notification record does not exist');
    }

    let user = null;
    if (notification.recipientUserId) {
      const uid = notification.recipientUserId._id || notification.recipientUserId;
      user = await userRepository.findById(uid);
    }

    // Reset delivery for immediate retry
    const updated = await notificationDeliveryService.deliverToChannel(delivery, notification, user);

    // Update overall notification status if delivery succeeded
    if (updated.status === 'DELIVERED') {
      await notificationRepository.updateStatus(notification._id, 'DELIVERED');
    }

    return updated;
  }

  /**
   * Administrator manual retry of all failed deliveries for a notification.
   */
  async manualRetryNotification(notificationId) {
    let notification = await notificationRepository.findById(notificationId);
    if (!notification) {
      notification = await notificationRepository.findByNotificationId(notificationId);
    }
    if (!notification) {
      throw new Error(`Notification not found: ${notificationId}`);
    }

    const deliveries = await notificationDeliveryRepository.findByNotificationId(notification._id);
    const retriedDeliveries = [];

    let user = null;
    if (notification.recipientUserId) {
      const uid = notification.recipientUserId._id || notification.recipientUserId;
      user = await userRepository.findById(uid);
    }

    for (const d of deliveries) {
      if (d.status === 'FAILED' || d.status === 'RETRY_PENDING') {
        const retried = await notificationDeliveryService.deliverToChannel(d, notification, user);
        retriedDeliveries.push(retried);
      }
    }

    // If no deliveries existed, dispatch fresh
    if (deliveries.length === 0) {
      const freshDeliveries = await notificationDeliveryService.dispatch(notification);
      retriedDeliveries.push(...freshDeliveries);
    }

    return {
      notificationId: notification.notificationId,
      retriedCount: retriedDeliveries.length,
      deliveries: retriedDeliveries,
    };
  }
}

export const notificationRetryService = new NotificationRetryService();


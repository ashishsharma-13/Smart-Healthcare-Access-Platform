import mongoose from 'mongoose';
import { notificationDeliveryRepository } from '../repositories/NotificationDeliveryRepository.js';
import { notificationRepository } from '../repositories/NotificationRepository.js';
import { userRepository } from '../repositories/UserRepository.js';
import { webSocketNotificationService } from './WebSocketNotificationService.js';
import { emailNotificationService } from './EmailNotificationService.js';
import { smsNotificationService } from './SmsNotificationService.js';
import { notificationPreferenceService } from './NotificationPreferenceService.js';

export class NotificationDeliveryService {
  /**
   * Determine target channels for a notification based on priority, type, and preferences.
   */
  async resolveTargetChannels(notification, recipientUser) {
    const channels = ['IN_APP', 'WEBSOCKET'];

    const isEmergency =
      notification.priority === 'EMERGENCY' ||
      notification.priority === 'CRITICAL' ||
      notification.notificationType?.startsWith('EMERGENCY_');

    // Add Email for verifications, appointments, and emergency events
    const emailTypes = [
      'DOCTOR_REGISTRATION',
      'DOCTOR_VERIFICATION',
      'ORGANIZATION_REGISTRATION',
      'ORGANIZATION_VERIFICATION',
      'APPOINTMENT_BOOKED',
      'APPOINTMENT_CANCELLED',
      'APPOINTMENT_RESCHEDULED',
    ];

    if (emailTypes.includes(notification.notificationType) || isEmergency) {
      if (recipientUser?.email) {
        channels.push('EMAIL');
      }
    }

    // Add SMS for emergency events or reminders
    if (isEmergency && recipientUser?.phone) {
      channels.push('SMS');
    }

    // Filter permitted channels according to user preferences
    const permitted = [];
    for (const ch of channels) {
      const allowed = await notificationPreferenceService.isChannelPermitted(
        notification.recipientUserId,
        notification.notificationType,
        notification.priority,
        ch
      );
      if (allowed) {
        permitted.push(ch);
      }
    }

    return permitted;
  }

  /**
   * Dispatches a notification across all permitted channels.
   */
  async dispatch(notification) {
    if (mongoose.connection.readyState !== 1) {
      return [];
    }
    try {
      let recipientUser = null;
      if (notification.recipientUserId) {
        const uid = notification.recipientUserId._id || notification.recipientUserId;
        recipientUser = await userRepository.findById(uid);
      }

      const channels = await this.resolveTargetChannels(notification, recipientUser);
      const deliveryResults = [];

      for (const channel of channels) {
        const delivery = await notificationDeliveryRepository.create({
          notificationId: notification._id,
          channel,
          providerName: 'INTERNAL',
          status: 'PENDING',
          attemptCount: 0,
        });

        const result = await this.deliverToChannel(delivery, notification, recipientUser);
        deliveryResults.push(result);
      }

      // Update notification overall status
      const hasDelivered = deliveryResults.some((d) => d.status === 'DELIVERED' || d.status === 'SENT');
      const allFailed = deliveryResults.length > 0 && deliveryResults.every((d) => d.status === 'FAILED');

      let newStatus = 'SENT';
      if (allFailed) {
        newStatus = 'FAILED';
      } else if (hasDelivered) {
        newStatus = 'DELIVERED';
      }

      await notificationRepository.updateStatus(notification._id, newStatus);
      return deliveryResults;
    } catch (err) {
      console.warn('[NotificationDeliveryService] Dispatch warning:', err.message);
      return [];
    }
  }

  /**
   * Delivers single channel delivery attempt.
   */
  async deliverToChannel(delivery, notification, user) {
    const attemptCount = (delivery.attemptCount || 0) + 1;
    const now = new Date();

    try {
      let outcome = { success: false, error: 'Unsupported channel' };

      switch (delivery.channel) {
        case 'IN_APP':
          outcome = {
            success: true,
            providerName: 'IN_APP_DB',
            providerMessageId: `APP-${Date.now()}`,
            deliveredAt: now,
          };
          break;

        case 'WEBSOCKET':
          outcome = await webSocketNotificationService.deliver(notification);
          break;

        case 'EMAIL':
          outcome = await emailNotificationService.deliver(notification, user);
          break;

        case 'SMS':
          outcome = await smsNotificationService.deliver(notification, user);
          break;

        default:
          outcome = { success: false, error: `Channel ${delivery.channel} not configured`, permanent: true };
          break;
      }

      if (outcome.success) {
        return await notificationDeliveryRepository.updateDelivery(delivery._id, {
          status: 'DELIVERED',
          providerName: outcome.providerName || delivery.providerName,
          providerMessageId: outcome.providerMessageId,
          attemptCount,
          lastAttemptAt: now,
          deliveredAt: outcome.deliveredAt || now,
          failureReason: null,
          nextRetryAt: null,
        });
      } else {
        // Handle failure: check if permanent or retryable
        const isPermanent = outcome.permanent === true;
        const nextRetryAt = isPermanent ? null : this.calculateNextRetry(attemptCount);
        const status = isPermanent || attemptCount >= 4 ? 'FAILED' : 'RETRY_PENDING';

        return await notificationDeliveryRepository.updateDelivery(delivery._id, {
          status,
          attemptCount,
          lastAttemptAt: now,
          failureReason: outcome.error,
          nextRetryAt,
        });
      }
    } catch (err) {
      const nextRetryAt = this.calculateNextRetry(attemptCount);
      const status = attemptCount >= 4 ? 'FAILED' : 'RETRY_PENDING';

      return await notificationDeliveryRepository.updateDelivery(delivery._id, {
        status,
        attemptCount,
        lastAttemptAt: now,
        failureReason: err.message,
        nextRetryAt,
      });
    }
  }

  /**
   * Exponential backoff retry policy:
   * Attempt 1: Immediate (handled upon creation)
   * Attempt 2: After 30 seconds
   * Attempt 3: After 2 minutes
   * Attempt 4: After 5 minutes
   */
  calculateNextRetry(attemptCount) {
    const delays = [0, 30 * 1000, 2 * 60 * 1000, 5 * 60 * 1000];
    const delay = delays[attemptCount] || 5 * 60 * 1000;
    return new Date(Date.now() + delay);
  }
}

export const notificationDeliveryService = new NotificationDeliveryService();


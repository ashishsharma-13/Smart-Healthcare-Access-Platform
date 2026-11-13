import { notificationRepository } from '../repositories/NotificationRepository.js';
import { notificationDeliveryService } from './NotificationDeliveryService.js';
import { User } from '../models/User.js';

export class NotificationEscalationService {
  /**
   * Raises a critical operational escalation alert to platform administrators.
   */
  async escalateOperationalFailure({ title, message, context = {}, emergencyRequestId = null }) {
    try {
      // Find active administrators to notify
      const admins = await User.find({ role: { $in: ['admin', 'web_admin'] }, isActive: true });

      const notifications = [];
      for (const admin of admins) {
        const notif = await notificationRepository.create({
          recipientUserId: admin._id,
          emergencyRequestId,
          notificationType: 'CRITICAL_OPERATIONAL_FAILURE',
          title: `🚨 Escalation: ${title}`,
          message: `${message} Context: ${JSON.stringify(context)}`,
          priority: 'CRITICAL',
          status: 'PENDING',
          actionUrl: '/admin/dashboard',
        });

        await notificationDeliveryService.dispatch(notif);
        notifications.push(notif);
      }

      return notifications;
    } catch (err) {
      console.warn('[NotificationEscalationService] Escalation warning:', err.message);
      return [];
    }
  }

  /**
   * Escalates when an organization's Emergency Beep delivery fails.
   */
  async escalateBeepDeliveryFailure({ organizationId, emergencyRequestId, error }) {
    console.warn(`[Escalation] Emergency Beep delivery failed for Organization ${organizationId}: ${error}`);
    // Non-blocking: record exception without interrupting other organizations
    return {
      organizationId,
      emergencyRequestId,
      escalated: true,
      error,
      timestamp: new Date(),
    };
  }

  /**
   * Escalates when destination confirmation fails or is rejected.
   */
  async notifyDestinationConfirmationFailure({ patientUserId, emergencyRequestId, organizationName, reason }) {
    if (!patientUserId) return null;

    const notif = await notificationRepository.create({
      recipientUserId: patientUserId,
      emergencyRequestId,
      notificationType: 'EMERGENCY_ORGANIZATION_CONFIRMED',
      title: 'Facility Unable to Receive — Reselect Destination',
      message: `${organizationName || 'Selected hospital'} cannot confirm receipt (${reason || 'Capacity changed'}). Please choose an alternate accepted hospital.`,
      priority: 'EMERGENCY',
      status: 'PENDING',
      actionUrl: `/emergency/responses/${emergencyRequestId}`,
    });

    await notificationDeliveryService.dispatch(notif);
    return notif;
  }

  /**
   * Escalates warning when a reservation is approaching expiry (e.g. 5 minutes remaining).
   */
  async notifyReservationApproachingExpiry({ patientUserId, organizationUserId, emergencyRequestId, minutesLeft }) {
    const recipients = [patientUserId, organizationUserId].filter(Boolean);
    const notifications = [];

    for (const uid of recipients) {
      const notif = await notificationRepository.create({
        recipientUserId: uid,
        emergencyRequestId,
        notificationType: 'EMERGENCY_RESERVATION_EXPIRING_SOON',
        title: '⚠️ Emergency Hold Expiring Soon',
        message: `Your reserved hospital resources will be released in ${minutesLeft || 5} minutes if the journey is not initiated.`,
        priority: 'EMERGENCY',
        status: 'PENDING',
        actionUrl: `/emergency/reserved/${emergencyRequestId}`,
      });
      await notificationDeliveryService.dispatch(notif);
      notifications.push(notif);
    }

    return notifications;
  }

  /**
   * Escalates notification when a resource reservation has expired and resources were released.
   */
  async notifyReservationExpired({ patientUserId, organizationUserId, emergencyRequestId }) {
    const recipients = [patientUserId, organizationUserId].filter(Boolean);
    const notifications = [];

    for (const uid of recipients) {
      const notif = await notificationRepository.create({
        recipientUserId: uid,
        emergencyRequestId,
        notificationType: 'EMERGENCY_RESERVATION_EXPIRED',
        title: 'Resource Reservation Expired & Released',
        message: 'The temporary resource hold has expired and beds/equipment were returned to emergency pool.',
        priority: 'HIGH',
        status: 'PENDING',
        actionUrl: `/emergency/responses/${emergencyRequestId}`,
      });
      await notificationDeliveryService.dispatch(notif);
      notifications.push(notif);
    }

    return notifications;
  }

  /**
   * Escalates notification when physical resource allocation fails at facility.
   */
  async notifyResourceAllocationFailure({ organizationUserId, emergencyRequestId, reason }) {
    if (!organizationUserId) return null;

    const notif = await notificationRepository.create({
      recipientUserId: organizationUserId,
      emergencyRequestId,
      notificationType: 'CRITICAL_OPERATIONAL_FAILURE',
      title: 'Resource Allocation Exception',
      message: `Physical bed or equipment allocation could not be completed: ${reason || 'Capacity conflict'}`,
      priority: 'CRITICAL',
      status: 'PENDING',
      actionUrl: `/organization/dashboard`,
    });

    await notificationDeliveryService.dispatch(notif);
    return notif;
  }
}

export const notificationEscalationService = new NotificationEscalationService();


import { notificationOutboxRepository } from '../repositories/NotificationOutboxRepository.js';
import { notificationRepository } from '../repositories/NotificationRepository.js';
import { notificationDeliveryService } from './NotificationDeliveryService.js';
import { User } from '../models/User.js';

export class NotificationOutboxService {
  /**
   * Enqueues an outbox event atomically.
   */
  async enqueueEvent({ eventType, aggregateType, aggregateId, payload }) {
    try {
      return await notificationOutboxRepository.create({
        eventType,
        aggregateType: aggregateType || 'EmergencyRequest',
        aggregateId,
        payload,
        status: 'PENDING',
        retryCount: 0,
      });
    } catch (err) {
      console.warn('[NotificationOutboxService] Enqueue warning:', err.message);
      return null;
    }
  }

  /**
   * Background worker processes pending outbox events idempotently.
   */
  async processPendingEvents(limit = 20) {
    const events = await notificationOutboxRepository.findPendingEvents(limit);
    const results = [];

    for (const event of events) {
      try {
        await notificationOutboxRepository.updateEventStatus(event._id, 'PROCESSING');
        const processedNotification = await this.handleEvent(event);
        await notificationOutboxRepository.updateEventStatus(event._id, 'PUBLISHED');
        results.push({ eventId: event._id, success: true, notification: processedNotification });
      } catch (err) {
        console.warn(`[NotificationOutboxWorker] Event ${event._id} processing failed:`, err.message);
        const retryCount = (event.retryCount || 0) + 1;
        const maxRetries = event.maxRetries || 4;
        const status = retryCount >= maxRetries ? 'FAILED' : 'PENDING';
        const nextRetry = status === 'PENDING' ? new Date(Date.now() + 30 * 1000) : null;

        await notificationOutboxRepository.updateEventStatus(event._id, status, err.message, nextRetry);
        results.push({ eventId: event._id, success: false, error: err.message });
      }
    }

    return results;
  }

  /**
   * Converts outbox event payload into formal Notification entity and dispatches.
   */
  async handleEvent(event) {
    const { eventType, payload } = event;

    // Resolve or create recipient
    let recipientUserId = payload.recipientUserId || payload.patientId || payload.userId;
    if (!recipientUserId && payload.recipientEmail) {
      const u = await User.findOne({ email: payload.recipientEmail });
      recipientUserId = u?._id;
    }

    if (!recipientUserId) {
      throw new Error(`Cannot dispatch notification for event ${eventType}: Missing recipientUserId`);
    }

    // Check idempotency: avoid creating duplicate notification if already created for this outbox event
    const existingNotification = await notificationRepository.findByNotificationId(
      `OUTBOX-${event._id.toString()}`
    );
    if (existingNotification) {
      return existingNotification;
    }

    const priority = payload.priority || (eventType.startsWith('EMERGENCY_') ? 'EMERGENCY' : 'NORMAL');

    const notification = await notificationRepository.create({
      notificationId: payload.notificationId || `OUTBOX-${event._id.toString()}`,
      recipientUserId,
      organizationId: payload.organizationId || null,
      emergencyRequestId: payload.emergencyRequestId || null,
      notificationType: eventType,
      title: payload.title || this.getDefaultTitle(eventType),
      message: payload.message || 'Notification update from Smart Healthcare Access Platform.',
      priority,
      actionUrl: payload.actionUrl || null,
      status: 'PENDING',
    });

    // Dispatch across channels
    await notificationDeliveryService.dispatch(notification);
    return notification;
  }

  getDefaultTitle(eventType) {
    switch (eventType) {
      case 'DOCTOR_REGISTRATION':
        return 'Doctor Account Created';
      case 'DOCTOR_VERIFICATION':
        return 'Doctor Verification Status Updated';
      case 'ORGANIZATION_REGISTRATION':
        return 'Organization Account Created';
      case 'ORGANIZATION_VERIFICATION':
        return 'Organization Verification Status Updated';
      case 'AFFILIATION_REQUEST':
        return 'Clinical Affiliation Requested';
      case 'AFFILIATION_ACCEPTED':
        return 'Affiliation Invitation Accepted';
      case 'AFFILIATION_TERMINATED':
        return 'Affiliation Terminated';
      case 'APPOINTMENT_BOOKED':
        return 'Medical Appointment Confirmed';
      case 'APPOINTMENT_CANCELLED':
        return 'Medical Appointment Cancelled';
      case 'APPOINTMENT_RESCHEDULED':
        return 'Medical Appointment Rescheduled';
      case 'EMERGENCY_REQUEST_CREATED':
        return 'Emergency Request Logged';
      case 'EMERGENCY_BEEP_BROADCAST':
        return '🚨 Emergency Beep Broadcasted';
      case 'EMERGENCY_BEEP_ACCEPTED':
        return 'Hospital Accepted Emergency Beep';
      case 'EMERGENCY_BEEP_DECLINED':
        return 'Hospital Declined Emergency Beep';
      case 'EMERGENCY_RESPONSES_COLLECTED':
        return 'Emergency Beep Responses Received';
      case 'EMERGENCY_DESTINATION_SELECTED':
        return 'Emergency Destination Selected';
      case 'EMERGENCY_ORGANIZATION_CONFIRMED':
        return 'Hospital Confirmed Ability to Receive';
      case 'EMERGENCY_RESOURCE_RESERVED':
        return 'Emergency Beds & Equipment Reserved';
      case 'EMERGENCY_RESERVATION_EXPIRING_SOON':
        return '⚠️ Resource Hold Expiring Soon';
      case 'EMERGENCY_RESERVATION_EXPIRED':
        return 'Resource Hold Expired and Released';
      case 'EMERGENCY_JOURNEY_STARTED':
        return 'Patient En Route to Facility';
      case 'EMERGENCY_PATIENT_ARRIVED':
        return 'Patient Arrival Verified at Hospital';
      case 'EMERGENCY_RESOURCE_ALLOCATED':
        return 'Physical Clinical Resources Allocated';
      case 'EMERGENCY_COORDINATION_COMPLETED':
        return 'Emergency Case Successfully Closed';
      case 'CRITICAL_OPERATIONAL_FAILURE':
        return '🚨 Critical Platform Exception';
      default:
        return 'SHAP System Update';
    }
  }
}

export const notificationOutboxService = new NotificationOutboxService();

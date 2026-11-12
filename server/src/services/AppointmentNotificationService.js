import { appointmentNotificationRepository } from '../repositories/AppointmentNotificationRepository.js';
import { getSocketIO } from '../sockets/socketHandler.js';

export class AppointmentNotificationService {
  /**
   * Safely dispatch an appointment notification to recipient.
   * Persists record and emits socket event to relevant rooms.
   */
  async notify({ appointmentId, recipientId, notificationType, message }) {
    try {
      const notification = await appointmentNotificationRepository.create({
        appointmentId,
        recipientId,
        notificationType,
        deliveryStatus: 'SENT',
        message,
        sentAt: new Date(),
      });

      // Safely broadcast via socket if active
      const io = getSocketIO();
      if (io && recipientId) {
        const recipientRoom = recipientId.toString();
        io.to(recipientRoom).emit('notification:received', {
          notificationId: notification.notificationId,
          appointmentId,
          type: notificationType,
          message,
          timestamp: notification.sentAt,
        });
        io.to(recipientRoom).emit('appointment:updated', {
          appointmentId,
          type: notificationType,
          message,
        });
      }

      return notification;
    } catch (err) {
      console.warn('[AppointmentNotificationService] Notification dispatch warning:', err.message);
      // Non-blocking: Notification failures must never roll back committed appointments
      return null;
    }
  }

  async listNotificationsForRecipient(recipientId) {
    return await appointmentNotificationRepository.listByRecipient(recipientId);
  }

  async listNotificationsForAppointment(appointmentId) {
    return await appointmentNotificationRepository.listByAppointment(appointmentId);
  }
}

export const appointmentNotificationService = new AppointmentNotificationService();


import { getSocketIO } from '../sockets/socketHandler.js';

export class WebSocketNotificationService {
  /**
   * Broadcasts real-time notification to user and/or organization rooms.
   */
  async deliver(notification) {
    try {
      const io = getSocketIO();
      if (!io) {
        return {
          success: true,
          providerName: 'SOCKET_IO',
          providerMessageId: null,
          deliveredAt: new Date(),
          note: 'Socket server offline, in-app persistent record preserved',
        };
      }

      const payload = {
        notificationId: notification.notificationId,
        _id: notification._id,
        type: notification.notificationType,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        actionUrl: notification.actionUrl,
        emergencyRequestId: notification.emergencyRequestId,
        createdAt: notification.createdAt || new Date(),
      };

      // 1. Deliver to specific user if recipient exists
      if (notification.recipientUserId) {
        const userIdStr = notification.recipientUserId._id
          ? notification.recipientUserId._id.toString()
          : notification.recipientUserId.toString();

        io.to(userIdStr).emit('notification:new', payload);
        io.to(`user:${userIdStr}`).emit('notification:new', payload);
        io.to(`user/queue/notifications`).emit('notification:new', { ...payload, targetUserId: userIdStr });
      }

      // 2. Deliver to organization room if notification belongs to an organization
      if (notification.organizationId) {
        const orgIdStr = notification.organizationId._id
          ? notification.organizationId._id.toString()
          : notification.organizationId.toString();

        io.to(orgIdStr).emit('notification:new', payload);
        io.to(`org:${orgIdStr}`).emit('notification:new', payload);
        io.to(`/topic/organizations/${orgIdStr}/emergency-beeps`).emit('notification:new', payload);
      }

      // 3. Deliver to emergency room if linked to an emergency
      if (notification.emergencyRequestId) {
        const emgIdStr = notification.emergencyRequestId._id
          ? notification.emergencyRequestId._id.toString()
          : notification.emergencyRequestId.toString();

        io.to(`emergency:${emgIdStr}`).emit('notification:emergency_event', payload);
      }

      return {
        success: true,
        providerName: 'SOCKET_IO',
        providerMessageId: `WS-${Date.now()}`,
        deliveredAt: new Date(),
      };
    } catch (err) {
      console.warn('[WebSocketNotificationService] Delivery warning:', err.message);
      return {
        success: false,
        providerName: 'SOCKET_IO',
        error: err.message,
        retryable: true,
      };
    }
  }
}

export const webSocketNotificationService = new WebSocketNotificationService();


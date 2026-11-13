import { getSocketIO } from '../sockets/socketHandler.js';
import { notificationService } from './NotificationService.js';
import { notificationOutboxService } from './NotificationOutboxService.js';

export class FallbackNotificationService {
  async notifyFallbackStarted({ emergencyRequest, session, reason }) {
    const io = getSocketIO();
    if (io) {
      io.to(`emergency:${emergencyRequest._id}`).emit('emergency:fallback_started', {
        emergencyRequestId: emergencyRequest._id,
        fallbackSessionId: session.fallbackSessionId,
        reason,
        currentSearchLevel: session.currentSearchLevel,
      });
    }

    if (emergencyRequest.patientId) {
      await notificationService.createNotification({
        recipientUserId: emergencyRequest.patientId,
        emergencyRequestId: emergencyRequest._id,
        notificationType: 'EMERGENCY_FALLBACK_STARTED',
        title: 'Emergency Fallback Search Activated',
        message: 'No immediate private hospital confirmed. Expanding search to regional and emergency facilities.',
        priority: 'EMERGENCY',
        actionUrl: `/emergency/fallback?requestId=${emergencyRequest._id}`,
      }).catch((e) => console.warn('[Notification Warning]', e.message));
    }
  }

  async notifySearchExpanded({ emergencyRequest, searchRecord, newlyDiscoveredCount }) {
    const io = getSocketIO();
    if (io) {
      io.to(`emergency:${emergencyRequest._id}`).emit('emergency:search_expanded', {
        emergencyRequestId: emergencyRequest._id,
        searchLevel: searchRecord.searchLevel,
        searchRadiusKm: searchRecord.searchRadiusKm,
        newlyDiscoveredCount,
      });
    }
  }

  async notifyDestinationChanged({ emergencyRequest, destinationName, isExternal = false }) {
    const io = getSocketIO();
    if (io) {
      io.to(`emergency:${emergencyRequest._id}`).emit('emergency:destination_changed', {
        emergencyRequestId: emergencyRequest._id,
        destinationName,
        isExternal,
      });
    }

    if (emergencyRequest.patientId) {
      await notificationService.createNotification({
        recipientUserId: emergencyRequest.patientId,
        emergencyRequestId: emergencyRequest._id,
        notificationType: 'EMERGENCY_DESTINATION_CHANGED',
        title: 'Emergency Destination Updated',
        message: `Your emergency destination has been updated to ${destinationName}.`,
        priority: 'HIGH',
        actionUrl: `/emergency/en-route/${emergencyRequest._id}`,
      }).catch((e) => console.warn('[Notification Warning]', e.message));
    }
  }
}

export const fallbackNotificationService = new FallbackNotificationService();


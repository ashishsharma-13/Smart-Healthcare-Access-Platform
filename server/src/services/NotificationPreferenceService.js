import { notificationPreferenceRepository } from '../repositories/NotificationPreferenceRepository.js';

export class NotificationPreferenceService {
  /**
   * Determine whether a channel delivery is permitted for this notification and user.
   * SAFETY INVARIANT: Life-critical and emergency notifications CANNOT be muted by ordinary user preferences.
   */
  async isChannelPermitted(userId, notificationType, priority, channel) {
    // 1. IN_APP notifications are always permitted for internal auditability
    if (channel === 'IN_APP') {
      return true;
    }

    // 2. Emergency and critical safety notifications must never be muted
    const isCritical =
      priority === 'EMERGENCY' ||
      priority === 'CRITICAL' ||
      notificationType.startsWith('EMERGENCY_') ||
      notificationType === 'CRITICAL_OPERATIONAL_FAILURE';

    if (isCritical) {
      return true;
    }

    // 3. Check user preferences for non-emergency notifications
    if (!userId) return true;

    const pref = await notificationPreferenceRepository.getUserPreference(userId, notificationType, channel);
    if (pref) {
      return pref.enabled;
    }

    // Default: channels enabled by default
    return true;
  }

  async getUserPreferences(userId) {
    const existing = await notificationPreferenceRepository.findUserPreferences(userId);

    // Return current preferences or default set
    const defaultChannels = ['IN_APP', 'WEBSOCKET', 'EMAIL', 'SMS'];
    const preferencesMap = {};

    existing.forEach((p) => {
      preferencesMap[`${p.notificationType}:${p.channel}`] = p.enabled;
    });

    return defaultChannels.map((channel) => ({
      channel,
      enabled: preferencesMap[`ALL:${channel}`] !== undefined ? preferencesMap[`ALL:${channel}`] : true,
    }));
  }

  async updatePreferences(userId, preferences) {
    if (!Array.isArray(preferences)) {
      throw new Error('Preferences must be an array of { channel, enabled }');
    }

    const validChannels = ['IN_APP', 'WEBSOCKET', 'EMAIL', 'SMS', 'PUSH'];
    for (const p of preferences) {
      if (!validChannels.includes(p.channel)) {
        throw new Error(`Invalid notification channel: ${p.channel}`);
      }
    }

    await notificationPreferenceRepository.bulkUpdatePreferences(userId, preferences);
    return await this.getUserPreferences(userId);
  }
}

export const notificationPreferenceService = new NotificationPreferenceService();


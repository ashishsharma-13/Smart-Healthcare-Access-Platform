import { NotificationPreference } from '../models/NotificationPreference.js';

export class NotificationPreferenceRepository {
  async findUserPreferences(userId) {
    return await NotificationPreference.find({ userId });
  }

  async getUserPreference(userId, notificationType, channel) {
    // Check specific preference first, then fallback to ALL
    const specific = await NotificationPreference.findOne({ userId, notificationType, channel });
    if (specific) return specific;
    return await NotificationPreference.findOne({ userId, notificationType: 'ALL', channel });
  }

  async upsertPreference(userId, notificationType, channel, enabled) {
    return await NotificationPreference.findOneAndUpdate(
      { userId, notificationType, channel },
      { enabled, updatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  async bulkUpdatePreferences(userId, preferences = []) {
    const operations = preferences.map((p) => ({
      updateOne: {
        filter: { userId, notificationType: p.notificationType || 'ALL', channel: p.channel },
        update: { $set: { enabled: p.enabled, updatedAt: new Date() } },
        upsert: true,
      },
    }));

    if (operations.length > 0) {
      await NotificationPreference.bulkWrite(operations);
    }
    return await this.findUserPreferences(userId);
  }
}

export const notificationPreferenceRepository = new NotificationPreferenceRepository();


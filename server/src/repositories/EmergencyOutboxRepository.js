import { EmergencyNotificationOutbox } from '../models/EmergencyNotificationOutbox.js';

export class EmergencyOutboxRepository {
  async createEvent(eventType, aggregateId, payload) {
    const event = new EmergencyNotificationOutbox({
      eventType,
      aggregateId,
      payload,
      status: 'PENDING',
    });
    return await event.save();
  }

  async fetchPending(limit = 20) {
    return await EmergencyNotificationOutbox.find({
      status: { $in: ['PENDING', 'FAILED'] },
      retryCount: { $lt: 3 },
    })
      .sort({ createdAt: 1 })
      .limit(limit)
      .exec();
  }

  async markProcessing(id) {
    return await EmergencyNotificationOutbox.findByIdAndUpdate(
      id,
      { $set: { status: 'PROCESSING' } },
      { new: true }
    ).exec();
  }

  async markPublished(id) {
    return await EmergencyNotificationOutbox.findByIdAndUpdate(
      id,
      {
        $set: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      },
      { new: true }
    ).exec();
  }

  async markFailed(id, errorMessage) {
    return await EmergencyNotificationOutbox.findByIdAndUpdate(
      id,
      {
        $set: {
          status: 'FAILED',
          lastError: errorMessage,
        },
        $inc: { retryCount: 1 },
      },
      { new: true }
    ).exec();
  }
}

export const emergencyOutboxRepository = new EmergencyOutboxRepository();


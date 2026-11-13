import mongoose from 'mongoose';
import { NotificationOutbox } from '../models/NotificationOutbox.js';

export class NotificationOutboxRepository {
  async create(data) {
    if (mongoose.connection.readyState !== 1) {
      return {
        _id: new mongoose.Types.ObjectId(),
        outboxId: data.outboxId || `OUTBOX-${Date.now().toString(36).toUpperCase()}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: async function () { return this; },
      };
    }
    const outbox = new NotificationOutbox(data);
    return await outbox.save();
  }

  async findById(id) {
    return await NotificationOutbox.findById(id);
  }

  async findPendingEvents(limit = 20, now = new Date()) {
    return await NotificationOutbox.find({
      status: { $in: ['PENDING', 'PROCESSING'] },
      $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: now } }],
    })
      .sort({ createdAt: 1 })
      .limit(limit);
  }

  async updateEventStatus(id, status, errorReason = null, nextRetryAt = null) {
    const updates = { status, errorReason };
    if (status === 'PUBLISHED') {
      updates.processedAt = new Date();
    }
    if (nextRetryAt !== undefined) {
      updates.nextRetryAt = nextRetryAt;
    }
    if (errorReason) {
      updates.$inc = { retryCount: 1 };
    }

    return await NotificationOutbox.findByIdAndUpdate(id, updates, { new: true });
  }

  async findFailedEvents({ limit = 50, skip = 0 } = {}) {
    const [items, total] = await Promise.all([
      NotificationOutbox.find({ status: 'FAILED' })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      NotificationOutbox.countDocuments({ status: 'FAILED' }),
    ]);

    return { items, total };
  }
}

export const notificationOutboxRepository = new NotificationOutboxRepository();


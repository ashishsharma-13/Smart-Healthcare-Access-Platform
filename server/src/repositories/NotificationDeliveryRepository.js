import mongoose from 'mongoose';
import { NotificationDelivery } from '../models/NotificationDelivery.js';

export class NotificationDeliveryRepository {
  async create(data) {
    if (mongoose.connection.readyState !== 1) {
      return {
        _id: new mongoose.Types.ObjectId(),
        deliveryId: data.deliveryId || `DELIV-${Date.now().toString(36).toUpperCase()}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: async function () { return this; },
      };
    }
    const delivery = new NotificationDelivery(data);
    return await delivery.save();
  }

  async findById(id) {
    return await NotificationDelivery.findById(id).populate('notificationId');
  }

  async findByNotificationId(notificationId) {
    return await NotificationDelivery.find({ notificationId }).sort({ createdAt: -1 });
  }

  async findPendingOrRetryable(now = new Date(), limit = 50) {
    return await NotificationDelivery.find({
      status: { $in: ['PENDING', 'RETRY_PENDING'] },
      $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: now } }],
    })
      .sort({ createdAt: 1 })
      .limit(limit)
      .populate('notificationId');
  }

  async updateDelivery(id, updates) {
    return await NotificationDelivery.findByIdAndUpdate(id, updates, { new: true });
  }

  async findFailedDeliveries({ limit = 50, skip = 0 } = {}) {
    const [items, total] = await Promise.all([
      NotificationDelivery.find({ status: 'FAILED' })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'notificationId',
          populate: { path: 'recipientUserId', select: 'name email role' },
        }),
      NotificationDelivery.countDocuments({ status: 'FAILED' }),
    ]);

    return { items, total };
  }

  async getMetricsByChannel() {
    return await NotificationDelivery.aggregate([
      {
        $group: {
          _id: { channel: '$channel', status: '$status' },
          count: { $sum: 1 },
        },
      },
    ]);
  }
}

export const notificationDeliveryRepository = new NotificationDeliveryRepository();


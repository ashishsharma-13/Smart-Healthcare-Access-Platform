import mongoose from 'mongoose';
import { Notification } from '../models/Notification.js';

export class NotificationRepository {
  async create(data) {
    if (mongoose.connection.readyState !== 1) {
      return {
        _id: new mongoose.Types.ObjectId(),
        notificationId: data.notificationId || `NOTIF-${Date.now().toString(36).toUpperCase()}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: async function () { return this; },
      };
    }
    const notification = new Notification(data);
    return await notification.save();
  }

  async findById(id) {
    return await Notification.findById(id)
      .populate('recipientUserId', 'name email role phone')
      .populate('organizationId', 'name address phone')
      .populate('emergencyRequestId');
  }

  async findByNotificationId(notificationId) {
    return await Notification.findOne({ notificationId })
      .populate('recipientUserId', 'name email role phone')
      .populate('organizationId', 'name address phone')
      .populate('emergencyRequestId');
  }

  async findForUser(userId, { notificationType, priority, unreadOnly, limit = 50, skip = 0 } = {}) {
    const query = { recipientUserId: userId };
    if (notificationType) query.notificationType = notificationType;
    if (priority) query.priority = priority;
    if (unreadOnly) query.status = { $ne: 'READ' };

    return await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('organizationId', 'name address phone')
      .populate('emergencyRequestId', 'emergencyRequestId requestCode emergencyType status');
  }

  async findUnreadForUser(userId, limit = 20) {
    return await Notification.find({
      recipientUserId: userId,
      status: { $ne: 'READ' },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('organizationId', 'name')
      .populate('emergencyRequestId', 'emergencyRequestId requestCode status');
  }

  async countUnreadForUser(userId) {
    return await Notification.countDocuments({
      recipientUserId: userId,
      status: { $ne: 'READ' },
    });
  }

  async findForOrganization(organizationId, { unreadOnly, limit = 50, skip = 0 } = {}) {
    const query = { organizationId };
    if (unreadOnly) query.status = { $ne: 'READ' };

    return await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('recipientUserId', 'name role')
      .populate('emergencyRequestId', 'emergencyRequestId requestCode status');
  }

  async findUnreadForOrg(organizationId) {
    return await Notification.find({
      organizationId,
      status: { $ne: 'READ' },
    })
      .sort({ createdAt: -1 })
      .limit(20);
  }

  async markAsRead(idOrNotificationId, userId) {
    const query = {
      $or: [
        { _id: idOrNotificationId.match?.(/^[0-9a-fA-F]{24}$/) ? idOrNotificationId : null },
        { notificationId: idOrNotificationId },
      ].filter(Boolean),
    };

    if (userId) query.recipientUserId = userId;

    return await Notification.findOneAndUpdate(
      query,
      { status: 'READ', readAt: new Date() },
      { new: true }
    );
  }

  async markAllAsReadForUser(userId) {
    return await Notification.updateMany(
      { recipientUserId: userId, status: { $ne: 'READ' } },
      { $set: { status: 'READ', readAt: new Date() } }
    );
  }

  async markAsReadForOrg(idOrNotificationId, organizationId) {
    const query = {
      $or: [
        { _id: idOrNotificationId.match?.(/^[0-9a-fA-F]{24}$/) ? idOrNotificationId : null },
        { notificationId: idOrNotificationId },
      ].filter(Boolean),
      organizationId,
    };

    return await Notification.findOneAndUpdate(
      query,
      { status: 'READ', readAt: new Date() },
      { new: true }
    );
  }

  async updateStatus(id, status) {
    return await Notification.findByIdAndUpdate(id, { status }, { new: true });
  }

  async listAll({ limit = 50, skip = 0, status, priority, notificationType } = {}) {
    const query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (notificationType) query.notificationType = notificationType;

    const [items, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('recipientUserId', 'name email role')
        .populate('organizationId', 'name'),
      Notification.countDocuments(query),
    ]);

    return { items, total };
  }

  async getMetrics() {
    const [total, unread, failed, sent, delivered] = await Promise.all([
      Notification.countDocuments(),
      Notification.countDocuments({ status: { $ne: 'READ' } }),
      Notification.countDocuments({ status: 'FAILED' }),
      Notification.countDocuments({ status: 'SENT' }),
      Notification.countDocuments({ status: 'DELIVERED' }),
    ]);

    return {
      total,
      totalNotifications: total,
      unread,
      failed,
      sent,
      delivered,
      read: total - unread,
    };
  }
}

export const notificationRepository = new NotificationRepository();

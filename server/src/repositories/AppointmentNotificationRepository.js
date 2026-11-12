import { AppointmentNotification } from '../models/AppointmentNotification.js';

export class AppointmentNotificationRepository {
  async create(data) {
    const notif = new AppointmentNotification(data);
    return await notif.save();
  }

  async listByRecipient(recipientId) {
    return await AppointmentNotification.find({ recipientId })
      .populate('appointmentId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async listByAppointment(appointmentId) {
    return await AppointmentNotification.find({ appointmentId })
      .populate('recipientId', 'name email role')
      .sort({ createdAt: 1 })
      .exec();
  }
}

export const appointmentNotificationRepository = new AppointmentNotificationRepository();


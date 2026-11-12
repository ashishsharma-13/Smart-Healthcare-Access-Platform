import { AppointmentStatusHistory } from '../models/AppointmentStatusHistory.js';

export class AppointmentStatusHistoryRepository {
  async create(data) {
    const history = new AppointmentStatusHistory(data);
    return await history.save();
  }

  async listByAppointment(appointmentId) {
    return await AppointmentStatusHistory.find({ appointmentId })
      .populate('changedBy', 'name email role')
      .sort({ changedAt: 1 })
      .exec();
  }
}

export const appointmentStatusHistoryRepository = new AppointmentStatusHistoryRepository();


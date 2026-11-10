import { Appointment } from '../models/index.js';

export class AppointmentRepository {
  async findById(id) {
    return await Appointment.findById(id)
      .populate('patientId', 'name email phone avatar')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email phone avatar' },
      })
      .populate('organizationId', 'name address emergencyContactPhone')
      .exec();
  }

  async findBySlot(doctorId, slotDate, slotTime) {
    return await Appointment.findOne({
      doctorId,
      slotDate,
      slotTime,
      status: { $in: ['booked', 'rescheduled'] },
    }).exec();
  }

  async create(appointmentData) {
    const apt = new Appointment(appointmentData);
    return await apt.save();
  }

  async updateById(id, updateData) {
    return await Appointment.findByIdAndUpdate(id, updateData, { new: true })
      .populate('patientId', 'name email phone')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email' },
      })
      .populate('organizationId', 'name address')
      .exec();
  }

  async listForPatient(patientId) {
    return await Appointment.find({ patientId })
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email avatar' },
      })
      .populate('organizationId', 'name address')
      .sort({ slotDate: -1, slotTime: 1 })
      .exec();
  }

  async listForDoctor(doctorId, dateFilter = null) {
    const query = { doctorId };
    if (dateFilter) {
      query.slotDate = dateFilter;
    }
    return await Appointment.find(query)
      .populate('patientId', 'name email phone avatar')
      .populate('organizationId', 'name address')
      .sort({ slotDate: 1, slotTime: 1 })
      .exec();
  }

  async listForOrganization(organizationId) {
    return await Appointment.find({ organizationId })
      .populate('patientId', 'name email phone')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email' },
      })
      .sort({ slotDate: 1, slotTime: 1 })
      .exec();
  }
}

export const appointmentRepository = new AppointmentRepository();


import mongoose from 'mongoose';
import { Appointment } from '../models/index.js';

export class AppointmentRepository {
  async findById(id) {
    if (!id) return null;
    let query;
    if (mongoose.Types.ObjectId.isValid(id) && String(id).length === 24) {
      query = { $or: [{ _id: id }, { appointmentNumber: id }, { appointmentId: id }, { qrToken: id }] };
    } else {
      query = { $or: [{ appointmentNumber: id }, { appointmentId: id }, { qrToken: id }] };
    }

    return await Appointment.findOne(query)
      .populate('patientId', 'name email phone avatar')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email phone avatar' },
      })
      .populate('organizationId', 'name address emergencyContactPhone verificationStatus')
      .populate('affiliationId', 'department designation status')
      .populate('rescheduledFromId', 'appointmentNumber appointmentId slotDate slotTime status')
      .populate('cancelledBy', 'name email role')
      .exec();
  }

  async findBySlot(doctorId, slotDate, slotTime) {
    return await Appointment.findOne({
      doctorId,
      slotDate,
      slotTime,
      status: { $in: ['CONFIRMED', 'booked', 'RESCHEDULED', 'rescheduled'] },
    }).exec();
  }

  async findDoctorConflictingAppointment(doctorId, slotDate, slotTime, excludeAppointmentId = null) {
    const query = {
      doctorId,
      slotDate,
      slotTime,
      status: { $in: ['CONFIRMED', 'booked'] },
    };
    if (excludeAppointmentId) {
      query._id = { $ne: excludeAppointmentId };
    }
    return await Appointment.findOne(query)
      .populate('organizationId', 'name')
      .exec();
  }

  async findPatientConflictingAppointment(patientId, slotDate, slotTime, excludeAppointmentId = null) {
    const query = {
      patientId,
      slotDate,
      slotTime,
      status: { $in: ['CONFIRMED', 'booked'] },
    };
    if (excludeAppointmentId) {
      query._id = { $ne: excludeAppointmentId };
    }
    return await Appointment.findOne(query)
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name' },
      })
      .populate('organizationId', 'name')
      .exec();
  }

  async create(appointmentData) {
    const apt = new Appointment(appointmentData);
    return await apt.save();
  }

  async updateById(id, updateData) {
    if (!id) return null;
    let query;
    if (mongoose.Types.ObjectId.isValid(id) && String(id).length === 24) {
      query = { $or: [{ _id: id }, { appointmentNumber: id }, { appointmentId: id }, { qrToken: id }] };
    } else {
      query = { $or: [{ appointmentNumber: id }, { appointmentId: id }, { qrToken: id }] };
    }

    return await Appointment.findOneAndUpdate(
      query,
      { $set: updateData, $inc: { version: 1 } },
      { new: true }
    )
      .populate('patientId', 'name email phone')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email' },
      })
      .populate('organizationId', 'name address')
      .populate('affiliationId', 'department designation status')
      .populate('rescheduledFromId', 'appointmentNumber appointmentId slotDate slotTime status')
      .exec();
  }

  async listForPatient(patientId, filter = {}) {
    const query = { patientId };
    if (filter.status) {
      if (Array.isArray(filter.status)) {
        query.status = { $in: filter.status };
      } else {
        query.status = filter.status;
      }
    }

    return await Appointment.find(query)
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email avatar' },
      })
      .populate('organizationId', 'name address')
      .populate('affiliationId', 'department designation')
      .sort({ slotDate: -1, slotTime: 1 })
      .exec();
  }

  async listForDoctor(doctorId, options = null) {
    const query = { doctorId };
    if (typeof options === 'string') {
      // Legacy backwards-compatibility: options was dateFilter
      query.slotDate = options;
    } else if (options && typeof options === 'object') {
      if (options.date) query.slotDate = options.date;
      if (options.status) {
        query.status = Array.isArray(options.status) ? { $in: options.status } : options.status;
      }
      if (options.organizationId) query.organizationId = options.organizationId;
    }

    return await Appointment.find(query)
      .populate('patientId', 'name email phone avatar')
      .populate('organizationId', 'name address')
      .populate('affiliationId', 'department designation')
      .sort({ slotDate: 1, slotTime: 1 })
      .exec();
  }

  async listForOrganization(organizationId, options = null) {
    const query = { organizationId };
    if (options && typeof options === 'object') {
      if (options.doctorId) query.doctorId = options.doctorId;
      if (options.date) query.slotDate = options.date;
      if (options.status) {
        query.status = Array.isArray(options.status) ? { $in: options.status } : options.status;
      }
    }

    return await Appointment.find(query)
      .populate('patientId', 'name email phone')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email' },
      })
      .populate('affiliationId', 'department designation')
      .sort({ slotDate: 1, slotTime: 1 })
      .exec();
  }

  async listAll(filter = {}, options = {}) {
    const sort = options.sort || { createdAt: -1 };
    const limit = options.limit || 50;
    const skip = options.skip || 0;

    return await Appointment.find(filter)
      .populate('patientId', 'name email phone')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email' },
      })
      .populate('organizationId', 'name address')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async count(filter = {}) {
    return await Appointment.countDocuments(filter);
  }
}

export const appointmentRepository = new AppointmentRepository();

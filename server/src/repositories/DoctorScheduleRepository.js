import { DoctorSchedule } from '../models/DoctorSchedule.js';

export class DoctorScheduleRepository {
  async create(data) {
    const schedule = new DoctorSchedule(data);
    return await schedule.save();
  }

  async findById(id) {
    return await DoctorSchedule.findById(id)
      .populate('doctorId', 'userId doctorUniqueId specialization')
      .populate('organizationId', 'name uniqueOrganizationCode verificationStatus address')
      .populate('affiliationId', 'department designation status')
      .populate('facilityId')
      .exec();
  }

  async findByScheduleId(scheduleId) {
    return await DoctorSchedule.findOne({ scheduleId })
      .populate('doctorId', 'userId doctorUniqueId specialization')
      .populate('organizationId', 'name uniqueOrganizationCode verificationStatus address')
      .populate('affiliationId', 'department designation status')
      .exec();
  }

  async listByDoctor(doctorId, filter = {}) {
    const query = { doctorId, ...filter };
    return await DoctorSchedule.find(query)
      .populate('organizationId', 'name legalName uniqueOrganizationCode address orgType')
      .populate('affiliationId', 'department designation status')
      .populate('facilityId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async listActiveSchedulesForDoctor(doctorId) {
    return await DoctorSchedule.find({
      doctorId,
      status: 'ACTIVE',
    })
      .populate('organizationId', 'name uniqueOrganizationCode')
      .populate('affiliationId', 'status')
      .exec();
  }

  async listByAffiliation(affiliationId, filter = {}) {
    const query = { affiliationId, ...filter };
    return await DoctorSchedule.find(query)
      .populate('doctorId', 'userId doctorUniqueId specialization')
      .populate('facilityId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateById(id, updateData) {
    return await DoctorSchedule.findByIdAndUpdate(
      id,
      { $set: updateData, $inc: { version: 1 } },
      { new: true }
    )
      .populate('organizationId', 'name uniqueOrganizationCode')
      .populate('affiliationId', 'department designation status')
      .exec();
  }

  async addBreak(scheduleId, breakData) {
    return await DoctorSchedule.findByIdAndUpdate(
      scheduleId,
      { $push: { breaks: breakData }, $inc: { version: 1 } },
      { new: true }
    );
  }

  async deactivate(id) {
    return await DoctorSchedule.findByIdAndUpdate(
      id,
      { $set: { status: 'INACTIVE' }, $inc: { version: 1 } },
      { new: true }
    );
  }
}

export const doctorScheduleRepository = new DoctorScheduleRepository();


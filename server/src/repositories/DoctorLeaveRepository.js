import { DoctorLeave } from '../models/DoctorLeave.js';

export class DoctorLeaveRepository {
  async create(data) {
    const leave = new DoctorLeave(data);
    return await leave.save();
  }

  async findById(id) {
    return await DoctorLeave.findById(id).exec();
  }

  async listByDoctor(doctorId, filter = {}) {
    const query = { doctorId, ...filter };
    return await DoctorLeave.find(query).sort({ startDate: -1 }).exec();
  }

  async findLeavesForDoctorAndDate(doctorId, dateString) {
    return await DoctorLeave.find({
      doctorId,
      status: { $in: ['APPROVED', 'PENDING'] },
      startDate: { $lte: dateString },
      endDate: { $gte: dateString },
    }).exec();
  }

  async updateStatus(id, status) {
    return await DoctorLeave.findByIdAndUpdate(id, { $set: { status } }, { new: true }).exec();
  }
}

export const doctorLeaveRepository = new DoctorLeaveRepository();


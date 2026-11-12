import { DoctorPresenceLog } from '../models/index.js';

export class DoctorPresenceRepository {
  async logPresence(logData) {
    const log = new DoctorPresenceLog(logData);
    return await log.save();
  }

  async findById(id) {
    return await DoctorPresenceLog.findById(id)
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email phone avatar' },
      })
      .populate('organizationId', 'name legalName uniqueOrganizationCode address orgType')
      .populate('affiliationId', 'department designation status')
      .populate('facilityId')
      .exec();
  }

  async findByPresenceId(presenceId) {
    return await DoctorPresenceLog.findOne({ presenceId })
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email phone avatar' },
      })
      .populate('organizationId', 'name legalName uniqueOrganizationCode address')
      .populate('affiliationId', 'department designation status')
      .exec();
  }

  async findActivePresence(doctorId) {
    return await DoctorPresenceLog.findOne({
      doctorId,
      status: 'CHECKED_IN',
    })
      .populate('organizationId', 'name legalName uniqueOrganizationCode address')
      .populate('affiliationId', 'department designation status')
      .populate('facilityId')
      .sort({ checkInAt: -1, createdAt: -1 })
      .exec();
  }

  async updateById(id, updateData) {
    return await DoctorPresenceLog.findByIdAndUpdate(id, updateData, { new: true })
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email phone avatar' },
      })
      .populate('organizationId', 'name legalName uniqueOrganizationCode address')
      .populate('affiliationId', 'department designation status')
      .exec();
  }

  async getDoctorHistory(doctorId, filter = {}, limit = 50) {
    const query = { doctorId, ...filter };
    return await DoctorPresenceLog.find(query)
      .populate('organizationId', 'name legalName uniqueOrganizationCode address orgType')
      .populate('affiliationId', 'department designation status')
      .populate('facilityId')
      .sort({ checkInAt: -1, timestamp: -1, createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getOrganizationPresenceLogs(organizationId, filter = {}, limit = 50) {
    const query = { organizationId, ...filter };
    return await DoctorPresenceLog.find(query)
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email phone avatar' },
      })
      .populate('affiliationId', 'department designation status')
      .populate('facilityId')
      .sort({ checkInAt: -1, timestamp: -1, createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async listAll(filter = {}, { page = 1, limit = 50 } = {}) {
    const skip = (page - 1) * limit;
    return await DoctorPresenceLog.find(filter)
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email phone avatar' },
      })
      .populate('organizationId', 'name legalName uniqueOrganizationCode address')
      .populate('affiliationId', 'department designation status')
      .sort({ checkInAt: -1, timestamp: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async count(filter = {}) {
    return await DoctorPresenceLog.countDocuments(filter).exec();
  }
}

export const doctorPresenceRepository = new DoctorPresenceRepository();

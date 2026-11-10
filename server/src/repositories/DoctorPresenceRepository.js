import { DoctorPresenceLog } from '../models/index.js';

export class DoctorPresenceRepository {
  async logPresence(logData) {
    const log = new DoctorPresenceLog(logData);
    return await log.save();
  }

  async getDoctorHistory(doctorId, limit = 20) {
    return await DoctorPresenceLog.find({ doctorId })
      .populate('organizationId', 'name address')
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  async getOrganizationPresenceLogs(organizationId, limit = 20) {
    return await DoctorPresenceLog.find({ organizationId })
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email phone avatar' },
      })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }
}

export const doctorPresenceRepository = new DoctorPresenceRepository();


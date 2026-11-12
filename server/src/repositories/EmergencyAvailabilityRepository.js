import { EmergencyAvailability } from '../models/EmergencyAvailability.js';

export class EmergencyAvailabilityRepository {
  async create(data) {
    const avail = new EmergencyAvailability(data);
    return await avail.save();
  }

  async findById(id) {
    return await EmergencyAvailability.findById(id)
      .populate('doctorId', 'userId doctorUniqueId specialization')
      .populate('organizationId', 'name uniqueOrganizationCode')
      .populate('affiliationId')
      .exec();
  }

  async findByAffiliation(affiliationId) {
    return await EmergencyAvailability.findOne({ affiliationId, status: { $ne: 'INACTIVE' } })
      .populate('organizationId', 'name uniqueOrganizationCode')
      .exec();
  }

  async listByDoctor(doctorId, filter = {}) {
    const query = { doctorId, ...filter };
    return await EmergencyAvailability.find(query)
      .populate('organizationId', 'name uniqueOrganizationCode')
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateById(id, updateData) {
    return await EmergencyAvailability.findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .populate('organizationId', 'name uniqueOrganizationCode')
      .exec();
  }
}

export const emergencyAvailabilityRepository = new EmergencyAvailabilityRepository();


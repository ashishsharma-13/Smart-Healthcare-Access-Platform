import { Organization } from '../models/index.js';

export class OrganizationRepository {
  async findByUserId(userId) {
    return await Organization.findOne({ userId }).populate('userId', 'name email phone').exec();
  }

  async findById(id) {
    return await Organization.findById(id).populate('userId', 'name email phone').exec();
  }

  async findByQrCode(qrCheckinCode) {
    return await Organization.findOne({ qrCheckinCode }).exec();
  }

  async create(orgData) {
    const org = new Organization(orgData);
    return await org.save();
  }

  async updateById(id, updateData) {
    return await Organization.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async listAll(filter = {}) {
    return await Organization.find(filter).populate('userId', 'name email phone').sort({ name: 1 }).exec();
  }

  async findNearby(coordinates, maxDistanceMeters = 50000, filter = {}) {
    return await Organization.find({
      ...filter,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: coordinates, // [lng, lat]
          },
          $maxDistance: maxDistanceMeters,
        },
      },
    }).populate('userId', 'name email phone').exec();
  }

  async listPendingVerifications() {
    return await Organization.find({ verificationStatus: 'pending' })
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 })
      .exec();
  }
}

export const organizationRepository = new OrganizationRepository();


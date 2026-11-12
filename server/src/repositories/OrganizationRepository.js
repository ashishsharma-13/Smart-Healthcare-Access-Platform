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

  async findByRegistrationNumber(registrationNumber) {
    if (!registrationNumber) return null;
    return await Organization.findOne({ registrationNumber: String(registrationNumber).trim() })
      .populate('userId', 'name email phone')
      .exec();
  }

  async findByApplicationReference(applicationReference) {
    if (!applicationReference) return null;
    return await Organization.findOne({ applicationReference: String(applicationReference).trim() })
      .populate('userId', 'name email phone')
      .exec();
  }

  async findByUniqueCode(uniqueOrganizationCode) {
    if (!uniqueOrganizationCode) return null;
    return await Organization.findOne({ uniqueOrganizationCode: String(uniqueOrganizationCode).trim() })
      .populate('userId', 'name email phone')
      .exec();
  }

  async listPendingVerifications() {
    return await Organization.find({
      verificationStatus: { $in: ['pending', 'PENDING_VERIFICATION'] },
    })
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 })
      .exec();
  }

  async listVerifiedOrganizations() {
    return await Organization.find({
      verificationStatus: { $in: ['verified', 'VERIFIED', 'approved', 'APPROVED'] },
    })
      .populate('userId', 'name email phone')
      .sort({ updatedAt: -1 })
      .exec();
  }

  async listRejectedOrganizations() {
    return await Organization.find({
      verificationStatus: { $in: ['rejected', 'REJECTED'] },
    })
      .populate('userId', 'name email phone')
      .sort({ updatedAt: -1 })
      .exec();
  }
}

export const organizationRepository = new OrganizationRepository();


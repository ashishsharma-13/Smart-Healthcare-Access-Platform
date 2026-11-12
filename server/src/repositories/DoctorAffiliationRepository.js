import { DoctorAffiliation } from '../models/DoctorAffiliation.js';

export class DoctorAffiliationRepository {
  async create(data) {
    const affiliation = new DoctorAffiliation(data);
    return await affiliation.save();
  }

  async findById(id) {
    return await DoctorAffiliation.findById(id)
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email phone avatar' },
      })
      .populate({
        path: 'organizationId',
        populate: { path: 'userId', select: 'name email phone' },
      })
      .populate('organizationApproval.reviewedBy', 'name email role')
      .populate('terminationDetails.initiatedByUserId', 'name role')
      .exec();
  }

  async findByAffiliationId(affiliationId) {
    return await DoctorAffiliation.findOne({ affiliationId })
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email phone avatar' },
      })
      .populate({
        path: 'organizationId',
        populate: { path: 'userId', select: 'name email phone' },
      })
      .exec();
  }

  async findActiveOrPending(doctorId, organizationId) {
    return await DoctorAffiliation.findOne({
      doctorId,
      organizationId,
      status: {
        $in: [
          'PENDING',
          'ACTIVE',
          'TERMINATION_REQUESTED',
          'pending',
          'approved',
        ],
      },
    }).exec();
  }

  async findActiveAffiliation(doctorId, organizationId) {
    return await DoctorAffiliation.findOne({
      doctorId,
      organizationId,
      status: { $in: ['ACTIVE', 'approved'] },
    }).exec();
  }

  async listByDoctor(doctorId, filter = {}) {
    const query = { doctorId, ...filter };
    return await DoctorAffiliation.find(query)
      .populate('organizationId', 'name legalName orgType registrationNumber verificationStatus address location emergencyContactPhone rating facilities qrCheckinCode uniqueOrganizationCode')
      .populate('facilityId')
      .sort({ updatedAt: -1 })
      .exec();
  }

  async listByOrganization(organizationId, filter = {}) {
    const query = { organizationId, ...filter };
    return await DoctorAffiliation.find(query)
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email phone avatar' },
      })
      .populate('facilityId')
      .sort({ updatedAt: -1 })
      .exec();
  }

  async listAll(filter = {}) {
    return await DoctorAffiliation.find(filter)
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email phone' },
      })
      .populate('organizationId', 'name legalName orgType verificationStatus address uniqueOrganizationCode')
      .populate('facilityId')
      .sort({ updatedAt: -1 })
      .exec();
  }

  async updateById(id, updateData) {
    return await DoctorAffiliation.findByIdAndUpdate(id, updateData, { new: true })
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email phone avatar' },
      })
      .populate('organizationId', 'name orgType verificationStatus address location emergencyContactPhone')
      .exec();
  }

  async updateStatus(id, newStatus, extra = {}) {
    return await DoctorAffiliation.findByIdAndUpdate(
      id,
      { $set: { status: newStatus, ...extra } },
      { new: true }
    )
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email phone avatar' },
      })
      .populate('organizationId', 'name orgType verificationStatus address location emergencyContactPhone')
      .exec();
  }
}

export const doctorAffiliationRepository = new DoctorAffiliationRepository();

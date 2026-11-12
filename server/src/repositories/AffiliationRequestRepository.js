import { AffiliationRequest } from '../models/AffiliationRequest.js';

export class AffiliationRequestRepository {
  async create(data) {
    const req = new AffiliationRequest(data);
    return await req.save();
  }

  async findById(id) {
    return await AffiliationRequest.findById(id)
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email phone avatar' },
      })
      .populate({
        path: 'organizationId',
        populate: { path: 'userId', select: 'name email phone' },
      })
      .populate('requestedBy', 'name email role')
      .populate('facilityId')
      .exec();
  }

  async findByRequestId(requestId) {
    return await AffiliationRequest.findOne({ requestId })
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email phone avatar' },
      })
      .populate({
        path: 'organizationId',
        populate: { path: 'userId', select: 'name email phone' },
      })
      .populate('requestedBy', 'name email role')
      .exec();
  }

  async findPendingByDoctorAndOrg(doctorId, organizationId) {
    return await AffiliationRequest.findOne({
      doctorId,
      organizationId,
      status: 'PENDING',
    }).exec();
  }

  async listByDoctor(doctorId, filter = {}) {
    const query = { doctorId, ...filter };
    return await AffiliationRequest.find(query)
      .populate('organizationId', 'name legalName orgType registrationNumber verificationStatus address location emergencyContactPhone rating facilities qrCheckinCode uniqueOrganizationCode')
      .populate('facilityId')
      .populate('requestedBy', 'name email role')
      .sort({ createdAt: -1 })
      .exec();
  }

  async listByOrganization(organizationId, filter = {}) {
    const query = { organizationId, ...filter };
    return await AffiliationRequest.find(query)
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email phone avatar' },
      })
      .populate('facilityId')
      .populate('requestedBy', 'name email role')
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateById(id, updateData) {
    return await AffiliationRequest.findByIdAndUpdate(id, updateData, { new: true })
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email phone avatar' },
      })
      .populate('organizationId', 'name legalName orgType verificationStatus address location uniqueOrganizationCode')
      .populate('requestedBy', 'name email role')
      .exec();
  }
}

export const affiliationRequestRepository = new AffiliationRequestRepository();


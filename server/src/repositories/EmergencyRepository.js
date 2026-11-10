import { EmergencyRequest, EmergencyBroadcast } from '../models/index.js';

export class EmergencyRepository {
  async createRequest(data) {
    const req = new EmergencyRequest(data);
    return await req.save();
  }

  async findRequestById(id) {
    return await EmergencyRequest.findById(id)
      .populate('patientId', 'name email phone avatar')
      .populate('selectedOrganizationId', 'name address location emergencyContactPhone')
      .populate('statusHistory.updatedBy', 'name role')
      .exec();
  }

  async updateRequestStatus(id, newStatus, notes = '', updatedBy = null) {
    return await EmergencyRequest.findByIdAndUpdate(
      id,
      {
        $set: { status: newStatus },
        $push: {
          statusHistory: {
            status: newStatus,
            timestamp: new Date(),
            notes,
            updatedBy,
          },
        },
      },
      { new: true }
    )
      .populate('patientId', 'name email phone')
      .populate('selectedOrganizationId', 'name address location emergencyContactPhone')
      .exec();
  }

  async selectDestination(id, organizationId) {
    return await EmergencyRequest.findByIdAndUpdate(
      id,
      {
        $set: {
          selectedOrganizationId: organizationId,
          status: 'DESTINATION_SELECTED',
          destinationConfirmedAt: new Date(),
        },
        $push: {
          statusHistory: {
            status: 'DESTINATION_SELECTED',
            timestamp: new Date(),
            notes: 'Destination selected by patient/dispatcher',
          },
        },
      },
      { new: true }
    )
      .populate('patientId', 'name email phone')
      .populate('selectedOrganizationId', 'name address location emergencyContactPhone')
      .exec();
  }

  async listRequestsForPatient(patientId) {
    return await EmergencyRequest.find({ patientId })
      .populate('selectedOrganizationId', 'name address emergencyContactPhone')
      .sort({ createdAt: -1 })
      .exec();
  }

  async listAllRequests(filter = {}) {
    return await EmergencyRequest.find(filter)
      .populate('patientId', 'name email phone')
      .populate('selectedOrganizationId', 'name address')
      .sort({ createdAt: -1 })
      .exec();
  }

  // Emergency Broadcast Methods
  async createBroadcasts(broadcastRecords) {
    return await EmergencyBroadcast.insertMany(broadcastRecords);
  }

  async getBroadcastsForRequest(emergencyRequestId) {
    return await EmergencyBroadcast.find({ emergencyRequestId })
      .populate('organizationId', 'name address location emergencyContactPhone rating facilities')
      .sort({ suitabilityScore: -1, distanceKm: 1 })
      .exec();
  }

  async getBroadcastForOrg(emergencyRequestId, organizationId) {
    return await EmergencyBroadcast.findOne({ emergencyRequestId, organizationId }).exec();
  }

  async updateBroadcastResponse(emergencyRequestId, organizationId, status, offeredResources = {}, declineReason = '') {
    return await EmergencyBroadcast.findOneAndUpdate(
      { emergencyRequestId, organizationId },
      {
        $set: {
          responseStatus: status,
          respondedAt: new Date(),
          offeredResources,
          declineReason,
        },
      },
      { new: true }
    ).populate('organizationId', 'name address location emergencyContactPhone rating');
  }

  async listActiveBroadcastsForOrg(organizationId) {
    return await EmergencyBroadcast.find({
      organizationId,
      $or: [
        { responseStatus: { $in: ['PENDING', 'ACCEPTED'] } },
        { status: 'active' },
      ],
    })
      .populate({
        path: 'emergencyRequestId',
        populate: { path: 'patientId', select: 'name email phone' },
      })
      .populate('organizationId', 'name address location emergencyContactPhone rating')
      .sort({ createdAt: -1 })
      .exec();
  }
}

export const emergencyRepository = new EmergencyRepository();

import mongoose from 'mongoose';
import { EmergencyRequest, EmergencyBroadcast, EmergencyRequestEvent, EmergencyCategory } from '../models/index.js';

export class EmergencyRepository {
  async createRequest(data) {
    const req = new EmergencyRequest(data);
    return await req.save();
  }

  async findRequestById(id) {
    if (!id) return null;
    const strId = String(id._id || id);
    const isObjectId = mongoose.Types.ObjectId.isValid(strId) && strId.length === 24;
    const query = isObjectId
      ? { $or: [{ _id: strId }, { requestCode: strId }, { emergencyRequestId: strId }] }
      : { $or: [{ requestCode: strId }, { emergencyRequestId: strId }] };

    return await EmergencyRequest.findOne(query)
      .populate('patientId', 'name email phone avatar')
      .populate('reportedByUserId', 'name email phone')
      .populate('emergencyCategoryId', 'categoryName slug icon description active')
      .populate('selectedOrganizationId', 'name address location emergencyContactPhone')
      .populate('statusHistory.updatedBy', 'name role')
      .exec();
  }

  async createEvent(eventData) {
    const event = new EmergencyRequestEvent(eventData);
    return await event.save();
  }

  async getEventsForRequest(emergencyRequestId) {
    return await EmergencyRequestEvent.find({ emergencyRequestId })
      .populate('actorId', 'name email role')
      .sort({ createdAt: 1 })
      .exec();
  }

  async updateRequestStatus(id, newStatus, notes = '', updatedBy = null) {
    const req = await this.findRequestById(id);
    if (!req) return null;

    const previousStatus = req.status;

    const updated = await EmergencyRequest.findByIdAndUpdate(
      req._id,
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
      .populate('reportedByUserId', 'name email phone')
      .populate('emergencyCategoryId', 'categoryName slug icon description active')
      .populate('selectedOrganizationId', 'name address location emergencyContactPhone')
      .exec();

    // Log event
    await this.createEvent({
      emergencyRequestId: req._id,
      eventType: newStatus === 'CANCELLED' ? 'REQUEST_CANCELLED' : 'STATUS_UPDATED',
      previousState: previousStatus,
      newState: newStatus,
      actorId: updatedBy,
      metadata: { notes },
    });

    return updated;
  }

  async cancelEmergencyRequest(id, actorId, reason = '') {
    const req = await this.findRequestById(id);
    if (!req) return null;

    const previousStatus = req.status;

    const updated = await EmergencyRequest.findByIdAndUpdate(
      req._id,
      {
        $set: {
          status: 'CANCELLED',
          cancellationReason: reason,
          cancelledAt: new Date(),
        },
        $push: {
          statusHistory: {
            status: 'CANCELLED',
            timestamp: new Date(),
            notes: reason || 'Cancelled by user',
            updatedBy: actorId,
          },
        },
      },
      { new: true }
    )
      .populate('patientId', 'name email phone')
      .populate('reportedByUserId', 'name email phone')
      .populate('emergencyCategoryId', 'categoryName slug icon description active')
      .populate('selectedOrganizationId', 'name address location emergencyContactPhone')
      .exec();

    // Record Event
    await this.createEvent({
      emergencyRequestId: req._id,
      eventType: 'REQUEST_CANCELLED',
      previousState: previousStatus,
      newState: 'CANCELLED',
      actorId,
      metadata: { reason },
    });

    return updated;
  }

  async selectDestination(id, organizationId) {
    const req = await this.findRequestById(id);
    if (!req) return null;

    return await EmergencyRequest.findByIdAndUpdate(
      req._id,
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
    return await EmergencyRequest.find({
      $or: [{ patientId }, { reportedByUserId: patientId }],
    })
      .populate('emergencyCategoryId', 'categoryName slug icon description')
      .populate('selectedOrganizationId', 'name address emergencyContactPhone')
      .sort({ createdAt: -1 })
      .exec();
  }

  async listAllRequests(filter = {}) {
    return await EmergencyRequest.find(filter)
      .populate('patientId', 'name email phone')
      .populate('emergencyCategoryId', 'categoryName slug icon')
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

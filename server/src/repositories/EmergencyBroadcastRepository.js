import mongoose from 'mongoose';
import {
  EmergencyBroadcast,
  EmergencyBroadcastRecipient,
  EmergencyOrganizationResponse,
} from '../models/index.js';

export class EmergencyBroadcastRepository {
  async createBroadcastSession(data) {
    const broadcast = new EmergencyBroadcast(data);
    return await broadcast.save();
  }

  async findBroadcastById(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    return await EmergencyBroadcast.findById(id).exec();
  }

  async findActiveBroadcastForRequest(emergencyRequestId) {
    if (!emergencyRequestId) return null;
    const sessionBroadcast = await EmergencyBroadcast.findOne({
      emergencyRequestId,
      broadcastStatus: 'ACTIVE',
      organizationId: null,
    })
      .sort({ broadcastRound: -1, createdAt: -1 })
      .exec();

    if (sessionBroadcast) return sessionBroadcast;

    return await EmergencyBroadcast.findOne({
      emergencyRequestId,
      broadcastStatus: 'ACTIVE',
    })
      .sort({ broadcastRound: -1, createdAt: -1 })
      .exec();
  }

  async createRecipients(recipientRecords) {
    if (!Array.isArray(recipientRecords) || recipientRecords.length === 0) return [];
    return await EmergencyBroadcastRecipient.insertMany(recipientRecords);
  }

  async findRecipientById(recipientId) {
    if (!recipientId) return null;
    const str = String(recipientId);
    const isObjectId = mongoose.Types.ObjectId.isValid(str) && str.length === 24;
    const query = isObjectId ? { $or: [{ _id: str }, { recipientId: str }] } : { recipientId: str };

    return await EmergencyBroadcastRecipient.findOne(query)
      .populate('organizationId', 'name operatingAddress location emergencyContactPhone rating facilities')
      .populate('broadcastId')
      .populate({
        path: 'emergencyRequestId',
        populate: [
          { path: 'patientId', select: 'name email phone' },
          { path: 'emergencyCategoryId', select: 'categoryName slug icon' },
        ],
      })
      .exec();
  }

  async findRecipientByOrgAndRequest(organizationId, emergencyRequestId) {
    if (!organizationId || !emergencyRequestId) return null;
    return await EmergencyBroadcastRecipient.findOne({
      organizationId,
      emergencyRequestId,
    })
      .sort({ createdAt: -1 })
      .exec();
  }

  async listRecipientsForBroadcast(broadcastId) {
    return await EmergencyBroadcastRecipient.find({ broadcastId })
      .populate('organizationId', 'name operatingAddress location emergencyContactPhone rating facilities slug')
      .populate('responseBy', 'name email role')
      .sort({ suitabilityScore: -1, distanceKm: 1 })
      .exec();
  }

  async listRecipientsForRequest(emergencyRequestId) {
    return await EmergencyBroadcastRecipient.find({ emergencyRequestId })
      .populate('organizationId', 'name operatingAddress location emergencyContactPhone rating facilities slug')
      .populate('responseBy', 'name email role')
      .sort({ createdAt: -1, suitabilityScore: -1 })
      .exec();
  }

  async listIncomingForOrg(organizationId) {
    const now = new Date();
    return await EmergencyBroadcastRecipient.find({
      organizationId,
      responseStatus: 'PENDING',
    })
      .populate({
        path: 'broadcastId',
        match: {
          broadcastStatus: 'ACTIVE',
          $or: [{ responseDeadline: { $gt: now } }, { responseDeadline: null }],
        },
      })
      .populate({
        path: 'emergencyRequestId',
        match: { status: { $in: ['BROADCASTED', 'RESPONSES_RECEIVED', 'PENDING', 'pending'] } },
        populate: [
          { path: 'patientId', select: 'name email phone' },
          { path: 'emergencyCategoryId', select: 'categoryName slug icon' },
        ],
      })
      .populate('organizationId', 'name operatingAddress location emergencyContactPhone rating')
      .sort({ createdAt: -1 })
      .exec()
      .then((recipients) => recipients.filter((r) => r.broadcastId && r.emergencyRequestId));
  }

  async listHistoryForOrg(organizationId) {
    return await EmergencyBroadcastRecipient.find({ organizationId })
      .populate({
        path: 'emergencyRequestId',
        populate: [
          { path: 'patientId', select: 'name email phone' },
          { path: 'emergencyCategoryId', select: 'categoryName slug icon' },
        ],
      })
      .populate('broadcastId')
      .populate('responseBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();
  }

  async updateDeliveryStatus(recipientId, deliveryStatus, fields = {}) {
    return await EmergencyBroadcastRecipient.findByIdAndUpdate(
      recipientId,
      {
        $set: {
          deliveryStatus,
          ...fields,
        },
      },
      { new: true }
    ).exec();
  }

  /**
   * ATOMIC CONDITIONAL UPDATE:
   * Only transitions if responseStatus is currently 'PENDING'.
   * Prevents race conditions, concurrent double-responses, and duplicate clicks.
   */
  async recordAtomicResponse({
    recipientId,
    organizationId,
    userId,
    responseType,
    declineReason = '',
    offeredResources = {},
    ipAddress = '',
  }) {
    const normalizedType = responseType === 'REJECT' ? 'DECLINE' : responseType;
    const responseStatus = normalizedType === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED';
    const now = new Date();

    const strId = String(recipientId);
    const isObjectId = mongoose.Types.ObjectId.isValid(strId) && strId.length === 24;
    const query = isObjectId
      ? { _id: strId, organizationId, responseStatus: 'PENDING' }
      : { recipientId: strId, organizationId, responseStatus: 'PENDING' };

    // 1. Atomic conditional update on the recipient record
    const updatedRecipient = await EmergencyBroadcastRecipient.findOneAndUpdate(
      query,
      {
        $set: {
          responseStatus,
          respondedAt: now,
          responseBy: userId,
          declineReason: normalizedType === 'DECLINE' ? declineReason : '',
          offeredResources: normalizedType === 'ACCEPT' ? offeredResources : {},
        },
      },
      { new: true }
    )
      .populate('organizationId', 'name operatingAddress location emergencyContactPhone rating')
      .populate('emergencyRequestId')
      .populate('broadcastId');

    if (!updatedRecipient) {
      return null; // Already responded, wrong org, or not found
    }

    // 2. Insert immutable audit response record
    const responseAudit = new EmergencyOrganizationResponse({
      recipientId: updatedRecipient._id,
      broadcastId: updatedRecipient.broadcastId?._id || updatedRecipient.broadcastId,
      emergencyRequestId: updatedRecipient.emergencyRequestId?._id || updatedRecipient.emergencyRequestId,
      organizationId,
      responseType: normalizedType,
      responseReason: declineReason,
      offeredResources,
      respondedBy: userId,
      respondedAt: now,
      ipAddress,
    });
    await responseAudit.save();

    // 3. Increment counters on broadcast document
    const incField = normalizedType === 'ACCEPT' ? { acceptedCount: 1 } : { declinedCount: 1 };
    if (updatedRecipient.broadcastId) {
      await EmergencyBroadcast.findByIdAndUpdate(
        updatedRecipient.broadcastId._id || updatedRecipient.broadcastId,
        { $inc: incField }
      ).catch(() => {});
    }

    return { recipient: updatedRecipient, response: responseAudit };
  }

  async finalizeBroadcast(broadcastId) {
    const now = new Date();
    const broadcast = await EmergencyBroadcast.findById(broadcastId);
    const reqId = broadcast?.emergencyRequestId;

    const query = reqId
      ? { $or: [{ broadcastId }, { emergencyRequestId: reqId }], responseStatus: 'PENDING' }
      : { broadcastId, responseStatus: 'PENDING' };

    // Mark pending recipients as NO_RESPONSE
    await EmergencyBroadcastRecipient.updateMany(
      query,
      { $set: { responseStatus: 'NO_RESPONSE', respondedAt: now } }
    );

    // Also update legacy EmergencyBroadcast records
    if (reqId) {
      await EmergencyBroadcast.updateMany(
        { emergencyRequestId: reqId, responseStatus: 'PENDING' },
        { $set: { responseStatus: 'NO_RESPONSE', respondedAt: now } }
      );
    }

    return await EmergencyBroadcast.findByIdAndUpdate(
      broadcastId,
      {
        $set: {
          broadcastStatus: 'COMPLETED',
          completedAt: now,
        },
      },
      { new: true }
    );
  }

  async cancelBroadcast(emergencyRequestId) {
    const now = new Date();
    await EmergencyBroadcastRecipient.updateMany(
      { emergencyRequestId, responseStatus: 'PENDING' },
      { $set: { responseStatus: 'CANCELLED', respondedAt: now } }
    );

    return await EmergencyBroadcast.updateMany(
      { emergencyRequestId, broadcastStatus: 'ACTIVE' },
      { $set: { broadcastStatus: 'CANCELLED', completedAt: now } }
    );
  }
}

export const emergencyBroadcastRepository = new EmergencyBroadcastRepository();

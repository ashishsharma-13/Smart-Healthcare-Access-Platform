import mongoose from 'mongoose';
import {
  EmergencyFallbackSession,
  EmergencyFallbackSearch,
  EmergencyFallbackOption,
} from '../models/index.js';

export class EmergencyFallbackRepository {
  async createSession(data) {
    return await EmergencyFallbackSession.create(data);
  }

  async findSessionById(sessionId) {
    if (!sessionId) return null;
    if (mongoose.Types.ObjectId.isValid(sessionId) && String(sessionId).length === 24) {
      const doc = await EmergencyFallbackSession.findById(sessionId)
        .populate('emergencyRequestId')
        .populate('previousOrganizationId')
        .populate('resolvedOrganizationId')
        .populate('resolvedExternalFacilityId')
        .exec();
      if (doc) return doc;
    }
    return await EmergencyFallbackSession.findOne({ fallbackSessionId: sessionId })
      .populate('emergencyRequestId')
      .populate('previousOrganizationId')
      .populate('resolvedOrganizationId')
      .populate('resolvedExternalFacilityId')
      .exec();
  }

  async findActiveSessionForRequest(emergencyRequestId) {
    return await EmergencyFallbackSession.findOne({
      emergencyRequestId,
      status: { $in: ['ACTIVE', 'SEARCH_EXPANDED', 'EXTERNAL_DISCOVERED'] },
    })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findLatestSessionForRequest(emergencyRequestId) {
    return await EmergencyFallbackSession.findOne({ emergencyRequestId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateSessionStatus(sessionId, status, updateData = {}) {
    const query = mongoose.Types.ObjectId.isValid(sessionId) && String(sessionId).length === 24
      ? { _id: sessionId }
      : { fallbackSessionId: sessionId };

    return await EmergencyFallbackSession.findOneAndUpdate(
      query,
      { $set: { status, ...updateData } },
      { new: true }
    ).exec();
  }

  async listActiveSessions(query = {}) {
    return await EmergencyFallbackSession.find({
      status: { $in: ['ACTIVE', 'SEARCH_EXPANDED', 'EXTERNAL_DISCOVERED'] },
      ...query,
    })
      .populate('emergencyRequestId', 'requestCode patientName emergencyType severity status createdAt')
      .populate('previousOrganizationId', 'name operatingAddress')
      .sort({ createdAt: -1 })
      .exec();
  }

  async listAllSessions(query = {}, { page = 1, limit = 50 } = {}) {
    return await EmergencyFallbackSession.find(query)
      .populate('emergencyRequestId', 'requestCode patientName emergencyType severity status createdAt')
      .populate('previousOrganizationId', 'name')
      .populate('resolvedOrganizationId', 'name')
      .populate('resolvedExternalFacilityId', 'facilityName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
  }

  async recordSearch(data) {
    return await EmergencyFallbackSearch.create(data);
  }

  async findSearchesForSession(sessionId) {
    return await EmergencyFallbackSearch.find({ fallbackSessionId: sessionId })
      .populate('discoveredOrganizationIds', 'name operatingAddress emergencyContactPhone')
      .sort({ searchLevel: 1 })
      .exec();
  }

  async findSearchesForRequest(emergencyRequestId) {
    return await EmergencyFallbackSearch.find({ emergencyRequestId })
      .populate('discoveredOrganizationIds', 'name operatingAddress emergencyContactPhone')
      .sort({ createdAt: 1 })
      .exec();
  }

  async createFallbackOption(data) {
    return await EmergencyFallbackOption.create(data);
  }

  async findOptionsForSession(sessionId) {
    return await EmergencyFallbackOption.find({ fallbackSessionId: sessionId })
      .populate('organizationId', 'name operatingAddress emergencyContactPhone location verificationStatus')
      .populate('externalFacilityId')
      .sort({ distanceKm: 1 })
      .exec();
  }

  async findOptionsForRequest(emergencyRequestId) {
    return await EmergencyFallbackOption.find({ emergencyRequestId })
      .populate('organizationId', 'name operatingAddress emergencyContactPhone location verificationStatus')
      .populate('externalFacilityId')
      .sort({ distanceKm: 1 })
      .exec();
  }

  async updateOptionSelectionStatus(optionId, selectionStatus) {
    const query = mongoose.Types.ObjectId.isValid(optionId) && String(optionId).length === 24
      ? { _id: optionId }
      : { fallbackOptionId: optionId };

    return await EmergencyFallbackOption.findOneAndUpdate(
      query,
      { $set: { selectionStatus } },
      { new: true }
    ).exec();
  }

  async countSessions(filter = {}) {
    return await EmergencyFallbackSession.countDocuments(filter).exec();
  }

  async countSearches(filter = {}) {
    return await EmergencyFallbackSearch.countDocuments(filter).exec();
  }
}

export const emergencyFallbackRepository = new EmergencyFallbackRepository();


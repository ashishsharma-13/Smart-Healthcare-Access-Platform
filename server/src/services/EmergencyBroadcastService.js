import { emergencyRepository } from '../repositories/EmergencyRepository.js';
import { emergencyMatchingService } from './EmergencyMatchingService.js';
import { getSocketIO } from '../sockets/socketHandler.js';

export class EmergencyBroadcastService {
  /**
   * Activates Emergency Beep and sends parallel broadcasts to matching organizations.
   */
  async activateEmergencyBeep({
    patientId,
    patientName,
    patientPhone,
    emergencyType,
    severity = 'critical',
    description,
    coordinates, // [lng, lat]
    locationAddress,
    ambulanceRequirement = 'no',
  }) {
    const requestCode = `EMG-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    // 1. Create emergency request in CREATED status
    const emergencyRequest = await emergencyRepository.createRequest({
      requestCode,
      patientId,
      patientName,
      patientPhone,
      emergencyType,
      severity,
      description,
      location: {
        type: 'Point',
        coordinates,
      },
      locationAddress: locationAddress || 'Current GPS Location',
      ambulanceRequirement,
      status: 'CREATED',
      statusHistory: [
        {
          status: 'CREATED',
          timestamp: new Date(),
          notes: 'Emergency activated by patient',
          updatedBy: patientId,
        },
      ],
    });

    // 2. Identify matching participating organizations
    const matchingResults = await emergencyMatchingService.findSuitableOrganizations(
      coordinates,
      emergencyType,
      50 // max 50km radius
    );

    // If no matching orgs, return request with NO_RESPONSE or Fallback state
    if (!matchingResults || matchingResults.length === 0) {
      const updated = await emergencyRepository.updateRequestStatus(
        emergencyRequest._id,
        'NO_RESPONSE',
        'No suitable participating healthcare organizations within radius. Fallback facilities recommended.'
      );
      return {
        emergencyRequest: updated,
        broadcasts: [],
        suitableOrganizations: [],
        message: 'No participating organizations currently in range. Activating fallback options.',
      };
    }

    // 3. Create parallel broadcast records
    const broadcastRecords = matchingResults.map((match) => ({
      emergencyRequestId: emergencyRequest._id,
      organizationId: match.organization._id,
      broadcastedAt: new Date(),
      responseStatus: 'PENDING',
      distanceKm: match.distanceKm,
      estimatedTravelMinutes: match.estimatedTravelMinutes,
      suitabilityScore: match.suitabilityScore,
    }));

    const savedBroadcasts = await emergencyRepository.createBroadcasts(broadcastRecords);

    // 4. Update status to BROADCASTED
    const broadcastedRequest = await emergencyRepository.updateRequestStatus(
      emergencyRequest._id,
      'BROADCASTED',
      `Parallel Emergency Beep broadcasted to ${matchingResults.length} participating facilities`
    );

    // 5. Emit real-time parallel WebSocket notifications
    const io = getSocketIO();
    if (io) {
      // Send in parallel to each organization's secure room
      matchingResults.forEach((match) => {
        io.to(`org:${match.organization._id}`).emit('emergency:incoming_beep', {
          emergencyRequestId: emergencyRequest._id,
          requestCode: emergencyRequest.requestCode,
          patientName,
          patientPhone,
          emergencyType,
          severity,
          description,
          locationAddress: emergencyRequest.locationAddress,
          ambulanceRequirement,
          distanceKm: match.distanceKm,
          estimatedTravelMinutes: match.estimatedTravelMinutes,
          broadcastedAt: new Date(),
        });
      });

      // Notify patient channel that broadcast is active
      io.to(`emergency:${emergencyRequest._id}`).emit('emergency:status_change', {
        status: 'BROADCASTED',
        emergencyRequestId: emergencyRequest._id,
        totalBroadcasted: matchingResults.length,
      });
    }

    return {
      emergencyRequest: broadcastedRequest,
      broadcasts: savedBroadcasts,
      suitableOrganizations: matchingResults,
    };
  }

  /**
   * Organization responds to Emergency Beep with ACCEPT / DECLINE.
   */
  async handleOrganizationResponse({ emergencyRequestId, organizationId, responseStatus, offeredResources, declineReason }) {
    if (!['ACCEPTED', 'DECLINED'].includes(responseStatus)) {
      throw new Error("Response status must be 'ACCEPTED' or 'DECLINED'");
    }

    const updatedBroadcast = await emergencyRepository.updateBroadcastResponse(
      emergencyRequestId,
      organizationId,
      responseStatus,
      offeredResources,
      declineReason
    );

    if (!updatedBroadcast) {
      throw new Error('Broadcast record not found for this organization and emergency');
    }

    // Update emergency request state to RESPONSES_RECEIVED if still in BROADCASTED
    const currentReq = await emergencyRepository.findRequestById(emergencyRequestId);
    if (currentReq && currentReq.status === 'BROADCASTED') {
      await emergencyRepository.updateRequestStatus(
        emergencyRequestId,
        'RESPONSES_RECEIVED',
        `Response received from ${updatedBroadcast.organizationId?.name || 'facility'}: ${responseStatus}`
      );
    }

    // Real-time broadcast to patient room
    const io = getSocketIO();
    if (io) {
      io.to(`emergency:${emergencyRequestId}`).emit('emergency:org_responded', {
        emergencyRequestId,
        organizationId,
        organizationName: updatedBroadcast.organizationId?.name,
        responseStatus,
        offeredResources: updatedBroadcast.offeredResources,
        distanceKm: updatedBroadcast.distanceKm,
        estimatedTravelMinutes: updatedBroadcast.estimatedTravelMinutes,
        suitabilityScore: updatedBroadcast.suitabilityScore,
        respondedAt: updatedBroadcast.respondedAt,
      });
    }

    return updatedBroadcast;
  }

  async getResponses(emergencyRequestId) {
    return await emergencyRepository.getBroadcastsForRequest(emergencyRequestId);
  }
}

export const emergencyBroadcastService = new EmergencyBroadcastService();


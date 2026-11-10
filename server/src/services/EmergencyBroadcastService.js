import mongoose from 'mongoose';
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
    targetFacility = null,
    targetHospital = null,
    organizationId = null,
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
    const target = targetFacility || targetHospital || organizationId;
    const matchingResults = await emergencyMatchingService.findSuitableOrganizations(
      coordinates,
      emergencyType,
      50, // max 50km radius
      target
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

    // 3. Create parallel broadcast records with status: 'active'
    const broadcastRecords = matchingResults.map((match) => ({
      emergencyRequestId: emergencyRequest._id,
      organizationId: match.organization._id,
      broadcastedAt: new Date(),
      responseStatus: 'PENDING',
      status: 'active',
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
      // Send to each organization's rooms
      matchingResults.forEach((match) => {
        const bRecord = savedBroadcasts.find(
          (b) => b.organizationId.toString() === match.organization._id.toString()
        );

        const payload = {
          _id: bRecord?._id || new mongoose.Types.ObjectId(),
          emergencyRequestId: {
            _id: emergencyRequest._id,
            requestCode: emergencyRequest.requestCode,
            patientId: {
              _id: patientId,
              name: patientName,
              phone: patientPhone,
            },
            patientName,
            patientPhone,
            emergencyType,
            severity,
            description,
            location: emergencyRequest.location,
            locationAddress: emergencyRequest.locationAddress,
            ambulanceRequirement,
            status: 'BROADCASTED',
            createdAt: emergencyRequest.createdAt,
          },
          organizationId: match.organization,
          distanceKm: match.distanceKm,
          estimatedTravelMinutes: match.estimatedTravelMinutes,
          suitabilityScore: match.suitabilityScore,
          responseStatus: 'PENDING',
          status: 'active',
          broadcastedAt: bRecord?.broadcastedAt || new Date(),
        };

        const orgIdStr = match.organization._id.toString();

        // Specific facility room emissions
        io.to(orgIdStr).emit('emergency-broadcast-incoming', payload);
        io.to(`org:${orgIdStr}`).emit('emergency-broadcast-incoming', payload);
        io.to(`facility:${orgIdStr}`).emit('emergency-broadcast-incoming', payload);
        if (match.organization.slug) {
          io.to(match.organization.slug).emit('emergency-broadcast-incoming', payload);
        }

        // Backwards compatibility event
        io.to(`org:${orgIdStr}`).emit('emergency:incoming_beep', payload);
      });

      // Global emission to all listening hospital dashboards
      io.emit('emergency-broadcast-new', {
        emergencyRequestId: emergencyRequest._id,
        requestCode: emergencyRequest.requestCode,
        patientName,
        patientPhone,
        emergencyType,
        severity,
        description,
        locationAddress: emergencyRequest.locationAddress,
        ambulanceRequirement,
        totalBroadcasted: matchingResults.length,
        createdAt: emergencyRequest.createdAt,
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

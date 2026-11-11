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
   * Dispatches Emergency Beep strictly to chosen hospital(s) with status: 'pending'.
   * Emits targeted and universal WebSocket events.
   */
  async dispatchEmergencyBeep({
    emergencyId,
    patientId,
    patientDetails = {},
    condition,
    emergencyType,
    severity = 'critical',
    description = '',
    coordinates = [77.2090, 28.6139],
    locationAddress = 'Current GPS Location',
    ambulanceRequirement = 'no',
    hospitalIds = [],
  }) {
    const chosenType = condition || emergencyType || 'cardiac';
    const patientName = patientDetails.name || patientDetails.patientName || 'Emergency Patient';
    const patientPhone = patientDetails.phone || patientDetails.patientPhone || '9999999999';

    if (!Array.isArray(hospitalIds) || hospitalIds.length === 0) {
      throw new Error('Please select at least one hospital to dispatch the emergency beep');
    }

    // 1. Create or update EmergencyRequest in 'pending' status
    let emergencyRequest = null;
    if (emergencyId && mongoose.Types.ObjectId.isValid(emergencyId)) {
      emergencyRequest = await emergencyRepository.findRequestById(emergencyId);
      if (emergencyRequest) {
        emergencyRequest.status = 'pending';
        emergencyRequest.emergencyType = chosenType;
        emergencyRequest.severity = severity;
        if (description) emergencyRequest.description = description;
        if (locationAddress) emergencyRequest.locationAddress = locationAddress;
        if (coordinates && coordinates.length === 2) {
          emergencyRequest.location = { type: 'Point', coordinates };
        }
        emergencyRequest.ambulanceRequirement = ambulanceRequirement;
        emergencyRequest.statusHistory.push({
          status: 'pending',
          timestamp: new Date(),
          notes: `Emergency beep dispatched to ${hospitalIds.length} hospital(s)`,
          updatedBy: patientId,
        });
        await emergencyRequest.save();
      }
    }

    if (!emergencyRequest) {
      const requestCode = `EMG-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
      emergencyRequest = await emergencyRepository.createRequest({
        requestCode,
        patientId: patientId || new mongoose.Types.ObjectId(),
        patientName,
        patientPhone,
        emergencyType: chosenType,
        severity,
        description,
        location: {
          type: 'Point',
          coordinates: coordinates || [77.2090, 28.6139],
        },
        locationAddress: locationAddress || 'Current GPS Location',
        ambulanceRequirement,
        status: 'pending',
        statusHistory: [
          {
            status: 'pending',
            timestamp: new Date(),
            notes: `Emergency beep dispatched to ${hospitalIds.length} hospital(s)`,
            updatedBy: patientId,
          },
        ],
      });
    }

    // 2. Fetch or evaluate target organizations
    const matchingFacilities = await emergencyMatchingService.findSuitableOrganizations(
      coordinates || [77.2090, 28.6139],
      chosenType,
      100
    );

    const { Organization } = await import('../models/Organization.js');
    const validObjectIds = hospitalIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const targetedOrgs = await Organization.find({
      _id: { $in: validObjectIds },
    });

    // 3. Build & save broadcast records strictly for the targeted hospitals
    const { EmergencyBroadcast } = await import('../models/EmergencyBroadcast.js');
    const savedBroadcasts = [];

    for (const org of targetedOrgs) {
      const match = matchingFacilities.find(
        (m) => m.organization._id.toString() === org._id.toString()
      );

      let dist = match?.distanceKm;
      if (!dist && org.location?.coordinates && coordinates) {
        dist = emergencyMatchingService.calculateDistance(coordinates, org.location.coordinates);
      }
      dist = dist || 3.5;
      const travelTime = match?.estimatedTravelMinutes || emergencyMatchingService.estimateTravelTime(dist);
      const suitability = match?.suitabilityScore || 90;

      const bRecord = {
        emergencyRequestId: emergencyRequest._id,
        organizationId: org._id,
        broadcastedAt: new Date(),
        responseStatus: 'PENDING',
        status: 'active',
        distanceKm: dist,
        estimatedTravelMinutes: travelTime,
        suitabilityScore: suitability,
      };

      const saved = await EmergencyBroadcast.findOneAndUpdate(
        { emergencyRequestId: bRecord.emergencyRequestId, organizationId: bRecord.organizationId },
        { $set: bRecord },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).populate('organizationId', 'name address location emergencyContactPhone rating facilities slug');
      savedBroadcasts.push(saved);
    }

    // 4. Emit real-time WebSocket events
    const io = getSocketIO();
    if (io) {
      for (const bRecord of savedBroadcasts) {
        const orgDoc = bRecord.organizationId;
        const orgIdStr = (orgDoc?._id || bRecord.organizationId).toString();

        const payload = {
          _id: bRecord._id,
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
            emergencyType: emergencyRequest.emergencyType,
            severity: emergencyRequest.severity,
            description: emergencyRequest.description,
            location: emergencyRequest.location,
            locationAddress: emergencyRequest.locationAddress,
            ambulanceRequirement: emergencyRequest.ambulanceRequirement,
            status: 'pending',
            createdAt: emergencyRequest.createdAt,
          },
          organizationId: orgDoc || { _id: orgIdStr },
          distanceKm: bRecord.distanceKm,
          estimatedTravelMinutes: bRecord.estimatedTravelMinutes,
          suitabilityScore: bRecord.suitabilityScore,
          responseStatus: 'PENDING',
          status: 'active',
          broadcastedAt: bRecord.broadcastedAt,
        };

        // Broadcast specifically to targeted hospital rooms
        io.to(orgIdStr).emit('emergency-broadcast-incoming', payload);
        io.to(`org:${orgIdStr}`).emit('emergency-broadcast-incoming', payload);
        io.to(`facility:${orgIdStr}`).emit('emergency-broadcast-incoming', payload);
        io.to(`org:${orgIdStr}`).emit('emergency:incoming_beep', payload);
        if (orgDoc?.slug) {
          io.to(orgDoc.slug).emit('emergency-broadcast-incoming', payload);
        }

        // Broadcast universally to hospital rooms
        io.emit('emergency-broadcast-incoming', payload);
      }

      io.emit('emergency-broadcast-new', {
        emergencyRequestId: emergencyRequest._id,
        requestCode: emergencyRequest.requestCode,
        patientName,
        patientPhone,
        emergencyType: emergencyRequest.emergencyType,
        severity: emergencyRequest.severity,
        description: emergencyRequest.description,
        locationAddress: emergencyRequest.locationAddress,
        ambulanceRequirement: emergencyRequest.ambulanceRequirement,
        totalBroadcasted: savedBroadcasts.length,
        createdAt: emergencyRequest.createdAt,
      });

      // Notify patient channel
      io.to(`emergency:${emergencyRequest._id}`).emit('emergency:status_change', {
        status: 'pending',
        emergencyRequestId: emergencyRequest._id,
        totalBroadcasted: savedBroadcasts.length,
      });
    }

    return {
      emergencyRequest,
      broadcasts: savedBroadcasts,
      targetedCount: savedBroadcasts.length,
    };
  }

  /**
   * Organization responds to Emergency Beep with ACCEPT / DECLINE / REJECT.
   */
  async handleOrganizationResponse({ emergencyRequestId, organizationId, responseStatus, offeredResources, declineReason }) {
    const normalizedStatus = responseStatus === 'REJECTED' ? 'DECLINED' : responseStatus;
    if (!['ACCEPTED', 'DECLINED'].includes(normalizedStatus)) {
      throw new Error("Response status must be 'ACCEPTED' or 'DECLINED'");
    }

    const updatedBroadcast = await emergencyRepository.updateBroadcastResponse(
      emergencyRequestId,
      organizationId,
      normalizedStatus,
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

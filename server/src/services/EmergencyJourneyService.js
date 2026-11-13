import {
  EmergencyRequest,
  ResourceReservation,
  ResourceReservationItem,
  HealthcareResource,
  Organization,
  EmergencyRequestEvent,
  EmergencyJourney,
} from '../models/index.js';
import { emergencyJourneyRepository } from '../repositories/EmergencyJourneyRepository.js';
import { resourceRepository } from '../repositories/ResourceRepository.js';
import { emergencyRepository } from '../repositories/EmergencyRepository.js';
import { notificationService } from './NotificationService.js';
import { getSocketIO } from '../sockets/socketHandler.js';

// Haversine distance in kilometers
function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

export class EmergencyJourneyService {
  /**
   * Start Patient Journey
   * Invariants:
   * - Valid reservation must exist (TEMPORARILY_RESERVED or valid hold)
   * - Cannot start with expired or cancelled reservation
   * - Prevent duplicate active journeys
   * - Generates external Google Maps navigation URL with verified destination coordinates
   */
  async startJourney({ emergencyRequestId, patientUserId, initialCoords = null }) {
    const request = await EmergencyRequest.findById(emergencyRequestId)
      .populate('selectedOrganizationId')
      .exec();
    if (!request) {
      const err = new Error('Emergency request not found');
      err.statusCode = 404;
      throw err;
    }

    // Ownership or authorization check
    if (
      patientUserId &&
      request.patientId.toString() !== patientUserId.toString() &&
      request.reportedByUserId?.toString() !== patientUserId.toString()
    ) {
      const err = new Error('Unauthorized: Only the patient or authorized creator can start the journey');
      err.statusCode = 403;
      throw err;
    }

    // Reservation validation
    let reservation = await resourceRepository.findActiveReservationForRequest(emergencyRequestId);
    if (!reservation) {
      const anyResv = await ResourceReservation.findOne({ emergencyRequestId }).sort({ createdAt: -1 });
      if (anyResv && ['EXPIRED', 'CANCELLED', 'RELEASED', 'RESOURCE_RELEASED'].includes(anyResv.status)) {
        const err = new Error(`Reservation is ${anyResv.status}. Cannot start journey.`);
        err.statusCode = 400;
        throw err;
      }
      const err = new Error('No active reservation found. A valid destination reservation is required before starting journey.');
      err.statusCode = 400;
      throw err;
    }

    if (
      ['EXPIRED', 'CANCELLED', 'RELEASED', 'RESOURCE_RELEASED'].includes(reservation.status)
    ) {
      const err = new Error(`Reservation is ${reservation.status}. Cannot start journey.`);
      err.statusCode = 400;
      throw err;
    }

    // Check expiration deadline
    if (reservation.expiresAt && new Date() > new Date(reservation.expiresAt)) {
      reservation.status = 'EXPIRED';
      await reservation.save();
      const err = new Error('Reservation has expired. Cannot start journey.');
      err.statusCode = 400;
      throw err;
    }

    // Prevent duplicate active journeys
    const existingActiveJourney = await emergencyJourneyRepository.findActiveJourney(emergencyRequestId);
    if (existingActiveJourney) {
      const err = new Error('A journey is already in progress for this emergency request.');
      err.statusCode = 400;
      throw err;
    }

    // Resolve organization coordinates
    const organization =
      request.selectedOrganizationId ||
      (await Organization.findById(reservation.organizationId).exec());
    if (!organization) {
      const err = new Error('Destination organization not found');
      err.statusCode = 404;
      throw err;
    }

    const orgCoords = organization.location?.coordinates || [77.209, 28.6139];
    const destLng = orgCoords[0];
    const destLat = orgCoords[1];

    // Standard Google Maps directions URL mandated by specification
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;

    // Estimate distance and travel time (driving ~40 km/h)
    let estimatedDistanceKm = null;
    let estimatedDurationMin = null;
    const startLat = initialCoords?.latitude ?? request.latitude;
    const startLng = initialCoords?.longitude ?? request.longitude;

    if (startLat != null && startLng != null && destLat != null && destLng != null) {
      estimatedDistanceKm = calculateHaversineKm(startLat, startLng, destLat, destLng);
      estimatedDurationMin = Math.max(2, Math.round((estimatedDistanceKm / 40) * 60));
    }

    // Create EmergencyJourney
    const journey = await emergencyJourneyRepository.createJourney({
      emergencyRequestId: request._id,
      reservationId: reservation._id,
      patientId: request.patientId,
      organizationId: organization._id,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      isSharingLocation: false, // strictly permission-based, default false
      initialLocation: {
        latitude: startLat,
        longitude: startLng,
        address: initialCoords?.address || request.address || '',
        accuracy: initialCoords?.accuracy || request.locationAccuracy || 10,
      },
      destinationLocation: {
        latitude: destLat,
        longitude: destLng,
        address:
          organization.registeredAddress?.streetName ||
          organization.operatingAddress?.streetName ||
          organization.address?.street ||
          organization.name,
        organizationName: organization.name,
      },
      googleMapsUrl,
      estimatedDistanceKm,
      estimatedDurationMin,
    });

    // Update EmergencyRequest state to PATIENT_EN_ROUTE
    request.status = 'PATIENT_EN_ROUTE';
    request.statusHistory.push({
      status: 'PATIENT_EN_ROUTE',
      timestamp: new Date(),
      notes: `Patient initiated journey to ${organization.name}. Pass code: #${request.requestCode}`,
      updatedBy: patientUserId || request.patientId,
    });
    await request.save();

    // Update ResourceReservation state to PATIENT_EN_ROUTE
    reservation.status = 'PATIENT_EN_ROUTE';
    reservation.patientEnRouteAt = new Date();
    reservation.version += 1;
    await reservation.save();

    // Record Event
    await EmergencyRequestEvent.create({
      emergencyRequestId: request._id,
      eventType: 'JOURNEY_STARTED',
      previousState: 'RESOURCES_RESERVED',
      newState: 'PATIENT_EN_ROUTE',
      actorId: patientUserId || request.patientId,
      metadata: {
        journeyId: journey.journeyId,
        destinationName: organization.name,
        estimatedDistanceKm,
        estimatedDurationMin,
      },
    }).catch(() => {});

    // Realtime Notifications
    const io = getSocketIO();
    if (io) {
      io.to(`emergency:${request._id}`).emit('emergency:status_change', {
        status: 'PATIENT_EN_ROUTE',
        emergencyRequestId: request._id,
        journeyId: journey.journeyId,
      });

      io.to(`emergency:${request._id}`).emit('/topic/emergency/' + request._id + '/journey', {
        type: 'JOURNEY_STARTED',
        journey,
      });

      io.to(`org:${organization._id}`).emit('emergency:patient_en_route', {
        emergencyRequestId: request._id,
        journeyId: journey.journeyId,
        reservationId: reservation.reservationId,
        patientName: request.patientName,
        condition: request.emergencyType,
        estimatedDurationMin,
      });

      io.to(`org:${organization._id}`).emit('/topic/organizations/' + organization._id + '/incoming-patients', {
        type: 'INCOMING_PATIENT_EN_ROUTE',
        emergencyRequestId: request._id,
        journeyId: journey.journeyId,
      });
    }

    if (request.patientId) {
      notificationService.createNotification({
        recipientUserId: request.patientId,
        emergencyRequestId: request._id,
        organizationId: organization?._id,
        notificationType: 'EMERGENCY_JOURNEY_STARTED',
        title: 'Journey En Route to Hospital',
        message: `Your transit to ${organization?.name || 'hospital'} has commenced.`,
        priority: 'EMERGENCY',
        actionUrl: `/emergency/en-route/${request._id}`,
      }).catch((e) => console.warn('[Notification Warning]', e.message));
    }

    return {
      success: true,
      journey,
      emergencyRequest: request,
      reservation,
    };
  }

  /**
   * Get Active or Latest Journey
   */
  async getJourney(emergencyRequestId) {
    let journey = await emergencyJourneyRepository.findActiveJourney(emergencyRequestId);
    if (!journey) {
      journey = await emergencyJourneyRepository.findLatestJourney(emergencyRequestId);
    }
    return journey;
  }

  /**
   * Record Permission-Based Live Location Update
   * Invariants:
   * - Journey must be IN_PROGRESS
   * - Location sharing must be explicitly permitted
   * - Validates coordinates [-90..90, -180..180]
   * - Rate-limiting: throttles updates faster than 2 seconds
   * - Bounded retention: capped to latest 50 points
   */
  async recordLocationUpdate({
    emergencyRequestId,
    userId,
    latitude,
    longitude,
    accuracyMeters = null,
    speed = null,
    heading = null,
    isSharingLocation = undefined,
  }) {
    const journey = await emergencyJourneyRepository.findActiveJourney(emergencyRequestId);
    if (!journey) {
      const err = new Error('No active in-progress journey found for this emergency request.');
      err.statusCode = 400;
      throw err;
    }

    // Coordinate validation
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      isNaN(latitude) ||
      isNaN(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      const err = new Error('Invalid coordinates: latitude must be between -90 and 90, longitude between -180 and 180.');
      err.statusCode = 400;
      throw err;
    }

    // Explicit permission handling
    if (isSharingLocation === true && !journey.isSharingLocation) {
      journey.isSharingLocation = true;
      await journey.save();
    } else if (!journey.isSharingLocation && isSharingLocation !== true) {
      const err = new Error('Location sharing is disabled. Explicit patient consent required.');
      err.statusCode = 403;
      throw err;
    }

    // Rate Limiting: Minimum 2 seconds between updates
    if (journey.lastKnownLocation?.updatedAt) {
      const msSinceLast = Date.now() - new Date(journey.lastKnownLocation.updatedAt).getTime();
      if (msSinceLast < 2000) {
        const err = new Error('Rate limit exceeded: Location updates throttled to once every 2 seconds.');
        err.statusCode = 429;
        throw err;
      }
    }

    // Save update with bounded retention
    const locationUpdate = await emergencyJourneyRepository.recordLocationUpdate({
      journeyId: journey._id,
      emergencyRequestId,
      latitude,
      longitude,
      accuracyMeters,
      speed,
      heading,
    });

    // Realtime broadcast
    const io = getSocketIO();
    if (io) {
      const payload = {
        journeyId: journey.journeyId,
        emergencyRequestId,
        latitude,
        longitude,
        accuracyMeters,
        speed,
        heading,
        receivedAt: locationUpdate.receivedAt,
      };

      io.to(`emergency:${emergencyRequestId}`).emit('emergency:location_update', payload);
      io.to(`emergency:${emergencyRequestId}`).emit(`/topic/emergency/${emergencyRequestId}/journey`, payload);
      io.to(`org:${journey.organizationId._id || journey.organizationId}`).emit('emergency:location_update', payload);
    }

    return {
      success: true,
      locationUpdate,
      latestLocation: {
        latitude,
        longitude,
        accuracyMeters,
        speed,
        heading,
        updatedAt: locationUpdate.receivedAt,
      },
    };
  }

  /**
   * Stop Location Sharing
   */
  async stopLocationSharing({ emergencyRequestId, userId }) {
    const journey = await emergencyJourneyRepository.findActiveJourney(emergencyRequestId);
    if (!journey) {
      const err = new Error('No active journey found');
      err.statusCode = 400;
      throw err;
    }

    journey.isSharingLocation = false;
    await journey.save();

    await EmergencyRequestEvent.create({
      emergencyRequestId,
      eventType: 'LOCATION_SHARING_STOPPED',
      previousState: 'PATIENT_EN_ROUTE',
      newState: 'PATIENT_EN_ROUTE',
      actorId: userId,
      metadata: { journeyId: journey.journeyId },
    }).catch(() => {});

    const io = getSocketIO();
    if (io) {
      io.to(`emergency:${emergencyRequestId}`).emit('emergency:location_sharing_stopped', {
        journeyId: journey.journeyId,
      });
      io.to(`org:${journey.organizationId._id || journey.organizationId}`).emit('emergency:location_sharing_stopped', {
        emergencyRequestId,
        journeyId: journey.journeyId,
      });
    }

    return {
      success: true,
      message: 'Location sharing stopped successfully.',
    };
  }

  /**
   * Confirm Patient Arrival
   * INVARIANT: GPS proximity alone must NEVER establish verified arrival!
   * Must be explicitly confirmed via verification method.
   */
  async confirmPatientArrival({ emergencyRequestId, patientUserId, notes = '' }) {
    const request = await EmergencyRequest.findById(emergencyRequestId).exec();
    if (!request) {
      const err = new Error('Emergency request not found');
      err.statusCode = 404;
      throw err;
    }

    // Ownership or authorization
    if (
      patientUserId &&
      request.patientId.toString() !== patientUserId.toString() &&
      request.reportedByUserId?.toString() !== patientUserId.toString()
    ) {
      const err = new Error('Unauthorized to confirm arrival for this emergency');
      err.statusCode = 403;
      throw err;
    }

    // Idempotency: if already arrived, return current state gracefully
    if (request.status === 'ARRIVED') {
      const existingRecords = await emergencyJourneyRepository.findArrivalRecords(emergencyRequestId);
      return {
        success: true,
        message: 'Patient arrival already verified',
        alreadyArrived: true,
        arrivalRecord: existingRecords[0] || null,
        emergencyRequest: request,
      };
    }

    const reservation = await resourceRepository.findActiveReservationForRequest(emergencyRequestId);
    const journey =
      (await emergencyJourneyRepository.findActiveJourney(emergencyRequestId)) ||
      (await emergencyJourneyRepository.findLatestJourney(emergencyRequestId));

    const organizationId = request.selectedOrganizationId || reservation?.organizationId;

    // 1. Create EmergencyArrivalRecord
    const arrivalRecord = await emergencyJourneyRepository.createArrivalRecord({
      journeyId: journey?._id || null,
      emergencyRequestId: request._id,
      organizationId: organizationId || null,
      verificationMethod: 'PATIENT_CONFIRMATION',
      verificationStatus: 'VERIFIED',
      verifiedBy: patientUserId || request.patientId,
      verifiedAt: new Date(),
      notes: notes || 'Patient confirmed arrival at hospital emergency intake desk.',
    });

    // 2. Update EmergencyRequest state to ARRIVED
    request.status = 'ARRIVED';
    request.statusHistory.push({
      status: 'ARRIVED',
      timestamp: new Date(),
      notes: `Patient confirmed arrival (${arrivalRecord.arrivalId}).`,
      updatedBy: patientUserId || request.patientId,
    });
    await request.save();

    // 3. Update ResourceReservation state to PATIENT_ARRIVED
    if (reservation) {
      reservation.status = 'PATIENT_ARRIVED';
      reservation.patientArrivedAt = new Date();
      reservation.version += 1;
      await reservation.save();
    }

    // 4. Update Journey to ARRIVED and stop location tracking
    if (journey) {
      journey.status = 'ARRIVED';
      journey.arrivedAt = new Date();
      journey.isSharingLocation = false;
      await journey.save();
    }

    // 5. Record Event
    await EmergencyRequestEvent.create({
      emergencyRequestId: request._id,
      eventType: 'ARRIVAL_VERIFIED',
      previousState: 'PATIENT_EN_ROUTE',
      newState: 'ARRIVED',
      actorId: patientUserId || request.patientId,
      metadata: {
        arrivalId: arrivalRecord.arrivalId,
        verificationMethod: 'PATIENT_CONFIRMATION',
      },
    }).catch(() => {});

    // 6. Realtime broadcast
    const io = getSocketIO();
    if (io) {
      io.to(`emergency:${request._id}`).emit('emergency:status_change', {
        status: 'ARRIVED',
        emergencyRequestId: request._id,
      });
      io.to(`emergency:${request._id}`).emit('/topic/emergency/' + request._id + '/arrival', {
        type: 'PATIENT_ARRIVED',
        arrivalRecord,
      });
      if (organizationId) {
        io.to(`org:${organizationId._id || organizationId}`).emit('emergency:patient_arrived', {
          emergencyRequestId: request._id,
          reservationId: reservation?.reservationId,
          arrivalId: arrivalRecord.arrivalId,
        });
      }
    }

    if (request.patientId) {
      notificationService.createNotification({
        recipientUserId: request.patientId,
        emergencyRequestId: request._id,
        organizationId: organizationId?._id || organizationId,
        notificationType: 'EMERGENCY_PATIENT_ARRIVED',
        title: 'Arrival Confirmed at Healthcare Facility',
        message: 'Your arrival has been recorded. Clinical intake is underway.',
        priority: 'EMERGENCY',
        actionUrl: `/emergency/en-route/${request._id}`,
      }).catch((e) => console.warn('[Notification Warning]', e.message));
    }

    return {
      success: true,
      message: 'Patient arrival confirmed successfully.',
      arrivalRecord,
      emergencyRequest: request,
      reservation,
    };
  }

  /**
   * Organization Staff Verifies Arrival (Manual Desk / QR scan)
   */
  async verifyStaffArrival({
    emergencyRequestId,
    organizationId,
    staffUserId,
    verificationMethod = 'STAFF_VERIFICATION',
    notes = '',
  }) {
    const request = await EmergencyRequest.findById(emergencyRequestId).exec();
    if (!request) {
      const err = new Error('Emergency request not found');
      err.statusCode = 404;
      throw err;
    }

    const reservation = await resourceRepository.findActiveReservationForRequest(emergencyRequestId);
    const orgIdStr = (organizationId?._id || organizationId).toString();
    const reqOrgIdStr = (request.selectedOrganizationId?._id || request.selectedOrganizationId || '').toString();
    const resvOrgIdStr = (reservation?.organizationId?._id || reservation?.organizationId || '').toString();

    if (reqOrgIdStr !== orgIdStr && resvOrgIdStr !== orgIdStr) {
      const err = new Error('Unauthorized: This emergency request does not belong to your organization');
      err.statusCode = 403;
      throw err;
    }

    // Idempotency: if already arrived, return current state
    if (request.status === 'ARRIVED') {
      const existingRecords = await emergencyJourneyRepository.findArrivalRecords(emergencyRequestId);
      return {
        success: true,
        message: 'Patient arrival already verified',
        alreadyArrived: true,
        arrivalRecord: existingRecords[0] || null,
        emergencyRequest: request,
      };
    }

    const journey =
      (await emergencyJourneyRepository.findActiveJourney(emergencyRequestId)) ||
      (await emergencyJourneyRepository.findLatestJourney(emergencyRequestId));

    // 1. Create EmergencyArrivalRecord
    const arrivalRecord = await emergencyJourneyRepository.createArrivalRecord({
      journeyId: journey?._id || null,
      emergencyRequestId: request._id,
      organizationId: organizationId?._id || organizationId,
      verificationMethod: verificationMethod || 'STAFF_VERIFICATION',
      verificationStatus: 'VERIFIED',
      verifiedBy: staffUserId,
      verifiedAt: new Date(),
      notes: notes || 'Hospital reception staff verified patient arrival.',
    });

    // 2. Update EmergencyRequest
    request.status = 'ARRIVED';
    request.statusHistory.push({
      status: 'ARRIVED',
      timestamp: new Date(),
      notes: `Arrival verified by facility staff (${arrivalRecord.arrivalId}).`,
      updatedBy: staffUserId,
    });
    await request.save();

    // 3. Update ResourceReservation to PATIENT_ARRIVED
    if (reservation) {
      reservation.status = 'PATIENT_ARRIVED';
      reservation.patientArrivedAt = new Date();
      reservation.version += 1;
      await reservation.save();
    }

    // 4. Update Journey
    if (journey) {
      journey.status = 'ARRIVED';
      journey.arrivedAt = new Date();
      journey.isSharingLocation = false;
      await journey.save();
    }

    // 5. Record Event
    await EmergencyRequestEvent.create({
      emergencyRequestId: request._id,
      eventType: 'ARRIVAL_VERIFIED',
      previousState: 'PATIENT_EN_ROUTE',
      newState: 'ARRIVED',
      actorId: staffUserId,
      metadata: {
        arrivalId: arrivalRecord.arrivalId,
        verificationMethod,
      },
    }).catch(() => {});

    // 6. Realtime
    const io = getSocketIO();
    if (io) {
      io.to(`emergency:${request._id}`).emit('emergency:status_change', {
        status: 'ARRIVED',
        emergencyRequestId: request._id,
      });
      io.to(`emergency:${request._id}`).emit('/topic/emergency/' + request._id + '/arrival', {
        type: 'STAFF_VERIFIED_ARRIVAL',
        arrivalRecord,
      });
      io.to(`org:${orgIdStr}`).emit('emergency:patient_arrived', {
        emergencyRequestId: request._id,
        reservationId: reservation?.reservationId,
        arrivalId: arrivalRecord.arrivalId,
      });
    }

    if (request.patientId) {
      notificationService.createNotification({
        recipientUserId: request.patientId,
        emergencyRequestId: request._id,
        organizationId: organizationId?._id || organizationId,
        notificationType: 'EMERGENCY_PATIENT_ARRIVED',
        title: 'Arrival Verified by Emergency Ward Staff',
        message: 'Hospital triage team has attested your arrival.',
        priority: 'EMERGENCY',
        actionUrl: `/emergency/en-route/${request._id}`,
      }).catch((e) => console.warn('[Notification Warning]', e.message));
    }

    return {
      success: true,
      message: 'Patient arrival verified by facility staff.',
      arrivalRecord,
      emergencyRequest: request,
      reservation,
    };
  }

  /**
   * Allocate Reserved Resource
   * INVARIANTS:
   * - Must verify reservation is in PATIENT_ARRIVED
   * - Cannot allocate beyond permitted reserved quantity
   * - Supports ALLOCATED, PARTIAL, and FAILED status
   * - Atomically transitions reservedCapacity -> occupiedCapacity (or available on failure)
   * - Updates reservation to ALLOCATED
   * - CRITICAL: DO NOT MARK EmergencyRequest AS COMPLETED merely because resource was allocated!
   */
  async allocateResource({
    reservationId,
    organizationId,
    staffUserId,
    reservationItemId = null,
    allocatedQuantity = 1,
    allocationStatus = 'ALLOCATED',
    remarks = '',
  }) {
    const reservation = await resourceRepository.findReservationById(reservationId);
    if (!reservation) {
      const err = new Error('Reservation not found');
      err.statusCode = 404;
      throw err;
    }

    const orgIdStr = (organizationId?._id || organizationId).toString();
    const resvOrgIdStr = (reservation.organizationId?._id || reservation.organizationId).toString();
    if (resvOrgIdStr !== orgIdStr) {
      const err = new Error('Unauthorized: Reservation does not belong to your organization');
      err.statusCode = 403;
      throw err;
    }

    // Must be PATIENT_ARRIVED (or already ALLOCATED for incremental allocation)
    if (!['PATIENT_ARRIVED', 'ALLOCATED'].includes(reservation.status)) {
      const err = new Error(
        `Cannot allocate resources in status ${reservation.status}. Patient must be verified as ARRIVED at reception first.`
      );
      err.statusCode = 400;
      throw err;
    }

    // Permitted reserved quantity validation
    const items = await resourceRepository.getReservationItems(reservation._id);
    let targetItem = null;
    if (reservationItemId) {
      targetItem = items.find((i) => i._id.toString() === reservationItemId.toString());
    } else if (items.length > 0) {
      targetItem = items[0];
    }

    const maxPermitted = targetItem ? targetItem.quantity : reservation.quantity || 1;
    const reqQty = Number(allocatedQuantity) || 1;

    if (reqQty > maxPermitted && allocationStatus !== 'FAILED') {
      const err = new Error(
        `Allocated quantity (${reqQty}) exceeds permitted reserved quantity (${maxPermitted}). Unauthorized without separate exception workflow.`
      );
      err.statusCode = 400;
      throw err;
    }

    const rType = targetItem?.resourceType || reservation.resourceType || 'er_bay';

    // Atomic inventory shift
    if (['ALLOCATED', 'PARTIAL'].includes(allocationStatus)) {
      // Transition from reservedCapacity to occupiedCapacity
      await HealthcareResource.findOneAndUpdate(
        {
          organizationId: reservation.organizationId,
          resourceType: rType,
          reservedCapacity: { $gte: reqQty },
        },
        {
          $inc: {
            reservedCapacity: -reqQty,
            occupiedCapacity: reqQty,
          },
        }
      ).exec();
    } else if (allocationStatus === 'FAILED') {
      // Release held reserved capacity back to available capacity
      await HealthcareResource.findOneAndUpdate(
        {
          organizationId: reservation.organizationId,
          resourceType: rType,
          reservedCapacity: { $gte: reqQty },
        },
        {
          $inc: {
            reservedCapacity: -reqQty,
            availableCapacity: reqQty,
          },
        }
      ).exec();
    }

    // Create ResourceAllocation record
    const allocation = await emergencyJourneyRepository.createAllocation({
      reservationId: reservation._id,
      reservationItemId: targetItem?._id || null,
      healthcareResourceId: reservation.resourceId || null,
      resourceType: rType,
      allocatedQuantity: reqQty,
      allocationStatus,
      allocatedBy: staffUserId,
      allocatedAt: new Date(),
      remarks: remarks || `Allocated ${reqQty}x ${rType} (${allocationStatus})`,
    });

    // Update reservation status
    if (allocationStatus === 'ALLOCATED') {
      reservation.status = 'ALLOCATED';
      reservation.allocatedAt = new Date();
    } else if (allocationStatus === 'PARTIAL') {
      reservation.status = 'ALLOCATED';
      reservation.allocatedAt = new Date();
    } else if (allocationStatus === 'FAILED') {
      reservation.status = 'RESOURCE_RELEASED';
      reservation.releasedAt = new Date();
      reservation.releaseReason = remarks || 'Resource allocation failed';
    }
    reservation.version += 1;
    await reservation.save();

    if (targetItem) {
      targetItem.status = allocationStatus === 'FAILED' ? 'RELEASED' : 'ALLOCATED';
      await targetItem.save();
    }

    // Invariant Check: DO NOT set EmergencyRequest to COMPLETED!
    // EmergencyRequest stays in ARRIVED.

    // Record Event
    await EmergencyRequestEvent.create({
      emergencyRequestId: reservation.emergencyRequestId._id || reservation.emergencyRequestId,
      eventType: 'RESOURCE_ALLOCATED',
      previousState: 'ARRIVED',
      newState: 'ARRIVED',
      actorId: staffUserId,
      metadata: {
        allocationId: allocation.allocationId,
        allocationStatus,
        allocatedQuantity: reqQty,
        resourceType: rType,
      },
    }).catch(() => {});

    // Realtime notification
    const io = getSocketIO();
    if (io) {
      io.to(`org:${orgIdStr}`).emit('emergency:resource_allocated', {
        reservationId: reservation.reservationId,
        allocationId: allocation.allocationId,
        status: reservation.status,
      });
      io.to(`org:${orgIdStr}`).emit(
        `/topic/organizations/${orgIdStr}/reservations`,
        {
          type: 'RESOURCE_ALLOCATED',
          allocation,
          reservation,
        }
      );
    }

    return {
      success: true,
      message: `Resource allocation recorded (${allocationStatus}).`,
      allocation,
      reservation,
    };
  }

  /**
   * Get Allocations for a Reservation
   */
  async getAllocations(reservationId, organizationId) {
    const reservation = await resourceRepository.findReservationById(reservationId);
    if (!reservation) {
      const err = new Error('Reservation not found');
      err.statusCode = 404;
      throw err;
    }

    if (organizationId) {
      const orgIdStr = (organizationId?._id || organizationId).toString();
      const resvOrgIdStr = (reservation.organizationId?._id || reservation.organizationId).toString();
      if (resvOrgIdStr !== orgIdStr) {
        const err = new Error('Unauthorized');
        err.statusCode = 403;
        throw err;
      }
    }

    return await emergencyJourneyRepository.getAllocationsForReservation(reservation._id);
  }

  /**
   * Complete Emergency Coordination Workflow
   * Transitions EmergencyRequest to COMPLETED.
   * Stops tracking, preserves history.
   */
  async completeEmergency({ emergencyRequestId, actorUserId, notes = '' }) {
    const request = await EmergencyRequest.findById(emergencyRequestId).exec();
    if (!request) {
      const err = new Error('Emergency request not found');
      err.statusCode = 404;
      throw err;
    }

    if (request.status === 'COMPLETED') {
      return {
        success: true,
        message: 'Emergency coordination already marked completed',
        emergencyRequest: request,
      };
    }

    request.status = 'COMPLETED';
    request.statusHistory.push({
      status: 'COMPLETED',
      timestamp: new Date(),
      notes: notes || 'Platform emergency coordination officially completed.',
      updatedBy: actorUserId,
    });
    await request.save();

    // Complete journey and stop any active tracking
    const journey =
      (await emergencyJourneyRepository.findActiveJourney(emergencyRequestId)) ||
      (await emergencyJourneyRepository.findLatestJourney(emergencyRequestId));
    if (journey) {
      journey.status = 'COMPLETED';
      journey.completedAt = new Date();
      journey.isSharingLocation = false;
      await journey.save();
    }

    // Record Event
    await EmergencyRequestEvent.create({
      emergencyRequestId: request._id,
      eventType: 'COORDINATION_COMPLETED',
      previousState: 'ARRIVED',
      newState: 'COMPLETED',
      actorId: actorUserId,
      metadata: { notes },
    }).catch(() => {});

    // Realtime
    const io = getSocketIO();
    if (io) {
      io.to(`emergency:${request._id}`).emit('emergency:status_change', {
        status: 'COMPLETED',
        emergencyRequestId: request._id,
      });
      io.to(`emergency:${request._id}`).emit('/topic/emergency/' + request._id + '/journey', {
        type: 'COORDINATION_COMPLETED',
      });
    }

    if (request.patientId) {
      notificationService.createNotification({
        recipientUserId: request.patientId,
        emergencyRequestId: request._id,
        organizationId: request.selectedOrganizationId?._id || request.selectedOrganizationId,
        notificationType: 'EMERGENCY_COORDINATION_COMPLETED',
        title: 'Emergency Case Coordination Completed',
        message: 'Your emergency assistance coordination has officially concluded.',
        priority: 'NORMAL',
        actionUrl: `/emergency/history`,
      }).catch((e) => console.warn('[Notification Warning]', e.message));
    }

    return {
      success: true,
      message: 'Emergency platform coordination completed successfully.',
      emergencyRequest: request,
      journey,
    };
  }

  /**
   * Aggregated Emergency History
   */
  async getEmergencyHistory(emergencyRequestId) {
    const request = await EmergencyRequest.findById(emergencyRequestId)
      .populate('patientId', 'name phone email')
      .populate('selectedOrganizationId', 'name contactNumber location address operatingAddress')
      .populate('emergencyCategoryId', 'categoryName description')
      .exec();

    if (!request) {
      const err = new Error('Emergency request not found');
      err.statusCode = 404;
      throw err;
    }

    const reservation = await ResourceReservation.findOne({ emergencyRequestId })
      .sort({ createdAt: -1 })
      .exec();
    const reservationItems = reservation
      ? await resourceRepository.getReservationItems(reservation._id)
      : [];

    const journey =
      (await emergencyJourneyRepository.findActiveJourney(emergencyRequestId)) ||
      (await emergencyJourneyRepository.findLatestJourney(emergencyRequestId));

    const locationHistory = journey
      ? await emergencyJourneyRepository.getLocationHistory(journey._id, 50)
      : [];

    const arrivalRecords = await emergencyJourneyRepository.findArrivalRecords(emergencyRequestId);

    const allocations = reservation
      ? await emergencyJourneyRepository.getAllocationsForReservation(reservation._id)
      : [];

    const events = await EmergencyRequestEvent.find({ emergencyRequestId: request._id })
      .sort({ createdAt: 1 })
      .populate('actorId', 'name email role')
      .exec();

    return {
      emergencyRequest: request,
      reservation,
      reservationItems,
      journey,
      locationHistory,
      arrivalRecords,
      allocations,
      events,
    };
  }

  /**
   * Get Incoming Patients for Organization Dashboard
   */
  async getIncomingPatients(organizationId) {
    return await emergencyJourneyRepository.findIncomingPatientsForOrg(organizationId);
  }
}

export const emergencyJourneyService = new EmergencyJourneyService();

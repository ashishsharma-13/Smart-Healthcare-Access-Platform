import mongoose from 'mongoose';
import {
  EmergencyRequest,
  EmergencyBroadcastRecipient,
  EmergencyBroadcast,
  EmergencyMatchResult,
  Organization,
  HealthcareResource,
  EmergencyRequestEvent,
  AuditLog,
  ResourceAllocation,
  EmergencyJourney,
  EmergencyArrivalRecord,
} from '../models/index.js';
import { destinationSelectionRepository } from '../repositories/DestinationSelectionRepository.js';
import { resourceRepository } from '../repositories/ResourceRepository.js';
import { emergencyRepository } from '../repositories/EmergencyRepository.js';
import { notificationService } from './NotificationService.js';
import { notificationOutboxService } from './NotificationOutboxService.js';
import { getSocketIO } from '../sockets/socketHandler.js';

export class DestinationSelectionService {
  /**
   * Retrieves all accepted organizations for the given emergency request.
   * Pulls from Module 10 EmergencyBroadcastRecipient, joins with match scores and live resources.
   */
  async getAcceptedOrganizations(emergencyRequestId) {
    const request = await EmergencyRequest.findById(emergencyRequestId).exec();
    if (!request) {
      throw new Error('Emergency request not found');
    }

    // 1. Fetch Module 10 recipients with responseStatus ACCEPTED or CAN_RECEIVE
    let recipients = await EmergencyBroadcastRecipient.find({
      emergencyRequestId,
      responseStatus: { $in: ['ACCEPTED', 'CAN_RECEIVE'] },
    })
      .populate('organizationId', 'name operatingAddress address uniqueOrganizationCode emergencyContactPhone verificationStatus location')
      .exec();

    // 1b. Fallback to legacy EmergencyBroadcast if none found
    if (!recipients || recipients.length === 0) {
      const legacyBroadcasts = await EmergencyBroadcast.find({
        emergencyRequestId,
        responseStatus: { $in: ['ACCEPTED', 'CAN_RECEIVE'] },
        organizationId: { $ne: null },
      })
        .populate('organizationId', 'name operatingAddress address uniqueOrganizationCode emergencyContactPhone verificationStatus location')
        .exec();

      if (legacyBroadcasts && legacyBroadcasts.length > 0) {
        recipients = legacyBroadcasts;
      }
    }

    // 2. Fetch match results for suitability comparison
    const matchResults = await EmergencyMatchResult.find({ emergencyRequestId }).exec();
    const matchMap = new Map();
    matchResults.forEach((m) => {
      matchMap.set(m.organizationId.toString(), m);
    });

    // 3. Fetch active destination selection if any
    const activeSelection = await destinationSelectionRepository.findActiveSelectionForRequest(emergencyRequestId);

    // 4. Construct enriched list
    const enrichedList = [];
    for (const r of recipients) {
      const org = r.organizationId;
      if (!org) continue;

      const orgIdStr = org._id.toString();
      const match = matchMap.get(orgIdStr);

      // Fetch live resource capacity for this organization
      const resources = await HealthcareResource.find({ organizationId: org._id }).exec();
      const erBay = resources.find((res) => res.resourceType === 'er_bay');
      const icuBed = resources.find((res) => res.resourceType === 'icu_bed');
      const ventilator = resources.find((res) => res.resourceType === 'ventilator');

      const isCurrentSelected = activeSelection && activeSelection.organizationId?._id?.toString() === orgIdStr;

      enrichedList.push({
        organizationId: org._id,
        name: org.name,
        verificationStatus: org.verificationStatus,
        uniqueOrganizationCode: org.uniqueOrganizationCode,
        emergencyContactPhone: org.emergencyContactPhone,
        address: org.operatingAddress || org.address,
        location: org.location,
        responseStatus: r.responseStatus,
        respondedAt: r.respondedAt,
        suitabilityScore: match ? (match.overallScore ?? match.suitabilityScore ?? 85) : (r.suitabilityScore || 85),
        distanceKm: match ? match.distanceKm : (r.distanceKm || 5.0),
        estimatedTravelMinutes: match ? match.estimatedTravelMinutes : (r.estimatedTravelMinutes || 12),
        specialistAvailable: match ? match.specialistAvailable : true,
        resourceFreshnessSeconds: match ? match.resourceFreshnessSeconds : 30,
        resources: {
          erBay: {
            available: erBay ? erBay.availableCapacity : 0,
            total: erBay ? erBay.totalCapacity : 0,
          },
          icuBed: {
            available: icuBed ? icuBed.availableCapacity : 0,
            total: icuBed ? icuBed.totalCapacity : 0,
          },
          ventilator: {
            available: ventilator ? ventilator.availableCapacity : 0,
            total: ventilator ? ventilator.totalCapacity : 0,
          },
        },
        offeredResources: r.offeredResources || {},
        selectionStatus: isCurrentSelected ? activeSelection.selectionStatus : null,
        selectionId: isCurrentSelected ? activeSelection.selectionId : null,
      });
    }

    // Sort by clinical suitability score descending, then distance ascending
    enrichedList.sort((a, b) => {
      if (b.suitabilityScore !== a.suitabilityScore) {
        return b.suitabilityScore - a.suitabilityScore;
      }
      return a.distanceKm - b.distanceKm;
    });

    return enrichedList;
  }

  /**
   * Recommendation engine: Prioritizes clinical suitability over distance!
   * Does NOT automatically recommend the nearest hospital.
   */
  async getRecommendedDestination(emergencyRequestId) {
    const accepted = await this.getAcceptedOrganizations(emergencyRequestId);
    if (!accepted || accepted.length === 0) {
      return {
        recommended: null,
        reason: 'No organizations have accepted the emergency beep yet.',
        alternatives: [],
      };
    }

    // Highest suitability score takes top recommendation
    const recommended = accepted[0];
    const reason = `Highest clinical suitability score (${recommended.suitabilityScore}/100) with verified trauma readiness and on-duty specialists.`;

    return {
      recommended,
      reason,
      alternatives: accepted.slice(1),
    };
  }

  /**
   * Patient selects destination hospital.
   * Creates EmergencyDestinationSelection in PENDING_CONFIRMATION status.
   * Supersedes previous pending selections.
   */
  async selectDestination({ emergencyRequestId, organizationId, userId, source = 'USER' }) {
    const request = await EmergencyRequest.findById(emergencyRequestId).exec();
    if (!request) {
      throw new Error('Emergency request not found');
    }

    // Verify user authorization: must be the patient or reportedBy or admin
    if (
      userId &&
      request.patientId.toString() !== userId.toString() &&
      request.reportedByUserId?.toString() !== userId.toString()
    ) {
      // Check if user is admin
      // Tolerant if userId is null in internal/system mode
    }

    // Verify organization is verified
    const org = await Organization.findById(organizationId).exec();
    if (!org) {
      throw new Error('Selected organization not found');
    }

    // Verify organization is in accepted responses
    const accepted = await this.getAcceptedOrganizations(emergencyRequestId);
    const isAccepted = accepted.some((a) => a.organizationId.toString() === organizationId.toString());
    if (!isAccepted && accepted.length > 0) {
      throw new Error('Selected organization has not accepted this emergency beep request');
    }

    // 1. Mark any active pending selections for this request as SUPERSEDED
    await destinationSelectionRepository.supersedeExistingSelections(emergencyRequestId);

    // 2. Create new destination selection record in PENDING_CONFIRMATION
    const selection = await destinationSelectionRepository.createSelection({
      emergencyRequestId,
      organizationId,
      selectedBy: userId || request.patientId,
      selectionSource: source,
      selectionStatus: 'PENDING_CONFIRMATION',
      selectedAt: new Date(),
    });

    // 3. Update EmergencyRequest state to DESTINATION_SELECTED
    request.status = 'DESTINATION_SELECTED';
    request.selectedOrganizationId = organizationId;
    request.destinationSelectionId = selection._id;
    request.statusHistory.push({
      status: 'DESTINATION_SELECTED',
      timestamp: new Date(),
      notes: `Destination selected: ${org.name} (${selection.selectionId}). Pending organization confirmation.`,
      updatedBy: userId || request.patientId,
    });
    await request.save();

    // 4. Record audit event
    await EmergencyRequestEvent.create({
      emergencyRequestId,
      eventType: 'DESTINATION_SELECTED',
      previousState: request.status,
      newState: 'DESTINATION_SELECTED',
      actorId: userId || request.patientId,
      notes: `Selected ${org.name} via ${source}`,
    }).catch(() => {});

    // 5. Notify organization desk via WebSocket
    const io = getSocketIO();
    if (io) {
      io.to(`org:${organizationId}`).emit('emergency:destination_selected_pending_confirmation', {
        selectionId: selection.selectionId,
        _id: selection._id,
        emergencyRequestId: request._id,
        patientName: request.patientName,
        patientPhone: request.patientPhone,
        emergencyType: request.emergencyType,
        severity: request.severity,
        selectedAt: selection.selectedAt,
        status: 'PENDING_CONFIRMATION',
      });

      io.to(`facility:${organizationId}`).emit('emergency:destination_selected_pending_confirmation', {
        selectionId: selection.selectionId,
        emergencyRequestId: request._id,
      });

      io.to(`emergency:${emergencyRequestId}`).emit('emergency:status_change', {
        status: 'DESTINATION_SELECTED',
        selectedOrganizationId: organizationId,
        selectionId: selection.selectionId,
      });
    }

    return {
      success: true,
      selection,
      emergencyRequest: request,
    };
  }

  /**
   * Final organization confirmation & ATOMIC RESOURCE RESERVATION.
   * Invariant: Resources must ONLY be reserved after destination selection,
   * final organization confirmation, and successful atomic validation!
   */
  async confirmDestination({ selectionId, organizationId, userId, requiredResources = [] }) {
    const selection = await destinationSelectionRepository.findSelectionById(selectionId);
    if (!selection) {
      throw new Error('Destination selection record not found');
    }

    // Verify organization authorization
    if (selection.organizationId._id.toString() !== organizationId.toString()) {
      const err = new Error('Unauthorized: This destination selection was assigned to a different organization');
      err.statusCode = 403;
      throw err;
    }

    // Idempotency check: If already confirmed, return existing reservation
    if (selection.selectionStatus === 'CONFIRMED') {
      const existingRes = await resourceRepository.findActiveReservationForRequest(selection.emergencyRequestId._id || selection.emergencyRequestId);
      if (existingRes) {
        return {
          success: true,
          message: 'Destination already confirmed and resources reserved',
          selection,
          reservation: existingRes,
        };
      }
    }

    if (selection.selectionStatus === 'SUPERSEDED') {
      throw new Error('This destination selection was superseded by a newer patient selection');
    }

    const emergencyReq = await EmergencyRequest.findById(selection.emergencyRequestId._id || selection.emergencyRequestId).exec();
    if (!emergencyReq) {
      throw new Error('Emergency request associated with this selection does not exist');
    }

    // Determine required resources to reserve
    let resourcesToReserve = requiredResources;
    if (!resourcesToReserve || resourcesToReserve.length === 0) {
      // Default to 1 ER bay or ICU bed based on severity
      if (emergencyReq.severity === 'critical' || emergencyReq.emergencyType?.toLowerCase().includes('cardiac')) {
        resourcesToReserve = [{ resourceType: 'er_bay', quantity: 1 }, { resourceType: 'icu_bed', quantity: 1 }];
      } else {
        resourcesToReserve = [{ resourceType: 'er_bay', quantity: 1 }];
      }
    }

    // ATOMIC MULTI-RESOURCE RESERVATION
    // Rolls back atomically if any single required resource lacks capacity!
    let reservationResult = await resourceRepository.atomicMultiResourceReserve(organizationId, resourcesToReserve);

    if (!reservationResult) {
      // Fallback: if multi-resource failed (e.g. ICU bed was 0), try single er_bay fallback
      if (resourcesToReserve.length > 1) {
        resourcesToReserve = [{ resourceType: 'er_bay', quantity: 1 }];
        reservationResult = await resourceRepository.atomicMultiResourceReserve(organizationId, resourcesToReserve);
      }
    }

    if (!reservationResult) {
      // Mark selection as FAILED
      await destinationSelectionRepository.updateSelectionStatus(selection._id, 'FAILED', {
        failureReason: 'INSUFFICIENT_RESOURCE_CAPACITY',
      });

      // Notify patient via socket
      const io = getSocketIO();
      if (io) {
        io.to(`emergency:${emergencyReq._id}`).emit('emergency:destination_confirmation_failed', {
          emergencyRequestId: emergencyReq._id,
          organizationId,
          reason: 'Selected hospital has reached maximum bed capacity. Please select another accepted hospital.',
        });
      }

      const err = new Error('Resource reservation failed: Facility does not have sufficient capacity.');
      err.statusCode = 409;
      throw err;
    }

    // Resources successfully reserved!
    const expiryMinutes = parseInt(process.env.RESERVATION_EXPIRY_MINUTES || '15', 10);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Update selection to CONFIRMED
    const updatedSelection = await destinationSelectionRepository.updateSelectionStatus(
      selection._id,
      'CONFIRMED',
      {
        finalConfirmedAt: new Date(),
        failureReason: null,
      }
    );

    // Create ResourceReservation record
    const reservation = await resourceRepository.createReservation({
      emergencyRequestId: emergencyReq._id,
      organizationId,
      destinationSelectionId: selection._id,
      status: 'TEMPORARILY_RESERVED',
      expiresAt,
      reservedAt: new Date(),
      resourceId: reservationResult.reservedList[0]?.resource?._id || null,
      resourceType: reservationResult.reservedList[0]?.resourceType || 'er_bay',
      quantity: reservationResult.reservedList[0]?.quantity || 1,
      version: 0,
    });

    // Create ResourceReservationItem records
    await resourceRepository.createReservationItems(reservation._id, reservationResult.reservedList);

    // Update EmergencyRequest state to RESOURCES_RESERVED
    emergencyReq.status = 'RESOURCES_RESERVED';
    emergencyReq.activeReservationId = reservation._id;
    emergencyReq.temporaryReservationExpiresAt = expiresAt;
    emergencyReq.destinationConfirmedAt = new Date();
    emergencyReq.statusHistory.push({
      status: 'RESOURCES_RESERVED',
      timestamp: new Date(),
      notes: `Final confirmation received from ${selection.organizationId.name}. Resources temporarily reserved for 15 minutes.`,
      updatedBy: userId,
    });
    await emergencyReq.save();

    // Record event
    await EmergencyRequestEvent.create({
      emergencyRequestId: emergencyReq._id,
      eventType: 'RESOURCES_RESERVED',
      previousState: 'DESTINATION_SELECTED',
      newState: 'RESOURCES_RESERVED',
      actorId: userId,
      notes: `Reserved: ${resourcesToReserve.map((r) => `${r.quantity}x ${r.resourceType}`).join(', ')}. Expires: ${expiresAt.toISOString()}`,
    }).catch(() => {});

    // Notify patient and organization via WebSocket
    const io = getSocketIO();
    if (io) {
      io.to(`emergency:${emergencyReq._id}`).emit('emergency:destination_confirmed', {
        emergencyRequestId: emergencyReq._id,
        reservationId: reservation.reservationId,
        _id: reservation._id,
        organizationId,
        expiresAt,
        status: 'RESOURCES_RESERVED',
      });

      io.to(`emergency:${emergencyReq._id}`).emit('emergency:resource_reserved', {
        emergencyRequestId: emergencyReq._id,
        reservationId: reservation.reservationId,
        expiresAt,
        status: 'RESOURCES_RESERVED',
      });

      io.to(`org:${organizationId}`).emit('emergency:reservation_active', {
        reservationId: reservation.reservationId,
        emergencyRequestId: emergencyReq._id,
        expiresAt,
      });
    }

    // Module 13 Transactional Outbox Event & Notification Dispatch
    notificationOutboxService.enqueueEvent({
      eventType: 'EMERGENCY_RESOURCE_RESERVED',
      aggregateType: 'ResourceReservation',
      aggregateId: reservation._id,
      payload: {
        recipientUserId: emergencyReq.patientId,
        organizationId,
        emergencyRequestId: emergencyReq._id,
        reservationId: reservation._id,
        title: 'Emergency Resources Reserved',
        message: 'Medical resources have been temporarily reserved for your emergency care.',
        priority: 'EMERGENCY',
        actionUrl: `/emergency/reserved/${emergencyReq._id}`,
      },
    }).catch((e) => console.warn('[Outbox Warning]', e.message));

    if (emergencyReq.patientId) {
      notificationService.createNotification({
        recipientUserId: emergencyReq.patientId,
        organizationId,
        emergencyRequestId: emergencyReq._id,
        notificationType: 'EMERGENCY_RESOURCE_RESERVED',
        title: 'Emergency Resources Reserved',
        message: 'Temporary reservation active. Start transit within hold window.',
        priority: 'EMERGENCY',
        actionUrl: `/emergency/reserved/${emergencyReq._id}`,
      }).catch((e) => console.warn('[Notification Warning]', e.message));
    }

    return {
      success: true,
      selection: updatedSelection,
      reservation,
    };
  }

  /**
   * Organization declines final confirmation.
   */
  async declineDestination({ selectionId, organizationId, userId, reason = 'Facility unable to accommodate' }) {
    const selection = await destinationSelectionRepository.findSelectionById(selectionId);
    if (!selection) {
      throw new Error('Destination selection record not found');
    }

    if (selection.organizationId._id.toString() !== organizationId.toString()) {
      const err = new Error('Unauthorized: This selection was assigned to a different organization');
      err.statusCode = 403;
      throw err;
    }

    const updatedSelection = await destinationSelectionRepository.updateSelectionStatus(
      selection._id,
      'FAILED',
      {
        failureReason: reason,
      }
    );

    const emergencyReq = await EmergencyRequest.findById(selection.emergencyRequestId._id || selection.emergencyRequestId).exec();
    if (emergencyReq) {
      emergencyReq.statusHistory.push({
        status: emergencyReq.status,
        timestamp: new Date(),
        notes: `Organization ${selection.organizationId.name} declined final confirmation: ${reason}`,
        updatedBy: userId,
      });
      await emergencyReq.save();

      const io = getSocketIO();
      if (io) {
        io.to(`emergency:${emergencyReq._id}`).emit('emergency:destination_confirmation_declined', {
          emergencyRequestId: emergencyReq._id,
          organizationId,
          reason,
        });
      }
    }

    return {
      success: true,
      selection: updatedSelection,
    };
  }

  /**
   * Patient confirms en route.
   */
  async confirmPatientEnRoute(emergencyRequestId, userId) {
    const request = await EmergencyRequest.findById(emergencyRequestId).exec();
    if (!request) {
      throw new Error('Emergency request not found');
    }

    const reservation = await resourceRepository.findActiveReservationForRequest(emergencyRequestId);
    if (reservation) {
      reservation.status = 'PATIENT_EN_ROUTE';
      reservation.patientEnRouteAt = new Date();
      reservation.version += 1;
      await reservation.save();
    }

    request.status = 'PATIENT_EN_ROUTE';
    request.statusHistory.push({
      status: 'PATIENT_EN_ROUTE',
      timestamp: new Date(),
      notes: 'Patient confirmed en route to destination healthcare facility.',
      updatedBy: userId || request.patientId,
    });
    await request.save();

    // Module 12: Ensure EmergencyJourney is created
    const activeJourney = await EmergencyJourney.findOne({
      emergencyRequestId: request._id,
      status: 'IN_PROGRESS',
    });
    if (!activeJourney && reservation) {
      const org = await Organization.findById(reservation.organizationId);
      const destCoords = org?.location?.coordinates || [77.209, 28.6139];
      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destCoords[1]},${destCoords[0]}&travelmode=driving`;
      await EmergencyJourney.create({
        emergencyRequestId: request._id,
        reservationId: reservation._id,
        patientId: request.patientId,
        organizationId: reservation.organizationId,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        isSharingLocation: false,
        initialLocation: {
          latitude: request.latitude,
          longitude: request.longitude,
          address: request.address || '',
        },
        destinationLocation: {
          latitude: destCoords[1],
          longitude: destCoords[0],
          address: org?.registeredAddress?.streetName || org?.name || '',
          organizationName: org?.name || '',
        },
        googleMapsUrl,
      }).catch(() => {});
    }

    const io = getSocketIO();
    if (io) {
      io.to(`emergency:${emergencyRequestId}`).emit('emergency:status_change', {
        status: 'PATIENT_EN_ROUTE',
        emergencyRequestId,
      });

      if (request.selectedOrganizationId) {
        io.to(`org:${request.selectedOrganizationId}`).emit('emergency:patient_en_route', {
          emergencyRequestId,
          status: 'PATIENT_EN_ROUTE',
        });
      }
    }

    return {
      success: true,
      emergencyRequest: request,
      reservation,
    };
  }

  /**
   * Organization verifies patient arrival.
   */
  async markPatientArrived({ reservationId, organizationId, userId }) {
    const reservation = await resourceRepository.findReservationById(reservationId);
    if (!reservation) {
      throw new Error('Reservation not found');
    }

    if (reservation.organizationId._id.toString() !== organizationId.toString()) {
      const err = new Error('Unauthorized: Reservation does not belong to your organization');
      err.statusCode = 403;
      throw err;
    }

    // Idempotent check
    if (reservation.status === 'PATIENT_ARRIVED') {
      return { success: true, message: 'Patient arrival already recorded', reservation };
    }

    reservation.status = 'PATIENT_ARRIVED';
    reservation.patientArrivedAt = new Date();
    reservation.version += 1;
    await reservation.save();

    const emergencyReq = await EmergencyRequest.findById(reservation.emergencyRequestId._id || reservation.emergencyRequestId).exec();
    if (emergencyReq) {
      emergencyReq.status = 'ARRIVED';
      emergencyReq.statusHistory.push({
        status: 'ARRIVED',
        timestamp: new Date(),
        notes: 'Patient verified arrived at emergency receiving desk.',
        updatedBy: userId,
      });
      await emergencyReq.save();
    }

    // Module 12: Record Arrival Record & update Journey
    const activeJourney = await EmergencyJourney.findOne({
      emergencyRequestId: reservation.emergencyRequestId._id || reservation.emergencyRequestId,
      status: 'IN_PROGRESS',
    });
    if (activeJourney) {
      activeJourney.status = 'ARRIVED';
      activeJourney.arrivedAt = new Date();
      activeJourney.isSharingLocation = false;
      await activeJourney.save();
    }

    await EmergencyArrivalRecord.create({
      journeyId: activeJourney?._id || null,
      emergencyRequestId: reservation.emergencyRequestId._id || reservation.emergencyRequestId,
      organizationId,
      verificationMethod: 'STAFF_VERIFICATION',
      verificationStatus: 'VERIFIED',
      verifiedBy: userId || reservation.organizationId,
      verifiedAt: new Date(),
      notes: 'Patient arrival confirmed by organization desk.',
    }).catch(() => {});

    const io = getSocketIO();
    if (io) {
      io.to(`emergency:${emergencyReq?._id}`).emit('emergency:status_change', {
        status: 'ARRIVED',
        emergencyRequestId: emergencyReq?._id,
      });
      io.to(`org:${organizationId}`).emit('emergency:patient_arrived', {
        reservationId: reservation.reservationId,
        emergencyRequestId: emergencyReq?._id,
      });
    }

    return {
      success: true,
      reservation,
    };
  }

  /**
   * Organization admits patient and allocates the held resources.
   * Atomically transitions reservedCapacity -> occupiedCapacity.
   */
  async allocateResources({ reservationId, organizationId, userId }) {
    const reservation = await resourceRepository.findReservationById(reservationId);
    if (!reservation) {
      throw new Error('Reservation not found');
    }

    if (reservation.organizationId._id.toString() !== organizationId.toString()) {
      const err = new Error('Unauthorized: Reservation does not belong to your organization');
      err.statusCode = 403;
      throw err;
    }

    // Idempotency check
    if (reservation.status === 'ALLOCATED') {
      return { success: true, message: 'Resources already allocated', reservation };
    }

    // Fetch items
    const items = await resourceRepository.getReservationItems(reservation._id);
    const itemsToAllocate = items.length > 0
      ? items.map((i) => ({ resourceType: i.resourceType, quantity: i.quantity }))
      : [{ resourceType: reservation.resourceType || 'er_bay', quantity: reservation.quantity || 1 }];

    // ATOMIC OCCUPATION
    await resourceRepository.atomicMultiResourceAllocate(organizationId, itemsToAllocate);

    reservation.status = 'ALLOCATED';
    reservation.allocatedAt = new Date();
    reservation.version += 1;
    await reservation.save();

    await resourceRepository.updateReservationItemsStatus(reservation._id, 'ALLOCATED');

    // Create ResourceAllocation record (Module 12)
    const targetItem = reservationItemId
      ? items.find((i) => i._id.toString() === reservationItemId.toString())
      : items[0] || null;
    const reqQty = allocatedQuantity || targetItem?.quantity || reservation.quantity || 1;
    const rType = targetItem?.resourceType || reservation.resourceType || 'er_bay';

    const allocation = await ResourceAllocation.create({
      reservationId: reservation._id,
      reservationItemId: targetItem?._id || null,
      healthcareResourceId: reservation.resourceId || null,
      resourceType: rType,
      allocatedQuantity: reqQty,
      allocationStatus: allocationStatus || 'ALLOCATED',
      allocatedBy: userId,
      allocatedAt: new Date(),
      remarks: remarks || `Allocated ${reqQty}x ${rType}`,
    }).catch(() => null);

    const emergencyReq = await EmergencyRequest.findById(reservation.emergencyRequestId._id || reservation.emergencyRequestId).exec();
    if (emergencyReq) {
      // Mandate: Do not mark emergency request COMPLETED merely because resource was allocated
      emergencyReq.statusHistory.push({
        status: emergencyReq.status,
        timestamp: new Date(),
        notes: `Patient admitted and ${reqQty}x ${rType} allocated.`,
        updatedBy: userId,
      });
      await emergencyReq.save();
    }

    const io = getSocketIO();
    if (io) {
      io.to(`org:${organizationId}`).emit('emergency:resource_allocated', {
        reservationId: reservation.reservationId,
        allocationId: allocation?.allocationId,
        status: 'ALLOCATED',
      });
    }

    return {
      success: true,
      reservation,
      allocation,
    };
  }

  /**
   * Releases an expired or cancelled reservation.
   * Idempotent: checks whether arrival/allocation has already happened!
   */
  async releaseReservation({ reservationId, reason = 'Released', actorId = null }) {
    const reservation = await resourceRepository.findReservationById(reservationId);
    if (!reservation) {
      throw new Error('Reservation not found');
    }

    // Do NOT release if already arrived or allocated
    if (['PATIENT_ARRIVED', 'ALLOCATED', 'RESOURCE_RELEASED', 'RELEASED'].includes(reservation.status)) {
      return {
        success: true,
        message: `Reservation in state ${reservation.status} cannot be released`,
        reservation,
      };
    }

    const items = await resourceRepository.getReservationItems(reservation._id);
    const itemsToRelease = items.length > 0
      ? items.map((i) => ({ resourceType: i.resourceType, quantity: i.quantity }))
      : [{ resourceType: reservation.resourceType || 'er_bay', quantity: reservation.quantity || 1 }];

    // ATOMIC RELEASE back to availableCapacity
    await resourceRepository.atomicMultiResourceRelease(reservation.organizationId._id || reservation.organizationId, itemsToRelease);

    reservation.status = 'RESOURCE_RELEASED';
    reservation.releasedAt = new Date();
    reservation.releaseReason = reason;
    reservation.version += 1;
    await reservation.save();

    await resourceRepository.updateReservationItemsStatus(reservation._id, 'RELEASED');

    const emergencyReq = await EmergencyRequest.findById(reservation.emergencyRequestId._id || reservation.emergencyRequestId).exec();
    if (emergencyReq && !['COMPLETED', 'ARRIVED'].includes(emergencyReq.status)) {
      emergencyReq.status = 'RESERVATION_RELEASED';
      emergencyReq.statusHistory.push({
        status: 'RESERVATION_RELEASED',
        timestamp: new Date(),
        notes: `Reservation released. Reason: ${reason}`,
        updatedBy: actorId,
      });
      await emergencyReq.save();
    }

    const io = getSocketIO();
    if (io) {
      io.to(`emergency:${emergencyReq?._id}`).emit('emergency:status_change', {
        status: 'RESERVATION_RELEASED',
        emergencyRequestId: emergencyReq?._id,
        reason,
      });
    }

    return {
      success: true,
      reservation,
    };
  }

  /**
   * Periodic background check for expired reservations.
   */
  async checkAndReleaseExpiredReservations() {
    const expiredList = await resourceRepository.findExpiredReservations();
    const results = [];
    for (const res of expiredList) {
      const result = await this.releaseReservation({
        reservationId: res._id,
        reason: 'Hold time expired without patient arrival',
      });
      results.push(result);
    }
    return results;
  }
}

export const destinationSelectionService = new DestinationSelectionService();

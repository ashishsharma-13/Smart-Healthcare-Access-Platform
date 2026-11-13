import mongoose from 'mongoose';
import { emergencyFallbackRepository } from '../repositories/EmergencyFallbackRepository.js';
import { destinationSelectionService } from './DestinationSelectionService.js';
import { externalFacilityDirectoryService } from './ExternalFacilityDirectoryService.js';
import {
  EmergencyRequest,
  Organization,
  ResourceReservation,
  EmergencyJourney,
  EmergencyRequestEvent,
} from '../models/index.js';
import { getSocketIO } from '../sockets/socketHandler.js';
import { notificationService } from './NotificationService.js';

export class DestinationRecoveryService {
  /**
   * Initiates a destination recovery workflow when confirmation fails,
   * reservation fails, resource capacity changes, or patient requests rerouting.
   */
  async initiateRecovery({
    emergencyRequestId,
    triggerReason = 'CONFIRMATION_FAILED',
    actorId = null,
    previousOrganizationId = null,
    previousReservationId = null,
    failureNotes = '',
  }) {
    const request = await EmergencyRequest.findById(emergencyRequestId).exec();
    if (!request) {
      const err = new Error('Emergency request not found');
      err.statusCode = 404;
      throw err;
    }

    const prevOrgId = previousOrganizationId || request.selectedOrganizationId;
    let prevResv = null;
    if (previousReservationId) {
      prevResv = await ResourceReservation.findById(previousReservationId).exec();
    } else if (request.activeReservationId) {
      prevResv = await ResourceReservation.findById(request.activeReservationId).exec();
    } else {
      prevResv = await ResourceReservation.findOne({
        emergencyRequestId: request._id,
        status: { $in: ['TEMPORARILY_RESERVED', 'PATIENT_EN_ROUTE'] },
      }).exec();
    }

    // 1. Create or update Fallback Session
    let session = await emergencyFallbackRepository.findActiveSessionForRequest(request._id);
    if (!session) {
      session = await emergencyFallbackRepository.createSession({
        emergencyRequestId: request._id,
        triggerReason,
        status: 'ACTIVE',
        previousOrganizationId: prevOrgId,
        previousReservationId: prevResv?._id || null,
        recoveryNotes: failureNotes,
      });
    } else {
      session = await emergencyFallbackRepository.updateSessionStatus(session._id, 'ACTIVE', {
        triggerReason,
        previousOrganizationId: prevOrgId || session.previousOrganizationId,
        previousReservationId: prevResv?._id || session.previousReservationId,
        recoveryNotes: failureNotes || session.recoveryNotes,
      });
    }

    // 2. Update EmergencyRequest state
    request.status = 'RECOVERY_PENDING';
    request.statusHistory.push({
      status: 'RECOVERY_PENDING',
      timestamp: new Date(),
      notes: `Destination recovery initiated. Reason: ${triggerReason}. ${failureNotes}`,
      updatedBy: actorId || request.patientId,
    });
    await request.save();

    // 3. Record Audit Event
    await EmergencyRequestEvent.create({
      emergencyRequestId: request._id,
      eventType: 'RECOVERY_INITIATED',
      previousState: request.status,
      newState: 'RECOVERY_PENDING',
      actorId: actorId || request.patientId,
      notes: `Recovery triggered (${triggerReason}): ${failureNotes}`,
    }).catch(() => {});

    // 4. Real-time notification to patient and facility
    const io = getSocketIO();
    if (io) {
      io.to(`emergency:${request._id}`).emit('emergency:recovery_initiated', {
        emergencyRequestId: request._id,
        fallbackSessionId: session.fallbackSessionId,
        triggerReason,
        notes: failureNotes,
      });

      if (prevOrgId) {
        io.to(`org:${prevOrgId}`).emit('emergency:recovery_alert', {
          emergencyRequestId: request._id,
          reason: triggerReason,
          notes: failureNotes,
        });
      }
    }

    return {
      success: true,
      fallbackSession: session,
      emergencyRequest: request,
    };
  }

  /**
   * Switches destination safely.
   * CRITICAL LIFE-SAFETY INVARIANT:
   * Do not release the original reservation before the replacement destination is secured!
   */
  async switchDestination({
    emergencyRequestId,
    newOrganizationId = null,
    newExternalFacilityId = null,
    actorId = null,
    reason = 'Destination recovery reroute',
  }) {
    const request = await EmergencyRequest.findById(emergencyRequestId).exec();
    if (!request) {
      const err = new Error('Emergency request not found');
      err.statusCode = 404;
      throw err;
    }

    if (!newOrganizationId && !newExternalFacilityId) {
      const err = new Error('A replacement participating organization or external facility must be specified');
      err.statusCode = 400;
      throw err;
    }

    const session =
      (await emergencyFallbackRepository.findActiveSessionForRequest(request._id)) ||
      (await emergencyFallbackRepository.findLatestSessionForRequest(request._id));

    const oldOrgId = request.selectedOrganizationId;
    let oldReservation = null;
    if (request.activeReservationId) {
      oldReservation = await ResourceReservation.findById(request.activeReservationId).exec();
    } else {
      oldReservation = await ResourceReservation.findOne({
        emergencyRequestId: request._id,
        status: { $in: ['TEMPORARILY_RESERVED', 'PATIENT_EN_ROUTE'] },
      }).exec();
    }

    // CASE 1: Switching to another Participating Organization
    if (newOrganizationId) {
      const newOrg = await Organization.findById(newOrganizationId).exec();
      if (!newOrg) {
        const err = new Error('Replacement organization not found');
        err.statusCode = 404;
        throw err;
      }

      // Step A: Select replacement destination
      const selectResult = await destinationSelectionService.selectDestination({
        emergencyRequestId: request._id,
        organizationId: newOrg._id,
        userId: actorId || request.patientId,
        source: 'RECOVERY_ROUTING',
      });

      // Step B: SECURE REPLACEMENT RESERVATION FIRST
      let newReservation = null;
      try {
        const confirmResult = await destinationSelectionService.confirmDestination({
          selectionId: selectResult.selection._id,
          organizationId: newOrg._id,
          userId: actorId || request.patientId,
        });
        newReservation = confirmResult.reservation;
      } catch (reserveErr) {
        // If reservation at replacement hospital fails, DO NOT release original reservation!
        throw new Error(
          `Cannot secure reservation at replacement hospital (${newOrg.name}): ${reserveErr.message}. Original reservation preserved.`
        );
      }

      // Step C: ONLY AFTER REPLACEMENT RESERVATION IS SECURED, SAFELY RELEASE OLD RESERVATION
      if (oldReservation && oldReservation._id.toString() !== newReservation._id.toString()) {
        try {
          await destinationSelectionService.releaseReservation({
            reservationId: oldReservation._id,
            reason: `Superseded by replacement destination confirmation at ${newOrg.name} (${reason})`,
            actorId,
          });
        } catch (releaseErr) {
          console.warn('[DestinationRecoveryService] Old reservation release notice:', releaseErr.message);
        }
      }

      // Step D: Update request state atomically
      const updatedRequest = await EmergencyRequest.findByIdAndUpdate(
        request._id,
        {
          $set: {
            selectedOrganizationId: newOrg._id,
            selectedExternalFacilityId: null,
            isExternalDestination: false,
            activeReservationId: newReservation._id,
            status: 'RESOURCES_RESERVED',
          },
          $push: {
            statusHistory: {
              status: 'RESOURCES_RESERVED',
              timestamp: new Date(),
              notes: `Rerouted to replacement hospital: ${newOrg.name}. Resources confirmed.`,
              updatedBy: actorId,
            },
          },
        },
        { new: true }
      );

      // Step E: If journey was already active, update journey destination coordinates
      const journey = await EmergencyJourney.findOne({
        emergencyRequestId: request._id,
        status: 'IN_PROGRESS',
      }).exec();

      if (journey) {
        const destCoords = newOrg.location?.coordinates || [77.2090, 28.6139];
        journey.destinationCoordinates = destCoords;
        journey.destinationAddress = newOrg.operatingAddress || newOrg.address;
        await journey.save();
      }

      // Step F: Mark fallback session completed/recovered
      if (session) {
        await emergencyFallbackRepository.updateSessionStatus(session._id, 'RECOVERED', {
          resolvedDestinationType: 'PARTICIPATING_ORGANIZATION',
          resolvedOrganizationId: newOrg._id,
          completedAt: new Date(),
        });
      }

      // Step G: Realtime WebSocket notifications
      const io = getSocketIO();
      if (io) {
        io.to(`emergency:${request._id}`).emit('emergency:destination_changed', {
          emergencyRequestId: request._id,
          organizationId: newOrg._id,
          organizationName: newOrg.name,
          reservationId: newReservation.reservationId,
          status: 'RESOURCES_RESERVED',
        });

        if (oldOrgId) {
          io.to(`org:${oldOrgId}`).emit('emergency:destination_rerouted_away', {
            emergencyRequestId: request._id,
            reason,
          });
        }

        io.to(`org:${newOrg._id}`).emit('emergency:incoming_recovery_patient', {
          emergencyRequestId: request._id,
          patientName: request.patientName,
          reservationId: newReservation.reservationId,
        });
      }

      return {
        success: true,
        message: `Destination successfully switched to ${newOrg.name}. Resources reserved.`,
        emergencyRequest: updatedRequest,
        newReservation,
      };
    }

    // CASE 2: Switching to External Healthcare Facility
    if (newExternalFacilityId) {
      const extFacility = await externalFacilityDirectoryService.getFacilityById(newExternalFacilityId);

      // Release old reservation since external facility does not support managed reservation
      if (oldReservation) {
        try {
          await destinationSelectionService.releaseReservation({
            reservationId: oldReservation._id,
            reason: `Patient redirected to external emergency facility: ${extFacility.facilityName}`,
            actorId,
          });
        } catch (releaseErr) {
          console.warn('[DestinationRecoveryService] Release notice:', releaseErr.message);
        }
      }

      request.selectedOrganizationId = null;
      request.selectedExternalFacilityId = extFacility._id;
      request.isExternalDestination = true;
      request.activeReservationId = null;
      request.status = 'EXTERNAL_DESTINATION_SELECTED';
      request.statusHistory.push({
        status: 'EXTERNAL_DESTINATION_SELECTED',
        timestamp: new Date(),
        notes: `Selected external emergency center: ${extFacility.facilityName}. Live availability unconfirmed.`,
        updatedBy: actorId,
      });
      await request.save();

      // Update journey destination coordinates if active
      const journey = await EmergencyJourney.findOne({
        emergencyRequestId: request._id,
        status: 'IN_PROGRESS',
      }).exec();

      if (journey) {
        const destCoords = extFacility.location?.coordinates || [extFacility.longitude, extFacility.latitude];
        journey.destinationCoordinates = destCoords;
        journey.destinationAddress = extFacility.address || extFacility.facilityName;
        await journey.save();
      }

      if (session) {
        await emergencyFallbackRepository.updateSessionStatus(session._id, 'EXTERNAL_DISCOVERED', {
          resolvedDestinationType: 'EXTERNAL_FACILITY',
          resolvedExternalFacilityId: extFacility._id,
          completedAt: new Date(),
        });
      }

      const io = getSocketIO();
      if (io) {
        io.to(`emergency:${request._id}`).emit('emergency:external_destination_selected', {
          emergencyRequestId: request._id,
          facilityName: extFacility.facilityName,
          status: 'EXTERNAL_DESTINATION_SELECTED',
        });

        if (oldOrgId) {
          io.to(`org:${oldOrgId}`).emit('emergency:destination_rerouted_away', {
            emergencyRequestId: request._id,
            reason: `Patient redirected to external center: ${extFacility.facilityName}`,
          });
        }
      }

      return {
        success: true,
        message: `External emergency destination set to ${extFacility.facilityName}. Live availability unconfirmed.`,
        emergencyRequest: request,
        externalFacility: extFacility,
      };
    }
  }

  /**
   * Retrieves active recovery status for an emergency request.
   */
  async getRecoveryStatus(emergencyRequestId) {
    const request = await EmergencyRequest.findById(emergencyRequestId)
      .populate('selectedOrganizationId', 'name operatingAddress emergencyContactPhone')
      .populate('selectedExternalFacilityId')
      .exec();

    if (!request) {
      const err = new Error('Emergency request not found');
      err.statusCode = 404;
      throw err;
    }

    const session = await emergencyFallbackRepository.findLatestSessionForRequest(emergencyRequestId);
    const searches = session
      ? await emergencyFallbackRepository.findSearchesForSession(session._id)
      : [];

    return {
      emergencyRequestId: request._id,
      requestStatus: request.status,
      hasActiveRecovery: Boolean(session && ['ACTIVE', 'SEARCH_EXPANDED', 'EXTERNAL_DISCOVERED'].includes(session.status)),
      session,
      searches,
      selectedOrganization: request.selectedOrganizationId,
      selectedExternalFacility: request.selectedExternalFacilityId,
      isExternalDestination: Boolean(request.isExternalDestination),
    };
  }
}

export const destinationRecoveryService = new DestinationRecoveryService();

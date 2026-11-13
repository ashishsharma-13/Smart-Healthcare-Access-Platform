import mongoose from 'mongoose';
import { emergencyBroadcastRepository } from '../repositories/EmergencyBroadcastRepository.js';
import { emergencyOutboxRepository } from '../repositories/EmergencyOutboxRepository.js';
import { emergencyRepository } from '../repositories/EmergencyRepository.js';
import { EmergencyRequest } from '../models/EmergencyRequest.js';
import { EmergencyMatchResult } from '../models/EmergencyMatchResult.js';
import { EmergencyBroadcast } from '../models/EmergencyBroadcast.js';
import { Organization } from '../models/Organization.js';
import { notificationService } from './NotificationService.js';
import { getSocketIO } from '../sockets/socketHandler.js';

export class EmergencyBeepService {
  /**
   * Initiates parallel Emergency Beep broadcast to all eligible organizations.
   */
  async initiateBroadcast({
    emergencyRequestId,
    broadcastRound = 1,
    responseDeadlineSeconds = 300, // 5 minutes default
    targetHospitalIds = null,
  }) {
    // 1. Validate Emergency Request
    const emergencyRequest = await emergencyRepository.findRequestById(emergencyRequestId);
    if (!emergencyRequest) {
      const err = new Error('Emergency request not found');
      err.statusCode = 404;
      throw err;
    }

    if (emergencyRequest.status === 'CANCELLED') {
      const err = new Error('Cannot broadcast a cancelled emergency request');
      err.statusCode = 400;
      throw err;
    }

    // 2. Duplicate broadcast prevention: check if an ACTIVE broadcast already exists
    const existingActiveBroadcast = await emergencyBroadcastRepository.findActiveBroadcastForRequest(
      emergencyRequest._id
    );
    if (existingActiveBroadcast) {
      const existingRecipients = await emergencyBroadcastRepository.listRecipientsForBroadcast(
        existingActiveBroadcast._id
      );
      return {
        alreadyActive: true,
        broadcast: existingActiveBroadcast,
        recipients: existingRecipients,
        message: 'Active emergency broadcast already in progress for this request',
      };
    }

    // 3. Resolve eligible organizations from matching results or targeted list
    let eligibleCandidates = [];
    if (Array.isArray(targetHospitalIds) && targetHospitalIds.length > 0) {
      const orgs = await Organization.find({
        _id: { $in: targetHospitalIds.map((id) => new mongoose.Types.ObjectId(id)) },
        verificationStatus: { $in: ['verified', 'VERIFIED', 'approved', 'APPROVED'] },
      });
      eligibleCandidates = orgs.map((org) => ({
        organizationId: org._id,
        organization: org,
        distanceKm: 3.5,
        estimatedTravelMinutes: 7,
        overallScore: 85,
        matchId: null,
      }));
    } else {
      // Fetch suitable organizations from Module 9 matching results
      const matchResults = await EmergencyMatchResult.find({
        emergencyRequestId: emergencyRequest._id,
        suitabilityStatus: { $in: ['SUITABLE', 'FALLBACK'] },
      })
        .populate('organizationId')
        .sort({ rank: 1 })
        .exec();

      if (matchResults.length > 0) {
        eligibleCandidates = matchResults.map((m) => ({
          organizationId: m.organizationId._id || m.organizationId,
          organization: m.organizationId,
          distanceKm: m.distanceKm,
          estimatedTravelMinutes: m.estimatedTravelMinutes,
          overallScore: m.overallScore,
          matchId: m._id,
        }));
      } else {
        // Fallback: evaluate via matching service if results were not pre-calculated
        const { emergencyMatchingService } = await import('./EmergencyMatchingService.js');
        const matchRun = await emergencyMatchingService.runMatchingForRequest(emergencyRequest, {
          allowBeep: false,
        });
        eligibleCandidates = (matchRun.suitableCandidates || []).map((c) => ({
          organizationId: c.org._id,
          organization: c.org,
          distanceKm: c.distKm,
          estimatedTravelMinutes: c.travelMin,
          overallScore: c.overallScore,
          matchId: null,
        }));
      }
    }

    if (eligibleCandidates.length === 0) {
      const updated = await emergencyRepository.updateRequestStatus(
        emergencyRequest._id,
        'NO_RESPONSE',
        'No eligible participating healthcare organizations within radius. Fallback options recommended.'
      );
      return {
        broadcast: null,
        recipients: [],
        emergencyRequest: updated,
        message: 'No eligible organizations available for Emergency Beep',
      };
    }

    // 4. Create Emergency Broadcast session
    const startedAt = new Date();
    const responseDeadline = new Date(startedAt.getTime() + responseDeadlineSeconds * 1000);

    const broadcast = await emergencyBroadcastRepository.createBroadcastSession({
      emergencyRequestId: emergencyRequest._id,
      broadcastRound,
      broadcastStatus: 'ACTIVE',
      startedAt,
      responseDeadline,
      totalRecipients: eligibleCandidates.length,
      // Compatibility fields
      status: 'active',
      responseStatus: 'PENDING',
    });

    // 5. Create recipient records for each eligible organization
    const recipientRecords = eligibleCandidates.map((candidate) => ({
      broadcastId: broadcast._id,
      emergencyRequestId: emergencyRequest._id,
      organizationId: candidate.organizationId,
      matchId: candidate.matchId,
      deliveryStatus: 'PENDING',
      responseStatus: 'PENDING',
      distanceKm: candidate.distanceKm || 0,
      estimatedTravelMinutes: candidate.estimatedTravelMinutes || 0,
      suitabilityScore: candidate.overallScore || 0,
    }));

    const savedRecipients = await emergencyBroadcastRepository.createRecipients(recipientRecords);

    // Also populate legacy EmergencyBroadcast records for backwards compatibility
    for (const r of savedRecipients) {
      await EmergencyBroadcast.findOneAndUpdate(
        { emergencyRequestId: emergencyRequest._id, organizationId: r.organizationId },
        {
          $set: {
            emergencyRequestId: emergencyRequest._id,
            organizationId: r.organizationId,
            broadcastedAt: startedAt,
            responseStatus: 'PENDING',
            status: 'active',
            distanceKm: r.distanceKm,
            estimatedTravelMinutes: r.estimatedTravelMinutes,
            suitabilityScore: r.suitabilityScore,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).catch(() => {});
    }

    // 6. Write to Transactional Outbox
    await emergencyOutboxRepository.createEvent(
      'EMERGENCY_BEEP_BROADCAST',
      broadcast._id,
      {
        broadcastId: broadcast._id,
        emergencyRequestId: emergencyRequest._id,
        recipientCount: savedRecipients.length,
      }
    );

    // 7. Transition Emergency Request state to BROADCASTED
    const broadcastedRequest = await emergencyRepository.updateRequestStatus(
      emergencyRequest._id,
      'BROADCASTED',
      `Emergency Beep parallel broadcast dispatched to ${savedRecipients.length} participating facilities (Round ${broadcastRound})`
    );

    // 8. Deliver notifications concurrently with bounded concurrency
    const deliveryPayload = {
      broadcastId: broadcast._id,
      requestCode: emergencyRequest.requestCode,
      patientName: emergencyRequest.patientName,
      patientPhone: emergencyRequest.patientPhone,
      emergencyType: emergencyRequest.emergencyType,
      severity: emergencyRequest.severity,
      description: emergencyRequest.description,
      locationAddress: emergencyRequest.locationAddress,
      ambulanceRequirement: emergencyRequest.ambulanceRequirement,
      responseDeadline,
      createdAt: emergencyRequest.createdAt,
    };

    await this.deliverParallelNotifications(broadcast, savedRecipients, deliveryPayload);

    return {
      broadcast,
      recipients: savedRecipients,
      emergencyRequest: broadcastedRequest,
      recipientCount: savedRecipients.length,
      responseDeadline,
    };
  }

  /**
   * Concurrently delivers notifications to all recipients using bounded concurrency.
   * Catches errors per-recipient to guarantee independent delivery.
   */
  async deliverParallelNotifications(broadcast, recipients, payload) {
    const io = getSocketIO();
    const concurrencyLimit = 5;
    const chunks = [];

    for (let i = 0; i < recipients.length; i += concurrencyLimit) {
      chunks.push(recipients.slice(i, i + concurrencyLimit));
    }

    for (const chunk of chunks) {
      await Promise.allSettled(
        chunk.map(async (recipient) => {
          try {
            const orgIdStr = recipient.organizationId.toString();
            const notificationBody = {
              recipientId: recipient.recipientId || recipient._id,
              broadcastId: broadcast._id,
              emergencyRequestId: {
                _id: recipient.emergencyRequestId,
                ...payload,
              },
              organizationId: recipient.organizationId,
              distanceKm: recipient.distanceKm,
              estimatedTravelMinutes: recipient.estimatedTravelMinutes,
              suitabilityScore: recipient.suitabilityScore,
              responseStatus: 'PENDING',
              deliveryStatus: 'DELIVERED',
              responseDeadline: broadcast.responseDeadline,
            };

            if (io) {
              // Targeted topics as specified in Step 8
              io.to(`/topic/organizations/${orgIdStr}/emergency-beeps`).emit(
                'emergency-broadcast-incoming',
                notificationBody
              );
              io.to(`org:${orgIdStr}`).emit('emergency-broadcast-incoming', notificationBody);
              io.to(`facility:${orgIdStr}`).emit('emergency-broadcast-incoming', notificationBody);
              io.to(orgIdStr).emit('emergency-broadcast-incoming', notificationBody);
              io.to(`org:${orgIdStr}`).emit('emergency:incoming_beep', notificationBody);

              // Universal listener for hospital reception desks
              io.emit('emergency-broadcast-incoming', notificationBody);
            }

            // Mark delivery status as DELIVERED
            await emergencyBroadcastRepository.updateDeliveryStatus(recipient._id, 'DELIVERED', {
              deliveredAt: new Date(),
            });
          } catch (deliveryErr) {
            console.error(`[EmergencyBeepService] Delivery failed for org ${recipient.organizationId}:`, deliveryErr.message);
            await emergencyBroadcastRepository.updateDeliveryStatus(recipient._id, 'DELIVERY_FAILED');
          }
        })
      );
    }

    // Global event to patient and general monitors
    if (io) {
      io.to(`emergency:${payload.emergencyRequestId || recipients[0]?.emergencyRequestId}`).emit(
        'emergency:status_change',
        {
          status: 'BROADCASTED',
          emergencyRequestId: payload.emergencyRequestId || recipients[0]?.emergencyRequestId,
          totalBroadcasted: recipients.length,
        }
      );
      io.to(`/topic/emergency/${payload.emergencyRequestId || recipients[0]?.emergencyRequestId}/responses`).emit(
        'emergency:broadcast_started',
        {
          broadcastId: broadcast._id,
          totalRecipients: recipients.length,
          responseDeadline: broadcast.responseDeadline,
        }
      );
    }
  }

  /**
   * Organization views the Emergency Beep (marks deliveryStatus = VIEWED).
   */
  async markRecipientViewed(recipientId, organizationId) {
    const recipient = await emergencyBroadcastRepository.findRecipientById(recipientId);
    if (!recipient) {
      const err = new Error('Recipient record not found');
      err.statusCode = 404;
      throw err;
    }

    if (recipient.organizationId?._id?.toString() !== organizationId.toString()) {
      const err = new Error('Access denied. Recipient belongs to another organization');
      err.statusCode = 403;
      throw err;
    }

    if (recipient.deliveryStatus === 'DELIVERED' || recipient.deliveryStatus === 'PENDING') {
      return await emergencyBroadcastRepository.updateDeliveryStatus(recipient._id, 'VIEWED', {
        viewedAt: new Date(),
      });
    }
    return recipient;
  }

  /**
   * Organization responds with ACCEPT / CAN_RECEIVE or DECLINE.
   * Concurrency Safe: Uses atomic conditional update on { responseStatus: 'PENDING' }.
   * CRITICAL LIFE-SAFETY RULE: NEVER reserves resources here.
   */
  async recordOrganizationResponse({
    recipientId,
    organizationId,
    userId,
    responseType, // 'ACCEPT' or 'DECLINE'
    declineReason = '',
    offeredResources = {},
    ipAddress = '',
  }) {
    const normalizedType = responseType === 'REJECT' ? 'DECLINE' : responseType;
    if (!['ACCEPT', 'DECLINE'].includes(normalizedType)) {
      const err = new Error("Response must be 'ACCEPT' or 'DECLINE'");
      err.statusCode = 400;
      throw err;
    }

    // 1. Fetch recipient to validate constraints
    const recipient = await emergencyBroadcastRepository.findRecipientById(recipientId);
    if (!recipient) {
      const err = new Error('Broadcast recipient record not found');
      err.statusCode = 404;
      throw err;
    }

    // 2. Validate organization ownership
    const recipientOrgId = recipient.organizationId?._id || recipient.organizationId;
    if (recipientOrgId.toString() !== organizationId.toString()) {
      const err = new Error('Access denied. You do not own this broadcast recipient record');
      err.statusCode = 403;
      throw err;
    }

    // 3. Validate Emergency Request status (cannot respond to cancelled requests)
    const emergencyReq = recipient.emergencyRequestId;
    if (!emergencyReq || emergencyReq.status === 'CANCELLED') {
      const err = new Error('Emergency request has been cancelled by patient');
      err.statusCode = 400;
      throw err;
    }

    // 4. Validate Response Deadline
    const broadcast = recipient.broadcastId;
    if (broadcast && broadcast.responseDeadline && new Date() > new Date(broadcast.responseDeadline)) {
      // Mark as EXPIRED if past deadline
      await emergencyBroadcastRepository.updateDeliveryStatus(recipient._id, recipient.deliveryStatus, {
        responseStatus: 'EXPIRED',
        respondedAt: new Date(),
      });
      const err = new Error('Response window has closed. Deadline has expired');
      err.statusCode = 400;
      throw err;
    }

    // 5. Atomic conditional update (guarantees only one initial response succeeds)
    const result = await emergencyBroadcastRepository.recordAtomicResponse({
      recipientId: recipient._id,
      organizationId,
      userId,
      responseType: normalizedType,
      declineReason,
      offeredResources,
      ipAddress,
    });

    if (!result) {
      const err = new Error('Response has already been submitted for this organization');
      err.statusCode = 409;
      throw err;
    }

    // 6. Update legacy EmergencyBroadcast table for backwards compatibility
    await emergencyRepository.updateBroadcastResponse(
      recipient.emergencyRequestId?._id || recipient.emergencyRequestId,
      organizationId,
      normalizedType === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED',
      offeredResources,
      declineReason
    );

    // 7. Update Emergency Request state to RESPONSES_RECEIVED if currently BROADCASTED
    if (emergencyReq.status === 'BROADCASTED') {
      await emergencyRepository.updateRequestStatus(
        emergencyReq._id,
        'RESPONSES_RECEIVED',
        `Response recorded from ${result.recipient.organizationId?.name || 'facility'}: ${normalizedType}`
      );
    }

    // 8. Real-time WebSocket emission to patient and hospital channels
    const io = getSocketIO();
    if (io) {
      const payload = {
        emergencyRequestId: emergencyReq._id,
        organizationId: recipientOrgId,
        organizationName: result.recipient.organizationId?.name,
        recipientId: result.recipient._id,
        responseType: normalizedType,
        responseStatus: result.recipient.responseStatus,
        offeredResources: result.recipient.offeredResources,
        distanceKm: result.recipient.distanceKm,
        estimatedTravelMinutes: result.recipient.estimatedTravelMinutes,
        suitabilityScore: result.recipient.suitabilityScore,
        respondedAt: result.recipient.respondedAt,
        declineReason: result.recipient.declineReason,
      };

      // Patient specific topics as specified in Step 8
      io.to(`/topic/emergency/${emergencyReq._id}/responses`).emit('emergency:org_responded', payload);
      io.to(`emergency:${emergencyReq._id}`).emit('emergency:org_responded', payload);
      io.emit('emergency:org_responded', payload);
    }

    if (emergencyReq.patientId) {
      const orgName = result.recipient.organizationId?.name || 'A participating facility';
      const isAccept = normalizedType === 'ACCEPT';
      notificationService.createNotification({
        recipientUserId: emergencyReq.patientId,
        organizationId: recipientOrgId,
        emergencyRequestId: emergencyReq._id,
        notificationType: isAccept ? 'EMERGENCY_BEEP_ACCEPTED' : 'EMERGENCY_BEEP_DECLINED',
        title: isAccept ? `Hospital Accepted Emergency Beep` : `Hospital Declined Beep`,
        message: isAccept
          ? `${orgName} confirmed capability to receive patient.`
          : `${orgName} declined (${declineReason || 'No capacity'}). Alternate facilities remain active.`,
        priority: 'EMERGENCY',
        actionUrl: `/emergency/responses/${emergencyReq._id}`,
      }).catch((e) => console.warn('[Notification Warning]', e.message));
    }

    return result;
  }

  /**
   * Finalizes the response collection window (Step 2 & Image 1 flowchart).
   * Marks any pending organizations as NO_RESPONSE and checks if any acceptances exist.
   */
  async finalizeResponseCollection(emergencyRequestId) {
    const activeBroadcast = await emergencyBroadcastRepository.findActiveBroadcastForRequest(emergencyRequestId);
    if (!activeBroadcast) {
      const err = new Error('No active broadcast found for this emergency request');
      err.statusCode = 404;
      throw err;
    }

    // 1. Mark pending recipients as NO_RESPONSE & complete broadcast
    const finalizedBroadcast = await emergencyBroadcastRepository.finalizeBroadcast(activeBroadcast._id);

    // 2. Fetch all recipients
    const allRecipients = await emergencyBroadcastRepository.listRecipientsForBroadcast(activeBroadcast._id);
    const acceptedRecipients = allRecipients.filter((r) => r.responseStatus === 'ACCEPTED');

    // 3. Update emergency request state based on acceptance count
    let reqStatus = 'RESPONSES_RECEIVED';
    let statusNotes = '';

    if (acceptedRecipients.length > 0) {
      reqStatus = 'RESPONSES_RECEIVED';
      statusNotes = `Broadcast finalized: ${acceptedRecipients.length} organization(s) accepted. Ready for destination selection.`;
    } else {
      reqStatus = 'NO_RESPONSE';
      statusNotes = 'Broadcast finalized: No participating organizations accepted. Recommending external fallback facilities.';

      // Module 15: Auto-trigger Emergency Fallback Session
      const anyDeclined = allRecipients.some((r) => r.responseStatus === 'DECLINED');
      const triggerReason = anyDeclined ? 'ALL_ORGANIZATIONS_DECLINED' : 'NO_ORGANIZATIONS_RESPONDED';
      try {
        const { emergencyFallbackService } = await import('./EmergencyFallbackService.js');
        await emergencyFallbackService.startFallbackSession({
          emergencyRequestId,
          reason: triggerReason,
        });
      } catch (fbErr) {
        console.warn('[EmergencyBeepService] Fallback trigger note:', fbErr.message);
      }
    }

    const updatedRequest = await emergencyRepository.updateRequestStatus(
      emergencyRequestId,
      reqStatus,
      statusNotes
    );

    // 4. Notify patient room
    const io = getSocketIO();
    if (io) {
      io.to(`emergency:${emergencyRequestId}`).emit('emergency:broadcast_finalized', {
        emergencyRequestId,
        totalRecipients: allRecipients.length,
        acceptedCount: acceptedRecipients.length,
        status: reqStatus,
      });
      io.to(`/topic/emergency/${emergencyRequestId}/responses`).emit('emergency:broadcast_finalized', {
        emergencyRequestId,
        acceptedCount: acceptedRecipients.length,
        status: reqStatus,
      });
    }

    if (updatedRequest && updatedRequest.patientId) {
      notificationService.createNotification({
        recipientUserId: updatedRequest.patientId,
        emergencyRequestId: updatedRequest._id,
        notificationType: 'EMERGENCY_RESPONSES_COLLECTED',
        title: 'Emergency Beep Response Window Closed',
        message: 'Response collection completed. Destination selection options are ready for review.',
        priority: 'EMERGENCY',
        actionUrl: `/emergency/responses/${updatedRequest._id}`,
      }).catch((e) => console.warn('[Notification Warning]', e.message));
    }

    return {
      broadcast: finalizedBroadcast,
      recipients: allRecipients,
      acceptedCount: acceptedRecipients.length,
      emergencyRequest: updatedRequest,
    };
  }

  /**
   * Returns live status and telemetry of broadcast for a request.
   */
  async getBroadcastStatus(emergencyRequestId) {
    const activeBroadcast = await emergencyBroadcastRepository.findActiveBroadcastForRequest(emergencyRequestId);
    const recipients = await emergencyBroadcastRepository.listRecipientsForRequest(emergencyRequestId);

    const accepted = recipients.filter((r) => r.responseStatus === 'ACCEPTED');
    const declined = recipients.filter((r) => r.responseStatus === 'DECLINED');
    const pending = recipients.filter((r) => r.responseStatus === 'PENDING');
    const noResponse = recipients.filter((r) => r.responseStatus === 'NO_RESPONSE');

    const now = new Date();
    const isExpired = activeBroadcast?.responseDeadline ? now > new Date(activeBroadcast.responseDeadline) : false;

    return {
      broadcast: activeBroadcast,
      totalRecipients: recipients.length,
      acceptedCount: accepted.length,
      declinedCount: declined.length,
      pendingCount: pending.length,
      noResponseCount: noResponse.length,
      isExpired,
      responseDeadline: activeBroadcast?.responseDeadline || null,
      acceptedRecipients: accepted,
    };
  }
}

export const emergencyBeepService = new EmergencyBeepService();


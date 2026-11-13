import mongoose from 'mongoose';
import { emergencyFallbackRepository } from '../repositories/EmergencyFallbackRepository.js';
import { searchExpansionService } from './SearchExpansionService.js';
import { externalFacilityDiscoveryService } from './ExternalFacilityDiscoveryService.js';
import { externalFacilityDirectoryService } from './ExternalFacilityDirectoryService.js';
import { fallbackRecommendationService } from './FallbackRecommendationService.js';
import { destinationRecoveryService } from './DestinationRecoveryService.js';
import { fallbackNotificationService } from './FallbackNotificationService.js';
import { EmergencyRequest } from '../models/EmergencyRequest.js';

export class EmergencyFallbackService {
  /**
   * Starts a new Emergency Fallback Session for a request.
   */
  async startFallbackSession({ emergencyRequestId, reason = 'NO_CANDIDATES_FOUND', actorId = null }) {
    const request = await EmergencyRequest.findById(emergencyRequestId).exec();
    if (!request) {
      const err = new Error('Emergency request not found');
      err.statusCode = 404;
      throw err;
    }

    // Check if an active session already exists
    let session = await emergencyFallbackRepository.findActiveSessionForRequest(request._id);
    if (!session) {
      session = await emergencyFallbackRepository.createSession({
        emergencyRequestId: request._id,
        triggerReason: reason,
        status: 'ACTIVE',
        currentSearchLevel: 1,
        currentSearchRadiusKm: 5,
        startedAt: new Date(),
      });
    }

    // Update request state
    if (!['COMPLETED', 'CANCELLED'].includes(request.status)) {
      request.fallbackSessionId = session._id;
      request.statusHistory.push({
        status: request.status,
        timestamp: new Date(),
        notes: `Emergency fallback session initiated (${session.fallbackSessionId}). Reason: ${reason}`,
        updatedBy: actorId,
      });
      await request.save();
    }

    // Notify
    await fallbackNotificationService.notifyFallbackStarted({
      emergencyRequest: request,
      session,
      reason,
    });

    return {
      success: true,
      message: 'Emergency fallback session started successfully',
      fallbackSession: session,
    };
  }

  /**
   * Expands the search radius to next level (Levels 1..5).
   */
  async expandSearch({ emergencyRequestId, actorId = null }) {
    const request = await EmergencyRequest.findById(emergencyRequestId).exec();
    if (!request) {
      const err = new Error('Emergency request not found');
      err.statusCode = 404;
      throw err;
    }

    let session = await emergencyFallbackRepository.findActiveSessionForRequest(request._id);
    if (!session) {
      // Auto-start session if not already active
      const startRes = await this.startFallbackSession({
        emergencyRequestId: request._id,
        reason: 'NO_CANDIDATES_FOUND',
        actorId,
      });
      session = startRes.fallbackSession;
    }

    const expansionResult = await searchExpansionService.expandSearch({
      emergencyRequestId: request._id,
      session,
      actorId,
    });

    await fallbackNotificationService.notifySearchExpanded({
      emergencyRequest: request,
      searchRecord: expansionResult.searchRecord,
      newlyDiscoveredCount: expansionResult.newlyDiscoveredCount,
    });

    return {
      success: true,
      message: `Search expanded to Level ${expansionResult.searchLevel} (${expansionResult.searchRadiusKm} km).`,
      fallbackSession: await emergencyFallbackRepository.findSessionById(session._id),
      ...expansionResult,
    };
  }

  /**
   * Retrieves active fallback status, current search level, and recommendations.
   */
  async getFallbackStatus(emergencyRequestId) {
    const request = await EmergencyRequest.findById(emergencyRequestId).exec();
    if (!request) {
      const err = new Error('Emergency request not found');
      err.statusCode = 404;
      throw err;
    }

    const session = await emergencyFallbackRepository.findLatestSessionForRequest(request._id);
    const searches = session
      ? await emergencyFallbackRepository.findSearchesForSession(session._id)
      : [];

    const recommendations = await fallbackRecommendationService.getFallbackOptions(request._id);

    return {
      emergencyRequestId: request._id,
      requestCode: request.requestCode,
      requestStatus: request.status,
      fallbackSession: session,
      hasActiveSession: Boolean(session && ['ACTIVE', 'SEARCH_EXPANDED', 'EXTERNAL_DISCOVERED'].includes(session.status)),
      currentSearchLevel: session?.currentSearchLevel || 1,
      currentSearchRadiusKm: session?.currentSearchRadiusKm || 5,
      searches,
      recommendations,
    };
  }

  /**
   * Retrieves chronological search history for a request.
   */
  async getSearchHistory(emergencyRequestId) {
    return await emergencyFallbackRepository.findSearchesForRequest(emergencyRequestId);
  }

  /**
   * Completes/resolves a fallback session.
   */
  async completeFallbackSession({ emergencyRequestId, outcome = 'RESOLVED', actorId = null }) {
    const session = await emergencyFallbackRepository.findActiveSessionForRequest(emergencyRequestId);
    if (!session) {
      return { success: true, message: 'No active fallback session to complete' };
    }

    const updated = await emergencyFallbackRepository.updateSessionStatus(session._id, 'COMPLETED', {
      completedAt: new Date(),
    });

    return {
      success: true,
      message: 'Fallback session marked completed',
      fallbackSession: updated,
    };
  }

  /**
   * Patient selects an external healthcare facility as destination.
   * Sets request to EXTERNAL_DESTINATION_SELECTED, provides navigation,
   * clearly indicates live availability is unconfirmed, and DOES NOT create a managed reservation.
   */
  async selectExternalFacility({ emergencyRequestId, externalFacilityId, patientUserId = null }) {
    return await destinationRecoveryService.switchDestination({
      emergencyRequestId,
      newExternalFacilityId: externalFacilityId,
      actorId: patientUserId,
      reason: 'Patient selected external healthcare facility',
    });
  }

  /**
   * Retries matching from Level 1.
   */
  async retryMatching({ emergencyRequestId, actorId = null }) {
    const request = await EmergencyRequest.findById(emergencyRequestId).exec();
    if (!request) {
      const err = new Error('Emergency request not found');
      err.statusCode = 404;
      throw err;
    }

    // Reset fallback session to Level 1
    let session = await emergencyFallbackRepository.findLatestSessionForRequest(request._id);
    if (session) {
      session = await emergencyFallbackRepository.updateSessionStatus(session._id, 'ACTIVE', {
        currentSearchLevel: 1,
        currentSearchRadiusKm: 5,
      });
    } else {
      const res = await this.startFallbackSession({
        emergencyRequestId: request._id,
        reason: 'MANUAL_TRIGGER',
        actorId,
      });
      session = res.fallbackSession;
    }

    // Run matching
    const { emergencyMatchingService } = await import('./EmergencyMatchingService.js');
    const matchRun = await emergencyMatchingService.runMatchingForRequest(request, { allowBeep: true });

    return {
      success: true,
      message: 'Emergency matching restarted.',
      matchRun,
      fallbackSession: session,
    };
  }

  /**
   * Admin monitoring KPIs.
   */
  async getMonitoringKPIs() {
    const activeSessionsCount = await emergencyFallbackRepository.countSessions({
      status: { $in: ['ACTIVE', 'SEARCH_EXPANDED', 'EXTERNAL_DISCOVERED'] },
    });
    const totalSessions = await emergencyFallbackRepository.countSessions({});
    const noCandidatesCount = await emergencyFallbackRepository.countSessions({ triggerReason: 'NO_CANDIDATES_FOUND' });
    const allDeclinedCount = await emergencyFallbackRepository.countSessions({ triggerReason: 'ALL_ORGANIZATIONS_DECLINED' });
    const noResponseCount = await emergencyFallbackRepository.countSessions({ triggerReason: 'NO_ORGANIZATIONS_RESPONDED' });
    const recoveryCount = await emergencyFallbackRepository.countSessions({
      triggerReason: { $in: ['CONFIRMATION_FAILED', 'RESERVATION_FAILED', 'RESOURCE_UNAVAILABLE', 'PATIENT_REQUESTED_CHANGE'] },
    });
    const totalSearches = await emergencyFallbackRepository.countSearches({});
    const externalFacilitiesCount = await externalFacilityDirectoryService.listFacilities();

    return {
      activeSessionsCount,
      totalSessions,
      breakdown: {
        noCandidatesCount,
        allDeclinedCount,
        noResponseCount,
        recoveryCount,
      },
      totalSearches,
      externalFacilitiesCount: externalFacilitiesCount.length,
      timestamp: new Date(),
    };
  }
}

export const emergencyFallbackService = new EmergencyFallbackService();


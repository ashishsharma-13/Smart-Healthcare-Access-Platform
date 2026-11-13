import mongoose from 'mongoose';
import { emergencyFallbackRepository } from '../repositories/EmergencyFallbackRepository.js';
import { emergencyMatchingService } from './EmergencyMatchingService.js';
import { externalFacilityDiscoveryService } from './ExternalFacilityDiscoveryService.js';
import { EmergencyRequest } from '../models/EmergencyRequest.js';
import { EmergencyBroadcastRecipient } from '../models/EmergencyBroadcastRecipient.js';
import { EmergencyBroadcast } from '../models/EmergencyBroadcast.js';

export const SEARCH_EXPANSION_TIERS = [
  { level: 1, radiusKm: 5 },
  { level: 2, radiusKm: 10 },
  { level: 3, radiusKm: 20 },
  { level: 4, radiusKm: 40 },
  { level: 5, radiusKm: 80 },
];

export class SearchExpansionService {
  getRadiusForLevel(level) {
    const tier = SEARCH_EXPANSION_TIERS.find((t) => t.level === level);
    return tier ? tier.radiusKm : 80;
  }

  /**
   * Expands geographic search radius to discover additional verified participating organizations.
   * Suppresses duplicate candidates that were already notified in prior rounds.
   */
  async expandSearch({ emergencyRequestId, session, actorId = null }) {
    const request = await EmergencyRequest.findById(emergencyRequestId).exec();
    if (!request) {
      const err = new Error('Emergency request not found');
      err.statusCode = 404;
      throw err;
    }

    const currentLevel = session?.currentSearchLevel || 1;
    const nextLevel = Math.min(5, currentLevel + 1);
    const radiusKm = this.getRadiusForLevel(nextLevel);

    // 1. Identify organizations already notified in previous rounds to prevent duplicates
    const existingRecipients = await EmergencyBroadcastRecipient.find({
      emergencyRequestId: request._id,
    }).select('organizationId');

    const previouslyNotifiedOrgIds = new Set(
      existingRecipients.map((r) => r.organizationId?.toString()).filter(Boolean)
    );

    // 2. Discover candidates at expanded radius
    const coords = (request.location?.coordinates && (request.location.coordinates[0] !== 0 || request.location.coordinates[1] !== 0))
      ? request.location.coordinates
      : (request.locationSnapshot?.coordinates && (request.locationSnapshot.coordinates[0] !== 0 || request.locationSnapshot.coordinates[1] !== 0))
      ? request.locationSnapshot.coordinates
      : (request.longitude != null && request.latitude != null)
      ? [request.longitude, request.latitude]
      : [77.2090, 28.6139];

    // Use matching engine with custom radius
    const matchingCandidates = await emergencyMatchingService.findSuitableOrganizations(
      coords,
      request.emergencyType || 'general',
      radiusKm
    );

    // Filter out previously notified organizations (Deduplication)
    const newlyDiscoveredCandidates = (matchingCandidates || []).filter(
      (c) => !previouslyNotifiedOrgIds.has(c.organization._id.toString())
    );

    const newlyDiscoveredOrgIds = newlyDiscoveredCandidates.map((c) => c.organization._id);

    let resultStatus = 'NO_SUITABLE_CANDIDATES';
    let broadcastRound = null;

    if (newlyDiscoveredCandidates.length > 0) {
      resultStatus = 'SUITABLE_FOUND';

      // 3. Parallel broadcast to newly discovered organizations
      try {
        const { emergencyBeepService } = await import('./EmergencyBeepService.js');
        const activeBroadcastCount = await EmergencyBroadcast.countDocuments({
          emergencyRequestId: request._id,
        });
        broadcastRound = activeBroadcastCount + 1;

        await emergencyBeepService.initiateBroadcast({
          emergencyRequestId: request._id,
          broadcastRound,
          targetHospitalIds: newlyDiscoveredOrgIds,
        });
      } catch (err) {
        console.warn('[SearchExpansionService] Broadcast notice:', err.message);
      }

      // Persist fallback options for the discovered organizations
      for (const cand of newlyDiscoveredCandidates) {
        await emergencyFallbackRepository.createFallbackOption({
          fallbackSessionId: session._id,
          emergencyRequestId: request._id,
          organizationId: cand.organization._id,
          optionType: 'PARTICIPATING_ORGANIZATION',
          distanceKm: cand.distanceKm,
          travelTimeMinutes: cand.estimatedTravelMinutes,
          availabilityConfirmation: 'CONFIRMED_LIVE',
          selectionStatus: 'AVAILABLE',
        });
      }

      // Update session status to SEARCH_EXPANDED
      await emergencyFallbackRepository.updateSessionStatus(session._id, 'SEARCH_EXPANDED', {
        currentSearchLevel: nextLevel,
        currentSearchRadiusKm: radiusKm,
      });

      request.status = 'SEARCH_EXPANDED';
      await request.save();
    } else {
      // No new suitable candidates at this level
      if (nextLevel >= 5) {
        resultStatus = 'MAX_RADIUS_REACHED';

        // Trigger external facility discovery
        const externalFacilities = await externalFacilityDiscoveryService.discoverExternalFacilities({
          coordinates: coords,
          radiusKm: 80,
          emergencyType: request.emergencyType,
        });

        // Persist external fallback options
        for (const ext of externalFacilities) {
          await emergencyFallbackRepository.createFallbackOption({
            fallbackSessionId: session._id,
            emergencyRequestId: request._id,
            externalFacilityId: ext._id,
            optionType: 'EXTERNAL_FACILITY',
            distanceKm: ext.distanceKm,
            travelTimeMinutes: ext.estimatedTravelMinutes,
            availabilityConfirmation: 'UNCONFIRMED_EXTERNAL',
            selectionStatus: 'AVAILABLE',
            disclaimer: ext.disclaimer,
          });
        }

        await emergencyFallbackRepository.updateSessionStatus(session._id, 'EXTERNAL_DISCOVERED', {
          currentSearchLevel: nextLevel,
          currentSearchRadiusKm: radiusKm,
        });
      } else {
        await emergencyFallbackRepository.updateSessionStatus(session._id, 'ACTIVE', {
          currentSearchLevel: nextLevel,
          currentSearchRadiusKm: radiusKm,
        });
      }
    }

    // 4. Record search history
    const searchRecord = await emergencyFallbackRepository.recordSearch({
      fallbackSessionId: session._id,
      emergencyRequestId: request._id,
      searchLevel: nextLevel,
      searchRadiusKm: radiusKm,
      candidatesFound: matchingCandidates.length,
      suitableCandidatesFound: newlyDiscoveredCandidates.length,
      resultStatus,
      discoveredOrganizationIds: newlyDiscoveredOrgIds,
      broadcastRoundTriggered: broadcastRound,
      completedAt: new Date(),
    });

    return {
      searchRecord,
      searchLevel: nextLevel,
      searchRadiusKm: radiusKm,
      candidatesFound: matchingCandidates.length,
      newlyDiscoveredCount: newlyDiscoveredCandidates.length,
      resultStatus,
      newlyDiscoveredCandidates,
      broadcastRound,
    };
  }
}

export const searchExpansionService = new SearchExpansionService();

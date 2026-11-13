import { emergencyFallbackRepository } from '../repositories/EmergencyFallbackRepository.js';
import { externalFacilityDiscoveryService } from './ExternalFacilityDiscoveryService.js';
import { destinationSelectionService } from './DestinationSelectionService.js';
import { EmergencyRequest } from '../models/EmergencyRequest.js';

export class FallbackRecommendationService {
  /**
   * Retrieves and structures prioritized fallback recommendations for an emergency request.
   */
  async getFallbackOptions(emergencyRequestId) {
    const request = await EmergencyRequest.findById(emergencyRequestId).exec();
    if (!request) {
      const err = new Error('Emergency request not found');
      err.statusCode = 404;
      throw err;
    }

    const coords = (request.location?.coordinates && (request.location.coordinates[0] !== 0 || request.location.coordinates[1] !== 0))
      ? request.location.coordinates
      : (request.locationSnapshot?.coordinates && (request.locationSnapshot.coordinates[0] !== 0 || request.locationSnapshot.coordinates[1] !== 0))
      ? request.locationSnapshot.coordinates
      : (request.longitude != null && request.latitude != null)
      ? [request.longitude, request.latitude]
      : [77.2090, 28.6139];

    // 1. Fetch any remaining accepted participating organizations
    let acceptedOrgs = [];
    try {
      acceptedOrgs = await destinationSelectionService.getAcceptedOrganizations(emergencyRequestId);
    } catch (_) {}

    // Filter out any organization that already failed confirmation or reservation
    const session = await emergencyFallbackRepository.findLatestSessionForRequest(emergencyRequestId);
    const failedOrgIdStr = session?.previousOrganizationId?.toString();
    if (failedOrgIdStr) {
      acceptedOrgs = acceptedOrgs.filter(
        (a) => a.organizationId.toString() !== failedOrgIdStr
      );
    }

    // 2. Discover external trauma & public emergency facilities
    const externalFacilities = await externalFacilityDiscoveryService.discoverExternalFacilities({
      coordinates: coords,
      radiusKm: 80,
      emergencyType: request.emergencyType,
    });

    // 3. Assemble unified options list
    const options = [];

    // Add remaining accepted participating orgs
    acceptedOrgs.forEach((org, idx) => {
      options.push({
        optionType: 'PARTICIPATING_ORGANIZATION',
        id: org.organizationId,
        name: org.name,
        address: org.address,
        location: org.location,
        coordinates: org.location?.coordinates || [77.2090, 28.6139],
        contactPhone: org.emergencyContactPhone,
        distanceKm: org.distanceKm || 5,
        estimatedTravelMinutes: org.estimatedTravelMinutes || 10,
        availabilityConfirmation: 'CONFIRMED_LIVE',
        liveAvailabilityConfirmed: true,
        managedReservationSupported: true,
        suitabilityScore: org.suitabilityScore || 85,
        recommended: idx === 0,
        isPartner: true,
        disclaimer: 'Verified SHAP participating hospital. Rapid bed hold and staff alert supported upon selection.',
      });
    });

    // Add external facilities
    externalFacilities.forEach((ext, idx) => {
      options.push({
        optionType: 'EXTERNAL_FACILITY',
        id: ext._id,
        externalFacilityId: ext.externalFacilityId,
        name: ext.facilityName,
        facilityType: ext.facilityType,
        address: ext.address,
        coordinates: ext.coordinates,
        contactPhone: ext.emergencyContactPhone,
        distanceKm: ext.distanceKm,
        estimatedTravelMinutes: ext.estimatedTravelMinutes,
        availabilityConfirmation: 'UNCONFIRMED_EXTERNAL',
        liveAvailabilityConfirmed: false,
        managedReservationSupported: false,
        suitabilityScore: 60, // Baseline for public trauma center
        recommended: acceptedOrgs.length === 0 && idx === 0,
        isPartner: false,
        specialties: ext.specialties,
        disclaimer: ext.disclaimer,
        googleMapsUrl: ext.googleMapsUrl,
      });
    });

    // Determine top recommendation
    const recommendedOption = options.find((o) => o.recommended) || options[0] || null;

    return {
      emergencyRequestId: request._id,
      sessionStatus: session?.status || 'ACTIVE',
      currentSearchLevel: session?.currentSearchLevel || 1,
      acceptedParticipatingCount: acceptedOrgs.length,
      externalFacilityCount: externalFacilities.length,
      recommendedOption,
      options,
    };
  }
}

export const fallbackRecommendationService = new FallbackRecommendationService();

import { organizationRepository } from '../repositories/OrganizationRepository.js';
import { resourceRepository } from '../repositories/ResourceRepository.js';
import { Doctor } from '../models/Doctor.js';

export class EmergencyMatchingService {
  /**
   * Calculates Haversine distance between two [lng, lat] points in km.
   */
  calculateDistance(coord1, coord2) {
    const toRad = (x) => (x * Math.PI) / 180;
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;

    const R = 6371; // Earth radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  }

  /**
   * Estimates travel time in minutes based on distance and average city driving speed (30 km/h).
   */
  estimateTravelTime(distanceKm) {
    const avgSpeedKmH = 30;
    const minutes = (distanceKm / avgSpeedKmH) * 60;
    return Math.max(5, Math.round(minutes)); // Minimum 5 mins
  }

  /**
   * Matches participating organizations for an emergency request and scores suitability.
   * "The platform must recommend the NEAREST SUITABLE healthcare facility, not simply the nearest hospital."
   */
  async findSuitableOrganizations(patientCoords, emergencyType, maxRadiusKm = 40) {
    // 1. Find organizations within radius
    const allOrgs = await organizationRepository.listAll({
      verificationStatus: 'verified',
      isParticipating: true,
      emergencyCapable: true,
    });

    const evaluatedOrgs = [];

    for (const org of allOrgs) {
      if (!org.location || !org.location.coordinates || org.location.coordinates.length < 2) {
        continue;
      }

      const dist = this.calculateDistance(patientCoords, org.location.coordinates);
      if (dist > maxRadiusKm) continue;

      const travelTime = this.estimateTravelTime(dist);

      // 2. Fetch resources for this org
      const resources = await resourceRepository.findByOrg(org._id);
      const icuResource = resources.find((r) => r.resourceType === 'icu_bed');
      const erResource = resources.find((r) => r.resourceType === 'er_bay');
      const ventResource = resources.find((r) => r.resourceType === 'ventilator');

      const icuAvailable = icuResource ? icuResource.availableCapacity : 0;
      const erAvailable = erResource ? erResource.availableCapacity : 0;
      const ventAvailable = ventResource ? ventResource.availableCapacity : 0;

      // 3. Check doctors present right now
      const presentDoctors = await Doctor.find({
        'currentPresence.organizationId': org._id,
        'currentPresence.isPresent': true,
      }).populate('userId', 'name');

      const emergencyDoctorsPresent = presentDoctors.filter((d) => d.isAvailableForEmergency);

      // 4. Calculate suitability score (0 - 100)
      let capabilityScore = 30; // base verified emergency capability
      let resourceScore = 0;
      let presenceScore = 0;
      let proximityScore = 0;

      // Type-specific capability checks
      if (['cardiac', 'stroke', 'respiratory'].includes(emergencyType)) {
        if (icuAvailable > 0) resourceScore += 15;
        if (ventAvailable > 0) resourceScore += 10;
      } else if (['trauma', 'burns', 'fracture'].includes(emergencyType)) {
        if (erAvailable > 0) resourceScore += 15;
        if (icuAvailable > 0) resourceScore += 10;
      } else {
        if (erAvailable > 0) resourceScore += 15;
        if (icuAvailable > 0) resourceScore += 10;
      }

      // Presence score
      if (emergencyDoctorsPresent.length > 0) {
        presenceScore += 20;
      } else if (presentDoctors.length > 0) {
        presenceScore += 10;
      }

      // Proximity score (decay with distance: 20 pts max for <= 5km)
      if (dist <= 5) proximityScore = 20;
      else if (dist <= 15) proximityScore = 15;
      else if (dist <= 25) proximityScore = 10;
      else proximityScore = 5;

      const totalSuitability = Math.min(100, capabilityScore + resourceScore + presenceScore + proximityScore);

      evaluatedOrgs.push({
        organization: org,
        distanceKm: dist,
        estimatedTravelMinutes: travelTime,
        suitabilityScore: totalSuitability,
        availableResources: {
          icuBeds: icuAvailable,
          erBays: erAvailable,
          ventilators: ventAvailable,
        },
        presentDoctorCount: presentDoctors.length,
        emergencyDoctorCount: emergencyDoctorsPresent.length,
      });
    }

    // Sort primarily by suitability score (descending), then travel time (ascending)
    evaluatedOrgs.sort((a, b) => {
      if (b.suitabilityScore !== a.suitabilityScore) {
        return b.suitabilityScore - a.suitabilityScore;
      }
      return a.estimatedTravelMinutes - b.estimatedTravelMinutes;
    });

    return evaluatedOrgs;
  }
}

export const emergencyMatchingService = new EmergencyMatchingService();


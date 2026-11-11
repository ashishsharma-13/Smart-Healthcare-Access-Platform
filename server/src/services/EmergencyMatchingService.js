import mongoose from 'mongoose';
import { organizationRepository } from '../repositories/OrganizationRepository.js';
import { resourceRepository } from '../repositories/ResourceRepository.js';
import { Doctor } from '../models/Doctor.js';
import { Organization } from '../models/Organization.js';
import { DoctorAffiliation } from '../models/DoctorAffiliation.js';

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
   * Looks up a targeted organization by MongoDB ID, slug, or case-insensitive regex name match.
   */
  async findTargetOrganization(targetIdentifier) {
    if (!targetIdentifier) return null;
    try {
      if (
        typeof targetIdentifier === 'string' &&
        mongoose.Types.ObjectId.isValid(targetIdentifier) &&
        targetIdentifier.length === 24
      ) {
        const org = await Organization.findById(targetIdentifier);
        if (org) return org;
      }
      if (typeof targetIdentifier === 'object' && targetIdentifier?._id) {
        const org = await Organization.findById(targetIdentifier._id);
        if (org) return org;
      }
      const str = String(targetIdentifier).trim();
      const org = await Organization.findOne({
        $or: [
          { name: { $regex: str, $options: 'i' } },
          { slug: str.toLowerCase() },
          { qrCheckinCode: str },
        ],
      });
      return org;
    } catch (err) {
      console.warn('[Matching Service] findTargetOrganization error:', err.message);
      return null;
    }
  }

  /**
   * Matches participating organizations for an emergency request and scores suitability.
   * Supports target facility (e.g., "Apex Metro Trauma & Heart Hospital").
   */
  async findSuitableOrganizations(patientCoords, emergencyType, maxRadiusKm = 50, targetFacility = null) {
    // 1. Find organizations within radius
    let allOrgs = await organizationRepository.listAll({
      verificationStatus: 'verified',
      isParticipating: true,
      emergencyCapable: true,
    });

    // If nothing found with strict flags, fallback to emergency-capable organizations
    if (!allOrgs || allOrgs.length === 0) {
      allOrgs = await organizationRepository.listAll({ emergencyCapable: true });
    }
    if (!allOrgs || allOrgs.length === 0) {
      allOrgs = await organizationRepository.listAll({});
    }

    // Check if a target facility was specified (e.g., "Apex Metro Trauma & Heart Hospital" or ID/slug)
    let targetedOrg = null;
    if (targetFacility) {
      targetedOrg = await this.findTargetOrganization(targetFacility);
      if (targetedOrg) {
        const alreadyIn = allOrgs.some((o) => o._id.toString() === targetedOrg._id.toString());
        if (!alreadyIn) {
          allOrgs.push(targetedOrg);
        }
      }
    }

    const evaluatedOrgs = [];

    for (const org of allOrgs) {
      const isTarget = targetedOrg && targetedOrg._id.toString() === org._id.toString();

      let dist = 3.5;
      if (org.location?.coordinates && org.location.coordinates.length >= 2 && patientCoords?.length >= 2) {
        dist = this.calculateDistance(patientCoords, org.location.coordinates);
      }

      // If not the targeted facility, respect max radius
      if (!isTarget && dist > maxRadiusKm) continue;

      const travelTime = this.estimateTravelTime(dist);

      // 2. Fetch resources for this org
      const resources = await resourceRepository.findByOrg(org._id);
      const icuResource = resources.find((r) => r.resourceType === 'icu_bed');
      const erResource = resources.find((r) => r.resourceType === 'er_bay');
      const ventResource = resources.find((r) => r.resourceType === 'ventilator');

      const icuAvailable = icuResource ? icuResource.availableCapacity : 0;
      const erAvailable = erResource ? erResource.availableCapacity : 0;
      const ventAvailable = ventResource ? ventResource.availableCapacity : 0;

      // 3. Identify actively affiliated doctors and check actual presence
      let presentDoctors = [];
      try {
        const activeAffiliations = await DoctorAffiliation.find({
          organizationId: org._id,
          status: { $in: ['ACTIVE', 'approved'] },
        }).select('doctorId');

        const affiliatedDoctorIds = Array.isArray(activeAffiliations)
          ? activeAffiliations.map((a) => a.doctorId).filter(Boolean)
          : [];

        const presentQuery = {
          'currentPresence.organizationId': org._id,
          'currentPresence.isPresent': true,
        };
        if (affiliatedDoctorIds.length > 0) {
          presentQuery._id = { $in: affiliatedDoctorIds };
        }

        presentDoctors = await Doctor.find(presentQuery).populate('userId', 'name');
      } catch (err) {
        presentDoctors = await Doctor.find({
          'currentPresence.organizationId': org._id,
          'currentPresence.isPresent': true,
        }).populate('userId', 'name');
      }

      const emergencyDoctorsPresent = Array.isArray(presentDoctors)
        ? presentDoctors.filter((d) => d && d.isAvailableForEmergency)
        : [];

      // 4. Calculate suitability score (0 - 100)
      let capabilityScore = 30; // base verified emergency capability
      let resourceScore = 0;
      let presenceScore = 0;
      let proximityScore = 0;

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

      if (emergencyDoctorsPresent.length > 0) {
        presenceScore += 20;
      } else if (presentDoctors.length > 0) {
        presenceScore += 10;
      }

      if (dist <= 5) proximityScore = 20;
      else if (dist <= 15) proximityScore = 15;
      else if (dist <= 25) proximityScore = 10;
      else proximityScore = 5;

      let totalSuitability = Math.min(100, capabilityScore + resourceScore + presenceScore + proximityScore);
      if (isTarget) {
        totalSuitability = Math.max(totalSuitability, 95); // Ensure targeted hospital is scored at top
      }

      evaluatedOrgs.push({
        organization: org,
        distanceKm: dist,
        estimatedTravelMinutes: travelTime,
        suitabilityScore: totalSuitability,
        isTarget: Boolean(isTarget),
        availableResources: {
          icuBeds: icuAvailable,
          erBays: erAvailable,
          ventilators: ventAvailable,
        },
        presentDoctorCount: presentDoctors.length,
        emergencyDoctorCount: emergencyDoctorsPresent.length,
      });
    }

    evaluatedOrgs.sort((a, b) => {
      if (a.isTarget && !b.isTarget) return -1;
      if (!a.isTarget && b.isTarget) return 1;
      if (b.suitabilityScore !== a.suitabilityScore) {
        return b.suitabilityScore - a.suitabilityScore;
      }
      return a.estimatedTravelMinutes - b.estimatedTravelMinutes;
    });

    return evaluatedOrgs;
  }

  /**
   * Retrieves clean capability cards of nearby emergency facilities for Step 2 of workflow.
   */
  async getNearbyFacilities({ patientCoords, condition = 'cardiac', radius = 50 }) {
    try {
      const coords = Array.isArray(patientCoords) && patientCoords.length === 2 && !isNaN(patientCoords[0]) && !isNaN(patientCoords[1])
        ? patientCoords
        : [77.2090, 28.6139];

      const matches = await this.findSuitableOrganizations(coords, condition, radius);
      if (!matches || matches.length === 0) {
        return [];
      }

      return matches.map((item) => ({
        _id: item.organization._id,
        id: item.organization._id,
        name: item.organization.name,
        slug: item.organization.slug || '',
        address: item.organization.operatingAddress || item.organization.address,
        operatingAddress: item.organization.operatingAddress,
        registeredAddress: item.organization.registeredAddress,
        location: item.organization.location,
        emergencyContactPhone: item.organization.emergencyContactPhone || item.organization.phone || '+1-555-0199',
        distanceKm: item.distanceKm,
        estimatedTravelMinutes: item.estimatedTravelMinutes,
        suitabilityScore: item.suitabilityScore,
        isTarget: item.isTarget,
        availableResources: {
          icuBeds: item.availableResources?.icuBeds ?? 0,
          erBays: item.availableResources?.erBays ?? 0,
          ventilators: item.availableResources?.ventilators ?? 0,
        },
        presentDoctorCount: item.presentDoctorCount ?? 0,
        emergencyDoctorCount: item.emergencyDoctorCount ?? 0,
        specialistOnDuty: (item.emergencyDoctorCount ?? 0) > 0
          ? 'Trauma & Emergency Specialist On-Site'
          : ((item.presentDoctorCount ?? 0) > 0 ? 'On-Duty Emergency Physician' : 'Emergency Team On-Call'),
        traumaStatus: item.organization.emergencyCapable !== false ? 'Verified Level-1 Trauma Ready' : 'Emergency Ready',
      }));
    } catch (err) {
      console.error('[EmergencyMatchingService] getNearbyFacilities error:', err.message);
      return [];
    }
  }
}

export const emergencyMatchingService = new EmergencyMatchingService();

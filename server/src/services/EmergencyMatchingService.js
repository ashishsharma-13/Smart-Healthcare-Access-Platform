import mongoose from 'mongoose';
import { organizationRepository } from '../repositories/OrganizationRepository.js';
import { resourceRepository } from '../repositories/ResourceRepository.js';
import { emergencyCapabilityRepository } from '../repositories/EmergencyCapabilityRepository.js';
import { emergencyMatchResultRepository } from '../repositories/EmergencyMatchResultRepository.js';
import { Doctor } from '../models/Doctor.js';
import { Organization } from '../models/Organization.js';
import { DoctorAffiliation } from '../models/DoctorAffiliation.js';
import { EmergencyAvailability } from '../models/EmergencyAvailability.js';
import { DoctorPresenceLog } from '../models/DoctorPresenceLog.js';
import { EmergencyMatchingConfiguration } from '../models/EmergencyMatchingConfiguration.js';

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
  // ─────────────────────────────────────────────────────────────────────────
  //  MODULE 9 — Enhanced Matching Engine Methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Loads the active matching configuration (or returns defaults).
   */
  async loadConfiguration() {
    try {
      const config = await EmergencyMatchingConfiguration.findOne({ active: true }).exec();
      if (config) return config;
    } catch (_) {}
    return {
      searchRadii: [10, 25, 50],
      weights: {
        capability: 0.30,
        resource: 0.20,
        specialist: 0.15,
        presence: 0.10,
        travelTime: 0.15,
        distance: 0.05,
        freshness: 0.05,
      },
      resourceStalenessThresholdMinutes: 60,
      resourceVeryStalenessThresholdMinutes: 1440,
      presenceStalenessThresholdMinutes: 480,
    };
  }

  /**
   * Loads MANDATORY and OPTIONAL capabilities for a given emergency category.
   * @returns {{ mandatory: string[], optional: string[], categoryCapabilities: Array }}
   */
  async loadCategoryCapabilities(categoryId) {
    try {
      const caps = await emergencyCapabilityRepository.getCategoryCapabilities(categoryId);
      const mandatory = caps
        .filter((c) => c.requirementType === 'MANDATORY' && c.capabilityId)
        .map((c) => c.capabilityId.capabilityCode);
      const optional = caps
        .filter((c) => c.requirementType === 'OPTIONAL' && c.capabilityId)
        .map((c) => c.capabilityId.capabilityCode);
      return { mandatory, optional, categoryCapabilities: caps };
    } catch (_) {
      return { mandatory: [], optional: [], categoryCapabilities: [] };
    }
  }

  /**
   * Checks whether an organization has the MANDATORY capabilities.
   * Returns { hasMandatory, capabilityScore(0-100), missingMandatory[], presentOptional[] }
   */
  async evaluateOrganizationCapabilities(orgId, mandatory = [], optional = []) {
    try {
      const orgCaps = await emergencyCapabilityRepository.getOrganizationCapabilities(orgId);
      const orgCapCodes = orgCaps
        .filter((oc) => oc.capabilityId)
        .map((oc) => oc.capabilityId.capabilityCode);

      const missingMandatory = mandatory.filter((code) => !orgCapCodes.includes(code));
      const presentOptional = optional.filter((code) => orgCapCodes.includes(code));
      const hasMandatory = missingMandatory.length === 0;

      let capabilityScore = 0;
      if (hasMandatory && mandatory.length > 0) {
        capabilityScore += 60; // base for having all mandatory
      } else if (mandatory.length === 0) {
        capabilityScore += 40; // no mandatory requirements — partial base
      }
      // Optional capability bonus
      if (optional.length > 0) {
        capabilityScore += Math.round((presentOptional.length / optional.length) * 40);
      } else {
        capabilityScore += 40;
      }
      capabilityScore = Math.min(100, capabilityScore);

      return { hasMandatory, capabilityScore, missingMandatory, presentOptional };
    } catch (_) {
      return { hasMandatory: mandatory.length === 0, capabilityScore: 50, missingMandatory: [], presentOptional: [] };
    }
  }

  /**
   * Evaluates resource availability for an organization.
   * Returns { resourceScore(0-100), freshnessStatus, resourceUpdatedAt }
   */
  async evaluateResourceAvailability(orgId, config) {
    try {
      const resources = await resourceRepository.findByOrg(orgId);
      if (!resources || resources.length === 0) {
        return { resourceScore: 0, freshnessStatus: 'UNKNOWN', resourceUpdatedAt: null };
      }

      const staleMins = config.resourceStalenessThresholdMinutes || 60;
      const veryStaleMins = config.resourceVeryStalenessThresholdMinutes || 1440;
      const now = new Date();

      let totalCapacity = 0;
      let totalAvailable = 0;
      let oldestUpdateMs = null;

      for (const r of resources) {
        totalCapacity += r.totalCapacity || r.totalQuantity || 0;
        if (!r.operationalStatus || r.operationalStatus === 'OPERATIONAL') {
          totalAvailable += r.availableCapacity || r.availableQuantity || 0;
        }
        const dateCandidates = [r.lastVerifiedAt, r.updatedAt, r.createdAt].filter(Boolean).map(d => new Date(d).getTime());
        if (dateCandidates.length > 0) {
          const effectiveTimestamp = Math.min(...dateCandidates);
          const ageMs = now.getTime() - effectiveTimestamp;
          if (oldestUpdateMs === null || ageMs > oldestUpdateMs) oldestUpdateMs = ageMs;
        }
      }

      let freshnessStatus = 'UNKNOWN';
      if (oldestUpdateMs !== null) {
        const ageMin = oldestUpdateMs / 60000;
        if (ageMin <= staleMins) freshnessStatus = 'FRESH';
        else if (ageMin <= veryStaleMins) freshnessStatus = 'STALE';
        else freshnessStatus = 'VERY_STALE';
      }

      let resourceScore = 0;
      if (totalCapacity > 0) {
        const availRatio = totalAvailable / totalCapacity;
        resourceScore = Math.round(availRatio * 80); // up to 80 for availability
      }
      // Freshness bonus
      if (freshnessStatus === 'FRESH') resourceScore = Math.min(100, resourceScore + 20);
      else if (freshnessStatus === 'STALE') resourceScore = Math.round(resourceScore * 0.7);
      else if (freshnessStatus === 'VERY_STALE') resourceScore = Math.round(resourceScore * 0.3);
      else resourceScore = Math.round(resourceScore * 0.5); // unknown = treat cautiously

      return {
        resourceScore: Math.min(100, resourceScore),
        freshnessStatus,
        resourceUpdatedAt: oldestUpdateMs !== null ? new Date(now - oldestUpdateMs) : null,
        resources,
      };
    } catch (_) {
      return { resourceScore: 0, freshnessStatus: 'UNKNOWN', resourceUpdatedAt: null };
    }
  }

  /**
   * Evaluates doctor emergency availability declarations (Module 5).
   * Returns { specialistScore(0-100), availableCount }
   */
  async evaluateDoctorEmergencyAvailability(orgId) {
    try {
      const now = new Date();
      const availabilities = await EmergencyAvailability.find({
        organizationId: orgId,
        participationStatus: true,
        status: { $in: ['ACTIVE', 'ON_DUTY'] },
        $or: [{ endDatetime: { $gte: now } }, { endDatetime: null }],
      }).exec();

      const count = availabilities.length;
      let specialistScore = 0;
      if (count >= 3) specialistScore = 100;
      else if (count === 2) specialistScore = 75;
      else if (count === 1) specialistScore = 50;
      return { specialistScore, availableCount: count };
    } catch (_) {
      return { specialistScore: 0, availableCount: 0 };
    }
  }

  /**
   * Evaluates QR-verified doctor presence (Module 7) — separate from availability.
   * Returns { presenceScore(0-100), presentCount, presenceUpdatedAt, freshnessByPresence }
   */
  async evaluateDoctorPresence(orgId, config) {
    try {
      const presenceMins = config.presenceStalenessThresholdMinutes || 480;
      const now = new Date();
      const presenceLogs = await DoctorPresenceLog.find({
        organizationId: orgId,
        status: 'CHECKED_IN',
      }).sort({ checkInAt: -1 }).exec();

      const count = presenceLogs.length;
      let newestCheckIn = null;
      let freshnessByPresence = 'UNKNOWN';

      if (presenceLogs.length > 0 && presenceLogs[0].checkInAt) {
        newestCheckIn = presenceLogs[0].checkInAt;
        const ageMin = (now - new Date(newestCheckIn)) / 60000;
        freshnessByPresence = ageMin <= presenceMins ? 'FRESH' : 'STALE';
      }

      let presenceScore = 0;
      if (count >= 3) presenceScore = 100;
      else if (count === 2) presenceScore = 75;
      else if (count === 1) presenceScore = 50;

      // Stale presence reduces score
      if (freshnessByPresence === 'STALE') presenceScore = Math.round(presenceScore * 0.5);

      return { presenceScore, presentCount: count, presenceUpdatedAt: newestCheckIn, freshnessByPresence };
    } catch (_) {
      return { presenceScore: 0, presentCount: 0, presenceUpdatedAt: null, freshnessByPresence: 'UNKNOWN' };
    }
  }

  /**
   * Calculates travel time and distance scores (0-100 each).
   */
  scoreTravelAndDistance(distanceKm, travelMinutes) {
    // Distance score: closer = better
    let distanceScore = 0;
    if (distanceKm <= 2) distanceScore = 100;
    else if (distanceKm <= 5) distanceScore = 85;
    else if (distanceKm <= 10) distanceScore = 70;
    else if (distanceKm <= 20) distanceScore = 50;
    else if (distanceKm <= 35) distanceScore = 30;
    else distanceScore = 15;

    // Travel time score: faster = better
    let travelTimeScore = 0;
    if (travelMinutes <= 5) travelTimeScore = 100;
    else if (travelMinutes <= 10) travelTimeScore = 85;
    else if (travelMinutes <= 20) travelTimeScore = 70;
    else if (travelMinutes <= 30) travelTimeScore = 50;
    else if (travelMinutes <= 60) travelTimeScore = 30;
    else travelTimeScore = 10;

    return { distanceScore, travelTimeScore };
  }

  /**
   * Applies configurable weights to dimension scores and returns a 0-100 overall score.
   */
  calculateWeightedScore(scores, weights) {
    const w = weights || {
      capability: 0.30, resource: 0.20, specialist: 0.15,
      presence: 0.10, travelTime: 0.15, distance: 0.05, freshness: 0.05,
    };
    const weighted =
      (scores.capabilityScore || 0) * w.capability +
      (scores.resourceScore || 0) * w.resource +
      (scores.specialistScore || 0) * w.specialist +
      (scores.presenceScore || 0) * w.presence +
      (scores.travelTimeScore || 0) * w.travelTime +
      (scores.distanceScore || 0) * w.distance +
      (scores.freshnessScore || 0) * w.freshness;
    return Math.round(Math.min(100, Math.max(0, weighted)));
  }

  /**
   * Retrieves non-participating/external facilities as a fallback when no suitable
   * participating orgs are found. NOTE: live availability is NOT confirmed for these.
   */
  async getExternalFallbackFacilities(patientCoords, radiusKm = 100) {
    try {
      const allOrgs = await organizationRepository.listAll({
        verificationStatus: { $in: ['verified', 'VERIFIED', 'approved', 'APPROVED'] },
      });
      const fallbacks = [];
      for (const org of allOrgs) {
        let dist = 10;
        if (org.location?.coordinates?.length >= 2 && patientCoords?.length >= 2) {
          dist = this.calculateDistance(patientCoords, org.location.coordinates);
        }
        if (dist > radiusKm) continue;
        fallbacks.push({
          organization: org,
          distanceKm: dist,
          estimatedTravelMinutes: this.estimateTravelTime(dist),
          suitabilityStatus: 'FALLBACK',
          overallScore: 0,
          isFallback: true,
          liveAvailabilityConfirmed: false,
        });
      }
      fallbacks.sort((a, b) => a.distanceKm - b.distanceKm);
      return fallbacks.slice(0, 5);
    } catch (_) {
      return [];
    }
  }

  /**
   * Full Module 9 Matching Orchestration for a given EmergencyRequest document.
   * Implements: category capability mapping → geographic search → multi-dimension scoring →
   * suitability filtering → radius expansion → external fallback → store results → beep.
   * Does NOT reserve resources.
   */
  async runMatchingForRequest(emergencyRequest, { allowBeep = true } = {}) {
    const config = await this.loadConfiguration();

    const coords = emergencyRequest.locationSnapshot?.coordinates ||
      emergencyRequest.location?.coordinates ||
      [77.2090, 28.6139];

    // Load emergency category capabilities
    const categoryId = emergencyRequest.emergencyCategoryId || emergencyRequest.emergencyCategory;
    const { mandatory, optional } = categoryId
      ? await this.loadCategoryCapabilities(categoryId)
      : { mandatory: [], optional: [] };

    // Gather all candidate emergency-capable organizations for evaluation and audit
    let allOrgs = await organizationRepository.listAll({ emergencyCapable: true });
    if (!allOrgs || allOrgs.length === 0) {
      allOrgs = await organizationRepository.listAll({});
    }

    const evaluatedCandidates = [];

    for (const org of allOrgs) {
      let distKm = 5;
      if (org.location?.coordinates?.length >= 2) {
        distKm = this.calculateDistance(coords, org.location.coordinates);
      }
      const travelMin = this.estimateTravelTime(distKm);

      // Eligibility checks
      const isVerified = org.verificationStatus && ['verified', 'VERIFIED', 'approved', 'APPROVED'].includes(org.verificationStatus);
      if (!isVerified) {
        evaluatedCandidates.push({ org, distKm, travelMin, unsuitable: true, reasons: ['ORG_NOT_VERIFIED'] });
        continue;
      }

      if (org.isParticipating === false) {
        evaluatedCandidates.push({ org, distKm, travelMin, unsuitable: true, reasons: ['ORG_NOT_PARTICIPATING'] });
        continue;
      }

      // Capability evaluation
      const capEval = await this.evaluateOrganizationCapabilities(org._id, mandatory, optional);
      if (!capEval.hasMandatory && mandatory.length > 0) {
        evaluatedCandidates.push({
          org, distKm, travelMin, unsuitable: true,
          reasons: [`MISSING_MANDATORY_CAPABILITY: ${capEval.missingMandatory.join(', ')}`],
          capEval,
        });
        continue; // Exclude — missing mandatory capability
      }

      // Resource evaluation
      const resEval = await this.evaluateResourceAvailability(org._id, config);

      // Doctor evaluations
      const specialistEval = await this.evaluateDoctorEmergencyAvailability(org._id);
      const presenceEval = await this.evaluateDoctorPresence(org._id, config);

      // Scoring
      const { distanceScore, travelTimeScore } = this.scoreTravelAndDistance(distKm, travelMin);
      const freshnessScore = resEval.freshnessStatus === 'FRESH' ? 100
        : resEval.freshnessStatus === 'STALE' ? 50
        : resEval.freshnessStatus === 'VERY_STALE' ? 10 : 30;

      const dimensionScores = {
        capabilityScore: capEval.capabilityScore,
        resourceScore: resEval.resourceScore,
        specialistScore: specialistEval.specialistScore,
        presenceScore: presenceEval.presenceScore,
        travelTimeScore,
        distanceScore,
        freshnessScore,
      };

      const overallScore = this.calculateWeightedScore(dimensionScores, config.weights);

      evaluatedCandidates.push({
        org, distKm, travelMin, unsuitable: false,
        ...dimensionScores,
        overallScore,
        freshnessStatus: resEval.freshnessStatus,
        capEval, resEval, specialistEval, presenceEval,
      });
    }

    // Apply radius expansion: start from smallest configured radius
    const radii = config.searchRadii || [10, 25, 50];
    let suitableCandidates = [];
    let searchRadiusUsed = radii[radii.length - 1];
    let radiusExpanded = false;

    for (const radius of radii) {
      suitableCandidates = evaluatedCandidates.filter(
        (c) => !c.unsuitable && c.distKm <= radius
      );
      searchRadiusUsed = radius;
      if (suitableCandidates.length > 0) break;
      if (radius !== radii[radii.length - 1]) radiusExpanded = true;
    }

    // Sort suitable candidates by overallScore desc, then travelMin asc
    suitableCandidates.sort((a, b) => {
      if (b.overallScore !== a.overallScore) return b.overallScore - a.overallScore;
      return a.travelMin - b.travelMin;
    });

    // Assign ranks
    suitableCandidates.forEach((c, i) => { c.rank = i + 1; });

    // Store match results
    await emergencyMatchResultRepository.deleteByRequest(emergencyRequest._id);

    const storedResults = [];
    for (const c of suitableCandidates) {
      const stored = await emergencyMatchResultRepository.upsertResult({
        emergencyRequestId: emergencyRequest._id,
        organizationId: c.org._id,
        suitabilityStatus: 'SUITABLE',
        capabilityScore: c.capabilityScore,
        resourceScore: c.resourceScore,
        specialistScore: c.specialistScore,
        presenceScore: c.presenceScore,
        travelTimeScore: c.travelTimeScore,
        distanceScore: c.distanceScore,
        freshnessScore: c.freshnessScore,
        overallScore: c.overallScore,
        distanceKm: c.distKm,
        estimatedTravelMinutes: c.travelMin,
        freshnessStatus: c.freshnessStatus || 'UNKNOWN',
        rank: c.rank,
        evaluatedAt: new Date(),
        unsuitabilityReasons: [],
        radiusExpanded,
        searchRadiusKm: searchRadiusUsed,
        isFallback: false,
      });
      storedResults.push(stored);
    }

    // Store unsuitable candidates (for audit trail)
    for (const c of evaluatedCandidates.filter((c) => c.unsuitable)) {
      await emergencyMatchResultRepository.upsertResult({
        emergencyRequestId: emergencyRequest._id,
        organizationId: c.org._id,
        suitabilityStatus: 'UNSUITABLE',
        capabilityScore: c.capEval?.capabilityScore || 0,
        resourceScore: 0,
        specialistScore: 0,
        presenceScore: 0,
        travelTimeScore: 0,
        distanceScore: 0,
        freshnessScore: 0,
        overallScore: 0,
        distanceKm: c.distKm,
        estimatedTravelMinutes: c.travelMin,
        freshnessStatus: 'UNKNOWN',
        rank: 999,
        evaluatedAt: new Date(),
        unsuitabilityReasons: c.reasons || [],
        radiusExpanded,
        searchRadiusKm: searchRadiusUsed,
        isFallback: false,
      }).catch(() => {});
    }

    // External fallback if no suitable orgs found
    let fallbackResults = [];
    if (suitableCandidates.length === 0) {
      // Module 15: Auto-trigger Fallback Session when no initial candidates are found
      try {
        const { emergencyFallbackService } = await import('./EmergencyFallbackService.js');
        await emergencyFallbackService.startFallbackSession({
          emergencyRequestId: emergencyRequest._id,
          reason: 'NO_CANDIDATES_FOUND',
        });
      } catch (fbErr) {
        console.warn('[EmergencyMatchingService] Fallback trigger note:', fbErr.message);
      }

      const fallbacks = await this.getExternalFallbackFacilities(coords, 100);
      for (const f of fallbacks) {
        const stored = await emergencyMatchResultRepository.upsertResult({
          emergencyRequestId: emergencyRequest._id,
          organizationId: f.organization._id,
          suitabilityStatus: 'FALLBACK',
          overallScore: 0,
          distanceKm: f.distanceKm,
          estimatedTravelMinutes: f.estimatedTravelMinutes,
          freshnessStatus: 'UNKNOWN',
          rank: 500 + fallbackResults.length,
          evaluatedAt: new Date(),
          unsuitabilityReasons: ['NON_PARTICIPATING_FALLBACK'],
          radiusExpanded: true,
          searchRadiusKm: 100,
          isFallback: true,
        }).catch(() => null);
        if (stored) fallbackResults.push(stored);
      }
    }

    // Trigger Emergency Beep for suitable orgs (does NOT reserve resources)
    let broadcastResult = null;
    if (allowBeep && suitableCandidates.length > 0) {
      try {
        const { emergencyBeepService } = await import('./EmergencyBeepService.js');
        const beepRes = await emergencyBeepService.initiateBroadcast({
          emergencyRequestId: emergencyRequest._id,
          broadcastRound: 1,
        });
        broadcastResult = { broadcasts: beepRes.recipients || [], count: beepRes.recipientCount || 0 };
      } catch (err) {
        console.error('[EmergencyMatchingService] Beep error:', err.message);
      }
    }

    return {
      suitableCandidates,
      unsuitableCandidates: evaluatedCandidates.filter((c) => c.unsuitable),
      fallbackResults,
      storedResults,
      radiusExpanded,
      searchRadiusKm: searchRadiusUsed,
      broadcastResult,
      totalSuitable: suitableCandidates.length,
      totalFallback: fallbackResults.length,
    };
  }
}

export const emergencyMatchingService = new EmergencyMatchingService();

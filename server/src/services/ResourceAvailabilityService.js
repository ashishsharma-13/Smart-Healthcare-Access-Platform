import { resourceAvailabilitySnapshotRepository } from '../repositories/ResourceAvailabilitySnapshotRepository.js';
import { resourceRepository } from '../repositories/ResourceRepository.js';

export class ResourceAvailabilityService {
  /**
   * Computes freshness status and staleness metadata for a resource.
   */
  evaluateFreshness(resource) {
    const now = new Date();
    const thresholdMinutes = resource.freshnessThresholdMinutes || 60;
    const verifiedAt = resource.lastVerifiedAt || resource.updatedAt || resource.createdAt;

    if (!verifiedAt) {
      return {
        freshnessStatus: 'STALE',
        ageMinutes: 999999,
        isFresh: false,
        isStale: true,
        thresholdMinutes,
        lastVerifiedAt: null,
      };
    }

    const ageMs = now.getTime() - new Date(verifiedAt).getTime();
    const ageMinutes = Math.max(0, Math.floor(ageMs / (1000 * 60)));

    let freshnessStatus = 'FRESH';
    if (ageMinutes > 1440) {
      freshnessStatus = 'VERY_STALE';
    } else if (ageMinutes > thresholdMinutes) {
      freshnessStatus = 'STALE';
    }

    return {
      freshnessStatus,
      ageMinutes,
      isFresh: freshnessStatus === 'FRESH',
      isStale: freshnessStatus !== 'FRESH',
      thresholdMinutes,
      lastVerifiedAt: verifiedAt,
    };
  }

  /**
   * Manually verify/refresh availability timestamp
   */
  async verifyFreshness(idOrResourceId, userId) {
    const resource = await resourceRepository.findResourceById(idOrResourceId);
    if (!resource) {
      throw new Error('Resource not found');
    }

    resource.lastVerifiedAt = new Date();
    if (userId) {
      resource.lastVerifiedBy = userId;
    }

    const updated = await resource.save();
    await this.captureSnapshot(updated);
    return updated;
  }

  /**
   * Capture an availability snapshot for historical charting and audit
   */
  async captureSnapshot(resource) {
    return await resourceAvailabilitySnapshotRepository.captureSnapshot({
      resourceId: resource._id,
      organizationId: resource.organizationId,
      totalQuantity: resource.totalQuantity ?? resource.totalCapacity ?? 0,
      availableQuantity: resource.availableQuantity ?? resource.availableCapacity ?? 0,
      reservedQuantity: resource.reservedQuantity ?? resource.reservedCapacity ?? 0,
      allocatedQuantity: resource.allocatedQuantity ?? resource.occupiedCapacity ?? 0,
      unavailableQuantity: resource.unavailableQuantity ?? 0,
      operationalStatus: resource.operationalStatus || 'OPERATIONAL',
      capturedAt: new Date(),
    });
  }

  /**
   * Validates whether a resource is operational and has sufficient available quantity.
   */
  async validateResourceAvailability(idOrResourceId, requiredQuantity = 1) {
    const resource = await resourceRepository.findResourceById(idOrResourceId);
    if (!resource) {
      return { valid: false, reason: 'Resource not found' };
    }

    if (resource.operationalStatus !== 'OPERATIONAL') {
      return {
        valid: false,
        reason: `Resource is currently ${resource.operationalStatus} and cannot accept reservations.`,
        resource,
      };
    }

    const available = Number(resource.availableQuantity ?? resource.availableCapacity) || 0;
    if (available < requiredQuantity) {
      return {
        valid: false,
        reason: `Insufficient availability: requested ${requiredQuantity}, but only ${available} available.`,
        resource,
        available,
      };
    }

    const freshness = this.evaluateFreshness(resource);

    return {
      valid: true,
      resource,
      available,
      freshness,
    };
  }

  /**
   * Returns recent snapshot history for a resource
   */
  async getSnapshotHistory(resourceId, limit = 20) {
    return await resourceAvailabilitySnapshotRepository.findByResource(resourceId, limit);
  }
}

export const resourceAvailabilityService = new ResourceAvailabilityService();


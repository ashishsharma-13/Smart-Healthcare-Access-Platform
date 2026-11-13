import mongoose from 'mongoose';
import {
  HealthcareResource,
  ResourceReservation,
  ResourceReservationItem,
  ResourceAllocation,
} from '../models/index.js';
import { resourceRepository } from '../repositories/ResourceRepository.js';
import { resourceHistoryService } from './ResourceHistoryService.js';
import { resourceAvailabilityService } from './ResourceAvailabilityService.js';

export class ResourceReconciliationService {
  /**
   * Reconcile a single resource against active reservations and allocations.
   *
   * @param {string|ObjectId} idOrResourceId
   * @param {ObjectId} [actorUserId]
   * @param {Object} [options]
   * @param {boolean} [options.autoCorrect=true]
   */
  async reconcileResource(idOrResourceId, actorUserId = null, { autoCorrect = true } = {}) {
    const resource = await resourceRepository.findResourceById(idOrResourceId);
    if (!resource) {
      throw new Error('Resource not found for reconciliation');
    }

    // 1. Calculate active reservations:
    // Query items marked as RESERVED or linked to reservations in active hold states
    const activeReservations = await ResourceReservation.find({
      organizationId: resource.organizationId,
      status: { $in: ['TEMPORARILY_RESERVED', 'PATIENT_EN_ROUTE'] },
    }).select('_id');

    const activeReservationIds = activeReservations.map((r) => r._id);

    // Sum active reserved items for this specific resource
    const reservedItems = await ResourceReservationItem.find({
      $or: [
        { healthcareResourceId: resource._id, status: 'RESERVED' },
        {
          healthcareResourceId: resource._id,
          reservationId: { $in: activeReservationIds },
          status: { $ne: 'RELEASED' },
        },
      ],
    });

    const expectedReservedQuantity = reservedItems.reduce((acc, item) => acc + (item.quantity || 1), 0);

    // 2. Calculate active allocations:
    const allocatedRecords = await ResourceAllocation.find({
      healthcareResourceId: resource._id,
      allocationStatus: 'ALLOCATED',
    });

    // Also check reservation items with ALLOCATED status
    const allocatedItems = await ResourceReservationItem.find({
      healthcareResourceId: resource._id,
      status: 'ALLOCATED',
    });

    // Use max of explicitly tracked allocations or items to prevent duplicate double-counting
    const expectedAllocatedQuantity = Math.max(
      allocatedRecords.reduce((acc, a) => acc + (a.allocatedQuantity || 1), 0),
      allocatedItems.reduce((acc, i) => acc + (i.quantity || 1), 0)
    );

    const currentReserved = Number(resource.reservedQuantity ?? resource.reservedCapacity) || 0;
    const currentAllocated = Number(resource.allocatedQuantity ?? resource.occupiedCapacity) || 0;
    const currentTotal = Number(resource.totalQuantity ?? resource.totalCapacity) || 0;
    const currentUnavailable = Number(resource.unavailableQuantity) || 0;

    const driftReserved = expectedReservedQuantity - currentReserved;
    const driftAllocated = expectedAllocatedQuantity - currentAllocated;
    const hasDiscrepancy = driftReserved !== 0 || driftAllocated !== 0;

    if (!hasDiscrepancy || !autoCorrect) {
      return {
        resourceId: resource.resourceId,
        _id: resource._id,
        resourceName: resource.resourceName,
        resourceType: resource.resourceType,
        hasDiscrepancy,
        driftReserved,
        driftAllocated,
        expectedReservedQuantity,
        currentReserved,
        expectedAllocatedQuantity,
        currentAllocated,
        reconciled: false,
      };
    }

    // Auto-correct discrepancies:
    const prevQuantities = {
      total: currentTotal,
      available: Number(resource.availableQuantity ?? resource.availableCapacity) || 0,
      reserved: currentReserved,
      allocated: currentAllocated,
      unavailable: currentUnavailable,
    };

    resource.reservedQuantity = expectedReservedQuantity;
    resource.reservedCapacity = expectedReservedQuantity;
    resource.allocatedQuantity = expectedAllocatedQuantity;
    resource.occupiedCapacity = expectedAllocatedQuantity;

    // Recalculate available quantity to preserve invariant: total = available + reserved + allocated + unavailable
    let newAvailable = currentTotal - (expectedReservedQuantity + expectedAllocatedQuantity + currentUnavailable);
    if (newAvailable < 0) {
      // In extreme case where active holds exceed total capacity, expand total quantity
      resource.totalQuantity = expectedReservedQuantity + expectedAllocatedQuantity + currentUnavailable;
      resource.totalCapacity = resource.totalQuantity;
      newAvailable = 0;
    }

    resource.availableQuantity = newAvailable;
    resource.availableCapacity = newAvailable;
    resource.lastVerifiedAt = new Date();
    if (actorUserId) {
      resource.lastVerifiedBy = actorUserId;
    }
    resource.version = (resource.version || 1) + 1;

    const savedResource = await resource.save();

    // Log history
    await resourceHistoryService.logChange({
      resourceId: savedResource._id,
      organizationId: savedResource.organizationId,
      changedByUserId: actorUserId,
      changeType: 'RECONCILIATION',
      previousQuantity: prevQuantities,
      newQuantity: {
        total: savedResource.totalQuantity,
        available: savedResource.availableQuantity,
        reserved: savedResource.reservedQuantity,
        allocated: savedResource.allocatedQuantity,
        unavailable: savedResource.unavailableQuantity,
      },
      quantityDelta: (savedResource.availableQuantity || 0) - (prevQuantities.available || 0),
      reason: `Automated inventory reconciliation. Drift: reserved (${driftReserved >= 0 ? '+' : ''}${driftReserved}), allocated (${driftAllocated >= 0 ? '+' : ''}${driftAllocated}).`,
    });

    // Capture snapshot
    await resourceAvailabilityService.captureSnapshot(savedResource);

    return {
      resourceId: savedResource.resourceId,
      _id: savedResource._id,
      resourceName: savedResource.resourceName,
      resourceType: savedResource.resourceType,
      hasDiscrepancy,
      driftReserved,
      driftAllocated,
      expectedReservedQuantity,
      currentReserved,
      expectedAllocatedQuantity,
      currentAllocated,
      reconciled: true,
      resource: savedResource,
    };
  }

  /**
   * Reconcile all resources for an organization
   */
  async reconcileOrganization(organizationId, actorUserId = null, { autoCorrect = true } = {}) {
    const resources = await resourceRepository.findOrgResources(organizationId);
    const results = [];
    let discrepancyCount = 0;
    let reconciledCount = 0;

    for (const res of resources) {
      const result = await this.reconcileResource(res._id, actorUserId, { autoCorrect });
      results.push(result);
      if (result.hasDiscrepancy) {
        discrepancyCount++;
      }
      if (result.reconciled) {
        reconciledCount++;
      }
    }

    return {
      organizationId,
      totalResources: resources.length,
      discrepancyCount,
      reconciledCount,
      results,
    };
  }
}

export const resourceReconciliationService = new ResourceReconciliationService();


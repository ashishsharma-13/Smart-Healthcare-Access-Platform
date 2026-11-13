import mongoose from 'mongoose';
import { HealthcareResource, Organization } from '../models/index.js';
import { resourceRepository } from '../repositories/ResourceRepository.js';
import { healthcareResourceTypeRepository } from '../repositories/HealthcareResourceTypeRepository.js';
import { resourceHistoryService } from './ResourceHistoryService.js';
import { resourceAvailabilityService } from './ResourceAvailabilityService.js';
import { resourceReconciliationService } from './ResourceReconciliationService.js';

export class HealthcareResourceService {
  /**
   * Register a new resource for an organization.
   */
  async registerResource(
    {
      organizationId,
      resourceTypeId = null,
      resourceType,
      resourceName,
      facilityId = null,
      totalQuantity = 10,
      availableQuantity,
      operationalStatus = 'OPERATIONAL',
      maintenanceNotes = '',
      freshnessThresholdMinutes = 60,
    },
    actorUserId = null
  ) {
    if (!organizationId) {
      throw new Error('Organization ID is required to register a resource.');
    }

    // Verify organization exists
    const org = await Organization.findById(organizationId);
    if (!org) {
      throw new Error('Organization not found.');
    }

    // Resolve resource type and name if resourceTypeId is provided
    let finalType = resourceType;
    let finalName = resourceName;

    if (resourceTypeId) {
      const typeDoc = await healthcareResourceTypeRepository.findById(resourceTypeId);
      if (typeDoc) {
        if (!finalType) {
          finalType = typeDoc.typeName.toLowerCase().replace(/\s+/g, '_');
        }
        if (!finalName) {
          finalName = typeDoc.typeName;
        }
      }
    }

    if (!finalType) {
      const err = new Error('Resource type is required.');
      err.status = 400;
      throw err;
    }

    // Duplicate check: organization cannot register duplicate resourceType
    const existing = await resourceRepository.findOrgResource(organizationId, finalType);
    if (existing) {
      const err = new Error(
        `Resource type '${finalType}' already exists for this organization (Resource ID: ${existing.resourceId}).`
      );
      err.status = 409;
      throw err;
    }

    const totalQty = Number(totalQuantity);
    if (isNaN(totalQty) || totalQty < 0) {
      const err = new Error('Total quantity must be a non-negative number.');
      err.status = 400;
      throw err;
    }

    const availQty = availableQuantity !== undefined ? Number(availableQuantity) : totalQty;
    if (isNaN(availQty) || availQty < 0) {
      const err = new Error('Available quantity must be a non-negative number.');
      err.status = 400;
      throw err;
    }

    if (availQty > totalQty) {
      const err = new Error('Available quantity cannot exceed total quantity.');
      err.status = 400;
      throw err;
    }

    const unavailableQty = totalQty - availQty;

    const resource = new HealthcareResource({
      organizationId,
      facilityId: facilityId || null,
      resourceTypeId: resourceTypeId || null,
      resourceType: finalType,
      resourceName: finalName || finalType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      totalQuantity: totalQty,
      availableQuantity: availQty,
      reservedQuantity: 0,
      allocatedQuantity: 0,
      unavailableQuantity: unavailableQty,
      operationalStatus,
      maintenanceNotes,
      freshnessThresholdMinutes,
      lastVerifiedAt: new Date(),
      lastVerifiedBy: actorUserId,
    });

    const saved = await resource.save();

    // Audit log
    await resourceHistoryService.logChange({
      resourceId: saved._id,
      organizationId: saved.organizationId,
      changedByUserId: actorUserId,
      changeType: 'REGISTER',
      previousQuantity: { total: 0, available: 0, reserved: 0, allocated: 0, unavailable: 0 },
      newQuantity: {
        total: saved.totalQuantity,
        available: saved.availableQuantity,
        reserved: 0,
        allocated: 0,
        unavailable: saved.unavailableQuantity,
      },
      quantityDelta: saved.totalQuantity,
      newStatus: saved.operationalStatus,
      reason: 'Initial resource registration and onboarding into organization inventory.',
    });

    // Capture initial snapshot
    await resourceAvailabilityService.captureSnapshot(saved);

    return saved;
  }

  /**
   * Get all resources for an organization with optional filters and freshness enrichment
   */
  async getResources(organizationId, filters = {}) {
    const resources = await resourceRepository.findOrgResources(organizationId, filters);
    return resources.map((r) => {
      const freshness = resourceAvailabilityService.evaluateFreshness(r);
      const doc = r.toObject ? r.toObject() : { ...r };
      doc.freshness = freshness;
      return doc;
    });
  }

  /**
   * Get a single resource by ID or resourceId with access control
   */
  async getResourceById(idOrResourceId, organizationId = null, role = null) {
    const resource = await resourceRepository.findResourceById(idOrResourceId);
    if (!resource) {
      const err = new Error('Healthcare resource not found.');
      err.status = 404;
      throw err;
    }

    if (organizationId && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      const resOrgId = resource.organizationId._id
        ? resource.organizationId._id.toString()
        : resource.organizationId.toString();
      if (resOrgId !== organizationId.toString()) {
        const err = new Error('Unauthorized: resource belongs to a different organization.');
        err.status = 403;
        throw err;
      }
    }

    const freshness = resourceAvailabilityService.evaluateFreshness(resource);
    const doc = resource.toObject ? resource.toObject() : { ...resource };
    doc.freshness = freshness;
    return doc;
  }

  /**
   * Update resource configuration details (name, facility, freshness threshold)
   */
  async updateResource(idOrResourceId, organizationId, actorUserId, updates) {
    const resource = await resourceRepository.findResourceById(idOrResourceId);
    if (!resource) {
      const err = new Error('Healthcare resource not found.');
      err.status = 404;
      throw err;
    }

    const resOrgId = resource.organizationId._id
      ? resource.organizationId._id.toString()
      : resource.organizationId.toString();
    if (organizationId && resOrgId !== organizationId.toString()) {
      const err = new Error('Unauthorized: resource belongs to a different organization.');
      err.status = 403;
      throw err;
    }

    // Direct quantity manipulation through generic update is barred
    delete updates.reservedQuantity;
    delete updates.reservedCapacity;
    delete updates.allocatedQuantity;
    delete updates.occupiedCapacity;
    delete updates.totalQuantity;
    delete updates.totalCapacity;
    delete updates.availableQuantity;
    delete updates.availableCapacity;

    if (updates.resourceName) resource.resourceName = updates.resourceName;
    if (updates.facilityId !== undefined) resource.facilityId = updates.facilityId || null;
    if (updates.freshnessThresholdMinutes)
      resource.freshnessThresholdMinutes = Number(updates.freshnessThresholdMinutes);
    if (updates.maintenanceNotes !== undefined) resource.maintenanceNotes = updates.maintenanceNotes;

    resource.lastVerifiedAt = new Date();
    resource.lastVerifiedBy = actorUserId;
    resource.version = (resource.version || 1) + 1;

    return await resource.save();
  }

  /**
   * Update resource capacity with strict accounting invariant guardrails
   */
  async updateCapacity(idOrResourceId, organizationId, actorUserId, { totalQuantity, reason = '' }) {
    const resource = await resourceRepository.findResourceById(idOrResourceId);
    if (!resource) {
      const err = new Error('Healthcare resource not found.');
      err.status = 404;
      throw err;
    }

    const resOrgId = resource.organizationId._id
      ? resource.organizationId._id.toString()
      : resource.organizationId.toString();
    if (organizationId && resOrgId !== organizationId.toString()) {
      const err = new Error('Unauthorized: resource belongs to a different organization.');
      err.status = 403;
      throw err;
    }

    const newTotal = Number(totalQuantity);
    if (isNaN(newTotal) || newTotal < 0) {
      throw new Error('Total capacity must be a non-negative number.');
    }

    const currentTotal = Number(resource.totalQuantity ?? resource.totalCapacity) || 0;
    const currentReserved = Number(resource.reservedQuantity ?? resource.reservedCapacity) || 0;
    const currentAllocated = Number(resource.allocatedQuantity ?? resource.occupiedCapacity) || 0;
    const currentUnavailable = Number(resource.unavailableQuantity) || 0;

    const minimumRequired = currentReserved + currentAllocated + currentUnavailable;
    if (newTotal < minimumRequired) {
      const err = new Error(
        `Cannot reduce total capacity to ${newTotal}. Minimum required is ${minimumRequired} due to active reserved (${currentReserved}), allocated (${currentAllocated}), and unavailable (${currentUnavailable}) resources.`
      );
      err.status = 400;
      throw err;
    }

    const prevQuantities = {
      total: currentTotal,
      available: Number(resource.availableQuantity ?? resource.availableCapacity) || 0,
      reserved: currentReserved,
      allocated: currentAllocated,
      unavailable: currentUnavailable,
    };

    const delta = newTotal - currentTotal;
    const newAvailable = newTotal - minimumRequired;

    resource.totalQuantity = newTotal;
    resource.totalCapacity = newTotal;
    resource.availableQuantity = newAvailable;
    resource.availableCapacity = newAvailable;
    resource.lastVerifiedAt = new Date();
    resource.lastVerifiedBy = actorUserId;
    resource.version = (resource.version || 1) + 1;

    const saved = await resource.save();

    await resourceHistoryService.logChange({
      resourceId: saved._id,
      organizationId: saved.organizationId,
      changedByUserId: actorUserId,
      changeType: 'CAPACITY_UPDATE',
      previousQuantity: prevQuantities,
      newQuantity: {
        total: saved.totalQuantity,
        available: saved.availableQuantity,
        reserved: saved.reservedQuantity,
        allocated: saved.allocatedQuantity,
        unavailable: saved.unavailableQuantity,
      },
      quantityDelta: delta,
      reason: reason || `Updated total capacity from ${currentTotal} to ${newTotal}`,
    });

    await resourceAvailabilityService.captureSnapshot(saved);

    return saved;
  }

  /**
   * Update operational status (OPERATIONAL, MAINTENANCE, UNAVAILABLE, DEGRADED, DECOMMISSIONED)
   */
  async updateOperationalStatus(
    idOrResourceId,
    organizationId,
    actorUserId,
    {
      operationalStatus,
      maintenanceNotes = '',
      maintenanceStartDate = null,
      maintenanceExpectedEndDate = null,
      reason = '',
    }
  ) {
    const resource = await resourceRepository.findResourceById(idOrResourceId);
    if (!resource) {
      const err = new Error('Healthcare resource not found.');
      err.status = 404;
      throw err;
    }

    const resOrgId = resource.organizationId._id
      ? resource.organizationId._id.toString()
      : resource.organizationId.toString();
    if (organizationId && resOrgId !== organizationId.toString()) {
      const err = new Error('Unauthorized: resource belongs to a different organization.');
      err.status = 403;
      throw err;
    }

    const validStatuses = ['OPERATIONAL', 'MAINTENANCE', 'UNAVAILABLE', 'DEGRADED', 'DECOMMISSIONED'];
    if (!validStatuses.includes(operationalStatus)) {
      const err = new Error(`Invalid operational status: ${operationalStatus}. Valid values: ${validStatuses.join(', ')}`);
      err.status = 400;
      throw err;
    }

    const prevStatus = resource.operationalStatus;
    const prevQuantities = {
      total: resource.totalQuantity,
      available: resource.availableQuantity,
      reserved: resource.reservedQuantity,
      allocated: resource.allocatedQuantity,
      unavailable: resource.unavailableQuantity,
    };

    resource.operationalStatus = operationalStatus;
    if (maintenanceNotes) resource.maintenanceNotes = maintenanceNotes;
    if (maintenanceStartDate) resource.maintenanceStartDate = new Date(maintenanceStartDate);
    if (maintenanceExpectedEndDate) resource.maintenanceExpectedEndDate = new Date(maintenanceExpectedEndDate);

    resource.lastVerifiedAt = new Date();
    resource.lastVerifiedBy = actorUserId;
    resource.version = (resource.version || 1) + 1;

    const saved = await resource.save();

    let changeType = 'STATUS_CHANGE';
    if (operationalStatus === 'MAINTENANCE') changeType = 'MAINTENANCE_START';
    else if (prevStatus === 'MAINTENANCE') changeType = 'MAINTENANCE_END';

    await resourceHistoryService.logChange({
      resourceId: saved._id,
      organizationId: saved.organizationId,
      changedByUserId: actorUserId,
      changeType,
      previousQuantity: prevQuantities,
      newQuantity: prevQuantities,
      previousStatus: prevStatus,
      newStatus: operationalStatus,
      reason: reason || `Changed operational status from ${prevStatus} to ${operationalStatus}`,
    });

    await resourceAvailabilityService.captureSnapshot(saved);

    return saved;
  }

  /**
   * Manual availability adjustment with mandatory audit reason
   */
  async adjustAvailability(idOrResourceId, organizationId, actorUserId, { adjustmentQuantity, reason }) {
    if (!reason || !reason.trim()) {
      const err = new Error('A descriptive reason is strictly mandatory for manual availability adjustments.');
      err.status = 400;
      throw err;
    }

    const resource = await resourceRepository.findResourceById(idOrResourceId);
    if (!resource) {
      const err = new Error('Healthcare resource not found.');
      err.status = 404;
      throw err;
    }

    const resOrgId = resource.organizationId._id
      ? resource.organizationId._id.toString()
      : resource.organizationId.toString();
    if (organizationId && resOrgId !== organizationId.toString()) {
      const err = new Error('Unauthorized: resource belongs to a different organization.');
      err.status = 403;
      throw err;
    }

    const delta = Number(adjustmentQuantity);
    if (isNaN(delta) || delta === 0) {
      throw new Error('Adjustment quantity must be a non-zero number.');
    }

    const currentTotal = Number(resource.totalQuantity ?? resource.totalCapacity) || 0;
    const currentAvailable = Number(resource.availableQuantity ?? resource.availableCapacity) || 0;
    const currentReserved = Number(resource.reservedQuantity ?? resource.reservedCapacity) || 0;
    const currentAllocated = Number(resource.allocatedQuantity ?? resource.occupiedCapacity) || 0;
    const currentUnavailable = Number(resource.unavailableQuantity) || 0;

    const newAvailable = currentAvailable + delta;
    if (newAvailable < 0) {
      const err = new Error(
        `Cannot reduce available quantity by ${Math.abs(delta)}. Current available is ${currentAvailable}.`
      );
      err.status = 400;
      throw err;
    }

    const prevQuantities = {
      total: currentTotal,
      available: currentAvailable,
      reserved: currentReserved,
      allocated: currentAllocated,
      unavailable: currentUnavailable,
    };

    // If delta is negative, transfer to unavailableQuantity or decrease total
    let newUnavailable = currentUnavailable;
    let newTotal = currentTotal;

    if (delta < 0) {
      // Mark reduced availability as unavailable (e.g. staff shortage or equipment glitch)
      newUnavailable = currentUnavailable + Math.abs(delta);
    } else {
      // Return previously unavailable items or expand total
      if (currentUnavailable >= delta) {
        newUnavailable = currentUnavailable - delta;
      } else {
        const remaining = delta - currentUnavailable;
        newUnavailable = 0;
        newTotal = currentTotal + remaining;
      }
    }

    resource.availableQuantity = newAvailable;
    resource.availableCapacity = newAvailable;
    resource.unavailableQuantity = newUnavailable;
    resource.totalQuantity = newTotal;
    resource.totalCapacity = newTotal;
    resource.lastVerifiedAt = new Date();
    resource.lastVerifiedBy = actorUserId;
    resource.version = (resource.version || 1) + 1;

    const saved = await resource.save();

    await resourceHistoryService.logChange({
      resourceId: saved._id,
      organizationId: saved.organizationId,
      changedByUserId: actorUserId,
      changeType: 'AVAILABILITY_ADJUSTMENT',
      previousQuantity: prevQuantities,
      newQuantity: {
        total: saved.totalQuantity,
        available: saved.availableQuantity,
        reserved: saved.reservedQuantity,
        allocated: saved.allocatedQuantity,
        unavailable: saved.unavailableQuantity,
      },
      quantityDelta: delta,
      reason: reason.trim(),
    });

    await resourceAvailabilityService.captureSnapshot(saved);

    return saved;
  }

  /**
   * Delete resource if no active reservations or allocations exist
   */
  async deleteResource(idOrResourceId, organizationId, actorUserId) {
    const resource = await resourceRepository.findResourceById(idOrResourceId);
    if (!resource) {
      const err = new Error('Healthcare resource not found.');
      err.status = 404;
      throw err;
    }

    const resOrgId = resource.organizationId._id
      ? resource.organizationId._id.toString()
      : resource.organizationId.toString();
    if (organizationId && resOrgId !== organizationId.toString()) {
      const err = new Error('Unauthorized: resource belongs to a different organization.');
      err.status = 403;
      throw err;
    }

    const reserved = Number(resource.reservedQuantity ?? resource.reservedCapacity) || 0;
    const allocated = Number(resource.allocatedQuantity ?? resource.occupiedCapacity) || 0;

    if (reserved > 0 || allocated > 0) {
      const err = new Error(
        `Cannot delete resource with active commitments: ${reserved} reserved, ${allocated} allocated.`
      );
      err.status = 400;
      throw err;
    }

    await resourceRepository.deleteResource(resource._id);

    return {
      success: true,
      message: `Resource '${resource.resourceName}' (${resource.resourceType}) was deleted.`,
    };
  }

  /**
   * Reconcile a resource against active reservations and allocations
   */
  async reconcileResource(idOrResourceId, actorUserId, options) {
    return await resourceReconciliationService.reconcileResource(idOrResourceId, actorUserId, options);
  }

  /**
   * Reconcile all resources for an organization
   */
  async reconcileOrganization(organizationId, actorUserId, options) {
    return await resourceReconciliationService.reconcileOrganization(organizationId, actorUserId, options);
  }

  /**
   * Get organization inventory summary
   */
  async getOrganizationSummary(organizationId) {
    return await resourceRepository.getOrganizationInventorySummary(organizationId);
  }

  /**
   * Telemetry and monitoring for administrative dashboard
   */
  async getMonitoringTelemetry() {
    const resources = await HealthcareResource.find()
      .populate('organizationId', 'name email address phone')
      .populate('resourceTypeId')
      .exec();

    let totalResources = resources.length;
    let freshCount = 0;
    let staleCount = 0;
    let veryStaleCount = 0;
    let operationalCount = 0;
    let maintenanceCount = 0;
    let totalCapacity = 0;
    let availableCapacity = 0;
    let reservedCapacity = 0;
    let allocatedCapacity = 0;

    const orgSummaryMap = {};

    resources.forEach((r) => {
      const freshness = resourceAvailabilityService.evaluateFreshness(r);
      if (freshness.freshnessStatus === 'FRESH') freshCount++;
      else if (freshness.freshnessStatus === 'STALE') staleCount++;
      else veryStaleCount++;

      if (r.operationalStatus === 'OPERATIONAL') operationalCount++;
      else if (r.operationalStatus === 'MAINTENANCE') maintenanceCount++;

      const tot = Number(r.totalQuantity ?? r.totalCapacity) || 0;
      const avail = Number(r.availableQuantity ?? r.availableCapacity) || 0;
      const resv = Number(r.reservedQuantity ?? r.reservedCapacity) || 0;
      const alloc = Number(r.allocatedQuantity ?? r.occupiedCapacity) || 0;

      totalCapacity += tot;
      availableCapacity += avail;
      reservedCapacity += resv;
      allocatedCapacity += alloc;

      const orgId = r.organizationId?._id ? r.organizationId._id.toString() : 'unknown';
      const orgName = r.organizationId?.name || 'Unknown Organization';

      if (!orgSummaryMap[orgId]) {
        orgSummaryMap[orgId] = {
          organizationId: orgId,
          organizationName: orgName,
          resourceCount: 0,
          totalCapacity: 0,
          availableCapacity: 0,
          reservedCapacity: 0,
          allocatedCapacity: 0,
          staleCount: 0,
        };
      }

      orgSummaryMap[orgId].resourceCount++;
      orgSummaryMap[orgId].totalCapacity += tot;
      orgSummaryMap[orgId].availableCapacity += avail;
      orgSummaryMap[orgId].reservedCapacity += resv;
      orgSummaryMap[orgId].allocatedCapacity += alloc;
      if (freshness.isStale) orgSummaryMap[orgId].staleCount++;
    });

    const overallUtilization =
      totalCapacity > 0 ? parseFloat((((reservedCapacity + allocatedCapacity) / totalCapacity) * 100).toFixed(1)) : 0;

    return {
      totalResources,
      freshCount,
      staleCount,
      veryStaleCount,
      operationalCount,
      maintenanceCount,
      totalCapacity,
      availableCapacity,
      reservedCapacity,
      allocatedCapacity,
      overallUtilization,
      organizations: Object.values(orgSummaryMap),
    };
  }
}

export const healthcareResourceService = new HealthcareResourceService();


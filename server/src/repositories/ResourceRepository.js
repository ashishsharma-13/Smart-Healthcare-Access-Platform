import mongoose from 'mongoose';
import { HealthcareResource, ResourceReservation, ResourceReservationItem } from '../models/index.js';

export class ResourceRepository {
  async findByOrg(organizationId) {
    return await HealthcareResource.find({ organizationId }).exec();
  }

  async findOrgResource(organizationId, resourceType) {
    return await HealthcareResource.findOne({ organizationId, resourceType }).exec();
  }

  async upsertResource(organizationId, resourceType, totalCapacity, availableCapacity) {
    return await HealthcareResource.findOneAndUpdate(
      { organizationId, resourceType },
      {
        $set: {
          totalCapacity,
          availableCapacity,
        },
      },
      { upsert: true, new: true }
    ).exec();
  }

  /**
   * ATOMICALLY reserve a single resource quantity if availableCapacity >= quantity.
   * Decrements availableCapacity and increments reservedCapacity atomically.
   */
  async atomicReserve(organizationId, resourceType, quantity = 1) {
    const resource = await HealthcareResource.findOneAndUpdate(
      {
        organizationId,
        resourceType,
        availableCapacity: { $gte: quantity },
      },
      {
        $inc: {
          availableCapacity: -quantity,
          reservedCapacity: quantity,
        },
      },
      { new: true }
    );
    return resource;
  }

  /**
   * ATOMICALLY reserve multiple resources with FULL ROLLBACK if any single resource fails.
   * @param {string|ObjectId} organizationId
   * @param {Array<{resourceType: string, quantity: number}>} resourceItems
   * @returns {Promise<{success: boolean, reservedList: Array<{resource: Object, quantity: number}>}|null>}
   */
  async atomicMultiResourceReserve(organizationId, resourceItems = []) {
    if (!resourceItems || resourceItems.length === 0) {
      return { success: true, reservedList: [] };
    }

    const successfullyReserved = [];

    for (const item of resourceItems) {
      const qty = item.quantity || 1;
      const resDoc = await HealthcareResource.findOneAndUpdate(
        {
          organizationId,
          resourceType: item.resourceType,
          availableCapacity: { $gte: qty },
        },
        {
          $inc: {
            availableCapacity: -qty,
            reservedCapacity: qty,
          },
        },
        { new: true }
      );

      if (!resDoc) {
        // Roll back all already-reserved resources in reverse order
        for (const done of successfullyReserved) {
          await HealthcareResource.findOneAndUpdate(
            {
              organizationId,
              resourceType: done.resourceType,
            },
            {
              $inc: {
                availableCapacity: done.quantity,
                reservedCapacity: -done.quantity,
              },
            }
          );
        }
        return null; // Reservation failed atomically
      }

      successfullyReserved.push({
        resource: resDoc,
        resourceType: item.resourceType,
        quantity: qty,
      });
    }

    return { success: true, reservedList: successfullyReserved };
  }

  /**
   * ATOMICALLY release multiple previously reserved resources back into availability.
   */
  async atomicMultiResourceRelease(organizationId, resourceItems = []) {
    for (const item of resourceItems) {
      const qty = item.quantity || 1;
      await HealthcareResource.findOneAndUpdate(
        {
          organizationId,
          resourceType: item.resourceType,
          reservedCapacity: { $gte: qty },
        },
        {
          $inc: {
            availableCapacity: qty,
            reservedCapacity: -qty,
          },
        }
      );
    }
  }

  /**
   * ATOMICALLY allocate multiple previously reserved resources to occupied.
   */
  async atomicMultiResourceAllocate(organizationId, resourceItems = []) {
    for (const item of resourceItems) {
      const qty = item.quantity || 1;
      await HealthcareResource.findOneAndUpdate(
        {
          organizationId,
          resourceType: item.resourceType,
          reservedCapacity: { $gte: qty },
        },
        {
          $inc: {
            reservedCapacity: -qty,
            occupiedCapacity: qty,
          },
        }
      );
    }
  }

  /**
   * ATOMICALLY release a previously reserved resource quantity back into availability.
   */
  async atomicRelease(organizationId, resourceType, quantity = 1) {
    const resource = await HealthcareResource.findOneAndUpdate(
      {
        organizationId,
        resourceType,
        reservedCapacity: { $gte: quantity },
      },
      {
        $inc: {
          availableCapacity: quantity,
          reservedCapacity: -quantity,
        },
      },
      { new: true }
    );
    return resource;
  }

  /**
   * ATOMICALLY transition from RESERVED to ALLOCATED (Patient arrived at hospital)
   */
  async atomicAllocate(organizationId, resourceType, quantity = 1) {
    const resource = await HealthcareResource.findOneAndUpdate(
      {
        organizationId,
        resourceType,
        reservedCapacity: { $gte: quantity },
      },
      {
        $inc: {
          reservedCapacity: -quantity,
          occupiedCapacity: quantity,
        },
      },
      { new: true }
    );
    return resource;
  }

  async createReservation(reservationData) {
    const reservation = new ResourceReservation(reservationData);
    return await reservation.save();
  }

  async createReservationItems(reservationId, items = []) {
    const createdItems = [];
    for (const item of items) {
      const resItem = new ResourceReservationItem({
        reservationId,
        healthcareResourceId: item.resource?._id || item.healthcareResourceId,
        resourceType: item.resourceType,
        quantity: item.quantity || 1,
        status: 'RESERVED',
      });
      const saved = await resItem.save();
      createdItems.push(saved);
    }
    return createdItems;
  }

  async getReservationItems(reservationId) {
    return await ResourceReservationItem.find({ reservationId })
      .populate('healthcareResourceId')
      .exec();
  }

  async updateReservationItemsStatus(reservationId, status) {
    return await ResourceReservationItem.updateMany(
      { reservationId },
      { $set: { status } }
    ).exec();
  }

  async findReservationById(idOrCode) {
    const query = mongoose.Types.ObjectId.isValid(idOrCode)
      ? { $or: [{ _id: idOrCode }, { reservationId: idOrCode }] }
      : { reservationId: idOrCode };

    return await ResourceReservation.findOne(query)
      .populate('emergencyRequestId')
      .populate('organizationId', 'name address operatingAddress uniqueOrganizationCode emergencyContactPhone')
      .populate('destinationSelectionId')
      .populate('resourceId')
      .exec();
  }

  async findActiveReservationForRequest(emergencyRequestId) {
    return await ResourceReservation.findOne({
      emergencyRequestId,
      status: { $in: ['TEMPORARILY_RESERVED', 'PATIENT_EN_ROUTE'] },
    })
      .populate('organizationId', 'name address operatingAddress uniqueOrganizationCode emergencyContactPhone')
      .populate('destinationSelectionId')
      .populate('resourceId')
      .exec();
  }

  async findAnyReservationForRequest(emergencyRequestId) {
    return await ResourceReservation.findOne({ emergencyRequestId })
      .populate('organizationId', 'name address operatingAddress uniqueOrganizationCode emergencyContactPhone')
      .populate('destinationSelectionId')
      .populate('resourceId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateReservationStatus(idOrCode, newStatus, extraFields = {}) {
    const query = mongoose.Types.ObjectId.isValid(idOrCode)
      ? { $or: [{ _id: idOrCode }, { reservationId: idOrCode }] }
      : { reservationId: idOrCode };

    return await ResourceReservation.findOneAndUpdate(
      query,
      {
        $set: {
          status: newStatus,
          ...extraFields,
        },
        $inc: { version: 1 },
      },
      { new: true }
    )
      .populate('emergencyRequestId')
      .populate('organizationId', 'name address operatingAddress uniqueOrganizationCode emergencyContactPhone')
      .exec();
  }

  async findExpiredReservations() {
    return await ResourceReservation.find({
      status: { $in: ['TEMPORARILY_RESERVED', 'PATIENT_EN_ROUTE'] },
      expiresAt: { $lt: new Date() },
    }).exec();
  }

  async findReservationsForOrg(organizationId, filters = {}) {
    return await ResourceReservation.find({
      organizationId,
      ...filters,
    })
      .populate({
        path: 'emergencyRequestId',
        populate: [
          { path: 'patientId', select: 'firstName lastName email phoneNumber' },
          { path: 'emergencyCategoryId', select: 'categoryName description' },
        ],
      })
      .populate('destinationSelectionId')
      .sort({ createdAt: -1 })
      .exec();
  }

  // =========================================================================
  // MODULE 14: Healthcare Resource Inventory Management Repositories
  // =========================================================================

  async createResource(data) {
    const resource = new HealthcareResource(data);
    return await resource.save();
  }

  async findResourceById(idOrResourceId) {
    const isObjectId = mongoose.Types.ObjectId.isValid(idOrResourceId);
    const query = isObjectId
      ? { $or: [{ _id: idOrResourceId }, { resourceId: idOrResourceId }, { resourceType: idOrResourceId }] }
      : { $or: [{ resourceId: idOrResourceId }, { resourceType: idOrResourceId }] };

    return await HealthcareResource.findOne(query)
      .populate('organizationId', 'name slug address operatingAddress registrationNumber')
      .populate('facilityId')
      .populate('resourceTypeId')
      .exec();
  }

  async findOrgResources(organizationId, filters = {}) {
    const query = { organizationId };

    if (filters.resourceTypeId) query.resourceTypeId = filters.resourceTypeId;
    if (filters.facilityId) query.facilityId = filters.facilityId;
    if (filters.operationalStatus) query.operationalStatus = filters.operationalStatus;
    if (filters.resourceType) query.resourceType = filters.resourceType;
    if (filters.search) {
      query.$or = [
        { resourceName: { $regex: filters.search, $options: 'i' } },
        { resourceType: { $regex: filters.search, $options: 'i' } },
        { resourceId: { $regex: filters.search, $options: 'i' } },
      ];
    }

    return await HealthcareResource.find(query)
      .populate('facilityId')
      .populate('resourceTypeId')
      .sort({ operationalStatus: 1, resourceType: 1, resourceName: 1 })
      .exec();
  }

  async findOrgResourceByType(organizationId, resourceType, facilityId = null) {
    const query = { organizationId, resourceType };
    if (facilityId) query.facilityId = facilityId;
    return await HealthcareResource.findOne(query)
      .populate('facilityId')
      .populate('resourceTypeId')
      .exec();
  }

  async updateResource(idOrResourceId, updates) {
    const isObjectId = mongoose.Types.ObjectId.isValid(idOrResourceId);
    const query = isObjectId
      ? { $or: [{ _id: idOrResourceId }, { resourceId: idOrResourceId }] }
      : { resourceId: idOrResourceId };

    // Find and update document through save or findOneAndUpdate
    const resource = await HealthcareResource.findOne(query);
    if (!resource) return null;

    Object.assign(resource, updates);
    resource.version = (resource.version || 1) + 1;
    return await resource.save();
  }

  async deleteResource(idOrResourceId) {
    const isObjectId = mongoose.Types.ObjectId.isValid(idOrResourceId);
    const query = isObjectId
      ? { $or: [{ _id: idOrResourceId }, { resourceId: idOrResourceId }] }
      : { resourceId: idOrResourceId };

    return await HealthcareResource.findOneAndDelete(query).exec();
  }

  async getOrganizationInventorySummary(organizationId) {
    const resources = await HealthcareResource.find({ organizationId })
      .populate('resourceTypeId')
      .populate('facilityId')
      .exec();

    let totalQuantity = 0;
    let availableQuantity = 0;
    let reservedQuantity = 0;
    let allocatedQuantity = 0;
    let unavailableQuantity = 0;

    let operationalCount = 0;
    let maintenanceCount = 0;
    let unavailableCount = 0;

    const categoryBreakdown = {};
    const typeBreakdown = [];

    const now = new Date();
    let oldestVerifiedAt = null;

    resources.forEach((r) => {
      const tot = Number(r.totalQuantity ?? r.totalCapacity) || 0;
      const avail = Number(r.availableQuantity ?? r.availableCapacity) || 0;
      const resv = Number(r.reservedQuantity ?? r.reservedCapacity) || 0;
      const alloc = Number(r.allocatedQuantity ?? r.occupiedCapacity) || 0;
      const unavail = Number(r.unavailableQuantity) || 0;

      totalQuantity += tot;
      availableQuantity += avail;
      reservedQuantity += resv;
      allocatedQuantity += alloc;
      unavailableQuantity += unavail;

      if (r.operationalStatus === 'OPERATIONAL') operationalCount++;
      else if (r.operationalStatus === 'MAINTENANCE') maintenanceCount++;
      else unavailableCount++;

      const cat = r.resourceTypeId?.category || 'general';
      if (!categoryBreakdown[cat]) {
        categoryBreakdown[cat] = { total: 0, available: 0, reserved: 0, allocated: 0 };
      }
      categoryBreakdown[cat].total += tot;
      categoryBreakdown[cat].available += avail;
      categoryBreakdown[cat].reserved += resv;
      categoryBreakdown[cat].allocated += alloc;

      typeBreakdown.push({
        _id: r._id,
        resourceId: r.resourceId,
        resourceType: r.resourceType,
        resourceName: r.resourceName,
        category: cat,
        unitOfMeasure: r.resourceTypeId?.unitOfMeasure || 'units',
        total: tot,
        available: avail,
        reserved: resv,
        allocated: alloc,
        unavailable: unavail,
        operationalStatus: r.operationalStatus,
        lastVerifiedAt: r.lastVerifiedAt || r.updatedAt,
      });

      const verAt = r.lastVerifiedAt || r.updatedAt;
      if (verAt && (!oldestVerifiedAt || verAt < oldestVerifiedAt)) {
        oldestVerifiedAt = verAt;
      }
    });

    const utilizationRate =
      totalQuantity > 0 ? parseFloat((((reservedQuantity + allocatedQuantity) / totalQuantity) * 100).toFixed(1)) : 0;

    // Freshness status calculation (default 60m threshold)
    let freshnessStatus = 'FRESH';
    if (oldestVerifiedAt) {
      const ageMinutes = (now - new Date(oldestVerifiedAt)) / (1000 * 60);
      if (ageMinutes > 1440) freshnessStatus = 'VERY_STALE';
      else if (ageMinutes > 60) freshnessStatus = 'STALE';
    } else if (resources.length > 0) {
      freshnessStatus = 'STALE';
    }

    return {
      totalResources: resources.length,
      totalQuantity,
      availableQuantity,
      reservedQuantity,
      allocatedQuantity,
      unavailableQuantity,
      utilizationRate,
      operationalCount,
      maintenanceCount,
      unavailableCount,
      freshnessStatus,
      lastVerifiedAt: oldestVerifiedAt,
      categoryBreakdown,
      items: typeBreakdown,
    };
  }
}

export const resourceRepository = new ResourceRepository();

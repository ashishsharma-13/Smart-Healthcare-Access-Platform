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
}

export const resourceRepository = new ResourceRepository();

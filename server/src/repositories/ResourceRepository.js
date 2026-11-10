import { HealthcareResource, ResourceReservation } from '../models/index.js';

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
   * ATOMICALLY reserve a resource quantity if availableCapacity >= quantity.
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

  async findReservationById(id) {
    return await ResourceReservation.findById(id)
      .populate('emergencyRequestId')
      .populate('organizationId', 'name address')
      .populate('resourceId')
      .exec();
  }

  async findActiveReservationForRequest(emergencyRequestId) {
    return await ResourceReservation.findOne({
      emergencyRequestId,
      status: { $in: ['TEMPORARILY_RESERVED', 'PATIENT_EN_ROUTE'] },
    })
      .populate('organizationId', 'name address emergencyContactPhone')
      .populate('resourceId')
      .exec();
  }

  async updateReservationStatus(id, newStatus, extraFields = {}) {
    return await ResourceReservation.findByIdAndUpdate(
      id,
      {
        $set: {
          status: newStatus,
          ...extraFields,
        },
      },
      { new: true }
    ).exec();
  }

  async findExpiredReservations() {
    return await ResourceReservation.find({
      status: 'TEMPORARILY_RESERVED',
      expiresAt: { $lt: new Date() },
    }).exec();
  }
}

export const resourceRepository = new ResourceRepository();


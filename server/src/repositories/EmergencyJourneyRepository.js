import {
  EmergencyJourney,
  EmergencyLocationUpdate,
  EmergencyArrivalRecord,
  ResourceAllocation,
  ResourceReservation,
  EmergencyRequest,
} from '../models/index.js';

export class EmergencyJourneyRepository {
  /**
   * Find active in-progress journey for an emergency request
   */
  async findActiveJourney(emergencyRequestId) {
    return await EmergencyJourney.findOne({
      emergencyRequestId,
      status: 'IN_PROGRESS',
    })
      .populate('patientId', 'name phone email')
      .populate('organizationId', 'name contactNumber location address operatingAddress')
      .populate('reservationId')
      .exec();
  }

  /**
   * Find the most recent journey for an emergency request
   */
  async findLatestJourney(emergencyRequestId) {
    return await EmergencyJourney.findOne({ emergencyRequestId })
      .sort({ createdAt: -1 })
      .populate('patientId', 'name phone email')
      .populate('organizationId', 'name contactNumber location address operatingAddress')
      .populate('reservationId')
      .exec();
  }

  /**
   * Find journey by ID or business key
   */
  async findJourneyById(idOrJourneyId) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrJourneyId);
    const query = isObjectId ? { _id: idOrJourneyId } : { journeyId: idOrJourneyId };
    return await EmergencyJourney.findOne(query)
      .populate('patientId', 'name phone email')
      .populate('organizationId', 'name contactNumber location address operatingAddress')
      .populate('reservationId')
      .exec();
  }

  /**
   * Create a new emergency journey
   */
  async createJourney(data) {
    const journey = new EmergencyJourney(data);
    return await journey.save();
  }

  /**
   * Update journey status and optional fields
   */
  async updateJourney(journeyId, updates) {
    return await EmergencyJourney.findByIdAndUpdate(
      journeyId,
      { $set: updates },
      { new: true }
    ).exec();
  }

  /**
   * Record location update with bounded retention
   */
  async recordLocationUpdate({
    journeyId,
    emergencyRequestId,
    latitude,
    longitude,
    accuracyMeters,
    speed,
    heading,
  }) {
    const update = new EmergencyLocationUpdate({
      journeyId,
      emergencyRequestId,
      latitude,
      longitude,
      accuracyMeters,
      speed,
      heading,
      receivedAt: new Date(),
    });
    const saved = await update.save();

    // Update journey's last known location
    await EmergencyJourney.findByIdAndUpdate(journeyId, {
      $set: {
        lastKnownLocation: {
          latitude,
          longitude,
          accuracyMeters,
          speed,
          heading,
          updatedAt: new Date(),
        },
      },
    }).exec();

    // Bounded retention: enforce retention cap (retain latest 50 updates per journey)
    const count = await EmergencyLocationUpdate.countDocuments({ journeyId });
    if (count > 50) {
      const excess = count - 50;
      const oldest = await EmergencyLocationUpdate.find({ journeyId })
        .sort({ receivedAt: 1 })
        .limit(excess)
        .select('_id')
        .exec();
      if (oldest.length > 0) {
        await EmergencyLocationUpdate.deleteMany({
          _id: { $in: oldest.map((d) => d._id) },
        }).exec();
      }
    }

    return saved;
  }

  /**
   * Get latest recorded location for a journey
   */
  async getLatestLocation(journeyId) {
    return await EmergencyLocationUpdate.findOne({ journeyId })
      .sort({ receivedAt: -1 })
      .exec();
  }

  /**
   * Get bounded location history for a journey
   */
  async getLocationHistory(journeyId, limit = 50) {
    return await EmergencyLocationUpdate.find({ journeyId })
      .sort({ receivedAt: 1 })
      .limit(limit)
      .exec();
  }

  /**
   * Record arrival verification
   */
  async createArrivalRecord(data) {
    const record = new EmergencyArrivalRecord(data);
    return await record.save();
  }

  /**
   * Find arrival records for an emergency request
   */
  async findArrivalRecords(emergencyRequestId) {
    return await EmergencyArrivalRecord.find({ emergencyRequestId })
      .sort({ verifiedAt: -1 })
      .populate('verifiedBy', 'name email role')
      .populate('organizationId', 'name')
      .exec();
  }

  /**
   * Create resource allocation record
   */
  async createAllocation(data) {
    const allocation = new ResourceAllocation(data);
    return await allocation.save();
  }

  /**
   * Get all allocations for a reservation
   */
  async getAllocationsForReservation(reservationId) {
    return await ResourceAllocation.find({ reservationId })
      .sort({ allocatedAt: -1 })
      .populate('allocatedBy', 'name email role')
      .populate('healthcareResourceId', 'resourceType resourceName bayNumber floor')
      .populate('reservationItemId')
      .exec();
  }

  /**
   * Find incoming patients for an organization
   */
  async findIncomingPatientsForOrg(organizationId) {
    const reservations = await ResourceReservation.find({
      organizationId,
      status: { $in: ['PATIENT_EN_ROUTE', 'TEMPORARILY_RESERVED', 'PATIENT_ARRIVED'] },
    })
      .populate({
        path: 'emergencyRequestId',
        populate: [
          { path: 'patientId', select: 'name phone email' },
          { path: 'emergencyCategoryId', select: 'categoryName description' },
        ],
      })
      .sort({ updatedAt: -1 })
      .exec();

    // Attach active journey and latest location to each reservation
    const results = [];
    for (const resv of reservations) {
      if (!resv.emergencyRequestId) continue;
      const journey = await EmergencyJourney.findOne({
        emergencyRequestId: resv.emergencyRequestId._id,
      })
        .sort({ createdAt: -1 })
        .exec();

      results.push({
        reservation: resv,
        emergencyRequest: resv.emergencyRequestId,
        journey: journey || null,
        latestLocation: journey?.lastKnownLocation || null,
      });
    }

    return results;
  }
}

export const emergencyJourneyRepository = new EmergencyJourneyRepository();


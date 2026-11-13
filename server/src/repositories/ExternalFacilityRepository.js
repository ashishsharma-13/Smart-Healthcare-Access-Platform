import mongoose from 'mongoose';
import { ExternalHealthcareFacility } from '../models/index.js';

export class ExternalFacilityRepository {
  /**
   * Calculates Haversine distance between two [lng, lat] coordinates in km.
   */
  calculateDistance(coord1, coord2) {
    if (!coord1 || !coord2 || coord1.length < 2 || coord2.length < 2) return 999;
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

  async createFacility(data) {
    return await ExternalHealthcareFacility.create(data);
  }

  async findById(id) {
    if (!id) return null;
    if (mongoose.Types.ObjectId.isValid(id) && String(id).length === 24) {
      const doc = await ExternalHealthcareFacility.findById(id).exec();
      if (doc) return doc;
    }
    return await ExternalHealthcareFacility.findOne({ externalFacilityId: id }).exec();
  }

  async findByExternalFacilityId(externalFacilityId) {
    return await ExternalHealthcareFacility.findOne({ externalFacilityId }).exec();
  }

  async findByName(facilityName) {
    if (!facilityName) return null;
    const escaped = facilityName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return await ExternalHealthcareFacility.findOne({
      facilityName: { $regex: new RegExp(`^${escaped}$`, 'i') },
    }).exec();
  }

  async listAll(filter = {}) {
    return await ExternalHealthcareFacility.find(filter)
      .sort({ facilityName: 1 })
      .exec();
  }

  async listActive(filter = {}) {
    return await ExternalHealthcareFacility.find({ active: true, ...filter })
      .sort({ facilityName: 1 })
      .exec();
  }

  /**
   * Finds facilities within a maximum distance from coordinates [lng, lat].
   * Uses in-memory distance calculation for robust resilience across test and prod environments.
   */
  async findNearby({ coordinates, maxDistanceKm = 50, limit = 10, specialties = [] }) {
    const coords = Array.isArray(coordinates) && coordinates.length === 2 && !isNaN(coordinates[0])
      ? coordinates
      : [77.2090, 28.6139]; // Default Delhi center

    const filter = { active: true };
    if (Array.isArray(specialties) && specialties.length > 0) {
      filter.specialties = { $in: specialties };
    }

    const allActive = await ExternalHealthcareFacility.find(filter).exec();

    const withDist = allActive.map((fac) => {
      const facCoords = fac.location?.coordinates || [fac.longitude, fac.latitude];
      const dist = this.calculateDistance(coords, facCoords);
      return {
        facility: fac,
        distanceKm: dist,
      };
    });

    const inRange = withDist.filter((item) => item.distanceKm <= maxDistanceKm);

    inRange.sort((a, b) => a.distanceKm - b.distanceKm);

    return inRange.slice(0, limit);
  }

  async updateFacility(id, updateData) {
    const query = mongoose.Types.ObjectId.isValid(id) && String(id).length === 24
      ? { _id: id }
      : { externalFacilityId: id };

    return await ExternalHealthcareFacility.findOneAndUpdate(
      query,
      { $set: updateData },
      { new: true }
    ).exec();
  }

  async count(filter = {}) {
    return await ExternalHealthcareFacility.countDocuments(filter).exec();
  }
}

export const externalFacilityRepository = new ExternalFacilityRepository();

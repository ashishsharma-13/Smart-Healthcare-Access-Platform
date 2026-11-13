import { externalFacilityRepository } from '../repositories/ExternalFacilityRepository.js';
import { externalFacilityDirectoryService } from './ExternalFacilityDirectoryService.js';

export class ExternalFacilityDiscoveryService {
  /**
   * Estimates travel time in minutes based on average city driving speed (30 km/h).
   */
  estimateTravelMinutes(distanceKm) {
    const avgSpeedKmH = 30;
    const minutes = (distanceKm / avgSpeedKmH) * 60;
    return Math.max(5, Math.round(minutes));
  }

  /**
   * Discovers external facilities within radiusKm of patient location.
   * Explicitly marks availability as UNCONFIRMED.
   */
  async discoverExternalFacilities({ coordinates, radiusKm = 50, limit = 10, emergencyType = null }) {
    // Ensure directory is seeded
    await externalFacilityDirectoryService.seedDefaultExternalFacilities();

    const coords = Array.isArray(coordinates) && coordinates.length === 2 && !isNaN(coordinates[0]) && !isNaN(coordinates[1])
      ? coordinates
      : [77.2090, 28.6139]; // Default Delhi center

    const nearby = await externalFacilityRepository.findNearby({
      coordinates: coords,
      maxDistanceKm: radiusKm,
      limit,
    });

    return nearby.map(({ facility, distanceKm }) => {
      const etaMins = this.estimateTravelMinutes(distanceKm);
      const facCoords = facility.location?.coordinates || [facility.longitude, facility.latitude];
      const destLat = facCoords[1];
      const destLng = facCoords[0];

      return {
        _id: facility._id,
        externalFacilityId: facility.externalFacilityId,
        facilityName: facility.facilityName,
        facilityType: facility.facilityType,
        address: facility.address || facility.operatingAddress?.streetName || '',
        operatingAddress: facility.operatingAddress,
        coordinates: facCoords,
        latitude: destLat,
        longitude: destLng,
        contactNumber: facility.contactNumber || '108',
        emergencyContactPhone: facility.emergencyContactPhone || facility.contactNumber || '108',
        specialties: facility.specialties || [],
        dataSource: facility.dataSource,
        verificationStatus: facility.verificationStatus,
        distanceKm,
        estimatedTravelMinutes: etaMins,
        isPartner: false,
        isExternal: true,
        liveAvailabilityConfirmed: false,
        availabilityConfirmation: 'UNCONFIRMED_EXTERNAL',
        managedReservationSupported: false,
        disclaimer:
          'Mandatory Emergency Care Notice: Live bed and specialist availability cannot be verified for external facilities. Dispatching call to Emergency Services (112/108).',
        googleMapsUrl: `https://www.google.com/maps/dir/?api=1&origin=${coords[1]},${coords[0]}&destination=${destLat},${destLng}&travelmode=driving`,
      };
    });
  }
}

export const externalFacilityDiscoveryService = new ExternalFacilityDiscoveryService();


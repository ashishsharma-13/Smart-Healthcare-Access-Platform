import { externalFacilityRepository } from '../repositories/ExternalFacilityRepository.js';
import { ExternalHealthcareFacility } from '../models/index.js';

export const DEFAULT_EXTERNAL_FACILITIES = [
  {
    externalFacilityId: 'EXT-FAC-AIIMS-TRAUMA',
    facilityName: 'AIIMS Apex Trauma Center (JPNATC)',
    facilityType: 'Apex Level-1 Public Trauma Center',
    specialties: ['Level-1 Polytrauma', 'Neurosurgery', 'Orthopedic Surgery', 'Emergency Resuscitation'],
    latitude: 28.5672,
    longitude: 77.1950,
    location: {
      type: 'Point',
      coordinates: [77.1950, 28.5672],
    },
    address: 'Ring Road, Raj Nagar, Safdarjung Enclave, New Delhi 110029',
    operatingAddress: {
      buildingNumber: 'JPNATC Complex',
      streetName: 'Ring Road, Raj Nagar, Safdarjung Enclave',
      area: 'South Delhi',
      city: 'New Delhi',
      pinCode: '110029',
      location: {
        type: 'Point',
        coordinates: [77.1950, 28.5672],
      },
    },
    contactNumber: '01126731000',
    emergencyContactPhone: '011-26731000',
    dataSource: 'GOVERNMENT_DIRECTORY',
    sourceReference: 'AIIMS_NEW_DELHI_GOV',
    verificationStatus: 'DIRECTORY_VERIFIED',
    active: true,
  },
  {
    externalFacilityId: 'EXT-FAC-SAFDARJUNG',
    facilityName: 'Safdarjung Hospital Emergency & Burn Block',
    facilityType: 'Central Government Multi-Speciality Trauma Block',
    specialties: ['24/7 Burn ICU', 'Emergency Surgery', 'Cardiac Resuscitation', 'Toxicology'],
    latitude: 28.5705,
    longitude: 77.2075,
    location: {
      type: 'Point',
      coordinates: [77.2075, 28.5705],
    },
    address: 'Ansari Nagar West, Ring Road, New Delhi 110029',
    operatingAddress: {
      buildingNumber: 'Emergency Block',
      streetName: 'Ansari Nagar West, Ring Road',
      area: 'South Delhi',
      city: 'New Delhi',
      pinCode: '110029',
      location: {
        type: 'Point',
        coordinates: [77.2075, 28.5705],
      },
    },
    contactNumber: '01126707444',
    emergencyContactPhone: '011-26707444',
    dataSource: 'GOVERNMENT_DIRECTORY',
    sourceReference: 'MOHFW_CENTRAL_GOV',
    verificationStatus: 'DIRECTORY_VERIFIED',
    active: true,
  },
  {
    externalFacilityId: 'EXT-FAC-RML',
    facilityName: 'Dr. Ram Manohar Lohia (RML) Hospital Emergency',
    facilityType: 'Central Govt Tertiary Trauma & Cardiac Center',
    specialties: ['Acute Cardiac Care', 'Trauma Bay', 'Stroke Unit', 'Toxicology'],
    latitude: 28.6253,
    longitude: 77.2014,
    location: {
      type: 'Point',
      coordinates: [77.2014, 28.6253],
    },
    address: 'Baba Kharak Singh Marg, Connaught Place, New Delhi 110001',
    operatingAddress: {
      buildingNumber: 'Casualty & Trauma Dept',
      streetName: 'Baba Kharak Singh Marg',
      area: 'Connaught Place',
      city: 'New Delhi',
      pinCode: '110001',
      location: {
        type: 'Point',
        coordinates: [77.2014, 28.6253],
      },
    },
    contactNumber: '01123365525',
    emergencyContactPhone: '011-23365525',
    dataSource: 'GOVERNMENT_DIRECTORY',
    sourceReference: 'MOHFW_CENTRAL_GOV',
    verificationStatus: 'DIRECTORY_VERIFIED',
    active: true,
  },
  {
    externalFacilityId: 'EXT-FAC-LNJP',
    facilityName: 'Lok Nayak Jai Prakash (LNJP) Hospital',
    facilityType: 'Delhi State Govt Level-2 Trauma & ER',
    specialties: ['Emergency Medicine', 'Pediatric ICU', 'General Surgery', '24/7 Blood Bank'],
    latitude: 28.6385,
    longitude: 77.2405,
    location: {
      type: 'Point',
      coordinates: [77.2405, 28.6385],
    },
    address: 'Jawaharlal Nehru Marg, Delhi Gate, New Delhi 110002',
    operatingAddress: {
      buildingNumber: 'Casualty Wing',
      streetName: 'Jawaharlal Nehru Marg, Delhi Gate',
      area: 'Central Delhi',
      city: 'New Delhi',
      pinCode: '110002',
      location: {
        type: 'Point',
        coordinates: [77.2405, 28.6385],
      },
    },
    contactNumber: '01123233000',
    emergencyContactPhone: '011-23233000',
    dataSource: 'GOVERNMENT_DIRECTORY',
    sourceReference: 'DELHI_STATE_HEALTH_MISSION',
    verificationStatus: 'DIRECTORY_VERIFIED',
    active: true,
  },
  {
    externalFacilityId: 'EXT-FAC-GTB',
    facilityName: 'Guru Teg Bahadur (GTB) Hospital Trauma Hub',
    facilityType: 'East Delhi Regional Public Trauma Center',
    specialties: ['Major Trauma', 'Neurosurgical ER', 'Emergency Dialysis', 'ICU'],
    latitude: 28.6840,
    longitude: 77.3090,
    location: {
      type: 'Point',
      coordinates: [77.3090, 28.6840],
    },
    address: 'Tahirpur Road, Dilshad Garden, Delhi 110095',
    operatingAddress: {
      buildingNumber: 'Trauma Center Block',
      streetName: 'Tahirpur Road, Dilshad Garden',
      area: 'East Delhi',
      city: 'Delhi',
      pinCode: '110095',
      location: {
        type: 'Point',
        coordinates: [77.3090, 28.6840],
      },
    },
    contactNumber: '01122586262',
    emergencyContactPhone: '011-22586262',
    dataSource: 'GOVERNMENT_DIRECTORY',
    sourceReference: 'DELHI_STATE_HEALTH_MISSION',
    verificationStatus: 'DIRECTORY_VERIFIED',
    active: true,
  },
  {
    externalFacilityId: 'EXT-FAC-DDU',
    facilityName: 'Deen Dayal Upadhyay (DDU) Hospital Emergency',
    facilityType: 'West Delhi Regional Public Hospital',
    specialties: ['Emergency Trauma Care', 'Orthopedics', 'General Resuscitation'],
    latitude: 28.6272,
    longitude: 77.1082,
    location: {
      type: 'Point',
      coordinates: [77.1082, 28.6272],
    },
    address: 'Clock Tower, Hari Nagar, New Delhi 110064',
    operatingAddress: {
      buildingNumber: 'Casualty Wing',
      streetName: 'Clock Tower, Hari Nagar',
      area: 'West Delhi',
      city: 'New Delhi',
      pinCode: '110064',
      location: {
        type: 'Point',
        coordinates: [77.1082, 28.6272],
      },
    },
    contactNumber: '01125494404',
    emergencyContactPhone: '011-25494404',
    dataSource: 'GOVERNMENT_DIRECTORY',
    sourceReference: 'DELHI_STATE_HEALTH_MISSION',
    verificationStatus: 'DIRECTORY_VERIFIED',
    active: true,
  },
];

export class ExternalFacilityDirectoryService {
  /**
   * Seeds default major government trauma facilities if none exist.
   */
  async seedDefaultExternalFacilities() {
    try {
      const count = await externalFacilityRepository.count();
      if (count > 0) return { seeded: 0, existing: count };

      let seededCount = 0;
      for (const fac of DEFAULT_EXTERNAL_FACILITIES) {
        const existing = await externalFacilityRepository.findByName(fac.facilityName);
        if (!existing) {
          await externalFacilityRepository.createFacility(fac);
          seededCount++;
        }
      }
      return { seeded: seededCount, existing: count };
    } catch (err) {
      console.warn('[ExternalFacilityDirectoryService] Seed error:', err.message);
      return { seeded: 0, error: err.message };
    }
  }

  async listFacilities(filter = {}) {
    return await externalFacilityRepository.listAll(filter);
  }

  async getFacilityById(id) {
    const fac = await externalFacilityRepository.findById(id);
    if (!fac) {
      const err = new Error('External healthcare facility not found');
      err.statusCode = 404;
      throw err;
    }
    return fac;
  }

  async registerFacility(data) {
    if (!data.facilityName) {
      const err = new Error('Facility name is required');
      err.statusCode = 400;
      throw err;
    }

    // Check duplicate
    const existing = await externalFacilityRepository.findByName(data.facilityName);
    if (existing) {
      const err = new Error(`Facility with name '${data.facilityName}' already exists in directory`);
      err.statusCode = 409;
      throw err;
    }

    // Validate coordinates
    const lat = Number(data.latitude ?? data.location?.coordinates?.[1]);
    const lng = Number(data.longitude ?? data.location?.coordinates?.[0]);
    if (isNaN(lat) || isNaN(lng)) {
      const err = new Error('Valid latitude and longitude are required');
      err.statusCode = 400;
      throw err;
    }

    return await externalFacilityRepository.createFacility({
      ...data,
      latitude: lat,
      longitude: lng,
      location: {
        type: 'Point',
        coordinates: [lng, lat],
      },
    });
  }

  async updateFacility(id, updateData) {
    const fac = await this.getFacilityById(id);
    if (updateData.latitude != null || updateData.longitude != null) {
      const lat = Number(updateData.latitude ?? fac.latitude);
      const lng = Number(updateData.longitude ?? fac.longitude);
      updateData.latitude = lat;
      updateData.longitude = lng;
      updateData.location = {
        type: 'Point',
        coordinates: [lng, lat],
      };
    }
    return await externalFacilityRepository.updateFacility(fac._id, updateData);
  }
}

export const externalFacilityDirectoryService = new ExternalFacilityDirectoryService();


import { externalFacilityRepository } from '../repositories/ExternalFacilityRepository.js';
import { ExternalHealthcareFacility } from '../models/index.js';
import { MULTI_CITY_HEALTHCARE_FACILITIES } from '../utils/multiCityHealthcareData.js';

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
  {
    externalFacilityId: 'EXT-FAC-HYD-OSMANIA',
    facilityName: 'Osmania General Hospital & Trauma Center',
    facilityType: 'State Apex Tertiary Public Trauma Center',
    specialties: ['Level-1 Trauma Bay', 'Emergency Surgery', 'Casualty & Resuscitation', 'Burn Unit'],
    latitude: 17.3785,
    longitude: 78.4770,
    location: {
      type: 'Point',
      coordinates: [78.4770, 17.3785],
    },
    address: 'Afzal Gunj, High Court Road, Hyderabad, Telangana 500012',
    operatingAddress: {
      buildingNumber: 'Trauma & Casualty Wing',
      streetName: 'Afzal Gunj, High Court Road',
      area: 'Afzal Gunj',
      city: 'Hyderabad',
      pinCode: '500012',
      location: {
        type: 'Point',
        coordinates: [78.4770, 17.3785],
      },
    },
    contactNumber: '04024600121',
    emergencyContactPhone: '040-24600121',
    dataSource: 'GOVERNMENT_DIRECTORY',
    sourceReference: 'TELANGANA_DME_GOV',
    verificationStatus: 'DIRECTORY_VERIFIED',
    active: true,
  },
  {
    externalFacilityId: 'EXT-FAC-HYD-GANDHI',
    facilityName: 'Gandhi Hospital & Emergency Trauma Block',
    facilityType: 'State Apex Tertiary Teaching & Trauma Center',
    specialties: ['Polytrauma', 'Emergency Resuscitation', 'Toxicology', '24/7 Acute ICU'],
    latitude: 17.4243,
    longitude: 78.5034,
    location: {
      type: 'Point',
      coordinates: [78.5034, 17.4243],
    },
    address: 'Musheerabad, Padmarao Nagar, Secunderabad, Hyderabad 500003',
    operatingAddress: {
      buildingNumber: 'Emergency Block',
      streetName: 'Musheerabad, Padmarao Nagar',
      area: 'Secunderabad',
      city: 'Hyderabad',
      pinCode: '500003',
      location: {
        type: 'Point',
        coordinates: [78.5034, 17.4243],
      },
    },
    contactNumber: '04027505566',
    emergencyContactPhone: '040-27505566',
    dataSource: 'GOVERNMENT_DIRECTORY',
    sourceReference: 'TELANGANA_DME_GOV',
    verificationStatus: 'DIRECTORY_VERIFIED',
    active: true,
  },
  {
    externalFacilityId: 'EXT-FAC-HYD-NIMS',
    facilityName: "Nizam's Institute of Medical Sciences (NIMS) Emergency Center",
    facilityType: 'Autonomous Super-Specialty Medical Institute',
    specialties: ['Acute Neuro-trauma', 'Emergency Cardiology', 'Organ Resuscitation', 'Toxicology'],
    latitude: 17.4223,
    longitude: 78.4526,
    location: {
      type: 'Point',
      coordinates: [78.4526, 17.4223],
    },
    address: 'Punjagutta, Hyderabad, Telangana 500082',
    operatingAddress: {
      buildingNumber: 'Emergency Medicine Dept',
      streetName: 'Punjagutta Main Road',
      area: 'Punjagutta',
      city: 'Hyderabad',
      pinCode: '500082',
      location: {
        type: 'Point',
        coordinates: [78.4526, 17.4223],
      },
    },
    contactNumber: '04023489000',
    emergencyContactPhone: '040-23489000',
    dataSource: 'GOVERNMENT_DIRECTORY',
    sourceReference: 'NIMS_TELANGANA_GOV',
    verificationStatus: 'DIRECTORY_VERIFIED',
    active: true,
  },
  {
    externalFacilityId: 'EXT-FAC-HYD-KONDAPUR',
    facilityName: 'Government Area Hospital Kondapur (Casualty & Trauma)',
    facilityType: 'Government Area Hospital & Casualty Unit',
    specialties: ['24/7 Casualty', 'Primary Resuscitation', 'General Trauma', 'Ambulance Triage'],
    latitude: 17.4682,
    longitude: 78.3610,
    location: {
      type: 'Point',
      coordinates: [78.3610, 17.4682],
    },
    address: 'Near RTO Office, Kondapur, Hyderabad, Telangana 500084',
    operatingAddress: {
      buildingNumber: 'Casualty Ward',
      streetName: 'Near RTO Office, Gachibowli-Miyapur Road',
      area: 'Kondapur / Hitec City',
      city: 'Hyderabad',
      pinCode: '500084',
      location: {
        type: 'Point',
        coordinates: [78.3610, 17.4682],
      },
    },
    contactNumber: '04023112233',
    emergencyContactPhone: '040-23112233',
    dataSource: 'GOVERNMENT_DIRECTORY',
    sourceReference: 'TELANGANA_DME_GOV',
    verificationStatus: 'DIRECTORY_VERIFIED',
    active: true,
  },
  {
    externalFacilityId: 'EXT-FAC-HYD-KING-KOTI',
    facilityName: 'King Koti District Hospital Casualty & ER',
    facilityType: 'District Headquarters Government Hospital',
    specialties: ['24/7 Emergency Wing', 'Trauma Stabilization', 'Pediatric ER'],
    latitude: 17.3915,
    longitude: 78.4845,
    location: {
      type: 'Point',
      coordinates: [78.4845, 17.3915],
    },
    address: 'King Koti Road, Abids, Hyderabad, Telangana 500001',
    operatingAddress: {
      buildingNumber: 'Emergency Casualty',
      streetName: 'King Koti Road',
      area: 'Abids',
      city: 'Hyderabad',
      pinCode: '500001',
      location: {
        type: 'Point',
        coordinates: [78.4845, 17.3915],
      },
    },
    contactNumber: '04024753388',
    emergencyContactPhone: '040-24753388',
    dataSource: 'GOVERNMENT_DIRECTORY',
    sourceReference: 'TELANGANA_DME_GOV',
    verificationStatus: 'DIRECTORY_VERIFIED',
    active: true,
  },
  {
    externalFacilityId: 'EXT-FAC-HYD-VANASTHALIPURAM',
    facilityName: 'Government Area Hospital Vanasthalipuram',
    facilityType: 'Government Area Hospital & Emergency Care',
    specialties: ['Emergency Trauma Care', 'Casualty', 'Maternal & Child Resuscitation'],
    latitude: 17.3275,
    longitude: 78.5725,
    location: {
      type: 'Point',
      coordinates: [78.5725, 17.3275],
    },
    address: 'Red Tank, Vanasthalipuram, Hyderabad, Telangana 500070',
    operatingAddress: {
      buildingNumber: 'Casualty Wing',
      streetName: 'Red Tank, NH 65',
      area: 'Vanasthalipuram',
      city: 'Hyderabad',
      pinCode: '500070',
      location: {
        type: 'Point',
        coordinates: [78.5725, 17.3275],
      },
    },
    contactNumber: '04024241088',
    emergencyContactPhone: '040-24241088',
    dataSource: 'GOVERNMENT_DIRECTORY',
    sourceReference: 'TELANGANA_DME_GOV',
    verificationStatus: 'DIRECTORY_VERIFIED',
    ownershipType: 'GOVERNMENT',
    active: true,
  },
  {
    externalFacilityId: 'EXT-FAC-HYD-UPHC-SERILINGAMPALLY',
    facilityName: 'Urban Primary Health Center (UPHC) Serilingampally',
    facilityType: 'Government Urban Primary Health Center',
    ownershipType: 'GOVERNMENT',
    specialties: ['24/7 Emergency First Aid', 'Trauma Triage', 'Ambulance Outpost', 'Primary Resuscitation'],
    latitude: 17.4835,
    longitude: 78.3182,
    location: {
      type: 'Point',
      coordinates: [78.3182, 17.4835],
    },
    address: 'Tara Nagar, Serilingampally Main Road, Hyderabad, Telangana 500019',
    operatingAddress: {
      buildingNumber: 'UPHC Health Building',
      streetName: 'Tara Nagar, Serilingampally Main Road',
      area: 'Serilingampally',
      city: 'Hyderabad',
      pinCode: '500019',
      location: {
        type: 'Point',
        coordinates: [78.3182, 17.4835],
      },
    },
    contactNumber: '04023030108',
    emergencyContactPhone: '040-23030108',
    dataSource: 'GOVERNMENT_DIRECTORY',
    sourceReference: 'TELANGANA_DME_GOV',
    verificationStatus: 'DIRECTORY_VERIFIED',
    active: true,
  },
  {
    externalFacilityId: 'EXT-FAC-HYD-UPHC-GACHIBOWLI',
    facilityName: 'Urban Primary Health Center (UPHC) Gachibowli',
    facilityType: 'Government Urban Health Center & Emergency Outpost',
    ownershipType: 'GOVERNMENT',
    specialties: ['Emergency Stabilization', 'Acute Clinical Care', '108 Ambulance Dispatch'],
    latitude: 17.4401,
    longitude: 78.3489,
    location: {
      type: 'Point',
      coordinates: [78.3489, 17.4401],
    },
    address: 'Vinayak Nagar, Telecom Nagar, Gachibowli, Hyderabad, Telangana 500032',
    operatingAddress: {
      buildingNumber: 'Government UPHC Complex',
      streetName: 'Vinayak Nagar, Telecom Nagar',
      area: 'Gachibowli',
      city: 'Hyderabad',
      pinCode: '500032',
      location: {
        type: 'Point',
        coordinates: [78.3489, 17.4401],
      },
    },
    contactNumber: '04029800108',
    emergencyContactPhone: '040-29800108',
    dataSource: 'GOVERNMENT_DIRECTORY',
    sourceReference: 'TELANGANA_DME_GOV',
    verificationStatus: 'DIRECTORY_VERIFIED',
    active: true,
  },
  {
    externalFacilityId: 'EXT-FAC-HYD-PHC-CHANDANAGAR',
    facilityName: 'Government Primary Health Center (PHC) Chandanagar / Lingampally',
    facilityType: 'Government Primary Health Center & Casualty',
    ownershipType: 'GOVERNMENT',
    specialties: ['24/7 Casualty', 'Emergency Wound Care', 'Maternal & Child Emergency Care'],
    latitude: 17.4920,
    longitude: 78.3245,
    location: {
      type: 'Point',
      coordinates: [78.3245, 17.4920],
    },
    address: 'Near Lingampally Railway Station Road, Chandanagar, Hyderabad, Telangana 500050',
    operatingAddress: {
      buildingNumber: 'PHC Emergency Center',
      streetName: 'Station Road, Chandanagar',
      area: 'Chandanagar / Lingampally',
      city: 'Hyderabad',
      pinCode: '500050',
      location: {
        type: 'Point',
        coordinates: [78.3245, 17.4920],
      },
    },
    contactNumber: '04023034455',
    emergencyContactPhone: '040-23034455',
    dataSource: 'GOVERNMENT_DIRECTORY',
    sourceReference: 'TELANGANA_DME_GOV',
    verificationStatus: 'DIRECTORY_VERIFIED',
    active: true,
  },
  {
    externalFacilityId: 'EXT-FAC-HYD-UPHC-HAFEEZPET',
    facilityName: 'Urban Primary Health Center (UPHC) Hafeezpet',
    facilityType: 'Government Urban Health Center',
    ownershipType: 'GOVERNMENT',
    specialties: ['Casualty Stabilization', 'Emergency Medicine', 'Ambulance Triage Station'],
    latitude: 17.4810,
    longitude: 78.3490,
    location: {
      type: 'Point',
      coordinates: [78.3490, 17.4810],
    },
    address: 'Hafeezpet Main Road, Near Old Post Office, Hyderabad, Telangana 500049',
    operatingAddress: {
      buildingNumber: 'UPHC Facility',
      streetName: 'Hafeezpet Main Road',
      area: 'Hafeezpet',
      city: 'Hyderabad',
      pinCode: '500049',
      location: {
        type: 'Point',
        coordinates: [78.3490, 17.4810],
      },
    },
    contactNumber: '04023040108',
    emergencyContactPhone: '040-23040108',
    dataSource: 'GOVERNMENT_DIRECTORY',
    sourceReference: 'TELANGANA_DME_GOV',
    verificationStatus: 'DIRECTORY_VERIFIED',
    active: true,
  },
  {
    externalFacilityId: 'EXT-FAC-HYD-BHEL-GENERAL',
    facilityName: 'BHEL General Hospital (Public Sector Hospital & Emergency Trauma Hub)',
    facilityType: 'Public Sector Undertaking Hospital & Trauma Center',
    ownershipType: 'GOVERNMENT',
    specialties: ['24/7 Acute Casualty', 'Level-2 Trauma Care', 'ICU & Cardiac Care', 'Burn Resuscitation'],
    latitude: 17.5012,
    longitude: 78.2890,
    location: {
      type: 'Point',
      coordinates: [78.2890, 17.5012],
    },
    address: 'BHEL Township, Ramachandrapuram, Hyderabad, Telangana 502032',
    operatingAddress: {
      buildingNumber: 'Main Hospital Block',
      streetName: 'BHEL Township Road',
      area: 'Ramachandrapuram / BHEL',
      city: 'Hyderabad',
      pinCode: '502032',
      location: {
        type: 'Point',
        coordinates: [78.2890, 17.5012],
      },
    },
    contactNumber: '04023182222',
    emergencyContactPhone: '040-23182222',
    dataSource: 'GOVERNMENT_DIRECTORY',
    sourceReference: 'BHEL_GOV_DIRECTORY',
    verificationStatus: 'DIRECTORY_VERIFIED',
    active: true,
  },
  {
    externalFacilityId: 'EXT-FAC-HYD-ESIC-RC-PURAM',
    facilityName: 'ESI Hospital RC Puram (Employees State Insurance Govt Hospital)',
    facilityType: 'Central Government ESIC Hospital & Casualty Wing',
    ownershipType: 'GOVERNMENT',
    specialties: ['24/7 Emergency Casualty', 'Industrial Polytrauma', 'Emergency Surgery', 'ICU'],
    latitude: 17.5098,
    longitude: 78.2985,
    location: {
      type: 'Point',
      coordinates: [78.2985, 17.5098],
    },
    address: 'Factory Road, Ramachandrapuram, Hyderabad, Telangana 502032',
    operatingAddress: {
      buildingNumber: 'Casualty & Trauma Dept',
      streetName: 'Factory Road, Ramachandrapuram',
      area: 'RC Puram',
      city: 'Hyderabad',
      pinCode: '502032',
      location: {
        type: 'Point',
        coordinates: [78.2985, 17.5098],
      },
    },
    contactNumber: '04023021444',
    emergencyContactPhone: '040-23021444',
    dataSource: 'GOVERNMENT_DIRECTORY',
    sourceReference: 'ESIC_CENTRAL_GOV',
    verificationStatus: 'DIRECTORY_VERIFIED',
    active: true,
  },
  {
    externalFacilityId: 'EXT-FAC-HYD-CHC-PATANCHERU',
    facilityName: 'Government Community Health Center (CHC) & Area Hospital Patancheru',
    facilityType: 'Government Community Health Center & Regional Trauma Unit',
    ownershipType: 'GOVERNMENT',
    specialties: ['24/7 Trauma Bay', 'Industrial Resuscitation', 'Emergency Surgery', 'Toxicology'],
    latitude: 17.5286,
    longitude: 78.2612,
    location: {
      type: 'Point',
      coordinates: [78.2612, 17.5286],
    },
    address: 'Near Bus Depot, NH 65, Patancheru, Hyderabad, Telangana 502319',
    operatingAddress: {
      buildingNumber: 'Emergency Trauma Wing',
      streetName: 'NH 65, Patancheru Industrial Area',
      area: 'Patancheru',
      city: 'Hyderabad',
      pinCode: '502319',
      location: {
        type: 'Point',
        coordinates: [78.2612, 17.5286],
      },
    },
    contactNumber: '08455242233',
    emergencyContactPhone: '08455-242233',
    dataSource: 'GOVERNMENT_DIRECTORY',
    sourceReference: 'TELANGANA_DME_GOV',
    verificationStatus: 'DIRECTORY_VERIFIED',
    active: true,
  },
  {
    externalFacilityId: 'EXT-FAC-HYD-GOLCONDA',
    facilityName: 'Government Area Hospital Golconda',
    facilityType: 'Telangana State Area Hospital & Casualty Unit',
    ownershipType: 'GOVERNMENT',
    specialties: ['24/7 Casualty Wing', 'Emergency Surgery', 'Pediatric Emergency'],
    latitude: 17.3824,
    longitude: 78.4011,
    location: {
      type: 'Point',
      coordinates: [78.4011, 17.3824],
    },
    address: 'Bada Bazaar, Golconda Fort, Hyderabad, Telangana 500008',
    operatingAddress: {
      buildingNumber: 'Area Hospital Casualty',
      streetName: 'Bada Bazaar',
      area: 'Golconda',
      city: 'Hyderabad',
      pinCode: '500008',
      location: {
        type: 'Point',
        coordinates: [78.4011, 17.3824],
      },
    },
    contactNumber: '04023561234',
    emergencyContactPhone: '040-23561234',
    dataSource: 'GOVERNMENT_DIRECTORY',
    sourceReference: 'TELANGANA_DME_GOV',
    verificationStatus: 'DIRECTORY_VERIFIED',
    active: true,
  },
];

export class ExternalFacilityDirectoryService {
  /**
   * Seeds default major government trauma facilities if none exist or if new ones were added.
   */
  async seedDefaultExternalFacilities() {
    try {
      let seededCount = 0;
      for (const fac of DEFAULT_EXTERNAL_FACILITIES) {
        const existing = await externalFacilityRepository.findByName(fac.facilityName);
        if (!existing) {
          await externalFacilityRepository.createFacility(fac);
          seededCount++;
        }
      }
      for (const fac of MULTI_CITY_HEALTHCARE_FACILITIES) {
        const result = await ExternalHealthcareFacility.updateOne(
          { externalFacilityId: fac.externalFacilityId },
          { $setOnInsert: fac },
          { upsert: true }
        );
        seededCount += result.upsertedCount || 0;
      }
      const count = await externalFacilityRepository.count();
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


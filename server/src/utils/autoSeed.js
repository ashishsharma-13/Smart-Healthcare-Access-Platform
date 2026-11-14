import {
  User,
  Doctor,
  Organization,
  DoctorAffiliation,
  HealthcareResource,
  Appointment,
  EmergencyCategory,
  EmergencyGuidance,
  EmergencyCapability,
  OrganizationEmergencyCapability,
  EmergencyCategoryCapability,
  EmergencyMatchingConfiguration,
  Notification,
  NotificationDelivery,
  PatientProfile,
  EmergencyContact,
  PatientMedicalCondition,
  PatientAllergy,
  PatientMedication,
  PatientMedicalHistory,
  PatientConsent,
  Feedback,
} from '../models/index.js';
import { healthcareResourceTypeService } from '../services/HealthcareResourceTypeService.js';
import { externalFacilityDirectoryService } from '../services/ExternalFacilityDirectoryService.js';
import { platformConfigurationService } from '../services/PlatformConfigurationService.js';
import { hyderabadHospitalsData } from './hyderabadHospitalsData.js';

export default async function autoSeed() {
  const getOrCreateUser = async (data) => {
    let u = await User.findOne({ email: data.email });
    if (!u) {
      u = await User.create(data);
    } else {
      let needsSave = false;
      if (data.name && u.name !== data.name) {
        u.name = data.name;
        needsSave = true;
      }
      if (data.emergencyContact && JSON.stringify(u.emergencyContact) !== JSON.stringify(data.emergencyContact)) {
        u.emergencyContact = data.emergencyContact;
        needsSave = true;
      }
      if (needsSave) {
        await u.save();
      }
    }
    return u;
  };

  const getOrCreateOrg = async (userId, data) => {
    let org = await Organization.findOne({
      $or: [
        ...(data.registrationNumber ? [{ registrationNumber: data.registrationNumber }] : []),
        ...(data.name ? [{ name: data.name }] : []),
      ],
    });
    if (!org) {
      org = await Organization.create({ ...data, userId });
    }
    return org;
  };

  const getOrCreateDoctor = async (userId, data) => {
    let doc = await Doctor.findOne({
      $or: [
        { userId },
        ...(data.doctorUniqueId ? [{ doctorUniqueId: data.doctorUniqueId }] : []),
        ...(data.licenseNumber ? [{ licenseNumber: data.licenseNumber }] : []),
      ],
    });
    if (!doc) {
      doc = await Doctor.create({ ...data, userId });
    }
    return doc;
  };

  const getOrCreateAffiliation = async (data) => {
    let aff = await DoctorAffiliation.findOne({
      $or: [
        ...(data.affiliationId ? [{ affiliationId: data.affiliationId }] : []),
        { doctorId: data.doctorId, organizationId: data.organizationId },
      ],
    });
    if (!aff) {
      aff = await DoctorAffiliation.create(data);
    }
    return aff;
  };

  const getOrCreateAppointment = async (data) => {
    let apt = await Appointment.findOne({ appointmentNumber: data.appointmentNumber });
    if (!apt) {
      apt = await Appointment.create(data);
    }
    return apt;
  };

  const getOrCreateResource = async (data) => {
    let res = await HealthcareResource.findOne({
      organizationId: data.organizationId,
      resourceType: data.resourceType,
    });
    if (!res) {
      res = await HealthcareResource.create(data);
    }
    return res;
  };

  // Seed default Module 14 Healthcare Resource Types
  await healthcareResourceTypeService.seedInitialTypes();

  // Seed default Module 15 External Healthcare Facilities Directory
  await externalFacilityDirectoryService.seedDefaultExternalFacilities();

  // Seed default Module 16 Platform Configuration Parameters
  await platformConfigurationService.seedDefaultConfigurations();

  // 1. Admin User
  const admin = await getOrCreateUser({
    name: 'SHAP System Administrator',
    email: 'admin@shap.com',
    password: 'password123',
    role: 'admin',
    phone: '+1-555-0100',
  });

  // 2. Patient 1: Aarav Mehta (Test suite baseline)
  const patient = await getOrCreateUser({
    name: 'Aarav Mehta',
    email: 'patient@shap.com',
    password: 'password123',
    role: 'patient',
    phone: '+1-555-0199',
    dateOfBirth: '1988-06-14',
    gender: 'Male',
    bloodGroup: 'O+',
    allergies: ['Penicillin', 'Peanuts'],
    chronicConditions: ['Hypertension'],
    currentMedications: ['Lisinopril 10mg'],
    emergencyContact: {
      name: 'Pooja Mehta',
      relationship: 'Spouse',
      phone: '+1-555-0144',
    },
    medicalNotes: 'Mild exercise-induced asthma in spring. Regular cardio monitoring.',
    address: {
      street: '42 Connaught Place',
      city: 'Central City',
      state: 'State Capital',
      postalCode: '110001',
    },
  });

  // 3. Patient 2: Ananya Iyer (Reference UI patient)
  const jamieUser = await getOrCreateUser({
    name: 'Ananya Iyer',
    email: 'jamie@shap.com',
    password: 'password123',
    role: 'patient',
    phone: '+1-555-0188',
    dateOfBirth: '1990-04-18',
    gender: 'Female',
    bloodGroup: 'A+',
    allergies: ['Penicillin'],
    chronicConditions: ['Mild Asthma'],
    currentMedications: ['Albuterol as needed'],
    emergencyContact: {
      name: 'Karthik Iyer',
      relationship: 'Spouse',
      phone: '+1-555-0189',
    },
    medicalNotes: 'Routine cardiology monitoring and health follow-ups.',
    address: {
      street: '42 Connaught Place',
      city: 'Brookfield',
      state: 'NY',
      postalCode: '10001',
    },
  });

  // Seed Module 18 Patient Profile & Health Records for Aarav Mehta
  const alexProfile = await PatientProfile.findOne({ userId: patient._id });
  if (!alexProfile) {
    await PatientProfile.create({
      userId: patient._id,
      dateOfBirth: '1988-06-14',
      gender: 'Male',
      bloodGroup: 'O+',
      preferredLanguage: 'English',
      heightCm: 178,
      weightKg: 74,
      address: {
        street: '42 Connaught Place',
        city: 'Central City',
        state: 'State Capital',
        postalCode: '110001',
      },
      locationCoordinates: [77.209, 28.613],
      profileCompleteness: 95,
    });
  }

  await EmergencyContact.findOneAndUpdate(
    { userId: patient._id },
    {
      userId: patient._id,
      name: 'Pooja Mehta',
      relationship: 'SPOUSE',
      phone: '+1-555-0144',
      alternatePhone: '+1-555-0145',
      email: 'pooja.mehta@example.com',
      isPrimary: true,
      notes: 'Lives with patient; has emergency keys',
    },
    { upsert: true, new: true }
  );

  const existingCond = await PatientMedicalCondition.findOne({ userId: patient._id });
  if (!existingCond) {
    await PatientMedicalCondition.create({
      userId: patient._id,
      conditionName: 'Hypertension',
      diagnosisDate: new Date('2021-03-15'),
      status: 'MANAGED',
      source: 'PROVIDER_CONFIRMED',
      notes: 'Under regular clinical observation.',
    });

    await PatientAllergy.create({
      userId: patient._id,
      allergyType: 'DRUG',
      substance: 'Penicillin',
      severity: 'SEVERE',
      reaction: 'Urticaria and mild wheezing',
      source: 'PROVIDER_CONFIRMED',
    });

    await PatientAllergy.create({
      userId: patient._id,
      allergyType: 'FOOD',
      substance: 'Peanuts',
      severity: 'LIFE_THREATENING',
      reaction: 'Anaphylaxis',
      source: 'PROVIDER_CONFIRMED',
    });

    await PatientMedication.create({
      userId: patient._id,
      medicationName: 'Lisinopril',
      dosage: '10 mg',
      frequency: 'Once daily morning',
      status: 'ACTIVE',
      source: 'PROVIDER_CONFIRMED',
      prescribedBy: 'Dr. Mira Patel',
    });

    await PatientMedicalHistory.create({
      userId: patient._id,
      category: 'SURGERY',
      title: 'Appendectomy',
      approximateYear: 2015,
      facility: 'City General Hospital',
      source: 'PATIENT_REPORTED',
    });

    await PatientConsent.create({
      userId: patient._id,
      purpose: 'EMERGENCY_COORDINATION',
      status: 'GRANTED',
      policyVersion: '1.0',
    });
    await PatientConsent.create({
      userId: patient._id,
      purpose: 'REGULAR_HEALTHCARE_SHARING',
      status: 'GRANTED',
      policyVersion: '1.0',
    });
    await PatientConsent.create({
      userId: patient._id,
      purpose: 'EMERGENCY_CONTACT_NOTIFICATION',
      status: 'GRANTED',
      policyVersion: '1.0',
    });
  }

  // 4. Test Suite Baseline Organizations
  // Org 1: Apex Metro
  const org1User = await getOrCreateUser({
    name: 'Apex Metro Hospital Staff',
    email: 'apex@hospital.com',
    password: 'password123',
    role: 'organization',
    phone: '+1-555-0111',
  });

  const org1 = await getOrCreateOrg(org1User._id, {
    name: 'Apex Metro Trauma & Heart Hospital',
    orgType: 'hospital',
    registrationNumber: 'HOSP-METRO-0988',
    verificationStatus: 'verified',
    registeredAddress: {
      buildingNumber: 'Plot 100',
      streetName: 'Medical Enclave Road',
      locality: 'Connaught Place',
      landmark: 'Near Metro Gate 4',
      city: 'Central City',
      district: 'Central District',
      state: 'State Capital',
      pinCode: '110001',
      country: 'India',
    },
    operatingAddress: {
      buildingNumber: 'Plot 100',
      streetName: 'Medical Enclave Road',
      locality: 'Connaught Place',
      landmark: 'Near Metro Gate 4',
      city: 'Central City',
      district: 'Central District',
      state: 'State Capital',
      pinCode: '110001',
      country: 'India',
      isSameAsRegistered: true,
    },
    address: {
      street: '100 Medical Enclave Road',
      city: 'Central City',
      state: 'State Capital',
      postalCode: '110001',
    },
    location: {
      type: 'Point',
      coordinates: [77.2150, 28.6200],
    },
    emergencyCapable: true,
    emergencyContactPhone: '+1-800-APEX-911',
    qrCheckinCode: 'ORG-QR-APEX-METRO-2025',
    facilities: ['Trauma Center Level 1', 'Cardiac ICU', 'Cath Lab', '24/7 Stroke Unit', 'Ventilators'],
    rating: 4.9,
    totalReviews: 148,
  });

  await getOrCreateResource({ organizationId: org1._id, resourceType: 'icu_bed', totalCapacity: 20, availableCapacity: 14, reservedCapacity: 0, occupiedCapacity: 6 });
  await getOrCreateResource({ organizationId: org1._id, resourceType: 'er_bay', totalCapacity: 15, availableCapacity: 11, reservedCapacity: 0, occupiedCapacity: 4 });
  await getOrCreateResource({ organizationId: org1._id, resourceType: 'ventilator', totalCapacity: 10, availableCapacity: 8, reservedCapacity: 0, occupiedCapacity: 2 });

  // Org 2: St. Jude
  const org2User = await getOrCreateUser({
    name: 'St Jude Operations',
    email: 'stjude@hospital.com',
    password: 'password123',
    role: 'organization',
    phone: '+1-555-0222',
  });

  const org2 = await getOrCreateOrg(org2User._id, {
    name: 'St. Jude Emergency Center',
    orgType: 'hospital',
    registrationNumber: 'HOSP-STJUDE-1102',
    verificationStatus: 'verified',
    registeredAddress: {
      buildingNumber: '75',
      streetName: 'South Avenue Parkway',
      locality: 'South Enclave',
      landmark: 'Opposite Civic Gardens',
      city: 'Central City',
      district: 'South District',
      state: 'State Capital',
      pinCode: '110003',
      country: 'India',
    },
    operatingAddress: {
      buildingNumber: '75',
      streetName: 'South Avenue Parkway',
      locality: 'South Enclave',
      landmark: 'Opposite Civic Gardens',
      city: 'Central City',
      district: 'South District',
      state: 'State Capital',
      pinCode: '110003',
      country: 'India',
      isSameAsRegistered: true,
    },
    address: {
      street: '75 South Avenue Parkway',
      city: 'Central City',
      state: 'State Capital',
      postalCode: '110003',
    },
    location: {
      type: 'Point',
      coordinates: [77.2280, 28.6080],
    },
    emergencyCapable: true,
    emergencyContactPhone: '+1-800-STJUDE-99',
    qrCheckinCode: 'ORG-QR-STJUDE-2025',
    facilities: ['24/7 Emergency Care', 'Pediatric ICU', 'Trauma Resuscitation', 'Blood Bank'],
    rating: 4.8,
    totalReviews: 92,
  });

  await getOrCreateResource({ organizationId: org2._id, resourceType: 'icu_bed', totalCapacity: 12, availableCapacity: 7, reservedCapacity: 0, occupiedCapacity: 5 });
  await getOrCreateResource({ organizationId: org2._id, resourceType: 'er_bay', totalCapacity: 18, availableCapacity: 14, reservedCapacity: 0, occupiedCapacity: 4 });
  await getOrCreateResource({ organizationId: org2._id, resourceType: 'ventilator', totalCapacity: 8, availableCapacity: 5, reservedCapacity: 0, occupiedCapacity: 3 });

  // Org 3: City Care
  const org3User = await getOrCreateUser({
    name: 'City Care Clinic',
    email: 'citycare@clinic.com',
    password: 'password123',
    role: 'organization',
    phone: '+1-555-0333',
  });

  const org3 = await getOrCreateOrg(org3User._id, {
    name: 'City Care Specialist Clinic',
    orgType: 'clinic',
    registrationNumber: 'CLINIC-CC-4411',
    verificationStatus: 'verified',
    address: {
      street: '12 Market Boulevard',
      city: 'Central City',
      state: 'State Capital',
      postalCode: '110005',
    },
    location: {
      type: 'Point',
      coordinates: [77.2000, 28.6250],
    },
    emergencyCapable: false,
    emergencyContactPhone: '+1-555-0334',
    qrCheckinCode: 'ORG-QR-CITYCARE-2025',
    facilities: ['Outpatient Care', 'Diagnostics', 'Pharmacy', 'Consultation'],
    rating: 4.6,
    totalReviews: 64,
  });

  // Org 4: Pending Org
  const orgPendingUser = await getOrCreateUser({
    name: 'North District Memorial',
    email: 'northdistrict@hospital.com',
    password: 'password123',
    role: 'organization',
    phone: '+1-555-0444',
  });

  await getOrCreateOrg(orgPendingUser._id, {
    name: 'North District Memorial Hospital',
    orgType: 'hospital',
    registrationNumber: 'REG-PENDING-7729',
    verificationStatus: 'pending',
    address: {
      street: '90 North Ring Road',
      city: 'North Suburb',
      state: 'State Capital',
      postalCode: '110009',
    },
    location: {
      type: 'Point',
      coordinates: [77.1950, 28.6450],
    },
    emergencyCapable: true,
    emergencyContactPhone: '+1-555-0445',
    qrCheckinCode: 'ORG-QR-NORTH-2025',
    facilities: ['Emergency Bay', 'General Surgery'],
  });

  // 5. Reference Design Hospitals (Riverside, Lakeside, Northside, Cedar)
  // Riverside Medical Center
  const riversideUser = await getOrCreateUser({
    name: 'Riverside Medical Center Staff',
    email: 'riverside@hospital.com',
    password: 'password123',
    role: 'organization',
    phone: '+1 800-RIVERSIDE',
  });

  const riversideOrg = await getOrCreateOrg(riversideUser._id, {
    name: 'Riverside Medical Center',
    orgType: 'hospital',
    registrationNumber: 'HOSP-RIVERSIDE-2041',
    verificationStatus: 'verified',
    address: {
      street: '120 River Avenue',
      city: 'Brookfield',
      state: 'NY',
      postalCode: '10001',
    },
    location: {
      type: 'Point',
      coordinates: [77.2180, 28.6180],
    },
    emergencyCapable: true,
    emergencyContactPhone: '+1 800-RIVERSIDE',
    qrCheckinCode: 'ORG-QR-RIVERSIDE-2026',
    facilities: ['24/7 emergency', 'Cardiology', 'Oxygen', 'Level 1 Trauma', 'Cardiac ICU', 'Cath Lab'],
    rating: 4.9,
    totalReviews: 210,
  });

  await getOrCreateResource({ organizationId: riversideOrg._id, resourceType: 'icu_bed', totalCapacity: 15, availableCapacity: 2, reservedCapacity: 0, occupiedCapacity: 13 });
  await getOrCreateResource({ organizationId: riversideOrg._id, resourceType: 'er_bay', totalCapacity: 12, availableCapacity: 5, reservedCapacity: 0, occupiedCapacity: 7 });
  await getOrCreateResource({ organizationId: riversideOrg._id, resourceType: 'ventilator', totalCapacity: 8, availableCapacity: 4, reservedCapacity: 0, occupiedCapacity: 4 });

  // Lakeside Specialty Clinic
  const lakesideUser = await getOrCreateUser({
    name: 'Lakeside Specialty Clinic Staff',
    email: 'lakeside@hospital.com',
    password: 'password123',
    role: 'organization',
    phone: '+1 800-LAKESIDE',
  });

  const lakesideOrg = await getOrCreateOrg(lakesideUser._id, {
    name: 'Lakeside Specialty Clinic',
    orgType: 'clinic',
    registrationNumber: 'CLINIC-LAKESIDE-3022',
    verificationStatus: 'verified',
    address: {
      street: '86 Lake Road',
      city: 'Brookfield',
      state: 'NY',
      postalCode: '10002',
    },
    location: {
      type: 'Point',
      coordinates: [77.2250, 28.6120],
    },
    emergencyCapable: true,
    emergencyContactPhone: '+1 800-LAKESIDE',
    qrCheckinCode: 'ORG-QR-LAKESIDE-2026',
    facilities: ['Cardiology', 'Diagnostic services', 'Monitoring', 'Specialty Outpatient'],
    rating: 4.8,
    totalReviews: 88,
  });

  await getOrCreateResource({ organizationId: lakesideOrg._id, resourceType: 'icu_bed', totalCapacity: 8, availableCapacity: 4, reservedCapacity: 0, occupiedCapacity: 4 });
  await getOrCreateResource({ organizationId: lakesideOrg._id, resourceType: 'er_bay', totalCapacity: 6, availableCapacity: 3, reservedCapacity: 0, occupiedCapacity: 3 });

  // Northside General Hospital
  const northsideUser = await getOrCreateUser({
    name: 'Northside General Hospital Staff',
    email: 'northside@hospital.com',
    password: 'password123',
    role: 'organization',
    phone: '+1 800-NORTHSIDE',
  });

  const northsideOrg = await getOrCreateOrg(northsideUser._id, {
    name: 'Northside General Hospital',
    orgType: 'hospital',
    registrationNumber: 'HOSP-NORTHSIDE-4011',
    verificationStatus: 'verified',
    address: {
      street: '45 North Street',
      city: 'Brookfield',
      state: 'NY',
      postalCode: '10003',
    },
    location: {
      type: 'Point',
      coordinates: [77.2100, 28.6280],
    },
    emergencyCapable: true,
    emergencyContactPhone: '+1 800-NORTHSIDE',
    qrCheckinCode: 'ORG-QR-NORTHSIDE-2026',
    facilities: ['24/7 emergency', 'Cardiology', 'Imaging', 'General ICU', 'Radiology Suite'],
    rating: 4.7,
    totalReviews: 135,
  });

  await getOrCreateResource({ organizationId: northsideOrg._id, resourceType: 'icu_bed', totalCapacity: 20, availableCapacity: 3, reservedCapacity: 0, occupiedCapacity: 17 });
  await getOrCreateResource({ organizationId: northsideOrg._id, resourceType: 'er_bay', totalCapacity: 10, availableCapacity: 4, reservedCapacity: 0, occupiedCapacity: 6 });

  // Cedar Community Clinic
  const cedarUser = await getOrCreateUser({
    name: 'Cedar Community Care',
    email: 'cedar@hospital.com',
    password: 'password123',
    role: 'organization',
    phone: '+1 800-CEDAR',
  });

  const cedarOrg = await getOrCreateOrg(cedarUser._id, {
    name: 'Cedar Community Clinic',
    orgType: 'clinic',
    registrationNumber: 'CLINIC-CEDAR-1005',
    verificationStatus: 'verified',
    address: {
      street: '50 Pine Way',
      city: 'Brookfield',
      state: 'NY',
      postalCode: '10004',
    },
    location: {
      type: 'Point',
      coordinates: [77.2020, 28.6210],
    },
    emergencyCapable: false,
    emergencyContactPhone: '+1 800-CEDAR',
    qrCheckinCode: 'ORG-QR-CEDAR-2026',
    facilities: ['Primary Care', 'Family Medicine', 'Outpatient Pharmacy'],
    rating: 4.6,
    totalReviews: 45,
  });

  // 5b. Accredited Hyderabad Hospitals around User Location (University of Hyderabad / Gachibowli)
  const hydOrgs = [];
  for (const item of hyderabadHospitalsData) {
    const orgUser = await getOrCreateUser(item.user);
    const org = await getOrCreateOrg(orgUser._id, item.org);
    if (org) {
      org.location = item.org.location;
      org.operatingAddress = item.org.operatingAddress;
      org.registeredAddress = item.org.registeredAddress;
      org.address = item.org.address;
      org.facilities = item.org.facilities;
      org.specializations = item.org.specializations;
      org.healthcareCapabilities = item.org.healthcareCapabilities;
      org.emergencyCapable = item.org.emergencyCapable;
      org.emergencyContactPhone = item.org.emergencyContactPhone;
      org.verificationStatus = 'verified';
      await org.save();
      hydOrgs.push(org);

      for (const res of item.resources) {
        await getOrCreateResource({
          organizationId: org._id,
          ...res,
        });
      }
    }
  }

  // 6. Test Suite Baseline Doctors
  // Doctor 1: Sneha Sen
  const doc1User = await getOrCreateUser({
    name: 'Dr. Sneha Sen',
    email: 'sarah.jenkins@shap.com',
    password: 'password123',
    role: 'doctor',
    phone: '+1-555-0801',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&auto=format&fit=crop&q=80',
  });

  const doc1 = await getOrCreateDoctor(doc1User._id, {
    doctorUniqueId: 'DOC-10024',
    specialization: 'Cardiology',
    qualifications: ['MBBS', 'MD - Cardiology', 'FACC'],
    experienceYears: 14,
    licenseNumber: 'MED-REG-88219',
    verificationStatus: 'verified',
    verifiedAt: new Date(),
    verifiedBy: admin._id,
    qrCredentialToken: 'SEC-DOC-TOKEN-SEN-10024',
    consultationFee: 750,
    bio: 'Senior Consultant Cardiologist specializing in interventional cardiology, acute coronary syndrome, and heart failure management.',
    rating: 4.9,
    totalReviews: 86,
    isAvailableForAppointments: true,
    isAvailableForEmergency: true,
    currentPresence: {
      isPresent: true,
      organizationId: org1._id,
      checkedInAt: new Date(),
    },
  });

  // Doctor 2: Vikram Malhotra
  const doc2User = await getOrCreateUser({
    name: 'Dr. Vikram Malhotra',
    email: 'marcus.chen@shap.com',
    password: 'password123',
    role: 'doctor',
    phone: '+1-555-0802',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80',
  });

  const doc2 = await getOrCreateDoctor(doc2User._id, {
    doctorUniqueId: 'DOC-20412',
    specialization: 'Emergency Medicine',
    qualifications: ['MBBS', 'MD - Emergency Medicine', 'FACEP'],
    experienceYears: 11,
    licenseNumber: 'MED-REG-99104',
    verificationStatus: 'verified',
    verifiedAt: new Date(),
    verifiedBy: admin._id,
    qrCredentialToken: 'SEC-DOC-TOKEN-MALHOTRA-20412',
    consultationFee: 600,
    bio: 'Lead Trauma and Resuscitation specialist with expertise in multi-organ trauma, emergency stroke protocols, and critical airway management.',
    rating: 4.8,
    totalReviews: 104,
    isAvailableForAppointments: true,
    isAvailableForEmergency: true,
    currentPresence: {
      isPresent: true,
      organizationId: org2._id,
      checkedInAt: new Date(),
    },
  });

  // Doctor 3: Ananya Sen
  const doc3User = await getOrCreateUser({
    name: 'Dr. Ananya Sen',
    email: 'emily.rodriguez@shap.com',
    password: 'password123',
    role: 'doctor',
    phone: '+1-555-0803',
    avatar: 'https://images.unsplash.com/photo-1594824813572-c5139c82c219?w=300&auto=format&fit=crop&q=80',
  });

  const doc3 = await getOrCreateDoctor(doc3User._id, {
    doctorUniqueId: 'DOC-30119',
    specialization: 'Pediatrics',
    qualifications: ['MBBS', 'MD - Pediatrics'],
    experienceYears: 9,
    licenseNumber: 'MED-REG-55120',
    verificationStatus: 'verified',
    verifiedAt: new Date(),
    verifiedBy: admin._id,
    qrCredentialToken: 'SEC-DOC-TOKEN-SEN-30119',
    consultationFee: 500,
    bio: 'Pediatrician focused on infant critical care, pediatric infectious diseases, and developmental monitoring.',
    rating: 4.9,
    totalReviews: 42,
    isAvailableForAppointments: true,
    isAvailableForEmergency: false,
    currentPresence: {
      isPresent: false,
      organizationId: null,
      checkedInAt: null,
    },
  });

  // Doctor 4: Alok Verma (Pending)
  const doc4User = await getOrCreateUser({
    name: 'Dr. Alok Verma',
    email: 'michael.vance@shap.com',
    password: 'password123',
    role: 'doctor',
    phone: '+1-555-0804',
  });

  await getOrCreateDoctor(doc4User._id, {
    specialization: 'Neurology',
    qualifications: ['MBBS', 'DM - Neurology'],
    experienceYears: 6,
    licenseNumber: 'MED-REG-PENDING-1234',
    licenseDocumentUrl: 'https://example.com/docs/medical_license_vance.pdf',
    verificationStatus: 'pending',
    consultationFee: 800,
    bio: 'Neurologist with focus on stroke prevention, epilepsy, and neuro-critical recovery.',
  });

  // 7. Reference Design Specialists (Dr. Mira Patel, Dr. Devendra Sharma, Dr. Kavita Reddy, Dr. Siddharth Rao)
  // Dr. Mira Patel
  const docMiraUser = await getOrCreateUser({
    name: 'Dr. Mira Patel',
    email: 'mira.patel@shap.com',
    password: 'password123',
    role: 'doctor',
    phone: '+1 (555) 234-5678',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&auto=format&fit=crop&q=80',
  });

  const docMira = await getOrCreateDoctor(docMiraUser._id, {
    doctorUniqueId: 'DOC-MP-1209',
    specialization: 'Cardiology',
    qualifications: ['MD', 'Internal Medicine', 'FACC'],
    experienceYears: 12,
    licenseNumber: 'NMC-2014-99821',
    verificationStatus: 'verified',
    verifiedAt: new Date(),
    verifiedBy: admin._id,
    qrCredentialToken: 'SEC-DOC-TOKEN-PATEL-1209',
    consultationFee: 85,
    bio: 'Dr. Patel sees adults for cardiovascular consultations, preventive care and ongoing heart-health follow-ups. Her approach emphasizes clear explanations and shared care planning.',
    workingHours: 'Mon–Fri · 9:00 AM–4:00 PM',
    rating: 4.9,
    totalReviews: 128,
    isAvailableForAppointments: true,
    isAvailableForEmergency: true,
    languages: ['English', 'Hindi'],
    currentPresence: {
      isPresent: true,
      organizationId: riversideOrg._id,
      checkedInAt: new Date(),
    },
  });

  // Dr. Devendra Sharma
  const docDanielUser = await getOrCreateUser({
    name: 'Dr. Devendra Sharma',
    email: 'daniel.brooks@shap.com',
    password: 'password123',
    role: 'doctor',
    phone: '+1 (555) 345-6789',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80',
  });

  const docDaniel = await getOrCreateDoctor(docDanielUser._id, {
    doctorUniqueId: 'DOC-DB-1510',
    specialization: 'Cardiology',
    qualifications: ['MD', 'Cardiovascular Disease', 'FACS'],
    experienceYears: 15,
    licenseNumber: 'NMC-2011-88421',
    verificationStatus: 'verified',
    verifiedAt: new Date(),
    verifiedBy: admin._id,
    qrCredentialToken: 'SEC-DOC-TOKEN-SHARMA-1510',
    consultationFee: 95,
    bio: 'Specialist in non-invasive cardiac imaging, preventive cardiovascular therapy, and complex arrhythmia monitoring.',
    workingHours: 'Mon–Fri · 8:30 AM–4:30 PM',
    rating: 4.9,
    totalReviews: 96,
    isAvailableForAppointments: true,
    isAvailableForEmergency: true,
    languages: ['English', 'Hindi'],
    currentPresence: {
      isPresent: true,
      organizationId: northsideOrg._id,
      checkedInAt: new Date(),
    },
  });

  // Dr. Kavita Reddy
  const docSofiaUser = await getOrCreateUser({
    name: 'Dr. Kavita Reddy',
    email: 'sofia.chen@shap.com',
    password: 'password123',
    role: 'doctor',
    phone: '+1 (555) 456-7890',
    avatar: 'https://images.unsplash.com/photo-1594824813572-c5139c82c219?w=300&auto=format&fit=crop&q=80',
  });

  const docSofia = await getOrCreateDoctor(docSofiaUser._id, {
    doctorUniqueId: 'DOC-SC-9081',
    specialization: 'Cardiology',
    qualifications: ['MD', 'Cardiology'],
    experienceYears: 9,
    licenseNumber: 'NMC-2017-77291',
    verificationStatus: 'verified',
    verifiedAt: new Date(),
    verifiedBy: admin._id,
    qrCredentialToken: 'SEC-DOC-TOKEN-REDDY-9081',
    consultationFee: 80,
    bio: 'Cardiologist focused on early detection, arterial health, and integrative heart care therapies.',
    workingHours: 'Mon–Fri · 9:00 AM–5:00 PM',
    rating: 4.8,
    totalReviews: 74,
    isAvailableForAppointments: true,
    isAvailableForEmergency: true,
    languages: ['English', 'Hindi'],
    currentPresence: {
      isPresent: true,
      organizationId: lakesideOrg._id,
      checkedInAt: new Date(),
    },
  });

  // Dr. Siddharth Rao
  const docEthanUser = await getOrCreateUser({
    name: 'Dr. Siddharth Rao',
    email: 'ethan.ross@shap.com',
    password: 'password123',
    role: 'doctor',
    phone: '+1 (555) 567-8901',
  });

  const docEthan = await getOrCreateDoctor(docEthanUser._id, {
    doctorUniqueId: 'DOC-ER-1002',
    specialization: 'Primary care',
    qualifications: ['MD', 'Family Medicine'],
    experienceYears: 10,
    licenseNumber: 'NMC-2016-66410',
    verificationStatus: 'verified',
    verifiedAt: new Date(),
    verifiedBy: admin._id,
    qrCredentialToken: 'SEC-DOC-TOKEN-RAO-1002',
    consultationFee: 70,
    bio: 'Family medicine physician providing comprehensive preventative care and chronic disease management.',
    workingHours: 'Mon–Fri · 9:00 AM–4:00 PM',
    rating: 4.7,
    totalReviews: 62,
    isAvailableForAppointments: true,
    isAvailableForEmergency: false,
    languages: ['English'],
    currentPresence: {
      isPresent: true,
      organizationId: cedarOrg._id,
      checkedInAt: new Date(),
    },
  });

  // 8. Doctor Affiliations
  await getOrCreateAffiliation({
    affiliationId: 'AFF-SEN-APEX-01',
    doctorId: doc1._id,
    organizationId: org1._id,
    status: 'ACTIVE',
    department: 'Cardiology',
    initiatedBy: 'doctor',
    doctorAcceptance: { status: 'accepted', respondedAt: new Date() },
    organizationApproval: { status: 'approved', reviewedAt: new Date(), reviewedBy: org1User._id },
  });

  await getOrCreateAffiliation({
    affiliationId: 'AFF-SEN-LIFELINE-02',
    doctorId: doc1._id,
    organizationId: org3._id,
    status: 'ACTIVE',
    department: 'Cardiology',
    initiatedBy: 'doctor',
    doctorAcceptance: { status: 'accepted', respondedAt: new Date() },
    organizationApproval: { status: 'approved', reviewedAt: new Date(), reviewedBy: org3User._id },
  });

  await getOrCreateAffiliation({
    affiliationId: 'AFF-CHEN-STJUDE-01',
    doctorId: doc2._id,
    organizationId: org2._id,
    status: 'ACTIVE',
    department: 'Emergency & Trauma',
    initiatedBy: 'organization',
    doctorAcceptance: { status: 'accepted', respondedAt: new Date() },
    organizationApproval: { status: 'approved', reviewedAt: new Date(), reviewedBy: org2User._id },
  });

  await getOrCreateAffiliation({
    affiliationId: 'AFF-RODRIGUEZ-APEX-01',
    doctorId: doc3._id,
    organizationId: org1._id,
    status: 'ACTIVE',
    department: 'Pediatrics',
    initiatedBy: 'doctor',
    doctorAcceptance: { status: 'accepted', respondedAt: new Date() },
    organizationApproval: { status: 'approved', reviewedAt: new Date(), reviewedBy: org1User._id },
  });

  await getOrCreateAffiliation({
    affiliationId: 'AFF-PATEL-RIVERSIDE-01',
    doctorId: docMira._id,
    organizationId: riversideOrg._id,
    status: 'ACTIVE',
    department: 'Cardiology',
    initiatedBy: 'doctor',
    doctorAcceptance: { status: 'accepted', respondedAt: new Date() },
    organizationApproval: { status: 'approved', reviewedAt: new Date(), reviewedBy: riversideUser._id },
  });

  await getOrCreateAffiliation({
    affiliationId: 'AFF-BROOKS-NORTHSIDE-01',
    doctorId: docDaniel._id,
    organizationId: northsideOrg._id,
    status: 'ACTIVE',
    department: 'Cardiology',
    initiatedBy: 'doctor',
    doctorAcceptance: { status: 'accepted', respondedAt: new Date() },
    organizationApproval: { status: 'approved', reviewedAt: new Date(), reviewedBy: northsideUser._id },
  });

  await getOrCreateAffiliation({
    affiliationId: 'AFF-CHEN-LAKESIDE-01',
    doctorId: docSofia._id,
    organizationId: lakesideOrg._id,
    status: 'ACTIVE',
    department: 'Cardiology',
    initiatedBy: 'doctor',
    doctorAcceptance: { status: 'accepted', respondedAt: new Date() },
    organizationApproval: { status: 'approved', reviewedAt: new Date(), reviewedBy: lakesideUser._id },
  });

  await getOrCreateAffiliation({
    affiliationId: 'AFF-ROSS-CEDAR-01',
    doctorId: docEthan._id,
    organizationId: cedarOrg._id,
    status: 'ACTIVE',
    department: 'Primary care',
    initiatedBy: 'doctor',
    doctorAcceptance: { status: 'accepted', respondedAt: new Date() },
    organizationApproval: { status: 'approved', reviewedAt: new Date(), reviewedBy: cedarUser._id },
  });

  // Doctor Affiliations with Hyderabad Hospitals
  if (hydOrgs && hydOrgs.length > 0) {
    const hydDocs = [doc1, doc2, doc3, docMira, docDaniel, docSofia, docEthan].filter(Boolean);
    for (let i = 0; i < Math.min(hydDocs.length, hydOrgs.length); i++) {
      const d = hydDocs[i];
      const o = hydOrgs[i];
      await getOrCreateAffiliation({
        affiliationId: `AFF-HYD-${d.doctorUniqueId || i}-${o.registrationNumber}`,
        doctorId: d._id,
        organizationId: o._id,
        status: 'ACTIVE',
        department: d.specialization || 'General Medicine',
        designation: 'Senior Consultant',
        affiliationType: 'VISITING',
        canAdmitPatients: true,
        consultationFee: d.consultationFee || 600,
        initiatedBy: 'doctor',
        doctorAcceptance: { status: 'accepted', respondedAt: new Date() },
        organizationApproval: { status: 'approved', reviewedAt: new Date() },
      });
    }
  }

  // 9. Appointments
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  await getOrCreateAppointment({
    appointmentNumber: 'APT-SEN-001',
    patientId: patient._id,
    doctorId: doc1._id,
    organizationId: org1._id,
    slotDate: tomorrowStr,
    slotTime: '10:00 AM',
    status: 'booked',
    patientNotes: 'Annual cardiovascular checkup and ECG review',
    qrToken: 'APT-TOKEN-PASS-9901',
  });

  // Featured Upcoming Appointment #AP-2041 with Dr. Mira Patel
  await getOrCreateAppointment({
    appointmentNumber: '#AP-2041',
    patientId: patient._id,
    doctorId: docMira._id,
    organizationId: riversideOrg._id,
    slotDate: 'Tue, 10 Nov 2026',
    slotTime: '10:30–11:00 AM',
    status: 'booked',
    patientNotes: 'Heart-health follow-up',
    fee: '$85 · Pay at clinic',
    qrToken: 'APT-TOKEN-PASS-2041',
  });

  // Also link an appointment for Jamie
  await getOrCreateAppointment({
    appointmentNumber: '#AP-2041-JAMIE',
    patientId: jamieUser._id,
    doctorId: docMira._id,
    organizationId: riversideOrg._id,
    slotDate: 'Tue, 10 Nov 2026',
    slotTime: '11:30–12:00 PM',
    status: 'booked',
    patientNotes: 'Heart-health follow-up',
    fee: '$85 · Pay at clinic',
    qrToken: 'APT-TOKEN-PASS-2041-JAMIE',
  });

  // Past completed appointments matching reference design
  await getOrCreateAppointment({
    appointmentNumber: '#AP-1980',
    patientId: patient._id,
    doctorId: docSofia._id,
    organizationId: lakesideOrg._id,
    slotDate: '28 Oct 2026',
    slotTime: '11:00 AM',
    status: 'completed',
    patientNotes: 'Routine ECG screening',
    qrToken: 'APT-TOKEN-PASS-1980',
  });

  await getOrCreateAppointment({
    appointmentNumber: '#AP-1844',
    patientId: patient._id,
    doctorId: docEthan._id,
    organizationId: cedarOrg._id,
    slotDate: '14 Sep 2026',
    slotTime: '09:30 AM',
    status: 'completed',
    patientNotes: 'Annual general wellness checkup',
    qrToken: 'APT-TOKEN-PASS-1844',
  });

  await getOrCreateAppointment({
    appointmentNumber: '#AP-1720',
    patientId: patient._id,
    doctorId: docMira._id,
    organizationId: riversideOrg._id,
    slotDate: '03 Aug 2026',
    slotTime: '02:00 PM',
    status: 'completed',
    patientNotes: 'Initial cardiovascular evaluation',
    qrToken: 'APT-TOKEN-PASS-1720',
  });

  // Doctor Daily Schedule for Dr. Mira Patel
  await getOrCreateAppointment({
    appointmentNumber: '#AP-ROHAN-01',
    patientId: patient._id,
    doctorId: docMira._id,
    organizationId: riversideOrg._id,
    slotDate: tomorrowStr,
    slotTime: '1:30 PM',
    status: 'completed',
    patientNotes: 'Rohan Sharma · Follow-up',
    qrToken: 'APT-TOKEN-ROHAN-01',
  });

  await getOrCreateAppointment({
    appointmentNumber: '#AP-AARAV-02',
    patientId: jamieUser._id,
    doctorId: docMira._id,
    organizationId: riversideOrg._id,
    slotDate: tomorrowStr,
    slotTime: '2:30 PM',
    status: 'booked',
    patientNotes: 'Aarav Mehta · Initial consultation (Heart-health review)',
    qrToken: 'APT-TOKEN-AARAV-02',
  });

  await getOrCreateAppointment({
    appointmentNumber: '#AP-MEERA-03',
    patientId: patient._id,
    doctorId: docMira._id,
    organizationId: riversideOrg._id,
    slotDate: tomorrowStr,
    slotTime: '3:00 PM',
    status: 'booked',
    patientNotes: 'Meera Nair · Heart-health follow-up',
    qrToken: 'APT-TOKEN-MEERA-03',
  });

  await getOrCreateAppointment({
    appointmentNumber: '#AP-SIDDHARTH-04',
    patientId: jamieUser._id,
    doctorId: docMira._id,
    organizationId: riversideOrg._id,
    slotDate: tomorrowStr,
    slotTime: '3:30 PM',
    status: 'booked',
    patientNotes: 'Siddharth Verma · Follow-up',
    qrToken: 'APT-TOKEN-SIDDHARTH-04',
  });

  // Seed verified patient reviews for completed consultations
  const getOrCreateFeedback = async (filter, data) => {
    let fb = await Feedback.findOne(filter);
    if (!fb) {
      fb = await Feedback.create(data);
    }
    return fb;
  };

  const aptKavita = await Appointment.findOne({ appointmentNumber: '#AP-1980' });
  if (aptKavita) {
    await getOrCreateFeedback(
      { appointmentId: aptKavita._id },
      {
        patientId: patient._id,
        feedbackType: 'APPOINTMENT',
        appointmentId: aptKavita._id,
        doctorId: docSofia._id,
        organizationId: lakesideOrg._id,
        rating: 5,
        careQualityRating: 5,
        waitTimeRating: 5,
        staffBehaviorRating: 5,
        cleanlinessRating: 5,
        comments: 'Dr. Kavita Reddy took time to perform an in-depth ECG analysis and gave very clear dietary guidance. Excellent cardiologist.',
        tags: ['Clear communication', 'Thorough diagnosis', 'Polite staff'],
        isAnonymous: false,
        status: 'SUBMITTED',
      }
    );
  }

  const aptSiddharth = await Appointment.findOne({ appointmentNumber: '#AP-1844' });
  if (aptSiddharth) {
    await getOrCreateFeedback(
      { appointmentId: aptSiddharth._id },
      {
        patientId: patient._id,
        feedbackType: 'APPOINTMENT',
        appointmentId: aptSiddharth._id,
        doctorId: docEthan._id,
        organizationId: cedarOrg._id,
        rating: 5,
        careQualityRating: 5,
        waitTimeRating: 4,
        staffBehaviorRating: 5,
        cleanlinessRating: 5,
        comments: 'Dr. Siddharth Rao is very patient, attentive, and detailed with preventative checkups. Highly recommend him for family care.',
        tags: ['Attentive care', 'Helpful advice', 'Short wait time'],
        isAnonymous: false,
        status: 'SUBMITTED',
      }
    );
  }

  const aptMira1 = await Appointment.findOne({ appointmentNumber: '#AP-1720' });
  if (aptMira1) {
    await getOrCreateFeedback(
      { appointmentId: aptMira1._id },
      {
        patientId: patient._id,
        feedbackType: 'APPOINTMENT',
        appointmentId: aptMira1._id,
        doctorId: docMira._id,
        organizationId: riversideOrg._id,
        rating: 5,
        careQualityRating: 5,
        waitTimeRating: 5,
        staffBehaviorRating: 5,
        cleanlinessRating: 5,
        comments: 'Dr. Mira Patel was phenomenal. Thorough heart-health assessment and clear instructions on daily cardiac wellness.',
        tags: ['Thorough diagnosis', 'Clear communication', 'Caring doctor'],
        isAnonymous: false,
        status: 'SUBMITTED',
      }
    );
  }

  const aptMira2 = await Appointment.findOne({ appointmentNumber: '#AP-ROHAN-01' });
  if (aptMira2) {
    await getOrCreateFeedback(
      { appointmentId: aptMira2._id },
      {
        patientId: patient._id,
        feedbackType: 'APPOINTMENT',
        appointmentId: aptMira2._id,
        doctorId: docMira._id,
        organizationId: riversideOrg._id,
        rating: 5,
        careQualityRating: 5,
        waitTimeRating: 4,
        staffBehaviorRating: 5,
        cleanlinessRating: 5,
        comments: 'Follow-up consultation went smoothly. Doctor answered all questions regarding my blood pressure and medication.',
        tags: ['Short wait time', 'Attentive care'],
        isAnonymous: false,
        status: 'SUBMITTED',
      }
    );
  }

  // Also seed initial feedbacks for Dr. Sneha Sen and Dr. Devendra Sharma
  const snehaFb = await Feedback.findOne({ doctorId: doc1._id });
  if (!snehaFb) {
    await Feedback.create({
      patientId: patient._id,
      feedbackType: 'APPOINTMENT',
      doctorId: doc1._id,
      organizationId: org1._id,
      rating: 5,
      careQualityRating: 5,
      waitTimeRating: 5,
      staffBehaviorRating: 5,
      cleanlinessRating: 5,
      comments: 'Dr. Sneha Sen provides outstanding cardiology care and rapid diagnosis at Citizens Specialty Hospital.',
      tags: ['Thorough diagnosis', 'Highly recommended'],
      isAnonymous: false,
      status: 'SUBMITTED',
    });
  }

  const devendraFb = await Feedback.findOne({ doctorId: docDaniel._id });
  if (!devendraFb) {
    await Feedback.create({
      patientId: patient._id,
      feedbackType: 'APPOINTMENT',
      doctorId: docDaniel._id,
      organizationId: northsideOrg._id,
      rating: 5,
      careQualityRating: 5,
      waitTimeRating: 4,
      staffBehaviorRating: 5,
      cleanlinessRating: 5,
      comments: 'Excellent consultation with Dr. Devendra Sharma. Deep expertise in cardiovascular medicine and preventative guidance.',
      tags: ['Expert knowledge', 'Polite staff'],
      isAnonymous: false,
      status: 'SUBMITTED',
    });
  }

  // Module 8: Emergency Categories & Guidance
  const seedCategories = [
    {
      categoryId: 'CAT-CARDIAC',
      categoryName: 'Cardiac',
      slug: 'cardiac',
      description: 'Severe chest pain, tightness radiating to arm or jaw, suspected myocardial infarction',
      displayOrder: 1,
      icon: 'HeartPulse',
      active: true,
      guidance: {
        title: 'Cardiac Emergency First-Aid Protocol',
        content: '1. Have the patient sit down, rest, and try to stay calm.\n2. Loosen any tight clothing around the neck and chest.\n3. If the patient has prescribed nitroglycerin, assist them in taking it.\n4. Administer chewable aspirin (160-325 mg) if the patient is conscious and not allergic.\n5. If patient becomes unresponsive and stops breathing normally, begin CPR immediately (100-120 chest compressions per minute).\n6. Do not leave the patient unattended.',
      },
    },
    {
      categoryId: 'CAT-STROKE',
      categoryName: 'Stroke',
      slug: 'stroke',
      description: 'Facial drooping, arm drift, slurred speech, sudden loss of balance or consciousness',
      displayOrder: 2,
      icon: 'Brain',
      active: true,
      guidance: {
        title: 'Stroke (FAST Protocol) First-Aid Guidelines',
        content: '1. Check FAST: Face drooping, Arm weakness, Speech difficulty, Time to call.\n2. Note the exact time when symptoms first appeared (crucial for thrombolytic window).\n3. Keep the patient in a safe, comfortable recovery position on their side if conscious.\n4. Do NOT give food, water, or medication (including aspirin, as stroke could be hemorrhagic).\n5. Keep airway clear and monitor breathing continuously.',
      },
    },
    {
      categoryId: 'CAT-TRAUMA',
      categoryName: 'Accident/Trauma',
      slug: 'trauma',
      description: 'Motor vehicle collision, blunt trauma, severe laceration, active arterial bleeding',
      displayOrder: 3,
      icon: 'Activity',
      active: true,
      guidance: {
        title: 'Severe Trauma and Hemorrhage Management',
        content: '1. Ensure scene safety before approaching.\n2. Apply continuous firm direct pressure on active bleeding wounds using a sterile cloth or clean fabric.\n3. Do NOT move the victim if spinal, neck, or head injury is suspected unless in immediate environmental danger.\n4. Keep patient warm with blankets to prevent hypothermia and clinical shock.\n5. Do not remove penetrating objects embedded in the body.',
      },
    },
    {
      categoryId: 'CAT-PREGNANCY',
      categoryName: 'Pregnancy-related',
      slug: 'pregnancy',
      description: 'Active precipitous labor, heavy vaginal bleeding, preeclampsia symptoms or severe pelvic pain',
      displayOrder: 4,
      icon: 'Baby',
      active: true,
      guidance: {
        title: 'Obstetric Emergency Guidance',
        content: '1. Position the mother lying on her left side to maximize placental blood flow and relieve vena cava compression.\n2. If bleeding is present, keep clean towels or pads in place (do not insert anything internally).\n3. Reassure the mother and encourage slow, steady breathing.\n4. Prepare clean towels, warm blankets, and infant wraps if delivery is imminent.\n5. Keep emergency medical services dispatch updated on contraction frequency.',
      },
    },
    {
      categoryId: 'CAT-BURNS',
      categoryName: 'Burns',
      slug: 'burns',
      description: 'Second or third degree thermal burns, chemical burns, or electrical contact injuries',
      displayOrder: 5,
      icon: 'Flame',
      active: true,
      guidance: {
        title: 'Severe Burn First-Aid Protocol',
        content: '1. Stop the burning process immediately (smother flames, isolate power source).\n2. Cool thermal burns under clean, cool running water for 10-20 minutes.\n3. Do NOT use ice, butter, grease, or topical ointments on major burns.\n4. Gently cover burned areas with a clean, dry, non-adherent dressing or clean plastic cling wrap.\n5. Keep the victim warm to prevent rapid body heat loss.',
      },
    },
    {
      categoryId: 'CAT-POISONING',
      categoryName: 'Poisoning',
      slug: 'poisoning',
      description: 'Ingestion or inhalation of toxic chemicals, household poisons, or medication overdose',
      displayOrder: 6,
      icon: 'AlertTriangle',
      active: true,
      guidance: {
        title: 'Acute Poisoning and Toxic Exposure Response',
        content: '1. If inhaled, immediately move person into fresh, ventilated air.\n2. Do NOT induce vomiting or administer ipecac unless explicitly instructed by poison control or clinicians.\n3. If chemical contacted eyes or skin, flush copiously with clean water for at least 15 minutes.\n4. Locate and retain the chemical container, bottle, or packaging for the emergency clinical team.\n5. Monitor airway, breathing, and state of consciousness.',
      },
    },
    {
      categoryId: 'CAT-SNAKE_BITE',
      categoryName: 'Snake bite',
      slug: 'snake_bite',
      description: 'Venomous snake bite with puncture marks, rapid swelling, numbness or tissue necrosis',
      displayOrder: 7,
      icon: 'AlertTriangle',
      active: true,
      guidance: {
        title: 'Snakebite & Envenomation Protocol',
        content: '1. Keep patient strictly calm and still; movement accelerates venom distribution.\n2. Immobilize the bitten extremity at or slightly below heart level.\n3. Remove rings, watches, and tight clothing from the affected limb before swelling occurs.\n4. Do NOT cut the wound, attempt suction, or apply a tourniquet or ice.\n5. Note the snake appearance or take a photo from a safe distance if possible.',
      },
    },
    {
      categoryId: 'CAT-FRACTURE',
      categoryName: 'Fracture',
      slug: 'fracture',
      description: 'Open or compound bone fracture, visible deformity, severe joint dislocation or inability to bear weight',
      displayOrder: 8,
      icon: 'Bone',
      active: true,
      guidance: {
        title: 'Orthopedic Fracture Stabilization',
        content: '1. Support and immobilize the injured extremity in the position found.\n2. Do NOT attempt to push bone ends back or straighten deformed limbs.\n3. If an open wound exists, cover loosely with a sterile dressing.\n4. Apply wrapped cold packs around the injured area to minimize swelling (avoid direct ice on bare skin).\n5. Check circulation distal to the fracture (ensure pulse, warmth, and skin sensation).',
      },
    },
    {
      categoryId: 'CAT-CHILD',
      categoryName: 'Child emergency',
      slug: 'child',
      description: 'Pediatric febrile seizure, cyanosis, severe respiratory retractions or unresponsive infant',
      displayOrder: 9,
      icon: 'Baby',
      active: true,
      guidance: {
        title: 'Pediatric Emergency Response',
        content: '1. In case of seizure, clear the floor of hard or sharp objects and turn child on their side.\n2. Do NOT put anything inside the child\'s mouth.\n3. For breathing difficulty, keep the child in their preferred comfortable seated position.\n4. Never shake an unresponsive infant; check responsiveness by tapping feet or gently rubbing chest.\n5. Keep infant warm and calm while emergency teams are in transit.',
      },
    },
    {
      categoryId: 'CAT-RESPIRATORY',
      categoryName: 'Respiratory emergency',
      slug: 'respiratory',
      description: 'Acute severe shortness of breath, anaphylaxis, asthma attack with stridor or hypoxia',
      displayOrder: 10,
      icon: 'Wind',
      active: true,
      guidance: {
        title: 'Acute Respiratory Distress & Anaphylaxis Protocol',
        content: '1. Help the patient sit upright in a "tripod" position leaning forward with hands on knees.\n2. Loosen collars and tight garments around chest and throat.\n3. If patient has a prescribed rescue inhaler or epinephrine auto-injector (EpiPen) for anaphylaxis, assist immediately.\n4. Ensure fresh airflow and calm, reassuring environment.\n5. If patient collapses and breathing stops, initiate CPR immediately.',
      },
    },
  ];

  for (const catData of seedCategories) {
    let cat = await EmergencyCategory.findOne({ slug: catData.slug });
    if (!cat) {
      cat = await EmergencyCategory.create({
        categoryId: catData.categoryId,
        categoryName: catData.categoryName,
        slug: catData.slug,
        description: catData.description,
        displayOrder: catData.displayOrder,
        icon: catData.icon,
        active: catData.active,
      });
    }

    let gdn = await EmergencyGuidance.findOne({ categoryId: cat._id });
    if (!gdn) {
      await EmergencyGuidance.create({
        categoryId: cat._id,
        title: catData.guidance.title,
        content: catData.guidance.content,
        version: 1,
        reviewStatus: 'APPROVED',
        reviewedBy: admin._id,
        reviewedAt: new Date(),
        active: true,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  MODULE 9: Emergency Capabilities & Category-Capability Mappings
  // ─────────────────────────────────────────────────────────────────────────

  // 1. Standard Clinical Capabilities
  const standardCapabilities = [
    { capabilityCode: 'ER_BAY', capabilityName: 'Emergency Bay', category: 'CRITICAL_CARE', description: '24/7 Resuscitation & Emergency Treatment Bay' },
    { capabilityCode: 'ICU_BED', capabilityName: 'Intensive Care Unit Bed', category: 'CRITICAL_CARE', description: 'Advanced Level-3 Critical Care ICU Bed' },
    { capabilityCode: 'VENTILATOR', capabilityName: 'Mechanical Ventilator', category: 'CRITICAL_CARE', description: 'Invasive/Non-invasive Mechanical Ventilator' },
    { capabilityCode: 'CARDIAC_CATH_LAB', capabilityName: 'Cardiac Catheterization Lab', category: 'CRITICAL_CARE', description: 'Primary PCI & Emergency Angiography Suite' },
    { capabilityCode: 'STROKE_UNIT', capabilityName: 'Comprehensive Stroke Unit', category: 'CRITICAL_CARE', description: 'Hyperacute Stroke Center with IV-Thrombolysis' },
    { capabilityCode: 'TRAUMA_BAY', capabilityName: 'Level-1 Trauma Bay', category: 'CRITICAL_CARE', description: 'Advanced Trauma Resuscitation Suite' },
    { capabilityCode: 'CT_SCANNER', capabilityName: '24/7 CT Scanner', category: 'DIAGNOSTIC', description: 'Immediate Non-Contrast & Angio Head/Body CT' },
    { capabilityCode: 'MRI', capabilityName: 'Emergency MRI', category: 'DIAGNOSTIC', description: 'High-Field MRI with Acute Neuro Protocol' },
    { capabilityCode: 'NEUROSURGERY', capabilityName: 'Neurosurgery Service', category: 'SURGICAL', description: '24/7 On-Call Craniotomy & Neuro-trauma Surgery' },
    { capabilityCode: 'BLOOD_BANK', capabilityName: 'Certified Blood Bank', category: 'SUPPORT', description: 'Massive Transfusion Protocol with O-negative blood' },
    { capabilityCode: 'NICU', capabilityName: 'Neonatal ICU', category: 'SPECIALTY', description: 'Level-3 Neonatal Intensive Care' },
    { capabilityCode: 'PICU', capabilityName: 'Pediatric ICU', category: 'SPECIALTY', description: 'Specialized Pediatric Critical Care' },
    { capabilityCode: 'BURNS_UNIT', capabilityName: 'Burns Treatment Center', category: 'SPECIALTY', description: 'Specialized Sterile Burn Debridement Unit' },
    { capabilityCode: 'TOXICOLOGY', capabilityName: 'Toxicology & Poison Antidote Unit', category: 'SPECIALTY', description: 'Complete Emergency Antidote Stock & Toxin Protocol' },
    { capabilityCode: 'OB_OR', capabilityName: 'Obstetrics OR', category: 'SURGICAL', description: 'Emergency Cesarean Operating Suite' },
  ];

  const capabilityDocMap = {};
  for (const cap of standardCapabilities) {
    let doc = await EmergencyCapability.findOne({ capabilityCode: cap.capabilityCode });
    if (!doc) {
      doc = await EmergencyCapability.create({ ...cap, active: true });
    }
    capabilityDocMap[cap.capabilityCode] = doc;
  }

  // 2. Category-Capability Mappings (OPEN DECISION: DRAFT clinical mappings)
  const categoryCapabilityRules = {
    cardiac: {
      mandatory: ['CARDIAC_CATH_LAB', 'ICU_BED'],
      optional: ['VENTILATOR', 'ER_BAY'],
    },
    stroke: {
      mandatory: ['CT_SCANNER', 'STROKE_UNIT'],
      optional: ['NEUROSURGERY', 'ICU_BED'],
    },
    trauma: {
      mandatory: ['TRAUMA_BAY', 'BLOOD_BANK'],
      optional: ['CT_SCANNER', 'ER_BAY'],
    },
    burns: {
      mandatory: ['BURNS_UNIT'],
      optional: ['ICU_BED', 'ER_BAY'],
    },
    poisoning: {
      mandatory: ['TOXICOLOGY'],
      optional: ['ICU_BED', 'VENTILATOR'],
    },
    child: {
      mandatory: ['PICU'],
      optional: ['NICU', 'ER_BAY'],
    },
    respiratory: {
      mandatory: ['VENTILATOR', 'ER_BAY'],
      optional: ['ICU_BED'],
    },
    bleeding: {
      mandatory: ['BLOOD_BANK', 'ER_BAY'],
      optional: ['TRAUMA_BAY'],
    },
    unconscious: {
      mandatory: ['CT_SCANNER', 'ER_BAY'],
      optional: ['ICU_BED'],
    },
    fracture: {
      mandatory: ['ER_BAY'],
      optional: ['CT_SCANNER'],
    },
  };

  for (const [catSlug, rules] of Object.entries(categoryCapabilityRules)) {
    const cat = await EmergencyCategory.findOne({ slug: catSlug });
    if (!cat) continue;

    for (const code of rules.mandatory) {
      const capDoc = capabilityDocMap[code];
      if (!capDoc) continue;
      const existing = await EmergencyCategoryCapability.findOne({
        categoryId: cat._id,
        capabilityId: capDoc._id,
      });
      if (!existing) {
        await EmergencyCategoryCapability.create({
          categoryId: cat._id,
          capabilityId: capDoc._id,
          requirementType: 'MANDATORY',
          priority: 1,
          approvalStatus: 'DRAFT',
          active: true,
        });
      }
    }

    for (const code of rules.optional) {
      const capDoc = capabilityDocMap[code];
      if (!capDoc) continue;
      const existing = await EmergencyCategoryCapability.findOne({
        categoryId: cat._id,
        capabilityId: capDoc._id,
      });
      if (!existing) {
        await EmergencyCategoryCapability.create({
          categoryId: cat._id,
          capabilityId: capDoc._id,
          requirementType: 'OPTIONAL',
          priority: 2,
          approvalStatus: 'DRAFT',
          active: true,
        });
      }
    }
  }

  // 3. Organization Emergency Capabilities for Seeded Hospitals
  const allParticipatingOrgs = await Organization.find({
    verificationStatus: { $in: ['verified', 'VERIFIED', 'approved', 'APPROVED'] },
  });

  for (const org of allParticipatingOrgs) {
    // Grant core capabilities to verified hospitals
    const defaultCodes = ['ER_BAY', 'ICU_BED', 'VENTILATOR', 'CT_SCANNER', 'BLOOD_BANK'];
    // If name contains Trauma or Heart, grant additional capabilities
    if (org.name?.toLowerCase().includes('heart') || org.name?.toLowerCase().includes('cardiac')) {
      defaultCodes.push('CARDIAC_CATH_LAB');
    }
    if (org.name?.toLowerCase().includes('trauma') || org.name?.toLowerCase().includes('metro')) {
      defaultCodes.push('TRAUMA_BAY', 'NEUROSURGERY');
    }
    if (org.name?.toLowerCase().includes('stroke') || org.name?.toLowerCase().includes('neuro')) {
      defaultCodes.push('STROKE_UNIT', 'NEUROSURGERY');
    }

    for (const code of defaultCodes) {
      const capDoc = capabilityDocMap[code];
      if (!capDoc) continue;
      const existing = await OrganizationEmergencyCapability.findOne({
        organizationId: org._id,
        capabilityId: capDoc._id,
      });
      if (!existing) {
        await OrganizationEmergencyCapability.create({
          organizationId: org._id,
          capabilityId: capDoc._id,
          verificationStatus: 'VERIFIED',
          lastVerifiedAt: new Date(),
        });
      }
    }
  }

  // 4. Default Matching Configuration
  let matchingConfig = await EmergencyMatchingConfiguration.findOne({ active: true });
  if (!matchingConfig) {
    await EmergencyMatchingConfiguration.create({
      searchRadii: [10, 25, 50],
      weights: {
        capability: 0.30,
        resource: 0.20,
        specialist: 0.15,
        presence: 0.10,
        travelTime: 0.15,
        distance: 0.05,
        freshness: 0.05,
      },
      resourceStalenessThresholdMinutes: 60,
      resourceVeryStalenessThresholdMinutes: 1440,
      presenceStalenessThresholdMinutes: 480,
      active: true,
      configVersion: '1.0',
    });
  }

  // Seed Module 13 Initial Notifications if none exist
  const existingNotifs = await Notification.countDocuments();
  if (existingNotifs === 0) {
    const seedNotifs = [];

    if (typeof patient !== 'undefined' && patient) {
      seedNotifs.push({
        recipientUserId: patient._id,
        notificationType: 'APPOINTMENT_BOOKED',
        title: 'Appointment Confirmed',
        message: 'Your consultation with Dr. Mira Patel has been scheduled.',
        priority: 'NORMAL',
        status: 'DELIVERED',
        actionUrl: '/patient/appointments',
      });
      seedNotifs.push({
        recipientUserId: patient._id,
        notificationType: 'EMERGENCY_BEEP_BROADCAST',
        title: 'Emergency Beep Network Active',
        message: 'Perimeter monitoring active across regional participating emergency facilities.',
        priority: 'NORMAL',
        status: 'READ',
        readAt: new Date(),
        actionUrl: '/emergency/activate',
      });
    }

    if (typeof docMiraUser !== 'undefined' && docMiraUser) {
      seedNotifs.push({
        recipientUserId: docMiraUser._id,
        notificationType: 'DOCTOR_VERIFICATION',
        title: 'Credentials Verified',
        message: 'Your state medical council license and practice credentials have been verified.',
        priority: 'NORMAL',
        status: 'READ',
        readAt: new Date(),
        actionUrl: '/doctor/dashboard',
      });
      seedNotifs.push({
        recipientUserId: docMiraUser._id,
        notificationType: 'AFFILIATION_ACCEPTED',
        title: 'Hospital Affiliation Active',
        message: 'Your clinical affiliation with Apex Metro Hospital is active.',
        priority: 'NORMAL',
        status: 'DELIVERED',
        actionUrl: '/doctor/affiliations',
      });
    }

    if (typeof org1 !== 'undefined' && org1) {
      const orgOwner = org1.userId || (await User.findOne({ role: 'organization' }));
      if (orgOwner) {
        seedNotifs.push({
          recipientUserId: orgOwner._id || orgOwner,
          organizationId: org1._id,
          notificationType: 'ORGANIZATION_VERIFICATION',
          title: 'Accreditation Approved',
          message: 'Facility verified as Level 1 Trauma Center with 24/7 emergency dispatch capability.',
          priority: 'NORMAL',
          status: 'DELIVERED',
          actionUrl: '/organization/dashboard',
        });
        seedNotifs.push({
          recipientUserId: orgOwner._id || orgOwner,
          organizationId: org1._id,
          notificationType: 'AFFILIATION_REQUEST',
          title: 'Practitioner Badge Verified',
          message: 'Dr. Mira Patel scanned badge QR at Main Reception / Cardiology Wing.',
          priority: 'NORMAL',
          status: 'READ',
          readAt: new Date(),
          actionUrl: '/organization/doctors',
        });
      }
    }

    if (typeof admin !== 'undefined' && admin) {
      seedNotifs.push({
        recipientUserId: admin._id,
        notificationType: 'GENERAL_SYSTEM',
        title: 'Audit Stream Operational',
        message: 'All real-time Socket.io and emergency dispatch nodes verified healthy.',
        priority: 'LOW',
        status: 'READ',
        readAt: new Date(),
        actionUrl: '/admin/dashboard',
      });
    }

    for (const notifData of seedNotifs) {
      const savedNotif = await Notification.create(notifData);
      await NotificationDelivery.create({
        notificationId: savedNotif._id,
        channel: 'IN_APP',
        providerName: 'IN_APP_DB',
        status: 'DELIVERED',
        attemptCount: 1,
        deliveredAt: new Date(),
      });
    }
  }

  console.log('[AutoSeed] Seed data successfully populated.');
}

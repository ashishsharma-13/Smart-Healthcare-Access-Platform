import {
  User,
  Doctor,
  Organization,
  DoctorAffiliation,
  HealthcareResource,
  Appointment,
} from '../models/index.js';

export default async function autoSeed() {
  const getOrCreateUser = async (data) => {
    let u = await User.findOne({ email: data.email });
    if (!u) {
      u = await User.create(data);
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

  // 1. Admin User
  const admin = await getOrCreateUser({
    name: 'SHAP System Administrator',
    email: 'admin@shap.com',
    password: 'password123',
    role: 'admin',
    phone: '+1-555-0100',
  });

  // 2. Patient 1: Alex Mercer (Test suite baseline)
  const patient = await getOrCreateUser({
    name: 'Alex Mercer',
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
      name: 'Sarah Mercer',
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

  // 3. Patient 2: Jamie Bennett (Reference UI patient)
  const jamieUser = await getOrCreateUser({
    name: 'Jamie Bennett',
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
      name: 'David Bennett',
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

  // 6. Test Suite Baseline Doctors
  // Doctor 1: Sarah Jenkins
  const doc1User = await getOrCreateUser({
    name: 'Dr. Sarah Jenkins',
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
    qrCredentialToken: 'SEC-DOC-TOKEN-JENKINS-10024',
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

  // Doctor 2: Marcus Chen
  const doc2User = await getOrCreateUser({
    name: 'Dr. Marcus Chen',
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
    qrCredentialToken: 'SEC-DOC-TOKEN-CHEN-20412',
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

  // Doctor 3: Emily Rodriguez
  const doc3User = await getOrCreateUser({
    name: 'Dr. Emily Rodriguez',
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
    qrCredentialToken: 'SEC-DOC-TOKEN-RODRIGUEZ-30119',
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

  // Doctor 4: Michael Vance (Pending)
  const doc4User = await getOrCreateUser({
    name: 'Dr. Michael Vance',
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

  // 7. Reference Design Specialists (Dr. Mira Patel, Dr. Daniel Brooks, Dr. Sofia Chen, Dr. Ethan Ross)
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

  // Dr. Daniel Brooks
  const docDanielUser = await getOrCreateUser({
    name: 'Dr. Daniel Brooks',
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
    qrCredentialToken: 'SEC-DOC-TOKEN-BROOKS-1510',
    consultationFee: 95,
    bio: 'Specialist in non-invasive cardiac imaging, preventive cardiovascular therapy, and complex arrhythmia monitoring.',
    workingHours: 'Mon–Fri · 8:30 AM–4:30 PM',
    rating: 4.9,
    totalReviews: 96,
    isAvailableForAppointments: true,
    isAvailableForEmergency: true,
    languages: ['English'],
    currentPresence: {
      isPresent: true,
      organizationId: northsideOrg._id,
      checkedInAt: new Date(),
    },
  });

  // Dr. Sofia Chen
  const docSofiaUser = await getOrCreateUser({
    name: 'Dr. Sofia Chen',
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
    qrCredentialToken: 'SEC-DOC-TOKEN-CHEN-9081',
    consultationFee: 80,
    bio: 'Cardiologist focused on early detection, arterial health, and integrative heart care therapies.',
    workingHours: 'Mon–Fri · 9:00 AM–5:00 PM',
    rating: 4.8,
    totalReviews: 74,
    isAvailableForAppointments: true,
    isAvailableForEmergency: true,
    languages: ['English', 'Mandarin'],
    currentPresence: {
      isPresent: true,
      organizationId: lakesideOrg._id,
      checkedInAt: new Date(),
    },
  });

  // Dr. Ethan Ross
  const docEthanUser = await getOrCreateUser({
    name: 'Dr. Ethan Ross',
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
    qrCredentialToken: 'SEC-DOC-TOKEN-ROSS-1002',
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
    affiliationId: 'AFF-JENKINS-APEX-01',
    doctorId: doc1._id,
    organizationId: org1._id,
    status: 'ACTIVE',
    department: 'Cardiology',
    initiatedBy: 'doctor',
    doctorAcceptance: { status: 'accepted', respondedAt: new Date() },
    organizationApproval: { status: 'approved', reviewedAt: new Date(), reviewedBy: org1User._id },
  });

  await getOrCreateAffiliation({
    affiliationId: 'AFF-JENKINS-LIFELINE-02',
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

  // 9. Appointments
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  await getOrCreateAppointment({
    appointmentNumber: 'APT-JENKINS-001',
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
    appointmentNumber: '#AP-NOAH-01',
    patientId: patient._id,
    doctorId: docMira._id,
    organizationId: riversideOrg._id,
    slotDate: tomorrowStr,
    slotTime: '1:30 PM',
    status: 'completed',
    patientNotes: 'Noah Williams · Follow-up',
    qrToken: 'APT-TOKEN-NOAH-01',
  });

  await getOrCreateAppointment({
    appointmentNumber: '#AP-AVERY-02',
    patientId: jamieUser._id,
    doctorId: docMira._id,
    organizationId: riversideOrg._id,
    slotDate: tomorrowStr,
    slotTime: '2:30 PM',
    status: 'booked',
    patientNotes: 'Avery James · Initial consultation (Heart-health review)',
    qrToken: 'APT-TOKEN-AVERY-02',
  });

  await getOrCreateAppointment({
    appointmentNumber: '#AP-MORGAN-03',
    patientId: patient._id,
    doctorId: docMira._id,
    organizationId: riversideOrg._id,
    slotDate: tomorrowStr,
    slotTime: '3:00 PM',
    status: 'booked',
    patientNotes: 'Morgan Lee · Heart-health follow-up',
    qrToken: 'APT-TOKEN-MORGAN-03',
  });

  await getOrCreateAppointment({
    appointmentNumber: '#AP-SAM-04',
    patientId: jamieUser._id,
    doctorId: docMira._id,
    organizationId: riversideOrg._id,
    slotDate: tomorrowStr,
    slotTime: '3:30 PM',
    status: 'booked',
    patientNotes: 'Sam Taylor · Follow-up',
    qrToken: 'APT-TOKEN-SAM-04',
  });

  console.log('[AutoSeed] Seed data successfully populated.');
}

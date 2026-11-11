import {
  User,
  Doctor,
  Organization,
  DoctorAffiliation,
  HealthcareResource,
  Appointment,
} from '../models/index.js';

export default async function autoSeed() {
  const admin = await User.create({
    name: 'SHAP System Administrator',
    email: 'admin@shap.com',
    password: 'password123',
    role: 'admin',
    phone: '+1-555-0100',
  });

  const patient = await User.create({
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

  // Org 1: Apex Metro
  const org1User = await User.create({
    name: 'Apex Metro Hospital Staff',
    email: 'apex@hospital.com',
    password: 'password123',
    role: 'organization',
    phone: '+1-555-0111',
  });

  const org1 = await Organization.create({
    userId: org1User._id,
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

  await HealthcareResource.create([
    { organizationId: org1._id, resourceType: 'icu_bed', totalCapacity: 20, availableCapacity: 14, reservedCapacity: 0, occupiedCapacity: 6 },
    { organizationId: org1._id, resourceType: 'er_bay', totalCapacity: 15, availableCapacity: 11, reservedCapacity: 0, occupiedCapacity: 4 },
    { organizationId: org1._id, resourceType: 'ventilator', totalCapacity: 10, availableCapacity: 8, reservedCapacity: 0, occupiedCapacity: 2 },
  ]);

  // Org 2: St. Jude
  const org2User = await User.create({
    name: 'St Jude Operations',
    email: 'stjude@hospital.com',
    password: 'password123',
    role: 'organization',
    phone: '+1-555-0222',
  });

  const org2 = await Organization.create({
    userId: org2User._id,
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

  await HealthcareResource.create([
    { organizationId: org2._id, resourceType: 'icu_bed', totalCapacity: 12, availableCapacity: 7, reservedCapacity: 0, occupiedCapacity: 5 },
    { organizationId: org2._id, resourceType: 'er_bay', totalCapacity: 18, availableCapacity: 14, reservedCapacity: 0, occupiedCapacity: 4 },
    { organizationId: org2._id, resourceType: 'ventilator', totalCapacity: 8, availableCapacity: 5, reservedCapacity: 0, occupiedCapacity: 3 },
  ]);

  // Org 3: City Care Clinic
  const org3User = await User.create({
    name: 'City Care Clinic',
    email: 'citycare@clinic.com',
    password: 'password123',
    role: 'organization',
    phone: '+1-555-0333',
  });

  const org3 = await Organization.create({
    userId: org3User._id,
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
  const orgPendingUser = await User.create({
    name: 'North District Memorial',
    email: 'northdistrict@hospital.com',
    password: 'password123',
    role: 'organization',
    phone: '+1-555-0444',
  });

  await Organization.create({
    userId: orgPendingUser._id,
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

  // Doctor 1: Sarah Jenkins
  const doc1User = await User.create({
    name: 'Dr. Sarah Jenkins',
    email: 'sarah.jenkins@shap.com',
    password: 'password123',
    role: 'doctor',
    phone: '+1-555-0801',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&auto=format&fit=crop&q=80',
  });

  const doc1 = await Doctor.create({
    userId: doc1User._id,
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
  const doc2User = await User.create({
    name: 'Dr. Marcus Chen',
    email: 'marcus.chen@shap.com',
    password: 'password123',
    role: 'doctor',
    phone: '+1-555-0802',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80',
  });

  const doc2 = await Doctor.create({
    userId: doc2User._id,
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
  const doc3User = await User.create({
    name: 'Dr. Emily Rodriguez',
    email: 'emily.rodriguez@shap.com',
    password: 'password123',
    role: 'doctor',
    phone: '+1-555-0803',
    avatar: 'https://images.unsplash.com/photo-1594824813572-c5139c82c219?w=300&auto=format&fit=crop&q=80',
  });

  const doc3 = await Doctor.create({
    userId: doc3User._id,
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
  const doc4User = await User.create({
    name: 'Dr. Michael Vance',
    email: 'michael.vance@shap.com',
    password: 'password123',
    role: 'doctor',
    phone: '+1-555-0804',
  });

  await Doctor.create({
    userId: doc4User._id,
    specialization: 'Neurology',
    qualifications: ['MBBS', 'DM - Neurology'],
    experienceYears: 6,
    licenseNumber: 'MED-REG-PENDING-1234',
    licenseDocumentUrl: 'https://example.com/docs/medical_license_vance.pdf',
    verificationStatus: 'pending',
    consultationFee: 800,
    bio: 'Neurologist with focus on stroke prevention, epilepsy, and neuro-critical recovery.',
  });

  // Doctor Affiliations (Many-to-Many via DoctorAffiliation entity)
  await DoctorAffiliation.create([
    {
      affiliationId: 'AFF-JENKINS-APEX-01',
      doctorId: doc1._id,
      organizationId: org1._id,
      status: 'ACTIVE',
      department: 'Cardiology',
      initiatedBy: 'doctor',
      doctorAcceptance: { status: 'accepted', respondedAt: new Date() },
      organizationApproval: { status: 'approved', reviewedAt: new Date(), reviewedBy: org1User._id },
    },
    {
      affiliationId: 'AFF-JENKINS-LIFELINE-02',
      doctorId: doc1._id,
      organizationId: org3._id,
      status: 'ACTIVE',
      department: 'Cardiology',
      initiatedBy: 'doctor',
      doctorAcceptance: { status: 'accepted', respondedAt: new Date() },
      organizationApproval: { status: 'approved', reviewedAt: new Date(), reviewedBy: org3User._id },
    },
    {
      affiliationId: 'AFF-CHEN-STJUDE-01',
      doctorId: doc2._id,
      organizationId: org2._id,
      status: 'ACTIVE',
      department: 'Emergency & Trauma',
      initiatedBy: 'organization',
      doctorAcceptance: { status: 'accepted', respondedAt: new Date() },
      organizationApproval: { status: 'approved', reviewedAt: new Date(), reviewedBy: org2User._id },
    },
    {
      affiliationId: 'AFF-RODRIGUEZ-APEX-01',
      doctorId: doc3._id,
      organizationId: org1._id,
      status: 'ACTIVE',
      department: 'Pediatrics',
      initiatedBy: 'doctor',
      doctorAcceptance: { status: 'accepted', respondedAt: new Date() },
      organizationApproval: { status: 'approved', reviewedAt: new Date(), reviewedBy: org1User._id },
    },
  ]);

  // Appointments
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  await Appointment.create([
    {
      appointmentNumber: 'APT-JENKINS-001',
      patientId: patient._id,
      doctorId: doc1._id,
      organizationId: org1._id,
      slotDate: tomorrowStr,
      slotTime: '10:00 AM',
      status: 'booked',
      patientNotes: 'Annual cardiovascular checkup and ECG review',
      qrToken: 'APT-TOKEN-PASS-9901',
    },
  ]);

  console.log('[AutoSeed] Seed data successfully populated.');
}


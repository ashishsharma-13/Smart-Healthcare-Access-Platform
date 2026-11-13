import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import {
  User,
  Doctor,
  Organization,
  DoctorAffiliation,
  DoctorSchedule,
  DoctorPresenceLog,
  Appointment,
  Specialization,
  SearchHistory,
  SavedHealthcareProvider,
} from '../src/models/index.js';

let mongoServer;

const createToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      jti: 'jti-' + Math.random(),
    },
    process.env.JWT_SECRET || 'shap_super_secret_jwt_key_2026',
    { expiresIn: '1h' }
  );
};

describe('MODULE 17: Healthcare Search and Discovery Master Test Suite', () => {
  let patientUser, patientToken;
  let docUser1, doc1; // Verified Cardiologist, 12 years exp, DM Cardiology
  let docUser2, doc2; // Verified Neurologist, 8 years exp, MD Neurology, unavailable for appointments
  let docUser3, doc3; // Pending / Unverified doctor (should NOT appear in search)
  let orgUser1, org1; // Metro City Hospital (Hospital, 28.6139, 77.2090 - New Delhi Center)
  let orgUser2, org2; // Greenfield Outpatient Clinic (Clinic, 28.5355, 77.3910 - Noida ~20km)
  let unverifiedOrgUser, unverifiedOrg; // Unverified hospital
  let affil1, affil2; // Doc 1 affiliated with both Org 1 and Org 2

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'shap_super_secret_jwt_key_2026';
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Doctor.deleteMany({});
    await Organization.deleteMany({});
    await DoctorAffiliation.deleteMany({});
    await DoctorSchedule.deleteMany({});
    await DoctorPresenceLog.deleteMany({});
    await Appointment.deleteMany({});
    await Specialization.deleteMany({});
    await SearchHistory.deleteMany({});
    await SavedHealthcareProvider.deleteMany({});

    // 1. Patient User
    patientUser = await User.create({
      name: 'John Patient',
      email: 'john.patient@example.com',
      password: 'HashedPassword123!',
      role: 'patient',
      phone: '+919876543210',
      isActive: true,
    });
    patientToken = createToken(patientUser);

    // 2. Organizations
    // Org 1: Metro City Hospital (Connaught Place, New Delhi: 28.6315, 77.2167)
    orgUser1 = await User.create({
      name: 'Metro City Hospital Admin',
      email: 'admin@metrocityhospital.org',
      password: 'HashedPassword123!',
      role: 'organization',
      phone: '+911123456780',
      isActive: true,
    });
    org1 = await Organization.create({
      userId: orgUser1._id,
      name: 'Metro City Super-Specialty Hospital',
      legalName: 'Metro City Healthcare Ltd',
      orgType: 'hospital',
      registrationNumber: 'REG-HOSP-001',
      uniqueOrganizationCode: 'MCH-001',
      qrCheckinCode: 'QR-MCH-001',
      verificationStatus: 'verified',
      emergencyCapable: true,
      emergencyContactPhone: '+911123456789',
      specializations: ['Cardiology', 'Neurology', 'Trauma Surgery', 'Pediatrics'],
      healthcareCapabilities: ['Adult ICU', 'Emergency Department', 'Cardiac Cath Lab', '24/7 Trauma'],
      location: {
        type: 'Point',
        coordinates: [77.2167, 28.6315], // [lng, lat]
      },
      operatingAddress: {
        buildingNumber: '10',
        streetName: 'Barakhamba Road',
        city: 'New Delhi',
        state: 'Delhi',
        pinCode: '110001',
        isSameAsRegistered: true,
      },
      contactNumber: '+911123456780',
      rating: 4.9,
      totalReviews: 85,
    });

    // Org 2: Greenfield Outpatient Clinic (Noida Sector 62: 28.6280, 77.3649 ~14.5km east)
    orgUser2 = await User.create({
      name: 'Greenfield Clinic Admin',
      email: 'admin@greenfieldclinic.org',
      password: 'HashedPassword123!',
      role: 'organization',
      phone: '+911204567890',
      isActive: true,
    });
    org2 = await Organization.create({
      userId: orgUser2._id,
      name: 'Greenfield Specialty Clinic',
      legalName: 'Greenfield Care Pvt Ltd',
      orgType: 'clinic',
      registrationNumber: 'REG-CLN-002',
      uniqueOrganizationCode: 'GSC-002',
      qrCheckinCode: 'QR-GSC-002',
      verificationStatus: 'verified',
      emergencyCapable: false,
      specializations: ['Cardiology', 'General Medicine'],
      healthcareCapabilities: ['ECG', 'Outpatient Consultation', 'Diagnostic Lab'],
      location: {
        type: 'Point',
        coordinates: [77.3649, 28.6280], // [lng, lat]
      },
      operatingAddress: {
        buildingNumber: 'Plot 4',
        streetName: 'Sector 62',
        city: 'Noida',
        state: 'Uttar Pradesh',
        pinCode: '201309',
        isSameAsRegistered: true,
      },
      contactNumber: '+911204567890',
      rating: 4.6,
      totalReviews: 32,
    });

    // Unverified Organization
    unverifiedOrgUser = await User.create({
      name: 'Unverified Org Admin',
      email: 'admin@unverifiedorg.org',
      password: 'HashedPassword123!',
      role: 'organization',
      phone: '+911199998888',
      isActive: true,
    });
    unverifiedOrg = await Organization.create({
      userId: unverifiedOrgUser._id,
      name: 'Unverified Community Care Center',
      orgType: 'hospital',
      registrationNumber: 'REG-UNV-003',
      qrCheckinCode: 'QR-UNV-003',
      verificationStatus: 'pending',
      location: {
        type: 'Point',
        coordinates: [77.2200, 28.6300],
      },
    });

    // 3. Doctors
    // Doc 1: Dr. Priya Sharma (Verified, Cardiologist, 12 years exp, DM Cardiology, available for appointments)
    docUser1 = await User.create({
      name: 'Dr. Priya Sharma',
      email: 'priya.sharma@example.com',
      password: 'HashedPassword123!',
      role: 'doctor',
      phone: '+919811122233',
      avatar: 'https://images.unsplash.com/photo-doctor-1.jpg',
      isActive: true,
    });
    doc1 = await Doctor.create({
      userId: docUser1._id,
      doctorUniqueId: 'DOC-PRIYA-001',
      specialization: 'Cardiology',
      qualifications: ['MBBS', 'MD General Medicine', 'DM Cardiology'],
      experienceYears: 12,
      licenseNumber: 'MCI-102938',
      consultationFee: 800,
      bio: 'Senior Consultant Interventional Cardiologist with extensive expertise in cardiac imaging.',
      languages: ['English', 'Hindi', 'Punjabi'],
      rating: 4.9,
      totalReviews: 45,
      verificationStatus: 'verified',
      isAvailableForAppointments: true,
      isAvailableForEmergency: true,
      currentPresence: {
        isPresent: false,
        organizationId: null,
      },
    });

    // Doc 2: Dr. Vikram Malhotra (Verified, Neurologist, 8 years exp, MD Neurology, unavailable for appointments)
    docUser2 = await User.create({
      name: 'Dr. Vikram Malhotra',
      email: 'vikram.malhotra@example.com',
      password: 'HashedPassword123!',
      role: 'doctor',
      phone: '+919822233344',
      isActive: true,
    });
    doc2 = await Doctor.create({
      userId: docUser2._id,
      doctorUniqueId: 'DOC-VIKRAM-002',
      specialization: 'Neurology',
      qualifications: ['MBBS', 'MD Neurology'],
      experienceYears: 8,
      licenseNumber: 'MCI-203948',
      consultationFee: 700,
      bio: 'Consultant Neurologist specializing in stroke management and neurological rehabilitation.',
      languages: ['English', 'Hindi'],
      rating: 4.7,
      totalReviews: 20,
      verificationStatus: 'verified',
      isAvailableForAppointments: false,
      isAvailableForEmergency: false,
    });

    // Doc 3: Dr. Anita Roy (Unverified / Pending verification)
    docUser3 = await User.create({
      name: 'Dr. Anita Roy',
      email: 'anita.roy@example.com',
      password: 'HashedPassword123!',
      role: 'doctor',
      phone: '+919833344455',
      isActive: true,
    });
    doc3 = await Doctor.create({
      userId: docUser3._id,
      doctorUniqueId: 'DOC-ANITA-003',
      specialization: 'Pediatrics',
      qualifications: ['MBBS', 'MD Pediatrics'],
      experienceYears: 5,
      licenseNumber: 'MCI-304958',
      verificationStatus: 'pending',
      isAvailableForAppointments: true,
    });

    // 4. Affiliations (Doc 1 affiliated with both Org 1 and Org 2)
    affil1 = await DoctorAffiliation.create({
      affiliationId: 'AFF-001',
      doctorId: doc1._id,
      organizationId: org1._id,
      department: 'Cardiology',
      designation: 'Senior Consultant',
      affiliationType: 'VISITING',
      status: 'ACTIVE',
      initiatedBy: 'doctor',
    });

    affil2 = await DoctorAffiliation.create({
      affiliationId: 'AFF-002',
      doctorId: doc1._id,
      organizationId: org2._id,
      department: 'Outpatient Cardiology',
      designation: 'Visiting Specialist',
      affiliationType: 'PART_TIME',
      status: 'ACTIVE',
      initiatedBy: 'doctor',
    });

    // Doc 2 affiliated with Org 1 only
    await DoctorAffiliation.create({
      affiliationId: 'AFF-003',
      doctorId: doc2._id,
      organizationId: org1._id,
      department: 'Neurology',
      designation: 'Consultant Neurologist',
      affiliationType: 'FULL_TIME',
      status: 'ACTIVE',
      initiatedBy: 'doctor',
    });

    // 5. Specialization catalog
    await Specialization.create([
      { name: 'Cardiology', category: 'CLINICAL', code: 'CARD', isActive: true },
      { name: 'Neurology', category: 'CLINICAL', code: 'NEUR', isActive: true },
      { name: 'Pediatrics', category: 'PEDIATRIC', code: 'PED', isActive: true },
      { name: 'Orthopedics', category: 'SURGICAL', code: 'ORTH', isActive: true },
    ]);
  });

  // -------------------------------------------------------------
  // Test 1: Search Discovery Metadata
  // -------------------------------------------------------------
  test('1. GET /api/search/metadata returns active specializations, facility types, and capabilities', async () => {
    const res = await request(app).get('/api/search/metadata');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.specializations).toContain('Cardiology');
    expect(res.body.data.specializations).toContain('Neurology');
    expect(res.body.data.facilityTypes.length).toBeGreaterThan(0);
    expect(res.body.data.capabilities).toContain('Adult ICU');
  });

  // -------------------------------------------------------------
  // Test 2: Doctor Search — General Verified Listing
  // -------------------------------------------------------------
  test('2. GET /api/search/doctors returns verified doctors with active affiliations', async () => {
    const res = await request(app).get('/api/search/doctors');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.total).toBe(2); // Doc 1 and Doc 2 (Doc 3 is pending)
    const priya = res.body.data.find((d) => d.doctorUniqueId === 'DOC-PRIYA-001');
    expect(priya).toBeDefined();
    expect(priya.name).toBe('Dr. Priya Sharma');
    expect(priya.activeAffiliations.length).toBe(2);
    expect(priya.activeAffiliations.some((a) => a.organizationName.includes('Metro City'))).toBe(true);
    expect(priya.activeAffiliations.some((a) => a.organizationName.includes('Greenfield'))).toBe(true);
  });

  // -------------------------------------------------------------
  // Test 3: Doctor Search — Verification Isolation
  // -------------------------------------------------------------
  test('3. Verification filtering: Unverified doctors are strictly excluded from patient search', async () => {
    const res = await request(app).get('/api/search/doctors?verifiedOnly=true');
    expect(res.status).toBe(200);
    expect(res.body.data.some((d) => d.doctorUniqueId === 'DOC-ANITA-003')).toBe(false);
  });

  // -------------------------------------------------------------
  // Test 4: Doctor Search — Search Query by Name and Bio
  // -------------------------------------------------------------
  test('4. GET /api/search/doctors filters correctly by name and keyword query', async () => {
    const resName = await request(app).get('/api/search/doctors?q=Priya');
    expect(resName.status).toBe(200);
    expect(resName.body.count).toBe(1);
    expect(resName.body.data[0].doctorUniqueId).toBe('DOC-PRIYA-001');

    const resBio = await request(app).get('/api/search/doctors?search=rehabilitation');
    expect(resBio.status).toBe(200);
    expect(resBio.body.count).toBe(1);
    expect(resBio.body.data[0].doctorUniqueId).toBe('DOC-VIKRAM-002');
  });

  // -------------------------------------------------------------
  // Test 5: Doctor Search — Specialization Filter
  // -------------------------------------------------------------
  test('5. GET /api/search/doctors filters accurately by specialization', async () => {
    const res = await request(app).get('/api/search/doctors?specialization=Neurology');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0].doctorUniqueId).toBe('DOC-VIKRAM-002');
  });

  // -------------------------------------------------------------
  // Test 6: Doctor Search — Qualification Filter
  // -------------------------------------------------------------
  test('6. GET /api/search/doctors filters by advanced medical qualification (e.g. DM)', async () => {
    const res = await request(app).get('/api/search/doctors?qualification=DM');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0].doctorUniqueId).toBe('DOC-PRIYA-001');
  });

  // -------------------------------------------------------------
  // Test 7: Doctor Search — Minimum Experience Filter
  // -------------------------------------------------------------
  test('7. GET /api/search/doctors filters by minimum years of clinical experience', async () => {
    const res10 = await request(app).get('/api/search/doctors?minExperience=10');
    expect(res10.status).toBe(200);
    expect(res10.body.count).toBe(1);
    expect(res10.body.data[0].doctorUniqueId).toBe('DOC-PRIYA-001');

    const res5 = await request(app).get('/api/search/doctors?minExperience=5');
    expect(res5.status).toBe(200);
    expect(res5.body.count).toBe(2);
  });

  // -------------------------------------------------------------
  // Test 8: Doctor Search — Appointment Availability Filter
  // -------------------------------------------------------------
  test('8. GET /api/search/doctors filters by appointment availability status', async () => {
    const res = await request(app).get('/api/search/doctors?availableOnly=true');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0].doctorUniqueId).toBe('DOC-PRIYA-001');
    expect(res.body.data[0].isAvailableForAppointments).toBe(true);
  });

  // -------------------------------------------------------------
  // Test 9: Doctor Search — Organization Affiliation Filter
  // -------------------------------------------------------------
  test('9. GET /api/search/doctors filters by organization affiliation ID', async () => {
    // Only Doc 1 is affiliated with Greenfield Clinic (Org 2)
    const res = await request(app).get(`/api/search/doctors?organizationId=${org2._id}`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0].doctorUniqueId).toBe('DOC-PRIYA-001');
  });

  // -------------------------------------------------------------
  // Test 10: Doctor Search — Geolocation & Distance Calculation
  // -------------------------------------------------------------
  test('10. Location search computes Haversine distance and respects radiusKm boundaries', async () => {
    // Search origin: Connaught Place center (28.6315, 77.2167)
    // Metro City Hospital is at this exact location (distance ~0 km).
    // Greenfield Clinic is ~14.5 km away in Noida.
    const resNear = await request(app).get(
      '/api/search/doctors?lat=28.6315&lng=77.2167&radiusKm=5&sortBy=distance'
    );
    expect(resNear.status).toBe(200);
    expect(resNear.body.data.length).toBeGreaterThan(0);
    // Closest affiliation is Metro City Hospital
    const docPriya = resNear.body.data.find((d) => d.doctorUniqueId === 'DOC-PRIYA-001');
    expect(docPriya).toBeDefined();
    expect(docPriya.distanceKm).toBeLessThanOrEqual(5);
    expect(docPriya.distanceNote).toContain('Straight-line distance');

    // Radius of 1 km should only include doctors at Org 1
    const res1Km = await request(app).get(
      '/api/search/doctors?lat=28.6315&lng=77.2167&radiusKm=1'
    );
    expect(res1Km.status).toBe(200);
    expect(res1Km.body.data.length).toBe(2);
  });

  // -------------------------------------------------------------
  // Test 11: Doctor Profile by ID and Unique Code
  // -------------------------------------------------------------
  test('11. GET /api/search/doctors/:id returns sanitized doctor profile with disclaimers', async () => {
    const res = await request(app).get(`/api/search/doctors/${doc1._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Dr. Priya Sharma');
    expect(res.body.data.specialization).toBe('Cardiology');
    expect(res.body.data.activeAffiliations.length).toBe(2);
    expect(res.body.data.disclaimers.presenceNotice).toContain('QR check-in');
    expect(res.body.data.disclaimers.availabilityNotice).toContain('Appointment availability');
    // Security check: passwords and license documents must not be exposed
    expect(res.body.data.password).toBeUndefined();
    expect(res.body.data.licenseDocumentUrl).toBeUndefined();
  });

  // -------------------------------------------------------------
  // Test 12: Doctor Affiliations Endpoint
  // -------------------------------------------------------------
  test('12. GET /api/search/doctors/:id/affiliations returns all active affiliations', async () => {
    const res = await request(app).get(`/api/search/doctors/${doc1._id}/affiliations`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(2);
    expect(res.body.data[0].organizationName).toBeDefined();
    expect(res.body.data[0].department).toBeDefined();
  });

  // -------------------------------------------------------------
  // Test 13: CRITICAL INVARIANT — Schedule Alone Never Proves Presence
  // -------------------------------------------------------------
  test('13. PRESENCE RULE: Schedule alone NEVER proves doctor presence on-site', async () => {
    // 1. Create a planned recurring weekly schedule for Dr. Priya at Metro City Hospital
    const todayDayOfWeek = new Date().getDay();
    await DoctorSchedule.create({
      doctorId: doc1._id,
      organizationId: org1._id,
      affiliationId: affil1._id,
      isActive: true,
      weeklySchedule: [
        {
          dayOfWeek: todayDayOfWeek,
          startTime: '09:00',
          endTime: '17:00',
          isActive: true,
        },
      ],
    });

    // 2. Fetch doctor availability: doctor has planned schedule, but has NOT checked in with QR
    const resBefore = await request(app).get(`/api/search/doctors/${doc1._id}/availability?organizationId=${org1._id}`);
    expect(resBefore.status).toBe(200);
    expect(resBefore.body.data.plannedHours.startTime).toBe('09:00');
    // Strict invariant: isCurrentlyOnSite must be FALSE, verifiedPresenceStatus must be NOT_CHECKED_IN
    expect(resBefore.body.data.isCurrentlyOnSite).toBe(false);
    expect(resBefore.body.data.verifiedPresenceStatus).toBe('NOT_CHECKED_IN');
    expect(resBefore.body.data.disclaimers.presenceRule).toContain('never treated as presence');

    // 3. Now simulate verified QR check-in
    await Doctor.findByIdAndUpdate(doc1._id, {
      'currentPresence.isPresent': true,
      'currentPresence.organizationId': org1._id,
      'currentPresence.checkedInAt': new Date(),
    });

    // 4. Fetch availability again: now verified on-site
    const resAfter = await request(app).get(`/api/search/doctors/${doc1._id}/availability?organizationId=${org1._id}`);
    expect(resAfter.status).toBe(200);
    expect(resAfter.body.data.isCurrentlyOnSite).toBe(true);
    expect(resAfter.body.data.verifiedPresenceStatus).toBe('ON_SITE_VERIFIED');
  });

  // -------------------------------------------------------------
  // Test 14: CRITICAL INVARIANT — Appointment vs Emergency Availability Separation
  // -------------------------------------------------------------
  test('14. AVAILABILITY RULE: Appointment availability is strictly isolated from Emergency availability', async () => {
    // Update Doc 2: not available for clinic appointments, but available for emergency
    await Doctor.findByIdAndUpdate(doc2._id, {
      isAvailableForAppointments: false,
      isAvailableForEmergency: true,
    });

    const res = await request(app).get(`/api/search/doctors/${doc2._id}/availability`);
    expect(res.status).toBe(200);
    expect(res.body.data.isAvailableForAppointments).toBe(false);
    expect(res.body.data.isAvailableForEmergency).toBe(true);
    // Booking slots must reflect clinic unavailability
    expect(res.body.data.availableSlots.every((s) => s.available === false)).toBe(true);
    expect(res.body.data.disclaimers.emergencySeparation).toContain('strictly separated');
  });

  // -------------------------------------------------------------
  // Test 15: Organization Search — Text Query & Verification Filter
  // -------------------------------------------------------------
  test('15. GET /api/search/organizations filters verified organizations by query text', async () => {
    const res = await request(app).get('/api/search/organizations?q=Metro');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0].name).toContain('Metro City');
    // Unverified organization must be excluded
    expect(res.body.data.some((o) => o.name.includes('Unverified'))).toBe(false);
  });

  // -------------------------------------------------------------
  // Test 16: Organization Search — Facility Type Filter
  // -------------------------------------------------------------
  test('16. GET /api/search/organizations filters by orgType (hospital vs clinic)', async () => {
    const resHosp = await request(app).get('/api/search/organizations?orgType=hospital');
    expect(resHosp.status).toBe(200);
    expect(resHosp.body.count).toBe(1);
    expect(resHosp.body.data[0].orgType).toBe('hospital');

    const resClinic = await request(app).get('/api/search/organizations?orgType=clinic');
    expect(resClinic.status).toBe(200);
    expect(resClinic.body.count).toBe(1);
    expect(resClinic.body.data[0].orgType).toBe('clinic');
  });

  // -------------------------------------------------------------
  // Test 17: Organization Search — Capability & Specialization Filtering
  // -------------------------------------------------------------
  test('17. GET /api/search/organizations filters by registered healthcare capabilities', async () => {
    const resICU = await request(app).get('/api/search/organizations?capability=Adult ICU');
    expect(resICU.status).toBe(200);
    expect(resICU.body.count).toBe(1);
    expect(resICU.body.data[0].healthcareCapabilities).toContain('Adult ICU');

    const resSpec = await request(app).get('/api/search/organizations?specialization=Neurology');
    expect(resSpec.status).toBe(200);
    expect(resSpec.body.count).toBe(1);
  });

  // -------------------------------------------------------------
  // Test 18: Nearby Organizations Search
  // -------------------------------------------------------------
  test('18. GET /api/search/organizations/nearby returns facilities sorted by proximity', async () => {
    // Search origin: New Delhi Connaught Place
    const res = await request(app).get('/api/search/organizations/nearby?lat=28.6315&lng=77.2167&radiusKm=20');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(2);
    // Closest organization is Metro City Hospital (at ~0 km)
    expect(res.body.data[0].name).toContain('Metro City');
    expect(res.body.data[0].distanceKm).toBeLessThan(res.body.data[1].distanceKm);
    expect(res.body.data[0].disclaimer).toBeDefined();
  });

  // -------------------------------------------------------------
  // Test 19: Organization Profile & Non-Guaranteed Vacancy Disclaimer
  // -------------------------------------------------------------
  test('19. GET /api/search/organizations/:id returns sanitized profile with vacancy disclaimer', async () => {
    const res = await request(app).get(`/api/search/organizations/${org1._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Metro City Super-Specialty Hospital');
    expect(res.body.data.affiliatedDoctorsCount).toBe(2);
    expect(res.body.data.disclaimer).toContain('not guaranteed live resource or bed vacancy');
    // Ensure legal verification documents are excluded
    expect(res.body.data.licenseDocumentUrl).toBeUndefined();
    expect(res.body.data.verificationNotes).toBeUndefined();
  });

  // -------------------------------------------------------------
  // Test 20: Organization Doctors Endpoint
  // -------------------------------------------------------------
  test('20. GET /api/search/organizations/:id/doctors lists verified affiliated doctors', async () => {
    const res = await request(app).get(`/api/search/organizations/${org1._id}/doctors`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(2);
    expect(res.body.data.some((d) => d.doctorUniqueId === 'DOC-PRIYA-001')).toBe(true);
    expect(res.body.data.some((d) => d.doctorUniqueId === 'DOC-VIKRAM-002')).toBe(true);
  });

  // -------------------------------------------------------------
  // Test 21: Organization Specializations & Capabilities Endpoints
  // -------------------------------------------------------------
  test('21. GET specializations & capabilities returns registered services with disclaimers', async () => {
    const resSpecs = await request(app).get(`/api/search/organizations/${org1._id}/specializations`);
    expect(resSpecs.status).toBe(200);
    expect(resSpecs.body.specializations).toContain('Cardiology');
    expect(resSpecs.body.specializations).toContain('Neurology');

    const resCaps = await request(app).get(`/api/search/organizations/${org1._id}/capabilities`);
    expect(resCaps.status).toBe(200);
    expect(resCaps.body.registeredCapabilities).toContain('Adult ICU');
    expect(resCaps.body.disclaimer).toContain('not guaranteed live resource');
  });

  // -------------------------------------------------------------
  // Test 22: Search History Lifecycle
  // -------------------------------------------------------------
  test('22. Search History: records search queries and allows clearing history', async () => {
    // Record search query for authenticated patient
    const postRes = await request(app)
      .post('/api/search/history')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        searchType: 'DOCTOR',
        queryText: 'Cardiology Specialist',
        filters: { specialization: 'Cardiology' },
      });
    expect(postRes.status).toBe(201);
    expect(postRes.body.success).toBe(true);

    // Retrieve search history
    const getRes = await request(app)
      .get('/api/search/history')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.count).toBeGreaterThan(0);
    expect(getRes.body.data[0].queryText).toBe('Cardiology Specialist');

    // Clear search history
    const delRes = await request(app)
      .delete('/api/search/history')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.deletedCount).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------
  // Test 23: Saved / Bookmarked Healthcare Providers
  // -------------------------------------------------------------
  test('23. Saved Providers: allows patient to bookmark and manage doctors and hospitals', async () => {
    // Save Doctor 1
    const saveDoc = await request(app)
      .post('/api/search/saved')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        providerType: 'DOCTOR',
        providerId: doc1._id,
        notes: 'Recommended cardiologist by Dr. Mehta',
      });
    expect(saveDoc.status).toBe(201);
    expect(saveDoc.body.success).toBe(true);

    // Save Hospital 1
    const saveHosp = await request(app)
      .post('/api/search/saved')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        providerType: 'ORGANIZATION',
        providerId: org1._id,
        notes: 'Nearest trauma hospital',
      });
    expect(saveHosp.status).toBe(201);

    // List saved providers
    const listRes = await request(app)
      .get('/api/search/saved')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.count).toBe(2);
    expect(listRes.body.data.some((p) => p.providerType === 'DOCTOR')).toBe(true);
    expect(listRes.body.data.some((p) => p.providerType === 'ORGANIZATION')).toBe(true);

    // Delete bookmark
    const delRes = await request(app)
      .delete(`/api/search/saved/${doc1._id}`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.deletedCount).toBe(1);
  });

  // -------------------------------------------------------------
  // Test 24: Direct compatibility routes /api/doctors/:id/availability
  // -------------------------------------------------------------
  test('24. GET /api/doctors/:id/availability and /api/organizations/:id/specializations direct routes', async () => {
    const resDocAvail = await request(app).get(`/api/doctors/${doc1._id}/availability`);
    expect(resDocAvail.status).toBe(200);
    expect(resDocAvail.body.data.doctorId).toBeDefined();

    const resOrgSpecs = await request(app).get(`/api/organizations/${org1._id}/specializations`);
    expect(resOrgSpecs.status).toBe(200);
    expect(resOrgSpecs.body.specializations).toContain('Cardiology');

    const resOrgCaps = await request(app).get(`/api/organizations/${org1._id}/capabilities`);
    expect(resOrgCaps.status).toBe(200);
    expect(resOrgCaps.body.registeredCapabilities).toContain('Adult ICU');
  });
});


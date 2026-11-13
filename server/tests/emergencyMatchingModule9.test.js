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
  HealthcareResource,
  ResourceReservation,
  EmergencyAvailability,
  DoctorPresenceLog,
  EmergencyRequest,
  EmergencyBroadcast,
  EmergencyCategory,
  EmergencyCapability,
  OrganizationEmergencyCapability,
  EmergencyCategoryCapability,
  EmergencyMatchResult,
  EmergencyMatchingConfiguration,
} from '../src/models/index.js';
import { emergencyMatchingService } from '../src/services/EmergencyMatchingService.js';

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

describe('MODULE 9: Emergency Matching and Suitable Organization Discovery Test Suite', () => {
  let adminUser, adminToken;
  let patientUser, patientToken;
  let orgUser1, orgToken1;

  let capCathLab, capIcuBed, capErBay, capCtScanner, capStrokeUnit, capTraumaBay;
  let cardiacCategory, strokeCategory;

  let apexHeartHospital;
  let nearestClinicNoCath;
  let farSpecialtyHospital;
  let unverifiedHospital;
  let nonParticipatingHospital;

  let emergencyReq1;

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
    // Clear collections
    await User.deleteMany({});
    await Organization.deleteMany({});
    await Doctor.deleteMany({});
    await DoctorAffiliation.deleteMany({});
    await HealthcareResource.deleteMany({});
    await ResourceReservation.deleteMany({});
    await EmergencyAvailability.deleteMany({});
    await DoctorPresenceLog.deleteMany({});
    await EmergencyRequest.deleteMany({});
    await EmergencyBroadcast.deleteMany({});
    await EmergencyCategory.deleteMany({});
    await EmergencyCapability.deleteMany({});
    await OrganizationEmergencyCapability.deleteMany({});
    await EmergencyCategoryCapability.deleteMany({});
    await EmergencyMatchResult.deleteMany({});
    await EmergencyMatchingConfiguration.deleteMany({});

    // 1. Setup Users
    adminUser = await User.create({
      name: 'Central Admin',
      email: 'admin.m9@shap.org',
      password: 'Password123!',
      role: 'admin',
    });
    adminToken = createToken(adminUser);

    patientUser = await User.create({
      name: 'Emergency Patient John',
      email: 'patient.john@shap.org',
      password: 'Password123!',
      role: 'patient',
      phone: '+1-555-0144',
    });
    patientToken = createToken(patientUser);

    orgUser1 = await User.create({
      name: 'Apex Admin',
      email: 'apex.admin@shap.org',
      password: 'Password123!',
      role: 'organization',
    });
    orgToken1 = createToken(orgUser1);

    // 2. Setup Standard Clinical Capabilities
    capCathLab = await EmergencyCapability.create({
      capabilityCode: 'CARDIAC_CATH_LAB',
      capabilityName: 'Cardiac Catheterization Lab',
      category: 'CRITICAL_CARE',
      active: true,
    });
    capIcuBed = await EmergencyCapability.create({
      capabilityCode: 'ICU_BED',
      capabilityName: 'Intensive Care Unit Bed',
      category: 'CRITICAL_CARE',
      active: true,
    });
    capErBay = await EmergencyCapability.create({
      capabilityCode: 'ER_BAY',
      capabilityName: 'Emergency Bay',
      category: 'CRITICAL_CARE',
      active: true,
    });
    capCtScanner = await EmergencyCapability.create({
      capabilityCode: 'CT_SCANNER',
      capabilityName: '24/7 CT Scanner',
      category: 'DIAGNOSTIC',
      active: true,
    });
    capStrokeUnit = await EmergencyCapability.create({
      capabilityCode: 'STROKE_UNIT',
      capabilityName: 'Comprehensive Stroke Unit',
      category: 'CRITICAL_CARE',
      active: true,
    });
    capTraumaBay = await EmergencyCapability.create({
      capabilityCode: 'TRAUMA_BAY',
      capabilityName: 'Trauma Resuscitation Suite',
      category: 'CRITICAL_CARE',
      active: true,
    });

    // 3. Setup Emergency Categories
    cardiacCategory = await EmergencyCategory.create({
      categoryId: 'CAT-CARDIAC',
      categoryName: 'Cardiac Emergency',
      slug: 'cardiac',
      description: 'Acute coronary syndrome or suspected myocardial infarction',
      active: true,
    });

    strokeCategory = await EmergencyCategory.create({
      categoryId: 'CAT-STROKE',
      categoryName: 'Stroke Emergency',
      slug: 'stroke',
      description: 'Acute neurologic deficit or suspected ischemic/hemorrhagic stroke',
      active: true,
    });

    // 4. Map Category Capabilities
    // Cardiac: MANDATORY: CARDIAC_CATH_LAB, ICU_BED; OPTIONAL: ER_BAY
    await EmergencyCategoryCapability.create({
      categoryId: cardiacCategory._id,
      capabilityId: capCathLab._id,
      requirementType: 'MANDATORY',
      priority: 1,
      approvalStatus: 'DRAFT',
      active: true,
    });
    await EmergencyCategoryCapability.create({
      categoryId: cardiacCategory._id,
      capabilityId: capIcuBed._id,
      requirementType: 'MANDATORY',
      priority: 1,
      approvalStatus: 'DRAFT',
      active: true,
    });
    await EmergencyCategoryCapability.create({
      categoryId: cardiacCategory._id,
      capabilityId: capErBay._id,
      requirementType: 'OPTIONAL',
      priority: 2,
      approvalStatus: 'DRAFT',
      active: true,
    });

    // Stroke: MANDATORY: CT_SCANNER, STROKE_UNIT
    await EmergencyCategoryCapability.create({
      categoryId: strokeCategory._id,
      capabilityId: capCtScanner._id,
      requirementType: 'MANDATORY',
      priority: 1,
      approvalStatus: 'DRAFT',
      active: true,
    });
    await EmergencyCategoryCapability.create({
      categoryId: strokeCategory._id,
      capabilityId: capStrokeUnit._id,
      requirementType: 'MANDATORY',
      priority: 1,
      approvalStatus: 'DRAFT',
      active: true,
    });

    // 5. Setup Organizations Helper
    let orgSeq = 1;
    const createTestOrg = async (data) => {
      const idx = orgSeq++;
      return await Organization.create({
        registrationNumber: `REG-ORG-${idx}-${Math.floor(Math.random() * 100000)}`,
        qrCheckinCode: `QR-CODE-${idx}-${Math.floor(Math.random() * 100000)}`,
        operatingAddress: {
          buildingNumber: '12',
          streetName: 'Health Blvd',
          city: 'New Delhi',
          state: 'Delhi',
          pinCode: '110001',
          country: 'India',
        },
        ...data,
      });
    };

    // Org A: Apex Heart Hospital (verified, participating, has Cath Lab + ICU + ER Bay, ~2.5 km away)
    apexHeartHospital = await createTestOrg({
      userId: orgUser1._id,
      name: 'Apex Heart Hospital',
      slug: 'apex-heart',
      verificationStatus: 'verified',
      isParticipating: true,
      emergencyCapable: true,
      location: {
        type: 'Point',
        coordinates: [77.22, 28.62], // ~2.5 km from patient [77.2090, 28.6139]
      },
      emergencyContactPhone: '+1-555-0911',
    });

    await OrganizationEmergencyCapability.create({
      organizationId: apexHeartHospital._id,
      capabilityId: capCathLab._id,
      verificationStatus: 'VERIFIED',
    });
    await OrganizationEmergencyCapability.create({
      organizationId: apexHeartHospital._id,
      capabilityId: capIcuBed._id,
      verificationStatus: 'VERIFIED',
    });
    await OrganizationEmergencyCapability.create({
      organizationId: apexHeartHospital._id,
      capabilityId: capErBay._id,
      verificationStatus: 'VERIFIED',
    });

    // Org B: Nearest General Clinic (0.2 km away, BUT MISSES CATH LAB!)
    nearestClinicNoCath = await createTestOrg({
      userId: new mongoose.Types.ObjectId(),
      name: 'Immediate Neighborhood Clinic',
      slug: 'neighborhood-clinic',
      verificationStatus: 'verified',
      isParticipating: true,
      emergencyCapable: true,
      location: {
        type: 'Point',
        coordinates: [77.2092, 28.6141], // ~0.03 km away (nearest!)
      },
      emergencyContactPhone: '+1-555-0100',
    });
    // Has only ER Bay, NO Cath Lab
    await OrganizationEmergencyCapability.create({
      organizationId: nearestClinicNoCath._id,
      capabilityId: capErBay._id,
      verificationStatus: 'VERIFIED',
    });

    // Org C: Far Specialty Hospital (~35 km away, has all capabilities)
    farSpecialtyHospital = await createTestOrg({
      userId: new mongoose.Types.ObjectId(),
      name: 'Far Specialty Medical Center',
      slug: 'far-specialty',
      verificationStatus: 'verified',
      isParticipating: true,
      emergencyCapable: true,
      location: {
        type: 'Point',
        coordinates: [77.50, 28.80], // ~35 km away
      },
      emergencyContactPhone: '+1-555-0999',
    });
    await OrganizationEmergencyCapability.create({
      organizationId: farSpecialtyHospital._id,
      capabilityId: capCathLab._id,
      verificationStatus: 'VERIFIED',
    });
    await OrganizationEmergencyCapability.create({
      organizationId: farSpecialtyHospital._id,
      capabilityId: capIcuBed._id,
      verificationStatus: 'VERIFIED',
    });

    // Org D: Unverified Hospital
    unverifiedHospital = await createTestOrg({
      userId: new mongoose.Types.ObjectId(),
      name: 'Unverified Med Center',
      slug: 'unverified-med',
      verificationStatus: 'pending',
      isParticipating: true,
      emergencyCapable: true,
      location: {
        type: 'Point',
        coordinates: [77.215, 28.615],
      },
    });

    // Org E: Non-Participating Hospital
    nonParticipatingHospital = await createTestOrg({
      userId: new mongoose.Types.ObjectId(),
      name: 'Non Participating General Facility',
      slug: 'non-participating',
      verificationStatus: 'verified',
      isParticipating: false,
      emergencyCapable: true,
      location: {
        type: 'Point',
        coordinates: [77.218, 28.618],
      },
    });

    // 6. Resources for Apex Heart Hospital
    await HealthcareResource.create({
      organizationId: apexHeartHospital._id,
      resourceType: 'icu_bed',
      totalCapacity: 10,
      availableCapacity: 8,
    });
    await HealthcareResource.create({
      organizationId: apexHeartHospital._id,
      resourceType: 'er_bay',
      totalCapacity: 15,
      availableCapacity: 12,
    });

    // 7. Doctor Availability & QR Presence for Apex Heart Hospital
    const docUser = await User.create({
      name: 'Dr. Sarah Cardiologist',
      email: 'dr.sarah@shap.org',
      password: 'Password123!',
      role: 'doctor',
    });
    const doctorDoc = await Doctor.create({
      userId: docUser._id,
      licenseNumber: 'MD-CARDIO-99',
      specialization: 'Cardiology',
      verificationStatus: 'verified',
    });
    const affiliationDoc = await DoctorAffiliation.create({
      doctorId: doctorDoc._id,
      organizationId: apexHeartHospital._id,
      status: 'ACTIVE',
    });

    // Doctor declared emergency availability
    await EmergencyAvailability.create({
      doctorId: doctorDoc._id,
      organizationId: apexHeartHospital._id,
      affiliationId: affiliationDoc._id,
      participationStatus: true,
      status: 'ACTIVE',
      emergencyCapabilities: ['CARDIAC_CATH_LAB'],
    });

    // Doctor QR-verified presence
    await DoctorPresenceLog.create({
      doctorId: doctorDoc._id,
      organizationId: apexHeartHospital._id,
      affiliationId: affiliationDoc._id,
      status: 'CHECKED_IN',
      checkInMethod: 'QR_SCAN',
      checkInAt: new Date(),
    });

    // 8. Test Emergency Request
    emergencyReq1 = await EmergencyRequest.create({
      requestCode: 'EMG-M9-TEST-001',
      patientId: patientUser._id,
      patientName: patientUser.name,
      patientPhone: patientUser.phone || '+1-555-0144',
      emergencyCategoryId: cardiacCategory._id,
      emergencyType: 'cardiac',
      description: 'Severe acute chest pressure radiating to left arm',
      ambulanceRequirement: 'yes',
      location: {
        type: 'Point',
        coordinates: [77.2090, 28.6139],
      },
      locationSnapshot: {
        type: 'Point',
        coordinates: [77.2090, 28.6139],
        address: 'Connaught Place, New Delhi',
      },
      status: 'CREATED',
    });
  });

  // ── TEST 1: Emergency Category Mapping ───────────────────────────────────
  test('1. Emergency Category Mapping: loads configured capabilities correctly', async () => {
    const { mandatory, optional } = await emergencyMatchingService.loadCategoryCapabilities(cardiacCategory._id);
    expect(mandatory).toContain('CARDIAC_CATH_LAB');
    expect(mandatory).toContain('ICU_BED');
    expect(optional).toContain('ER_BAY');
  });

  // ── TEST 2: Mandatory Capability Evaluation ──────────────────────────────
  test('2. Mandatory Capability Evaluation: hospital with mandatory capability passes', async () => {
    const evalRes = await emergencyMatchingService.evaluateOrganizationCapabilities(
      apexHeartHospital._id,
      ['CARDIAC_CATH_LAB', 'ICU_BED'],
      ['ER_BAY']
    );
    expect(evalRes.hasMandatory).toBe(true);
    expect(evalRes.missingMandatory.length).toBe(0);
    expect(evalRes.capabilityScore).toBeGreaterThanOrEqual(60);
  });

  // ── TEST 3: Optional Capability Scoring ──────────────────────────────────
  test('3. Optional Capability Scoring: having optional capability boosts score', async () => {
    const withOptional = await emergencyMatchingService.evaluateOrganizationCapabilities(
      apexHeartHospital._id,
      ['CARDIAC_CATH_LAB', 'ICU_BED'],
      ['ER_BAY']
    );
    const withoutOptional = await emergencyMatchingService.evaluateOrganizationCapabilities(
      farSpecialtyHospital._id,
      ['CARDIAC_CATH_LAB', 'ICU_BED'],
      ['ER_BAY'] // far hospital does not have ER_BAY in its seed
    );
    expect(withOptional.capabilityScore).toBeGreaterThan(withoutOptional.capabilityScore);
  });

  // ── TEST 4: Resource Availability Scoring ────────────────────────────────
  test('4. Resource Availability Scoring: calculates resource score from capacity', async () => {
    const config = await emergencyMatchingService.loadConfiguration();
    const resEval = await emergencyMatchingService.evaluateResourceAvailability(apexHeartHospital._id, config);
    expect(resEval.resourceScore).toBeGreaterThan(0);
    expect(resEval.freshnessStatus).toBe('FRESH');
  });

  // ── TEST 5: Stale Information Handling ───────────────────────────────────
  test('5. Stale Information Handling: marks stale resources and lowers freshness score', async () => {
    // Manually backdate resource updatedAt
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    await HealthcareResource.updateMany(
      { organizationId: apexHeartHospital._id },
      { $set: { updatedAt: threeHoursAgo } },
      { timestamps: false }
    );

    const config = await emergencyMatchingService.loadConfiguration();
    const resEval = await emergencyMatchingService.evaluateResourceAvailability(apexHeartHospital._id, config);
    expect(resEval.freshnessStatus).toBe('STALE');
  });

  // ── TEST 6: Doctor Presence Integration (Module 7) ───────────────────────
  test('6. Doctor Presence Integration: counts QR-checked-in doctors separately from availability', async () => {
    const config = await emergencyMatchingService.loadConfiguration();
    const presenceEval = await emergencyMatchingService.evaluateDoctorPresence(apexHeartHospital._id, config);
    expect(presenceEval.presentCount).toBe(1);
    expect(presenceEval.presenceScore).toBe(50);
  });

  // ── TEST 7: Doctor Availability Integration (Module 5) ───────────────────
  test('7. Doctor Availability Integration: evaluates declared emergency participation', async () => {
    const availEval = await emergencyMatchingService.evaluateDoctorEmergencyAvailability(apexHeartHospital._id);
    expect(availEval.availableCount).toBe(1);
    expect(availEval.specialistScore).toBe(50);
  });

  // ── TEST 8: Organization Verification Check ──────────────────────────────
  test('8. Organization Verification Check: unverified organization is marked unsuitable', async () => {
    const result = await emergencyMatchingService.runMatchingForRequest(emergencyReq1, { allowBeep: false });
    const unverifiedResult = result.unsuitableCandidates.find(
      (c) => c.org._id.toString() === unverifiedHospital._id.toString()
    );
    expect(unverifiedResult).toBeDefined();
    expect(unverifiedResult.unsuitable).toBe(true);
    expect(unverifiedResult.reasons).toContain('ORG_NOT_VERIFIED');
  });

  // ── TEST 9: Organization Participation Check ─────────────────────────────
  test('9. Organization Participation Check: non-participating organization excluded from suitable candidates', async () => {
    const result = await emergencyMatchingService.runMatchingForRequest(emergencyReq1, { allowBeep: false });
    const isNonPartSuitable = result.suitableCandidates.some(
      (c) => c.org._id.toString() === nonParticipatingHospital._id.toString()
    );
    expect(isNonPartSuitable).toBe(false);
  });

  // ── TEST 10: Distance and Travel-Time Calculation ────────────────────────
  test('10. Distance and Travel-Time Calculation: accurately computes straight-line distance and transit estimate', () => {
    const patientCoords = [77.2090, 28.6139];
    const facilityCoords = [77.2200, 28.6200];
    const dist = emergencyMatchingService.calculateDistance(patientCoords, facilityCoords);
    expect(dist).toBeGreaterThan(1);
    expect(dist).toBeLessThan(3);

    const travelMin = emergencyMatchingService.estimateTravelTime(dist);
    expect(travelMin).toBeGreaterThanOrEqual(5); // Minimum 5 mins
  });

  // ── TEST 11: Weighted Ranking Correctness ────────────────────────────────
  test('11. Weighted Ranking Correctness: applies multi-dimension weights properly', () => {
    const scores = {
      capabilityScore: 100,
      resourceScore: 80,
      specialistScore: 50,
      presenceScore: 50,
      travelTimeScore: 90,
      distanceScore: 85,
      freshnessScore: 100,
    };
    const weights = {
      capability: 0.30,
      resource: 0.20,
      specialist: 0.15,
      presence: 0.10,
      travelTime: 0.15,
      distance: 0.05,
      freshness: 0.05,
    };
    const weighted = emergencyMatchingService.calculateWeightedScore(scores, weights);
    expect(weighted).toBeGreaterThan(70);
    expect(weighted).toBeLessThanOrEqual(100);
  });

  // ── TEST 12: Unsuitable Nearest Hospital Exclusion ───────────────────────
  test('12. Unsuitable Nearest Hospital Exclusion: nearest clinic without mandatory cath lab is excluded', async () => {
    const result = await emergencyMatchingService.runMatchingForRequest(emergencyReq1, { allowBeep: false });
    const clinicResult = result.unsuitableCandidates.find(
      (c) => c.org._id.toString() === nearestClinicNoCath._id.toString()
    );
    expect(clinicResult).toBeDefined();
    expect(clinicResult.unsuitable).toBe(true);
    expect(clinicResult.reasons.some((r) => r.includes('MISSING_MANDATORY_CAPABILITY'))).toBe(true);

    // Verify Apex (further away at 2.5km) is ranked #1 because it has the required capabilities
    expect(result.suitableCandidates.length).toBeGreaterThan(0);
    expect(result.suitableCandidates[0].org._id.toString()).toBe(apexHeartHospital._id.toString());
  });

  // ── TEST 13: Search Radius Expansion ─────────────────────────────────────
  test('13. Search Radius Expansion: expands search radius when no candidates in initial 10km', async () => {
    // Delete Apex so only Far Specialty Hospital (35km away) is available
    await Organization.deleteOne({ _id: apexHeartHospital._id });

    const result = await emergencyMatchingService.runMatchingForRequest(emergencyReq1, { allowBeep: false });
    expect(result.radiusExpanded).toBe(true);
    expect(result.searchRadiusKm).toBe(50); // expanded to 50km
    expect(result.suitableCandidates.some((c) => c.org._id.toString() === farSpecialtyHospital._id.toString())).toBe(true);
  });

  // ── TEST 14: External Fallback Discovery ─────────────────────────────────
  test('14. External Fallback Discovery: discovers external facilities when all radii exhausted', async () => {
    // Delete all participating organizations
    await Organization.deleteMany({ isParticipating: true });

    const result = await emergencyMatchingService.runMatchingForRequest(emergencyReq1, { allowBeep: false });
    expect(result.totalSuitable).toBe(0);
    expect(result.totalFallback).toBeGreaterThan(0);
    expect(result.fallbackResults[0].suitabilityStatus).toBe('FALLBACK');
  });

  // ── TEST 15: Duplicate Matching Prevention ───────────────────────────────
  test('15. Duplicate Matching Prevention: endpoint returns existing match if already broadcasted', async () => {
    // First evaluation via HTTP endpoint
    const res1 = await request(app)
      .post(`/api/internal/emergency-matching/${emergencyReq1._id}/evaluate`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);

    // Second evaluation on already-broadcasted request
    const res2 = await request(app)
      .post(`/api/internal/emergency-matching/${emergencyReq1._id}/evaluate`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res2.status).toBe(200);
    expect(res2.body.data.alreadyMatched).toBe(true);
  });

  // ── TEST 16: Emergency Beep Integration ──────────────────────────────────
  test('16. Emergency Beep Integration: transitions request to BROADCASTED and creates broadcast records', async () => {
    const res = await request(app)
      .post(`/api/internal/emergency-matching/${emergencyReq1._id}/evaluate`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.status).toBe(200);

    const updatedReq = await EmergencyRequest.findById(emergencyReq1._id);
    expect(updatedReq.status).toBe('BROADCASTED');

    const broadcasts = await EmergencyBroadcast.find({ emergencyRequestId: emergencyReq1._id });
    expect(broadcasts.length).toBeGreaterThan(0);
    expect(broadcasts[0].responseStatus).toBe('PENDING');
  });

  // ── TEST 17: No Resource Reservation During Matching ─────────────────────
  test('17. No Resource Reservation During Matching: available capacity is unaffected by matching', async () => {
    const initialIcu = await HealthcareResource.findOne({
      organizationId: apexHeartHospital._id,
      resourceType: 'icu_bed',
    });
    const initialAvailable = initialIcu.availableCapacity;

    await emergencyMatchingService.runMatchingForRequest(emergencyReq1, { allowBeep: true });

    const postIcu = await HealthcareResource.findOne({
      organizationId: apexHeartHospital._id,
      resourceType: 'icu_bed',
    });
    // Critical safety requirement: matching must NEVER reserve or modify capacity
    expect(postIcu.availableCapacity).toBe(initialAvailable);

    // No ResourceReservation documents created
    const reservations = await ResourceReservation.find({ emergencyRequestId: emergencyReq1._id });
    expect(reservations.length).toBe(0);
  });
});

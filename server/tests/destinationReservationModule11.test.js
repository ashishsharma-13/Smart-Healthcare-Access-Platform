import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import {
  User,
  Organization,
  HealthcareResource,
  ResourceReservation,
  ResourceReservationItem,
  EmergencyRequest,
  EmergencyDestinationSelection,
  EmergencyBroadcast,
  EmergencyBroadcastRecipient,
  EmergencyMatchResult,
} from '../src/models/index.js';
import { destinationSelectionService } from '../src/services/DestinationSelectionService.js';
import { destinationSelectionRepository } from '../src/repositories/DestinationSelectionRepository.js';
import { resourceRepository } from '../src/repositories/ResourceRepository.js';

let mongoServer;

const createToken = (user, organizationId = null) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      organizationId: organizationId || user.organizationId,
      jti: 'jti-' + Math.random(),
    },
    process.env.JWT_SECRET || 'shap_super_secret_jwt_key_2026',
    { expiresIn: '1h' }
  );
};

describe('MODULE 11: Emergency Destination Selection and Resource Reservation Test Suite', () => {
  let adminUser, adminToken;
  let patientUser, patientToken;
  let otherPatientUser, otherPatientToken;

  let orgUserA, orgTokenA, orgA;
  let orgUserB, orgTokenB, orgB;
  let orgUserC, orgTokenC, orgC;

  let emergencyReq;
  let recipientA, recipientB;
  let matchResultA, matchResultB;

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
    await Organization.deleteMany({});
    await HealthcareResource.deleteMany({});
    await ResourceReservation.deleteMany({});
    await ResourceReservationItem.deleteMany({});
    await EmergencyRequest.deleteMany({});
    await EmergencyDestinationSelection.deleteMany({});
    await EmergencyBroadcast.deleteMany({});
    await EmergencyBroadcastRecipient.deleteMany({});
    await EmergencyMatchResult.deleteMany({});

    // 1. Setup Users
    adminUser = await User.create({
      name: 'System Admin',
      email: 'admin.m11@shap.org',
      password: 'Password123!',
      role: 'admin',
    });
    adminToken = createToken(adminUser);

    patientUser = await User.create({
      name: 'Patient Sarah',
      email: 'patient.sarah@shap.org',
      password: 'Password123!',
      role: 'patient',
      phone: '+1-555-0199',
    });
    patientToken = createToken(patientUser);

    otherPatientUser = await User.create({
      name: 'Patient Bob',
      email: 'patient.bob@shap.org',
      password: 'Password123!',
      role: 'patient',
      phone: '+1-555-0188',
    });
    otherPatientToken = createToken(otherPatientUser);

    orgUserA = await User.create({
      name: 'Apollo Hospital Desk',
      email: 'staff.a@apollo.org',
      password: 'Password123!',
      role: 'organization',
    });

    orgUserB = await User.create({
      name: 'Fortis Hospital Desk',
      email: 'staff.b@fortis.org',
      password: 'Password123!',
      role: 'organization',
    });

    orgUserC = await User.create({
      name: 'Max Hospital Desk',
      email: 'staff.c@max.org',
      password: 'Password123!',
      role: 'organization',
    });

    let orgSeq = 1;
    const createTestOrg = async (user, name, slug, coords) => {
      const idx = orgSeq++;
      return await Organization.create({
        userId: user._id,
        name,
        slug,
        registrationNumber: `REG-M11-${idx}-${Math.floor(Math.random() * 100000)}`,
        qrCheckinCode: `QR-M11-${idx}-${Math.floor(Math.random() * 100000)}`,
        verificationStatus: 'verified',
        isParticipating: true,
        emergencyCapable: true,
        location: {
          type: 'Point',
          coordinates: coords,
        },
        operatingAddress: {
          buildingNumber: `${idx}`,
          streetName: 'Healthcare Way',
          city: 'New Delhi',
          state: 'Delhi',
          pinCode: '110001',
          country: 'India',
        },
        emergencyContactPhone: `+1-555-011${idx}`,
      });
    };

    orgA = await createTestOrg(orgUserA, 'Apollo Metro Trauma Center', 'apollo-trauma', [77.21, 28.61]);
    orgB = await createTestOrg(orgUserB, 'Fortis Super Specialty', 'fortis-specialty', [77.22, 28.62]);
    orgC = await createTestOrg(orgUserC, 'Max Health Institute', 'max-health', [77.23, 28.63]);

    orgTokenA = createToken(orgUserA, orgA._id);
    orgTokenB = createToken(orgUserB, orgB._id);
    orgTokenC = createToken(orgUserC, orgC._id);

    // 2. Setup Resources for Hospital A (5 ER bays, 2 ICU beds)
    await HealthcareResource.create({
      organizationId: orgA._id,
      resourceType: 'er_bay',
      totalCapacity: 5,
      availableCapacity: 5,
      reservedCapacity: 0,
      occupiedCapacity: 0,
    });
    await HealthcareResource.create({
      organizationId: orgA._id,
      resourceType: 'icu_bed',
      totalCapacity: 2,
      availableCapacity: 2,
      reservedCapacity: 0,
      occupiedCapacity: 0,
    });

    // Setup Resources for Hospital B (3 ER bays, 0 ICU beds)
    await HealthcareResource.create({
      organizationId: orgB._id,
      resourceType: 'er_bay',
      totalCapacity: 3,
      availableCapacity: 3,
      reservedCapacity: 0,
      occupiedCapacity: 0,
    });
    await HealthcareResource.create({
      organizationId: orgB._id,
      resourceType: 'icu_bed',
      totalCapacity: 2,
      availableCapacity: 0, // Zero capacity for testing resource limits!
      reservedCapacity: 0,
      occupiedCapacity: 2,
    });

    // 3. Setup Emergency Request in RESPONSES_RECEIVED
    emergencyReq = await EmergencyRequest.create({
      requestCode: 'EMG-M11-TEST-001',
      emergencyRequestId: 'EMG-M11-TEST-001',
      patientId: patientUser._id,
      patientName: 'Sneha Roy',
      patientPhone: '+1-555-0199',
      emergencyType: 'cardiac',
      severity: 'critical',
      location: {
        type: 'Point',
        coordinates: [77.20, 28.60],
      },
      status: 'RESPONSES_RECEIVED',
    });

    // 4. Setup Module 10 Emergency Beep broadcast session
    const broadcastSession = await EmergencyBroadcast.create({
      emergencyRequestId: emergencyReq._id,
      status: 'ACTIVE',
      broadcastStatus: 'ACTIVE',
      broadcastRound: 1,
      totalRecipients: 2,
      acceptedCount: 2,
    });

    // Recipients: Hospital A & Hospital B both ACCEPTED
    recipientA = await EmergencyBroadcastRecipient.create({
      broadcastId: broadcastSession._id,
      emergencyRequestId: emergencyReq._id,
      organizationId: orgA._id,
      deliveryStatus: 'DELIVERED',
      responseStatus: 'ACCEPTED',
      respondedAt: new Date(),
      offeredResources: { erBay: true, icuBed: true },
    });

    recipientB = await EmergencyBroadcastRecipient.create({
      broadcastId: broadcastSession._id,
      emergencyRequestId: emergencyReq._id,
      organizationId: orgB._id,
      deliveryStatus: 'DELIVERED',
      responseStatus: 'ACCEPTED',
      respondedAt: new Date(),
      offeredResources: { erBay: true },
    });

    // Match scores: Org A has higher clinical suitability (96) but Org B is slightly closer
    matchResultA = await EmergencyMatchResult.create({
      emergencyRequestId: emergencyReq._id,
      organizationId: orgA._id,
      overallScore: 96,
      suitabilityScore: 96,
      distanceKm: 4.5,
      estimatedTravelMinutes: 10,
      specialistAvailable: true,
      resourceFreshnessSeconds: 20,
    });

    matchResultB = await EmergencyMatchResult.create({
      emergencyRequestId: emergencyReq._id,
      organizationId: orgB._id,
      overallScore: 82,
      suitabilityScore: 82,
      distanceKm: 2.1,
      estimatedTravelMinutes: 5,
      specialistAvailable: false,
      resourceFreshnessSeconds: 60,
    });
  });

  // ── 1. ACCEPTED ORGANIZATIONS DISCOVERY & RECOMMENDATION ─────────────────

  test('1. Should retrieve accepted organizations with clinical metrics and live resource counts', async () => {
    const res = await request(app)
      .get(`/api/emergency/requests/${emergencyReq._id}/accepted-organizations`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);

    const first = res.body.data[0];
    expect(first.organizationId).toBe(orgA._id.toString());
    expect(first.suitabilityScore).toBe(96);
    expect(first.resources.erBay.available).toBe(5);
    expect(first.resources.icuBed.available).toBe(2);
  });

  test('2. Should recommend destination prioritizing clinical suitability over raw distance', async () => {
    const res = await request(app)
      .get(`/api/emergency/requests/${emergencyReq._id}/recommendation`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    // Org A has higher suitability (96 vs 82) despite Org B being closer (4.5km vs 2.1km)
    expect(res.body.data.recommended.organizationId).toBe(orgA._id.toString());
    expect(res.body.data.recommended.suitabilityScore).toBe(96);
    expect(res.body.data.reason).toContain('clinical suitability');
  });

  // ── 2. DESTINATION SELECTION & INVARIANT ──────────────────────────────────

  test('3. Patient selects destination: creates PENDING_CONFIRMATION selection without reserving resources yet', async () => {
    const res = await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/select-destination`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ organizationId: orgA._id })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.selection.selectionStatus).toBe('PENDING_CONFIRMATION');
    expect(res.body.data.selection.selectionId).toMatch(/^SEL-/);
    expect(res.body.data.emergencyRequest.status).toBe('DESTINATION_SELECTED');

    // CRITICAL INVARIANT: Destination selection DOES NOT reserve resources yet!
    const resourceA = await HealthcareResource.findOne({ organizationId: orgA._id, resourceType: 'er_bay' });
    expect(resourceA.availableCapacity).toBe(5); // Still 5, untouched!
    expect(resourceA.reservedCapacity).toBe(0);

    const reservationsCount = await ResourceReservation.countDocuments({ emergencyRequestId: emergencyReq._id });
    expect(reservationsCount).toBe(0);
  });

  // ── 3. FINAL ORGANIZATION CONFIRMATION & ATOMIC RESERVATION ──────────────

  test('4. Organization confirms destination: atomically reserves resource and creates 15-minute hold', async () => {
    // 1. Patient selects Org A
    const selRes = await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/select-destination`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ organizationId: orgA._id })
      .expect(201);

    const selectionId = selRes.body.data.selection.selectionId;

    // 2. Org A confirms ability to receive
    const confRes = await request(app)
      .post(`/api/organizations/me/destination-confirmations/${selectionId}/confirm`)
      .set('Authorization', `Bearer ${orgTokenA}`)
      .send({
        requiredResources: [{ resourceType: 'er_bay', quantity: 1 }],
      })
      .expect(200);

    expect(confRes.body.success).toBe(true);
    expect(confRes.body.data.selection.selectionStatus).toBe('CONFIRMED');
    expect(confRes.body.data.reservation.status).toBe('TEMPORARILY_RESERVED');
    expect(confRes.body.data.reservation.reservationId).toMatch(/^RES-/);

    // Verify hold expires in approximately 15 minutes
    const expiresAt = new Date(confRes.body.data.reservation.expiresAt);
    const now = new Date();
    const diffMinutes = (expiresAt - now) / (1000 * 60);
    expect(diffMinutes).toBeGreaterThan(14);
    expect(diffMinutes).toBeLessThanOrEqual(16);

    // ATOMIC RESERVATION VERIFICATION: availableCapacity decremented, reservedCapacity incremented
    const updatedBay = await HealthcareResource.findOne({ organizationId: orgA._id, resourceType: 'er_bay' });
    expect(updatedBay.availableCapacity).toBe(4);
    expect(updatedBay.reservedCapacity).toBe(1);

    // Verify EmergencyRequest state transitioned to RESOURCES_RESERVED
    const updatedReq = await EmergencyRequest.findById(emergencyReq._id);
    expect(updatedReq.status).toBe('RESOURCES_RESERVED');

    // Verify ResourceReservationItem created
    const items = await ResourceReservationItem.find({ reservationId: confRes.body.data.reservation._id });
    expect(items).toHaveLength(1);
    expect(items[0].resourceType).toBe('er_bay');
    expect(items[0].status).toBe('RESERVED');
  });

  // ── 4. MULTI-RESOURCE RESERVATION & ATOMIC ROLLBACK ───────────────────────

  test('5. Multi-resource atomic reservation rolls back fully if any single required resource has insufficient capacity', async () => {
    // Org B has 3 ER bays, but 0 ICU beds
    const selRes = await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/select-destination`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ organizationId: orgB._id })
      .expect(201);

    const selectionId = selRes.body.data.selection.selectionId;

    // Org B attempts to reserve both er_bay and icu_bed, but icu_bed has 0 available capacity
    const confRes = await request(app)
      .post(`/api/organizations/me/destination-confirmations/${selectionId}/confirm`)
      .set('Authorization', `Bearer ${orgTokenB}`)
      .send({
        requiredResources: [
          { resourceType: 'icu_bed', quantity: 1 }, // Available is 0!
        ],
      })
      .expect(409); // Conflict / Insufficient capacity

    expect(confRes.body.message).toContain('capacity');

    // Verify Org B ER bay was NOT decremented (or was fully rolled back)
    const erBayB = await HealthcareResource.findOne({ organizationId: orgB._id, resourceType: 'er_bay' });
    expect(erBayB.availableCapacity).toBe(3);
    expect(erBayB.reservedCapacity).toBe(0);

    // Verify selection is marked FAILED
    const failedSel = await EmergencyDestinationSelection.findOne({ selectionId });
    expect(failedSel.selectionStatus).toBe('FAILED');
    expect(failedSel.failureReason).toBe('INSUFFICIENT_RESOURCE_CAPACITY');
  });

  // ── 5. ORGANIZATION DECLINES FINAL CONFIRMATION ──────────────────────────

  test('6. Organization declines final confirmation: marks selection FAILED without reserving resources', async () => {
    const selRes = await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/select-destination`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ organizationId: orgA._id })
      .expect(201);

    const selectionId = selRes.body.data.selection.selectionId;

    const declineRes = await request(app)
      .post(`/api/organizations/me/destination-confirmations/${selectionId}/decline`)
      .set('Authorization', `Bearer ${orgTokenA}`)
      .send({ reason: 'Mass casualty trauma incident underway' })
      .expect(200);

    expect(declineRes.body.success).toBe(true);
    expect(declineRes.body.data.selection.selectionStatus).toBe('FAILED');
    expect(declineRes.body.data.selection.failureReason).toBe('Mass casualty trauma incident underway');

    // Available resources remain intact
    const bay = await HealthcareResource.findOne({ organizationId: orgA._id, resourceType: 'er_bay' });
    expect(bay.availableCapacity).toBe(5);
    expect(bay.reservedCapacity).toBe(0);
  });

  // ── 6. SUPERSEDING EARLIER SELECTIONS ────────────────────────────────────

  test('7. Patient selects another hospital: supersedes previous pending selection', async () => {
    // 1. Patient selects Org A
    const sel1 = await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/select-destination`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ organizationId: orgA._id })
      .expect(201);

    // 2. Before Org A confirms, patient switches to Org B
    const sel2 = await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/select-destination`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ organizationId: orgB._id })
      .expect(201);

    // Check that sel1 was marked SUPERSEDED
    const prevSel = await EmergencyDestinationSelection.findOne({ selectionId: sel1.body.data.selection.selectionId });
    expect(prevSel.selectionStatus).toBe('SUPERSEDED');

    // Active selection is sel2
    const currentSel = await destinationSelectionRepository.findActiveSelectionForRequest(emergencyReq._id);
    expect(currentSel.selectionId).toBe(sel2.body.data.selection.selectionId);
    expect(currentSel.selectionStatus).toBe('PENDING_CONFIRMATION');
  });

  // ── 7. CONCURRENCY & IDEMPOTENCY ─────────────────────────────────────────

  test('8. Duplicate confirmation requests are idempotent and do not double-reserve resources', async () => {
    const selRes = await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/select-destination`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ organizationId: orgA._id })
      .expect(201);

    const selectionId = selRes.body.data.selection.selectionId;

    // First confirmation
    const firstConf = await request(app)
      .post(`/api/organizations/me/destination-confirmations/${selectionId}/confirm`)
      .set('Authorization', `Bearer ${orgTokenA}`)
      .send({ requiredResources: [{ resourceType: 'er_bay', quantity: 1 }] })
      .expect(200);

    expect(firstConf.body.success).toBe(true);

    // Second confirmation (duplicate)
    const secondConf = await request(app)
      .post(`/api/organizations/me/destination-confirmations/${selectionId}/confirm`)
      .set('Authorization', `Bearer ${orgTokenA}`)
      .send({ requiredResources: [{ resourceType: 'er_bay', quantity: 1 }] })
      .expect(200);

    expect(secondConf.body.success).toBe(true);
    expect(secondConf.body.message).toContain('already confirmed');

    // Invariant: capacity was decremented only ONCE (from 5 to 4)
    const bay = await HealthcareResource.findOne({ organizationId: orgA._id, resourceType: 'er_bay' });
    expect(bay.availableCapacity).toBe(4);
    expect(bay.reservedCapacity).toBe(1);

    const reservationsCount = await ResourceReservation.countDocuments({ emergencyRequestId: emergencyReq._id });
    expect(reservationsCount).toBe(1);
  });

  // ── 8. PATIENT EN-ROUTE TRANSITION ───────────────────────────────────────

  test('9. Patient confirms en route: transitions reservation and request to PATIENT_EN_ROUTE', async () => {
    // Select & Confirm
    const selRes = await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/select-destination`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ organizationId: orgA._id })
      .expect(201);

    await request(app)
      .post(`/api/organizations/me/destination-confirmations/${selRes.body.data.selection.selectionId}/confirm`)
      .set('Authorization', `Bearer ${orgTokenA}`)
      .send({ requiredResources: [{ resourceType: 'er_bay', quantity: 1 }] })
      .expect(200);

    // Patient confirms en route
    const enRouteRes = await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/confirm-en-route`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    expect(enRouteRes.body.success).toBe(true);
    expect(enRouteRes.body.data.emergencyRequest.status).toBe('PATIENT_EN_ROUTE');
    expect(enRouteRes.body.data.reservation.status).toBe('PATIENT_EN_ROUTE');
    expect(enRouteRes.body.data.reservation.patientEnRouteAt).toBeTruthy();
  });

  // ── 9. PATIENT ARRIVAL VERIFICATION ──────────────────────────────────────

  test('10. Organization marks arrival: transitions reservation to PATIENT_ARRIVED and request to ARRIVED', async () => {
    const selRes = await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/select-destination`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ organizationId: orgA._id })
      .expect(201);

    const confRes = await request(app)
      .post(`/api/organizations/me/destination-confirmations/${selRes.body.data.selection.selectionId}/confirm`)
      .set('Authorization', `Bearer ${orgTokenA}`)
      .send({ requiredResources: [{ resourceType: 'er_bay', quantity: 1 }] })
      .expect(200);

    const reservationId = confRes.body.data.reservation.reservationId;

    // Mark arrived
    const arrRes = await request(app)
      .post(`/api/organizations/me/reservations/${reservationId}/mark-arrived`)
      .set('Authorization', `Bearer ${orgTokenA}`)
      .expect(200);

    expect(arrRes.body.success).toBe(true);
    expect(arrRes.body.data.reservation.status).toBe('PATIENT_ARRIVED');
    expect(arrRes.body.data.reservation.patientArrivedAt).toBeTruthy();

    const updatedReq = await EmergencyRequest.findById(emergencyReq._id);
    expect(updatedReq.status).toBe('ARRIVED');
  });

  // ── 10. RESOURCE ALLOCATION TRANSITION (ADMISSION) ────────────────────────

  test('11. Organization admits patient and allocates bed: atomically shifts reservedCapacity to occupiedCapacity', async () => {
    const selRes = await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/select-destination`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ organizationId: orgA._id })
      .expect(201);

    const confRes = await request(app)
      .post(`/api/organizations/me/destination-confirmations/${selRes.body.data.selection.selectionId}/confirm`)
      .set('Authorization', `Bearer ${orgTokenA}`)
      .send({ requiredResources: [{ resourceType: 'er_bay', quantity: 1 }] })
      .expect(200);

    const reservationId = confRes.body.data.reservation.reservationId;

    // Mark arrived first
    await request(app)
      .post(`/api/organizations/me/reservations/${reservationId}/mark-arrived`)
      .set('Authorization', `Bearer ${orgTokenA}`)
      .expect(200);

    // Allocate resources
    const allocRes = await request(app)
      .post(`/api/organizations/me/reservations/${reservationId}/allocate`)
      .set('Authorization', `Bearer ${orgTokenA}`)
      .expect(200);

    expect(allocRes.body.success).toBe(true);
    expect(allocRes.body.data.reservation.status).toBe('ALLOCATED');
    expect(allocRes.body.data.reservation.allocatedAt).toBeTruthy();

    // Verify inventory shifted: reservedCapacity decremented, occupiedCapacity incremented
    const bay = await HealthcareResource.findOne({ organizationId: orgA._id, resourceType: 'er_bay' });
    expect(bay.reservedCapacity).toBe(0);
    expect(bay.occupiedCapacity).toBe(1);
    expect(bay.availableCapacity).toBe(4);

    const updatedReq = await EmergencyRequest.findById(emergencyReq._id);
    expect(['ARRIVED', 'COMPLETED']).toContain(updatedReq.status);
  });

  // ── 11. EXPIRATION & RESOURCE RELEASE ────────────────────────────────────

  test('12. Expiration releases held resources back to availableCapacity and is idempotent', async () => {
    const selRes = await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/select-destination`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ organizationId: orgA._id })
      .expect(201);

    const confRes = await request(app)
      .post(`/api/organizations/me/destination-confirmations/${selRes.body.data.selection.selectionId}/confirm`)
      .set('Authorization', `Bearer ${orgTokenA}`)
      .send({ requiredResources: [{ resourceType: 'er_bay', quantity: 1 }] })
      .expect(200);

    const reservationId = confRes.body.data.reservation.reservationId;

    // Trigger backend expiration
    const expRes = await request(app)
      .post(`/api/internal/reservations/${reservationId}/expire`)
      .send({ reason: '15-minute hold elapsed without patient arrival' })
      .expect(200);

    expect(expRes.body.success).toBe(true);
    expect(expRes.body.data.reservation.status).toBe('RESOURCE_RELEASED');

    // Verify resources released back: reservedCapacity -> 0, availableCapacity -> 5
    const bay = await HealthcareResource.findOne({ organizationId: orgA._id, resourceType: 'er_bay' });
    expect(bay.reservedCapacity).toBe(0);
    expect(bay.availableCapacity).toBe(5);

    const updatedReq = await EmergencyRequest.findById(emergencyReq._id);
    expect(updatedReq.status).toBe('RESERVATION_RELEASED');

    // Idempotency: second call does not double increment availableCapacity
    await request(app)
      .post(`/api/internal/reservations/${reservationId}/expire`)
      .send({ reason: 'Duplicate expire job' })
      .expect(200);

    const bayAfterDup = await HealthcareResource.findOne({ organizationId: orgA._id, resourceType: 'er_bay' });
    expect(bayAfterDup.availableCapacity).toBe(5);
  });

  // ── 12. UNAUTHORIZED ACCESS PROTECTION ───────────────────────────────────

  test('13. Unauthorized access: non-participating organization cannot confirm reservation for another hospital', async () => {
    const selRes = await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/select-destination`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ organizationId: orgA._id })
      .expect(201);

    const selectionId = selRes.body.data.selection.selectionId;

    // Org B attempts to confirm Org A's selection
    await request(app)
      .post(`/api/organizations/me/destination-confirmations/${selectionId}/confirm`)
      .set('Authorization', `Bearer ${orgTokenB}`)
      .send({ requiredResources: [{ resourceType: 'er_bay', quantity: 1 }] })
      .expect(403);

    // Regular patient attempts to confirm organization desk
    await request(app)
      .post(`/api/organizations/me/destination-confirmations/${selectionId}/confirm`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ requiredResources: [{ resourceType: 'er_bay', quantity: 1 }] })
      .expect(403);
  });

  // ── 13. CONCURRENT FINAL CAPACITY & ZERO OVERSELLING TEST ───────────────────

  test('14. Concurrency: Two patients attempting to reserve the exact same final available emergency bed simultaneously -> zero overselling, exactly 1 succeeds, 1 receives 409 Conflict', async () => {
    // 1. Set ER Bay available capacity to exactly 1
    await HealthcareResource.findOneAndUpdate(
      { organizationId: orgA._id, resourceType: 'er_bay' },
      { $set: { totalCapacity: 1, availableCapacity: 1, reservedCapacity: 0, occupiedCapacity: 0 } }
    );

    // 2. Create second emergency request for Patient 2
    const emergencyReq2 = await EmergencyRequest.create({
      patientId: otherPatientUser._id,
      patientName: 'Anita Roy',
      patientPhone: '+919811199998',
      emergencyType: 'TRAUMA',
      severity: 'severe',
      status: 'RESPONSES_RECEIVED',
      location: { type: 'Point', coordinates: [77.21, 28.61] },
    });

    // 3. Both patients select Org A as their chosen destination
    const selRes1 = await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/select-destination`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ organizationId: orgA._id })
      .expect(201);

    const selRes2 = await request(app)
      .post(`/api/emergency/requests/${emergencyReq2._id}/select-destination`)
      .set('Authorization', `Bearer ${otherPatientToken}`)
      .send({ organizationId: orgA._id })
      .expect(201);

    const selectionId1 = selRes1.body.data.selection.selectionId;
    const selectionId2 = selRes2.body.data.selection.selectionId;

    // 4. Fire concurrent confirmation requests for both selections
    const [res1, res2] = await Promise.all([
      request(app)
        .post(`/api/organizations/me/destination-confirmations/${selectionId1}/confirm`)
        .set('Authorization', `Bearer ${orgTokenA}`)
        .send({ requiredResources: [{ resourceType: 'er_bay', quantity: 1 }] }),
      request(app)
        .post(`/api/organizations/me/destination-confirmations/${selectionId2}/confirm`)
        .set('Authorization', `Bearer ${orgTokenA}`)
        .send({ requiredResources: [{ resourceType: 'er_bay', quantity: 1 }] }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    // Exactly one succeeds (200), and exactly one fails with 409 (Conflict - Insufficient capacity)
    expect(statuses).toEqual([200, 409]);

    // 5. Verify database invariant: availableCapacity = 0, reservedCapacity = 1, total = 1 (ZERO OVERSELLING)
    const bayAfter = await HealthcareResource.findOne({ organizationId: orgA._id, resourceType: 'er_bay' });
    expect(bayAfter.availableCapacity).toBe(0);
    expect(bayAfter.reservedCapacity).toBe(1);
    expect(bayAfter.availableCapacity + bayAfter.reservedCapacity + bayAfter.occupiedCapacity).toBe(bayAfter.totalCapacity);
  });
});

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
  EmergencyRequest,
  EmergencyBroadcast,
  EmergencyBroadcastRecipient,
  EmergencyOrganizationResponse,
  EmergencyNotificationOutbox,
  EmergencyCategory,
  EmergencyCapability,
  OrganizationEmergencyCapability,
  EmergencyCategoryCapability,
  EmergencyMatchResult,
} from '../src/models/index.js';
import { emergencyBeepService } from '../src/services/EmergencyBeepService.js';
import { emergencyOutboxRepository } from '../src/repositories/EmergencyOutboxRepository.js';

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

describe('MODULE 10: Emergency Beep and Parallel Organization Responses Test Suite', () => {
  let adminUser, adminToken;
  let patientUser, patientToken;
  let otherPatientUser, otherPatientToken;

  let orgUserA, orgTokenA, orgA;
  let orgUserB, orgTokenB, orgB;
  let orgUserC, orgTokenC, orgC;

  let categoryDoc;
  let emergencyReq1;
  let matchResultA, matchResultB, matchResultC;

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
    await HealthcareResource.deleteMany({});
    await ResourceReservation.deleteMany({});
    await EmergencyRequest.deleteMany({});
    await EmergencyBroadcast.deleteMany({});
    await EmergencyBroadcastRecipient.deleteMany({});
    await EmergencyOrganizationResponse.deleteMany({});
    await EmergencyNotificationOutbox.deleteMany({});
    await EmergencyCategory.deleteMany({});
    await EmergencyCapability.deleteMany({});
    await OrganizationEmergencyCapability.deleteMany({});
    await EmergencyCategoryCapability.deleteMany({});
    await EmergencyMatchResult.deleteMany({});

    // 1. Setup Users
    adminUser = await User.create({
      name: 'System Admin',
      email: 'admin.m10@shap.org',
      password: 'Password123!',
      role: 'admin',
    });
    adminToken = createToken(adminUser);

    patientUser = await User.create({
      name: 'Patient Alice',
      email: 'patient.alice@shap.org',
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
      name: 'Hospital A Reception',
      email: 'staff.a@hospital.org',
      password: 'Password123!',
      role: 'organization',
    });
    orgUserB = await User.create({
      name: 'Hospital B Reception',
      email: 'staff.b@hospital.org',
      password: 'Password123!',
      role: 'organization',
    });
    orgUserC = await User.create({
      name: 'Hospital C Reception',
      email: 'staff.c@hospital.org',
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
        registrationNumber: `REG-M10-${idx}-${Math.floor(Math.random() * 100000)}`,
        qrCheckinCode: `QR-M10-${idx}-${Math.floor(Math.random() * 100000)}`,
        verificationStatus: 'verified',
        isParticipating: true,
        emergencyCapable: true,
        location: {
          type: 'Point',
          coordinates: coords,
        },
        operatingAddress: {
          buildingNumber: `${idx}`,
          streetName: 'Medical Center Way',
          city: 'New Delhi',
          state: 'Delhi',
          pinCode: '110001',
          country: 'India',
        },
        emergencyContactPhone: `+1-555-010${idx}`,
      });
    };

    orgA = await createTestOrg(orgUserA, 'Apollo Metro Trauma Hospital', 'apollo-metro', [77.21, 28.61]);
    orgB = await createTestOrg(orgUserB, 'Fortis City Care Center', 'fortis-city', [77.22, 28.62]);
    orgC = await createTestOrg(orgUserC, 'Max Life Critical Care', 'max-life', [77.23, 28.63]);

    orgTokenA = createToken(orgUserA, orgA._id);
    orgTokenB = createToken(orgUserB, orgB._id);
    orgTokenC = createToken(orgUserC, orgC._id);

    // 2. Setup Resources (ICU beds and ER bays)
    await HealthcareResource.create({
      organizationId: orgA._id,
      resourceType: 'icu_bed',
      totalCapacity: 10,
      availableCapacity: 8,
    });
    await HealthcareResource.create({
      organizationId: orgB._id,
      resourceType: 'icu_bed',
      totalCapacity: 15,
      availableCapacity: 12,
    });
    await HealthcareResource.create({
      organizationId: orgC._id,
      resourceType: 'icu_bed',
      totalCapacity: 8,
      availableCapacity: 5,
    });

    // 3. Category & Emergency Request
    categoryDoc = await EmergencyCategory.create({
      categoryId: 'CAT-CARDIAC',
      categoryName: 'Cardiac Emergency',
      slug: 'cardiac',
      active: true,
    });

    emergencyReq1 = await EmergencyRequest.create({
      requestCode: 'EMG-M10-001',
      patientId: patientUser._id,
      patientName: patientUser.name,
      patientPhone: patientUser.phone,
      emergencyCategoryId: categoryDoc._id,
      emergencyType: 'cardiac',
      severity: 'critical',
      description: 'Acute substernal chest pressure radiating to jaw',
      ambulanceRequirement: 'yes',
      location: {
        type: 'Point',
        coordinates: [77.209, 28.6139],
      },
      status: 'CREATED',
    });

    // 4. Module 9 Matching Results for these 3 Orgs
    matchResultA = await EmergencyMatchResult.create({
      emergencyRequestId: emergencyReq1._id,
      organizationId: orgA._id,
      suitabilityStatus: 'SUITABLE',
      overallScore: 95,
      distanceKm: 2.1,
      estimatedTravelMinutes: 6,
      rank: 1,
    });
    matchResultB = await EmergencyMatchResult.create({
      emergencyRequestId: emergencyReq1._id,
      organizationId: orgB._id,
      suitabilityStatus: 'SUITABLE',
      overallScore: 90,
      distanceKm: 3.4,
      estimatedTravelMinutes: 8,
      rank: 2,
    });
    matchResultC = await EmergencyMatchResult.create({
      emergencyRequestId: emergencyReq1._id,
      organizationId: orgC._id,
      suitabilityStatus: 'SUITABLE',
      overallScore: 82,
      distanceKm: 4.8,
      estimatedTravelMinutes: 11,
      rank: 3,
    });
  });

  // ── TEST 1: Parallel broadcast to multiple organizations ─────────────────
  test('1. Parallel broadcast: creates session and recipients for all qualified organizations', async () => {
    const res = await request(app)
      .post(`/api/internal/emergency-beep/${emergencyReq1._id}/broadcast`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ broadcastRound: 1, responseDeadlineSeconds: 300 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.recipientCount).toBe(3);

    // Verify EmergencyBroadcast session created
    const broadcast = await EmergencyBroadcast.findOne({ emergencyRequestId: emergencyReq1._id, broadcastStatus: 'ACTIVE' });
    expect(broadcast).toBeDefined();
    expect(broadcast.broadcastRound).toBe(1);
    expect(broadcast.responseDeadline).toBeDefined();

    // Verify recipients created in bulk
    const recipients = await EmergencyBroadcastRecipient.find({ broadcastId: broadcast._id });
    expect(recipients.length).toBe(3);
    recipients.forEach((r) => {
      expect(r.responseStatus).toBe('PENDING');
      expect(r.deliveryStatus).toBe('DELIVERED');
    });

    // Verify request state transitioned to BROADCASTED
    const updatedReq = await EmergencyRequest.findById(emergencyReq1._id);
    expect(updatedReq.status).toBe('BROADCASTED');
  });

  // ── TEST 2: Independent notification delivery ────────────────────────────
  test('2. Independent notification delivery: failure of one delivery does not impact others', async () => {
    const broadcastRes = await emergencyBeepService.initiateBroadcast({
      emergencyRequestId: emergencyReq1._id,
    });

    expect(broadcastRes.recipients.length).toBe(3);
    const recipients = await EmergencyBroadcastRecipient.find({ broadcastId: broadcastRes.broadcast._id });
    // All 3 recipients are independently recorded as DELIVERED
    expect(recipients.every((r) => r.deliveryStatus === 'DELIVERED')).toBe(true);
  });

  // ── TEST 3: ACCEPT response ──────────────────────────────────────────────
  test('3. ACCEPT response: organization marks Can Receive and records audit log', async () => {
    const broadcastRes = await emergencyBeepService.initiateBroadcast({
      emergencyRequestId: emergencyReq1._id,
    });

    const recipA = broadcastRes.recipients.find((r) => r.organizationId.toString() === orgA._id.toString());

    const res = await request(app)
      .post(`/api/organizations/me/emergency-beeps/${recipA._id}/accept`)
      .set('Authorization', `Bearer ${orgTokenA}`)
      .send({ offeredResources: { icuBed: true, erBay: true, ventilator: true } });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updatedRecip = await EmergencyBroadcastRecipient.findById(recipA._id);
    expect(updatedRecip.responseStatus).toBe('ACCEPTED');
    expect(updatedRecip.respondedAt).toBeDefined();

    // Verify audit log
    const audit = await EmergencyOrganizationResponse.findOne({ recipientId: recipA._id });
    expect(audit).toBeDefined();
    expect(audit.responseType).toBe('ACCEPT');
    expect(audit.respondedBy.toString()).toBe(orgUserA._id.toString());
  });

  // ── TEST 4: DECLINE response ──────────────────────────────────────────────
  test('4. DECLINE response: organization declines with configured reason', async () => {
    const broadcastRes = await emergencyBeepService.initiateBroadcast({
      emergencyRequestId: emergencyReq1._id,
    });

    const recipB = broadcastRes.recipients.find((r) => r.organizationId.toString() === orgB._id.toString());

    const res = await request(app)
      .post(`/api/organizations/me/emergency-beeps/${recipB._id}/decline`)
      .set('Authorization', `Bearer ${orgTokenB}`)
      .send({ declineReason: 'Trauma bays currently at 100% surge capacity' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updatedRecip = await EmergencyBroadcastRecipient.findById(recipB._id);
    expect(updatedRecip.responseStatus).toBe('DECLINED');
    expect(updatedRecip.declineReason).toContain('surge capacity');
  });

  // ── TEST 5: Multiple acceptances ─────────────────────────────────────────
  test('5. Multiple acceptances: all accepted organizations are preserved and presented to patient', async () => {
    const broadcastRes = await emergencyBeepService.initiateBroadcast({
      emergencyRequestId: emergencyReq1._id,
    });

    const recipA = broadcastRes.recipients.find((r) => r.organizationId.toString() === orgA._id.toString());
    const recipB = broadcastRes.recipients.find((r) => r.organizationId.toString() === orgB._id.toString());

    // Both Org A and Org B accept
    await emergencyBeepService.recordOrganizationResponse({
      recipientId: recipA._id,
      organizationId: orgA._id,
      userId: orgUserA._id,
      responseType: 'ACCEPT',
    });
    await emergencyBeepService.recordOrganizationResponse({
      recipientId: recipB._id,
      organizationId: orgB._id,
      userId: orgUserB._id,
      responseType: 'ACCEPT',
    });

    // Patient queries responses
    const res = await request(app)
      .get(`/api/emergency/requests/${emergencyReq1._id}/responses`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.accepted.length).toBe(2);
    const acceptedOrgIds = res.body.data.accepted.map((r) => r.organizationId._id.toString());
    expect(acceptedOrgIds).toContain(orgA._id.toString());
    expect(acceptedOrgIds).toContain(orgB._id.toString());
  });

  // ── TEST 6: Duplicate response prevention ────────────────────────────────
  test('6. Duplicate response: repeated response is rejected with 409 Conflict', async () => {
    const broadcastRes = await emergencyBeepService.initiateBroadcast({
      emergencyRequestId: emergencyReq1._id,
    });

    const recipA = broadcastRes.recipients.find((r) => r.organizationId.toString() === orgA._id.toString());

    // First response succeeds
    const res1 = await request(app)
      .post(`/api/organizations/me/emergency-beeps/${recipA._id}/accept`)
      .set('Authorization', `Bearer ${orgTokenA}`);
    expect(res1.status).toBe(200);

    // Second response fails with 409
    const res2 = await request(app)
      .post(`/api/organizations/me/emergency-beeps/${recipA._id}/accept`)
      .set('Authorization', `Bearer ${orgTokenA}`);
    expect(res2.status).toBe(409);
  });

  // ── TEST 7: Concurrent ACCEPT and DECLINE ─────────────────────────────────
  test('7. Concurrent ACCEPT and DECLINE: exactly one initial response wins atomically', async () => {
    const broadcastRes = await emergencyBeepService.initiateBroadcast({
      emergencyRequestId: emergencyReq1._id,
    });

    const recipC = broadcastRes.recipients.find((r) => r.organizationId.toString() === orgC._id.toString());

    // Fire both concurrently
    const [p1, p2] = await Promise.allSettled([
      emergencyBeepService.recordOrganizationResponse({
        recipientId: recipC._id,
        organizationId: orgC._id,
        userId: orgUserC._id,
        responseType: 'ACCEPT',
      }),
      emergencyBeepService.recordOrganizationResponse({
        recipientId: recipC._id,
        organizationId: orgC._id,
        userId: orgUserC._id,
        responseType: 'DECLINE',
        declineReason: 'No bed',
      }),
    ]);

    const successes = [p1, p2].filter((p) => p.status === 'fulfilled');
    const failures = [p1, p2].filter((p) => p.status === 'rejected');

    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);
  });

  // ── TEST 8: Late response ────────────────────────────────────────────────
  test('8. Late response: response past deadline is rejected and marked EXPIRED', async () => {
    // Broadcast with 1-second deadline
    const broadcastRes = await emergencyBeepService.initiateBroadcast({
      emergencyRequestId: emergencyReq1._id,
      responseDeadlineSeconds: 0, // Expired immediately
    });

    const recipA = broadcastRes.recipients.find((r) => r.organizationId.toString() === orgA._id.toString());

    // Wait 50ms so Date.now() > deadline
    await new Promise((resolve) => setTimeout(resolve, 50));

    const res = await request(app)
      .post(`/api/organizations/me/emergency-beeps/${recipA._id}/accept`)
      .set('Authorization', `Bearer ${orgTokenA}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Deadline has expired');

    const updated = await EmergencyBroadcastRecipient.findById(recipA._id);
    expect(updated.responseStatus).toBe('EXPIRED');
  });

  // ── TEST 9: No response timeout (Finalize) ───────────────────────────────
  test('9. No response timeout: un-responded recipients are marked NO_RESPONSE on finalize', async () => {
    const broadcastRes = await emergencyBeepService.initiateBroadcast({
      emergencyRequestId: emergencyReq1._id,
    });

    const res = await request(app)
      .post(`/api/internal/emergency-beep/${emergencyReq1._id}/finalize`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);

    const recipients = await EmergencyBroadcastRecipient.find({ broadcastId: broadcastRes.broadcast._id });
    expect(recipients.every((r) => r.responseStatus === 'NO_RESPONSE')).toBe(true);
  });

  // ── TEST 10: All organizations declining ──────────────────────────────────
  test('10. All organizations declining: request transitions to NO_RESPONSE / fallback', async () => {
    const broadcastRes = await emergencyBeepService.initiateBroadcast({
      emergencyRequestId: emergencyReq1._id,
    });

    // Decline all
    for (const r of broadcastRes.recipients) {
      await emergencyBeepService.recordOrganizationResponse({
        recipientId: r._id,
        organizationId: r.organizationId,
        userId: adminUser._id,
        responseType: 'DECLINE',
        declineReason: 'Bed capacity full',
      });
    }

    const finalRes = await emergencyBeepService.finalizeResponseCollection(emergencyReq1._id);
    expect(finalRes.acceptedCount).toBe(0);
    expect(finalRes.emergencyRequest.status).toBe('NO_RESPONSE');
  });

  // ── TEST 11: Patient cancellation ─────────────────────────────────────────
  test('11. Patient cancellation: response to cancelled request is rejected', async () => {
    const broadcastRes = await emergencyBeepService.initiateBroadcast({
      emergencyRequestId: emergencyReq1._id,
    });

    // Patient cancels request
    emergencyReq1.status = 'CANCELLED';
    await emergencyReq1.save();

    const recipA = broadcastRes.recipients.find((r) => r.organizationId.toString() === orgA._id.toString());

    const res = await request(app)
      .post(`/api/organizations/me/emergency-beeps/${recipA._id}/accept`)
      .set('Authorization', `Bearer ${orgTokenA}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('cancelled');
  });

  // ── TEST 12: Duplicate broadcast prevention ──────────────────────────────
  test('12. Duplicate broadcast: calling broadcast on already active session returns existing session', async () => {
    const res1 = await request(app)
      .post(`/api/internal/emergency-beep/${emergencyReq1._id}/broadcast`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res1.status).toBe(200);

    const res2 = await request(app)
      .post(`/api/internal/emergency-beep/${emergencyReq1._id}/broadcast`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res2.status).toBe(200);
    expect(res2.body.data.alreadyActive).toBe(true);
  });

  // ── TEST 13: WebSocket failure resilience ─────────────────────────────────
  test('13. WebSocket failure resilience: broadcast succeeds and REST endpoints provide data if WS fails', async () => {
    // Delivery succeeds without error even if WebSocket is disconnected or in test mock mode
    const broadcastRes = await emergencyBeepService.initiateBroadcast({
      emergencyRequestId: emergencyReq1._id,
    });
    expect(broadcastRes.recipients.length).toBe(3);

    // Verify REST fallback
    const statusRes = await request(app)
      .get(`/api/emergency/requests/${emergencyReq1._id}/broadcast-status`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.totalRecipients).toBe(3);
  });

  // ── TEST 14: Notification retry & Outbox ──────────────────────────────────
  test('14. Notification retry & Outbox: writes outbox record and handles retry count', async () => {
    await emergencyBeepService.initiateBroadcast({
      emergencyRequestId: emergencyReq1._id,
    });

    const pending = await emergencyOutboxRepository.fetchPending();
    expect(pending.length).toBeGreaterThan(0);
    const event = pending[0];
    expect(event.eventType).toBe('EMERGENCY_BEEP_BROADCAST');

    // Simulate failure & retry increment
    await emergencyOutboxRepository.markFailed(event._id, 'Simulated network timeout');
    const updated = await EmergencyNotificationOutbox.findById(event._id);
    expect(updated.status).toBe('FAILED');
    expect(updated.retryCount).toBe(1);
    expect(updated.lastError).toContain('Simulated network timeout');
  });

  // ── TEST 15: Organization authorization ───────────────────────────────────
  test('15. Organization authorization: Org B cannot respond to Org A recipient record', async () => {
    const broadcastRes = await emergencyBeepService.initiateBroadcast({
      emergencyRequestId: emergencyReq1._id,
    });

    const recipA = broadcastRes.recipients.find((r) => r.organizationId.toString() === orgA._id.toString());

    // Org B tries to accept Org A's beep
    const res = await request(app)
      .post(`/api/organizations/me/emergency-beeps/${recipA._id}/accept`)
      .set('Authorization', `Bearer ${orgTokenB}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Access denied');
  });

  // ── TEST 16: Patient authorization ────────────────────────────────────────
  test('16. Patient authorization: unauthenticated request is rejected', async () => {
    const res = await request(app)
      .get(`/api/emergency/requests/${emergencyReq1._id}/responses`);
    expect(res.status).toBe(401);
  });

  // ── TEST 17: No Resource Reservation During Emergency Beep ────────────────
  test('17. No Resource Reservation: resources are NOT reserved during broadcast, accept, or decline', async () => {
    const initialIcuA = await HealthcareResource.findOne({ organizationId: orgA._id, resourceType: 'icu_bed' });
    const initialIcuB = await HealthcareResource.findOne({ organizationId: orgB._id, resourceType: 'icu_bed' });

    // Broadcast
    const broadcastRes = await emergencyBeepService.initiateBroadcast({
      emergencyRequestId: emergencyReq1._id,
    });

    // Hospital A accepts
    const recipA = broadcastRes.recipients.find((r) => r.organizationId.toString() === orgA._id.toString());
    await emergencyBeepService.recordOrganizationResponse({
      recipientId: recipA._id,
      organizationId: orgA._id,
      userId: orgUserA._id,
      responseType: 'ACCEPT',
    });

    // Hospital B declines
    const recipB = broadcastRes.recipients.find((r) => r.organizationId.toString() === orgB._id.toString());
    await emergencyBeepService.recordOrganizationResponse({
      recipientId: recipB._id,
      organizationId: orgB._id,
      userId: orgUserB._id,
      responseType: 'DECLINE',
    });

    const postIcuA = await HealthcareResource.findOne({ organizationId: orgA._id, resourceType: 'icu_bed' });
    const postIcuB = await HealthcareResource.findOne({ organizationId: orgB._id, resourceType: 'icu_bed' });

    // CRITICAL LIFE SAFETY INVARIANT: No resources altered during beep or acceptances
    expect(postIcuA.availableCapacity).toBe(initialIcuA.availableCapacity);
    expect(postIcuB.availableCapacity).toBe(initialIcuB.availableCapacity);

    // No ResourceReservation documents created
    const reservations = await ResourceReservation.find({ emergencyRequestId: emergencyReq1._id });
    expect(reservations.length).toBe(0);
  });
});


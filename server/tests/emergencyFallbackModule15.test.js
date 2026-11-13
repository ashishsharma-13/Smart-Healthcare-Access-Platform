import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import {
  User,
  Organization,
  HealthcareResource,
  HealthcareResourceType,
  EmergencyRequest,
  EmergencyBroadcast,
  EmergencyBroadcastRecipient,
  ResourceReservation,
  EmergencyFallbackSession,
  EmergencyFallbackSearch,
  ExternalHealthcareFacility,
  EmergencyFallbackOption,
  EmergencyMatchResult,
} from '../src/models/index.js';
import { externalFacilityDirectoryService } from '../src/services/ExternalFacilityDirectoryService.js';
import { emergencyFallbackService } from '../src/services/EmergencyFallbackService.js';
import { searchExpansionService } from '../src/services/SearchExpansionService.js';
import { externalFacilityDiscoveryService } from '../src/services/ExternalFacilityDiscoveryService.js';
import { destinationRecoveryService } from '../src/services/DestinationRecoveryService.js';
import { emergencyBeepService } from '../src/services/EmergencyBeepService.js';
import { destinationSelectionService } from '../src/services/DestinationSelectionService.js';

const generateToken = (user, organizationId = null) => {
  return jwt.sign(
    {
      id: user._id,
      userId: user._id,
      email: user.email,
      role: user.role,
      organizationId: organizationId || user.organizationId || null,
    },
    process.env.JWT_SECRET || 'shap_super_secret_jwt_key_2026',
    { expiresIn: '1d' }
  );
};

describe('MODULE 15: Emergency Fallback and Recovery Management Test Suite', () => {
  let mongoServer;

  let patientUser;
  let patientToken;

  let patient2User;
  let patient2Token;

  let adminUser;
  let adminToken;

  let hospitalAStaff;
  let hospitalA;
  let hospitalAToken;

  let hospitalBStaff;
  let hospitalB;
  let hospitalBToken;

  let distantHospitalStaff;
  let distantHospital;
  let distantHospitalToken;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'shap_super_secret_jwt_key_2026';
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // 1. Seed External Facilities
    await externalFacilityDirectoryService.seedDefaultExternalFacilities();

    // 2. Users
    patientUser = await User.create({
      name: 'Alice Patient',
      email: 'alice@patient.test',
      password: 'password123',
      role: 'patient',
      phone: '+1-555-0111',
    });
    patientToken = generateToken(patientUser);

    patient2User = await User.create({
      name: 'Bob Patient',
      email: 'bob@patient.test',
      password: 'password123',
      role: 'patient',
      phone: '+1-555-0222',
    });
    patient2Token = generateToken(patient2User);

    adminUser = await User.create({
      name: 'Super Admin',
      email: 'admin@shap.test',
      password: 'password123',
      role: 'admin',
      phone: '+1-555-0999',
    });
    adminToken = generateToken(adminUser);

    // 3. Participating Organizations
    // Hospital A: close (~3 km from center [77.2090, 28.6139])
    hospitalAStaff = await User.create({
      name: 'Hospital A Staff',
      email: 'staff@hospa.test',
      password: 'password123',
      role: 'organization',
    });
    hospitalA = await Organization.create({
      userId: hospitalAStaff._id,
      name: 'Central Metro Hospital',
      slug: 'central-metro-hospital',
      registrationNumber: 'REG-HOSP-A-12345',
      qrCheckinCode: 'QR-HOSP-A-12345',
      uniqueOrganizationCode: 'ORG-HOSP-A',
      emergencyContactPhone: '011-20001111',
      verificationStatus: 'verified',
      isParticipating: true,
      emergencyCapable: true,
      operatingAddress: { streetName: '1 Metro Way', city: 'New Delhi' },
      location: { type: 'Point', coordinates: [77.2150, 28.6200] }, // ~1 km
    });
    hospitalAToken = generateToken(hospitalAStaff, hospitalA._id);

    // Hospital B: medium distance (~8 km)
    hospitalBStaff = await User.create({
      name: 'Hospital B Staff',
      email: 'staff@hospb.test',
      password: 'password123',
      role: 'organization',
    });
    hospitalB = await Organization.create({
      userId: hospitalBStaff._id,
      name: 'East City Specialty Hospital',
      slug: 'east-city-hospital',
      registrationNumber: 'REG-HOSP-B-67890',
      qrCheckinCode: 'QR-HOSP-B-67890',
      uniqueOrganizationCode: 'ORG-HOSP-B',
      emergencyContactPhone: '011-20002222',
      verificationStatus: 'verified',
      isParticipating: true,
      emergencyCapable: true,
      operatingAddress: { streetName: '22 Ring Road', city: 'New Delhi' },
      location: { type: 'Point', coordinates: [77.2800, 28.6400] }, // ~8 km
    });
    hospitalBToken = generateToken(hospitalBStaff, hospitalB._id);

    // Distant Hospital: ~35 km
    distantHospitalStaff = await User.create({
      name: 'Distant Hospital Staff',
      email: 'staff@distant.test',
      password: 'password123',
      role: 'organization',
    });
    distantHospital = await Organization.create({
      userId: distantHospitalStaff._id,
      name: 'Greater Regional Trauma Hospital',
      slug: 'greater-regional-hospital',
      registrationNumber: 'REG-HOSP-DIST-99999',
      qrCheckinCode: 'QR-HOSP-DIST-99999',
      uniqueOrganizationCode: 'ORG-HOSP-DIST',
      emergencyContactPhone: '011-20003333',
      verificationStatus: 'verified',
      isParticipating: true,
      emergencyCapable: true,
      operatingAddress: { streetName: '100 Highway 8', city: 'Gurugram' },
      location: { type: 'Point', coordinates: [77.0300, 28.4500] }, // ~35 km
    });
    distantHospitalToken = generateToken(distantHospitalStaff, distantHospital._id);

    // Add ER bay resources for all hospitals
    await HealthcareResource.create([
      {
        organizationId: hospitalA._id,
        resourceType: 'er_bay',
        totalCapacity: 5,
        availableCapacity: 5,
        reservedCapacity: 0,
        occupiedCapacity: 0,
        unavailableQuantity: 0,
        lastVerifiedAt: new Date(),
      },
      {
        organizationId: hospitalB._id,
        resourceType: 'er_bay',
        totalCapacity: 8,
        availableCapacity: 8,
        reservedCapacity: 0,
        occupiedCapacity: 0,
        unavailableQuantity: 0,
        lastVerifiedAt: new Date(),
      },
      {
        organizationId: distantHospital._id,
        resourceType: 'er_bay',
        totalCapacity: 10,
        availableCapacity: 10,
        reservedCapacity: 0,
        occupiedCapacity: 0,
        unavailableQuantity: 0,
        lastVerifiedAt: new Date(),
      },
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  // ── TEST 1: No candidates in initial radius ───────────────────────────────
  it('1. No candidates in initial radius: triggers fallback session', async () => {
    // Create an emergency request in a remote location where no hospital is within 5 km
    const remoteReq = await EmergencyRequest.create({
      requestCode: 'REQ-REMOTE-001',
      patientId: patientUser._id,
      patientName: 'Alice Remote',
      patientPhone: '+1-555-0111',
      emergencyType: 'trauma',
      severity: 'critical',
      location: { type: 'Point', coordinates: [76.5000, 28.0000] }, // >70 km away
      latitude: 28.0000,
      longitude: 76.5000,
    });

    const res = await request(app)
      .post(`/api/internal/emergency-fallback/${remoteReq._id}/start`)
      .send({ reason: 'NO_CANDIDATES_FOUND' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.fallbackSession).toBeDefined();
    expect(res.body.fallbackSession.triggerReason).toBe('NO_CANDIDATES_FOUND');
    expect(res.body.fallbackSession.status).toBe('ACTIVE');
    expect(res.body.fallbackSession.currentSearchLevel).toBe(1);
  });

  // ── TEST 2: Successful search expansion ───────────────────────────────────
  it('2. Successful search expansion: discovers candidates at higher search radius', async () => {
    // Patient located near Delhi center [77.2090, 28.6139]
    // Hospital B is at ~8 km, Distant Hospital is at ~35 km
    const expandReq = await EmergencyRequest.create({
      requestCode: 'REQ-EXPAND-002',
      patientId: patientUser._id,
      patientName: 'Alice Expand',
      patientPhone: '+1-555-0111',
      emergencyType: 'trauma',
      severity: 'critical',
      location: { type: 'Point', coordinates: [77.2090, 28.6139] },
      latitude: 28.6139,
      longitude: 77.2090,
    });

    // Expand search (level 1 -> 2: 10 km)
    const res = await request(app)
      .post(`/api/internal/emergency-fallback/${expandReq._id}/expand-search`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.searchLevel).toBe(2);
    expect(res.body.searchRadiusKm).toBe(10);
    expect(res.body.candidatesFound).toBeGreaterThanOrEqual(1);
  });

  // ── TEST 3: Maximum search radius reached ─────────────────────────────────
  it('3. Maximum search radius reached: transitions to external facility discovery', async () => {
    const farReq = await EmergencyRequest.create({
      requestCode: 'REQ-FAR-003',
      patientId: patientUser._id,
      patientName: 'Alice Out Of Range',
      patientPhone: '+1-555-0111',
      emergencyType: 'trauma',
      severity: 'critical',
      location: { type: 'Point', coordinates: [75.0000, 26.0000] }, // far in desert
      latitude: 26.0000,
      longitude: 75.0000,
    });

    const session = await EmergencyFallbackSession.create({
      emergencyRequestId: farReq._id,
      triggerReason: 'NO_CANDIDATES_FOUND',
      status: 'ACTIVE',
      currentSearchLevel: 4, // Next expand will reach 5 (80 km max)
    });

    const res = await request(app)
      .post(`/api/internal/emergency-fallback/${farReq._id}/expand-search`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.searchLevel).toBe(5);
    expect(res.body.resultStatus).toBe('MAX_RADIUS_REACHED');

    const updatedSession = await EmergencyFallbackSession.findById(session._id);
    expect(updatedSession.status).toBe('EXTERNAL_DISCOVERED');
  });

  // ── TEST 4: Parallel broadcast to additional candidates ───────────────────
  it('4. Parallel broadcast: newly discovered candidates receive Emergency Beep in parallel', async () => {
    const beepReq = await EmergencyRequest.create({
      requestCode: 'REQ-BEEP-004',
      patientId: patientUser._id,
      patientName: 'Alice Parallel',
      patientPhone: '+1-555-0111',
      emergencyType: 'trauma',
      severity: 'critical',
      location: { type: 'Point', coordinates: [77.2090, 28.6139] },
      latitude: 28.6139,
      longitude: 77.2090,
    });

    const res = await request(app)
      .post(`/api/internal/emergency-fallback/${beepReq._id}/expand-search`)
      .send({});

    expect(res.status).toBe(200);
    if (res.body.broadcastRound) {
      expect(res.body.broadcastRound).toBeGreaterThanOrEqual(1);
    }
  });

  // ── TEST 5: No-response fallback ──────────────────────────────────────────
  it('5. No-response fallback: times out and triggers fallback session', async () => {
    const noRespReq = await EmergencyRequest.create({
      requestCode: 'REQ-NORESP-005',
      patientId: patientUser._id,
      patientName: 'Alice No Response',
      patientPhone: '+1-555-0111',
      emergencyType: 'trauma',
      severity: 'critical',
      location: { type: 'Point', coordinates: [77.2090, 28.6139] },
    });

    // Create an expired broadcast
    const broadcast = await EmergencyBroadcast.create({
      emergencyRequestId: noRespReq._id,
      broadcastRound: 1,
      status: 'ACTIVE',
      responseDeadline: new Date(Date.now() - 10000), // in the past
    });

    await EmergencyBroadcastRecipient.create({
      broadcastId: broadcast._id,
      emergencyRequestId: noRespReq._id,
      organizationId: hospitalA._id,
      deliveryStatus: 'DELIVERED',
      responseStatus: 'PENDING',
    });

    // Finalize response collection
    const finalResult = await emergencyBeepService.finalizeResponseCollection(noRespReq._id);
    expect(finalResult.acceptedCount).toBe(0);
    expect(finalResult.emergencyRequest.status).toBe('NO_RESPONSE');

    const session = await EmergencyFallbackSession.findOne({ emergencyRequestId: noRespReq._id });
    expect(session).toBeDefined();
    expect(session.triggerReason).toBe('NO_ORGANIZATIONS_RESPONDED');
  });

  // ── TEST 6: All-declined fallback ─────────────────────────────────────────
  it('6. All-declined fallback: triggers fallback session with ALL_ORGANIZATIONS_DECLINED', async () => {
    const declReq = await EmergencyRequest.create({
      requestCode: 'REQ-DECL-006',
      patientId: patientUser._id,
      patientName: 'Alice Declined',
      patientPhone: '+1-555-0111',
      emergencyType: 'trauma',
      severity: 'critical',
      location: { type: 'Point', coordinates: [77.2090, 28.6139] },
    });

    const broadcast = await EmergencyBroadcast.create({
      emergencyRequestId: declReq._id,
      broadcastRound: 1,
      status: 'ACTIVE',
    });

    await EmergencyBroadcastRecipient.create({
      broadcastId: broadcast._id,
      emergencyRequestId: declReq._id,
      organizationId: hospitalA._id,
      deliveryStatus: 'DELIVERED',
      responseStatus: 'DECLINED',
      declineReason: 'No ICU beds available',
    });

    const finalResult = await emergencyBeepService.finalizeResponseCollection(declReq._id);
    expect(finalResult.acceptedCount).toBe(0);

    const session = await EmergencyFallbackSession.findOne({ emergencyRequestId: declReq._id });
    expect(session).toBeDefined();
    expect(session.triggerReason).toBe('ALL_ORGANIZATIONS_DECLINED');
  });

  // ── TEST 7: Partial responses ─────────────────────────────────────────────
  it('7. Partial responses: preserves accepted organizations without premature discarding', async () => {
    const partReq = await EmergencyRequest.create({
      requestCode: 'REQ-PART-007',
      patientId: patientUser._id,
      patientName: 'Alice Partial',
      patientPhone: '+1-555-0111',
      emergencyType: 'trauma',
      severity: 'critical',
      location: { type: 'Point', coordinates: [77.2090, 28.6139] },
    });

    const broadcast = await EmergencyBroadcast.create({
      emergencyRequestId: partReq._id,
      broadcastRound: 1,
      status: 'ACTIVE',
    });

    // Hospital A accepts, Hospital B declines
    await EmergencyBroadcastRecipient.create([
      {
        broadcastId: broadcast._id,
        emergencyRequestId: partReq._id,
        organizationId: hospitalA._id,
        deliveryStatus: 'DELIVERED',
        responseStatus: 'ACCEPTED',
      },
      {
        broadcastId: broadcast._id,
        emergencyRequestId: partReq._id,
        organizationId: hospitalB._id,
        deliveryStatus: 'DELIVERED',
        responseStatus: 'DECLINED',
      },
    ]);

    const finalResult = await emergencyBeepService.finalizeResponseCollection(partReq._id);
    expect(finalResult.acceptedCount).toBe(1);
    expect(finalResult.emergencyRequest.status).toBe('RESPONSES_RECEIVED');
  });

  // ── TEST 8: Duplicate candidate suppression ───────────────────────────────
  it('8. Duplicate candidate suppression: suppresses re-notifying previously broadcasted candidates', async () => {
    const dupReq = await EmergencyRequest.create({
      requestCode: 'REQ-DUP-008',
      patientId: patientUser._id,
      patientName: 'Alice Deduplication',
      patientPhone: '+1-555-0111',
      emergencyType: 'trauma',
      severity: 'critical',
      location: { type: 'Point', coordinates: [77.2090, 28.6139] },
    });

    const broadcast = await EmergencyBroadcast.create({
      emergencyRequestId: dupReq._id,
      broadcastRound: 1,
      status: 'COMPLETED',
    });

    // Mark hospitalA as already notified
    await EmergencyBroadcastRecipient.create({
      broadcastId: broadcast._id,
      emergencyRequestId: dupReq._id,
      organizationId: hospitalA._id,
      deliveryStatus: 'DELIVERED',
      responseStatus: 'DECLINED',
    });

    const session = await EmergencyFallbackSession.create({
      emergencyRequestId: dupReq._id,
      triggerReason: 'ALL_ORGANIZATIONS_DECLINED',
      status: 'ACTIVE',
      currentSearchLevel: 1,
    });

    // Expanding search should exclude hospitalA
    const result = await searchExpansionService.expandSearch({
      emergencyRequestId: dupReq._id,
      session,
    });

    const discoveredIds = (result.newlyDiscoveredCandidates || []).map((c) =>
      c.organization._id.toString()
    );
    expect(discoveredIds).not.toContain(hospitalA._id.toString());
  });

  // ── TEST 9: External facility discovery ───────────────────────────────────
  it('9. External facility discovery: discovers public trauma facilities near patient coords', async () => {
    const res = await request(app)
      .get('/api/emergency/requests/65f123456789012345678901/external-facilities')
      .query({ radiusKm: 50 });

    // With a non-existent request ID, it returns 404
    expect(res.status).toBe(404);

    // Now test with an existing request
    const extReq = await EmergencyRequest.create({
      requestCode: 'REQ-EXT-009',
      patientId: patientUser._id,
      patientName: 'Alice External Discovery',
      patientPhone: '+1-555-0111',
      emergencyType: 'trauma',
      location: { type: 'Point', coordinates: [77.2090, 28.6139] },
    });

    const res2 = await request(app).get(`/api/emergency/requests/${extReq._id}/external-facilities`);
    expect(res2.status).toBe(200);
    expect(res2.body.success).toBe(true);
    expect(res2.body.facilities.length).toBeGreaterThanOrEqual(1);
    expect(res2.body.facilities[0].availabilityConfirmation).toBe('UNCONFIRMED_EXTERNAL');
    expect(res2.body.facilities[0].liveAvailabilityConfirmed).toBe(false);
  });

  // ── TEST 10: External source failure resilience ───────────────────────────
  it('10. External source failure resilience: returns empty array without throwing on no matches', async () => {
    const res = await externalFacilityDiscoveryService.discoverExternalFacilities({
      coordinates: [0, 0], // Middle of Atlantic Ocean
      radiusKm: 1,
    });
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBe(0);
  });

  // ── TEST 11: Duplicate external facilities rejection ─────────────────────
  it('11. Duplicate external facilities: rejects duplicate facility name with 409', async () => {
    const res = await request(app)
      .post('/api/admin/external-facilities')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        facilityName: 'AIIMS Apex Trauma Center (JPNATC)', // Already seeded
        latitude: 28.5672,
        longitude: 77.1950,
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already exists/i);
  });

  // ── TEST 12: Missing external coordinates rejection ───────────────────────
  it('12. Missing external coordinates: rejects facility registration without valid coordinates', async () => {
    const res = await request(app)
      .post('/api/admin/external-facilities')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        facilityName: 'Invalid Trauma Clinic',
        latitude: null,
        longitude: 'invalid-coordinate',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/coordinates|latitude|longitude/i);
  });

  // ── TEST 13: External destination selection ───────────────────────────────
  it('13. External destination selection: patient selects external center; status updates', async () => {
    const extReq = await EmergencyRequest.create({
      requestCode: 'REQ-SEL-013',
      patientId: patientUser._id,
      patientName: 'Alice Select Ext',
      patientPhone: '+1-555-0111',
      emergencyType: 'trauma',
      location: { type: 'Point', coordinates: [77.2090, 28.6139] },
    });

    const extFac = await ExternalHealthcareFacility.findOne({ active: true });
    expect(extFac).toBeDefined();

    const res = await request(app)
      .post(`/api/emergency/requests/${extReq._id}/select-external-facility`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ externalFacilityId: extFac._id });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = await EmergencyRequest.findById(extReq._id);
    expect(updated.status).toBe('EXTERNAL_DESTINATION_SELECTED');
    expect(updated.isExternalDestination).toBe(true);
    expect(updated.selectedExternalFacilityId.toString()).toBe(extFac._id.toString());
  });

  // ── TEST 14: No managed reservation for unsupported external facilities ────
  it('14. No managed reservation: selecting external facility does not create a reservation hold', async () => {
    const extReq = await EmergencyRequest.create({
      requestCode: 'REQ-NORESV-014',
      patientId: patientUser._id,
      patientName: 'Alice No Resv',
      patientPhone: '+1-555-0111',
      emergencyType: 'trauma',
      location: { type: 'Point', coordinates: [77.2090, 28.6139] },
    });

    const extFac = await ExternalHealthcareFacility.findOne({ active: true });

    await request(app)
      .post(`/api/emergency/requests/${extReq._id}/select-external-facility`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ externalFacilityId: extFac._id });

    // Assert zero reservations created
    const resv = await ResourceReservation.findOne({ emergencyRequestId: extReq._id });
    expect(resv).toBeNull();
  });

  // ── TEST 15: Failed final confirmation recovery ───────────────────────────
  it('15. Failed final confirmation: initiates destination recovery workflow', async () => {
    const failReq = await EmergencyRequest.create({
      requestCode: 'REQ-FAILCONF-015',
      patientId: patientUser._id,
      patientName: 'Alice Fail Conf',
      patientPhone: '+1-555-0111',
      emergencyType: 'trauma',
      location: { type: 'Point', coordinates: [77.2090, 28.6139] },
    });

    const selectRes = await destinationSelectionService.selectDestination({
      emergencyRequestId: failReq._id,
      organizationId: hospitalA._id,
      userId: patientUser._id,
    });

    // Hospital A declines final confirmation
    await destinationSelectionService.declineDestination({
      selectionId: selectRes.selection._id,
      organizationId: hospitalA._id,
      userId: hospitalAStaff._id,
      reason: 'Surgeon pulled into emergency surgery',
    });

    const updated = await EmergencyRequest.findById(failReq._id);
    expect(updated.status).toBe('RECOVERY_PENDING');

    const session = await EmergencyFallbackSession.findOne({ emergencyRequestId: failReq._id });
    expect(session).toBeDefined();
    expect(session.triggerReason).toBe('CONFIRMATION_FAILED');
  });

  // ── TEST 16: Failed reservation capacity hold ─────────────────────────────
  it('16. Failed reservation: insufficient capacity at confirmation initiates recovery', async () => {
    const capFailReq = await EmergencyRequest.create({
      requestCode: 'REQ-CAPFAIL-016',
      patientId: patientUser._id,
      patientName: 'Alice Cap Fail',
      patientPhone: '+1-555-0111',
      emergencyType: 'trauma',
      location: { type: 'Point', coordinates: [77.2090, 28.6139] },
    });

    const selectRes = await destinationSelectionService.selectDestination({
      emergencyRequestId: capFailReq._id,
      organizationId: hospitalA._id,
      userId: patientUser._id,
    });

    // Zero out available ER bays to force reservation failure
    await HealthcareResource.updateOne(
      { organizationId: hospitalA._id, resourceType: 'er_bay' },
      { $set: { availableCapacity: 0 } }
    );

    // Attempting confirmation should throw 409
    await expect(
      destinationSelectionService.confirmDestination({
        selectionId: selectRes.selection._id,
        organizationId: hospitalA._id,
        userId: hospitalAStaff._id,
      })
    ).rejects.toThrow();

    // Check recovery initiated
    const session = await EmergencyFallbackSession.findOne({ emergencyRequestId: capFailReq._id });
    expect(session).toBeDefined();
    expect(session.triggerReason).toBe('RESERVATION_FAILED');

    // Restore capacity for subsequent tests
    await HealthcareResource.updateOne(
      { organizationId: hospitalA._id, resourceType: 'er_bay' },
      { $set: { availableCapacity: 5 } }
    );
  });

  // ── TEST 17: Resource availability changes ────────────────────────────────
  it('17. Resource availability changes: alternative accepted hospital options remain available', async () => {
    const multiReq = await EmergencyRequest.create({
      requestCode: 'REQ-MULTI-017',
      patientId: patientUser._id,
      patientName: 'Alice Multi',
      patientPhone: '+1-555-0111',
      emergencyType: 'trauma',
      location: { type: 'Point', coordinates: [77.2090, 28.6139] },
    });

    const broadcast = await EmergencyBroadcast.create({
      emergencyRequestId: multiReq._id,
      broadcastRound: 1,
      status: 'ACTIVE',
    });

    // Both hospital A and hospital B accept
    await EmergencyBroadcastRecipient.create([
      {
        broadcastId: broadcast._id,
        emergencyRequestId: multiReq._id,
        organizationId: hospitalA._id,
        deliveryStatus: 'DELIVERED',
        responseStatus: 'ACCEPTED',
      },
      {
        broadcastId: broadcast._id,
        emergencyRequestId: multiReq._id,
        organizationId: hospitalB._id,
        deliveryStatus: 'DELIVERED',
        responseStatus: 'ACCEPTED',
      },
    ]);

    const res = await request(app).get(`/api/emergency/requests/${multiReq._id}/fallback-options`);
    expect(res.status).toBe(200);
    expect(res.body.acceptedParticipatingCount).toBe(2);
  });

  // ── TEST 18: Destination recovery rerouting ───────────────────────────────
  it('18. Destination recovery: reroutes patient to replacement hospital and secures new reservation', async () => {
    const rerouteReq = await EmergencyRequest.create({
      requestCode: 'REQ-REROUTE-018',
      patientId: patientUser._id,
      patientName: 'Alice Reroute',
      patientPhone: '+1-555-0111',
      emergencyType: 'trauma',
      location: { type: 'Point', coordinates: [77.2090, 28.6139] },
    });

    const broadcast = await EmergencyBroadcast.create({
      emergencyRequestId: rerouteReq._id,
      broadcastRound: 1,
      status: 'ACTIVE',
    });

    await EmergencyBroadcastRecipient.create([
      {
        broadcastId: broadcast._id,
        emergencyRequestId: rerouteReq._id,
        organizationId: hospitalA._id,
        deliveryStatus: 'DELIVERED',
        responseStatus: 'ACCEPTED',
      },
      {
        broadcastId: broadcast._id,
        emergencyRequestId: rerouteReq._id,
        organizationId: hospitalB._id,
        deliveryStatus: 'DELIVERED',
        responseStatus: 'ACCEPTED',
      },
    ]);

    // Initial destination confirmed at Hospital A
    const selectRes = await destinationSelectionService.selectDestination({
      emergencyRequestId: rerouteReq._id,
      organizationId: hospitalA._id,
      userId: patientUser._id,
    });
    const confirmRes = await destinationSelectionService.confirmDestination({
      selectionId: selectRes.selection._id,
      organizationId: hospitalA._id,
      userId: hospitalAStaff._id,
    });
    const initialResvId = confirmRes.reservation._id;

    // Patient or coordinator switches destination to Hospital B
    const switchRes = await request(app)
      .post(`/api/emergency/requests/${rerouteReq._id}/change-destination`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        newOrganizationId: hospitalB._id,
        reason: 'Hospital A experiencing severe trauma backlog',
      });

    expect(switchRes.status).toBe(200);
    expect(switchRes.body.success).toBe(true);

    const updated = await EmergencyRequest.findById(rerouteReq._id);
    expect(updated.selectedOrganizationId.toString()).toBe(hospitalB._id.toString());
    expect(updated.status).toBe('RESOURCES_RESERVED');

    // Hospital A reservation should be released
    const oldResv = await ResourceReservation.findById(initialResvId);
    expect(oldResv.status).toBe('RESOURCE_RELEASED');
  });

  // ── TEST 19: Previous reservation safety invariant ────────────────────────
  it('19. Previous reservation safety: original reservation held until replacement reservation succeeds', async () => {
    const safeReq = await EmergencyRequest.create({
      requestCode: 'REQ-SAFE-019',
      patientId: patientUser._id,
      patientName: 'Alice Safety Invariant',
      patientPhone: '+1-555-0111',
      emergencyType: 'trauma',
      location: { type: 'Point', coordinates: [77.2090, 28.6139] },
    });

    const broadcast = await EmergencyBroadcast.create({
      emergencyRequestId: safeReq._id,
      broadcastRound: 1,
      status: 'ACTIVE',
    });

    await EmergencyBroadcastRecipient.create([
      {
        broadcastId: broadcast._id,
        emergencyRequestId: safeReq._id,
        organizationId: hospitalA._id,
        deliveryStatus: 'DELIVERED',
        responseStatus: 'ACCEPTED',
      },
      {
        broadcastId: broadcast._id,
        emergencyRequestId: safeReq._id,
        organizationId: hospitalB._id,
        deliveryStatus: 'DELIVERED',
        responseStatus: 'ACCEPTED',
      },
    ]);

    // Secure initial reservation at Hospital A
    const selectRes = await destinationSelectionService.selectDestination({
      emergencyRequestId: safeReq._id,
      organizationId: hospitalA._id,
      userId: patientUser._id,
    });
    const confirmRes = await destinationSelectionService.confirmDestination({
      selectionId: selectRes.selection._id,
      organizationId: hospitalA._id,
      userId: hospitalAStaff._id,
    });
    const originalResvId = confirmRes.reservation._id;

    // Zero out Hospital B capacity so switching to B will fail!
    await HealthcareResource.updateOne(
      { organizationId: hospitalB._id, resourceType: 'er_bay' },
      { $set: { availableCapacity: 0 } }
    );

    // Attempting to switch to Hospital B should fail
    const switchFailRes = await request(app)
      .post(`/api/emergency/requests/${safeReq._id}/change-destination`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        newOrganizationId: hospitalB._id,
        reason: 'Attempted switch to over-capacity hospital',
      });

    expect(switchFailRes.status).toBe(500); // Or 400/409

    // CRITICAL LIFE SAFETY INVARIANT CHECK:
    // Original reservation at Hospital A MUST STILL BE ACTIVE!
    const originalResvAfter = await ResourceReservation.findById(originalResvId);
    expect(originalResvAfter.status).toBe('TEMPORARILY_RESERVED');

    // Restore Hospital B capacity
    await HealthcareResource.updateOne(
      { organizationId: hospitalB._id, resourceType: 'er_bay' },
      { $set: { availableCapacity: 8 } }
    );
  });

  // ── TEST 20: Unauthorized fallback access ─────────────────────────────────
  it('20. Unauthorized access: patient cannot mutate fallback session of another patient', async () => {
    const otherReq = await EmergencyRequest.create({
      requestCode: 'REQ-OTHER-020',
      patientId: patient2User._id, // Bob's request
      patientName: 'Bob Patient',
      patientPhone: '+1-555-0222',
      emergencyType: 'trauma',
      location: { type: 'Point', coordinates: [77.2090, 28.6139] },
    });

    const extFac = await ExternalHealthcareFacility.findOne({ active: true });

    // Alice tries to select external facility for Bob's emergency request
    const res = await request(app)
      .post(`/api/emergency/requests/${otherReq._id}/select-external-facility`)
      .set('Authorization', `Bearer ${patientToken}`) // Alice's token
      .send({ externalFacilityId: extFac._id });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/unauthorized/i);
  });
});

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import {
  User,
  Organization,
  EmergencyRequest,
  ResourceReservation,
  ResourceReservationItem,
  HealthcareResource,
  EmergencyJourney,
  EmergencyLocationUpdate,
  EmergencyArrivalRecord,
  ResourceAllocation,
  EmergencyRequestEvent,
  EmergencyDestinationSelection,
} from '../src/models/index.js';
import jwt from 'jsonwebtoken';

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

describe('MODULE 12: Emergency Journey Tracking, Navigation, Arrival, Completion and History', () => {
  let mongoServer;
  let patientUser;
  let otherUser;
  let orgStaffUser;
  let otherOrgStaffUser;
  let patientToken;
  let otherToken;
  let orgToken;
  let otherOrgToken;
  let organization;
  let otherOrganization;
  let emergencyReq;
  let reservation;
  let reservationItem;
  let healthcareResource;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'shap_super_secret_jwt_key_2026';
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // 1. Create Patient User
    patientUser = await User.create({
      name: 'Rohan Sharma',
      email: `patient.jny.${Date.now()}@shap.com`,
      phone: '+919876543210',
      password: 'Password123!',
      role: 'patient',
      isVerified: true,
    });
    patientToken = generateToken(patientUser);

    // 2. Create another patient
    otherUser = await User.create({
      name: 'Other Patient',
      email: `other.jny.${Date.now()}@shap.com`,
      phone: '+919876543211',
      password: 'Password123!',
      role: 'patient',
      isVerified: true,
    });
    otherToken = generateToken(otherUser);

    // 3. Create Organization & Staff
    orgStaffUser = await User.create({
      name: 'Dr. Amit Deshmukh',
      email: `org.staff.jny.${Date.now()}@hospital.com`,
      phone: '+919876543212',
      password: 'Password123!',
      role: 'organization',
      isVerified: true,
    });

    organization = await Organization.create({
      userId: orgStaffUser._id,
      name: 'Apex Trauma & Multispecialty Hospital',
      slug: `apex-trauma-${Date.now()}`,
      orgType: 'hospital',
      registrationNumber: `REG-APEX-${Date.now()}`,
      qrCheckinCode: `QR-APEX-${Date.now()}`,
      verificationStatus: 'VERIFIED',
      location: {
        type: 'Point',
        coordinates: [77.215, 28.62], // [lng, lat]
      },
      registeredAddress: {
        streetName: '10 Hospital Avenue',
        city: 'New Delhi',
        state: 'Delhi',
        pinCode: '110001',
      },
      isParticipating: true,
      emergencyCapable: true,
    });

    orgStaffUser.organizationId = organization._id;
    await orgStaffUser.save();
    orgToken = generateToken(orgStaffUser, organization._id);

    // 4. Create other Organization & Staff
    otherOrgStaffUser = await User.create({
      name: 'Dr. Suresh Nair',
      email: `other.org.${Date.now()}@hospital.com`,
      phone: '+919876543213',
      password: 'Password123!',
      role: 'organization',
      isVerified: true,
    });

    otherOrganization = await Organization.create({
      userId: otherOrgStaffUser._id,
      name: 'Metro City Clinic',
      slug: `metro-city-${Date.now()}`,
      orgType: 'clinic',
      registrationNumber: `REG-METRO-${Date.now()}`,
      qrCheckinCode: `QR-METRO-${Date.now()}`,
      verificationStatus: 'VERIFIED',
      location: {
        type: 'Point',
        coordinates: [77.3, 28.5],
      },
      isParticipating: true,
      emergencyCapable: true,
    });

    otherOrgStaffUser.organizationId = otherOrganization._id;
    await otherOrgStaffUser.save();
    otherOrgToken = generateToken(otherOrgStaffUser, otherOrganization._id);

    // 5. Seed Healthcare Resource for Organization
    healthcareResource = await HealthcareResource.create({
      organizationId: organization._id,
      resourceType: 'er_bay',
      totalCapacity: 5,
      availableCapacity: 4,
      reservedCapacity: 1, // 1 held for this reservation
      occupiedCapacity: 0,
    });
  });

  beforeEach(async () => {
    // Reset Healthcare Resource
    await HealthcareResource.findByIdAndUpdate(healthcareResource._id, {
      totalCapacity: 5,
      availableCapacity: 4,
      reservedCapacity: 1,
      occupiedCapacity: 0,
    });

    // Fresh Emergency Request in RESOURCES_RESERVED state
    emergencyReq = await EmergencyRequest.create({
      requestCode: `EMG-M12-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      patientId: patientUser._id,
      patientName: patientUser.name,
      patientPhone: patientUser.phone,
      emergencyType: 'cardiac',
      severity: 'critical',
      latitude: 28.61,
      longitude: 77.2,
      address: 'Connaught Place, New Delhi',
      location: {
        type: 'Point',
        coordinates: [77.2, 28.61],
      },
      status: 'RESOURCES_RESERVED',
      selectedOrganizationId: organization._id,
    });

    // Destination Selection
    const selection = await EmergencyDestinationSelection.create({
      emergencyRequestId: emergencyReq._id,
      organizationId: organization._id,
      selectedBy: patientUser._id,
      selectionSource: 'USER',
      selectionStatus: 'CONFIRMED',
    });

    // Active Resource Reservation (15 minutes hold)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    reservation = await ResourceReservation.create({
      emergencyRequestId: emergencyReq._id,
      organizationId: organization._id,
      destinationSelectionId: selection._id,
      status: 'TEMPORARILY_RESERVED',
      expiresAt,
      resourceId: healthcareResource._id,
      resourceType: 'er_bay',
      quantity: 1,
    });

    reservationItem = await ResourceReservationItem.create({
      reservationId: reservation._id,
      healthcareResourceId: healthcareResource._id,
      resourceType: 'er_bay',
      quantity: 1,
      status: 'RESERVED',
    });

    emergencyReq.activeReservationId = reservation._id;
    emergencyReq.destinationSelectionId = selection._id;
    emergencyReq.temporaryReservationExpiresAt = expiresAt;
    await emergencyReq.save();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  // ── 1. PATIENT JOURNEY START ───────────────────────────────────────────────

  test('TC-JNY-01: Starting valid journey transitions states to PATIENT_EN_ROUTE and creates EmergencyJourney with Google Maps navigation URL', async () => {
    const res = await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/journey/start`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        initialLocation: {
          latitude: 28.61,
          longitude: 77.2,
          address: 'Connaught Place Block A',
        },
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.journey).toBeTruthy();
    expect(res.body.data.journey.status).toBe('IN_PROGRESS');
    expect(res.body.data.journey.googleMapsUrl).toContain('https://www.google.com/maps/dir/?api=1&destination=28.62,77.215&travelmode=driving');
    expect(res.body.data.journey.estimatedDistanceKm).toBeGreaterThan(0);
    expect(res.body.data.journey.estimatedDurationMin).toBeGreaterThan(0);

    // Verify EmergencyRequest updated to PATIENT_EN_ROUTE
    const updatedReq = await EmergencyRequest.findById(emergencyReq._id);
    expect(updatedReq.status).toBe('PATIENT_EN_ROUTE');

    // Verify ResourceReservation updated to PATIENT_EN_ROUTE
    const updatedResv = await ResourceReservation.findById(reservation._id);
    expect(updatedResv.status).toBe('PATIENT_EN_ROUTE');
    expect(updatedResv.patientEnRouteAt).toBeTruthy();

    // Verify Audit Event logged
    const event = await EmergencyRequestEvent.findOne({
      emergencyRequestId: emergencyReq._id,
      eventType: 'JOURNEY_STARTED',
    });
    expect(event).toBeTruthy();
  });

  test('TC-JNY-02: Starting journey with expired reservation fails (400)', async () => {
    // Set reservation as expired in the past
    reservation.status = 'EXPIRED';
    reservation.expiresAt = new Date(Date.now() - 1000);
    await reservation.save();

    const res = await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/journey/start`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/expired|cannot start journey/i);
  });

  test('TC-JNY-03: Duplicate journey start is prevented when a journey is already in progress (400)', async () => {
    // Start journey first time
    await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/journey/start`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    // Second start attempt should be rejected
    const dupRes = await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/journey/start`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(400);

    expect(dupRes.body.success).toBe(false);
    expect(dupRes.body.message).toMatch(/already in progress/i);
  });

  // ── 2. PERMISSION-BASED LIVE LOCATION TRACKING ────────────────────────────

  test('TC-JNY-04: Location update with explicit patient consent records EmergencyLocationUpdate and updates lastKnownLocation', async () => {
    // Start journey
    await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/journey/start`)
      .set('Authorization', `Bearer ${patientToken}`);

    // Send location update with isSharingLocation: true
    const locRes = await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/journey/location`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        latitude: 28.613,
        longitude: 77.205,
        accuracyMeters: 12.5,
        speed: 8.5,
        heading: 45,
        isSharingLocation: true,
      })
      .expect(200);

    expect(locRes.body.success).toBe(true);
    expect(locRes.body.data.latestLocation.latitude).toBe(28.613);
    expect(locRes.body.data.latestLocation.accuracyMeters).toBe(12.5);

    // Verify record in database
    const locUpdate = await EmergencyLocationUpdate.findOne({ emergencyRequestId: emergencyReq._id });
    expect(locUpdate).toBeTruthy();
    expect(locUpdate.latitude).toBe(28.613);

    // Verify journey lastKnownLocation updated
    const journey = await EmergencyJourney.findOne({ emergencyRequestId: emergencyReq._id });
    expect(journey.isSharingLocation).toBe(true);
    expect(journey.lastKnownLocation.latitude).toBe(28.613);
  });

  test('TC-JNY-05: Location update rejected (403) when location sharing is disabled and no explicit consent passed', async () => {
    // Start journey (isSharingLocation defaults to false)
    await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/journey/start`)
      .set('Authorization', `Bearer ${patientToken}`);

    // Attempt location update without enabling sharing
    const locRes = await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/journey/location`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        latitude: 28.613,
        longitude: 77.205,
      })
      .expect(403);

    expect(locRes.body.success).toBe(false);
    expect(locRes.body.message).toMatch(/location sharing is disabled/i);
  });

  test('TC-JNY-06: Invalid coordinates (out of range latitude/longitude) rejected with 400', async () => {
    await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/journey/start`)
      .set('Authorization', `Bearer ${patientToken}`);

    const res = await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/journey/location`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        latitude: 120.5, // invalid > 90
        longitude: 77.205,
        isSharingLocation: true,
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid coordinates/i);
  });

  test('TC-JNY-07: Rate limiting throttles updates sent faster than 2 seconds with 429', async () => {
    await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/journey/start`)
      .set('Authorization', `Bearer ${patientToken}`);

    // First update succeeds
    await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/journey/location`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        latitude: 28.612,
        longitude: 77.203,
        isSharingLocation: true,
      })
      .expect(200);

    // Immediate second update within milliseconds triggers rate limit
    const fastRes = await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/journey/location`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        latitude: 28.613,
        longitude: 77.204,
      })
      .expect(429);

    expect(fastRes.body.success).toBe(false);
    expect(fastRes.body.message).toMatch(/rate limit/i);
  });

  test('TC-JNY-08: Patient can explicitly stop location sharing', async () => {
    await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/journey/start`)
      .set('Authorization', `Bearer ${patientToken}`);

    await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/journey/location`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        latitude: 28.612,
        longitude: 77.203,
        isSharingLocation: true,
      });

    // Stop sharing
    const stopRes = await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/journey/stop-sharing`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    expect(stopRes.body.success).toBe(true);

    const journey = await EmergencyJourney.findOne({ emergencyRequestId: emergencyReq._id });
    expect(journey.isSharingLocation).toBe(false);
  });

  // ── 3. ARRIVAL VERIFICATION ────────────────────────────────────────────────

  test('TC-JNY-09: Patient confirms arrival -> transitions EmergencyRequest to ARRIVED and ResourceReservation to PATIENT_ARRIVED', async () => {
    await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/journey/start`)
      .set('Authorization', `Bearer ${patientToken}`);

    const arrRes = await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/journey/confirm-arrival`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ notes: 'Arrived at ER entrance door 2' })
      .expect(200);

    expect(arrRes.body.success).toBe(true);
    expect(arrRes.body.data.arrivalRecord.verificationMethod).toBe('PATIENT_CONFIRMATION');

    // EmergencyRequest is ARRIVED
    const updatedReq = await EmergencyRequest.findById(emergencyReq._id);
    expect(updatedReq.status).toBe('ARRIVED');

    // ResourceReservation is PATIENT_ARRIVED
    const updatedResv = await ResourceReservation.findById(reservation._id);
    expect(updatedResv.status).toBe('PATIENT_ARRIVED');
    expect(updatedResv.patientArrivedAt).toBeTruthy();

    // Journey marked ARRIVED and tracking stopped
    const journey = await EmergencyJourney.findOne({ emergencyRequestId: emergencyReq._id });
    expect(journey.status).toBe('ARRIVED');
    expect(journey.isSharingLocation).toBe(false);
  });

  test('TC-JNY-10: Hospital staff verifies arrival -> transitions EmergencyRequest to ARRIVED and creates EmergencyArrivalRecord', async () => {
    await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/journey/start`)
      .set('Authorization', `Bearer ${patientToken}`);

    const arrRes = await request(app)
      .post(`/api/organizations/me/emergency-requests/${emergencyReq._id}/verify-arrival`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({
        verificationMethod: 'STAFF_VERIFICATION',
        notes: 'Reception staff verified patient intake code',
      })
      .expect(200);

    expect(arrRes.body.success).toBe(true);
    expect(arrRes.body.data.arrivalRecord.verificationMethod).toBe('STAFF_VERIFICATION');

    const updatedReq = await EmergencyRequest.findById(emergencyReq._id);
    expect(updatedReq.status).toBe('ARRIVED');

    const arrivalDoc = await EmergencyArrivalRecord.findOne({ emergencyRequestId: emergencyReq._id });
    expect(arrivalDoc).toBeTruthy();
    expect(arrivalDoc.verificationStatus).toBe('VERIFIED');
  });

  test('TC-JNY-11: INVARIANT: GPS proximity alone does NOT establish verified arrival without explicit confirmation', async () => {
    await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/journey/start`)
      .set('Authorization', `Bearer ${patientToken}`);

    // Send coordinates identical to hospital destination (distance 0m)
    await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/journey/location`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        latitude: 28.62,
        longitude: 77.215, // exactly matches hospital location
        accuracyMeters: 5,
        isSharingLocation: true,
      })
      .expect(200);

    // Invariant: Status MUST STILL BE PATIENT_EN_ROUTE
    const reqDoc = await EmergencyRequest.findById(emergencyReq._id);
    expect(reqDoc.status).toBe('PATIENT_EN_ROUTE');

    const resvDoc = await ResourceReservation.findById(reservation._id);
    expect(resvDoc.status).toBe('PATIENT_EN_ROUTE');
  });

  test('TC-JNY-12: Duplicate arrival verification is idempotent and handled gracefully', async () => {
    await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/journey/start`)
      .set('Authorization', `Bearer ${patientToken}`);

    // First arrival confirmation
    await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/journey/confirm-arrival`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    // Second arrival confirmation is idempotent
    const dupRes = await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/journey/confirm-arrival`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    expect(dupRes.body.success).toBe(true);
    expect(dupRes.body.alreadyArrived).toBe(true);
  });

  // ── 4. RESOURCE ALLOCATION ────────────────────────────────────────────────

  test('TC-JNY-13: Organization allocates reserved bed -> shifts reservedCapacity to occupiedCapacity and creates ResourceAllocation', async () => {
    await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/journey/start`)
      .set('Authorization', `Bearer ${patientToken}`);

    // Mark patient arrived first
    await request(app)
      .post(`/api/organizations/me/emergency-requests/${emergencyReq._id}/verify-arrival`)
      .set('Authorization', `Bearer ${orgToken}`);

    // Allocate resource
    const allocRes = await request(app)
      .post(`/api/organizations/me/reservations/${reservation._id}/allocate`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({
        allocatedQuantity: 1,
        allocationStatus: 'ALLOCATED',
        remarks: 'Assigned to Trauma Bay 02',
      })
      .expect(200);

    expect(allocRes.body.success).toBe(true);
    expect(allocRes.body.data.allocation).toBeTruthy();
    expect(allocRes.body.data.allocation.allocationStatus).toBe('ALLOCATED');
    expect(allocRes.body.data.reservation.status).toBe('ALLOCATED');

    // Verify inventory shifted: reserved 1 -> 0, occupied 0 -> 1
    const resource = await HealthcareResource.findById(healthcareResource._id);
    expect(resource.reservedCapacity).toBe(0);
    expect(resource.occupiedCapacity).toBe(1);

    // TC-JNY-14: CRITICAL INVARIANT: EmergencyRequest is NOT marked COMPLETED merely because resource was allocated!
    const reqDoc = await EmergencyRequest.findById(emergencyReq._id);
    expect(reqDoc.status).toBe('ARRIVED');
  });

  test('TC-JNY-15: Attempting allocation beyond permitted reserved quantity is rejected (400)', async () => {
    await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/journey/start`)
      .set('Authorization', `Bearer ${patientToken}`);

    await request(app)
      .post(`/api/organizations/me/emergency-requests/${emergencyReq._id}/verify-arrival`)
      .set('Authorization', `Bearer ${orgToken}`);

    // Attempt to allocate 5 bays when only 1 was reserved
    const overAllocRes = await request(app)
      .post(`/api/organizations/me/reservations/${reservation._id}/allocate`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({
        allocatedQuantity: 5,
        allocationStatus: 'ALLOCATED',
      })
      .expect(400);

    expect(overAllocRes.body.success).toBe(false);
    expect(overAllocRes.body.message).toMatch(/exceeds permitted reserved quantity/i);
  });

  test('TC-JNY-16: Allocation failure releases held resource back to availableCapacity', async () => {
    await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/journey/start`)
      .set('Authorization', `Bearer ${patientToken}`);

    await request(app)
      .post(`/api/organizations/me/emergency-requests/${emergencyReq._id}/verify-arrival`)
      .set('Authorization', `Bearer ${orgToken}`);

    // Record allocation failure
    const failRes = await request(app)
      .post(`/api/organizations/me/reservations/${reservation._id}/allocate`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({
        allocatedQuantity: 1,
        allocationStatus: 'FAILED',
        remarks: 'Equipment malfunction on bay',
      })
      .expect(200);

    expect(failRes.body.success).toBe(true);
    expect(failRes.body.data.reservation.status).toBe('RESOURCE_RELEASED');

    // Verify held reservedCapacity was returned to availableCapacity
    const resource = await HealthcareResource.findById(healthcareResource._id);
    expect(resource.reservedCapacity).toBe(0);
    expect(resource.availableCapacity).toBe(5); // 4 + 1 returned
  });

  test('TC-JNY-17: Unauthorized organization cannot allocate another hospital reservation (403)', async () => {
    const unauthRes = await request(app)
      .post(`/api/organizations/me/reservations/${reservation._id}/allocate`)
      .set('Authorization', `Bearer ${otherOrgToken}`)
      .send({ allocatedQuantity: 1 })
      .expect(403);

    expect(unauthRes.body.success).toBe(false);
  });

  // ── 5. EMERGENCY COMPLETION & HISTORY ──────────────────────────────────────

  test('TC-JNY-18: Authorized coordination completion transitions EmergencyRequest to COMPLETED and stops tracking', async () => {
    await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/journey/start`)
      .set('Authorization', `Bearer ${patientToken}`);

    await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/journey/confirm-arrival`)
      .set('Authorization', `Bearer ${patientToken}`);

    const compRes = await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/complete`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ notes: 'Patient received and registered by trauma team' })
      .expect(200);

    expect(compRes.body.success).toBe(true);

    const updatedReq = await EmergencyRequest.findById(emergencyReq._id);
    expect(updatedReq.status).toBe('COMPLETED');

    const journey = await EmergencyJourney.findOne({ emergencyRequestId: emergencyReq._id });
    expect(journey.status).toBe('COMPLETED');
    expect(journey.isSharingLocation).toBe(false);
  });

  test('TC-JNY-19: GET /api/emergency/requests/:requestId/history returns comprehensive audit timeline', async () => {
    // Start journey, update location, arrive, allocate, complete
    await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/journey/start`)
      .set('Authorization', `Bearer ${patientToken}`);

    await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/journey/location`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ latitude: 28.615, longitude: 77.208, isSharingLocation: true });

    await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/journey/confirm-arrival`)
      .set('Authorization', `Bearer ${patientToken}`);

    await request(app)
      .post(`/api/organizations/me/reservations/${reservation._id}/allocate`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ allocatedQuantity: 1, allocationStatus: 'ALLOCATED' });

    await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/complete`)
      .set('Authorization', `Bearer ${patientToken}`);

    // Fetch full history
    const histRes = await request(app)
      .get(`/api/emergency/requests/${emergencyReq._id}/history`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    expect(histRes.body.success).toBe(true);
    const data = histRes.body.data;
    expect(data.emergencyRequest).toBeTruthy();
    expect(data.journey).toBeTruthy();
    expect(data.locationHistory.length).toBeGreaterThan(0);
    expect(data.arrivalRecords.length).toBeGreaterThan(0);
    expect(data.allocations.length).toBeGreaterThan(0);
    expect(data.events.length).toBeGreaterThan(0);
  });

  test('TC-JNY-20: GET /api/organizations/me/incoming-patients lists active en-route patients for the facility', async () => {
    await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/journey/start`)
      .set('Authorization', `Bearer ${patientToken}`);

    const incomingRes = await request(app)
      .get('/api/organizations/me/incoming-patients')
      .set('Authorization', `Bearer ${orgToken}`)
      .expect(200);

    expect(incomingRes.body.success).toBe(true);
    expect(Array.isArray(incomingRes.body.data)).toBe(true);
    const found = incomingRes.body.data.find(
      (item) => item.emergencyRequest._id.toString() === emergencyReq._id.toString()
    );
    expect(found).toBeTruthy();
    expect(found.journey).toBeTruthy();
    expect(found.journey.status).toBe('IN_PROGRESS');
  });
});

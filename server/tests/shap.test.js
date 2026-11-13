import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { initSocket } from '../src/sockets/socketHandler.js';
import autoSeed from '../src/utils/autoSeed.js';
import http from 'http';

let mongoServer;
let server;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  await autoSeed();

  server = http.createServer(app);
  initSocket(server);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('SHAP Platform Automated Test Suite', () => {
  let patientToken;
  let doctorToken;
  let orgToken;
  let adminToken;
  let docJenkinsId;
  let apexOrgId;
  let emergencyRequestId;

  // 1. Authentication & Role-Based Authorization
  describe('Phase 1: Authentication & Access Control', () => {
    test('Patient Login should return valid JWT and user profile', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'patient@shap.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe('patient');
      patientToken = res.body.data.token;
    });

    test('Doctor Login should return valid JWT and doctor profile', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'sarah.jenkins@shap.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('doctor');
      doctorToken = res.body.data.token;
      docJenkinsId = res.body.data.profile._id;
    });

    test('Organization Login should return valid JWT and org details', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'apex@hospital.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('organization');
      orgToken = res.body.data.token;
      apexOrgId = res.body.data.profile._id;
    });

    test('Admin Login should succeed', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@shap.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('admin');
      adminToken = res.body.data.token;
    });

    test('Unauthorized access to protected route without token must be rejected (401)', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    test('Forbidden role access to admin route must be rejected (403)', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.status).toBe(403);
    });
  });

  // 2. Doctor Verification & QR Presence Rules
  describe('Phase 2: Doctor Verification & QR Presence', () => {
    test('Public search only displays verified doctors, not pending ones', async () => {
      const res = await request(app).get('/api/doctors');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      // Ensure all returned doctors are verified
      res.body.data.forEach((doc) => {
        expect(doc.verificationStatus).toBe('verified');
      });
      const names = res.body.data.map((d) => d.userId.name);
      expect(names).not.toContain('Dr. Alok Verma'); // Pending doctor
    });

    test('Admin approves pending doctor, assigning unique Doctor ID and QR credential', async () => {
      const pendingRes = await request(app)
        .get('/api/admin/doctors/pending')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(pendingRes.status).toBe(200);
      expect(pendingRes.body.data.length).toBeGreaterThan(0);

      const doctorToApprove = pendingRes.body.data[0];
      const approveRes = await request(app)
        .post(`/api/admin/doctors/${doctorToApprove._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.verificationStatus).toBe('verified');
      expect(approveRes.body.data.doctorUniqueId).toMatch(/^DOC-/);
      expect(approveRes.body.data.qrCredentialToken).toBeDefined();
    });

    test('Doctor check-out then check-in validates presence and updates status', async () => {
      // First checkout Dr Jenkins (seeded as checked in)
      const coRes = await request(app)
        .post('/api/doctors/presence/check-out')
        .set('Authorization', `Bearer ${doctorToken}`);
      expect(coRes.status).toBe(200);
      expect(coRes.body.doctor.currentPresence.isPresent).toBe(false);

      // Check in with Apex Metro QR
      const ciRes = await request(app)
        .post('/api/doctors/presence/check-in')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ orgQrCheckinCode: 'ORG-QR-APEX-METRO-2025' });

      expect(ciRes.status).toBe(200);
      expect(ciRes.body.doctor.currentPresence.isPresent).toBe(true);
    });

    test('Prevent duplicate active presence at multiple organizations simultaneously', async () => {
      // Attempting to check in again while already checked in must fail
      const dupRes = await request(app)
        .post('/api/doctors/presence/check-in')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ orgQrCheckinCode: 'ORG-QR-STJUDE-2025' });

      expect(dupRes.status).toBe(500);
      expect(dupRes.body.message).toContain('already checked in');
    });
  });

  // 3. Appointments & Double Booking Prevention
  describe('Phase 3: Appointments & Concurrency Protection', () => {
    const testDate = '2025-12-25';
    const testSlot = '11:00 AM';

    test('Patient books appointment successfully', async () => {
      const res = await request(app)
        .post('/api/appointments/book')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          doctorId: docJenkinsId,
          organizationId: apexOrgId,
          slotDate: testDate,
          slotTime: testSlot,
          patientNotes: 'Chest pain review',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.appointment.appointmentNumber).toBeDefined();
      expect(res.body.data.qrPassUrl).toBeDefined();
    });

    test('Prevent double booking: Same slot requested again must be rejected', async () => {
      const res = await request(app)
        .post('/api/appointments/book')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          doctorId: docJenkinsId,
          organizationId: apexOrgId,
          slotDate: testDate,
          slotTime: testSlot,
          patientNotes: 'Second booking attempt on same slot',
        });

      expect(res.status).toBe(500);
      expect(res.body.message).toContain('already been booked');
    });
  });

  // 4. Emergency Beep, Parallel Broadcast, Multiple Acceptances, Temporary Reservation Lifecycle
  describe('Phase 4: Emergency Mode, Parallel Beep & Temporary Resource Reservation', () => {
    test('Patient activates Emergency Beep -> creates request in BROADCASTED state', async () => {
      const res = await request(app)
        .post('/api/emergency/beep')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          emergencyType: 'cardiac',
          severity: 'critical',
          description: 'Severe acute chest tightness and radiating pain',
          coordinates: [77.2140, 28.6180], // Near Apex Metro
          locationAddress: 'Connaught Place Circle',
          ambulanceRequirement: 'yes',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.emergencyRequest.status).toBe('BROADCASTED');
      expect(res.body.data.broadcasts.length).toBeGreaterThan(0);
      emergencyRequestId = res.body.data.emergencyRequest._id;
    });

    test('Participating organization responds ACCEPT to Emergency Beep', async () => {
      const res = await request(app)
        .post(`/api/emergency/${emergencyRequestId}/respond`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({
          responseStatus: 'ACCEPTED',
          offeredResources: {
            icuBed: true,
            erBay: true,
            ventilator: true,
            specialistOnDuty: 'Dr. Sneha Sen (Cardiology)',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.data.responseStatus).toBe('ACCEPTED');
    });

    test('Patient selects accepted destination hospital', async () => {
      const res = await request(app)
        .post(`/api/emergency/${emergencyRequestId}/select-destination`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ organizationId: apexOrgId });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('DESTINATION_SELECTED');
      expect(res.body.data.selectedOrganizationId._id.toString()).toBe(apexOrgId.toString());
    });

    test('Only AFTER destination selection: Organization confirms and temporarily reserves resource', async () => {
      const res = await request(app)
        .post(`/api/emergency/${emergencyRequestId}/confirm-reservation`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ resourceType: 'icu_bed' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.reservation.status).toBe('TEMPORARILY_RESERVED');
      expect(res.body.reservation.expiresAt).toBeDefined();
    });

    test('Patient transitions to PATIENT_EN_ROUTE', async () => {
      const res = await request(app)
        .post(`/api/emergency/${emergencyRequestId}/en-route`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('PATIENT_EN_ROUTE');
    });

    test('Hospital confirms patient arrived -> status transitions to ARRIVED and resource is ALLOCATED', async () => {
      const res = await request(app)
        .post(`/api/emergency/${emergencyRequestId}/arrived`)
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ARRIVED');
    });
  });
});


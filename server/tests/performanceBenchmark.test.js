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
  Specialization,
  HealthcareResource,
  EmergencyRequest,
  EmergencyBroadcast,
  EmergencyBroadcastRecipient,
} from '../src/models/index.js';

let mongoServer;
let adminToken, patientToken, orgToken;
let orgId, doctorId, patientUser;

const JWT_SECRET = process.env.JWT_SECRET || 'shap_super_secret_jwt_key_2025_access_health';
const createToken = (user, extra = {}) =>
  jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      ...extra,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const admin = await User.create({
    name: 'Perf Admin',
    email: 'admin.perf@shap.org',
    password: 'Password123!',
    role: 'admin',
    isActive: true,
  });
  adminToken = createToken(admin);

  patientUser = await User.create({
    name: 'Perf Patient',
    email: 'patient.perf@shap.org',
    password: 'Password123!',
    role: 'patient',
    isActive: true,
  });
  patientToken = createToken(patientUser);

  const orgUser = await User.create({
    name: 'Perf Org User',
    email: 'org.perf@shap.org',
    password: 'Password123!',
    role: 'organization',
    isActive: true,
  });

  const org = await Organization.create({
    userId: orgUser._id,
    name: 'Performance Trauma Center',
    slug: 'perf-trauma',
    registrationNumber: 'REG-PERF-001',
    qrCheckinCode: 'QR-PERF-001',
    verificationStatus: 'verified',
    emergencyCapable: true,
    location: { type: 'Point', coordinates: [77.209, 28.613] },
  });
  orgId = org._id;
  orgToken = createToken(orgUser, { organizationId: org._id });

  await HealthcareResource.create({
    organizationId: org._id,
    resourceType: 'er_bay',
    totalCapacity: 50,
    availableCapacity: 50,
    reservedCapacity: 0,
    occupiedCapacity: 0,
  });

  const docUser = await User.create({
    name: 'Dr. Perf Specialist',
    email: 'doctor.perf@shap.org',
    password: 'Password123!',
    role: 'doctor',
    isActive: true,
  });

  const spec = await Specialization.create({
    name: 'Cardiology',
    code: 'CARD-PERF',
  });

  const doc = await Doctor.create({
    userId: docUser._id,
    doctorUniqueId: 'DOC-PERF-001',
    licenseNumber: 'LIC-PERF-001',
    verificationStatus: 'verified',
    specialization: 'Cardiology',
    specializationId: spec._id,
    isActive: true,
  });
  doctorId = doc._id;

  await DoctorAffiliation.create({
    doctorId: doc._id,
    organizationId: org._id,
    status: 'ACTIVE',
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('MODULE 19: Performance, Latency & Concurrency Stress Verification', () => {
  test('PERF-1: Standard API p95 latency remains under 1000ms under load', async () => {
    const latencies = [];
    const iterations = 50; // 50 sequential requests

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      const res = await request(app)
        .get('/api/patients/me/profile')
        .set('Authorization', `Bearer ${patientToken}`);
      const duration = Date.now() - start;
      latencies.push(duration);
      expect(res.status).toBe(200);
    }

    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const max = latencies[latencies.length - 1];

    console.log(`[PERF Benchmark] Profile API - p50: ${p50}ms, p95: ${p95}ms, max: ${max}ms`);

    expect(p95).toBeLessThan(1000); // Target < 1000ms
  });

  test('PERF-2: Healthcare Search API p95 latency remains under 2000ms under load', async () => {
    const latencies = [];
    const iterations = 30;

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      const res = await request(app)
        .get('/api/search/organizations?q=Trauma&lat=28.61&lng=77.21')
        .set('Authorization', `Bearer ${patientToken}`);
      const duration = Date.now() - start;
      latencies.push(duration);
      expect(res.status).toBe(200);
    }

    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const max = latencies[latencies.length - 1];

    console.log(`[PERF Benchmark] Search API - p50: ${p50}ms, p95: ${p95}ms, max: ${max}ms`);

    expect(p95).toBeLessThan(2000); // Target < 2000ms
  });

  test('PERF-3: Concurrent Simulation: 50 virtual users executing simultaneous dashboard requests', async () => {
    const concurrentUsers = 50;
    const start = Date.now();

    const promises = Array.from({ length: concurrentUsers }, () =>
      request(app)
        .get('/api/search/doctors')
        .set('Authorization', `Bearer ${patientToken}`)
    );

    const results = await Promise.all(promises);
    const totalTime = Date.now() - start;

    const successful = results.filter((r) => r.status === 200).length;
    console.log(`[PERF Benchmark] 50 Concurrent Users: ${successful}/50 succeeded in ${totalTime}ms (avg: ${(totalTime / 50).toFixed(1)}ms/req)`);

    expect(successful).toBe(50);
    expect(totalTime).toBeLessThan(5000); // 50 concurrent requests complete within 5 seconds
  });

  test('PERF-4: Concurrent Resource Reservation Zero Overselling Stress Test', async () => {
    // Exactly 3 available beds left
    await HealthcareResource.findOneAndUpdate(
      { organizationId: orgId, resourceType: 'er_bay' },
      { $set: { totalCapacity: 3, availableCapacity: 3, reservedCapacity: 0, occupiedCapacity: 0 } }
    );

    // 10 concurrent emergency requests competing for 3 remaining beds
    const concurrentRequests = 10;
    const requestsData = await Promise.all(
      Array.from({ length: concurrentRequests }, async (_, i) => {
        const emg = await EmergencyRequest.create({
          requestCode: `EMG-STRESS-${i}`,
          patientId: patientUser._id,
          patientName: `Stress Patient ${i}`,
          patientPhone: `+91990000000${i}`,
          emergencyType: 'TRAUMA',
          severity: 'critical',
          status: 'RESPONSES_RECEIVED',
          location: { type: 'Point', coordinates: [77.209, 28.613] },
        });

        const selRes = await request(app)
          .post(`/api/emergency/requests/${emg._id}/select-destination`)
          .set('Authorization', `Bearer ${patientToken}`)
          .send({ organizationId: orgId });

        return {
          emergencyId: emg._id,
          selectionId: selRes.body.data.selection.selectionId,
        };
      })
    );

    // Concurrently fire 10 confirmation reservations
    const confirmResults = await Promise.all(
      requestsData.map((reqItem) =>
        request(app)
          .post(`/api/organizations/me/destination-confirmations/${reqItem.selectionId}/confirm`)
          .set('Authorization', `Bearer ${orgToken}`)
          .send({ requiredResources: [{ resourceType: 'er_bay', quantity: 1 }] })
      )
    );

    const successes = confirmResults.filter((r) => r.status === 200).length;
    const conflicts = confirmResults.filter((r) => r.status === 409).length;

    console.log(`[PERF Benchmark] Resource Concurrency: ${successes} succeeded (200), ${conflicts} rejected with capacity conflict (409)`);

    expect(successes).toBe(3); // Exactly 3 succeed
    expect(conflicts).toBe(7); // Exactly 7 rejected with 409

    // Final database state check: ZERO overselling
    const finalResource = await HealthcareResource.findOne({ organizationId: orgId, resourceType: 'er_bay' });
    expect(finalResource.availableCapacity).toBe(0);
    expect(finalResource.reservedCapacity).toBe(3);
    expect(finalResource.availableCapacity + finalResource.reservedCapacity + finalResource.occupiedCapacity).toBe(finalResource.totalCapacity);
  });
});

import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import {
  User,
  EmergencyRequest,
  EmergencyCategory,
  EmergencyGuidance,
  EmergencyRequestEvent,
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

describe('MODULE 8: Emergency Mode and Emergency Request Creation Test Suite', () => {
  let patientUser1, patientToken1;
  let patientUser2, patientToken2;
  let adminUser, adminToken;

  let cardiacCategory;
  let inactiveCategory;
  let traumaCategory;

  let approvedGuidance;
  let draftGuidance;

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
    await EmergencyRequest.deleteMany({});
    await EmergencyCategory.deleteMany({});
    await EmergencyGuidance.deleteMany({});
    await EmergencyRequestEvent.deleteMany({});

    // 1. Setup Users
    patientUser1 = await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      role: 'patient',
      phone: '+1-555-0101',
    });
    patientToken1 = createToken(patientUser1);

    patientUser2 = await User.create({
      name: 'Jane Smith',
      email: 'jane@example.com',
      password: 'password123',
      role: 'patient',
      phone: '+1-555-0102',
    });
    patientToken2 = createToken(patientUser2);

    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@shap.com',
      password: 'password123',
      role: 'admin',
      phone: '+1-555-0100',
    });
    adminToken = createToken(adminUser);

    // 2. Setup Categories
    cardiacCategory = await EmergencyCategory.create({
      categoryId: 'CAT-CARDIAC',
      categoryName: 'Cardiac',
      slug: 'cardiac',
      description: 'Acute chest pain radiating to arm or jaw',
      displayOrder: 1,
      icon: 'HeartPulse',
      active: true,
    });

    traumaCategory = await EmergencyCategory.create({
      categoryId: 'CAT-TRAUMA',
      categoryName: 'Accident/Trauma',
      slug: 'trauma',
      description: 'Severe accident or trauma with active bleeding',
      displayOrder: 2,
      icon: 'Activity',
      active: true,
    });

    inactiveCategory = await EmergencyCategory.create({
      categoryId: 'CAT-EXPERIMENTAL',
      categoryName: 'Experimental Protocol',
      slug: 'experimental',
      description: 'Inactive testing protocol',
      displayOrder: 99,
      icon: 'AlertTriangle',
      active: false,
    });

    // 3. Setup Guidance
    approvedGuidance = await EmergencyGuidance.create({
      categoryId: cardiacCategory._id,
      title: 'Cardiac First-Aid Action Protocol',
      content: 'Keep calm, sit upright, loosen clothing. Assist with prescribed nitroglycerin or chewable aspirin if conscious.',
      version: 1,
      reviewStatus: 'APPROVED',
      reviewedBy: adminUser._id,
      reviewedAt: new Date(),
      active: true,
    });

    draftGuidance = await EmergencyGuidance.create({
      categoryId: traumaCategory._id,
      title: 'Trauma Draft Action Protocol',
      content: 'Draft instructions under medical review.',
      version: 1,
      reviewStatus: 'DRAFT',
      reviewedBy: null,
      active: false,
    });
  });

  // Test 1: Category retrieval
  test('1. GET /api/emergency/categories returns only active categories in order', async () => {
    const res = await request(app).get('/api/emergency/categories');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
    const slugs = res.body.data.map((c) => c.slug);
    expect(slugs).toContain('cardiac');
    expect(slugs).toContain('trauma');
    expect(slugs).not.toContain('experimental');
  });

  // Test 2: Medically approved emergency guidance retrieval
  test('2. GET /api/emergency/guidance/:categoryId returns approved guidance and excludes drafts', async () => {
    // Cardiac has approved guidance
    const resCardiac = await request(app).get(`/api/emergency/guidance/${cardiacCategory.slug}`);
    expect(resCardiac.status).toBe(200);
    expect(resCardiac.body.success).toBe(true);
    expect(resCardiac.body.available).toBe(true);
    expect(resCardiac.body.data.title).toBe('Cardiac First-Aid Action Protocol');
    expect(resCardiac.body.data.reviewStatus).toBe('APPROVED');

    // Trauma only has DRAFT guidance, so approved guidance is unavailable
    const resTrauma = await request(app).get(`/api/emergency/guidance/${traumaCategory.slug}`);
    expect(resTrauma.status).toBe(200);
    expect(resTrauma.body.success).toBe(true);
    expect(resTrauma.body.available).toBe(false);
    expect(resTrauma.body.data).toBeNull();
  });

  // Test 3: Valid emergency request creation in CREATED state with location snapshot
  test('3. POST /api/emergency/requests creates request in CREATED status with location snapshot and event log', async () => {
    const payload = {
      categoryId: cardiacCategory._id.toString(),
      description: 'Severe chest tightness and shortness of breath',
      ambulanceRequirement: 'YES',
      latitude: 28.6139,
      longitude: 77.2090,
      address: 'Connaught Place, Central Delhi',
      locationAccuracy: 12.5,
      locationSource: 'GPS',
      locationConfirmed: true,
    };

    const res = await request(app)
      .post('/api/emergency/requests')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('CREATED');
    expect(res.body.data.ambulanceRequirement).toBe('YES');
    expect(res.body.data.locationAccuracy).toBe(12.5);
    expect(res.body.data.locationSource).toBe('GPS');
    expect(res.body.data.locationSnapshot).toBeDefined();
    expect(res.body.data.locationSnapshot.coordinates).toEqual([77.2090, 28.6139]);
    expect(res.body.data.locationSnapshot.accuracy).toBe(12.5);

    // Verify Event Log was created
    const events = await EmergencyRequestEvent.find({ emergencyRequestId: res.body.data._id });
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe('REQUEST_CREATED');
    expect(events[0].newState).toBe('CREATED');
  });

  // Test 4: Reject invalid category
  test('4. POST /api/emergency/requests rejects invalid category', async () => {
    const res = await request(app)
      .post('/api/emergency/requests')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        categoryId: new mongoose.Types.ObjectId().toString(),
        latitude: 28.6139,
        longitude: 77.2090,
        address: 'Delhi',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Invalid emergency category/i);
  });

  // Test 5: Reject inactive category
  test('5. POST /api/emergency/requests rejects inactive category', async () => {
    const res = await request(app)
      .post('/api/emergency/requests')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        categoryId: inactiveCategory._id.toString(),
        latitude: 28.6139,
        longitude: 77.2090,
        address: 'Delhi',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/inactive/i);
  });

  // Test 6: Reject missing required location coordinates
  test('6. POST /api/emergency/requests rejects request with missing location coordinates', async () => {
    const res = await request(app)
      .post('/api/emergency/requests')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        categoryId: cardiacCategory._id.toString(),
        address: 'Delhi with no GPS',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/coordinates/i);
  });

  // Test 7: Support Manual location entry with fallback address
  test('7. POST /api/emergency/requests supports manual location entry', async () => {
    const payload = {
      categoryId: cardiacCategory.slug,
      description: 'Patient unable to get GPS signal indoors',
      ambulanceRequirement: 'NO',
      latitude: 28.5355,
      longitude: 77.3910,
      address: 'Flat 402, Sector 62, Noida, UP',
      locationSource: 'MANUAL',
      locationConfirmed: true,
    };

    const res = await request(app)
      .post('/api/emergency/requests')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.locationSource).toBe('MANUAL');
    expect(res.body.data.address).toBe('Flat 402, Sector 62, Noida, UP');
    expect(res.body.data.locationSnapshot.source).toBe('MANUAL');
  });

  // Test 8: All ambulance requirement values: YES, NO, ALREADY_ARRANGED
  test('8. POST /api/emergency/requests supports YES, NO, and ALREADY_ARRANGED', async () => {
    for (const ambOption of ['YES', 'NO', 'ALREADY_ARRANGED', 'already_arranged']) {
      await EmergencyRequest.deleteMany({});
      const res = await request(app)
        .post('/api/emergency/requests')
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({
          categoryId: traumaCategory._id.toString(),
          ambulanceRequirement: ambOption,
          latitude: 28.6139 + Math.random() * 0.01,
          longitude: 77.2090 + Math.random() * 0.01,
          address: 'Highway Mile 45',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.ambulanceRequirement).toBe(ambOption.toUpperCase());
    }
  });

  // Test 9: Reject invalid ambulance requirement option
  test('9. POST /api/emergency/requests rejects invalid ambulance requirement string', async () => {
    const res = await request(app)
      .post('/api/emergency/requests')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        categoryId: cardiacCategory._id.toString(),
        ambulanceRequirement: 'HELICOPTER_ONLY',
        latitude: 28.6139,
        longitude: 77.2090,
        address: 'Delhi',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Invalid ambulance requirement/i);
  });

  // Test 10: Idempotency / Duplicate submission handling
  test('10. Rapid duplicate submission within 15 seconds returns existing CREATED request', async () => {
    const payload = {
      categoryId: cardiacCategory._id.toString(),
      description: 'Acute emergency duplicate check',
      ambulanceRequirement: 'YES',
      latitude: 28.6139,
      longitude: 77.2090,
      address: 'Connaught Place',
    };

    const first = await request(app)
      .post('/api/emergency/requests')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send(payload);

    expect(first.status).toBe(201);
    expect(first.body.isDuplicate).toBe(false);

    // Second call right away
    const second = await request(app)
      .post('/api/emergency/requests')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send(payload);

    expect(second.status).toBe(200);
    expect(second.body.isDuplicate).toBe(true);
    expect(second.body.emergencyRequestId).toBe(first.body.emergencyRequestId);
  });

  // Test 11: Unauthorized access rejection
  test('11. POST /api/emergency/requests rejects unauthenticated caller with 401', async () => {
    const res = await request(app)
      .post('/api/emergency/requests')
      .send({
        categoryId: cardiacCategory._id.toString(),
        latitude: 28.6139,
        longitude: 77.2090,
      });

    expect(res.status).toBe(401);
  });

  // Test 12: Patient request ownership & access control
  test('12. Patient cannot view or cancel another patient\'s emergency request', async () => {
    // Patient 1 creates request
    const createRes = await request(app)
      .post('/api/emergency/requests')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        categoryId: cardiacCategory._id.toString(),
        latitude: 28.6139,
        longitude: 77.2090,
        address: 'Delhi',
      });

    const reqId = createRes.body.data._id;

    // Patient 2 attempts to fetch details
    const getRes = await request(app)
      .get(`/api/emergency/requests/${reqId}`)
      .set('Authorization', `Bearer ${patientToken2}`);

    expect(getRes.status).toBe(403);
    expect(getRes.body.message).toMatch(/access denied/i);

    // Patient 2 attempts to cancel
    const cancelRes = await request(app)
      .post(`/api/emergency/requests/${reqId}/cancel`)
      .set('Authorization', `Bearer ${patientToken2}`)
      .send({ reason: 'Malicious cancellation attempt' });

    expect(cancelRes.status).toBe(403);
  });

  // Test 13: Patient can view their own requests via GET /api/emergency/requests/my
  test('13. GET /api/emergency/requests/my lists requests for authenticated patient', async () => {
    await request(app)
      .post('/api/emergency/requests')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        categoryId: cardiacCategory._id.toString(),
        latitude: 28.6139,
        longitude: 77.2090,
        address: 'Delhi',
      });

    const res = await request(app)
      .get('/api/emergency/requests/my')
      .set('Authorization', `Bearer ${patientToken1}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0].status).toBe('CREATED');
  });

  // Test 14: Patient can cancel their own active emergency request
  test('14. POST /api/emergency/requests/:id/cancel cancels request with reason and event log', async () => {
    const createRes = await request(app)
      .post('/api/emergency/requests')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        categoryId: cardiacCategory._id.toString(),
        latitude: 28.6139,
        longitude: 77.2090,
        address: 'Delhi',
      });

    const reqId = createRes.body.data._id;

    const cancelRes = await request(app)
      .post(`/api/emergency/requests/${reqId}/cancel`)
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({ reason: 'Family arranged private transport to clinic' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');
    expect(cancelRes.body.data.cancellationReason).toBe('Family arranged private transport to clinic');

    // Verify cancellation event recorded
    const events = await EmergencyRequestEvent.find({ emergencyRequestId: reqId });
    const cancelEvent = events.find((e) => e.eventType === 'REQUEST_CANCELLED');
    expect(cancelEvent).toBeDefined();
    expect(cancelEvent.previousState).toBe('CREATED');
    expect(cancelEvent.newState).toBe('CANCELLED');
  });

  // Test 15: Admin Emergency Categories & Guidance Management
  test('15. Admin can create category and approve new guidance', async () => {
    // Admin creates new category
    const catRes = await request(app)
      .post('/api/admin/emergency/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        categoryName: 'Severe Hypothermia',
        slug: 'hypothermia',
        description: 'Core body temperature drop below 35C',
        displayOrder: 15,
        icon: 'Flame',
      });

    expect(catRes.status).toBe(201);
    expect(catRes.body.data.slug).toBe('hypothermia');

    // Admin creates draft guidance
    const gdnRes = await request(app)
      .post('/api/admin/emergency/guidance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        categoryId: catRes.body.data._id,
        title: 'Hypothermia Rewarming Protocol',
        content: 'Remove wet clothes, wrap in warm blankets, provide warm sweet beverages if conscious.',
        reviewStatus: 'DRAFT',
      });

    expect(gdnRes.status).toBe(201);
    expect(gdnRes.body.data.reviewStatus).toBe('DRAFT');

    // Admin approves guidance
    const approveRes = await request(app)
      .post(`/api/admin/emergency/guidance/${gdnRes.body.data._id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.reviewStatus).toBe('APPROVED');
    expect(approveRes.body.data.active).toBe(true);

    // Verify public guidance endpoint returns approved content now
    const pubGdn = await request(app).get(`/api/emergency/guidance/hypothermia`);
    expect(pubGdn.status).toBe(200);
    expect(pubGdn.body.available).toBe(true);
    expect(pubGdn.body.data.title).toBe('Hypothermia Rewarming Protocol');
  });
});

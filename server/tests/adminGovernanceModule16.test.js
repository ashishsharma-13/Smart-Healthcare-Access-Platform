import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import {
  User,
  Doctor,
  Organization,
  EmergencyRequest,
  EmergencyBroadcast,
  EmergencyBroadcastRecipient,
  ResourceReservation,
  EmergencyJourney,
  Appointment,
  HealthcareResource,
  Specialization,
  PlatformConfiguration,
  ConfigurationChangeHistory,
  AdminActionAuditLog,
} from '../src/models/index.js';
import autoSeed from '../src/utils/autoSeed.js';

let mongoServer;
let adminToken;
let patientToken;
let adminUser;
let testPatient;
let testDoctor;
let testOrg;
let testEmergencyReq;

const JWT_SECRET = process.env.JWT_SECRET || 'shap_super_secret_jwt_key_2025_access_health';

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  await autoSeed();

  // Load seeded admin user
  adminUser = await User.findOne({ email: 'admin@shap.com' });
  adminToken = jwt.sign(
    { id: adminUser._id, role: adminUser.role, email: adminUser.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Load seeded patient user
  testPatient = await User.findOne({ email: 'patient@shap.com' });
  patientToken = jwt.sign(
    { id: testPatient._id, role: testPatient.role, email: testPatient.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Load a doctor and organization
  testDoctor = await Doctor.findOne();
  testOrg = await Organization.findOne();

  // Create a sample emergency request for monitoring tests
  testEmergencyReq = await EmergencyRequest.create({
    requestCode: 'EMG-GOV-1001',
    emergencyRequestId: 'EMG-GOV-1001',
    patientId: testPatient._id,
    reportedByUserId: testPatient._id,
    patientName: testPatient.name || 'Alex Mercer',
    patientPhone: testPatient.phone || '+1-555-0199',
    emergencyType: 'Cardiac Emergency',
    emergencyCategory: 'CARDIAC_ARREST',
    location: {
      type: 'Point',
      address: 'Connaught Place, New Delhi',
      coordinates: [77.2167, 28.6289],
    },
    ambulanceRequirement: 'YES',
    status: 'COMPLETED',
  });

  // Create broadcast & responses for timeline test
  const broadcast = await EmergencyBroadcast.create({
    broadcastId: 'BC-GOV-2001',
    emergencyRequestId: testEmergencyReq._id,
    radiusKm: 5,
    candidateCount: 2,
    status: 'COMPLETED',
  });

  await EmergencyBroadcastRecipient.create({
    recipientId: 'RCP-GOV-3001',
    broadcastId: broadcast._id,
    emergencyRequestId: testEmergencyReq._id,
    organizationId: testOrg._id,
    deliveryStatus: 'DELIVERED',
    responseStatus: 'ACCEPTED',
    respondedAt: new Date(),
  });

  const testReservation = await ResourceReservation.create({
    reservationId: 'RES-GOV-5001',
    emergencyRequestId: testEmergencyReq._id,
    organizationId: testOrg._id,
    status: 'ALLOCATED',
    reservedAt: new Date(Date.now() - 3600000),
    expiresAt: new Date(Date.now() + 3600000),
  });

  await EmergencyJourney.create({
    journeyId: 'JRN-GOV-4001',
    emergencyRequestId: testEmergencyReq._id,
    reservationId: testReservation._id,
    patientId: testPatient._id,
    organizationId: testOrg._id,
    status: 'COMPLETED',
    startedAt: new Date(Date.now() - 3600000),
    arrivedAt: new Date(Date.now() - 1800000),
    completedAt: new Date(),
    arrivalVerificationMethod: 'QR_SCAN',
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('MODULE 16: Admin Governance and Platform Monitoring Test Suite', () => {
  // ----------------------------------------------------
  // 1. Dashboard Summary & Telemetry
  // ----------------------------------------------------
  test('1. Dashboard Summary: returns comprehensive real-time metrics across all platform domains', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard/summary')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('users');
    expect(res.body.data.users.total).toBeGreaterThanOrEqual(1);
    expect(res.body.data).toHaveProperty('doctors');
    expect(res.body.data).toHaveProperty('organizations');
    expect(res.body.data).toHaveProperty('emergencies');
    expect(res.body.data).toHaveProperty('reservations');
    expect(res.body.data).toHaveProperty('appointments');
    expect(res.body.data).toHaveProperty('resources');
  });

  test('2. Dashboard Activity: returns chronological multi-source platform activity feed', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard/activity?limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    const item = res.body.data[0];
    expect(item).toHaveProperty('type');
    expect(item).toHaveProperty('title');
    expect(item).toHaveProperty('timestamp');
  });

  test('3. System Health: returns operational status of core platform subsystems', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard/system-health')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('OPERATIONAL');
    expect(res.body.data.services.database.status).toBe('CONNECTED');
    expect(res.body.data.services.emergencyDispatch.status).toBe('READY');
  });

  // ----------------------------------------------------
  // 2. User Management & Protection
  // ----------------------------------------------------
  test('4. User Management: lists users with sanitized credentials (no passwords exposed)', async () => {
    const res = await request(app)
      .get('/api/admin/users?limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(1);

    // Password must be strictly excluded from returned JSON
    res.body.users.forEach((u) => {
      expect(u.password).toBeUndefined();
    });
  });

  test('5. User Details: returns profile information and role activity counts', async () => {
    const res = await request(app)
      .get(`/api/admin/users/${testPatient._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testPatient.email);
    expect(res.body.data.user.password).toBeUndefined();
    expect(res.body.data.activity).toHaveProperty('appointmentsCount');
    expect(res.body.data.activity).toHaveProperty('emergenciesCount');
  });

  test('6. User Suspension: suspends account with mandatory reason and logs audit record', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${testPatient._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'suspended',
        reason: 'Violation of emergency abuse terms of service',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('suspended');
    expect(res.body.data.isActive).toBe(false);

    // Verify audit log entry was created
    const audit = await AdminActionAuditLog.findOne({
      action: 'USER_STATUS_CHANGE',
      targetEntityId: testPatient._id.toString(),
    });
    expect(audit).toBeTruthy();
    expect(audit.reason).toBe('Violation of emergency abuse terms of service');
    expect(audit.newValue.status).toBe('suspended');
  });

  test('7. Mandatory Reason Enforcement: rejects status update when reason is omitted', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${testPatient._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'active',
        reason: '',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/mandatory reason/i);
  });

  test('8. Admin Self-Suspension Prevention: blocks admin from suspending their own account', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${adminUser._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'suspended',
        reason: 'Attempted self-lockout',
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/self-governance violation/i);

    // Verify admin remained active
    const checkAdmin = await User.findById(adminUser._id);
    expect(checkAdmin.status).toBe('active');
  });

  test('9. User Reactivation: reactivates previously suspended patient account', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${testPatient._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'active',
        reason: 'Dispute resolved following compliance verification',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('active');
    expect(res.body.data.isActive).toBe(true);
  });

  // ----------------------------------------------------
  // 3. Platform Configuration & Change History
  // ----------------------------------------------------
  test('10. Platform Configurations: returns default seeded configurations grouped by category', async () => {
    const res = await request(app)
      .get('/api/admin/configurations')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThanOrEqual(8);
    const keys = res.body.data.map((c) => c.configKey);
    expect(keys).toContain('EMERGENCY_BROADCAST_RADIUS_KM');
    expect(keys).toContain('RESERVATION_EXPIRY_MINUTES');
    expect(keys).toContain('AUTO_FALLBACK_ENABLED');
  });

  test('11. Configuration Mutation: updates configuration with mandatory reason and creates history trail', async () => {
    const res = await request(app)
      .put('/api/admin/configurations/EMERGENCY_BROADCAST_RADIUS_KM')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        value: 10,
        reason: 'Expanding initial urban dispatch radius for high-density traffic hours',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.value).toBe(10);

    // Verify change history record
    const history = await ConfigurationChangeHistory.findOne({
      configKey: 'EMERGENCY_BROADCAST_RADIUS_KM',
      newValue: 10,
    });
    expect(history).toBeTruthy();
    expect(history.changeReason).toMatch(/Expanding initial urban dispatch radius/i);
    expect(history.previousValue).toBe(5);
  });

  test('12. Configuration Validation: rejects value out of bounds or missing change reason', async () => {
    // Missing reason
    const res1 = await request(app)
      .put('/api/admin/configurations/EMERGENCY_BROADCAST_RADIUS_KM')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ value: 12, reason: '' });

    expect(res1.status).toBe(400);
    expect(res1.body.message).toMatch(/mandatory change reason/i);

    // Exceeds maxValue (max is 25 for EMERGENCY_BROADCAST_RADIUS_KM)
    const res2 = await request(app)
      .put('/api/admin/configurations/EMERGENCY_BROADCAST_RADIUS_KM')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ value: 50, reason: 'Invalid boundary test' });

    expect(res2.status).toBe(400);
    expect(res2.body.message).toMatch(/cannot exceed 25/i);
  });

  test('13. Configuration History: returns chronological change log for specific configuration', async () => {
    const res = await request(app)
      .get('/api/admin/configurations/EMERGENCY_BROADCAST_RADIUS_KM/history')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].configKey).toBe('EMERGENCY_BROADCAST_RADIUS_KM');
  });

  // ----------------------------------------------------
  // 4. Specialization Management
  // ----------------------------------------------------
  test('14. Specialization Management: creates new medical specialization and logs audit record', async () => {
    const res = await request(app)
      .post('/api/admin/specializations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Pediatric Neurosurgery',
        category: 'SURGICAL',
        code: 'PNEU',
        description: 'Specialized neonatal and pediatric central nervous system surgical care',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Pediatric Neurosurgery');
    expect(res.body.data.isActive).toBe(true);

    const audit = await AdminActionAuditLog.findOne({
      action: 'SPECIALIZATION_CREATE',
      targetEntityType: 'Specialization',
    });
    expect(audit).toBeTruthy();
  });

  test('15. Specialization Deactivation: toggles active state preserving historical doctor references', async () => {
    const spec = await Specialization.findOne({ name: 'Pediatric Neurosurgery' });
    const res = await request(app)
      .patch(`/api/admin/specializations/${spec._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Temporarily retiring sub-specialization for reorganization' });

    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);

    // Document remains in database for foreign key preservation
    const checkSpec = await Specialization.findById(spec._id);
    expect(checkSpec).toBeTruthy();
    expect(checkSpec.isActive).toBe(false);
  });

  // ----------------------------------------------------
  // 5. Emergency Operations Monitoring (Read-Only)
  // ----------------------------------------------------
  test('16. Emergency Operations Monitoring: retrieves paginated emergency requests with status filters', async () => {
    const res = await request(app)
      .get('/api/admin/emergency/requests?status=COMPLETED')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.requests)).toBe(true);
    expect(res.body.requests.some((r) => r.requestId === 'EMG-GOV-1001')).toBe(true);
  });

  test('17. Emergency Request Details & Timeline: compiles multi-entity chronological lifecycle timeline', async () => {
    const res = await request(app)
      .get('/api/admin/emergency/requests/EMG-GOV-1001/timeline')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.requestId).toBe('EMG-GOV-1001');
    expect(Array.isArray(res.body.data.timeline)).toBe(true);
    expect(res.body.data.timeline.length).toBeGreaterThanOrEqual(3);

    const stages = res.body.data.timeline.map((t) => t.stage);
    expect(stages).toContain('CREATED');
    expect(stages).toContain('BROADCAST');
    expect(stages).toContain('RESPONSE');
  });

  // ----------------------------------------------------
  // 6. Healthcare Resource Monitoring
  // ----------------------------------------------------
  test('18. Healthcare Resource Monitoring: verifies resource balance invariant across organizations', async () => {
    const res = await request(app)
      .get('/api/admin/resources')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.resources)).toBe(true);

    // Verify invariant: totalCapacity = available + reserved + allocated + unavailable
    res.body.resources.forEach((r) => {
      expect(r.invariantSatisfied).toBe(true);
    });
  });

  test('19. Resource Summary: returns system-wide totals and checks for invariant mismatches', async () => {
    const res = await request(app)
      .get('/api/admin/resources/summary')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.systemWide.invariantSatisfied).toBe(true);
    expect(res.body.data.systemWide.invariantMismatches).toBe(0);
  });

  // ----------------------------------------------------
  // 7. Analytical Reports & Exports
  // ----------------------------------------------------
  test('20. Reports Generation: generates analytical reports with aggregated domain metrics', async () => {
    const res = await request(app)
      .post('/api/admin/reports/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        reportType: 'DOCTOR_VERIFICATION',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reportType).toBe('DOCTOR_VERIFICATION');
    expect(res.body.data.metrics).toHaveProperty('total');
    expect(Array.isArray(res.body.data.data)).toBe(true);
  });

  test('21. CSV Export: exports formatted CSV stream without exposing private authentication secrets', async () => {
    const res = await request(app)
      .get('/api/admin/reports/export/USER_ACTIVITY?format=csv')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toMatch(/text\/csv/);
    expect(res.text).toContain('id,name,email,role,status,isActive,joinedAt');
    expect(res.text).not.toContain('password');
    expect(res.text).not.toContain('salt');
  });

  // ----------------------------------------------------
  // 8. Immutable Audit Logs & Authorization Safeguards
  // ----------------------------------------------------
  test('22. Audit Logs: queries recorded admin actions with action and entity filters', async () => {
    const res = await request(app)
      .get('/api/admin/audit-logs?action=CONFIG_UPDATE')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.logs)).toBe(true);
    expect(res.body.logs.length).toBeGreaterThanOrEqual(1);
    expect(res.body.logs[0].action).toBe('CONFIG_UPDATE');
  });

  test('23. Non-Admin Authorization: rejects patient or unauthenticated requests with 403 / 401', async () => {
    // Patient attempting to query admin dashboard
    const patientRes = await request(app)
      .get('/api/admin/dashboard/summary')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(patientRes.status).toBe(403);
    expect(patientRes.body.message).toMatch(/Forbidden/i);

    // Unauthenticated request
    const noAuthRes = await request(app).get('/api/admin/dashboard/summary');
    expect(noAuthRes.status).toBe(401);
  });
});

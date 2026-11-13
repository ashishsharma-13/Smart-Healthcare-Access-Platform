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
  ResourceInventoryHistory,
  ResourceAvailabilitySnapshot,
  ResourceReservation,
  ResourceReservationItem,
  ResourceAllocation,
  EmergencyRequest,
  EmergencyDestinationSelection,
} from '../src/models/index.js';
import { healthcareResourceTypeService } from '../src/services/HealthcareResourceTypeService.js';
import { healthcareResourceService } from '../src/services/HealthcareResourceService.js';
import { resourceAvailabilityService } from '../src/services/ResourceAvailabilityService.js';
import { resourceReconciliationService } from '../src/services/ResourceReconciliationService.js';
import { resourceRepository } from '../src/repositories/ResourceRepository.js';

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

describe('MODULE 14: Healthcare Resource Inventory and Availability Management Test Suite', () => {
  let mongoServer;

  let orgAStaffUser;
  let organizationA;
  let orgAToken;

  let orgBStaffUser;
  let organizationB;
  let orgBToken;

  let patientUser;
  let patientToken;

  let adminUser;
  let adminToken;

  let defaultResourceType;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'shap_super_secret_jwt_key_2026';
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // 1. Seed initial resource types
    await healthcareResourceTypeService.seedInitialTypes();
    defaultResourceType = await HealthcareResourceType.findOne({ active: true });

    // 2. Organization A
    orgAStaffUser = await User.create({
      name: 'Metro General Admin',
      email: `orgA.${Date.now()}@shap.com`,
      phone: '+919876500001',
      password: 'Password123!',
      role: 'organization',
      isVerified: true,
    });

    organizationA = await Organization.create({
      userId: orgAStaffUser._id,
      name: 'Metro General Hospital',
      slug: `metro-general-${Date.now()}`,
      orgType: 'hospital',
      registrationNumber: `REG-METRO-${Date.now()}`,
      qrCheckinCode: `QR-METRO-${Date.now()}`,
      verificationStatus: 'VERIFIED',
      location: { type: 'Point', coordinates: [77.21, 28.61] },
      emergencyCapable: true,
      contactEmail: 'metro@shap.com',
    });
    orgAStaffUser.organizationId = organizationA._id;
    await orgAStaffUser.save();
    orgAToken = generateToken(orgAStaffUser, organizationA._id);

    // 3. Organization B (For isolation testing)
    orgBStaffUser = await User.create({
      name: 'City Care Admin',
      email: `orgB.${Date.now()}@shap.com`,
      phone: '+919876500002',
      password: 'Password123!',
      role: 'organization',
      isVerified: true,
    });

    organizationB = await Organization.create({
      userId: orgBStaffUser._id,
      name: 'City Care Hospital',
      slug: `city-care-${Date.now()}`,
      orgType: 'hospital',
      registrationNumber: `REG-CITY-${Date.now()}`,
      qrCheckinCode: `QR-CITY-${Date.now()}`,
      verificationStatus: 'VERIFIED',
      location: { type: 'Point', coordinates: [77.25, 28.65] },
      emergencyCapable: true,
      contactEmail: 'citycare@shap.com',
    });
    orgBStaffUser.organizationId = organizationB._id;
    await orgBStaffUser.save();
    orgBToken = generateToken(orgBStaffUser, organizationB._id);

    // 4. Patient User
    patientUser = await User.create({
      name: 'Karan Sharma',
      email: `patient.${Date.now()}@shap.com`,
      phone: '+919876500003',
      password: 'Password123!',
      role: 'patient',
      isVerified: true,
    });
    patientToken = generateToken(patientUser);

    // 5. Admin User
    adminUser = await User.create({
      name: 'System Administrator',
      email: `admin.${Date.now()}@shap.com`,
      phone: '+919876500004',
      password: 'Password123!',
      role: 'admin',
      isVerified: true,
    });
    adminToken = generateToken(adminUser);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  // -------------------------------------------------------------
  // TEST SCENARIO 1: Resource registration
  // -------------------------------------------------------------
  test('1. Resource registration: creates inventory with initial availability, snapshot and history', async () => {
    const res = await request(app)
      .post('/api/organizations/me/resources')
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        resourceTypeId: defaultResourceType._id,
        resourceType: 'icu_bed',
        resourceName: 'Cardiac ICU Bay',
        totalQuantity: 12,
        availableQuantity: 12,
        operationalStatus: 'OPERATIONAL',
        maintenanceNotes: 'Calibrated multipara monitors',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.resourceType).toBe('icu_bed');
    expect(res.body.data.totalQuantity).toBe(12);
    expect(res.body.data.availableQuantity).toBe(12);
    expect(res.body.data.reservedQuantity).toBe(0);
    expect(res.body.data.allocatedQuantity).toBe(0);
    expect(res.body.data.unavailableQuantity).toBe(0);

    // Verify initial snapshot was captured
    const snapshot = await ResourceAvailabilitySnapshot.findOne({ resourceId: res.body.data._id });
    expect(snapshot).toBeTruthy();
    expect(snapshot.totalQuantity).toBe(12);
    expect(snapshot.availableQuantity).toBe(12);

    // Verify initial history was logged with REGISTER
    const history = await ResourceInventoryHistory.findOne({
      resourceId: res.body.data._id,
      changeType: 'REGISTER',
    });
    expect(history).toBeTruthy();
    expect(history.newQuantity.total).toBe(12);
  });

  // -------------------------------------------------------------
  // TEST SCENARIO 2: Duplicate resource registration
  // -------------------------------------------------------------
  test('2. Duplicate resource registration: rejects duplicate resourceType for same org with 409', async () => {
    const res = await request(app)
      .post('/api/organizations/me/resources')
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        resourceType: 'icu_bed',
        resourceName: 'Duplicate ICU Bed',
        totalQuantity: 5,
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already exists|already registered/i);
  });

  // -------------------------------------------------------------
  // TEST SCENARIO 3: Resource type validation
  // -------------------------------------------------------------
  test('3. Resource type validation: rejects registration with missing resourceType', async () => {
    const res = await request(app)
      .post('/api/organizations/me/resources')
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        resourceName: 'Nameless Resource',
        totalQuantity: 5,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // -------------------------------------------------------------
  // TEST SCENARIO 4: Resource updates
  // -------------------------------------------------------------
  test('4. Resource updates: updates resource metadata and increments version', async () => {
    const existing = await HealthcareResource.findOne({
      organizationId: organizationA._id,
      resourceType: 'icu_bed',
    });

    const res = await request(app)
      .put(`/api/organizations/me/resources/${existing._id}`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        resourceName: 'Cardiac & Neuro ICU Bay',
        freshnessThresholdMinutes: 90,
        maintenanceNotes: 'Updated biomed schedule',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.resourceName).toBe('Cardiac & Neuro ICU Bay');
    expect(res.body.data.freshnessThresholdMinutes).toBe(90);
    expect(res.body.data.version).toBeGreaterThan(existing.version || 1);
  });

  // -------------------------------------------------------------
  // TEST SCENARIO 5: Negative quantity rejection
  // -------------------------------------------------------------
  test('5. Negative quantity rejection: schema invariant prohibits negative numbers', async () => {
    const existing = await HealthcareResource.findOne({
      organizationId: organizationA._id,
      resourceType: 'icu_bed',
    });

    existing.availableQuantity = -5;
    let thrown = false;
    try {
      await existing.save();
    } catch (err) {
      thrown = true;
      expect(err.message).toMatch(/negative|minimum|less than/i);
    }
    expect(thrown).toBe(true);
  });

  // -------------------------------------------------------------
  // TEST SCENARIO 6: Capacity reduction below reserved quantity
  // -------------------------------------------------------------
  test('6. Capacity reduction below reserved quantity: blocked with explicit validation error', async () => {
    // Register ventilator for org A
    const vent = await healthcareResourceService.registerResource(
      {
        organizationId: organizationA._id,
        resourceType: 'ventilator',
        resourceName: 'Emergency Ventilator',
        totalQuantity: 10,
        availableQuantity: 10,
      },
      orgAStaffUser._id
    );

    // Artificially simulate 5 active reservations
    vent.reservedQuantity = 5;
    vent.availableQuantity = 5;
    await vent.save();

    // Attempt to reduce total to 4 (which is less than 5 reserved)
    const res = await request(app)
      .patch(`/api/organizations/me/resources/${vent._id}/capacity`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        totalQuantity: 4,
        reason: 'Attempted downsizing',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Cannot reduce total capacity/i);
  });

  // -------------------------------------------------------------
  // TEST SCENARIO 7: Capacity reduction below allocated quantity
  // -------------------------------------------------------------
  test('7. Capacity reduction below allocated quantity: blocked when active allocations exist', async () => {
    const vent = await HealthcareResource.findOne({
      organizationId: organizationA._id,
      resourceType: 'ventilator',
    });

    // Simulate 3 allocated and 2 reserved
    vent.reservedQuantity = 2;
    vent.allocatedQuantity = 3;
    vent.availableQuantity = 5;
    await vent.save();

    // Attempt to reduce total to 4 (requires min 5)
    const res = await request(app)
      .patch(`/api/organizations/me/resources/${vent._id}/capacity`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        totalQuantity: 4,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/allocated/i);
  });

  // -------------------------------------------------------------
  // TEST SCENARIO 8: Maintenance updates
  // -------------------------------------------------------------
  test('8. Maintenance updates: changing status to MAINTENANCE logs MAINTENANCE_START audit entry', async () => {
    const res = await request(app)
      .patch(`/api/organizations/me/resources/icu_bed/status`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        operationalStatus: 'MAINTENANCE',
        maintenanceNotes: 'Quarterly sensor recalibration',
        maintenanceStartDate: new Date().toISOString(),
        reason: 'Routine scheduled biomed overhaul',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.operationalStatus).toBe('MAINTENANCE');

    const history = await ResourceInventoryHistory.findOne({
      changeType: 'MAINTENANCE_START',
    }).sort({ timestamp: -1 });

    expect(history).toBeTruthy();
    expect(history.newStatus).toBe('MAINTENANCE');
    expect(history.reason).toMatch(/Routine scheduled biomed/i);
  });

  // -------------------------------------------------------------
  // TEST SCENARIO 9: Availability adjustment
  // -------------------------------------------------------------
  test('9. Availability adjustment: requires mandatory reason and adjusts quantities', async () => {
    // 9a. Omission of reason must fail
    const failRes = await request(app)
      .post('/api/organizations/me/resources/icu_bed/availability-adjustments')
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        adjustmentQuantity: -2,
        reason: '',
      });

    expect(failRes.status).toBe(400);
    expect(failRes.body.message).toMatch(/reason is strictly mandatory/i);

    // 9b. Successful adjustment with reason
    const okRes = await request(app)
      .post('/api/organizations/me/resources/icu_bed/availability-adjustments')
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        adjustmentQuantity: -2,
        reason: 'Temporary nurse shortage in ward',
      });

    expect(okRes.status).toBe(200);
    expect(okRes.body.success).toBe(true);

    const history = await ResourceInventoryHistory.findOne({
      changeType: 'AVAILABILITY_ADJUSTMENT',
      reason: 'Temporary nurse shortage in ward',
    });
    expect(history).toBeTruthy();
    expect(history.quantityDelta).toBe(-2);
  });

  // -------------------------------------------------------------
  // TEST SCENARIO 10: Inventory history
  // -------------------------------------------------------------
  test('10. Inventory history: returns chronological history records for a resource', async () => {
    const res = await request(app)
      .get('/api/organizations/me/resources/icu_bed/history')
      .set('Authorization', `Bearer ${orgAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  // -------------------------------------------------------------
  // TEST SCENARIO 11: Organization isolation
  // -------------------------------------------------------------
  test('11. Organization isolation: Org B cannot access or mutate Org A resources', async () => {
    const resourceA = await HealthcareResource.findOne({
      organizationId: organizationA._id,
      resourceType: 'icu_bed',
    });

    const res = await request(app)
      .get(`/api/organizations/me/resources/${resourceA._id}`)
      .set('Authorization', `Bearer ${orgBToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/different organization/i);
  });

  // -------------------------------------------------------------
  // TEST SCENARIO 12: Concurrent inventory updates
  // -------------------------------------------------------------
  test('12. Concurrent inventory updates: concurrent capacity requests execute safely', async () => {
    const resource = await healthcareResourceService.registerResource(
      {
        organizationId: organizationA._id,
        resourceType: 'er_bay',
        resourceName: 'Trauma Resuscitation Bay',
        totalQuantity: 20,
        availableQuantity: 20,
      },
      orgAStaffUser._id
    );

    // Issue 2 concurrent capacity adjustments
    const [p1, p2] = await Promise.all([
      healthcareResourceService.updateCapacity(
        resource._id,
        organizationA._id,
        orgAStaffUser._id,
        { totalQuantity: 22, reason: 'Thread 1' }
      ),
      healthcareResourceService.updateCapacity(
        resource._id,
        organizationA._id,
        orgAStaffUser._id,
        { totalQuantity: 25, reason: 'Thread 2' }
      ),
    ]);

    const finalRes = await HealthcareResource.findById(resource._id);
    expect([22, 25]).toContain(finalRes.totalQuantity);
    expect(finalRes.availableQuantity).toBe(finalRes.totalQuantity);
  });

  // -------------------------------------------------------------
  // TEST SCENARIO 13: Concurrent reservations
  // -------------------------------------------------------------
  test('13. Concurrent reservations: atomic multi-reservation handles race conditions', async () => {
    const resource = await healthcareResourceService.registerResource(
      {
        organizationId: organizationA._id,
        resourceType: 'blood_bank_unit',
        resourceName: 'Emergency O- Blood Unit',
        totalQuantity: 2,
        availableQuantity: 2,
      },
      orgAStaffUser._id
    );

    // 3 parallel reservation requests each wanting 1 unit (only 2 exist)
    const results = await Promise.all([
      resourceRepository.atomicMultiResourceReserve(organizationA._id, [{ resourceType: 'blood_bank_unit', quantity: 1 }]),
      resourceRepository.atomicMultiResourceReserve(organizationA._id, [{ resourceType: 'blood_bank_unit', quantity: 1 }]),
      resourceRepository.atomicMultiResourceReserve(organizationA._id, [{ resourceType: 'blood_bank_unit', quantity: 1 }]),
    ]);

    const successes = results.filter((r) => r !== null && r?.success === true);
    const failures = results.filter((r) => r === null);

    expect(successes.length).toBe(2);
    expect(failures.length).toBe(1);

    const updated = await HealthcareResource.findById(resource._id);
    expect(updated.availableCapacity).toBe(0);
    expect(updated.reservedCapacity).toBe(2);
  });

  // -------------------------------------------------------------
  // TEST SCENARIO 14: Over-reservation prevention
  // -------------------------------------------------------------
  test('14. Over-reservation prevention: reservation exceeds available capacity and fails cleanly', async () => {
    const res = await resourceRepository.atomicMultiResourceReserve(organizationA._id, [
      { resourceType: 'blood_bank_unit', quantity: 1 },
    ]);

    expect(res).toBeNull(); // 0 available, reservation blocked
    const updated = await HealthcareResource.findOne({
      organizationId: organizationA._id,
      resourceType: 'blood_bank_unit',
    });
    expect(updated.availableCapacity).toBe(0);
  });

  // -------------------------------------------------------------
  // TEST SCENARIO 15: Resource allocation integration
  // -------------------------------------------------------------
  test('15. Resource allocation integration: allocating reserved resource transitions reserved to allocated', async () => {
    // Allocate 1 unit of blood_bank_unit
    await resourceRepository.atomicMultiResourceAllocate(organizationA._id, [
      { resourceType: 'blood_bank_unit', quantity: 1 },
    ]);

    const updated = await HealthcareResource.findOne({
      organizationId: organizationA._id,
      resourceType: 'blood_bank_unit',
    });

    expect(updated.reservedCapacity).toBe(1);
    expect(updated.occupiedCapacity).toBe(1);
    expect(updated.totalCapacity).toBe(2);
  });

  // -------------------------------------------------------------
  // TEST SCENARIO 16: Expired reservation release integration
  // -------------------------------------------------------------
  test('16. Expired reservation release integration: releasing reservation restores available capacity', async () => {
    // Release the 1 remaining reserved blood_bank_unit
    await resourceRepository.atomicMultiResourceRelease(organizationA._id, [
      { resourceType: 'blood_bank_unit', quantity: 1 },
    ]);

    const updated = await HealthcareResource.findOne({
      organizationId: organizationA._id,
      resourceType: 'blood_bank_unit',
    });

    expect(updated.reservedCapacity).toBe(0);
    expect(updated.availableCapacity).toBe(1);
  });

  // -------------------------------------------------------------
  // TEST SCENARIO 17: Stale resource identification
  // -------------------------------------------------------------
  test('17. Stale resource identification: identifies FRESH, STALE, and VERY_STALE inventory', () => {
    const freshRes = {
      freshnessThresholdMinutes: 60,
      lastVerifiedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 mins ago
    };
    expect(resourceAvailabilityService.evaluateFreshness(freshRes).freshnessStatus).toBe('FRESH');

    const staleRes = {
      freshnessThresholdMinutes: 60,
      lastVerifiedAt: new Date(Date.now() - 90 * 60 * 1000), // 90 mins ago
    };
    expect(resourceAvailabilityService.evaluateFreshness(staleRes).freshnessStatus).toBe('STALE');

    const veryStaleRes = {
      freshnessThresholdMinutes: 60,
      lastVerifiedAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
    };
    expect(resourceAvailabilityService.evaluateFreshness(veryStaleRes).freshnessStatus).toBe('VERY_STALE');
  });

  // -------------------------------------------------------------
  // TEST SCENARIO 18: Unauthorized access
  // -------------------------------------------------------------
  test('18. Unauthorized access: patient token cannot register or mutate organization resources', async () => {
    const res = await request(app)
      .post('/api/organizations/me/resources')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        resourceType: 'hack_bed',
        totalQuantity: 10,
      });

    expect(res.status).toBe(403);
  });

  // -------------------------------------------------------------
  // TEST SCENARIO 19: Inventory reconciliation
  // -------------------------------------------------------------
  test('19. Inventory reconciliation: detects drift and reconciles with active reservations', async () => {
    const resource = await HealthcareResource.findOne({
      organizationId: organizationA._id,
      resourceType: 'blood_bank_unit',
    });

    // Create a real active reservation item in the DB
    const dummyReq = await EmergencyRequest.create({
      patientId: patientUser._id,
      patientName: 'Karan Sharma',
      patientPhone: '+919876500003',
      reportedByUserId: patientUser._id,
      emergencyType: 'cardiac',
      description: 'Cardiac emergency needing blood',
      severity: 'critical',
      location: { type: 'Point', coordinates: [77.21, 28.61] },
      status: 'RESOURCES_RESERVED',
      destinationSelectionId: new mongoose.Types.ObjectId(),
      selectedOrganizationId: organizationA._id,
    });

    const dummyResv = await ResourceReservation.create({
      emergencyRequestId: dummyReq._id,
      organizationId: organizationA._id,
      status: 'TEMPORARILY_RESERVED',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    await ResourceReservationItem.create({
      reservationId: dummyResv._id,
      healthcareResourceId: resource._id,
      resourceType: 'blood_bank_unit',
      quantity: 1,
      status: 'RESERVED',
    });

    // Intentionally create a drift: set resource.reservedQuantity = 0
    resource.reservedQuantity = 0;
    resource.reservedCapacity = 0;
    resource.availableQuantity = 2;
    await resource.save();

    // Trigger reconciliation
    const result = await resourceReconciliationService.reconcileResource(
      resource._id,
      orgAStaffUser._id,
      { autoCorrect: true }
    );

    expect(result.hasDiscrepancy).toBe(true);
    expect(result.reconciled).toBe(true);
    expect(result.expectedReservedQuantity).toBe(1);

    const reconciled = await HealthcareResource.findById(resource._id);
    expect(reconciled.reservedQuantity).toBe(1);
    expect(reconciled.availableQuantity).toBe(1);

    // Verify RECONCILIATION history record
    const history = await ResourceInventoryHistory.findOne({
      resourceId: resource._id,
      changeType: 'RECONCILIATION',
    });
    expect(history).toBeTruthy();
    expect(history.reason).toMatch(/Automated inventory reconciliation/i);
  });
});

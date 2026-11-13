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
  AffiliationRequest,
  OrganizationFacility,
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

describe('MODULE 4: Doctor Affiliation Management Master Test Suite', () => {
  let adminUser;
  let adminToken;

  let verifiedOrgUser1;
  let verifiedOrg1;
  let orgToken1;

  let verifiedOrgUser2;
  let verifiedOrg2;
  let orgToken2;

  let unverifiedOrgUser;
  let unverifiedOrg;
  let unverifiedOrgToken;

  let verifiedDoctorUser1;
  let verifiedDoctor1;
  let doctorToken1;

  let verifiedDoctorUser2;
  let verifiedDoctor2;
  let doctorToken2;

  let unverifiedDoctorUser;
  let unverifiedDoctor;
  let unverifiedDoctorToken;

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
    await Doctor.deleteMany({});
    await Organization.deleteMany({});
    await DoctorAffiliation.deleteMany({});
    await AffiliationRequest.deleteMany({});
    await OrganizationFacility.deleteMany({});

    // 1. Admin
    adminUser = await User.create({
      name: 'System Admin',
      email: 'admin@shap.com',
      password: 'HashedPassword123!',
      role: 'admin',
      accountStatus: 'active',
      isEmailVerified: true,
    });
    adminToken = createToken(adminUser);

    // 2. Verified Org 1
    verifiedOrgUser1 = await User.create({
      name: 'City Care Hospital',
      email: 'admin@citycare.org',
      password: 'HashedPassword123!',
      role: 'organization',
      accountStatus: 'active',
      isEmailVerified: true,
    });
    orgToken1 = createToken(verifiedOrgUser1);

    verifiedOrg1 = await Organization.create({
      userId: verifiedOrgUser1._id,
      name: 'City Care General Hospital',
      legalName: 'City Care Healthcare Ltd',
      uniqueOrganizationCode: 'ORG-10001',
      qrCheckinCode: 'ORG-CC-10001',
      orgType: 'hospital',
      verificationStatus: 'verified',
      registrationNumber: 'REG-ORG-001',
      address: { street: '100 Medical Blvd', city: 'Metropolis', state: 'NY', postalCode: '10001' },
      emergencyCapable: true,
    });

    // 3. Verified Org 2 (for multi-affiliation testing)
    verifiedOrgUser2 = await User.create({
      name: 'Metro Trauma Center',
      email: 'admin@metrotrauma.org',
      password: 'HashedPassword123!',
      role: 'organization',
      accountStatus: 'active',
      isEmailVerified: true,
    });
    orgToken2 = createToken(verifiedOrgUser2);

    verifiedOrg2 = await Organization.create({
      userId: verifiedOrgUser2._id,
      name: 'Metro Trauma Center',
      legalName: 'Metro Trauma Network Inc',
      uniqueOrganizationCode: 'ORG-20002',
      qrCheckinCode: 'ORG-MTC-20002',
      orgType: 'hospital',
      verificationStatus: 'verified',
      registrationNumber: 'REG-ORG-002',
      address: { street: '200 Downtown Ave', city: 'Metropolis', state: 'NY', postalCode: '10002' },
      emergencyCapable: true,
    });

    // 4. Unverified Org
    unverifiedOrgUser = await User.create({
      name: 'Pending Clinic',
      email: 'admin@pendingclinic.org',
      password: 'HashedPassword123!',
      role: 'organization',
      accountStatus: 'pending_verification',
      isEmailVerified: true,
    });
    unverifiedOrgToken = createToken(unverifiedOrgUser);

    unverifiedOrg = await Organization.create({
      userId: unverifiedOrgUser._id,
      name: 'Pending Clinic Facility',
      orgType: 'clinic',
      qrCheckinCode: 'ORG-PEND-99999',
      verificationStatus: 'pending',
      registrationNumber: 'REG-ORG-UNV',
    });

    // 5. Verified Doctor 1
    verifiedDoctorUser1 = await User.create({
      name: 'Dr. Sneha Sen',
      email: 'sarah.jenkins@shap.com',
      password: 'HashedPassword123!',
      role: 'doctor',
      accountStatus: 'active',
      isEmailVerified: true,
    });
    doctorToken1 = createToken(verifiedDoctorUser1);

    verifiedDoctor1 = await Doctor.create({
      userId: verifiedDoctorUser1._id,
      doctorUniqueId: 'DOC-55001',
      specialization: 'Cardiology',
      verificationStatus: 'verified',
      licenseNumber: 'MD-NY-12345',
      experienceYears: 10,
    });

    // 6. Verified Doctor 2 (for IDOR check)
    verifiedDoctorUser2 = await User.create({
      name: 'Dr. Rajesh Iyer',
      email: 'alex.rivera@shap.com',
      password: 'HashedPassword123!',
      role: 'doctor',
      accountStatus: 'active',
      isEmailVerified: true,
    });
    doctorToken2 = createToken(verifiedDoctorUser2);

    verifiedDoctor2 = await Doctor.create({
      userId: verifiedDoctorUser2._id,
      doctorUniqueId: 'DOC-55002',
      specialization: 'Neurology',
      verificationStatus: 'verified',
      licenseNumber: 'MD-NY-67890',
      experienceYears: 7,
    });

    // 7. Unverified Doctor
    unverifiedDoctorUser = await User.create({
      name: 'Dr. Unapproved Sharma',
      email: 'unapproved.smith@shap.com',
      password: 'HashedPassword123!',
      role: 'doctor',
      accountStatus: 'pending_verification',
      isEmailVerified: true,
    });
    unverifiedDoctorToken = createToken(unverifiedDoctorUser);

    unverifiedDoctor = await Doctor.create({
      userId: unverifiedDoctorUser._id,
      doctorUniqueId: 'DOC-PEND-999',
      specialization: 'Pediatrics',
      verificationStatus: 'pending',
      licenseNumber: 'MD-PEND-999',
      experienceYears: 2,
    });
  });

  // TC-AFF-01: Organization searches verified doctors by Doctor ID, name, specialization
  test('TC-AFF-01: Organization searches verified doctors by Doctor ID, name, and specialization', async () => {
    // Search by Doctor ID
    const resId = await request(app)
      .get('/api/organizations/me/doctors/search?q=DOC-55001')
      .set('Authorization', `Bearer ${orgToken1}`);

    expect(resId.status).toBe(200);
    expect(resId.body.success).toBe(true);
    expect(resId.body.data.length).toBe(1);
    expect(resId.body.data[0].doctorUniqueId).toBe('DOC-55001');

    // Search by Specialization
    const resSpec = await request(app)
      .get('/api/organizations/me/doctors/search?q=Cardiology')
      .set('Authorization', `Bearer ${orgToken1}`);

    expect(resSpec.status).toBe(200);
    expect(resSpec.body.data.length).toBe(1);

    // Unverified doctor DOC-PEND-999 must NOT appear in verified search
    const resUnv = await request(app)
      .get('/api/organizations/me/doctors/search?q=Pediatrics')
      .set('Authorization', `Bearer ${orgToken1}`);

    expect(resUnv.status).toBe(200);
    expect(resUnv.body.data.length).toBe(0);
  });

  // TC-AFF-02: Organization cannot send affiliation request to an unverified doctor
  test('TC-AFF-02: Prevents affiliation request to unverified doctor', async () => {
    const res = await request(app)
      .post('/api/organizations/me/affiliation-requests')
      .set('Authorization', `Bearer ${orgToken1}`)
      .send({
        doctorId: unverifiedDoctor._id,
        department: 'Pediatrics',
        designation: 'Specialist',
      });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/only approved and verified doctors/i);
  });

  // TC-AFF-03: Unverified organization cannot send affiliation request
  test('TC-AFF-03: Prevents unverified organization from creating affiliation requests', async () => {
    const res = await request(app)
      .post('/api/organizations/me/affiliation-requests')
      .set('Authorization', `Bearer ${unverifiedOrgToken}`)
      .send({
        doctorId: verifiedDoctor1._id,
        department: 'Cardiology',
      });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/only verified healthcare organizations/i);
  });

  // TC-AFF-04: Organization creates valid affiliation request with department, designation, and dates
  test('TC-AFF-04: Organization successfully creates an affiliation request with full parameters', async () => {
    const res = await request(app)
      .post('/api/organizations/me/affiliation-requests')
      .set('Authorization', `Bearer ${orgToken1}`)
      .send({
        doctorId: verifiedDoctor1._id,
        department: 'Interventional Cardiology',
        designation: 'Senior Consultant',
        affiliationType: 'VISITING',
        proposedStartDate: '2026-12-01',
        proposedEndDate: '2027-12-01',
        message: 'We would be honored to have you head our weekly heart outpatient clinic.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.requestId).toMatch(/^AFF-REQ-/);
    expect(res.body.data.department).toBe('Interventional Cardiology');
    expect(res.body.data.designation).toBe('Senior Consultant');
    expect(res.body.data.affiliationType).toBe('VISITING');
  });

  // TC-AFF-05: Prevents duplicate pending affiliation request for same doctor
  test('TC-AFF-05: Prevents duplicate pending affiliation request to the same doctor', async () => {
    // 1st request
    await request(app)
      .post('/api/organizations/me/affiliation-requests')
      .set('Authorization', `Bearer ${orgToken1}`)
      .send({
        doctorId: verifiedDoctor1._id,
        department: 'Cardiology',
        designation: 'Consultant',
      });

    // 2nd duplicate request
    const res = await request(app)
      .post('/api/organizations/me/affiliation-requests')
      .set('Authorization', `Bearer ${orgToken1}`)
      .send({
        doctorId: verifiedDoctor1._id,
        department: 'Cardiology',
        designation: 'Consultant',
      });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/pending affiliation request already exists/i);
  });

  // TC-AFF-06: Doctor views incoming affiliation requests
  test('TC-AFF-06: Doctor views incoming pending affiliation requests', async () => {
    // Org 1 sends request to Doctor 1
    await request(app)
      .post('/api/organizations/me/affiliation-requests')
      .set('Authorization', `Bearer ${orgToken1}`)
      .send({
        doctorId: verifiedDoctor1._id,
        department: 'Cardiology',
        designation: 'Visiting Specialist',
        message: 'Welcome to our team',
      });

    // Doctor 1 fetches their requests
    const res = await request(app)
      .get('/api/doctors/me/affiliation-requests')
      .set('Authorization', `Bearer ${doctorToken1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].status).toBe('PENDING');
    expect(res.body.data[0].organizationId.name).toBe('City Care General Hospital');
    expect(res.body.data[0].organizationId.uniqueOrganizationCode).toBe('ORG-10001');

    // Doctor 2 should see 0 requests
    const resDoc2 = await request(app)
      .get('/api/doctors/me/affiliation-requests')
      .set('Authorization', `Bearer ${doctorToken2}`);

    expect(resDoc2.status).toBe(200);
    expect(resDoc2.body.data.length).toBe(0);
  });

  // TC-AFF-07: Doctor accepts affiliation request -> creates active DoctorAffiliation and marks request ACCEPTED
  test('TC-AFF-07: Doctor accepts affiliation request -> creates ACTIVE DoctorAffiliation', async () => {
    // Org sends request
    const reqRes = await request(app)
      .post('/api/organizations/me/affiliation-requests')
      .set('Authorization', `Bearer ${orgToken1}`)
      .send({
        doctorId: verifiedDoctor1._id,
        department: 'Cardiology',
        designation: 'Consultant',
      });

    const requestId = reqRes.body.data._id;

    // Doctor accepts
    const acceptRes = await request(app)
      .post(`/api/doctors/me/affiliation-requests/${requestId}/accept`)
      .set('Authorization', `Bearer ${doctorToken1}`)
      .send({ message: 'I gladly accept the affiliation.' });

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.success).toBe(true);
    expect(acceptRes.body.data.request.status).toBe('ACCEPTED');
    expect(acceptRes.body.data.affiliation.status).toBe('ACTIVE');
    expect(acceptRes.body.data.affiliation.affiliationId).toMatch(/^AFF-/);

    // Verify DoctorAffiliation exists in database
    const dbAffiliation = await DoctorAffiliation.findOne({
      doctorId: verifiedDoctor1._id,
      organizationId: verifiedOrg1._id,
    });
    expect(dbAffiliation).not.toBeNull();
    expect(dbAffiliation.status).toBe('ACTIVE');
    expect(dbAffiliation.acceptedAt).toBeDefined();

    // Verify doctor's active affiliations endpoint
    const docAffsRes = await request(app)
      .get('/api/doctors/me/affiliations?status=active')
      .set('Authorization', `Bearer ${doctorToken1}`);

    expect(docAffsRes.status).toBe(200);
    expect(docAffsRes.body.data.length).toBe(1);
    expect(docAffsRes.body.data[0].status).toBe('ACTIVE');

    // Verify organization's affiliations endpoint
    const orgAffsRes = await request(app)
      .get('/api/organizations/me/affiliations?status=active')
      .set('Authorization', `Bearer ${orgToken1}`);

    expect(orgAffsRes.status).toBe(200);
    expect(orgAffsRes.body.data.length).toBe(1);
  });

  // TC-AFF-08: Prevents accepting an affiliation request by unauthorized doctor (IDOR protection)
  test('TC-AFF-08: Doctor cannot accept an affiliation request addressed to another doctor (IDOR protection)', async () => {
    // Org sends request to Doctor 1
    const reqRes = await request(app)
      .post('/api/organizations/me/affiliation-requests')
      .set('Authorization', `Bearer ${orgToken1}`)
      .send({
        doctorId: verifiedDoctor1._id,
        department: 'Cardiology',
      });

    const requestId = reqRes.body.data._id;

    // Doctor 2 attempts to accept Doctor 1's request
    const unauthorizedRes = await request(app)
      .post(`/api/doctors/me/affiliation-requests/${requestId}/accept`)
      .set('Authorization', `Bearer ${doctorToken2}`)
      .send({ message: 'Attempting hijacking' });

    expect(unauthorizedRes.status).toBe(500);
    expect(unauthorizedRes.body.success).toBe(false);
    expect(unauthorizedRes.body.message).toMatch(/unauthorized.*only respond to requests addressed to (them|you)/i);
  });

  // TC-AFF-09: Doctor rejects affiliation request with response reason
  test('TC-AFF-09: Doctor rejects affiliation request with response reason', async () => {
    // Org sends request
    const reqRes = await request(app)
      .post('/api/organizations/me/affiliation-requests')
      .set('Authorization', `Bearer ${orgToken1}`)
      .send({
        doctorId: verifiedDoctor1._id,
        department: 'Cardiology',
      });

    const requestId = reqRes.body.data._id;

    // Doctor rejects
    const rejectRes = await request(app)
      .post(`/api/doctors/me/affiliation-requests/${requestId}/reject`)
      .set('Authorization', `Bearer ${doctorToken1}`)
      .send({ reason: 'Current clinical schedule full; cannot commit to additional OPD hours.' });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.success).toBe(true);
    expect(rejectRes.body.data.status).toBe('REJECTED');
    expect(rejectRes.body.data.responseReason).toContain('Current clinical schedule full');

    // No active affiliation should exist
    const dbAffiliation = await DoctorAffiliation.findOne({
      doctorId: verifiedDoctor1._id,
      organizationId: verifiedOrg1._id,
    });
    expect(dbAffiliation).toBeNull();
  });

  // TC-AFF-10: Multiple active affiliations - Doctor can be affiliated with Org 1 AND Org 2 simultaneously
  test('TC-AFF-10: Doctor maintains multiple active affiliations simultaneously across different organizations', async () => {
    // 1. Request from Org 1
    const req1 = await request(app)
      .post('/api/organizations/me/affiliation-requests')
      .set('Authorization', `Bearer ${orgToken1}`)
      .send({ doctorId: verifiedDoctor1._id, department: 'Cardiology' });

    await request(app)
      .post(`/api/doctors/me/affiliation-requests/${req1.body.data._id}/accept`)
      .set('Authorization', `Bearer ${doctorToken1}`);

    // 2. Request from Org 2
    const req2 = await request(app)
      .post('/api/organizations/me/affiliation-requests')
      .set('Authorization', `Bearer ${orgToken2}`)
      .send({ doctorId: verifiedDoctor1._id, department: 'Emergency Trauma' });

    await request(app)
      .post(`/api/doctors/me/affiliation-requests/${req2.body.data._id}/accept`)
      .set('Authorization', `Bearer ${doctorToken1}`);

    // Doctor 1 should have 2 active affiliations
    const docRes = await request(app)
      .get('/api/doctors/me/affiliations?status=active')
      .set('Authorization', `Bearer ${doctorToken1}`);

    expect(docRes.status).toBe(200);
    expect(docRes.body.data.length).toBe(2);
    const orgCodes = docRes.body.data.map((a) => a.organizationId.uniqueOrganizationCode);
    expect(orgCodes).toContain('ORG-10001');
    expect(orgCodes).toContain('ORG-20002');
  });

  // TC-AFF-11: Doctor terminates affiliation -> status becomes TERMINATED and historical record preserved
  test('TC-AFF-11: Doctor terminates active affiliation -> status becomes TERMINATED, historical record preserved', async () => {
    // Setup active affiliation
    const req = await request(app)
      .post('/api/organizations/me/affiliation-requests')
      .set('Authorization', `Bearer ${orgToken1}`)
      .send({ doctorId: verifiedDoctor1._id, department: 'Cardiology' });

    const acceptRes = await request(app)
      .post(`/api/doctors/me/affiliation-requests/${req.body.data._id}/accept`)
      .set('Authorization', `Bearer ${doctorToken1}`);

    const affiliationId = acceptRes.body.data.affiliation._id;

    // Doctor terminates affiliation
    const termRes = await request(app)
      .post(`/api/doctors/me/affiliations/${affiliationId}/terminate`)
      .set('Authorization', `Bearer ${doctorToken1}`)
      .send({ reason: 'Relocating to another state.' });

    expect(termRes.status).toBe(200);
    expect(termRes.body.success).toBe(true);
    expect(termRes.body.data.status).toBe('TERMINATED');
    expect(termRes.body.data.terminationReason).toContain('Relocating to another state');

    // Record MUST NOT be physically deleted from database
    const dbRecord = await DoctorAffiliation.findById(affiliationId);
    expect(dbRecord).not.toBeNull();
    expect(dbRecord.status).toBe('TERMINATED');
    expect(dbRecord.terminatedAt).toBeDefined();

    // Active affiliations list should now be 0
    const activeRes = await request(app)
      .get('/api/doctors/me/affiliations?status=active')
      .set('Authorization', `Bearer ${doctorToken1}`);
    expect(activeRes.body.data.length).toBe(0);

    // History affiliations should show 1
    const histRes = await request(app)
      .get('/api/doctors/me/affiliations?status=history')
      .set('Authorization', `Bearer ${doctorToken1}`);
    expect(histRes.body.data.length).toBe(1);
  });

  // TC-AFF-12: Organization terminates affiliation -> status becomes TERMINATED
  test('TC-AFF-12: Organization terminates active affiliation -> status becomes TERMINATED', async () => {
    // Setup active affiliation
    const req = await request(app)
      .post('/api/organizations/me/affiliation-requests')
      .set('Authorization', `Bearer ${orgToken1}`)
      .send({ doctorId: verifiedDoctor1._id, department: 'Cardiology' });

    const acceptRes = await request(app)
      .post(`/api/doctors/me/affiliation-requests/${req.body.data._id}/accept`)
      .set('Authorization', `Bearer ${doctorToken1}`);

    const affiliationId = acceptRes.body.data.affiliation._id;

    // Organization terminates
    const termRes = await request(app)
      .post(`/api/organizations/me/affiliations/${affiliationId}/terminate`)
      .set('Authorization', `Bearer ${orgToken1}`)
      .send({ reason: 'Department restructuring.' });

    expect(termRes.status).toBe(200);
    expect(termRes.body.success).toBe(true);
    expect(termRes.body.data.status).toBe('TERMINATED');
  });

  // TC-AFF-13: Prevents terminating an already terminated affiliation
  test('TC-AFF-13: Prevents terminating an already terminated affiliation', async () => {
    const req = await request(app)
      .post('/api/organizations/me/affiliation-requests')
      .set('Authorization', `Bearer ${orgToken1}`)
      .send({ doctorId: verifiedDoctor1._id, department: 'Cardiology' });

    const acceptRes = await request(app)
      .post(`/api/doctors/me/affiliation-requests/${req.body.data._id}/accept`)
      .set('Authorization', `Bearer ${doctorToken1}`);

    const affiliationId = acceptRes.body.data.affiliation._id;

    // First termination
    await request(app)
      .post(`/api/doctors/me/affiliations/${affiliationId}/terminate`)
      .set('Authorization', `Bearer ${doctorToken1}`)
      .send({ reason: 'Initial termination' });

    // Second termination attempt
    const secondTerm = await request(app)
      .post(`/api/doctors/me/affiliations/${affiliationId}/terminate`)
      .set('Authorization', `Bearer ${doctorToken1}`)
      .send({ reason: 'Repeat attempt' });

    expect(secondTerm.status).toBe(500);
    expect(secondTerm.body.success).toBe(false);
    expect(secondTerm.body.message).toMatch(/already terminated/i);
  });

  // TC-AFF-14: Admin can list all affiliations across the platform
  test('TC-AFF-14: Web Admin can list all doctor affiliations across the platform', async () => {
    // Create an active affiliation
    const req = await request(app)
      .post('/api/organizations/me/affiliation-requests')
      .set('Authorization', `Bearer ${orgToken1}`)
      .send({ doctorId: verifiedDoctor1._id, department: 'Cardiology' });

    await request(app)
      .post(`/api/doctors/me/affiliation-requests/${req.body.data._id}/accept`)
      .set('Authorization', `Bearer ${doctorToken1}`);

    // Admin lists all affiliations
    const adminRes = await request(app)
      .get('/api/admin/affiliations')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminRes.status).toBe(200);
    expect(adminRes.body.success).toBe(true);
    expect(adminRes.body.count).toBeGreaterThanOrEqual(1);
    expect(adminRes.body.data[0].doctorId).toBeDefined();
    expect(adminRes.body.data[0].organizationId).toBeDefined();
  });
});

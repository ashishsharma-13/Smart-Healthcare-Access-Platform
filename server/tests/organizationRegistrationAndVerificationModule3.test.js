import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import {
  User,
  Organization,
  Doctor,
  DoctorAffiliation,
  OrganizationAdmin,
  OrganizationFacility,
  OrganizationDocument,
  OrganizationSpecialization,
  OrganizationVerificationApplication,
} from '../src/models/index.js';

let mongoServer;

const createAdminToken = (adminUser) => {
  return jwt.sign(
    {
      id: adminUser._id,
      role: 'admin',
      jti: 'admin-jti-' + Math.random(),
    },
    process.env.JWT_SECRET || 'shap_super_secret_jwt_key_2025_access_health',
    { expiresIn: '1h' }
  );
};

const createOrgToken = (orgUser) => {
  return jwt.sign(
    {
      id: orgUser._id,
      role: 'organization',
      jti: 'org-jti-' + Math.random(),
    },
    process.env.JWT_SECRET || 'shap_super_secret_jwt_key_2025_access_health',
    { expiresIn: '1h' }
  );
};

describe('MODULE 3: Organization Registration and Verification Management Test Suite', () => {
  let adminUser;
  let adminToken;

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
    await Doctor.deleteMany({});
    await DoctorAffiliation.deleteMany({});
    await OrganizationAdmin.deleteMany({});
    await OrganizationFacility.deleteMany({});
    await OrganizationDocument.deleteMany({});
    await OrganizationSpecialization.deleteMany({});
    await OrganizationVerificationApplication.deleteMany({});

    adminUser = await User.create({
      name: 'Executive Web Admin',
      email: 'admin.governance@shap.health',
      phone: '+919876500000',
      password: 'AdminPassword123',
      role: 'admin',
      status: 'active',
    });
    adminToken = createAdminToken(adminUser);
  });

  // TC-ORG-01
  test('TC-ORG-01: should register organization with PENDING_VERIFICATION status and generate applicationReference', async () => {
    const orgPayload = {
      name: 'Max Healthcare Institute',
      legalName: 'Max Healthcare Institute Ltd.',
      orgType: 'hospital',
      registrationNumber: 'HOSP-DEL-2024-9988',
      officialEmail: 'contact@maxhealthcare.com',
      contactNumber: '+919876543210',
      website: 'https://maxhealthcare.com',
      description: 'Super-specialty tertiary care hospital offering advanced trauma & cardiac care.',
      registeredAddress: {
        buildingNumber: 'Plot 1',
        streetName: 'Press Enclave Road',
        locality: 'Saket',
        city: 'New Delhi',
        district: 'South Delhi',
        state: 'Delhi',
        pinCode: '110017',
        country: 'India',
      },
      operatingAddress: {
        buildingNumber: 'Plot 1',
        streetName: 'Press Enclave Road',
        locality: 'Saket',
        city: 'New Delhi',
        district: 'South Delhi',
        state: 'Delhi',
        pinCode: '110017',
        country: 'India',
        isSameAsRegistered: true,
      },
      latitude: 28.5284,
      longitude: 77.2185,
      emergencyCapable: true,
      emergencyContactPhone: '+919876543299',
      representative: {
        name: 'Dr. Rajeev Kumar',
        email: 'dr.rajeev@maxhealthcare.com',
        phone: '+919876543211',
        designation: 'Medical Superintendent',
      },
      healthcareCapabilities: ['Emergency Trauma Unit', 'ICU', 'NICU', 'Cardiac Cath Lab'],
      specializations: ['Cardiology', 'Emergency Medicine', 'Neurology'],
      documents: [
        {
          documentType: 'establishment_registration',
          documentName: 'Hospital_Establishment_License.pdf',
          storageReference: 'https://storage.shap.health/docs/max_license.pdf',
        },
        {
          documentType: 'operating_license',
          documentName: 'Municipal_Operating_Permit.pdf',
          storageReference: 'https://storage.shap.health/docs/max_permit.pdf',
        },
      ],
      password: 'MaxHospital@2026',
    };

    const res = await request(app).post('/api/organizations/register').send(orgPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.applicationReference).toMatch(/^ORG-APP-\d{5}$/);
    expect(res.body.data.organization.verificationStatus).toBe('pending');

    // Check Organization in DB
    const savedOrg = await Organization.findOne({ registrationNumber: 'HOSP-DEL-2024-9988' });
    expect(savedOrg).not.toBeNull();
    expect(savedOrg.applicationReference).toBe(res.body.data.applicationReference);
    expect(savedOrg.verificationStatus).toBe('pending');
    expect(savedOrg.location.coordinates).toEqual([77.2185, 28.5284]);

    // Check Primary Facility Created
    const primaryFacility = await OrganizationFacility.findOne({ organizationId: savedOrg._id, isPrimary: true });
    expect(primaryFacility).not.toBeNull();
    expect(primaryFacility.facilityType).toBe('main_campus');

    // Check Verification Application Record Created
    const appRecord = await OrganizationVerificationApplication.findOne({ organizationId: savedOrg._id });
    expect(appRecord).not.toBeNull();
    expect(appRecord.applicationStatus).toBe('PENDING_VERIFICATION');
    expect(appRecord.history[0].action).toBe('SUBMITTED');
  });

  // TC-ORG-02
  test('TC-ORG-02: should prevent duplicate organization registration with existing registrationNumber', async () => {
    const payload1 = {
      name: 'Apollo Hospital',
      registrationNumber: 'HOSP-DUP-1234',
      officialEmail: 'apollo1@test.com',
      contactNumber: '+919876511111',
      latitude: 28.54,
      longitude: 77.25,
      password: 'Password@123',
    };
    await request(app).post('/api/organizations/register').send(payload1);

    const payloadDuplicate = {
      name: 'Apollo Hospital Duplicate Branch',
      registrationNumber: 'HOSP-DUP-1234',
      officialEmail: 'apollo2@test.com',
      contactNumber: '+919876522222',
      latitude: 28.54,
      longitude: 77.25,
      password: 'Password@123',
    };

    const res = await request(app).post('/api/organizations/register').send(payloadDuplicate);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already registered|already exists/i);
  });

  // TC-ORG-03
  test('TC-ORG-03: should reject unverified organization login attempts with 403 status', async () => {
    await request(app).post('/api/organizations/register').send({
      name: 'Fortis Healthcare',
      registrationNumber: 'HOSP-FORTIS-001',
      officialEmail: 'fortis.desk@test.com',
      contactNumber: '+919876533333',
      latitude: 28.5,
      longitude: 77.2,
      password: 'FortisPassword@123',
    });

    const loginRes = await request(app).post('/api/auth/login').send({
      identifier: 'fortis.desk@test.com',
      password: 'FortisPassword@123',
    });

    expect(loginRes.status).toBe(403);
    expect(loginRes.body.success).toBe(false);
    expect(loginRes.body.code).toMatch(/PENDING_VERIFICATION/i);
    expect(loginRes.body.message).toMatch(/pending.*verification|accreditation verification/i);
  });

  // TC-ORG-04
  test('TC-ORG-04: should exclude unverified organizations from verified directory search', async () => {
    // Unverified Org
    await request(app).post('/api/organizations/register').send({
      name: 'Unverified Care Center',
      registrationNumber: 'REG-UNVER-001',
      officialEmail: 'unverified@test.com',
      contactNumber: '+919876544444',
      latitude: 28.5,
      longitude: 77.2,
      password: 'Password@123',
    });

    // Verified Org
    const verifiedUser = await User.create({
      name: 'Verified Hospital Head',
      email: 'verified.hospital@test.com',
      role: 'organization',
      status: 'active',
      password: 'Password@123',
    });
    await Organization.create({
      userId: verifiedUser._id,
      name: 'AIIMS Verified Apex Hospital',
      registrationNumber: 'REG-AIIMS-001',
      verificationStatus: 'verified',
      uniqueOrganizationCode: 'ORG-10001',
      qrCheckinCode: 'ORG-QR-AIIMS-001',
      location: { type: 'Point', coordinates: [77.2, 28.5] },
    });

    const res = await request(app).get('/api/organizations?verifiedOnly=true');
    expect(res.status).toBe(200);
    const names = res.body.data.map((o) => o.name);
    expect(names).toContain('AIIMS Verified Apex Hospital');
    expect(names).not.toContain('Unverified Care Center');
  });

  // TC-ORG-05
  test('TC-ORG-05: should permit admin to list pending organization applications', async () => {
    await request(app).post('/api/organizations/register').send({
      name: 'City Care Clinic',
      registrationNumber: 'HOSP-CITY-001',
      officialEmail: 'citycare@test.com',
      contactNumber: '+919876555555',
      latitude: 28.6,
      longitude: 77.2,
      password: 'Password@123',
    });

    const res = await request(app)
      .get('/api/admin/organizations/pending')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.some((o) => o.name === 'City Care Clinic')).toBe(true);
  });

  // TC-ORG-06
  test('TC-ORG-06: should permit admin to view complete organization application details, facilities, representative, and documents', async () => {
    const regRes = await request(app).post('/api/organizations/register').send({
      name: 'Dossier Test Hospital',
      registrationNumber: 'HOSP-DOSSIER-001',
      officialEmail: 'dossier@test.com',
      contactNumber: '+919876566666',
      latitude: 28.61,
      longitude: 77.22,
      representative: {
        name: 'Dr. Anita Roy',
        email: 'anita@test.com',
        phone: '+919876566667',
        designation: 'Chief Medical Officer',
      },
      documents: [
        {
          documentType: 'establishment_registration',
          documentName: 'Dossier_Registration.pdf',
          storageReference: 'https://storage.shap.health/docs/dossier.pdf',
        },
      ],
      password: 'Password@123',
    });

    const orgId = regRes.body.data.organization._id;

    const res = await request(app)
      .get(`/api/admin/organizations/${orgId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.organization.name).toBe('Dossier Test Hospital');
    expect(res.body.data.verification.applicationReference).toMatch(/^ORG-APP-\d{5}$/);
    expect(res.body.data.verification.facilities.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.verification.representative).not.toBeNull();
  });

  // TC-ORG-07
  test('TC-ORG-07: should permit admin to approve pending organization, generating unique Organization ID (ORG-XXXXX) and activating account', async () => {
    const regRes = await request(app).post('/api/organizations/register').send({
      name: 'Medanta Heart Institute',
      registrationNumber: 'HOSP-MEDANTA-001',
      officialEmail: 'medanta.auth@test.com',
      contactNumber: '+919876577777',
      latitude: 28.45,
      longitude: 77.05,
      password: 'Password@123',
    });

    const orgId = regRes.body.data.organization._id;

    const approveRes = await request(app)
      .post(`/api/admin/organizations/${orgId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.success).toBe(true);
    expect(approveRes.body.data.verificationStatus).toBe('verified');
    expect(approveRes.body.data.uniqueOrganizationCode).toMatch(/^ORG-\d{5}$/);

    // Verify User activated
    const updatedUser = await User.findById(regRes.body.data.user._id);
    expect(updatedUser.status).toBe('active');

    // Verify Application status in DB
    const appRecord = await OrganizationVerificationApplication.findOne({ organizationId: orgId });
    expect(appRecord.applicationStatus).toBe('APPROVED');
    expect(appRecord.reviewedBy.toString()).toBe(adminUser._id.toString());
  });

  // TC-ORG-08
  test('TC-ORG-08: should prevent double approval of an already verified organization', async () => {
    const regRes = await request(app).post('/api/organizations/register').send({
      name: 'Double Approval Hospital',
      registrationNumber: 'HOSP-DBL-001',
      officialEmail: 'double.appr@test.com',
      contactNumber: '+919876588888',
      latitude: 28.6,
      longitude: 77.2,
      password: 'Password@123',
    });

    const orgId = regRes.body.data.organization._id;

    // First approval
    await request(app)
      .post(`/api/admin/organizations/${orgId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    // Second approval attempt
    const secondRes = await request(app)
      .post(`/api/admin/organizations/${orgId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(secondRes.status).toBe(400);
    expect(secondRes.body.success).toBe(false);
    expect(secondRes.body.message).toMatch(/already been verified/i);
  });

  // TC-ORG-09 & TC-ORG-10
  test('TC-ORG-09 & 10: should enforce mandatory rejection reason and log in audit history', async () => {
    const regRes = await request(app).post('/api/organizations/register').send({
      name: 'Deficient Facility',
      registrationNumber: 'HOSP-DEF-001',
      officialEmail: 'deficient@test.com',
      contactNumber: '+919876599999',
      latitude: 28.6,
      longitude: 77.2,
      password: 'Password@123',
    });

    const orgId = regRes.body.data.organization._id;

    // Rejection without reason fails
    const failRes = await request(app)
      .post(`/api/admin/organizations/${orgId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(failRes.status).toBe(400);
    expect(failRes.body.message).toMatch(/mandatory rejection reason is required/i);

    // Rejection with mandatory reason succeeds
    const successRes = await request(app)
      .post(`/api/admin/organizations/${orgId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Establishment license expired and pollution control certificate illegible.' });

    expect(successRes.status).toBe(200);
    expect(successRes.body.data.verificationStatus).toBe('rejected');
    expect(successRes.body.data.rejectionReason).toBe('Establishment license expired and pollution control certificate illegible.');

    // Verify Application History
    const appRecord = await OrganizationVerificationApplication.findOne({ organizationId: orgId });
    expect(appRecord.applicationStatus).toBe('REJECTED');
    const rejectLog = appRecord.history.find((h) => h.action === 'REJECTED');
    expect(rejectLog).not.toBeNull();
    expect(rejectLog.remarks).toBe('Establishment license expired and pollution control certificate illegible.');
  });

  // TC-ORG-11
  test('TC-ORG-11: should allow rejected organization to resubmit application with updated documentation', async () => {
    const regRes = await request(app).post('/api/organizations/register').send({
      name: 'Resubmit Hospital',
      registrationNumber: 'HOSP-RESUB-001',
      officialEmail: 'resubmit.org@test.com',
      contactNumber: '+919876500011',
      latitude: 28.6,
      longitude: 77.2,
      password: 'Password@123',
    });

    const orgId = regRes.body.data.organization._id;
    const orgUserId = regRes.body.data.user._id;

    // Admin rejects
    await request(app)
      .post(`/api/admin/organizations/${orgId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Missing renewed clinical establishment certificate.' });

    // Generate token for the rejected org user to resubmit
    const orgToken = createOrgToken({ _id: orgUserId });

    const resubmitRes = await request(app)
      .post('/api/organizations/me/resubmit')
      .set('Authorization', `Bearer ${orgToken}`)
      .send({
        documents: [
          {
            documentType: 'establishment_registration',
            documentName: 'Renewed_Establishment_Certificate_2026.pdf',
            storageReference: 'https://storage.shap.health/docs/renewed_cert.pdf',
          },
        ],
      });

    expect(resubmitRes.status).toBe(200);
    expect(resubmitRes.body.success).toBe(true);
    expect(resubmitRes.body.data.verificationStatus).toBe('pending');

    // Verify Application status transitioned to PENDING_VERIFICATION
    const appRecord = await OrganizationVerificationApplication.findOne({ organizationId: orgId });
    expect(appRecord.applicationStatus).toBe('PENDING_VERIFICATION');
    const resubLog = appRecord.history.find((h) => h.action === 'RESUBMITTED');
    expect(resubLog).not.toBeNull();
  });

  // TC-ORG-12
  test('TC-ORG-12: should permit organization to manage facilities (branches) with address, coordinates, and capabilities', async () => {
    const regRes = await request(app).post('/api/organizations/register').send({
      name: 'Multi-Branch Healthcare Network',
      registrationNumber: 'HOSP-NET-001',
      officialEmail: 'network@test.com',
      contactNumber: '+919876500022',
      latitude: 28.6,
      longitude: 77.2,
      password: 'Password@123',
    });

    const orgUserId = regRes.body.data.user._id;
    const orgToken = createOrgToken({ _id: orgUserId });

    // Add branch facility
    const addFacRes = await request(app)
      .post('/api/organizations/me/facilities')
      .set('Authorization', `Bearer ${orgToken}`)
      .send({
        facilityName: 'South Delhi Diagnostic & Outpatient Annex',
        facilityType: 'diagnostic_center',
        address: {
          buildingNumber: 'Building 4B',
          streetName: 'Outer Ring Road',
          locality: 'Nehru Place',
          city: 'New Delhi',
          state: 'Delhi',
          pinCode: '110019',
        },
        latitude: 28.55,
        longitude: 77.25,
        capabilities: ['MRI 3T', 'CT 128 Slice', 'Day Care Surgery'],
        totalBeds: 25,
        icuBeds: 4,
      });

    expect(addFacRes.status).toBe(201);
    expect(addFacRes.body.success).toBe(true);
    expect(addFacRes.body.data.facilityId).toMatch(/^FAC-\d{5}$/);
    expect(addFacRes.body.data.isPrimary).toBe(false);

    // List facilities
    const listRes = await request(app)
      .get('/api/organizations/me/facilities')
      .set('Authorization', `Bearer ${orgToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.count).toBe(2); // Main campus + new branch
  });

  // TC-ORG-13
  test('TC-ORG-13: should forbid non-admin users from accessing organization verification administrative routes', async () => {
    const regularUser = await User.create({
      name: 'Regular Patient',
      email: 'patient.user@test.com',
      phone: '+919876500033',
      password: 'Password@123',
      role: 'patient',
      status: 'active',
    });
    const patientToken = jwt.sign(
      { id: regularUser._id, role: 'patient' },
      process.env.JWT_SECRET || 'shap_super_secret_jwt_key_2025_access_health'
    );

    const res = await request(app)
      .get('/api/admin/organizations/pending')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(403);
  });

  // TC-ORG-14
  test('TC-ORG-14: should support searching verified doctors by Doctor ID / name for doctor affiliation from organization', async () => {
    // Create a verified doctor with unique Doctor ID
    const docUser = await User.create({
      name: 'Dr. Vikram Malhotra',
      email: 'vikram.malhotra@test.com',
      phone: '+919876500044',
      password: 'Password@123',
      role: 'doctor',
      status: 'active',
    });
    await Doctor.create({
      userId: docUser._id,
      specialization: 'Cardiology',
      licenseNumber: 'NMC-2016-55443',
      doctorUniqueId: 'DOC-55443',
      verificationStatus: 'verified',
    });

    // Create organization
    const orgUser = await User.create({
      name: 'Affiliation Test Hospital Head',
      email: 'affil.org@test.com',
      phone: '+919876500055',
      password: 'Password@123',
      role: 'organization',
      status: 'active',
    });
    const org = await Organization.create({
      userId: orgUser._id,
      name: 'Affiliation Search Hospital',
      registrationNumber: 'HOSP-AFFIL-001',
      qrCheckinCode: 'ORG-QR-AFFIL-001',
      verificationStatus: 'verified',
    });
    const orgToken = createOrgToken(orgUser);

    // Search by Doctor ID: "DOC-55443"
    const searchRes = await request(app)
      .get('/api/organizations/doctors/search?q=DOC-55443')
      .set('Authorization', `Bearer ${orgToken}`);

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.success).toBe(true);
    expect(searchRes.body.data.length).toBeGreaterThanOrEqual(1);
    expect(searchRes.body.data[0].doctorUniqueId).toBe('DOC-55443');
    expect(searchRes.body.data[0].userId?.name).toBe('Dr. Vikram Malhotra');
  });
});

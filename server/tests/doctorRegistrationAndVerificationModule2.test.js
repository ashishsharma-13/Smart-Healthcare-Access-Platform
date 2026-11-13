import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Doctor } from '../src/models/Doctor.js';
import { DoctorQrCredential } from '../src/models/DoctorQrCredential.js';
import { DoctorVerificationApplication } from '../src/models/DoctorVerificationApplication.js';
import autoSeed from '../src/utils/autoSeed.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  await autoSeed();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('MODULE 2: DOCTOR REGISTRATION AND VERIFICATION MANAGEMENT TEST SUITE', () => {
  let adminToken;
  let patientToken;
  let registeredDoctorId;
  let registeredUserId;
  let testAppReference;

  beforeAll(async () => {
    // 1. Obtain Admin Token
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@shap.com', password: 'password123' });
    adminToken = adminLoginRes.body.token;

    // 2. Obtain Patient Token
    const patientLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'patient@shap.com', password: 'password123' });
    patientToken = patientLoginRes.body.token;
  });

  // Test 1: Successful doctor registration via POST /api/doctors/register
  test('1. Successful Doctor Registration - creates pending account with application reference', async () => {
    const res = await request(app)
      .post('/api/doctors/register')
      .send({
        name: 'Dr. Aarav Thapar',
        email: 'aarav.thapar@test.com',
        phone: '+919876500001',
        password: 'password123',
        specialization: 'Cardiology',
        qualifications: ['MBBS', 'MD - Cardiology'],
        experienceYears: 9,
        licenseNumber: 'NMC-2025-CARD-091',
        issuingAuthority: 'National Medical Commission',
        registrationJurisdiction: 'Maharashtra',
        registrationYear: 2016,
        bio: 'Senior interventional cardiologist with focus on acute coronary syndromes.',
        consultationFee: 1200,
        documents: [
          {
            documentType: 'medical_registration',
            documentName: 'Medical_Council_Certificate.pdf',
            storageReference: 'https://storage.shap.health/docs/nmc_091.pdf',
            fileSize: 1048576,
            mimeType: 'application/pdf',
          },
          {
            documentType: 'qualification_degree',
            documentName: 'MD_Degree_Certificate.pdf',
            storageReference: 'https://storage.shap.health/docs/md_degree_091.pdf',
            fileSize: 2097152,
            mimeType: 'application/pdf',
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.applicationReference).toBeDefined();
    expect(res.body.status).toBe('PENDING_VERIFICATION');

    testAppReference = res.body.applicationReference;
    registeredDoctorId = res.body.data.doctor._id;
    registeredUserId = res.body.data.user._id;

    // Check DB
    const doc = await Doctor.findById(registeredDoctorId);
    expect(doc).not.toBeNull();
    expect(doc.verificationStatus).toBe('pending');
    expect(doc.applicationReference).toBe(testAppReference);
    expect(doc.licenseNumber).toBe('NMC-2025-CARD-091');
    expect(doc.documents.length).toBe(2);

    const appRecord = await DoctorVerificationApplication.findOne({ doctorId: registeredDoctorId });
    expect(appRecord).not.toBeNull();
    expect(appRecord.applicationStatus).toBe('PENDING_VERIFICATION');
  });

  // Test 2: Duplicate professional registration rejection
  test('2. Duplicate License Rejection - rejects registration with identical medical license number', async () => {
    const res = await request(app)
      .post('/api/doctors/register')
      .send({
        name: 'Dr. Imposter Physician',
        email: 'imposter@test.com',
        phone: '+919876500002',
        password: 'password123',
        specialization: 'Neurology',
        licenseNumber: 'NMC-2025-CARD-091', // Identical license number
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already registered/i);
  });

  // Test 3: Missing required professional fields validation
  test('3. Missing Fields Validation - rejects registration without required fields', async () => {
    const res = await request(app)
      .post('/api/doctors/register')
      .send({
        name: 'Dr. Incomplete',
        email: 'incomplete@test.com',
        password: 'password123',
        // Missing specialization and licenseNumber
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/required/i);
  });

  // Test 4: Unverified doctor is barred from login and provider discovery
  test('4. Unverified Doctor Access Control - pending doctor cannot log in or appear in search', async () => {
    // Attempt login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'aarav.thapar@test.com',
        password: 'password123',
      });

    expect(loginRes.status).toBe(403);
    expect(loginRes.body.code).toBe('PENDING_VERIFICATION');

    // Attempt public search
    const searchRes = await request(app).get('/api/doctors');
    expect(searchRes.status).toBe(200);
    const doctorNames = searchRes.body.data.map((d) => d.userId?.name);
    expect(doctorNames).not.toContain('Dr. Aarav Thapar');
  });

  // Test 5: Non-admin access to admin verification queue is blocked
  test('5. Non-Admin Permission Check - patient cannot access admin verification queue', async () => {
    const res = await request(app)
      .get('/api/admin/doctors/pending')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // Test 6: Admin views pending applications list
  test('6. Admin Pending Queue - lists registered pending doctor application', async () => {
    const res = await request(app)
      .get('/api/admin/doctors/pending')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThan(0);

    const pendingIds = res.body.data.map((d) => d._id.toString());
    expect(pendingIds).toContain(registeredDoctorId.toString());
  });

  // Test 7: Admin views complete doctor application details
  test('7. Admin Application Details - retrieves complete applicant data and documents', async () => {
    const res = await request(app)
      .get(`/api/admin/doctors/${registeredDoctorId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.doctor).toBeDefined();
    expect(res.body.data.doctor.licenseNumber).toBe('NMC-2025-CARD-091');
    expect(res.body.data.verification.applicationReference).toBe(testAppReference);
    expect(res.body.data.doctor.documents.length).toBe(2);
  });

  // Test 8: Rejection requires mandatory reason
  test('8. Mandatory Rejection Reason - rejects attempt without explanation', async () => {
    const res = await request(app)
      .post(`/api/admin/doctors/${registeredDoctorId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/mandatory rejection reason is required/i);
  });

  // Test 9: Application rejection workflow
  test('9. Rejection Workflow - records reviewer, remarks, and sets status to REJECTED', async () => {
    const res = await request(app)
      .post(`/api/admin/doctors/${registeredDoctorId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Medical registration certificate signature is illegible. Please re-upload high-resolution scan.' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updatedDoc = await Doctor.findById(registeredDoctorId);
    expect(updatedDoc.verificationStatus).toBe('rejected');
    expect(updatedDoc.rejectionReason).toMatch(/signature is illegible/i);

    // Verify rejection is listed in rejected queue
    const rejectedListRes = await request(app)
      .get('/api/admin/doctors/rejected')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(rejectedListRes.status).toBe(200);
    const rejectedIds = rejectedListRes.body.data.map((d) => d._id.toString());
    expect(rejectedIds).toContain(registeredDoctorId.toString());
  });

  // Test 10: Resubmission workflow for rejected application
  test('10. Resubmission Workflow - doctor resubmits corrected certificate and re-enters pending queue', async () => {
    // Temporary helper login for doctor in test or direct resubmit call
    const resubmitRes = await request(app)
      .post(`/api/doctors/me/resubmit`)
      .set(
        'Authorization',
        `Bearer ${jwt.sign(
          { id: registeredUserId, role: 'doctor' },
          process.env.JWT_SECRET || 'shap_super_secret_jwt_key_2025_access_health'
        )}`
      )
      .send({
        documents: [
          {
            documentType: 'medical_registration',
            documentName: 'Medical_Council_Certificate_HD_Rescan.pdf',
            storageReference: 'https://storage.shap.health/docs/nmc_091_hd.pdf',
            fileSize: 3145728,
            mimeType: 'application/pdf',
          },
        ],
      });

    expect(resubmitRes.status).toBe(200);
    expect(resubmitRes.body.success).toBe(true);

    const doc = await Doctor.findById(registeredDoctorId);
    expect(doc.verificationStatus).toBe('pending');
  });

  // Test 11: Application approval workflow
  test('11. Approval Workflow - generates unique Doctor ID, secure QR token, and activates account', async () => {
    const approveRes = await request(app)
      .post(`/api/admin/doctors/${registeredDoctorId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.success).toBe(true);
    expect(approveRes.body.data.doctorUniqueId).toMatch(/^DOC-\d+/);
    expect(approveRes.body.data.qrCredentialToken).toMatch(/^SEC-DOC-[a-f0-9]+/);

    const docUniqueId = approveRes.body.data.doctorUniqueId;

    // Confirm Doctor record updated
    const docInDb = await Doctor.findById(registeredDoctorId);
    expect(docInDb.verificationStatus).toBe('verified');
    expect(docInDb.verifiedAt).toBeDefined();

    // Confirm User account activated
    const userInDb = await User.findById(registeredUserId);
    expect(userInDb.status).toBe('active');
    expect(userInDb.isActive).toBe(true);

    // Confirm DoctorQrCredential persisted
    const cred = await DoctorQrCredential.findOne({ doctorId: registeredDoctorId, status: 'ACTIVE' });
    expect(cred).not.toBeNull();
    expect(cred.doctorUniqueId).toBe(docUniqueId);
    expect(cred.qrDataUrl).toMatch(/^data:image\/png;base64,/);

    // Confirm verified queue includes doctor
    const verifiedListRes = await request(app)
      .get('/api/admin/doctors/verified')
      .set('Authorization', `Bearer ${adminToken}`);
    const verifiedIds = verifiedListRes.body.data.map((d) => d._id.toString());
    expect(verifiedIds).toContain(registeredDoctorId.toString());

    // Confirm doctor now appears in public verified discovery
    const searchRes = await request(app).get('/api/doctors');
    const doctorNames = searchRes.body.data.map((d) => d.userId?.name);
    expect(doctorNames).toContain('Dr. Aarav Thapar');
  });

  // Test 12: Approved doctor can log in and retrieve credentials
  test('12. Approved Doctor Self-Service - logs in, accesses profile, and views QR credential', async () => {
    // Login succeeds now that doctor is verified
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'aarav.thapar@test.com',
        password: 'password123',
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    const doctorToken = loginRes.body.token;

    // View profile
    const profileRes = await request(app)
      .get('/api/doctors/me')
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data.doctorUniqueId).toMatch(/^DOC-/);

    // View verification status
    const verifRes = await request(app)
      .get('/api/doctors/me/verification')
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(verifRes.status).toBe(200);
    expect(verifRes.body.data.isVerified).toBe(true);

    // View credentials
    const credRes = await request(app)
      .get('/api/doctors/me/credentials')
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(credRes.status).toBe(200);
    expect(credRes.body.data.qrDataUrl).toBeDefined();
    expect(credRes.body.data.token).toMatch(/^SEC-DOC-/);
  });

  // Test 13: QR Credential Reissuance & Revocation
  test('13. Credential Reissuance - admin rotates doctor QR token and revokes previous token', async () => {
    const credBefore = await DoctorQrCredential.findOne({ doctorId: registeredDoctorId, status: 'ACTIVE' });
    const oldToken = credBefore.credentialToken;

    const reissueRes = await request(app)
      .post(`/api/admin/doctors/${registeredDoctorId}/credentials/reissue`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Routine quarterly security rotation' });

    expect(reissueRes.status).toBe(200);
    expect(reissueRes.body.success).toBe(true);
    expect(reissueRes.body.token).not.toBe(oldToken);

    // Old credential is REVOKED
    const oldCredAfter = await DoctorQrCredential.findById(credBefore._id);
    expect(oldCredAfter.status).toBe('REVOKED');
    expect(oldCredAfter.revocationReason).toBe('Routine quarterly security rotation');

    // New credential is ACTIVE
    const newCred = await DoctorQrCredential.findOne({ doctorId: registeredDoctorId, status: 'ACTIVE' });
    expect(newCred).not.toBeNull();
    expect(newCred.credentialToken).toBe(reissueRes.body.token);
  });
});

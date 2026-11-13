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
  DoctorPresenceLog,
  OrganizationQRCode,
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

describe('MODULE 7: Doctor QR-Based Presence Management Master Test Suite', () => {
  let doctorUser, doctorToken, doctor;
  let unverifiedDoctorUser, unverifiedDoctorToken, unverifiedDoctor;
  let unaffiliatedDoctorUser, unaffiliatedDoctorToken, unaffiliatedDoctor;

  let orgUser1, orgToken1, org1;
  let orgUser2, orgToken2, org2;
  let unverifiedOrgUser, unverifiedOrgToken, unverifiedOrg;

  let activeAffiliation1;
  let activeAffiliation2;

  let adminUser, adminToken;
  let validOrgQr1;
  let expiredOrgQr;
  let revokedOrgQr;

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
    await Doctor.deleteMany({});
    await Organization.deleteMany({});
    await DoctorAffiliation.deleteMany({});
    await DoctorPresenceLog.deleteMany({});
    await OrganizationQRCode.deleteMany({});

    // 1. Create Verified Doctor
    doctorUser = await User.create({
      name: 'Dr. Govind Hegde',
      email: `house.${Date.now()}@shap.med`,
      password: 'HashedPassword123!',
      role: 'doctor',
      isEmailVerified: true,
    });
    doctorToken = createToken(doctorUser);

    doctor = await Doctor.create({
      userId: doctorUser._id,
      doctorUniqueId: `DOC-${Date.now().toString(36).toUpperCase()}`,
      specialization: 'Diagnostic Medicine',
      licenseNumber: `LIC-MED-${Date.now()}`,
      verificationStatus: 'verified',
      currentPresence: { isPresent: false, organizationId: null },
    });

    // 2. Create Unverified Doctor
    unverifiedDoctorUser = await User.create({
      name: 'Dr. Pending Verification',
      email: `pending.${Date.now()}@shap.med`,
      password: 'HashedPassword123!',
      role: 'doctor',
      isEmailVerified: true,
    });
    unverifiedDoctorToken = createToken(unverifiedDoctorUser);

    unverifiedDoctor = await Doctor.create({
      userId: unverifiedDoctorUser._id,
      doctorUniqueId: `DOC-UNV-${Date.now().toString(36).toUpperCase()}`,
      specialization: 'General Medicine',
      licenseNumber: `LIC-UNV-${Date.now()}`,
      verificationStatus: 'pending',
      currentPresence: { isPresent: false, organizationId: null },
    });

    // 3. Create Unaffiliated Doctor
    unaffiliatedDoctorUser = await User.create({
      name: 'Dr. No Affiliation',
      email: `noaff.${Date.now()}@shap.med`,
      password: 'HashedPassword123!',
      role: 'doctor',
      isEmailVerified: true,
    });
    unaffiliatedDoctorToken = createToken(unaffiliatedDoctorUser);

    unaffiliatedDoctor = await Doctor.create({
      userId: unaffiliatedDoctorUser._id,
      doctorUniqueId: `DOC-NOAFF-${Date.now().toString(36).toUpperCase()}`,
      specialization: 'Pediatrics',
      licenseNumber: `LIC-NOAFF-${Date.now()}`,
      verificationStatus: 'verified',
      currentPresence: { isPresent: false, organizationId: null },
    });

    // 4. Create Verified Organization 1 (Princeton Plainsboro)
    orgUser1 = await User.create({
      name: 'Princeton Plainsboro Hospital',
      email: `ppth.${Date.now()}@shap.med`,
      password: 'HashedPassword123!',
      role: 'organization',
      isEmailVerified: true,
    });
    orgToken1 = createToken(orgUser1);

    org1 = await Organization.create({
      userId: orgUser1._id,
      name: 'Princeton Plainsboro Teaching Hospital',
      legalName: 'Princeton Healthcare Trust',
      uniqueOrganizationCode: `ORG-PPTH-${Date.now().toString(36).toUpperCase()}`,
      registrationNumber: `REG-PPTH-${Date.now()}`,
      verificationStatus: 'verified',
      qrCheckinCode: `ORG-QR-PPTH-${Date.now()}`,
      address: { street: '100 Medical Center Dr', city: 'Princeton', state: 'NJ', country: 'USA' },
    });

    // 5. Create Verified Organization 2 (Mercy General)
    orgUser2 = await User.create({
      name: 'Mercy General Hospital',
      email: `mercy.${Date.now()}@shap.med`,
      password: 'HashedPassword123!',
      role: 'organization',
      isEmailVerified: true,
    });
    orgToken2 = createToken(orgUser2);

    org2 = await Organization.create({
      userId: orgUser2._id,
      name: 'Mercy General Hospital',
      legalName: 'Mercy Health Network',
      uniqueOrganizationCode: `ORG-MRCY-${Date.now().toString(36).toUpperCase()}`,
      registrationNumber: `REG-MRCY-${Date.now()}`,
      verificationStatus: 'verified',
      qrCheckinCode: `ORG-QR-MERCY-${Date.now()}`,
      address: { street: '500 Mercy Ave', city: 'Newark', state: 'NJ', country: 'USA' },
    });

    // 6. Create Unverified Organization
    unverifiedOrgUser = await User.create({
      name: 'Unverified Clinic',
      email: `unvorg.${Date.now()}@shap.med`,
      password: 'HashedPassword123!',
      role: 'organization',
      isEmailVerified: true,
    });
    unverifiedOrgToken = createToken(unverifiedOrgUser);

    unverifiedOrg = await Organization.create({
      userId: unverifiedOrgUser._id,
      name: 'Unverified Clinic Facilities',
      legalName: 'Unverified Med LLC',
      uniqueOrganizationCode: `ORG-UNV-${Date.now().toString(36).toUpperCase()}`,
      registrationNumber: `REG-UNV-${Date.now()}`,
      verificationStatus: 'pending',
      qrCheckinCode: `ORG-QR-UNV-${Date.now()}`,
      address: { street: '12 Rogue St', city: 'Trenton', state: 'NJ', country: 'USA' },
    });

    // 7. Active Affiliations for Dr. House with Org1 and Org2
    activeAffiliation1 = await DoctorAffiliation.create({
      affiliationId: `AFF-PPTH-${Date.now()}`,
      doctorId: doctor._id,
      organizationId: org1._id,
      status: 'ACTIVE',
      department: 'Diagnostics',
      designation: 'Department Head',
    });

    activeAffiliation2 = await DoctorAffiliation.create({
      affiliationId: `AFF-MRCY-${Date.now()}`,
      doctorId: doctor._id,
      organizationId: org2._id,
      status: 'ACTIVE',
      department: 'Consulting Diagnostics',
      designation: 'Visiting Specialist',
    });

    // 8. Admin User
    adminUser = await User.create({
      name: 'National Healthcare Regulator',
      email: `regulator.${Date.now()}@shap.gov`,
      password: 'HashedPassword123!',
      role: 'admin',
      isEmailVerified: true,
    });
    adminToken = createToken(adminUser);

    // 9. Create Valid Terminal QR for Org 1
    validOrgQr1 = await OrganizationQRCode.create({
      organizationId: org1._id,
      location: 'Ambulance Triage Desk',
      qrToken: `ORG-TRM-PPTH-TRIAGE-${Date.now()}`,
      qrDataPayload: JSON.stringify({ orgId: org1._id, location: 'Triage' }),
      qrDataUrl: 'data:image/png;base64,mockQrTriage',
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 30 * 86400000),
    });

    // 10. Create Expired Terminal QR for Org 1
    expiredOrgQr = await OrganizationQRCode.create({
      organizationId: org1._id,
      location: 'Old East Wing',
      qrToken: `ORG-TRM-PPTH-EXPIRED-${Date.now()}`,
      qrDataPayload: 'mockExpired',
      qrDataUrl: 'data:image/png;base64,mockExpired',
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
    });

    // 11. Create Revoked Terminal QR for Org 1
    revokedOrgQr = await OrganizationQRCode.create({
      organizationId: org1._id,
      location: 'Decommissioned OPD Stand',
      qrToken: `ORG-TRM-PPTH-REVOKED-${Date.now()}`,
      qrDataPayload: 'mockRevoked',
      qrDataUrl: 'data:image/png;base64,mockRevoked',
      status: 'REVOKED',
      revokedAt: new Date(),
      revocationReason: 'Terminal replaced with new model',
    });
  });

  // TC-PRES-01: Valid Doctor Check-In via Terminal QR Code
  test('TC-PRES-01: Doctor successfully checks in via active Organization Terminal QR code', async () => {
    const res = await request(app)
      .post('/api/doctors/me/presence/check-in')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ orgQrCode: validOrgQr1.qrToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.doctor.currentPresence.isPresent).toBe(true);
    expect(res.body.doctor.currentPresence.organizationId).toBe(org1._id.toString());
    expect(res.body.presenceLog).toBeDefined();
    expect(res.body.presenceLog.status).toBe('CHECKED_IN');
    expect(res.body.presenceLog.presenceId).toMatch(/^PRES-/);
  });

  // TC-PRES-02: Valid Doctor Check-Out with Duration Calculation
  test('TC-PRES-02: Doctor successfully checks out, calculating presence duration and status CHECKED_OUT', async () => {
    // 1. Ensure doctor is checked in
    await request(app)
      .post('/api/doctors/me/presence/check-in')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ orgQrCode: validOrgQr1.qrToken });

    // 2. Check out
    const res = await request(app)
      .post('/api/doctors/me/presence/check-out')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.doctor.currentPresence.isPresent).toBe(false);
    expect(res.body.doctor.currentPresence.organizationId).toBeNull();
    expect(res.body.presenceLog.status).toBe('CHECKED_OUT');
    expect(res.body.presenceLog.durationMinutes).toBeDefined();
  });

  // TC-PRES-03: Reject Check-In with Invalid QR Code
  test('TC-PRES-03: Rejects check-in with non-existent or invalid QR code', async () => {
    const res = await request(app)
      .post('/api/doctors/me/presence/check-in')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ orgQrCode: 'INVALID-QR-TOKEN-XYZ-999' });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid organization qr code/i);
  });

  // TC-PRES-04: Reject Check-In with Expired QR Code
  test('TC-PRES-04: Rejects check-in with expired Organization QR code', async () => {
    const res = await request(app)
      .post('/api/doctors/me/presence/check-in')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ orgQrCode: expiredOrgQr.qrToken });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/qr code has expired/i);
  });

  // TC-PRES-05: Reject Check-In with Revoked QR Code
  test('TC-PRES-05: Rejects check-in with revoked Organization QR code', async () => {
    const res = await request(app)
      .post('/api/doctors/me/presence/check-in')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ orgQrCode: revokedOrgQr.qrToken });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/qr code has been revoked/i);
  });

  // TC-PRES-06: Reject Check-In for Unverified Doctor
  test('TC-PRES-06: Rejects check-in for an unverified doctor', async () => {
    const res = await request(app)
      .post('/api/doctors/me/presence/check-in')
      .set('Authorization', `Bearer ${unverifiedDoctorToken}`)
      .send({ orgQrCode: validOrgQr1.qrToken });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/only verified doctors can check in/i);
  });

  // TC-PRES-07: Reject Check-In for Unverified Organization
  test('TC-PRES-07: Rejects check-in at an unverified healthcare facility', async () => {
    const res = await request(app)
      .post('/api/doctors/me/presence/check-in')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ orgQrCode: unverifiedOrg.qrCheckinCode });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/facility is not verified or active/i);
  });

  // TC-PRES-08: Reject Check-In when Doctor Has No Active Affiliation
  test('TC-PRES-08: Rejects check-in when doctor has no active affiliation with the hospital facility', async () => {
    const res = await request(app)
      .post('/api/doctors/me/presence/check-in')
      .set('Authorization', `Bearer ${unaffiliatedDoctorToken}`)
      .send({ orgQrCode: validOrgQr1.qrToken });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/requires an active affiliation/i);
  });

  // TC-PRES-09: Idempotent Check-In Handles Duplicate Scan at Same Facility Cleanly
  test('TC-PRES-09: Duplicate scan at the same organization returns idempotent already checked in response', async () => {
    // 1. Initial check-in at Org 1
    const checkin1 = await request(app)
      .post('/api/doctors/me/presence/check-in')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ orgQrCode: validOrgQr1.qrToken });

    expect(checkin1.status).toBe(200);

    // 2. Second scan at same Org 1
    const checkin2 = await request(app)
      .post('/api/doctors/me/presence/check-in')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ orgQrCode: validOrgQr1.qrToken });

    expect(checkin2.status).toBe(200);
    expect(checkin2.body.success).toBe(true);
    expect(checkin2.body.isAlreadyCheckedIn).toBe(true);
    expect(checkin2.body.message).toMatch(/already checked in/i);
  });

  // TC-PRES-10: Simultaneous Presence Conflict: Rejects Check-In at Another Facility
  test('TC-PRES-10: Rejects check-in when doctor is already checked in at ANOTHER organization', async () => {
    // 1. Check in at Org 1
    await request(app)
      .post('/api/doctors/me/presence/check-in')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ orgQrCode: validOrgQr1.qrToken });

    // 2. Attempt check in at Org 2 without checking out from Org 1
    const res = await request(app)
      .post('/api/doctors/me/presence/check-in')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ orgQrCode: org2.qrCheckinCode });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('already checked in at an organization');
  });

  // TC-PRES-11: Doctor Check-Out When Already Checked Out
  test('TC-PRES-11: Check-out when already checked out handles request cleanly', async () => {
    // 1. Ensure doctor is checked out
    await Doctor.findByIdAndUpdate(doctor._id, {
      'currentPresence.isPresent': false,
      'currentPresence.organizationId': null,
    });

    // 2. Attempt check out
    const res = await request(app)
      .post('/api/doctors/me/presence/check-out')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/not currently checked in anywhere/i);
  });

  // TC-PRES-12: Reject Check-Out with Different Organization QR
  test('TC-PRES-12: Rejects check-out when scanning QR belonging to a different organization', async () => {
    // 1. Check in at Org 1
    await request(app)
      .post('/api/doctors/me/presence/check-in')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ orgQrCode: validOrgQr1.qrToken });

    // 2. Attempt check-out using Org 2's QR
    const res = await request(app)
      .post('/api/doctors/me/presence/check-out')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ orgQrCode: org2.qrCheckinCode });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/cannot check out using a qr code from a different organization/i);

    // Clean up
    await request(app)
      .post('/api/doctors/me/presence/check-out')
      .set('Authorization', `Bearer ${doctorToken}`);
  });

  // TC-PRES-13: Organization Generates, Lists, and Revokes Terminal QR Codes
  test('TC-PRES-13: Organization creates, lists, and revokes a Terminal QR Code', async () => {
    // 1. Generate new terminal QR for ICU entrance
    const createRes = await request(app)
      .post('/api/organizations/me/presence-qr')
      .set('Authorization', `Bearer ${orgToken1}`)
      .send({
        location: 'ICU Wing Entrance',
        codeType: 'STATIC',
        validityDays: 180,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.qrToken).toMatch(/^ORG-TRM-/);
    expect(createRes.body.data.qrDataUrl).toBeDefined();

    const createdQrId = createRes.body.data.qrId;

    // 2. List QR codes for organization
    const listRes = await request(app)
      .get('/api/organizations/me/presence-qr')
      .set('Authorization', `Bearer ${orgToken1}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.count).toBeGreaterThanOrEqual(1);

    // 3. Revoke the generated QR code
    const revokeRes = await request(app)
      .post(`/api/organizations/me/presence-qr/${createdQrId}/revoke`)
      .set('Authorization', `Bearer ${orgToken1}`)
      .send({ reason: 'Security maintenance' });

    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.data.status).toBe('REVOKED');
  });

  // TC-PRES-14: Organization Views Live Present Doctors and Historical Attendance
  test('TC-PRES-14: Organization retrieves live currently present on-site doctors and presence history', async () => {
    // 1. Doctor checks in at Org 1
    await request(app)
      .post('/api/doctors/me/presence/check-in')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ orgQrCode: validOrgQr1.qrToken });

    // 2. Org 1 queries live present doctors
    const liveRes = await request(app)
      .get('/api/organizations/me/doctors/presence')
      .set('Authorization', `Bearer ${orgToken1}`);

    expect(liveRes.status).toBe(200);
    expect(liveRes.body.success).toBe(true);
    const presentDocs = liveRes.body.data;
    const foundHouse = presentDocs.find((d) => d.doctorUniqueId === doctor.doctorUniqueId);
    expect(foundHouse).toBeDefined();
    expect(foundHouse.department).toBe('Diagnostics');

    // 3. Org 1 queries presence history
    const histRes = await request(app)
      .get('/api/organizations/me/doctors/presence/history')
      .set('Authorization', `Bearer ${orgToken1}`);

    expect(histRes.status).toBe(200);
    expect(histRes.body.count).toBeGreaterThanOrEqual(1);

    // Clean up
    await request(app)
      .post('/api/doctors/me/presence/check-out')
      .set('Authorization', `Bearer ${doctorToken}`);
  });

  // TC-PRES-15: Admin Audits Platform Presence Logs and Performs Manual Correction
  test('TC-PRES-15: Admin audits platform presence logs and performs audited manual correction', async () => {
    // 1. Check in doctor to create a presence log
    await request(app)
      .post('/api/doctors/me/presence/check-in')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ orgQrCode: validOrgQr1.qrToken });

    // 2. Admin queries platform-wide presence logs
    const adminLogsRes = await request(app)
      .get('/api/admin/presence')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminLogsRes.status).toBe(200);
    expect(adminLogsRes.body.success).toBe(true);
    expect(adminLogsRes.body.total).toBeGreaterThanOrEqual(1);

    const logToCorrect = adminLogsRes.body.logs[0];
    expect(logToCorrect).toBeDefined();

    // 3. Admin manually corrects the log record
    const correctRes = await request(app)
      .post(`/api/admin/presence/${logToCorrect._id}/correct`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        checkInAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        checkOutAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        reason: 'Physician forgot to badge out at kiosk; confirmed by shift supervisor.',
      });

    expect(correctRes.status).toBe(200);
    expect(correctRes.body.success).toBe(true);
    expect(correctRes.body.data.status).toBe('MANUAL_CORRECTED');
    expect(correctRes.body.data.durationMinutes).toBe(60);
    expect(correctRes.body.data.manualCorrection.reason).toContain('confirmed by shift supervisor');
  });
});

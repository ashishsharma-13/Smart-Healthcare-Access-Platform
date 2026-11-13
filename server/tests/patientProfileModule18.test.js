import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import {
  User,
  PatientProfile,
  EmergencyContact,
  PatientMedicalCondition,
  PatientAllergy,
  PatientMedication,
  PatientMedicalHistory,
  PatientConsent,
  EmergencyMedicalSnapshot,
  EmergencyRequest,
  Organization,
} from '../src/models/index.js';

let mongoServer;

const createToken = (user, extra = {}) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      ...extra,
      jti: 'jti-' + Math.random(),
    },
    process.env.JWT_SECRET || 'shap_super_secret_jwt_key_2026',
    { expiresIn: '1h' }
  );
};

describe('MODULE 18: Patient Profile and Healthcare Information Management Master Test Suite', () => {
  let patientUser1, patientToken1;
  let patientUser2, patientToken2;
  let doctorUser, doctorToken;
  let orgUser1, orgToken1, org1; // Confirmed destination hospital
  let orgUser2, orgToken2, org2; // Unrelated hospital (unauthorized to view medical snapshot)
  let adminUser, adminToken;
  let emergencyReq;

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
    await PatientProfile.deleteMany({});
    await EmergencyContact.deleteMany({});
    await PatientMedicalCondition.deleteMany({});
    await PatientAllergy.deleteMany({});
    await PatientMedication.deleteMany({});
    await PatientMedicalHistory.deleteMany({});
    await PatientConsent.deleteMany({});
    await EmergencyMedicalSnapshot.deleteMany({});
    await EmergencyRequest.deleteMany({});
    await Organization.deleteMany({});

    // 1. Patient 1 (Primary Test Patient)
    patientUser1 = await User.create({
      name: 'Rohan Sharma',
      email: 'rohan.sharma@example.com',
      password: 'HashedPassword123!',
      role: 'patient',
      phone: '+919811122334',
      isActive: true,
    });
    patientToken1 = createToken(patientUser1);

    // 2. Patient 2 (For ownership & IDOR validation)
    patientUser2 = await User.create({
      name: 'Meera Patel',
      email: 'meera.patel@example.com',
      password: 'HashedPassword123!',
      role: 'patient',
      phone: '+919822233445',
      isActive: true,
    });
    patientToken2 = createToken(patientUser2);

    // 3. Attending Doctor
    doctorUser = await User.create({
      name: 'Dr. Arjun Verma',
      email: 'arjun.verma@example.com',
      password: 'HashedPassword123!',
      role: 'doctor',
      phone: '+919833344556',
      isActive: true,
    });
    doctorToken = createToken(doctorUser);

    // 4. Destination Hospital (Org 1)
    orgUser1 = await User.create({
      name: 'Apex Trauma Center Admin',
      email: 'admin@apextrauma.org',
      password: 'HashedPassword123!',
      role: 'organization',
      phone: '+911123450001',
      isActive: true,
    });
    org1 = await Organization.create({
      userId: orgUser1._id,
      name: 'Apex Trauma & Heart Hospital',
      orgType: 'hospital',
      registrationNumber: 'REG-APEX-001',
      qrCheckinCode: 'QR-APEX-001',
      verificationStatus: 'verified',
      emergencyCapable: true,
      location: { type: 'Point', coordinates: [77.21, 28.61] },
    });
    orgToken1 = createToken(orgUser1, { organizationId: org1._id });

    // 5. Unrelated Hospital (Org 2)
    orgUser2 = await User.create({
      name: 'City Clinic Admin',
      email: 'admin@cityclinic.org',
      password: 'HashedPassword123!',
      role: 'organization',
      phone: '+911123450002',
      isActive: true,
    });
    org2 = await Organization.create({
      userId: orgUser2._id,
      name: 'City Outpatient Clinic',
      orgType: 'clinic',
      registrationNumber: 'REG-CITY-002',
      qrCheckinCode: 'QR-CITY-002',
      verificationStatus: 'verified',
      emergencyCapable: false,
      location: { type: 'Point', coordinates: [77.30, 28.55] },
    });
    orgToken2 = createToken(orgUser2, { organizationId: org2._id });

    // 6. Administrator
    adminUser = await User.create({
      name: 'Platform Auditor',
      email: 'admin@shap.org',
      password: 'HashedPassword123!',
      role: 'admin',
      phone: '+911199990000',
      isActive: true,
    });
    adminToken = createToken(adminUser);

    // 7. Active Emergency Request for Patient 1 with selected destination Org 1
    emergencyReq = await EmergencyRequest.create({
      requestCode: 'EMG-TEST-1801',
      patientId: patientUser1._id,
      reportedByUserId: patientUser1._id,
      patientName: 'Rohan Sharma',
      patientPhone: '+919811122334',
      emergencyType: 'CARDIAC_ARREST',
      status: 'RESOURCES_RESERVED',
      location: { type: 'Point', coordinates: [77.209, 28.613] },
      selectedOrganizationId: org1._id,
      selectedDestinationId: org1._id,
    });

    // 8. Snapshot fixture for destination access tests
    await EmergencyMedicalSnapshot.create({
      emergencyRequestId: emergencyReq._id,
      patientId: patientUser1._id,
      confirmedByPatient: true,
      bloodGroup: 'B+',
      allergiesSummary: [
        { substance: 'Aspirin', allergyType: 'DRUG', severity: 'SEVERE', reaction: 'Bronchospasm' },
      ],
      conditionsSummary: [
        { conditionName: 'Hypertension', status: 'MANAGED' },
      ],
      primaryEmergencyContact: {
        name: 'Sunita Sharma',
        relationship: 'SPOUSE',
        phone: '+919811199991',
      },
    });
  });

  // -------------------------------------------------------------
  // Test 1: Profile Initialization and Retrieval
  // -------------------------------------------------------------
  test('1. GET /api/patients/me/profile auto-initializes and returns patient profile', async () => {
    const res = await request(app)
      .get('/api/patients/me/profile')
      .set('Authorization', `Bearer ${patientToken1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.name).toBe('Rohan Sharma');
    expect(res.body.data.profile.preferredLanguage).toBe('English');
    expect(res.body.data.disclaimers.diagnosticNotice).toContain('does not provide automated diagnosis');
  });

  // -------------------------------------------------------------
  // Test 2: Profile Update & User Sync
  // -------------------------------------------------------------
  test('2. PUT /api/patients/me/profile updates demographics and synchronizes user fields', async () => {
    const res = await request(app)
      .put('/api/patients/me/profile')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        dateOfBirth: '1992-06-15',
        gender: 'MALE',
        bloodGroup: 'O+',
        preferredLanguage: 'Hindi',
        address: {
          buildingNumber: '42-B',
          street: 'Connaught Circus',
          city: 'New Delhi',
          state: 'Delhi',
          pinCode: '110001',
        },
        heightCm: 178,
        weightKg: 75,
        organDonor: true,
        medicalNotes: 'Pre-existing mild hypertension.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.bloodGroup).toBe('O+');
    expect(res.body.data.heightCm).toBe(178);
    expect(res.body.data.organDonor).toBe(true);

    // Verify core user record synchronized
    const updatedUser = await User.findById(patientUser1._id);
    expect(updatedUser.bloodGroup).toBe('O+');
    expect(updatedUser.dateOfBirth).toBe('1992-06-15');
    expect(updatedUser.address.city).toBe('New Delhi');
  });

  // -------------------------------------------------------------
  // Test 3: Emergency Contacts — Multiple Contacts & Primary Designation
  // -------------------------------------------------------------
  test('3. Emergency Contacts CRUD: add, edit, delete and auto-primary enforcement', async () => {
    // 1. Add first contact (should auto-become primary)
    const add1 = await request(app)
      .post('/api/patients/me/emergency-contacts')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        name: 'Sunita Sharma',
        relationship: 'SPOUSE',
        phone: '+919811199991',
        alternatePhone: '+911122334455',
        email: 'sunita.sharma@example.com',
      });

    expect(add1.status).toBe(201);
    expect(add1.body.data.isPrimary).toBe(true);
    const contact1Id = add1.body.data.contactId || add1.body.data._id;

    // 2. Add second contact without isPrimary
    const add2 = await request(app)
      .post('/api/patients/me/emergency-contacts')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        name: 'Amit Sharma',
        relationship: 'SIBLING',
        phone: '+919811199992',
      });
    expect(add2.status).toBe(201);
    expect(add2.body.data.isPrimary).toBe(false);
    const contact2Id = add2.body.data.contactId || add2.body.data._id;

    // 3. Promote second contact to primary
    const update2 = await request(app)
      .put(`/api/patients/me/emergency-contacts/${contact2Id}`)
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({ isPrimary: true });
    expect(update2.status).toBe(200);
    expect(update2.body.data.isPrimary).toBe(true);

    // Verify first contact was demoted
    const listRes = await request(app)
      .get('/api/patients/me/emergency-contacts')
      .set('Authorization', `Bearer ${patientToken1}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.count).toBe(2);
    const c1 = listRes.body.data.find((c) => String(c._id) === String(add1.body.data._id));
    expect(c1.isPrimary).toBe(false);

    // 4. Delete contact
    const delRes = await request(app)
      .delete(`/api/patients/me/emergency-contacts/${contact2Id}`)
      .set('Authorization', `Bearer ${patientToken1}`);
    expect(delRes.status).toBe(200);

    // After deleting primary, remaining contact is auto-promoted to primary
    const remaining = await EmergencyContact.findById(add1.body.data._id);
    expect(remaining.isPrimary).toBe(true);
  });

  // -------------------------------------------------------------
  // Test 4: Medical Conditions Management with Source Attribution
  // -------------------------------------------------------------
  test('4. Medical Conditions: add, list, update and clear source attribution', async () => {
    const addRes = await request(app)
      .post('/api/patients/me/medical-conditions')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        conditionName: 'Type 2 Diabetes Mellitus',
        diagnosisDate: '2020-03-10',
        status: 'MANAGED',
        source: 'PATIENT_REPORTED',
        notes: 'Under Metformin 500mg daily.',
      });

    expect(addRes.status).toBe(201);
    expect(addRes.body.data.conditionName).toBe('Type 2 Diabetes Mellitus');
    expect(addRes.body.data.source).toBe('PATIENT_REPORTED');

    const condId = addRes.body.data._id;

    // Update status to CHRONIC
    const updateRes = await request(app)
      .put(`/api/patients/me/medical-conditions/${condId}`)
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({ status: 'CHRONIC', notes: 'HbA1c steady at 6.8%.' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.status).toBe('CHRONIC');

    // List conditions
    const listRes = await request(app)
      .get('/api/patients/me/medical-conditions')
      .set('Authorization', `Bearer ${patientToken1}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.count).toBe(1);

    // Delete condition
    const delRes = await request(app)
      .delete(`/api/patients/me/medical-conditions/${condId}`)
      .set('Authorization', `Bearer ${patientToken1}`);
    expect(delRes.status).toBe(200);
  });

  // -------------------------------------------------------------
  // Test 5: Allergies Management with Severity & Substance
  // -------------------------------------------------------------
  test('5. Allergies: add, list, update severity and reactions', async () => {
    const addRes = await request(app)
      .post('/api/patients/me/allergies')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        allergyType: 'DRUG',
        substance: 'Penicillin',
        reaction: 'Severe urticaria and facial angioedema',
        severity: 'LIFE_THREATENING',
        source: 'PATIENT_REPORTED',
        notes: 'Requires immediate epinephrine if exposed.',
      });

    expect(addRes.status).toBe(201);
    expect(addRes.body.data.substance).toBe('Penicillin');
    expect(addRes.body.data.severity).toBe('LIFE_THREATENING');

    const allergyId = addRes.body.data._id;

    // List allergies
    const listRes = await request(app)
      .get('/api/patients/me/allergies')
      .set('Authorization', `Bearer ${patientToken1}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.count).toBe(1);
    expect(listRes.body.data[0].severity).toBe('LIFE_THREATENING');

    // Delete allergy
    const delRes = await request(app)
      .delete(`/api/patients/me/allergies/${allergyId}`)
      .set('Authorization', `Bearer ${patientToken1}`);
    expect(delRes.status).toBe(200);
  });

  // -------------------------------------------------------------
  // Test 6: Medications Management with Dosage & Frequency
  // -------------------------------------------------------------
  test('6. Medications: add, list, update dosage and active status', async () => {
    const addRes = await request(app)
      .post('/api/patients/me/medications')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        medicationName: 'Atorvastatin',
        dosage: '20 mg',
        frequency: 'Once daily at bedtime',
        startDate: '2023-01-15',
        status: 'ACTIVE',
        source: 'PRESCRIBED',
        prescribedBy: 'Dr. Priya Sharma',
      });

    expect(addRes.status).toBe(201);
    expect(addRes.body.data.medicationName).toBe('Atorvastatin');
    expect(addRes.body.data.dosage).toBe('20 mg');

    const medId = addRes.body.data._id;

    // Discontinue medication
    const updateRes = await request(app)
      .put(`/api/patients/me/medications/${medId}`)
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({ status: 'DISCONTINUED', notes: 'Switched to Rosuvastatin.' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.status).toBe('DISCONTINUED');

    // List
    const listRes = await request(app)
      .get('/api/patients/me/medications')
      .set('Authorization', `Bearer ${patientToken1}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.count).toBe(1);
  });

  // -------------------------------------------------------------
  // Test 7: Medical History CRUD (Surgeries, Hospitalizations)
  // -------------------------------------------------------------
  test('7. Medical History: add, list, update past surgeries and hospitalizations', async () => {
    const addRes = await request(app)
      .post('/api/patients/me/medical-history')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        category: 'SURGERY',
        title: 'Laparoscopic Appendectomy',
        eventDate: '2019-08-20',
        approximateYear: 2019,
        facility: 'St. Jude General Hospital',
        source: 'PATIENT_REPORTED',
        notes: 'Uncomplicated recovery.',
      });

    expect(addRes.status).toBe(201);
    expect(addRes.body.data.category).toBe('SURGERY');
    expect(addRes.body.data.title).toBe('Laparoscopic Appendectomy');

    const historyId = addRes.body.data._id;

    // List history
    const listRes = await request(app)
      .get('/api/patients/me/medical-history')
      .set('Authorization', `Bearer ${patientToken1}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.count).toBe(1);

    // Delete
    const delRes = await request(app)
      .delete(`/api/patients/me/medical-history/${historyId}`)
      .set('Authorization', `Bearer ${patientToken1}`);
    expect(delRes.status).toBe(200);
  });

  // -------------------------------------------------------------
  // Test 8: Consent & Privacy Management (4 Scoped Purposes)
  // -------------------------------------------------------------
  test('8. Consent Management: records purpose-based consents and supports revocation', async () => {
    // 1. List defaults
    const listRes = await request(app)
      .get('/api/patients/me/consents')
      .set('Authorization', `Bearer ${patientToken1}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.count).toBe(4); // All 4 purposes present

    // 2. Grant REGULAR_HEALTHCARE_SHARING
    const grantRes = await request(app)
      .post('/api/patients/me/consents')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        purpose: 'REGULAR_HEALTHCARE_SHARING',
        status: 'GRANTED',
      });

    expect(grantRes.status).toBe(200);
    expect(grantRes.body.data.status).toBe('GRANTED');

    // 3. Revoke consent
    const revokeRes = await request(app)
      .post('/api/patients/me/consents/REGULAR_HEALTHCARE_SHARING/revoke')
      .set('Authorization', `Bearer ${patientToken1}`);

    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.data.status).toBe('REVOKED');
  });

  // -------------------------------------------------------------
  // Test 9: Pre-Flight Emergency Summary (Never Blocks Emergency Requests)
  // -------------------------------------------------------------
  test('9. GET /api/emergency/profile-summary returns pre-flight emergency summary', async () => {
    // Setup test patient clinical profile
    await PatientProfile.create({
      userId: patientUser1._id,
      bloodGroup: 'B+',
    });
    await PatientAllergy.create({
      userId: patientUser1._id,
      allergyType: 'DRUG',
      substance: 'Aspirin',
      severity: 'SEVERE',
    });
    await EmergencyContact.create({
      userId: patientUser1._id,
      name: 'Sunita Sharma',
      relationship: 'SPOUSE',
      phone: '+919811199991',
      isPrimary: true,
    });

    const res = await request(app)
      .get('/api/emergency/profile-summary')
      .set('Authorization', `Bearer ${patientToken1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.hasSummary).toBe(true);
    expect(res.body.data.bloodGroup).toBe('B+');
    expect(res.body.data.allergies.length).toBe(1);
    expect(res.body.data.primaryEmergencyContact.name).toBe('Sunita Sharma');
  });

  // -------------------------------------------------------------
  // Test 10: Graceful Fallback When Medical Data Is Empty / Missing
  // -------------------------------------------------------------
  test('10. Pre-flight summary returns safe fallback when profile is empty without throwing errors', async () => {
    // Patient 2 has completely empty profile
    const res = await request(app)
      .get('/api/emergency/profile-summary')
      .set('Authorization', `Bearer ${patientToken2}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Missing profile must NEVER block emergency flow
    expect(res.body.data.bloodGroup).toBe('UNKNOWN');
    expect(res.body.data.allergies).toEqual([]);
    expect(res.body.data.primaryEmergencyContact).toBeNull();
  });

  // -------------------------------------------------------------
  // Test 11: Emergency Medical Snapshot Creation
  // -------------------------------------------------------------
  test('11. POST /api/emergency/requests/:id/medical-snapshot creates immutable snapshot', async () => {
    const res = await request(app)
      .post(`/api/emergency/requests/${emergencyReq._id}/medical-snapshot`)
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        confirmedByPatient: true,
        criticalNotes: 'Severe chest tightness radiating to left arm.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.emergencyRequestId).toBe(String(emergencyReq._id));
    expect(res.body.data.confirmedByPatient).toBe(true);
    expect(res.body.data.criticalNotes).toBe('Severe chest tightness radiating to left arm.');
  });

  // -------------------------------------------------------------
  // Test 12: Purpose-Restricted Destination Access Control (Hospital)
  // -------------------------------------------------------------
  test('12. Confirmed Destination Hospital can access snapshot; Unrelated Hospital is FORBIDDEN', async () => {
    // 1. Confirmed Destination Hospital (Org 1) requests summary -> Allowed (200)
    const resOrg1 = await request(app)
      .get(`/api/emergency/requests/${emergencyReq._id}/medical-summary`)
      .set('Authorization', `Bearer ${orgToken1}`);

    expect(resOrg1.status).toBe(200);
    expect(resOrg1.body.success).toBe(true);
    expect(resOrg1.body.data.emergencyRequestId).toBe(String(emergencyReq._id));

    // 2. Unrelated Hospital (Org 2) requests summary -> FORBIDDEN (403)
    const resOrg2 = await request(app)
      .get(`/api/emergency/requests/${emergencyReq._id}/medical-summary`)
      .set('Authorization', `Bearer ${orgToken2}`);

    expect(resOrg2.status).toBe(403);
    expect(resOrg2.body.message).toContain('Unauthorized');
  });

  // -------------------------------------------------------------
  // Test 13: Administrator Medical Access Restriction
  // -------------------------------------------------------------
  test('13. Standard administrators are strictly FORBIDDEN from viewing raw medical snapshots', async () => {
    const resAdmin = await request(app)
      .get(`/api/emergency/requests/${emergencyReq._id}/medical-summary`)
      .set('Authorization', `Bearer ${adminToken}`);

    // Administrator without clinical role or destination relationship is denied access
    expect(resAdmin.status).toBe(403);
    expect(resAdmin.body.message).toContain('Unauthorized');
  });

  // -------------------------------------------------------------
  // Test 14: Insecure Direct Object Reference (IDOR) Ownership Validation
  // -------------------------------------------------------------
  test('14. IDOR Protection: Patient 2 cannot update or delete Patient 1 medical records', async () => {
    // Patient 1 creates an allergy
    const allergy1 = await PatientAllergy.create({
      userId: patientUser1._id,
      substance: 'Sulfa Drugs',
    });

    // Patient 2 attempts to delete Patient 1's allergy
    const idorDel = await request(app)
      .delete(`/api/patients/me/allergies/${allergy1._id}`)
      .set('Authorization', `Bearer ${patientToken2}`);

    expect(idorDel.status).toBe(500); // Or 404/400 because query enforces userId: req.user._id
    // Verify allergy was not deleted
    const check = await PatientAllergy.findById(allergy1._id);
    expect(check).not.toBeNull();
  });
});

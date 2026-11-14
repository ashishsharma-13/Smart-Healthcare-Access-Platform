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
  Appointment,
  EmergencyRequest,
  Feedback,
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

describe('MODULE: Post-Visit Feedback & Reviews System', () => {
  let patientUser, patientToken;
  let otherPatientUser, otherPatientToken;
  let docUser, doctor;
  let orgUser, organization;
  let completedAppointment;
  let completedEmergency;

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
    await Appointment.deleteMany({});
    await EmergencyRequest.deleteMany({});
    await Feedback.deleteMany({});

    // 1. Patient
    patientUser = await User.create({
      name: 'Rohan Sharma',
      email: 'rohan.patient@shap.com',
      password: 'password123',
      role: 'patient',
      phone: '+91-9876543210',
    });
    patientToken = createToken(patientUser);

    otherPatientUser = await User.create({
      name: 'Pooja Verma',
      email: 'pooja@shap.com',
      password: 'password123',
      role: 'patient',
      phone: '+91-9876543211',
    });
    otherPatientToken = createToken(otherPatientUser);

    // 2. Organization (Citizens Specialty Hospital)
    orgUser = await User.create({
      name: 'Citizens Hospital Admin',
      email: 'admin@citizens.com',
      password: 'password123',
      role: 'organization',
    });

    organization = await Organization.create({
      userId: orgUser._id,
      name: 'Citizens Specialty Hospital',
      orgType: 'hospital',
      registrationNumber: 'HOSP-HYD-CITIZENS-01',
      qrCheckinCode: 'ORG-QR-CITIZENS-TEST',
      verificationStatus: 'verified',
      rating: 4.0,
      totalReviews: 1,
      location: {
        type: 'Point',
        coordinates: [78.3188, 17.4789],
      },
    });

    // 3. Doctor (Dr. Sneha Sen)
    docUser = await User.create({
      name: 'Dr. Sneha Sen',
      email: 'sneha@hospital.com',
      password: 'password123',
      role: 'doctor',
    });

    doctor = await Doctor.create({
      userId: docUser._id,
      doctorUniqueId: 'DOC-10024',
      licenseNumber: 'MED-REG-88219',
      specialization: 'Cardiology',
      verificationStatus: 'verified',
      rating: 4.0,
      totalReviews: 1,
    });

    // 4. Completed Appointment
    completedAppointment = await Appointment.create({
      appointmentNumber: 'APT-TEST-001',
      patientId: patientUser._id,
      doctorId: doctor._id,
      organizationId: organization._id,
      slotDate: '2026-11-14',
      slotTime: '10:00 AM',
      status: 'COMPLETED',
      patientNotes: 'Cardiology follow-up',
    });

    // 5. Completed Emergency Request
    completedEmergency = await EmergencyRequest.create({
      emergencyRequestId: 'EMG-TEST-8801',
      requestCode: 'REQ-8801',
      patientId: patientUser._id,
      patientName: patientUser.name,
      patientPhone: patientUser.phone,
      emergencyType: 'Cardiac Emergency',
      severity: 'critical',
      location: {
        type: 'Point',
        coordinates: [78.3264, 17.4568],
      },
      status: 'COMPLETED',
      selectedOrganizationId: organization._id,
    });
  });

  test('TC-FB-01: Rejects feedback submission without a rating', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        appointmentId: completedAppointment._id,
        comments: 'Great doctor but forgot rating',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Rating must be a number between 1 and 5/i);
  });

  test('TC-FB-02: Patient submits feedback for completed appointment and updates doctor/org ratings', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        appointmentId: completedAppointment._id,
        rating: 5,
        careQualityRating: 5,
        waitTimeRating: 4,
        staffBehaviorRating: 5,
        cleanlinessRating: 5,
        comments: 'Dr. Sneha was extremely thorough and the clinic staff was very prompt.',
        tags: ['Attentive Doctor', 'Short Wait Time', 'Clean Facility'],
        isAnonymous: false,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.feedbackType).toBe('APPOINTMENT');
    expect(res.body.data.rating).toBe(5);
    expect(res.body.data.tags).toContain('Attentive Doctor');

    // Verify Organization and Doctor updated ratings
    const updatedOrg = await Organization.findById(organization._id);
    expect(updatedOrg.totalReviews).toBe(1);
    expect(updatedOrg.rating).toBe(5);

    const updatedDoc = await Doctor.findById(doctor._id);
    expect(updatedDoc.totalReviews).toBe(1);
    expect(updatedDoc.rating).toBe(5);
  });

  test('TC-FB-03: Prevents duplicate feedback for the same appointment', async () => {
    // First submission
    await request(app)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        appointmentId: completedAppointment._id,
        rating: 5,
      });

    // Duplicate submission
    const res = await request(app)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        appointmentId: completedAppointment._id,
        rating: 4,
        comments: 'Attempting duplicate feedback',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already been submitted/i);
  });

  test('TC-FB-04: Prevents other patient from submitting feedback for an appointment they do not own', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${otherPatientToken}`)
      .send({
        appointmentId: completedAppointment._id,
        rating: 5,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('TC-FB-05: Patient submits feedback for completed emergency treatment', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        emergencyRequestId: completedEmergency._id,
        rating: 5,
        careQualityRating: 5,
        waitTimeRating: 5,
        staffBehaviorRating: 5,
        cleanlinessRating: 4,
        comments: 'Rapid ER response and admission at Citizens Hospital saved vital minutes.',
        tags: ['Rapid ER Response', 'Trained Paramedics', 'Immediate Bed Allocation'],
        isAnonymous: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.feedbackType).toBe('EMERGENCY');
    expect(res.body.data.isAnonymous).toBe(true);

    // Verify Organization rating updated
    const updatedOrg = await Organization.findById(organization._id);
    expect(updatedOrg.rating).toBe(5);
  });

  test('TC-FB-06: GET /api/feedback/check/:type/:id returns feedback status for target visit', async () => {
    // Initially false
    let checkRes = await request(app)
      .get(`/api/feedback/check/appointment/${completedAppointment._id}`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(checkRes.status).toBe(200);
    expect(checkRes.body.hasSubmitted).toBe(false);

    // Submit feedback
    await request(app)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        appointmentId: completedAppointment._id,
        rating: 5,
      });

    // Check again -> true
    checkRes = await request(app)
      .get(`/api/feedback/check/appointment/${completedAppointment._id}`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(checkRes.status).toBe(200);
    expect(checkRes.body.hasSubmitted).toBe(true);
    expect(checkRes.body.feedback.rating).toBe(5);
  });

  test('TC-FB-07: GET /api/feedback/my returns patient feedback history', async () => {
    await request(app)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        appointmentId: completedAppointment._id,
        rating: 4,
        comments: 'Good experience overall',
      });

    const res = await request(app)
      .get('/api/feedback/my')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0].rating).toBe(4);
    expect(res.body.data[0].organizationId.name).toBe('Citizens Specialty Hospital');
  });

  test('TC-FB-08: GET /api/feedback/organization/:orgId sanitizes anonymous patient names', async () => {
    await request(app)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        emergencyRequestId: completedEmergency._id,
        rating: 5,
        comments: 'Anonymous review',
        isAnonymous: true,
      });

    const res = await request(app).get(`/api/feedback/organization/${organization._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].patientName).toBe('Verified Patient');
    expect(res.body.data[0].patientAvatar).toBeNull();
  });
});

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
  DoctorSchedule,
  DoctorLeave,
  OrganizationHoliday,
  Appointment,
  AppointmentStatusHistory,
  AppointmentNotification,
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

describe('MODULE 6: Appointment Management Master Test Suite', () => {
  let patientUser1;
  let patientToken1;

  let patientUser2;
  let patientToken2;

  let doctorUser;
  let doctor;
  let doctorToken;

  let unverifiedDoctorUser;
  let unverifiedDoctor;

  let orgUser1;
  let org1;
  let orgToken1;

  let orgUser2;
  let org2;

  let unverifiedOrgUser;
  let unverifiedOrg;

  let activeAffiliation1;
  let activeAffiliation2;
  let terminatedAffiliation;

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
    await DoctorSchedule.deleteMany({});
    await DoctorLeave.deleteMany({});
    await OrganizationHoliday.deleteMany({});
    await Appointment.deleteMany({});
    await AppointmentStatusHistory.deleteMany({});
    await AppointmentNotification.deleteMany({});

    // 1. Patient 1
    patientUser1 = await User.create({
      name: 'Alice Patient',
      email: 'alice.patient@shap.com',
      password: 'HashedPassword123!',
      role: 'patient',
      accountStatus: 'active',
      isEmailVerified: true,
    });
    patientToken1 = createToken(patientUser1);

    // 2. Patient 2
    patientUser2 = await User.create({
      name: 'Bob Patient',
      email: 'bob.patient@shap.com',
      password: 'HashedPassword123!',
      role: 'patient',
      accountStatus: 'active',
      isEmailVerified: true,
    });
    patientToken2 = createToken(patientUser2);

    // 3. Verified Doctor
    doctorUser = await User.create({
      name: 'Dr. Evelyn Carter',
      email: 'evelyn.carter@shap.com',
      password: 'HashedPassword123!',
      role: 'doctor',
      accountStatus: 'active',
      isEmailVerified: true,
    });
    doctorToken = createToken(doctorUser);

    doctor = await Doctor.create({
      userId: doctorUser._id,
      doctorUniqueId: 'DOC-88001',
      specialization: 'Cardiology',
      verificationStatus: 'verified',
      licenseNumber: 'MD-CARDIO-88001',
      experienceYears: 14,
    });

    // 4. Unverified Doctor
    unverifiedDoctorUser = await User.create({
      name: 'Dr. Pending Guy',
      email: 'pending.guy@shap.com',
      password: 'HashedPassword123!',
      role: 'doctor',
      accountStatus: 'active',
    });
    unverifiedDoctor = await Doctor.create({
      userId: unverifiedDoctorUser._id,
      doctorUniqueId: 'DOC-PENDING-01',
      specialization: 'Dermatology',
      verificationStatus: 'pending',
      licenseNumber: 'MD-PENDING-01',
      experienceYears: 5,
    });

    // 5. Verified Organization 1 (Apex Heart)
    orgUser1 = await User.create({
      name: 'Apex Heart Hospital',
      email: 'admin@apexheart.org',
      password: 'HashedPassword123!',
      role: 'organization',
      accountStatus: 'active',
    });
    orgToken1 = createToken(orgUser1);

    org1 = await Organization.create({
      userId: orgUser1._id,
      name: 'Apex Heart Hospital',
      legalName: 'Apex Cardiac Network Ltd',
      uniqueOrganizationCode: 'ORG-APEX-01',
      qrCheckinCode: 'QR-APEX-01',
      orgType: 'hospital',
      verificationStatus: 'verified',
      registrationNumber: 'REG-APEX-01',
    });

    // 6. Verified Organization 2 (City Trauma)
    orgUser2 = await User.create({
      name: 'City Trauma Center',
      email: 'admin@citytrauma.org',
      password: 'HashedPassword123!',
      role: 'organization',
      accountStatus: 'active',
    });

    org2 = await Organization.create({
      userId: orgUser2._id,
      name: 'City Trauma Center',
      legalName: 'City Trauma Center Inc',
      uniqueOrganizationCode: 'ORG-TRAUMA-02',
      qrCheckinCode: 'QR-TRAUMA-02',
      orgType: 'hospital',
      verificationStatus: 'verified',
      registrationNumber: 'REG-TRAUMA-02',
    });

    // 7. Unverified Organization
    unverifiedOrgUser = await User.create({
      name: 'Unverified Clinic',
      email: 'admin@unverified.org',
      password: 'HashedPassword123!',
      role: 'organization',
    });
    unverifiedOrg = await Organization.create({
      userId: unverifiedOrgUser._id,
      name: 'Unverified Clinic',
      uniqueOrganizationCode: 'ORG-UNVER-01',
      qrCheckinCode: 'QR-UNVER-01',
      verificationStatus: 'pending',
      registrationNumber: 'REG-UNVER-01',
    });

    // 8. Active Affiliations for Dr. Evelyn Carter
    activeAffiliation1 = await DoctorAffiliation.create({
      affiliationId: 'AFF-APEX-8801',
      doctorId: doctor._id,
      organizationId: org1._id,
      status: 'ACTIVE',
      department: 'Cardiology',
      designation: 'Senior Consultant',
    });

    activeAffiliation2 = await DoctorAffiliation.create({
      affiliationId: 'AFF-TRAUMA-8802',
      doctorId: doctor._id,
      organizationId: org2._id,
      status: 'ACTIVE',
      department: 'Cardiology',
      designation: 'Visiting Specialist',
    });

    terminatedAffiliation = await DoctorAffiliation.create({
      affiliationId: 'AFF-TERM-8803',
      doctorId: doctor._id,
      organizationId: org1._id,
      status: 'TERMINATED',
    });

    // 9. Doctor Schedule for Mondays (2026-11-16 is Monday)
    await DoctorSchedule.create({
      scheduleId: 'SCHED-EVELYN-01',
      doctorId: doctor._id,
      organizationId: org1._id,
      affiliationId: activeAffiliation1._id,
      scheduleType: 'WEEKLY_RECURRING',
      scheduleDays: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '13:00', isActive: true },
      ],
      appointmentAvailability: {
        slotDuration: 30,
        bufferDuration: 0,
      },
      status: 'ACTIVE',
    });
  });

  // TC-APT-01: Provider Discovery & Affiliations
  test('TC-APT-01: Patient searches verified doctors and retrieves their active hospital affiliations', async () => {
    const searchRes = await request(app).get('/api/doctors/search?specialization=Cardiology');
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.success).toBe(true);
    expect(searchRes.body.data.length).toBeGreaterThanOrEqual(1);

    const docResult = searchRes.body.data.find((d) => d._id === doctor._id.toString());
    expect(docResult).toBeDefined();
    expect(docResult.activeAffiliations).toBeDefined();
    expect(docResult.activeAffiliations.length).toBe(2);

    // Endpoint for specific doctor affiliations
    const affRes = await request(app).get(`/api/doctors/${doctor._id}/affiliations`);
    expect(affRes.status).toBe(200);
    expect(affRes.body.data.length).toBe(2);
  });

  // TC-APT-02: Successful Booking
  test('TC-APT-02: Patient successfully books consultation with dynamic schedule revalidation and status CONFIRMED', async () => {
    const res = await request(app)
      .post('/api/appointments/book')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        doctorId: doctor._id,
        organizationId: org1._id,
        affiliationId: activeAffiliation1._id,
        slotDate: '2026-11-16',
        slotTime: '09:30 AM',
        reason: 'Hypertension checkup and EKG review',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.appointment).toBeDefined();
    expect(res.body.data.qrPassUrl).toMatch(/^data:image\/png;base64,/);

    const apt = res.body.data.appointment;
    expect(apt.status).toBe('CONFIRMED');
    expect(apt.patientNotes).toBe('Hypertension checkup and EKG review');
    expect(apt.affiliationId.toString()).toBe(activeAffiliation1._id.toString());

    // Verify status history recorded
    const history = await AppointmentStatusHistory.find({ appointmentId: apt._id });
    expect(history.length).toBe(1);
    expect(history[0].newStatus).toBe('CONFIRMED');
    expect(history[0].changedBy.toString()).toBe(patientUser1._id.toString());

    // Verify notification created
    const notifs = await AppointmentNotification.find({ appointmentId: apt._id });
    expect(notifs.length).toBeGreaterThanOrEqual(1);
  });

  // TC-APT-03: Rejects Unverified Doctor
  test('TC-APT-03: Rejects appointment booking for an unverified doctor', async () => {
    const res = await request(app)
      .post('/api/appointments/book')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        doctorId: unverifiedDoctor._id,
        organizationId: org1._id,
        slotDate: '2026-11-16',
        slotTime: '10:00 AM',
      });

    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/doctor is not available or not verified/i);
  });

  // TC-APT-04: Rejects Unverified Organization
  test('TC-APT-04: Rejects appointment booking for an unverified healthcare facility', async () => {
    const res = await request(app)
      .post('/api/appointments/book')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        doctorId: doctor._id,
        organizationId: unverifiedOrg._id,
        slotDate: '2026-11-16',
        slotTime: '10:00 AM',
      });

    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/healthcare facility is not verified/i);
  });

  // TC-APT-05: Rejects Inactive Affiliation
  test('TC-APT-05: Rejects appointment booking when doctor has no active affiliation with chosen facility', async () => {
    const res = await request(app)
      .post('/api/appointments/book')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        doctorId: doctor._id,
        organizationId: org1._id,
        affiliationId: terminatedAffiliation._id,
        slotDate: '2026-11-16',
        slotTime: '10:00 AM',
      });

    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/not actively affiliated/i);
  });

  // TC-APT-06: Doctor Leave Blocks Booking
  test('TC-APT-06: Rejects appointment booking when doctor is on approved leave', async () => {
    await DoctorLeave.create({
      doctorId: doctor._id,
      startDate: '2026-11-16',
      endDate: '2026-11-16',
      isFullDay: true,
      reason: 'Medical Conference',
      status: 'APPROVED',
    });

    const res = await request(app)
      .post('/api/appointments/book')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        doctorId: doctor._id,
        organizationId: org1._id,
        slotDate: '2026-11-16',
        slotTime: '10:00 AM',
      });

    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/doctor is on approved leave/i);
  });

  // TC-APT-07: Organization Holiday Blocks Booking
  test('TC-APT-07: Rejects appointment booking when healthcare organization declared holiday closure', async () => {
    await OrganizationHoliday.create({
      organizationId: org1._id,
      holidayDate: '2026-11-16',
      description: 'Annual Maintenance Closure',
    });

    const res = await request(app)
      .post('/api/appointments/book')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        doctorId: doctor._id,
        organizationId: org1._id,
        slotDate: '2026-11-16',
        slotTime: '10:00 AM',
      });

    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/closed.*for official holiday/i);
  });

  // TC-APT-08: Cross-Facility Doctor Collision
  test('TC-APT-08: Doctor cannot have overlapping consultations booked across different hospitals', async () => {
    // 1. Book doctor at Apex Heart on 2026-11-16 at 10:00 AM
    await request(app)
      .post('/api/appointments/book')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        doctorId: doctor._id,
        organizationId: org1._id,
        affiliationId: activeAffiliation1._id,
        slotDate: '2026-11-16',
        slotTime: '10:00 AM',
      });

    // 2. Patient 2 attempts to book the SAME doctor at City Trauma (Hospital 2) at the SAME 10:00 AM
    const res = await request(app)
      .post('/api/appointments/book')
      .set('Authorization', `Bearer ${patientToken2}`)
      .send({
        doctorId: doctor._id,
        organizationId: org2._id,
        affiliationId: activeAffiliation2._id,
        slotDate: '2026-11-16',
        slotTime: '10:00 AM',
      });

    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/doctor already has an active consultation booked/i);
  });

  // TC-APT-09: Patient Collision Prevention
  test('TC-APT-09: Patient cannot book overlapping appointments at the same date and time', async () => {
    // 1. Patient books Dr. Evelyn at 10:00 AM
    await request(app)
      .post('/api/appointments/book')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        doctorId: doctor._id,
        organizationId: org1._id,
        slotDate: '2026-11-16',
        slotTime: '10:00 AM',
      });

    // 2. Create another verified doctor
    const doc2User = await User.create({
      name: 'Dr. Sarah Second',
      email: 'sarah.second@shap.com',
      password: 'HashedPassword123!',
      role: 'doctor',
    });
    const doc2 = await Doctor.create({
      userId: doc2User._id,
      doctorUniqueId: 'DOC-88002',
      specialization: 'Neurology',
      verificationStatus: 'verified',
      licenseNumber: 'MD-CARDIO-88002',
      experienceYears: 8,
    });
    await DoctorAffiliation.create({
      affiliationId: 'AFF-APEX-8802',
      doctorId: doc2._id,
      organizationId: org1._id,
      status: 'ACTIVE',
    });

    // 3. Same Patient attempts to book Dr. Sarah at the exact same 10:00 AM
    const conflictRes = await request(app)
      .post('/api/appointments/book')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        doctorId: doc2._id,
        organizationId: org1._id,
        slotDate: '2026-11-16',
        slotTime: '10:00 AM',
      });

    expect(conflictRes.status).toBe(500);
    expect(conflictRes.body.message).toMatch(/already have an appointment booked/i);
  });

  // TC-APT-10: Concurrency Protection
  test('TC-APT-10: Concurrency protection prevents double booking of the same slot', async () => {
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/appointments/book')
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({
          doctorId: doctor._id,
          organizationId: org1._id,
          slotDate: '2026-11-16',
          slotTime: '11:00 AM',
        }),
      request(app)
        .post('/api/appointments/book')
        .set('Authorization', `Bearer ${patientToken2}`)
        .send({
          doctorId: doctor._id,
          organizationId: org1._id,
          slotDate: '2026-11-16',
          slotTime: '11:00 AM',
        }),
    ]);

    const statuses = [res1.status, res2.status];
    expect(statuses).toContain(201);
    expect(statuses).toContain(500);

    const activeApts = await Appointment.find({
      doctorId: doctor._id,
      slotDate: '2026-11-16',
      slotTime: '11:00 AM',
      status: { $in: ['CONFIRMED', 'booked'] },
    });
    expect(activeApts.length).toBe(1);
  });

  // TC-APT-11: Patient Cancellation & Slot Release
  test('TC-APT-11: Patient cancels appointment; slot is released and status history is recorded', async () => {
    // 1. Book appointment
    const bookRes = await request(app)
      .post('/api/appointments/book')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        doctorId: doctor._id,
        organizationId: org1._id,
        slotDate: '2026-11-16',
        slotTime: '11:30 AM',
      });

    const aptId = bookRes.body.data.appointment._id;

    // 2. Cancel appointment
    const cancelRes = await request(app)
      .post(`/api/appointments/${aptId}/cancel`)
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({ reason: 'Personal conflict resolved' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');
    expect(cancelRes.body.data.cancellationReason).toBe('Personal conflict resolved');

    // 3. Status history check
    const history = await AppointmentStatusHistory.find({ appointmentId: aptId });
    expect(history.length).toBe(2);
    expect(history[1].newStatus).toBe('CANCELLED');

    // 4. Verify slot is released: Patient 2 can now successfully book that exact slot!
    const rebookRes = await request(app)
      .post('/api/appointments/book')
      .set('Authorization', `Bearer ${patientToken2}`)
      .send({
        doctorId: doctor._id,
        organizationId: org1._id,
        slotDate: '2026-11-16',
        slotTime: '11:30 AM',
      });

    expect(rebookRes.status).toBe(201);
    expect(rebookRes.body.data.appointment.status).toBe('CONFIRMED');
  });

  // TC-APT-12: Transactional Rescheduling
  test('TC-APT-12: Rescheduling creates replacement appointment, marks old appointment RESCHEDULED, and links them', async () => {
    // 1. Initial booking
    const bookRes = await request(app)
      .post('/api/appointments/book')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        doctorId: doctor._id,
        organizationId: org1._id,
        slotDate: '2026-11-16',
        slotTime: '09:00 AM',
      });

    const origAptId = bookRes.body.data.appointment._id;

    // 2. Reschedule to 12:00 PM
    const res = await request(app)
      .post(`/api/appointments/${origAptId}/reschedule`)
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        newDate: '2026-11-16',
        newTime: '12:00 PM',
        reason: 'Work meeting rescheduled',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Old appointment must be marked RESCHEDULED
    const oldApt = await Appointment.findById(origAptId);
    expect(oldApt.status).toBe('RESCHEDULED');

    // Replacement appointment linked to old appointment
    const repApt = await Appointment.findOne({ rescheduledFromId: origAptId });
    expect(repApt).toBeDefined();
    expect(repApt.slotTime).toBe('12:00 PM');
    expect(repApt.status).toBe('CONFIRMED');

    // Verify status history on both
    const oldHistory = await AppointmentStatusHistory.find({ appointmentId: origAptId });
    expect(oldHistory.some((h) => h.newStatus === 'RESCHEDULED')).toBe(true);

    const repHistory = await AppointmentStatusHistory.find({ appointmentId: repApt._id });
    expect(repHistory.some((h) => h.newStatus === 'CONFIRMED')).toBe(true);
  });

  // TC-APT-13: Reschedule Failure Preserves Original
  test('TC-APT-13: Rescheduling failure on occupied slot preserves original appointment unchanged', async () => {
    // 1. Patient 1 books 09:00 AM
    const apt1Res = await request(app)
      .post('/api/appointments/book')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        doctorId: doctor._id,
        organizationId: org1._id,
        slotDate: '2026-11-16',
        slotTime: '09:00 AM',
      });

    // 2. Patient 2 books 10:00 AM
    await request(app)
      .post('/api/appointments/book')
      .set('Authorization', `Bearer ${patientToken2}`)
      .send({
        doctorId: doctor._id,
        organizationId: org1._id,
        slotDate: '2026-11-16',
        slotTime: '10:00 AM',
      });

    const apt1Id = apt1Res.body.data.appointment._id;

    // 3. Patient 1 attempts to reschedule to 10:00 AM (already booked by Patient 2)
    const failRes = await request(app)
      .post(`/api/appointments/${apt1Id}/reschedule`)
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        newDate: '2026-11-16',
        newTime: '10:00 AM',
      });

    expect(failRes.status).toBe(500);
    expect(failRes.body.message).toMatch(/already booked/i);

    // Verify original appointment is STILL confirmed and unchanged!
    const unchangedApt = await Appointment.findById(apt1Id);
    expect(unchangedApt.status).toBe('CONFIRMED');
    expect(unchangedApt.slotTime).toBe('09:00 AM');
  });

  // TC-APT-14: Doctor Completes and Marks No-Show
  test('TC-APT-14: Doctor marks consultation COMPLETED and NO_SHOW with auditable history', async () => {
    const bookRes = await request(app)
      .post('/api/appointments/book')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        doctorId: doctor._id,
        organizationId: org1._id,
        slotDate: '2026-11-16',
        slotTime: '12:30 PM',
      });

    const aptId = bookRes.body.data.appointment._id;

    // Doctor completes consultation
    const completeRes = await request(app)
      .post(`/api/doctors/me/appointments/${aptId}/complete`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ notes: 'Normal sinus rhythm, prescription updated.' });

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.status).toBe('COMPLETED');
    expect(completeRes.body.data.clinicalNotes).toBe('Normal sinus rhythm, prescription updated.');

    const history = await AppointmentStatusHistory.find({ appointmentId: aptId });
    expect(history.some((h) => h.newStatus === 'COMPLETED')).toBe(true);
  });

  // TC-APT-15: Security & Ownership
  test('TC-APT-15: RBAC prevents patients from viewing other patients appointment details', async () => {
    const bookRes = await request(app)
      .post('/api/appointments/book')
      .set('Authorization', `Bearer ${patientToken1}`)
      .send({
        doctorId: doctor._id,
        organizationId: org1._id,
        slotDate: '2026-11-16',
        slotTime: '10:30 AM',
      });

    const aptId = bookRes.body.data.appointment._id;

    // Patient 1 (owner) can view details
    const ownerRes = await request(app)
      .get(`/api/appointments/${aptId}`)
      .set('Authorization', `Bearer ${patientToken1}`);
    expect(ownerRes.status).toBe(200);
    expect(ownerRes.body.data.statusHistory).toBeDefined();

    // Patient 2 (stranger) is blocked
    const forbiddenRes = await request(app)
      .get(`/api/appointments/${aptId}`)
      .set('Authorization', `Bearer ${patientToken2}`);
    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.message).toMatch(/unauthorized.*only view their own/i);
  });
});


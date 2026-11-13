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
  EmergencyAvailability,
  Appointment,
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

describe('MODULE 5: Doctor Schedule and Availability Management Master Test Suite', () => {
  let doctorUser;
  let doctor;
  let doctorToken;

  let patientUser;
  let patientToken;

  let orgUser1;
  let org1;
  let orgToken1;

  let orgUser2;
  let org2;
  let orgToken2;

  let activeAffiliation1;
  let activeAffiliation2;
  let inactiveAffiliation;

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
    await DoctorSchedule.deleteMany({});
    await DoctorLeave.deleteMany({});
    await OrganizationHoliday.deleteMany({});
    await EmergencyAvailability.deleteMany({});
    await Appointment.deleteMany({});

    // 1. Doctor
    doctorUser = await User.create({
      name: 'Dr. Vikram Malhotra',
      email: 'marcus.vance@shap.com',
      password: 'HashedPassword123!',
      role: 'doctor',
      accountStatus: 'active',
      isEmailVerified: true,
    });
    doctorToken = createToken(doctorUser);

    doctor = await Doctor.create({
      userId: doctorUser._id,
      doctorUniqueId: 'DOC-77001',
      specialization: 'Cardiology',
      verificationStatus: 'verified',
      licenseNumber: 'MD-77001',
      experienceYears: 12,
    });

    // 2. Patient
    patientUser = await User.create({
      name: 'John Patient',
      email: 'john.patient@shap.com',
      password: 'HashedPassword123!',
      role: 'patient',
      accountStatus: 'active',
      isEmailVerified: true,
    });
    patientToken = createToken(patientUser);

    // 3. Organization 1 (Apex Heart)
    orgUser1 = await User.create({
      name: 'Apex Heart Hospital',
      email: 'admin@apexheart.org',
      password: 'HashedPassword123!',
      role: 'organization',
      accountStatus: 'active',
      isEmailVerified: true,
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

    // 4. Organization 2 (City Trauma)
    orgUser2 = await User.create({
      name: 'City Trauma Center',
      email: 'admin@citytrauma.org',
      password: 'HashedPassword123!',
      role: 'organization',
      accountStatus: 'active',
      isEmailVerified: true,
    });
    orgToken2 = createToken(orgUser2);

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

    // 5. Active Affiliations for Doctor
    activeAffiliation1 = await DoctorAffiliation.create({
      affiliationId: 'AFF-APEX-001',
      doctorId: doctor._id,
      organizationId: org1._id,
      status: 'ACTIVE',
      department: 'Cardiology',
      designation: 'Senior Consultant',
      affiliationType: 'VISITING',
    });

    activeAffiliation2 = await DoctorAffiliation.create({
      affiliationId: 'AFF-TRAUMA-002',
      doctorId: doctor._id,
      organizationId: org2._id,
      status: 'ACTIVE',
      department: 'Emergency Cardiology',
      designation: 'Consultant',
      affiliationType: 'VISITING',
    });

    inactiveAffiliation = await DoctorAffiliation.create({
      affiliationId: 'AFF-INACTIVE-999',
      doctorId: doctor._id,
      organizationId: org1._id,
      status: 'TERMINATED',
      department: 'General Medicine',
    });
  });

  // TC-SCHED-01: Doctor creates weekly recurring schedule for active affiliation
  test('TC-SCHED-01: Doctor creates weekly recurring schedule for an active affiliation', async () => {
    const res = await request(app)
      .post('/api/doctors/me/schedules')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        affiliationId: activeAffiliation1._id,
        scheduleType: 'WEEKLY_RECURRING',
        effectiveFrom: '2026-11-01',
        timezone: 'UTC',
        scheduleDays: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '13:00', isActive: true }, // Monday morning
          { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', isActive: true }, // Wednesday full day
        ],
        appointmentAvailability: {
          slotDuration: 30,
          bufferDuration: 5,
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.scheduleId).toMatch(/^SCHED-/);
    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data.scheduleDays.length).toBe(2);
  });

  // TC-SCHED-02: Doctor cannot create schedule for an inactive / terminated affiliation
  test('TC-SCHED-02: Prevents schedule creation for inactive or terminated affiliations', async () => {
    const res = await request(app)
      .post('/api/doctors/me/schedules')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        affiliationId: inactiveAffiliation._id,
        scheduleDays: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isActive: true }],
      });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/active affiliation required/i);
  });

  // TC-SCHED-03: Conflict Detection: Prevents overlapping working hours across multiple active affiliations
  test('TC-SCHED-03: Conflict Detection prevents overlapping schedules across multiple hospital affiliations', async () => {
    // 1. Doctor sets Monday 09:00 - 13:00 at Apex Heart (Affiliation 1)
    await request(app)
      .post('/api/doctors/me/schedules')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        affiliationId: activeAffiliation1._id,
        scheduleType: 'WEEKLY_RECURRING',
        scheduleDays: [{ dayOfWeek: 1, startTime: '09:00', endTime: '13:00', isActive: true }],
      });

    // 2. Doctor attempts to set overlapping Monday 11:00 - 15:00 at City Trauma (Affiliation 2)
    const conflictRes = await request(app)
      .post('/api/doctors/me/schedules')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        affiliationId: activeAffiliation2._id,
        scheduleType: 'WEEKLY_RECURRING',
        scheduleDays: [{ dayOfWeek: 1, startTime: '11:00', endTime: '15:00', isActive: true }],
      });

    expect(conflictRes.status).toBe(500);
    expect(conflictRes.body.success).toBe(false);
    expect(conflictRes.body.message).toMatch(/schedule conflict detected.*overlapping working periods/i);

    // 3. Non-overlapping schedule (Monday 14:00 - 18:00) should succeed
    const validRes = await request(app)
      .post('/api/doctors/me/schedules')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        affiliationId: activeAffiliation2._id,
        scheduleType: 'WEEKLY_RECURRING',
        scheduleDays: [{ dayOfWeek: 1, startTime: '14:00', endTime: '18:00', isActive: true }],
      });

    expect(validRes.status).toBe(201);
    expect(validRes.body.success).toBe(true);
  });

  // TC-SCHED-04: Doctor updates schedule and deactivates
  test('TC-SCHED-04: Doctor updates and deactivates schedule', async () => {
    const createRes = await request(app)
      .post('/api/doctors/me/schedules')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        affiliationId: activeAffiliation1._id,
        scheduleDays: [{ dayOfWeek: 2, startTime: '10:00', endTime: '16:00', isActive: true }],
      });

    const scheduleId = createRes.body.data._id;

    // Update
    const updateRes = await request(app)
      .put(`/api/doctors/me/schedules/${scheduleId}`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        scheduleDays: [{ dayOfWeek: 2, startTime: '10:00', endTime: '18:00', isActive: true }],
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.scheduleDays[0].endTime).toBe('18:00');

    // Deactivate
    const deleteRes = await request(app)
      .delete(`/api/doctors/me/schedules/${scheduleId}`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data.status).toBe('INACTIVE');
  });

  // TC-SCHED-05: Dynamic Slot Generation generates slots from active schedule
  test('TC-SCHED-05: Dynamic slot generation produces candidate slots based on configured schedule', async () => {
    // Schedule on Monday (dayOfWeek: 1): 09:00 to 11:00 (slotDuration: 30m)
    await request(app)
      .post('/api/doctors/me/schedules')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        affiliationId: activeAffiliation1._id,
        scheduleDays: [{ dayOfWeek: 1, startTime: '09:00', endTime: '11:00', isActive: true }],
        appointmentAvailability: { slotDuration: 30, bufferDuration: 0 },
      });

    // Request slots for a Monday: 2026-11-16 is a Monday (dayOfWeek = 1)
    const res = await request(app).get(
      `/api/appointments/available-slots?doctorId=${doctor._id}&date=2026-11-16&organizationId=${org1._id}`
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Should produce 4 slots: 09:00 AM, 09:30 AM, 10:00 AM, 10:30 AM
    expect(res.body.data.length).toBe(4);
    expect(res.body.data.map((s) => s.time)).toEqual([
      '09:00 AM',
      '09:30 AM',
      '10:00 AM',
      '10:30 AM',
    ]);
  });

  // TC-SCHED-06: Breaks are excluded from available slots
  test('TC-SCHED-06: Breaks are excluded from available candidate appointment slots', async () => {
    // Monday 09:00 - 12:00 with Break 10:00 - 11:00
    await request(app)
      .post('/api/doctors/me/schedules')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        affiliationId: activeAffiliation1._id,
        scheduleDays: [{ dayOfWeek: 1, startTime: '09:00', endTime: '12:00', isActive: true }],
        breaks: [{ title: 'Staff Meeting', startTime: '10:00', endTime: '11:00' }],
      });

    // 2026-11-16 (Monday)
    const res = await request(app).get(
      `/api/appointments/available-slots?doctorId=${doctor._id}&date=2026-11-16&organizationId=${org1._id}`
    );

    expect(res.status).toBe(200);
    const slots = res.body.data;
    const slot1000 = slots.find((s) => s.time === '10:00 AM');
    const slot1030 = slots.find((s) => s.time === '10:30 AM');
    const slot0900 = slots.find((s) => s.time === '09:00 AM');

    expect(slot0900.isAvailable).toBe(true);
    expect(slot1000.isAvailable).toBe(false);
    expect(slot1000.reason).toBe('Break');
    expect(slot1030.isAvailable).toBe(false);
  });

  // TC-SCHED-07: Doctor Leave blocks slot availability
  test('TC-SCHED-07: Doctor registered leave blocks slot availability on leave dates', async () => {
    // Schedule Monday 09:00 - 12:00
    await request(app)
      .post('/api/doctors/me/schedules')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        affiliationId: activeAffiliation1._id,
        scheduleDays: [{ dayOfWeek: 1, startTime: '09:00', endTime: '12:00', isActive: true }],
      });

    // Register leave for 2026-11-16
    const leaveRes = await request(app)
      .post('/api/doctors/me/leave')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        startDate: '2026-11-16',
        endDate: '2026-11-16',
        leaveType: 'VACATION',
        reason: 'Annual medical symposium',
      });

    expect(leaveRes.status).toBe(201);
    expect(leaveRes.body.success).toBe(true);

    // Fetch slots on 2026-11-16
    const res = await request(app).get(
      `/api/appointments/available-slots?doctorId=${doctor._id}&date=2026-11-16&organizationId=${org1._id}`
    );

    expect(res.status).toBe(200);
    // All slots should be empty / blocked due to full-day leave
    expect(res.body.data.length).toBe(0);
  });

  // TC-SCHED-08: Leave conflicts with existing appointments are reported
  test('TC-SCHED-08: Requesting leave flags existing booked appointment conflicts', async () => {
    // Create an existing booked appointment on 2026-11-23 (Monday)
    await Appointment.create({
      appointmentNumber: '#AP-MOCK-001',
      patientId: patientUser._id,
      doctorId: doctor._id,
      organizationId: org1._id,
      slotDate: '2026-11-23',
      slotTime: '10:00 AM',
      status: 'booked',
    });

    // Doctor requests leave covering 2026-11-23
    const leaveRes = await request(app)
      .post('/api/doctors/me/leave')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        startDate: '2026-11-20',
        endDate: '2026-11-25',
        leaveType: 'CONFERENCE',
        reason: 'Cardiology conference in Chicago',
      });

    expect(leaveRes.status).toBe(201);
    expect(leaveRes.body.data.hasConflicts).toBe(true);
    expect(leaveRes.body.data.conflictCount).toBe(1);
    expect(leaveRes.body.data.affectedAppointments[0].appointmentNumber).toBe('#AP-MOCK-001');
  });

  // TC-SCHED-09: Organization Holiday blocks slots and booking
  test('TC-SCHED-09: Organization Holiday blocks appointment slot availability and booking', async () => {
    // 1. Organization declares holiday on 2026-11-30
    const holidayRes = await request(app)
      .post('/api/organizations/me/holidays')
      .set('Authorization', `Bearer ${orgToken1}`)
      .send({
        holidayDate: '2026-11-30',
        description: 'Hospital Foundation Annual Day Closure',
      });

    expect(holidayRes.status).toBe(201);

    // 2. Doctor has schedule on Monday
    await request(app)
      .post('/api/doctors/me/schedules')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        affiliationId: activeAffiliation1._id,
        scheduleDays: [{ dayOfWeek: 1, startTime: '09:00', endTime: '12:00', isActive: true }],
      });

    // 3. Available slots query returns 0 for holiday
    const slotsRes = await request(app).get(
      `/api/appointments/available-slots?doctorId=${doctor._id}&date=2026-11-30&organizationId=${org1._id}`
    );
    expect(slotsRes.body.data.length).toBe(0);

    // 4. Direct booking attempt on holiday is blocked by backend
    const bookRes = await request(app)
      .post('/api/appointments/book')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        doctorId: doctor._id,
        organizationId: org1._id,
        slotDate: '2026-11-30',
        slotTime: '09:30 AM',
      });

    expect(bookRes.status).toBe(500);
    expect(bookRes.body.message).toMatch(/closed.*official holiday/i);
  });

  // TC-SCHED-10: Booking revalidation blocks booking on doctor leave
  test('TC-SCHED-10: Backend transactional validation blocks appointment booking on doctor leave', async () => {
    // Leave registered on 2026-12-07
    await DoctorLeave.create({
      doctorId: doctor._id,
      startDate: '2026-12-07',
      endDate: '2026-12-07',
      isFullDay: true,
      status: 'APPROVED',
    });

    const bookRes = await request(app)
      .post('/api/appointments/book')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        doctorId: doctor._id,
        organizationId: org1._id,
        slotDate: '2026-12-07',
        slotTime: '10:00 AM',
      });

    expect(bookRes.status).toBe(500);
    expect(bookRes.body.message).toMatch(/doctor is on approved leave/i);
  });

  // TC-SCHED-11: Prevents double booking for the same doctor, date and slot time
  test('TC-SCHED-11: Prevents concurrent double booking of the exact same slot', async () => {
    // 1st booking
    const book1 = await request(app)
      .post('/api/appointments/book')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        doctorId: doctor._id,
        organizationId: org1._id,
        slotDate: '2026-12-14',
        slotTime: '11:00 AM',
      });

    expect(book1.status).toBe(201);

    // 2nd booking attempt for same slot
    const book2 = await request(app)
      .post('/api/appointments/book')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        doctorId: doctor._id,
        organizationId: org1._id,
        slotDate: '2026-12-14',
        slotTime: '11:00 AM',
      });

    expect(book2.status).toBe(500);
    expect(book2.body.message).toMatch(/already been booked/i);
  });

  // TC-SCHED-12: Doctor configures emergency availability
  test('TC-SCHED-12: Doctor configures emergency on-call duty availability and capabilities', async () => {
    const res = await request(app)
      .post('/api/doctors/me/emergency-availability')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        affiliationId: activeAffiliation1._id,
        participationStatus: true,
        emergencyCapabilities: ['Trauma Surgery', 'Acute Coronary Syndrome', 'ECMO'],
        notes: 'Available for immediate catheterization triage.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ON_DUTY');
    expect(res.body.data.participationStatus).toBe(true);
    expect(res.body.data.emergencyCapabilities).toContain('Trauma Surgery');

    // Doctor profile emergency flag updated
    const docDb = await Doctor.findById(doctor._id);
    expect(docDb.isAvailableForEmergency).toBe(true);

    // Query emergency availability
    const getRes = await request(app)
      .get('/api/doctors/me/emergency-availability')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.length).toBe(1);
    expect(getRes.body.data[0].status).toBe('ON_DUTY');
  });
});


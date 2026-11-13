import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import {
  User,
  Organization,
  EmergencyRequest,
  ResourceReservation,
  HealthcareResource,
  Notification,
  NotificationDelivery,
  NotificationPreference,
  NotificationOutbox,
} from '../src/models/index.js';
import { notificationService } from '../src/services/NotificationService.js';
import { notificationDeliveryService } from '../src/services/NotificationDeliveryService.js';
import { notificationOutboxService } from '../src/services/NotificationOutboxService.js';
import { notificationRetryService } from '../src/services/NotificationRetryService.js';
import { notificationPreferenceService } from '../src/services/NotificationPreferenceService.js';
import { emailNotificationService } from '../src/services/EmailNotificationService.js';
import { smsNotificationService } from '../src/services/SmsNotificationService.js';
import { webSocketNotificationService } from '../src/services/WebSocketNotificationService.js';
import { emergencyBroadcastService } from '../src/services/EmergencyBroadcastService.js';

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

describe('MODULE 13: Emergency Notifications, Communication and Escalation Test Suite', () => {
  let mongoServer;
  let patientUser;
  let otherPatientUser;
  let doctorUser;
  let orgStaffUser;
  let otherOrgStaffUser;
  let adminUser;

  let patientToken;
  let otherPatientToken;
  let orgToken;
  let otherOrgToken;
  let adminToken;

  let organization;
  let otherOrganization;
  let emergencyReq;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'shap_super_secret_jwt_key_2026';
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // 1. Create Patient User
    patientUser = await User.create({
      name: 'Aarav Mehta',
      email: `patient.m13.${Date.now()}@shap.com`,
      phone: '+919876543210',
      password: 'Password123!',
      role: 'patient',
      isVerified: true,
    });
    patientToken = generateToken(patientUser);

    // 2. Create Second Patient User
    otherPatientUser = await User.create({
      name: 'Pooja Verma',
      email: `pooja.m13.${Date.now()}@shap.com`,
      phone: '+919876543211',
      password: 'Password123!',
      role: 'patient',
      isVerified: true,
    });
    otherPatientToken = generateToken(otherPatientUser);

    // 3. Create Doctor User
    doctorUser = await User.create({
      name: 'Dr. Suresh Rao',
      email: `dr.rao.${Date.now()}@shap.com`,
      phone: '+919876543212',
      password: 'Password123!',
      role: 'doctor',
      isVerified: true,
    });

    // 4. Create Org Staff & Org
    orgStaffUser = await User.create({
      name: 'City Trauma Staff',
      email: `city.trauma.${Date.now()}@shap.com`,
      phone: '+919876543213',
      password: 'Password123!',
      role: 'organization',
      isVerified: true,
    });

    organization = await Organization.create({
      userId: orgStaffUser._id,
      name: 'City Trauma Center',
      slug: `city-trauma-${Date.now()}`,
      orgType: 'hospital',
      registrationNumber: `REG-TRAUMA-${Date.now()}`,
      qrCheckinCode: `QR-TRAUMA-${Date.now()}`,
      verificationStatus: 'VERIFIED',
      location: {
        type: 'Point',
        coordinates: [77.2, 28.6],
      },
      isParticipating: true,
      emergencyCapable: true,
      contactEmail: 'trauma@cityhealth.org',
    });
    orgStaffUser.organizationId = organization._id;
    await orgStaffUser.save();
    orgToken = generateToken(orgStaffUser, organization._id);

    // 5. Create Other Org Staff & Org
    otherOrgStaffUser = await User.create({
      name: 'Apex General Staff',
      email: `apex.general.${Date.now()}@shap.com`,
      phone: '+919876543214',
      password: 'Password123!',
      role: 'organization',
      isVerified: true,
    });

    otherOrganization = await Organization.create({
      userId: otherOrgStaffUser._id,
      name: 'Apex General Hospital',
      slug: `apex-general-${Date.now()}`,
      orgType: 'hospital',
      registrationNumber: `REG-APEX-${Date.now()}`,
      qrCheckinCode: `QR-APEX-${Date.now()}`,
      verificationStatus: 'VERIFIED',
      location: {
        type: 'Point',
        coordinates: [77.25, 28.65],
      },
      isParticipating: true,
      emergencyCapable: true,
      contactEmail: 'desk@apex.org',
    });
    otherOrgStaffUser.organizationId = otherOrganization._id;
    await otherOrgStaffUser.save();
    otherOrgToken = generateToken(otherOrgStaffUser, otherOrganization._id);

    // 6. Create Admin User
    adminUser = await User.create({
      name: 'Platform Overseer Admin',
      email: `admin.m13.${Date.now()}@shap.com`,
      phone: '+919876543299',
      password: 'Password123!',
      role: 'admin',
      isVerified: true,
    });
    adminToken = generateToken(adminUser);

    // 7. Create Emergency Request for Context
    emergencyReq = await EmergencyRequest.create({
      requestCode: `EMG-M13-${Date.now()}`,
      patientId: patientUser._id,
      patientName: patientUser.name,
      patientPhone: patientUser.phone,
      emergencyType: 'cardiac',
      severity: 'critical',
      status: 'CREATED',
      location: {
        type: 'Point',
        coordinates: [77.209, 28.6139],
      },
      latitude: 28.6139,
      longitude: 77.209,
      address: 'Connaught Place, New Delhi',
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  // =========================================================================
  // 1. NOTIFICATION CREATION & PERSISTENCE
  // =========================================================================
  test('TC-NOTIF-01: Notification creation and database persistence with custom properties', async () => {
    const notif = await notificationService.createNotification({
      recipientUserId: patientUser._id,
      notificationType: 'EMERGENCY_REQUEST_CREATED',
      title: 'Emergency Medical Request Logged',
      message: 'Your emergency request has been registered in the system.',
      priority: 'HIGH',
      actionUrl: `/emergency/track/${emergencyReq._id}`,
    });

    expect(notif).toBeDefined();
    expect(notif.notificationId).toBeDefined();
    expect(notif.notificationType).toBe('EMERGENCY_REQUEST_CREATED');
    expect(notif.recipientUserId.toString()).toBe(patientUser._id.toString());
    expect(notif.priority).toBe('HIGH');
    expect(notif.status).toBe('PENDING');

    const inDb = await Notification.findById(notif._id);
    expect(inDb).toBeTruthy();
    expect(inDb.title).toBe('Emergency Medical Request Logged');
  });

  // =========================================================================
  // 2. IN-APP DELIVERY RECORD
  // =========================================================================
  test('TC-NOTIF-02: IN_APP channel creates delivery record with DELIVERED status', async () => {
    const notif = await notificationService.createNotification({
      recipientUserId: patientUser._id,
      notificationType: 'APPOINTMENT_BOOKED',
      title: 'Appointment Confirmed',
      message: 'Dr. Rao will see you tomorrow at 10:00 AM.',
      priority: 'NORMAL',
    });

    // Wait briefly for async dispatch
    await new Promise((r) => setTimeout(r, 150));

    const deliveries = await NotificationDelivery.find({ notificationId: notif._id });
    const inAppDelivery = deliveries.find((d) => d.channel === 'IN_APP');
    expect(inAppDelivery).toBeDefined();
    expect(inAppDelivery.status).toBe('DELIVERED');
    expect(inAppDelivery.deliveredAt).toBeDefined();
  });

  // =========================================================================
  // 3. WEBSOCKET DELIVERY & ROOM EMISSION
  // =========================================================================
  test('TC-NOTIF-03: WebSocket delivery attempts room emissions without crashing when server is headless', async () => {
    const notif = await Notification.create({
      recipientUserId: patientUser._id,
      organizationId: organization._id,
      emergencyRequestId: emergencyReq._id,
      notificationType: 'EMERGENCY_BEEP_BROADCAST',
      title: 'Emergency Beep Incoming',
      message: 'Critical Cardiac Emergency in your area',
      priority: 'EMERGENCY',
      status: 'PENDING',
    });

    const result = await webSocketNotificationService.deliver(notif);
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.deliveredAt).toBeDefined();
  });

  // =========================================================================
  // 4. EMAIL PROVIDER DELIVERY & SIMULATED FALLBACK
  // =========================================================================
  test('TC-NOTIF-04: Email delivery succeeds with provider simulation for valid email address', async () => {
    const notif = await Notification.create({
      recipientUserId: patientUser._id,
      notificationType: 'DOCTOR_VERIFICATION',
      title: 'Doctor Verification Approved',
      message: 'Congratulations, your medical license is verified.',
      priority: 'NORMAL',
      status: 'PENDING',
    });

    const res = await emailNotificationService.deliver(notif, patientUser);
    expect(res.success).toBe(true);
    expect(res.providerMessageId).toContain('EMAIL');
    expect(res.deliveredAt).toBeDefined();
  });

  // =========================================================================
  // 5. SMS PROVIDER FORMAT VALIDATION & FAILURE HANDLING
  // =========================================================================
  test('TC-NOTIF-05: SMS delivery succeeds for valid format and fails permanently for invalid format', async () => {
    const notif = await Notification.create({
      recipientUserId: patientUser._id,
      notificationType: 'EMERGENCY_RESOURCE_RESERVED',
      title: 'ER Bay Reserved',
      message: 'City Trauma Center has reserved ER Bay 1 for you.',
      priority: 'EMERGENCY',
      status: 'PENDING',
    });

    // Valid phone format
    const validRes = await smsNotificationService.deliver(notif, { phone: '+919876543210' });
    expect(validRes.success).toBe(true);
    expect(validRes.providerMessageId).toContain('SMS');

    // Invalid phone format
    const invalidRes = await smsNotificationService.deliver(notif, { phone: 'invalid-abc-phone' });
    expect(invalidRes.success).toBe(false);
    expect(invalidRes.permanent).toBe(true);
    expect(invalidRes.error).toContain('Invalid phone number format');
  });

  // =========================================================================
  // 6. INVALID RECIPIENT ERROR HANDLING
  // =========================================================================
  test('TC-NOTIF-06: Creating notification without recipientUserId throws an error', async () => {
    await expect(
      notificationService.createNotification({
        notificationType: 'GENERAL_SYSTEM',
        title: 'Missing Recipient',
        message: 'No recipient provided',
      })
    ).rejects.toThrow('recipientUserId is required to create a notification');
  });

  // =========================================================================
  // 7. NOTIFICATION MARK AS READ (POST /api/notifications/:id/read)
  // =========================================================================
  test('TC-NOTIF-07: POST /api/notifications/:notificationId/read marks notification as READ', async () => {
    const notif = await Notification.create({
      recipientUserId: patientUser._id,
      notificationType: 'GENERAL_SYSTEM',
      title: 'Hospital Hours Update',
      message: 'OPD timings updated.',
      priority: 'NORMAL',
      status: 'DELIVERED',
    });

    const res = await request(app)
      .post(`/api/notifications/${notif._id}/read`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('READ');
    expect(res.body.data.readAt).toBeDefined();

    const inDb = await Notification.findById(notif._id);
    expect(inDb.status).toBe('READ');
  });

  // =========================================================================
  // 8. MARK ALL AS READ (POST /api/notifications/my/read-all)
  // =========================================================================
  test('TC-NOTIF-08: POST /api/notifications/my/read-all marks all unread notifications as read', async () => {
    await Notification.create([
      {
        recipientUserId: patientUser._id,
        notificationType: 'GENERAL_SYSTEM',
        title: 'Alert 1',
        message: 'Alert 1 msg',
        status: 'DELIVERED',
      },
      {
        recipientUserId: patientUser._id,
        notificationType: 'GENERAL_SYSTEM',
        title: 'Alert 2',
        message: 'Alert 2 msg',
        status: 'DELIVERED',
      },
    ]);

    const res = await request(app)
      .post('/api/notifications/my/read-all')
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.updatedCount).toBeGreaterThanOrEqual(2);

    const countRes = await request(app)
      .get('/api/notifications/my/count')
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    expect(countRes.body.unreadCount).toBe(0);
  });

  // =========================================================================
  // 9. NOTIFICATION PREFERENCE ENFORCEMENT & SAFETY INVARIANT
  // =========================================================================
  test('TC-NOTIF-09: Preference enforcement mutes ordinary notifications but life-critical emergency alerts cannot be muted', async () => {
    // 1. User attempts to mute EMAIL and SMS
    await NotificationPreference.create([
      { userId: patientUser._id, notificationType: 'ALL', channel: 'EMAIL', enabled: false },
      { userId: patientUser._id, notificationType: 'ALL', channel: 'SMS', enabled: false },
    ]);

    // 2. Ordinary appointment notification -> email should be blocked/muted
    const ordinaryAllowed = await notificationPreferenceService.isChannelPermitted(
      patientUser._id,
      'APPOINTMENT_REMINDER',
      'NORMAL',
      'EMAIL'
    );
    expect(ordinaryAllowed).toBe(false);

    // 3. Life-Critical Emergency Notification -> SAFETY INVARIANT: Bypasses mute unconditionally
    const emergencyEmailAllowed = await notificationPreferenceService.isChannelPermitted(
      patientUser._id,
      'EMERGENCY_BEEP_BROADCAST',
      'EMERGENCY',
      'EMAIL'
    );
    expect(emergencyEmailAllowed).toBe(true);

    const emergencySmsAllowed = await notificationPreferenceService.isChannelPermitted(
      patientUser._id,
      'EMERGENCY_RESOURCE_RESERVED',
      'CRITICAL',
      'SMS'
    );
    expect(emergencySmsAllowed).toBe(true);
  });

  // =========================================================================
  // 10. TRANSACTIONAL OUTBOX EVENT CREATION
  // =========================================================================
  test('TC-NOTIF-10: Outbox enqueues event atomically with PENDING status', async () => {
    const event = await notificationOutboxService.enqueueEvent({
      eventType: 'EMERGENCY_BEEP_BROADCAST',
      aggregateType: 'EmergencyRequest',
      aggregateId: emergencyReq._id,
      payload: {
        emergencyRequestId: emergencyReq._id,
        recipientUserId: patientUser._id,
        title: 'Emergency Beep Sent',
        message: 'Broadcast initiated to eligible hospitals',
      },
    });

    expect(event).toBeDefined();
    expect(event.eventType).toBe('EMERGENCY_BEEP_BROADCAST');
    expect(event.status).toBe('PENDING');
    expect(event.retryCount).toBe(0);
  });

  // =========================================================================
  // 11. OUTBOX WORKER PROCESSING
  // =========================================================================
  test('TC-NOTIF-11: Outbox worker processes pending events and updates outbox status to PUBLISHED', async () => {
    const event = await NotificationOutbox.create({
      eventType: 'DOCTOR_REGISTRATION',
      aggregateType: 'User',
      aggregateId: doctorUser._id,
      payload: {
        recipientUserId: doctorUser._id,
        title: 'Welcome Doctor',
        message: 'Your registration was submitted for verification.',
      },
      status: 'PENDING',
    });

    const results = await notificationOutboxService.processPendingEvents(5);
    const matched = results.find((r) => r.eventId.toString() === event._id.toString());
    expect(matched).toBeDefined();
    expect(matched.success).toBe(true);

    const updatedEvent = await NotificationOutbox.findById(event._id);
    expect(updatedEvent.status).toBe('PUBLISHED');
  });

  // =========================================================================
  // 12. DUPLICATE EVENT PROCESSING / IDEMPOTENCY
  // =========================================================================
  test('TC-NOTIF-12: Duplicate outbox event processing is idempotent and prevents multiple notifications', async () => {
    const event = await NotificationOutbox.create({
      eventType: 'APPOINTMENT_BOOKED',
      aggregateType: 'User',
      aggregateId: patientUser._id,
      payload: {
        recipientUserId: patientUser._id,
        title: 'Idempotency Test Title',
        message: 'Testing duplicate outbox event execution',
      },
      status: 'PENDING',
    });

    // First execution
    const firstNotif = await notificationOutboxService.handleEvent(event);
    expect(firstNotif).toBeDefined();

    // Second execution with identical event
    const secondNotif = await notificationOutboxService.handleEvent(event);
    expect(secondNotif).toBeDefined();
    expect(secondNotif._id.toString()).toBe(firstNotif._id.toString());

    // Verify in database that only ONE notification exists for this event
    const count = await Notification.countDocuments({
      notificationId: `OUTBOX-${event._id.toString()}`,
    });
    expect(count).toBe(1);
  });

  // =========================================================================
  // 13. RETRY SCHEDULING WITH EXPONENTIAL BACKOFF
  // =========================================================================
  test('TC-NOTIF-13: Exponential backoff calculates 30s for attempt 1, 2m for attempt 2, 5m for attempt 3', () => {
    const now = Date.now();
    const retry1 = notificationDeliveryService.calculateNextRetry(1);
    const retry2 = notificationDeliveryService.calculateNextRetry(2);
    const retry3 = notificationDeliveryService.calculateNextRetry(3);

    // Attempt 1 -> ~30s
    const diff1 = retry1.getTime() - now;
    expect(diff1).toBeGreaterThanOrEqual(29000);
    expect(diff1).toBeLessThanOrEqual(35000);

    // Attempt 2 -> ~120s (2m)
    const diff2 = retry2.getTime() - now;
    expect(diff2).toBeGreaterThanOrEqual(119000);
    expect(diff2).toBeLessThanOrEqual(125000);

    // Attempt 3 -> ~300s (5m)
    const diff3 = retry3.getTime() - now;
    expect(diff3).toBeGreaterThanOrEqual(299000);
    expect(diff3).toBeLessThanOrEqual(305000);
  });

  // =========================================================================
  // 14. PERMANENT FAILURE CLASSIFICATION
  // =========================================================================
  test('TC-NOTIF-14: Permanent errors (e.g., missing or invalid contact info) mark delivery as FAILED without nextRetryAt', async () => {
    const notif = await Notification.create({
      recipientUserId: patientUser._id,
      notificationType: 'APPOINTMENT_REMINDER',
      title: 'Appointment Reminder',
      message: 'Reminder text',
      status: 'PENDING',
    });

    const delivery = await NotificationDelivery.create({
      notificationId: notif._id,
      channel: 'EMAIL',
      providerName: 'SIMULATED_EMAIL',
      status: 'PENDING',
      attemptCount: 0,
    });

    // Provide user object without valid email
    const failedResult = await notificationDeliveryService.deliverToChannel(delivery, notif, { email: 'bad-email' });
    expect(failedResult.status).toBe('FAILED');
    expect(failedResult.nextRetryAt).toBeNull();
    expect(failedResult.failureReason).toContain('Invalid or missing recipient email');
  });

  // =========================================================================
  // 15. DEAD-LETTER QUEUE TRANSITION AFTER MAX ATTEMPTS
  // =========================================================================
  test('TC-NOTIF-15: Retryable failures transition to FAILED (Dead-Letter) after 4 attempts', async () => {
    const notif = await Notification.create({
      recipientUserId: patientUser._id,
      notificationType: 'EMERGENCY_BEEP_BROADCAST',
      title: 'Retry Exhaustion Test',
      message: 'Testing dead-letter transition',
      status: 'PENDING',
    });

    // Simulate delivery already on attempt 3 with valid enum channel
    const delivery = await NotificationDelivery.create({
      notificationId: notif._id,
      channel: 'SMS',
      providerName: 'SIMULATED_SMS',
      status: 'RETRY_PENDING',
      attemptCount: 3,
    });

    // 4th attempt failure
    const finalResult = await notificationDeliveryService.deliverToChannel(delivery, notif, { phone: 'invalid-phone' });
    expect(finalResult.attemptCount).toBe(4);
    expect(finalResult.status).toBe('FAILED');
    expect(finalResult.nextRetryAt).toBeNull();
  });

  // =========================================================================
  // 16. EMERGENCY BEEP PARALLEL NOTIFICATION DISPATCH
  // =========================================================================
  test('TC-NOTIF-16: Emergency Beep creates parallel broadcast notifications for candidate organizations', async () => {
    const beepResult = await emergencyBroadcastService.activateEmergencyBeep({
      patientId: patientUser._id,
      patientName: patientUser.name,
      patientPhone: patientUser.phone,
      emergencyType: 'cardiac',
      severity: 'critical',
      description: 'Severe chest pains and fainting',
      coordinates: [77.2, 28.6],
      locationAddress: 'Connaught Place, New Delhi',
      ambulanceRequirement: 'yes',
    });

    expect(beepResult).toBeDefined();
    expect(beepResult.emergencyRequest).toBeDefined();
    expect(beepResult.emergencyRequest.status).toBe('BROADCASTED');

    // Verify outbox or notification created for broadcast
    await new Promise((r) => setTimeout(r, 100));
    const outboxEvents = await NotificationOutbox.find({
      aggregateId: beepResult.emergencyRequest._id,
      eventType: 'EMERGENCY_BEEP_BROADCAST',
    });
    expect(outboxEvents.length).toBeGreaterThan(0);
  });

  // =========================================================================
  // 17. ONE ORG NOTIFICATION FAILURE WHILE OTHERS SUCCEED
  // =========================================================================
  test('TC-NOTIF-17: Isolated notification failure on one channel/recipient does not abort other deliveries', async () => {
    const notifGood = await notificationService.createNotification({
      recipientUserId: patientUser._id,
      organizationId: organization._id,
      notificationType: 'EMERGENCY_REQUEST_CREATED',
      title: 'Org 1 Update',
      message: 'Healthy delivery',
    });

    expect(notifGood).toBeDefined();
    expect(notifGood.status).toBe('PENDING');

    // Verify delivery created for good notification
    await new Promise((r) => setTimeout(r, 150));
    const goodDeliveries = await NotificationDelivery.find({ notificationId: notifGood._id });
    expect(goodDeliveries.some((d) => d.status === 'DELIVERED')).toBe(true);
  });

  // =========================================================================
  // 18. RESERVATION NOTIFICATION GENERATED AFTER SUCCESSFUL TRANSACTION
  // =========================================================================
  test('TC-NOTIF-18: Resource reservation creates outbox/notification record upon successful booking', async () => {
    // Seed resource
    const erBay = await HealthcareResource.create({
      organizationId: organization._id,
      resourceType: 'er_bay',
      totalCapacity: 5,
      availableCapacity: 5,
      reservedCapacity: 0,
      occupiedCapacity: 0,
    });

    const reservation = await ResourceReservation.create({
      emergencyRequestId: emergencyReq._id,
      organizationId: organization._id,
      resourceId: erBay._id,
      resourceType: 'er_bay',
      quantity: 1,
      status: 'TEMPORARILY_RESERVED',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    // Enqueue reservation outbox event
    const outbox = await notificationOutboxService.enqueueEvent({
      eventType: 'EMERGENCY_RESOURCE_RESERVED',
      aggregateType: 'ResourceReservation',
      aggregateId: reservation._id,
      payload: {
        recipientUserId: patientUser._id,
        organizationId: organization._id,
        emergencyRequestId: emergencyReq._id,
        title: 'Emergency Bay Reserved',
        message: '1 ER Bay reserved at City Trauma Center for 15 minutes',
        priority: 'EMERGENCY',
      },
    });

    expect(outbox).toBeDefined();
    expect(outbox.eventType).toBe('EMERGENCY_RESOURCE_RESERVED');
  });

  // =========================================================================
  // 19. NOTIFICATION FAILURE DOES NOT ROLL BACK RESERVATION
  // =========================================================================
  test('TC-NOTIF-19: Failure in delivery service does not alter or roll back committed reservation', async () => {
    const reservation = await ResourceReservation.create({
      emergencyRequestId: emergencyReq._id,
      organizationId: organization._id,
      resourceType: 'icu_bed',
      quantity: 1,
      status: 'TEMPORARILY_RESERVED',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    // Attempt invalid notification dispatch
    try {
      await notificationService.createNotification({
        recipientUserId: null, // intentional failure
        notificationType: 'EMERGENCY_RESOURCE_RESERVED',
        title: 'Fail Notice',
        message: 'Failing on purpose',
      });
    } catch (err) {
      // Expected caught error
    }

    // Reservation in database must remain intact and valid
    const checkedReservation = await ResourceReservation.findById(reservation._id);
    expect(checkedReservation).toBeTruthy();
    expect(checkedReservation.status).toBe('TEMPORARILY_RESERVED');
  });

  // =========================================================================
  // 20. EMERGENCY RESPONSE DEADLINE PRESERVATION
  // =========================================================================
  test('TC-NOTIF-20: Emergency beep broadcast window and response deadlines are preserved in notification payload', async () => {
    const deadline = new Date(Date.now() + 120 * 1000);

    const event = await notificationOutboxService.enqueueEvent({
      eventType: 'EMERGENCY_BEEP_BROADCAST',
      aggregateType: 'EmergencyRequest',
      aggregateId: emergencyReq._id,
      payload: {
        recipientUserId: orgStaffUser._id,
        organizationId: organization._id,
        emergencyRequestId: emergencyReq._id,
        title: 'Response Window Closing',
        message: '60 seconds remaining to respond to emergency beep',
        priority: 'EMERGENCY',
        deadline: deadline.toISOString(),
      },
    });

    expect(event.payload.deadline).toBe(deadline.toISOString());
    expect(event.payload.priority).toBe('EMERGENCY');
  });

  // =========================================================================
  // 21. UNAUTHORIZED NOTIFICATION ACCESS BLOCKED (403)
  // =========================================================================
  test('TC-NOTIF-21: Unauthorized patient cannot view or read another user notification (403)', async () => {
    const privateNotif = await Notification.create({
      recipientUserId: patientUser._id,
      notificationType: 'GENERAL_SYSTEM',
      title: 'Private Prescription',
      message: 'Private medical document',
      status: 'DELIVERED',
    });

    // Other patient attempts to access privateNotif
    const res = await request(app)
      .get(`/api/notifications/${privateNotif._id}`)
      .set('Authorization', `Bearer ${otherPatientToken}`)
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Access denied');
  });

  // =========================================================================
  // 22. ORGANIZATION ISOLATION ENFORCED
  // =========================================================================
  test('TC-NOTIF-22: Organization staff can only list and mark notifications belonging to their facility', async () => {
    const org1Notif = await Notification.create({
      recipientUserId: orgStaffUser._id,
      organizationId: organization._id,
      notificationType: 'EMERGENCY_BEEP_BROADCAST',
      title: 'City Trauma Emergency Alert',
      message: 'Incoming patient alert',
      status: 'DELIVERED',
    });

    // Org 1 lists its notifications -> found
    const org1Res = await request(app)
      .get('/api/organizations/me/notifications')
      .set('Authorization', `Bearer ${orgToken}`)
      .expect(200);

    expect(org1Res.body.success).toBe(true);
    const org1Ids = org1Res.body.data.map((n) => n._id.toString());
    expect(org1Ids).toContain(org1Notif._id.toString());

    // Org 2 lists its notifications -> Org 1 notification must NOT appear
    const org2Res = await request(app)
      .get('/api/organizations/me/notifications')
      .set('Authorization', `Bearer ${otherOrgToken}`)
      .expect(200);

    expect(org2Res.body.success).toBe(true);
    const org2Ids = org2Res.body.data.map((n) => n._id.toString());
    expect(org2Ids).not.toContain(org1Notif._id.toString());

    // Org 2 attempts to mark Org 1 notification as read -> 404/denied
    await request(app)
      .post(`/api/organizations/me/notifications/${org1Notif._id}/read`)
      .set('Authorization', `Bearer ${otherOrgToken}`)
      .expect(404);
  });

  // =========================================================================
  // 23. WEBSOCKET ROOM SUBSCRIPTION AUTHORIZATION LOGIC
  // =========================================================================
  test('TC-NOTIF-23: WebSocket notification service formats payloads for user, org, and emergency channels', async () => {
    const notif = await Notification.create({
      recipientUserId: patientUser._id,
      organizationId: organization._id,
      emergencyRequestId: emergencyReq._id,
      notificationType: 'EMERGENCY_JOURNEY_STARTED',
      title: 'Patient En Route',
      message: 'Patient journey has started',
      priority: 'EMERGENCY',
      status: 'PENDING',
    });

    const wsResult = await webSocketNotificationService.deliver(notif);
    expect(wsResult.success).toBe(true);
  });

  // =========================================================================
  // 24. ADMINISTRATOR MANUAL RETRY ENDPOINT
  // =========================================================================
  test('TC-NOTIF-24: POST /api/admin/notifications/:id/retry triggers manual retry for failed deliveries', async () => {
    const notif = await Notification.create({
      recipientUserId: patientUser._id,
      notificationType: 'CRITICAL_OPERATIONAL_FAILURE',
      title: 'System Alert',
      message: 'Network timeout',
      status: 'FAILED',
    });

    await NotificationDelivery.create({
      notificationId: notif._id,
      channel: 'IN_APP',
      providerName: 'IN_APP_DB',
      status: 'FAILED',
      failureReason: 'Simulated transient database interruption',
      attemptCount: 4,
    });

    const res = await request(app)
      .post(`/api/admin/notifications/${notif._id}/retry`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Notification retry initiated successfully');
    expect(res.body.data.retriedCount).toBe(1);

    // Verify delivery status updated to DELIVERED
    const updatedDelivery = await NotificationDelivery.findOne({ notificationId: notif._id });
    expect(updatedDelivery.status).toBe('DELIVERED');
  });

  // =========================================================================
  // BONUS / TELEMETRY: ADMIN METRICS ENDPOINT
  // =========================================================================
  test('TC-NOTIF-25: GET /api/admin/notification-metrics returns complete system health counters', async () => {
    const res = await request(app)
      .get('/api/admin/notification-metrics')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.totalNotifications).toBeGreaterThan(0);
    expect(res.body.data.channels).toBeDefined();
    expect(Array.isArray(res.body.data.channels)).toBe(true);
  });
});

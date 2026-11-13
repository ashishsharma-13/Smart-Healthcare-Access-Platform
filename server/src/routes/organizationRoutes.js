import express from 'express';
import { organizationController } from '../controllers/OrganizationController.js';
import { doctorAffiliationController } from '../controllers/DoctorAffiliationController.js';
import { doctorScheduleController } from '../controllers/DoctorScheduleController.js';
import { doctorPresenceController } from '../controllers/DoctorPresenceController.js';
import { appointmentController } from '../controllers/AppointmentController.js';
import { emergencyMatchingController } from '../controllers/EmergencyMatchingController.js';
import { emergencyBeepController } from '../controllers/EmergencyBeepController.js';
import { destinationReservationController } from '../controllers/DestinationReservationController.js';
import { emergencyJourneyController } from '../controllers/EmergencyJourneyController.js';
import { notificationController } from '../controllers/NotificationController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public registration & discovery
router.post('/register', (req, res, next) => organizationController.registerOrganization(req, res, next));
router.get('/', (req, res, next) => organizationController.searchOrganizations(req, res, next));
router.get('/search', (req, res, next) => organizationController.searchOrganizations(req, res, next));

// Authenticated organization portal endpoints (Module 3 & Module 4 standards)
router.get('/me', authenticate, authorize('organization'), (req, res, next) => organizationController.getMyOrganizationProfile(req, res, next));
router.put('/me', authenticate, authorize('organization'), (req, res, next) => organizationController.updateMyOrganization(req, res, next));
router.get('/me/dashboard', authenticate, authorize('organization'), (req, res, next) => organizationController.getMyDashboard(req, res, next));
router.get('/me/verification', authenticate, authorize('organization'), (req, res, next) => organizationController.getMyVerificationStatus(req, res, next));
router.get('/me/facilities', authenticate, authorize('organization'), (req, res, next) => organizationController.getMyFacilities(req, res, next));
router.post('/me/facilities', authenticate, authorize('organization'), (req, res, next) => organizationController.addFacility(req, res, next));
router.post('/me/documents', authenticate, authorize('organization'), (req, res, next) => organizationController.uploadDocument(req, res, next));
router.post('/me/resubmit', authenticate, authorize('organization'), (req, res, next) => organizationController.resubmitApplication(req, res, next));
router.post('/me/holidays', authenticate, authorize('organization'), (req, res, next) => doctorScheduleController.declareHoliday(req, res, next));

// Organization Appointments Module endpoints (Module 6 standards)
router.get('/me/appointments', authenticate, authorize('organization', 'hospital'), (req, res, next) => appointmentController.getOrganizationAppointments(req, res, next));
router.get('/me/appointments/summary', authenticate, authorize('organization', 'hospital'), (req, res, next) => appointmentController.getOrganizationAppointmentSummary(req, res, next));
router.get('/me/appointments/:id', authenticate, authorize('organization', 'hospital'), (req, res, next) => appointmentController.getAppointmentById(req, res, next));

// Module 4 exact REST endpoints for Organization Doctor Affiliations
router.get('/me/doctors/search', authenticate, authorize('organization'), (req, res, next) => doctorAffiliationController.searchDoctorsForOrg(req, res, next));
router.post('/me/affiliation-requests', authenticate, authorize('organization'), (req, res, next) => doctorAffiliationController.createAffiliationRequest(req, res, next));
router.get('/me/affiliation-requests', authenticate, authorize('organization'), (req, res, next) => doctorAffiliationController.getOrgAffiliationRequests(req, res, next));
router.get('/me/affiliations', authenticate, authorize('organization'), (req, res, next) => doctorAffiliationController.getOrganizationAffiliations(req, res, next));
router.post('/me/affiliations/:id/terminate', authenticate, authorize('organization'), (req, res, next) => doctorAffiliationController.terminateAffiliationDirectly(req, res, next));
router.get('/me/doctors', authenticate, authorize('organization'), (req, res, next) => doctorAffiliationController.getOrganizationAffiliations(req, res, next));

// Authenticated organization portal legacy endpoints (must be before /:id)
router.get('/portal/me', authenticate, authorize('organization'), (req, res, next) => organizationController.getMyOrganizationProfile(req, res, next));
router.put('/portal/address', authenticate, authorize('organization'), (req, res, next) => organizationController.updateOrganizationAddress(req, res, next));
router.get('/portal/qr-code', authenticate, authorize('organization'), (req, res, next) => organizationController.getQrCheckinCode(req, res, next));
router.put('/portal/resources', authenticate, authorize('organization'), (req, res, next) => organizationController.updateResources(req, res, next));
router.get('/portal/broadcasts', authenticate, authorize('organization'), (req, res, next) => organizationController.getIncomingEmergencyBroadcasts(req, res, next));
router.get('/portal/doctors', authenticate, authorize('organization'), (req, res, next) => doctorAffiliationController.getOrganizationAffiliations(req, res, next));

// Organization Doctor Affiliation Module endpoints
router.get('/affiliations', authenticate, authorize('organization'), (req, res, next) => doctorAffiliationController.getOrganizationAffiliations(req, res, next));
router.get('/affiliations/pending', authenticate, authorize('organization'), (req, res, next) => doctorAffiliationController.getPendingAffiliationsForOrg(req, res, next));
router.get('/doctors/search', authenticate, authorize('organization'), (req, res, next) => doctorAffiliationController.searchDoctorsForOrg(req, res, next));
router.get('/doctors', authenticate, authorize('organization'), (req, res, next) => doctorAffiliationController.getOrganizationAffiliations(req, res, next));
router.post('/affiliations/invite', authenticate, authorize('organization'), (req, res, next) => doctorAffiliationController.inviteDoctor(req, res, next));
router.post('/affiliations/:id/approve', authenticate, authorize('organization'), (req, res, next) => doctorAffiliationController.approveAffiliation(req, res, next));
router.post('/affiliations/:id/reject', authenticate, authorize('organization'), (req, res, next) => doctorAffiliationController.rejectAffiliation(req, res, next));
router.post('/affiliations/:id/terminate', authenticate, authorize('organization'), (req, res, next) => doctorAffiliationController.requestTerminationByOrg(req, res, next));

// Presence QR Management & Live On-Site Doctor Monitoring (Module 7 standards)
router.post('/me/presence-qr', authenticate, authorize('organization'), (req, res, next) => doctorPresenceController.generateOrgQRCode(req, res, next));
router.get('/me/presence-qr', authenticate, authorize('organization'), (req, res, next) => doctorPresenceController.listOrgQRCodes(req, res, next));
router.post('/me/presence-qr/:id/revoke', authenticate, authorize('organization'), (req, res, next) => doctorPresenceController.revokeOrgQRCode(req, res, next));
router.get('/me/doctors/presence', authenticate, authorize('organization'), (req, res, next) => doctorPresenceController.getOrgLiveDoctors(req, res, next));
router.get('/me/doctors/presence/history', authenticate, authorize('organization'), (req, res, next) => doctorPresenceController.getOrgPresenceHistory(req, res, next));

// Module 9: Organization Emergency Capabilities
router.get('/me/emergency-capabilities', authenticate, authorize('organization'), (req, res, next) => emergencyMatchingController.getOrgCapabilities(req, res, next));
router.put('/me/emergency-capabilities', authenticate, authorize('organization'), (req, res, next) => emergencyMatchingController.updateOrgCapabilities(req, res, next));

// Module 10: Organization Emergency Beep Handling
router.get('/me/emergency-beeps', authenticate, authorize('organization'), (req, res, next) => emergencyBeepController.getOrgIncoming(req, res, next));
router.get('/me/emergency-beeps/history', authenticate, authorize('organization'), (req, res, next) => emergencyBeepController.getOrgHistory(req, res, next));
router.get('/me/emergency-beeps/:recipientId', authenticate, authorize('organization'), (req, res, next) => emergencyBeepController.getOrgBeepDetail(req, res, next));
router.post('/me/emergency-beeps/:recipientId/accept', authenticate, authorize('organization'), (req, res, next) => emergencyBeepController.acceptBeep(req, res, next));
router.post('/me/emergency-beeps/:recipientId/decline', authenticate, authorize('organization'), (req, res, next) => emergencyBeepController.declineBeep(req, res, next));

// Module 11: Destination Confirmations & Resource Reservation Desk
router.get('/me/destination-confirmations', authenticate, authorize('organization'), (req, res, next) => destinationReservationController.getOrgDestinationConfirmations(req, res, next));
router.get('/me/destination-confirmations/:selectionId', authenticate, authorize('organization'), (req, res, next) => destinationReservationController.getOrgDestinationConfirmationDetails(req, res, next));
router.post('/me/destination-confirmations/:selectionId/confirm', authenticate, authorize('organization'), (req, res, next) => destinationReservationController.confirmDestination(req, res, next));
router.post('/me/destination-confirmations/:selectionId/decline', authenticate, authorize('organization'), (req, res, next) => destinationReservationController.declineDestination(req, res, next));

router.get('/me/reservations', authenticate, authorize('organization'), (req, res, next) => destinationReservationController.getOrgReservations(req, res, next));
router.get('/me/reservations/:reservationId', authenticate, authorize('organization'), (req, res, next) => destinationReservationController.getOrgReservationDetails(req, res, next));
router.post('/me/reservations/:reservationId/mark-arrived', authenticate, authorize('organization'), (req, res, next) => destinationReservationController.markPatientArrived(req, res, next));
router.post('/me/reservations/:reservationId/allocate', authenticate, authorize('organization'), (req, res, next) => emergencyJourneyController.allocateResource(req, res, next));
router.get('/me/reservations/:reservationId/allocations', authenticate, authorize('organization'), (req, res, next) => emergencyJourneyController.getAllocations(req, res, next));

// Module 12: Incoming En-Route Patients & Arrival Verification
router.get('/me/incoming-patients', authenticate, authorize('organization'), (req, res, next) => emergencyJourneyController.getIncomingPatients(req, res, next));
router.get('/me/incoming-patients/:requestId', authenticate, authorize('organization'), (req, res, next) => emergencyJourneyController.getIncomingPatientDetails(req, res, next));
router.post('/me/emergency-requests/:requestId/verify-arrival', authenticate, authorize('organization'), (req, res, next) => emergencyJourneyController.verifyStaffArrival(req, res, next));
router.post('/me/emergency-requests/:requestId/complete', authenticate, authorize('organization'), (req, res, next) => emergencyJourneyController.completeEmergency(req, res, next));

// Module 13: Organization Notifications
router.get('/me/notifications', authenticate, authorize('organization'), (req, res, next) => notificationController.getOrganizationNotifications(req, res, next));
router.get('/me/notifications/unread', authenticate, authorize('organization'), (req, res, next) => notificationController.getOrganizationUnreadNotifications(req, res, next));
router.post('/me/notifications/:id/read', authenticate, authorize('organization'), (req, res, next) => notificationController.markOrganizationNotificationAsRead(req, res, next));

router.post('/presence-qr', authenticate, authorize('organization'), (req, res, next) => doctorPresenceController.generateOrgQRCode(req, res, next));
router.get('/presence-qr', authenticate, authorize('organization'), (req, res, next) => doctorPresenceController.listOrgQRCodes(req, res, next));
router.post('/presence-qr/:id/revoke', authenticate, authorize('organization'), (req, res, next) => doctorPresenceController.revokeOrgQRCode(req, res, next));
router.get('/doctors/presence', authenticate, authorize('organization'), (req, res, next) => doctorPresenceController.getOrgLiveDoctors(req, res, next));
router.get('/doctors/presence/history', authenticate, authorize('organization'), (req, res, next) => doctorPresenceController.getOrgPresenceHistory(req, res, next));

// Public parameterized routes
router.get('/:id/doctors', (req, res, next) => doctorAffiliationController.getAffiliatedDoctorsForOrg(req, res, next));
router.get('/:id', (req, res, next) => organizationController.getOrganizationById(req, res, next));

export default router;

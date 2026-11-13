import express from 'express';
import { adminController } from '../controllers/AdminController.js';
import { doctorAffiliationController } from '../controllers/DoctorAffiliationController.js';
import { appointmentController } from '../controllers/AppointmentController.js';
import { doctorPresenceController } from '../controllers/DoctorPresenceController.js';
import { emergencyController } from '../controllers/EmergencyController.js';
import { emergencyMatchingController } from '../controllers/EmergencyMatchingController.js';
import { notificationController } from '../controllers/NotificationController.js';
import { healthcareResourceTypeController } from '../controllers/HealthcareResourceTypeController.js';
import { healthcareResourceController } from '../controllers/HealthcareResourceController.js';
import { emergencyFallbackController } from '../controllers/EmergencyFallbackController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate, authorize('admin'));

// ==========================================
// Module 16: Dashboard Summary, Activity & System Health
// ==========================================
router.get('/stats', (req, res, next) => adminController.getDashboardStats(req, res, next));
router.get('/dashboard/summary', (req, res, next) => adminController.getDashboardSummary(req, res, next));
router.get('/dashboard/activity', (req, res, next) => adminController.getDashboardActivity(req, res, next));
router.get('/dashboard/system-health', (req, res, next) => adminController.getSystemHealth(req, res, next));

// ==========================================
// Module 2: Doctor Verification Management
// ==========================================
router.get('/doctors/pending', (req, res, next) => adminController.getPendingDoctors(req, res, next));
router.get('/doctors/verified', (req, res, next) => adminController.getVerifiedDoctors(req, res, next));
router.get('/doctors/rejected', (req, res, next) => adminController.getRejectedDoctors(req, res, next));
router.get('/doctors/:id', (req, res, next) => adminController.getDoctorApplication(req, res, next));
router.post('/doctors/:id/approve', (req, res, next) => adminController.approveDoctor(req, res, next));
router.post('/doctors/:id/reject', (req, res, next) => adminController.rejectDoctor(req, res, next));
router.post('/doctors/:id/credentials/reissue', (req, res, next) => adminController.reissueDoctorCredential(req, res, next));

// ==========================================
// Module 3: Organization Verification Management
// ==========================================
router.get('/organizations/pending', (req, res, next) => adminController.getPendingOrganizations(req, res, next));
router.get('/organizations/verified', (req, res, next) => adminController.getVerifiedOrganizations(req, res, next));
router.get('/organizations/rejected', (req, res, next) => adminController.getRejectedOrganizations(req, res, next));
router.get('/organizations/:id', (req, res, next) => adminController.getOrganizationDetails(req, res, next));
router.post('/organizations/:id/approve', (req, res, next) => adminController.approveOrganization(req, res, next));
router.post('/organizations/:id/reject', (req, res, next) => adminController.rejectOrganization(req, res, next));

// ==========================================
// Module 16: User Management
// ==========================================
router.get('/users', (req, res, next) => adminController.getUsers(req, res, next));
router.get('/users/:id', (req, res, next) => adminController.getUserById(req, res, next));
router.patch('/users/:id/status', (req, res, next) => adminController.updateUserStatus(req, res, next));

// ==========================================
// Module 16: Platform Configuration & Specializations
// ==========================================
router.get('/configurations', (req, res, next) => adminController.getConfigurations(req, res, next));
router.get('/configurations/:key', (req, res, next) => adminController.getConfigurationByKey(req, res, next));
router.put('/configurations/:key', (req, res, next) => adminController.updateConfiguration(req, res, next));
router.get('/configurations/:key/history', (req, res, next) => adminController.getConfigurationHistory(req, res, next));

router.get('/specializations', (req, res, next) => adminController.getSpecializations(req, res, next));
router.post('/specializations', (req, res, next) => adminController.createSpecialization(req, res, next));
router.put('/specializations/:id', (req, res, next) => adminController.updateSpecialization(req, res, next));
router.patch('/specializations/:id/status', (req, res, next) => adminController.toggleSpecializationStatus(req, res, next));

// ==========================================
// Module 16: Emergency Operations Monitoring (Read-Only)
// ==========================================
router.get('/emergency/requests', (req, res, next) => adminController.getEmergencyRequests(req, res, next));
router.get('/emergency/requests/:id', (req, res, next) => adminController.getEmergencyDetails(req, res, next));
router.get('/emergency/requests/:id/timeline', (req, res, next) => adminController.getEmergencyTimeline(req, res, next));
router.get('/emergency/requests/:id/broadcasts', (req, res, next) => adminController.getEmergencyBroadcasts(req, res, next));
router.get('/emergency/requests/:id/responses', (req, res, next) => adminController.getEmergencyResponses(req, res, next));
router.get('/emergency/requests/:id/reservation', (req, res, next) => adminController.getEmergencyReservation(req, res, next));
router.get('/emergency/requests/:id/journey', (req, res, next) => adminController.getEmergencyJourney(req, res, next));

// ==========================================
// Module 16 & 14: Healthcare Resource Monitoring
// ==========================================
router.get('/resources', (req, res, next) => adminController.getResources(req, res, next));
router.get('/resources/summary', (req, res, next) => adminController.getResourceSummary(req, res, next));
router.get('/resources/monitoring', (req, res, next) => healthcareResourceController.getMonitoringTelemetry(req, res, next));
router.get('/resources/:id/history', (req, res, next) => adminController.getResourceHistory(req, res, next));

router.get('/resource-types', (req, res, next) => healthcareResourceTypeController.listAll(req, res, next));
router.post('/resource-types', (req, res, next) => healthcareResourceTypeController.create(req, res, next));
router.get('/resource-types/:id', (req, res, next) => healthcareResourceTypeController.getById(req, res, next));
router.put('/resource-types/:id', (req, res, next) => healthcareResourceTypeController.update(req, res, next));
router.patch('/resource-types/:id/status', (req, res, next) => healthcareResourceTypeController.toggleStatus(req, res, next));

// ==========================================
// Module 16: Reports & Analytics
// ==========================================
router.post('/reports/generate', (req, res, next) => adminController.generateReport(req, res, next));
router.get('/reports/export/:type', (req, res, next) => adminController.exportReport(req, res, next));

// ==========================================
// Module 16: Audit Logs (Immutable)
// ==========================================
router.get('/audit-logs', (req, res, next) => adminController.getAuditLogs(req, res, next));
router.get('/audit-logs/:id', (req, res, next) => adminController.getAuditLogById(req, res, next));

// ==========================================
// Module 4: Admin overview of doctor affiliations
// ==========================================
router.get('/affiliations', (req, res, next) => doctorAffiliationController.getAdminAffiliations(req, res, next));

// ==========================================
// Module 6: Admin overview of appointments and reporting
// ==========================================
router.get('/appointments/reports', (req, res, next) => appointmentController.getAdminAppointmentReports(req, res, next));
router.get('/appointments', (req, res, next) => appointmentController.getAdminAppointments(req, res, next));
router.get('/appointments/:id', (req, res, next) => appointmentController.getAppointmentById(req, res, next));

// ==========================================
// Module 7: Admin Doctor Presence Monitoring & Auditable Correction
// ==========================================
router.get('/presence', (req, res, next) => doctorPresenceController.getAdminPresenceLogs(req, res, next));
router.post('/presence/:id/correct', (req, res, next) => doctorPresenceController.correctPresenceLog(req, res, next));

// ==========================================
// Module 8: Admin Emergency Categories & Guidance Management
// ==========================================
router.get('/emergency/categories', (req, res, next) => emergencyController.adminGetCategories(req, res, next));
router.post('/emergency/categories', (req, res, next) => emergencyController.adminCreateCategory(req, res, next));
router.put('/emergency/categories/:id', (req, res, next) => emergencyController.adminUpdateCategory(req, res, next));
router.get('/emergency/guidance', (req, res, next) => emergencyController.adminGetGuidance(req, res, next));
router.post('/emergency/guidance', (req, res, next) => emergencyController.adminCreateGuidance(req, res, next));
router.put('/emergency/guidance/:id', (req, res, next) => emergencyController.adminUpdateGuidance(req, res, next));
router.post('/emergency/guidance/:id/approve', (req, res, next) => emergencyController.adminApproveGuidance(req, res, next));

// ==========================================
// Module 9: Admin Emergency Capabilities & Matching Configuration
// ==========================================
router.get('/emergency/capabilities', (req, res, next) => emergencyMatchingController.listCapabilities(req, res, next));
router.post('/emergency/capabilities', (req, res, next) => emergencyMatchingController.createCapability(req, res, next));
router.put('/emergency/capabilities/:id', (req, res, next) => emergencyMatchingController.updateCapability(req, res, next));
router.post('/emergency/category-mappings', (req, res, next) => emergencyMatchingController.createCategoryMapping(req, res, next));
router.get('/emergency/matching/configuration', (req, res, next) => emergencyMatchingController.getConfiguration(req, res, next));
router.put('/emergency/matching/configuration', (req, res, next) => emergencyMatchingController.updateConfiguration(req, res, next));
router.get('/emergency/matching/audit', (req, res, next) => emergencyMatchingController.getAuditResults(req, res, next));

// ==========================================
// Module 13: Admin Notification Monitoring, Dead-letter & Manual Retry
// ==========================================
router.get('/notifications', (req, res, next) => notificationController.getAdminNotifications(req, res, next));
router.get('/notifications/failed', (req, res, next) => notificationController.getFailedDeliveries(req, res, next));
router.get('/notifications/:id/deliveries', (req, res, next) => notificationController.getNotificationDeliveries(req, res, next));
router.post('/notifications/:id/retry', (req, res, next) => notificationController.retryNotification(req, res, next));
router.get('/notification-metrics', (req, res, next) => notificationController.getNotificationMetrics(req, res, next));

// ==========================================
// Module 15: Admin Emergency Fallback Monitoring & External Facilities Directory
// ==========================================
router.get('/emergency-fallback/sessions', (req, res, next) => emergencyFallbackController.listActiveSessions(req, res, next));
router.get('/emergency-fallback/monitoring', (req, res, next) => emergencyFallbackController.getMonitoringKPIs(req, res, next));
router.get('/external-facilities', (req, res, next) => emergencyFallbackController.listExternalFacilities(req, res, next));
router.post('/external-facilities', (req, res, next) => emergencyFallbackController.createExternalFacility(req, res, next));
router.put('/external-facilities/:id', (req, res, next) => emergencyFallbackController.updateExternalFacility(req, res, next));

export default router;

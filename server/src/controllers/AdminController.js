import { doctorRepository } from '../repositories/DoctorRepository.js';
import { doctorService } from '../services/DoctorService.js';
import { organizationRepository } from '../repositories/OrganizationRepository.js';
import { organizationService } from '../services/OrganizationService.js';
import { notificationService } from '../services/NotificationService.js';
import { adminAuditService } from '../services/AdminAuditService.js';
import { platformConfigurationService } from '../services/PlatformConfigurationService.js';
import { adminGovernanceService } from '../services/AdminGovernanceService.js';
import { User, Doctor, Organization, EmergencyRequest, Appointment } from '../models/index.js';

export class AdminController {
  // ==========================================
  // DASHBOARD & TELEMETRY
  // ==========================================

  async getDashboardStats(req, res, next) {
    try {
      const [
        totalUsers,
        totalDoctors,
        verifiedDoctors,
        pendingDoctors,
        totalOrgs,
        verifiedOrgs,
        pendingOrgs,
        activeEmergencies,
        totalAppointments,
      ] = await Promise.all([
        User.countDocuments(),
        Doctor.countDocuments(),
        Doctor.countDocuments({ verificationStatus: 'verified' }),
        Doctor.countDocuments({ verificationStatus: 'pending' }),
        Organization.countDocuments(),
        Organization.countDocuments({ verificationStatus: 'verified' }),
        Organization.countDocuments({ verificationStatus: 'pending' }),
        EmergencyRequest.countDocuments({
          status: { $in: ['CREATED', 'BROADCASTED', 'RESPONSES_RECEIVED', 'DESTINATION_SELECTED', 'RESOURCES_RESERVED', 'PATIENT_EN_ROUTE'] },
        }),
        Appointment.countDocuments(),
      ]);

      res.json({
        success: true,
        data: {
          totalUsers,
          doctors: {
            total: totalDoctors,
            verified: verifiedDoctors,
            pending: pendingDoctors,
          },
          organizations: {
            total: totalOrgs,
            verified: verifiedOrgs,
            pending: pendingOrgs,
          },
          activeEmergencies,
          totalAppointments,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async getDashboardSummary(req, res, next) {
    try {
      const summary = await adminGovernanceService.getDashboardSummary();
      res.json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }

  async getDashboardActivity(req, res, next) {
    try {
      const activity = await adminGovernanceService.getDashboardActivity(req.query.limit);
      res.json({ success: true, count: activity.length, data: activity });
    } catch (err) {
      next(err);
    }
  }

  async getSystemHealth(req, res, next) {
    try {
      const health = await adminGovernanceService.getSystemHealth();
      res.json({ success: true, data: health });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // DOCTOR VERIFICATION (MODULE 2 EXTENSION)
  // ==========================================

  async getPendingDoctors(req, res, next) {
    try {
      const pending = await doctorRepository.listPendingVerifications();
      res.json({ success: true, count: pending.length, data: pending });
    } catch (err) {
      next(err);
    }
  }

  async getVerifiedDoctors(req, res, next) {
    try {
      const verified = await doctorRepository.listVerifiedDoctors();
      res.json({ success: true, count: verified.length, data: verified });
    } catch (err) {
      next(err);
    }
  }

  async getRejectedDoctors(req, res, next) {
    try {
      const rejected = await doctorRepository.listRejectedDoctors();
      res.json({ success: true, count: rejected.length, data: rejected });
    } catch (err) {
      next(err);
    }
  }

  async getDoctorApplication(req, res, next) {
    try {
      const doctor = await doctorRepository.findById(req.params.id);
      if (!doctor) {
        return res.status(404).json({ success: false, message: 'Doctor record not found.' });
      }
      const verificationStatus = await doctorService.getDoctorVerificationStatus(doctor._id);
      let qrCredential = null;
      if (String(doctor.verificationStatus || '').toLowerCase() === 'verified') {
        try {
          qrCredential = await doctorService.getQrCredential(doctor._id);
        } catch (e) {
          // fallback if pending generation
        }
      }
      res.json({
        success: true,
        data: {
          doctor,
          verification: verificationStatus,
          qrCredential,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async approveDoctor(req, res, next) {
    try {
      const updated = await doctorService.approveDoctor(req.params.id, req.user._id);

      // Record audit event
      await adminAuditService.recordAction({
        adminUserId: req.user._id,
        adminEmail: req.user.email,
        action: 'DOCTOR_APPROVAL',
        targetEntityType: 'Doctor',
        targetEntityId: String(req.params.id),
        reason: req.body.reason || 'Medical credentials and practitioner license successfully verified',
        previousValue: { verificationStatus: 'pending' },
        newValue: { verificationStatus: 'verified' },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }).catch((e) => console.warn('[Audit Warning]', e.message));

      if (updated?.userId) {
        notificationService.createNotification({
          recipientUserId: updated.userId,
          notificationType: 'DOCTOR_VERIFICATION',
          title: 'Doctor Medical License Verified',
          message: 'Your practitioner profile and license have been verified and approved.',
          priority: 'NORMAL',
          actionUrl: '/doctor/dashboard',
        }).catch((e) => console.warn('[Notification Warning]', e.message));
      }
      res.json({ success: true, message: 'Doctor successfully approved and verified', data: updated });
    } catch (err) {
      if (err.message && err.message.includes('already been verified')) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async rejectDoctor(req, res, next) {
    try {
      const { reason } = req.body;
      if (!reason || !String(reason).trim()) {
        return res.status(400).json({
          success: false,
          message: 'A mandatory rejection reason is required to reject a doctor application.',
        });
      }
      const updated = await doctorService.rejectDoctor(req.params.id, reason, req.user._id);

      // Record audit event
      await adminAuditService.recordAction({
        adminUserId: req.user._id,
        adminEmail: req.user.email,
        action: 'DOCTOR_REJECTION',
        targetEntityType: 'Doctor',
        targetEntityId: String(req.params.id),
        reason: String(reason).trim(),
        previousValue: { verificationStatus: 'pending' },
        newValue: { verificationStatus: 'rejected', rejectionReason: reason },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }).catch((e) => console.warn('[Audit Warning]', e.message));

      if (updated?.userId) {
        notificationService.createNotification({
          recipientUserId: updated.userId,
          notificationType: 'DOCTOR_VERIFICATION',
          title: 'Doctor Application Rejected',
          message: `Your verification application was not approved: ${reason}`,
          priority: 'HIGH',
          actionUrl: '/doctor/profile',
        }).catch((e) => console.warn('[Notification Warning]', e.message));
      }
      res.json({ success: true, message: 'Doctor verification rejected', data: updated });
    } catch (err) {
      next(err);
    }
  }

  async reissueDoctorCredential(req, res, next) {
    try {
      const { reason } = req.body;
      const result = await doctorService.reissueQrCredential(req.params.id, reason, req.user._id);

      await adminAuditService.recordAction({
        adminUserId: req.user._id,
        adminEmail: req.user.email,
        action: 'DOCTOR_CREDENTIAL_REISSUE',
        targetEntityType: 'Doctor',
        targetEntityId: String(req.params.id),
        reason: reason || 'Administrative periodic rotation',
        previousValue: null,
        newValue: { reissued: true },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }).catch((e) => console.warn('[Audit Warning]', e.message));

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // ORGANIZATION VERIFICATION (MODULE 3 EXTENSION)
  // ==========================================

  async getPendingOrganizations(req, res, next) {
    try {
      const pending = await organizationRepository.listPendingVerifications();
      res.json({ success: true, count: pending.length, data: pending });
    } catch (err) {
      next(err);
    }
  }

  async getVerifiedOrganizations(req, res, next) {
    try {
      const verified = await organizationRepository.listVerifiedOrganizations();
      res.json({ success: true, count: verified.length, data: verified });
    } catch (err) {
      next(err);
    }
  }

  async getRejectedOrganizations(req, res, next) {
    try {
      const rejected = await organizationRepository.listRejectedOrganizations();
      res.json({ success: true, count: rejected.length, data: rejected });
    } catch (err) {
      next(err);
    }
  }

  async getOrganizationDetails(req, res, next) {
    try {
      const org = await organizationRepository.findById(req.params.id);
      if (!org) {
        return res.status(404).json({ success: false, message: 'Organization record not found.' });
      }
      const verificationStatus = await organizationService.getOrganizationVerificationStatus(org._id);
      res.json({
        success: true,
        data: {
          organization: org,
          verification: verificationStatus,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async approveOrganization(req, res, next) {
    try {
      const updated = await organizationService.approveOrganization(req.params.id, req.user._id);

      // Record audit event
      await adminAuditService.recordAction({
        adminUserId: req.user._id,
        adminEmail: req.user.email,
        action: 'ORGANIZATION_APPROVAL',
        targetEntityType: 'Organization',
        targetEntityId: String(req.params.id),
        reason: req.body.reason || 'Hospital establishment license and facilities verified',
        previousValue: { verificationStatus: 'pending' },
        newValue: { verificationStatus: 'verified' },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }).catch((e) => console.warn('[Audit Warning]', e.message));

      if (updated?.userId) {
        notificationService.createNotification({
          recipientUserId: updated.userId,
          organizationId: updated._id,
          notificationType: 'ORGANIZATION_VERIFICATION',
          title: 'Organization Accreditation Approved',
          message: 'Your healthcare facility accreditation has been verified and activated.',
          priority: 'NORMAL',
          actionUrl: '/organization/dashboard',
        }).catch((e) => console.warn('[Notification Warning]', e.message));
      }
      res.json({ success: true, message: 'Organization successfully approved and accredited', data: updated });
    } catch (err) {
      if (err.message && err.message.includes('already been verified')) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async rejectOrganization(req, res, next) {
    try {
      const { reason } = req.body;
      if (!reason || !String(reason).trim()) {
        return res.status(400).json({
          success: false,
          message: 'A mandatory rejection reason is required to reject an organization application.',
        });
      }
      const updated = await organizationService.rejectOrganization(req.params.id, reason, req.user._id);

      // Record audit event
      await adminAuditService.recordAction({
        adminUserId: req.user._id,
        adminEmail: req.user.email,
        action: 'ORGANIZATION_REJECTION',
        targetEntityType: 'Organization',
        targetEntityId: String(req.params.id),
        reason: String(reason).trim(),
        previousValue: { verificationStatus: 'pending' },
        newValue: { verificationStatus: 'rejected', rejectionReason: reason },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }).catch((e) => console.warn('[Audit Warning]', e.message));

      if (updated?.userId) {
        notificationService.createNotification({
          recipientUserId: updated.userId,
          organizationId: updated._id,
          notificationType: 'ORGANIZATION_VERIFICATION',
          title: 'Organization Application Rejected',
          message: `Your accreditation application was not approved: ${reason}`,
          priority: 'HIGH',
          actionUrl: '/organization/profile',
        }).catch((e) => console.warn('[Notification Warning]', e.message));
      }
      res.json({ success: true, message: 'Organization verification rejected', data: updated });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // USER GOVERNANCE
  // ==========================================

  async getUsers(req, res, next) {
    try {
      const result = await adminGovernanceService.listUsers(req.query);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async getUserById(req, res, next) {
    try {
      const userDetails = await adminGovernanceService.getUserDetails(req.params.id);
      res.json({ success: true, data: userDetails });
    } catch (err) {
      next(err);
    }
  }

  async updateUserStatus(req, res, next) {
    try {
      const { status, reason } = req.body;
      const updatedUser = await adminGovernanceService.updateUserStatus(
        req.params.id,
        status,
        reason,
        req.user,
        req.ip,
        req.headers['user-agent']
      );
      res.json({
        success: true,
        message: `User account successfully ${status === 'active' ? 'activated' : 'suspended'}.`,
        data: updatedUser,
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // PLATFORM CONFIGURATION & SPECIALIZATIONS
  // ==========================================

  async getConfigurations(req, res, next) {
    try {
      const configs = await platformConfigurationService.getAllConfigurations();
      res.json({ success: true, count: configs.length, data: configs });
    } catch (err) {
      next(err);
    }
  }

  async getConfigurationByKey(req, res, next) {
    try {
      const config = await platformConfigurationService.getConfiguration(req.params.key);
      if (!config) {
        return res.status(404).json({ success: false, message: `Configuration '${req.params.key}' not found.` });
      }
      res.json({ success: true, data: config });
    } catch (err) {
      next(err);
    }
  }

  async updateConfiguration(req, res, next) {
    try {
      const { value, reason } = req.body;
      const updated = await platformConfigurationService.updateConfiguration(
        req.params.key,
        value,
        reason,
        req.user,
        req.ip,
        req.headers['user-agent']
      );
      res.json({
        success: true,
        message: `Platform configuration '${req.params.key}' successfully updated.`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async getConfigurationHistory(req, res, next) {
    try {
      const history = await platformConfigurationService.getConfigurationHistory(req.params.key);
      res.json({ success: true, count: history.length, data: history });
    } catch (err) {
      next(err);
    }
  }

  async getSpecializations(req, res, next) {
    try {
      const specs = await adminGovernanceService.listSpecializations(req.query);
      res.json({ success: true, count: specs.length, data: specs });
    } catch (err) {
      next(err);
    }
  }

  async createSpecialization(req, res, next) {
    try {
      const spec = await adminGovernanceService.createSpecialization(
        req.body,
        req.user,
        req.ip,
        req.headers['user-agent']
      );
      res.status(201).json({ success: true, message: 'Specialization created successfully', data: spec });
    } catch (err) {
      next(err);
    }
  }

  async updateSpecialization(req, res, next) {
    try {
      const spec = await adminGovernanceService.updateSpecialization(
        req.params.id,
        req.body,
        req.user,
        req.ip,
        req.headers['user-agent']
      );
      res.json({ success: true, message: 'Specialization updated successfully', data: spec });
    } catch (err) {
      next(err);
    }
  }

  async toggleSpecializationStatus(req, res, next) {
    try {
      const spec = await adminGovernanceService.toggleSpecializationStatus(
        req.params.id,
        req.body.reason,
        req.user,
        req.ip,
        req.headers['user-agent']
      );
      res.json({
        success: true,
        message: `Specialization ${spec.isActive ? 'activated' : 'deactivated'} successfully.`,
        data: spec,
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // EMERGENCY OPERATIONS MONITORING
  // ==========================================

  async getEmergencyRequests(req, res, next) {
    try {
      const result = await adminGovernanceService.listEmergencyOperations(req.query);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async getEmergencyDetails(req, res, next) {
    try {
      const details = await adminGovernanceService.getEmergencyDetails(req.params.id);
      res.json({ success: true, data: details });
    } catch (err) {
      next(err);
    }
  }

  async getEmergencyTimeline(req, res, next) {
    try {
      const timeline = await adminGovernanceService.getEmergencyTimeline(req.params.id);
      res.json({ success: true, data: timeline });
    } catch (err) {
      next(err);
    }
  }

  async getEmergencyBroadcasts(req, res, next) {
    try {
      const details = await adminGovernanceService.getEmergencyDetails(req.params.id);
      res.json({ success: true, count: details.broadcasts.length, data: details.broadcasts });
    } catch (err) {
      next(err);
    }
  }

  async getEmergencyResponses(req, res, next) {
    try {
      const details = await adminGovernanceService.getEmergencyDetails(req.params.id);
      res.json({ success: true, count: details.responses.length, data: details.responses });
    } catch (err) {
      next(err);
    }
  }

  async getEmergencyReservation(req, res, next) {
    try {
      const details = await adminGovernanceService.getEmergencyDetails(req.params.id);
      res.json({ success: true, data: details.reservation });
    } catch (err) {
      next(err);
    }
  }

  async getEmergencyJourney(req, res, next) {
    try {
      const details = await adminGovernanceService.getEmergencyDetails(req.params.id);
      res.json({ success: true, data: details.journey });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // HEALTHCARE RESOURCE MONITORING
  // ==========================================

  async getResources(req, res, next) {
    try {
      const result = await adminGovernanceService.listResources(req.query);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async getResourceSummary(req, res, next) {
    try {
      const summary = await adminGovernanceService.getResourceSummary();
      res.json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }

  async getResourceHistory(req, res, next) {
    try {
      const history = await adminGovernanceService.getResourceHistory(req.params.id);
      res.json({ success: true, count: history.length, data: history });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // REPORTS & ANALYTICS
  // ==========================================

  async generateReport(req, res, next) {
    try {
      const report = await adminGovernanceService.generateReport(req.body);

      // Audit report generation
      await adminAuditService.recordAction({
        adminUserId: req.user._id,
        adminEmail: req.user.email,
        action: 'REPORT_GENERATED',
        targetEntityType: 'Report',
        targetEntityId: req.body.reportType || 'CUSTOM',
        reason: 'Administrative analytics report generated',
        metadata: { dateRange: report.dateRange, rowCount: report.rowCount },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }).catch((e) => console.warn('[Audit Warning]', e.message));

      res.json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  async exportReport(req, res, next) {
    try {
      const { type } = req.params;
      const exportData = await adminGovernanceService.exportReportData({
        reportType: type,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        format: req.query.format || 'csv',
      });

      await adminAuditService.recordAction({
        adminUserId: req.user._id,
        adminEmail: req.user.email,
        action: 'REPORT_EXPORTED',
        targetEntityType: 'Report',
        targetEntityId: type,
        reason: `Exported administrative ${exportData.format.toUpperCase()} report`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }).catch((e) => console.warn('[Audit Warning]', e.message));

      if (exportData.format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
        return res.send(exportData.content);
      } else {
        res.setHeader('Content-Type', 'application/json');
        return res.send(exportData.content);
      }
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // AUDIT LOGS (IMMUTABLE)
  // ==========================================

  async getAuditLogs(req, res, next) {
    try {
      const result = await adminAuditService.getAuditLogs(req.query);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async getAuditLogById(req, res, next) {
    try {
      const log = await adminAuditService.getAuditLogById(req.params.id);
      if (!log) {
        return res.status(404).json({ success: false, message: 'Audit log record not found.' });
      }
      res.json({ success: true, data: log });
    } catch (err) {
      next(err);
    }
  }
}

export const adminController = new AdminController();

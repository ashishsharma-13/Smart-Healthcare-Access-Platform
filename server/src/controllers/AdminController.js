import { doctorRepository } from '../repositories/DoctorRepository.js';
import { doctorService } from '../services/DoctorService.js';
import { organizationRepository } from '../repositories/OrganizationRepository.js';
import { organizationService } from '../services/OrganizationService.js';
import { notificationService } from '../services/NotificationService.js';
import { User, Doctor, Organization, EmergencyRequest, Appointment } from '../models/index.js';

export class AdminController {
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
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

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
}

export const adminController = new AdminController();


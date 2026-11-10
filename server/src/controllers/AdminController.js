import { doctorRepository } from '../repositories/DoctorRepository.js';
import { doctorService } from '../services/DoctorService.js';
import { organizationRepository } from '../repositories/OrganizationRepository.js';
import { organizationService } from '../services/OrganizationService.js';
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

  async approveDoctor(req, res, next) {
    try {
      const updated = await doctorService.approveDoctor(req.params.id, req.user._id);
      res.json({ success: true, message: 'Doctor successfully approved and verified', data: updated });
    } catch (err) {
      next(err);
    }
  }

  async rejectDoctor(req, res, next) {
    try {
      const { reason } = req.body;
      const updated = await doctorService.rejectDoctor(req.params.id, reason);
      res.json({ success: true, message: 'Doctor verification rejected', data: updated });
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

  async approveOrganization(req, res, next) {
    try {
      const updated = await organizationService.approveOrganization(req.params.id);
      res.json({ success: true, message: 'Organization successfully approved and verified', data: updated });
    } catch (err) {
      next(err);
    }
  }

  async rejectOrganization(req, res, next) {
    try {
      const updated = await organizationService.rejectOrganization(req.params.id);
      res.json({ success: true, message: 'Organization verification rejected', data: updated });
    } catch (err) {
      next(err);
    }
  }
}

export const adminController = new AdminController();


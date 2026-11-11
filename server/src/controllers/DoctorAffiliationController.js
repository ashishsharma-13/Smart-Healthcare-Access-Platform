import { doctorAffiliationService } from '../services/DoctorAffiliationService.js';
import { doctorAffiliationRepository } from '../repositories/DoctorAffiliationRepository.js';

export class DoctorAffiliationController {
  // =================== DOCTOR PORTAL ENDPOINTS ===================

  async getDoctorAffiliations(req, res, next) {
    try {
      const statusFilter = req.query.status || null;
      const affiliations = await doctorAffiliationService.getDoctorAffiliations(req.user._id, statusFilter);
      res.json({
        success: true,
        count: affiliations.length,
        data: affiliations,
      });
    } catch (err) {
      next(err);
    }
  }

  async searchOrganizations(req, res, next) {
    try {
      const query = req.query.q || req.query.search || '';
      const organizations = await doctorAffiliationService.searchOrganizationsForDoctor(query);
      res.json({
        success: true,
        count: organizations.length,
        data: organizations,
      });
    } catch (err) {
      next(err);
    }
  }

  async requestAffiliation(req, res, next) {
    try {
      const { organizationId, department, notes } = req.body;
      if (!organizationId) {
        return res.status(400).json({ success: false, message: 'organizationId is required.' });
      }

      const affiliation = await doctorAffiliationService.requestAffiliationByDoctor({
        doctorUserId: req.user._id,
        organizationId,
        department,
        notes,
      });

      res.status(201).json({
        success: true,
        message: 'Affiliation request submitted successfully. Pending organization review.',
        data: affiliation,
      });
    } catch (err) {
      next(err);
    }
  }

  async acceptInvitation(req, res, next) {
    try {
      const { notes } = req.body;
      const updated = await doctorAffiliationService.respondToInvitationByDoctor({
        affiliationId: req.params.id,
        doctorUserId: req.user._id,
        accept: true,
        notes,
      });

      res.json({
        success: true,
        message: 'Affiliation invitation accepted. Pending final organization approval.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async declineInvitation(req, res, next) {
    try {
      const { notes, reason } = req.body;
      const updated = await doctorAffiliationService.respondToInvitationByDoctor({
        affiliationId: req.params.id,
        doctorUserId: req.user._id,
        accept: false,
        notes: notes || reason,
      });

      res.json({
        success: true,
        message: 'Affiliation invitation declined.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async requestTerminationByDoctor(req, res, next) {
    try {
      const { reason } = req.body;
      const updated = await doctorAffiliationService.requestTermination({
        affiliationId: req.params.id,
        userId: req.user._id,
        userRole: 'doctor',
        reason,
      });

      res.json({
        success: true,
        message: 'Affiliation termination requested successfully.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  // =================== ORGANIZATION PORTAL ENDPOINTS ===================

  async getOrganizationAffiliations(req, res, next) {
    try {
      const statusFilter = req.query.status || null;
      const affiliations = await doctorAffiliationService.getOrganizationAffiliations(req.user._id, statusFilter);
      res.json({
        success: true,
        count: affiliations.length,
        data: affiliations,
      });
    } catch (err) {
      next(err);
    }
  }

  async getPendingAffiliationsForOrg(req, res, next) {
    try {
      const affiliations = await doctorAffiliationService.getOrganizationAffiliations(req.user._id, 'pending');
      res.json({
        success: true,
        count: affiliations.length,
        data: affiliations,
      });
    } catch (err) {
      next(err);
    }
  }

  async searchDoctorsForOrg(req, res, next) {
    try {
      const query = req.query.q || req.query.specialization || '';
      const doctors = await doctorAffiliationService.searchDoctorsForOrganization(query);
      res.json({
        success: true,
        count: doctors.length,
        data: doctors,
      });
    } catch (err) {
      next(err);
    }
  }

  async inviteDoctor(req, res, next) {
    try {
      const { doctorId, department, notes } = req.body;
      if (!doctorId) {
        return res.status(400).json({ success: false, message: 'doctorId is required.' });
      }

      const affiliation = await doctorAffiliationService.inviteDoctorByOrganization({
        orgUserId: req.user._id,
        doctorId,
        department,
        notes,
      });

      res.status(201).json({
        success: true,
        message: 'Affiliation invitation sent to doctor successfully.',
        data: affiliation,
      });
    } catch (err) {
      next(err);
    }
  }

  async approveAffiliation(req, res, next) {
    try {
      const { notes } = req.body;
      const updated = await doctorAffiliationService.approveAffiliationByOrganization({
        affiliationId: req.params.id,
        orgUserId: req.user._id,
        notes,
      });

      res.json({
        success: true,
        message: 'Affiliation approved. Doctor is now actively affiliated.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async rejectAffiliation(req, res, next) {
    try {
      const { reason } = req.body;
      const updated = await doctorAffiliationService.rejectAffiliationByOrganization({
        affiliationId: req.params.id,
        orgUserId: req.user._id,
        reason,
      });

      res.json({
        success: true,
        message: 'Affiliation request rejected.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async requestTerminationByOrg(req, res, next) {
    try {
      const { reason } = req.body;
      const updated = await doctorAffiliationService.requestTermination({
        affiliationId: req.params.id,
        userId: req.user._id,
        userRole: 'organization',
        reason,
      });

      res.json({
        success: true,
        message: 'Affiliation termination initiated.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async finalizeTermination(req, res, next) {
    try {
      const { reason } = req.body;
      const updated = await doctorAffiliationService.finalizeTermination({
        affiliationId: req.params.id,
        userId: req.user._id,
        userRole: req.user.role,
        reason,
      });

      res.json({
        success: true,
        message: 'Affiliation marked inactive.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  // =================== PUBLIC / PATIENT QUERY ENDPOINTS ===================

  async getAffiliatedDoctorsForOrg(req, res, next) {
    try {
      const doctors = await doctorAffiliationService.getPublicAffiliatedDoctors(req.params.id);
      res.json({
        success: true,
        count: doctors.length,
        data: doctors,
      });
    } catch (err) {
      next(err);
    }
  }

  async getAffiliatedOrgsForDoctor(req, res, next) {
    try {
      const orgs = await doctorAffiliationService.getPublicAffiliatedOrganizations(req.params.id);
      res.json({
        success: true,
        count: orgs.length,
        data: orgs,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const doctorAffiliationController = new DoctorAffiliationController();

import mongoose from 'mongoose';
import { doctorAffiliationRepository } from '../repositories/DoctorAffiliationRepository.js';
import { doctorRepository } from '../repositories/DoctorRepository.js';
import { organizationRepository } from '../repositories/OrganizationRepository.js';
import { getSocketIO } from '../sockets/socketHandler.js';
import { User } from '../models/index.js';

export class DoctorAffiliationService {
  /**
   * Doctor requests affiliation with an organization.
   * Business rules:
   * - Doctor must be verified.
   * - Organization must be verified.
   * - Cannot create duplicate active or pending affiliations.
   */
  async requestAffiliationByDoctor({ doctorUserId, organizationId, department = 'General Medicine', notes = '' }) {
    const doctor = await doctorRepository.findByUserId(doctorUserId);
    if (!doctor) throw new Error('Doctor profile not found for current user.');
    if (doctor.verificationStatus !== 'verified') {
      throw new Error('Only approved and verified doctors can request healthcare affiliations.');
    }

    const organization = await organizationRepository.findById(organizationId);
    if (!organization) throw new Error('Target healthcare organization not found.');
    if (organization.verificationStatus !== 'verified') {
      throw new Error('Cannot affiliate with an unverified healthcare organization.');
    }

    // Check duplicate pending or active affiliations
    const existing = await doctorAffiliationRepository.findActiveOrPending(doctor._id, organization._id);
    if (existing) {
      throw new Error('An active or pending affiliation already exists between this doctor and organization.');
    }

    const affiliationId = `AFF-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const affiliation = await doctorAffiliationRepository.create({
      affiliationId,
      doctorId: doctor._id,
      organizationId: organization._id,
      status: 'PENDING',
      initiatedBy: 'doctor',
      doctorAcceptance: {
        status: 'accepted',
        respondedAt: new Date(),
        notes,
      },
      organizationApproval: {
        status: 'pending',
      },
      department: department || doctor.specialization || 'General Medicine',
    });

    // Real-time notification to organization room
    const io = getSocketIO();
    if (io) {
      const orgIdStr = organization._id.toString();
      io.to(`org:${orgIdStr}`).emit('affiliation:new_request', {
        affiliationId: affiliation._id,
        doctorName: doctor.userId?.name,
        specialization: doctor.specialization,
        status: 'PENDING',
      });
    }

    return await doctorAffiliationRepository.findById(affiliation._id);
  }

  /**
   * Organization invites a verified doctor to affiliate.
   * Business rules:
   * - Organization must be verified.
   * - Doctor must be verified.
   * - Cannot create duplicate active or pending affiliations.
   */
  async inviteDoctorByOrganization({ orgUserId, doctorId, department = 'General Medicine', notes = '' }) {
    const organization = await organizationRepository.findByUserId(orgUserId);
    if (!organization) throw new Error('Organization profile not found for current user.');
    if (organization.verificationStatus !== 'verified') {
      throw new Error('Only verified healthcare organizations can send affiliation invitations.');
    }

    const doctor = await doctorRepository.findById(doctorId);
    if (!doctor) throw new Error('Doctor record not found.');
    if (doctor.verificationStatus !== 'verified') {
      throw new Error('Only approved and verified doctors are eligible for healthcare affiliations.');
    }

    const existing = await doctorAffiliationRepository.findActiveOrPending(doctor._id, organization._id);
    if (existing) {
      throw new Error('An active or pending affiliation already exists between this doctor and organization.');
    }

    const affiliationId = `AFF-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const affiliation = await doctorAffiliationRepository.create({
      affiliationId,
      doctorId: doctor._id,
      organizationId: organization._id,
      status: 'PENDING',
      initiatedBy: 'organization',
      doctorAcceptance: {
        status: 'pending',
        notes,
      },
      organizationApproval: {
        status: 'pending',
      },
      department: department || doctor.specialization || 'General Medicine',
    });

    // Real-time notification to doctor room
    const io = getSocketIO();
    if (io && doctor.userId) {
      const doctorUserIdStr = doctor.userId._id ? doctor.userId._id.toString() : doctor.userId.toString();
      io.to(`user:${doctorUserIdStr}`).emit('affiliation:invitation_received', {
        affiliationId: affiliation._id,
        organizationName: organization.name,
        status: 'PENDING',
      });
    }

    return await doctorAffiliationRepository.findById(affiliation._id);
  }

  /**
   * Doctor responds to an organization-initiated invitation (Accept or Decline).
   * Business rule: Accepting an invitation does NOT automatically activate the affiliation.
   * The organization must review and give final approval before status becomes ACTIVE.
   */
  async respondToInvitationByDoctor({ affiliationId, doctorUserId, accept, notes = '' }) {
    const doctor = await doctorRepository.findByUserId(doctorUserId);
    if (!doctor) throw new Error('Doctor profile not found.');

    const affiliation = await doctorAffiliationRepository.findById(affiliationId);
    if (!affiliation) throw new Error('Affiliation record not found.');

    const affiliationDocId = affiliation.doctorId._id
      ? affiliation.doctorId._id.toString()
      : affiliation.doctorId.toString();

    if (affiliationDocId !== doctor._id.toString()) {
      throw new Error('Unauthorized: Doctor can only respond to invitations addressed to them.');
    }

    if (affiliation.status !== 'PENDING') {
      throw new Error(`Cannot respond to affiliation in '${affiliation.status}' status.`);
    }

    if (affiliation.initiatedBy !== 'organization') {
      throw new Error('This affiliation was initiated by the doctor, not an organization invitation.');
    }

    if (accept) {
      // Doctor accepts: doctorAcceptance is marked 'accepted', but remains PENDING for organization review
      const updated = await doctorAffiliationRepository.updateById(affiliation._id, {
        'doctorAcceptance.status': 'accepted',
        'doctorAcceptance.respondedAt': new Date(),
        'doctorAcceptance.notes': notes,
      });

      const io = getSocketIO();
      if (io) {
        const orgIdStr = affiliation.organizationId._id
          ? affiliation.organizationId._id.toString()
          : affiliation.organizationId.toString();
        io.to(`org:${orgIdStr}`).emit('affiliation:doctor_accepted', {
          affiliationId: affiliation._id,
          doctorName: doctor.userId?.name,
          status: 'PENDING',
          message: 'Doctor accepted your invitation. Pending final organization approval.',
        });
      }

      return updated;
    } else {
      // Doctor declines: affiliation is rejected/inactive
      const updated = await doctorAffiliationRepository.updateById(affiliation._id, {
        status: 'REJECTED',
        'doctorAcceptance.status': 'declined',
        'doctorAcceptance.respondedAt': new Date(),
        rejectionReason: notes || 'Invitation declined by doctor',
      });

      return updated;
    }
  }

  /**
   * Organization reviews and APPROVES a pending affiliation.
   * Business rules:
   * - Only authorized organization users belonging to the relevant organization can approve.
   * - Doctor must have accepted if organization-initiated.
   * - Both doctor and organization must be verified.
   */
  async approveAffiliationByOrganization({ affiliationId, orgUserId, notes = '' }) {
    const organization = await organizationRepository.findByUserId(orgUserId);
    if (!organization) throw new Error('Organization profile not found.');

    const affiliation = await doctorAffiliationRepository.findById(affiliationId);
    if (!affiliation) throw new Error('Affiliation record not found.');

    const affiliationOrgId = affiliation.organizationId._id
      ? affiliation.organizationId._id.toString()
      : affiliation.organizationId.toString();

    if (affiliationOrgId !== organization._id.toString()) {
      throw new Error('Unauthorized: You can only approve affiliation requests for your own organization.');
    }

    if (affiliation.status !== 'PENDING') {
      throw new Error(`Cannot approve affiliation currently in '${affiliation.status}' status.`);
    }

    // Verify doctor acceptance if org-initiated
    if (affiliation.initiatedBy === 'organization' && affiliation.doctorAcceptance.status !== 'accepted') {
      throw new Error('Cannot approve invitation before the doctor has accepted it.');
    }

    // Check doctor verification status
    const doctor = await doctorRepository.findById(affiliation.doctorId._id || affiliation.doctorId);
    if (!doctor || doctor.verificationStatus !== 'verified') {
      throw new Error('Cannot approve affiliation with an unverified doctor.');
    }

    const updated = await doctorAffiliationRepository.updateById(affiliation._id, {
      status: 'ACTIVE',
      'organizationApproval.status': 'approved',
      'organizationApproval.reviewedBy': orgUserId,
      'organizationApproval.reviewedAt': new Date(),
      'organizationApproval.notes': notes,
    });

    const io = getSocketIO();
    if (io && doctor.userId) {
      const doctorUserIdStr = doctor.userId._id ? doctor.userId._id.toString() : doctor.userId.toString();
      io.to(`user:${doctorUserIdStr}`).emit('affiliation:approved', {
        affiliationId: affiliation._id,
        organizationName: organization.name,
        status: 'ACTIVE',
      });
    }

    return updated;
  }

  /**
   * Organization reviews and REJECTS a pending affiliation.
   */
  async rejectAffiliationByOrganization({ affiliationId, orgUserId, reason = '' }) {
    const organization = await organizationRepository.findByUserId(orgUserId);
    if (!organization) throw new Error('Organization profile not found.');

    const affiliation = await doctorAffiliationRepository.findById(affiliationId);
    if (!affiliation) throw new Error('Affiliation record not found.');

    const affiliationOrgId = affiliation.organizationId._id
      ? affiliation.organizationId._id.toString()
      : affiliation.organizationId.toString();

    if (affiliationOrgId !== organization._id.toString()) {
      throw new Error('Unauthorized: You can only reject affiliation requests for your own organization.');
    }

    if (affiliation.status !== 'PENDING') {
      throw new Error(`Cannot reject affiliation currently in '${affiliation.status}' status.`);
    }

    const updated = await doctorAffiliationRepository.updateById(affiliation._id, {
      status: 'REJECTED',
      'organizationApproval.status': 'rejected',
      'organizationApproval.reviewedBy': orgUserId,
      'organizationApproval.reviewedAt': new Date(),
      rejectionReason: reason || 'Affiliation request rejected by healthcare organization.',
    });

    return updated;
  }

  /**
   * Initiates termination of an ACTIVE affiliation.
   * Either Doctor or Organization can request termination.
   * Status transitions: ACTIVE -> TERMINATION_REQUESTED
   */
  async requestTermination({ affiliationId, userId, userRole, reason = '' }) {
    const affiliation = await doctorAffiliationRepository.findById(affiliationId);
    if (!affiliation) throw new Error('Affiliation record not found.');

    const currentStatus = (affiliation.status || '').toUpperCase();
    if (currentStatus !== 'ACTIVE' && currentStatus !== 'APPROVED') {
      throw new Error(`Cannot request termination for an affiliation in '${affiliation.status}' status.`);
    }

    // Authorization check
    if (userRole === 'doctor') {
      const doctor = await doctorRepository.findByUserId(userId);
      const affiliationDocId = affiliation.doctorId._id
        ? affiliation.doctorId._id.toString()
        : affiliation.doctorId.toString();
      if (!doctor || affiliationDocId !== doctor._id.toString()) {
        throw new Error('Unauthorized: You can only terminate your own affiliations.');
      }
    } else if (userRole === 'organization') {
      const org = await organizationRepository.findByUserId(userId);
      const affiliationOrgId = affiliation.organizationId._id
        ? affiliation.organizationId._id.toString()
        : affiliation.organizationId.toString();
      if (!org || affiliationOrgId !== org._id.toString()) {
        throw new Error('Unauthorized: You can only terminate affiliations for your own organization.');
      }
    } else if (userRole !== 'admin') {
      throw new Error('Unauthorized: Invalid role for affiliation termination.');
    }

    const updated = await doctorAffiliationRepository.updateById(affiliation._id, {
      status: 'TERMINATION_REQUESTED',
      terminationDetails: {
        initiatedBy: userRole,
        initiatedByUserId: userId,
        reason: reason || 'Affiliation termination requested',
        requestedAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * Finalizes affiliation termination according to platform workflow.
   * Status transitions: TERMINATION_REQUESTED (or ACTIVE) -> INACTIVE
   * Preserves historical affiliation record.
   */
  async finalizeTermination({ affiliationId, userId, userRole, reason = '' }) {
    const affiliation = await doctorAffiliationRepository.findById(affiliationId);
    if (!affiliation) throw new Error('Affiliation record not found.');

    // Authorization check
    if (userRole === 'doctor') {
      const doctor = await doctorRepository.findByUserId(userId);
      const affiliationDocId = affiliation.doctorId._id
        ? affiliation.doctorId._id.toString()
        : affiliation.doctorId.toString();
      if (!doctor || affiliationDocId !== doctor._id.toString()) {
        throw new Error('Unauthorized: Doctor does not own this affiliation.');
      }
    } else if (userRole === 'organization') {
      const org = await organizationRepository.findByUserId(userId);
      const affiliationOrgId = affiliation.organizationId._id
        ? affiliation.organizationId._id.toString()
        : affiliation.organizationId.toString();
      if (!org || affiliationOrgId !== org._id.toString()) {
        throw new Error('Unauthorized: Organization does not own this affiliation.');
      }
    } else if (userRole !== 'admin') {
      throw new Error('Unauthorized role for finalizing termination.');
    }

    const updated = await doctorAffiliationRepository.updateById(affiliation._id, {
      status: 'INACTIVE',
      'terminationDetails.finalizedAt': new Date(),
      'terminationDetails.acknowledgedBy': userId,
      ...(reason ? { 'terminationDetails.reason': reason } : {}),
    });

    return updated;
  }

  /**
   * Returns affiliations for the logged-in doctor.
   */
  async getDoctorAffiliations(doctorUserId, statusFilter = null) {
    const doctor = await doctorRepository.findByUserId(doctorUserId);
    if (!doctor) throw new Error('Doctor profile not found.');

    const filter = {};
    if (statusFilter) {
      if (statusFilter === 'active') {
        filter.status = { $in: ['ACTIVE', 'approved'] };
      } else if (statusFilter === 'pending') {
        filter.status = { $in: ['PENDING', 'pending'] };
      } else if (statusFilter === 'rejected') {
        filter.status = 'REJECTED';
      } else if (statusFilter === 'history') {
        filter.status = { $in: ['INACTIVE', 'REJECTED', 'TERMINATION_REQUESTED', 'revoked'] };
      } else {
        filter.status = statusFilter.toUpperCase();
      }
    }

    return await doctorAffiliationRepository.listByDoctor(doctor._id, filter);
  }

  /**
   * Returns affiliations for the logged-in organization.
   */
  async getOrganizationAffiliations(orgUserId, statusFilter = null) {
    const organization = await organizationRepository.findByUserId(orgUserId);
    if (!organization) throw new Error('Organization profile not found.');

    const filter = {};
    if (statusFilter) {
      if (statusFilter === 'active') {
        filter.status = { $in: ['ACTIVE', 'approved'] };
      } else if (statusFilter === 'pending') {
        filter.status = { $in: ['PENDING', 'pending'] };
      } else if (statusFilter === 'history') {
        filter.status = { $in: ['INACTIVE', 'REJECTED', 'TERMINATION_REQUESTED', 'revoked'] };
      } else {
        filter.status = statusFilter.toUpperCase();
      }
    }

    return await doctorAffiliationRepository.listByOrganization(organization._id, filter);
  }

  /**
   * Search verified organizations for a doctor to request affiliation.
   */
  async searchOrganizationsForDoctor(query = '') {
    const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    const filter = {};
    if (!isDev) {
      filter.verificationStatus = 'verified';
    }

    const q = query && typeof query === 'string' ? query.trim() : '';
    if (q) {
      let userIds = [];
      try {
        const matchingUsers = await User.find({
          role: 'organization',
          $or: [
            { email: { $regex: q, $options: 'i' } },
            { name: { $regex: q, $options: 'i' } },
          ],
        }).select('_id');
        userIds = matchingUsers.map((u) => u._id);
      } catch (err) {}

      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { organizationName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        ...(userIds.length > 0 ? [{ userId: { $in: userIds } }] : []),
        { 'address.city': { $regex: q, $options: 'i' } },
        { 'operatingAddress.city': { $regex: q, $options: 'i' } },
        { orgType: { $regex: q, $options: 'i' } },
      ];
    }
    return await organizationRepository.listAll(filter);
  }

  /**
   * Search verified approved doctors for an organization to invite.
   */
  async searchDoctorsForOrganization(query = '') {
    const filter = { verificationStatus: 'verified' };
    const doctors = await doctorRepository.searchDoctors({ specialization: query });
    return doctors;
  }

  /**
   * Returns publicly visible active affiliations for a doctor.
   */
  async getPublicAffiliatedOrganizations(doctorId) {
    const affiliations = await doctorAffiliationRepository.listByDoctor(doctorId, {
      status: { $in: ['ACTIVE', 'approved'] },
    });
    return affiliations.map((a) => a.organizationId);
  }

  /**
   * Returns publicly visible active affiliated doctors for an organization.
   */
  async getPublicAffiliatedDoctors(organizationId) {
    const affiliations = await doctorAffiliationRepository.listByOrganization(organizationId, {
      status: { $in: ['ACTIVE', 'approved'] },
    });
    return affiliations.map((a) => a.doctorId);
  }
}

export const doctorAffiliationService = new DoctorAffiliationService();

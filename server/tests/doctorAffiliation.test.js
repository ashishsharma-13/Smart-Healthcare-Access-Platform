import { jest } from '@jest/globals';
import { doctorAffiliationService } from '../src/services/DoctorAffiliationService.js';
import { doctorAffiliationRepository } from '../src/repositories/DoctorAffiliationRepository.js';
import { doctorRepository } from '../src/repositories/DoctorRepository.js';
import { organizationRepository } from '../src/repositories/OrganizationRepository.js';
import { doctorService } from '../src/services/DoctorService.js';
import { doctorPresenceRepository } from '../src/repositories/DoctorPresenceRepository.js';
import { appointmentService } from '../src/services/AppointmentService.js';
import { appointmentRepository } from '../src/repositories/AppointmentRepository.js';

describe('Doctor–Organization Affiliation Module Test Suite (17 Scenarios)', () => {
  const mockDoctorUserId = '673000000000000000000001';
  const mockDoctorId = '673111111111111111111111';
  const mockOtherDoctorUserId = '673000000000000000000099';
  const mockOtherDoctorId = '673999999999999999999999';

  const mockOrgUserId = '673000000000000000000002';
  const mockOrgId = '673222222222222222222222';
  const mockOtherOrgUserId = '673000000000000000000088';
  const mockOtherOrgId = '673888888888888888888888';

  const verifiedDoctor = {
    _id: mockDoctorId,
    userId: { _id: mockDoctorUserId, name: 'Dr. Jaya Sharma', email: 'jaya@shap.com' },
    verificationStatus: 'verified',
    specialization: 'Cardiology',
    doctorUniqueId: 'DOC-10024',
    currentPresence: { isPresent: false },
  };

  const unverifiedDoctor = {
    _id: mockDoctorId,
    userId: { _id: mockDoctorUserId, name: 'Dr. Unverified', email: 'unverified@shap.com' },
    verificationStatus: 'pending',
    specialization: 'Neurology',
  };

  const verifiedOrg = {
    _id: mockOrgId,
    userId: mockOrgUserId,
    name: 'Apex Metro Trauma & Heart Hospital',
    verificationStatus: 'verified',
    orgType: 'hospital',
    qrCheckinCode: 'ORG-APEX-METRO-QR',
  };

  const unverifiedOrg = {
    _id: mockOrgId,
    userId: mockOrgUserId,
    name: 'Unverified Clinic',
    verificationStatus: 'pending',
    orgType: 'clinic',
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Scenario 1: Doctor sends affiliation request
  test('Scenario 1: Doctor sends affiliation request -> creates PENDING record with initiatedBy: doctor', async () => {
    jest.spyOn(doctorRepository, 'findByUserId').mockResolvedValue(verifiedDoctor);
    jest.spyOn(organizationRepository, 'findById').mockResolvedValue(verifiedOrg);
    jest.spyOn(doctorAffiliationRepository, 'findActiveOrPending').mockResolvedValue(null);

    const createdRecord = {
      _id: '673aaa000000000000000001',
      affiliationId: 'AFF-MOCK-1',
      doctorId: mockDoctorId,
      organizationId: mockOrgId,
      status: 'PENDING',
      initiatedBy: 'doctor',
      doctorAcceptance: { status: 'accepted' },
      organizationApproval: { status: 'pending' },
    };

    jest.spyOn(doctorAffiliationRepository, 'create').mockResolvedValue(createdRecord);
    jest.spyOn(doctorAffiliationRepository, 'findById').mockResolvedValue(createdRecord);

    const res = await doctorAffiliationService.requestAffiliationByDoctor({
      doctorUserId: mockDoctorUserId,
      organizationId: mockOrgId,
      department: 'Cardiology',
      notes: 'Requesting affiliation for OPD',
    });

    expect(doctorAffiliationRepository.create).toHaveBeenCalled();
    expect(res.status).toBe('PENDING');
    expect(res.initiatedBy).toBe('doctor');
    expect(res.doctorAcceptance.status).toBe('accepted');
    expect(res.organizationApproval.status).toBe('pending');
  });

  // Scenario 2: Organization sends invitation
  test('Scenario 2: Organization sends invitation -> creates PENDING record with initiatedBy: organization', async () => {
    jest.spyOn(organizationRepository, 'findByUserId').mockResolvedValue(verifiedOrg);
    jest.spyOn(doctorRepository, 'findById').mockResolvedValue(verifiedDoctor);
    jest.spyOn(doctorAffiliationRepository, 'findActiveOrPending').mockResolvedValue(null);

    const createdRecord = {
      _id: '673aaa000000000000000002',
      affiliationId: 'AFF-MOCK-2',
      doctorId: mockDoctorId,
      organizationId: mockOrgId,
      status: 'PENDING',
      initiatedBy: 'organization',
      doctorAcceptance: { status: 'pending' },
      organizationApproval: { status: 'pending' },
    };

    jest.spyOn(doctorAffiliationRepository, 'create').mockResolvedValue(createdRecord);
    jest.spyOn(doctorAffiliationRepository, 'findById').mockResolvedValue(createdRecord);

    const res = await doctorAffiliationService.inviteDoctorByOrganization({
      orgUserId: mockOrgUserId,
      doctorId: mockDoctorId,
      department: 'Emergency & Trauma',
      notes: 'We invite you to join our cardiac trauma wing',
    });

    expect(doctorAffiliationRepository.create).toHaveBeenCalled();
    expect(res.status).toBe('PENDING');
    expect(res.initiatedBy).toBe('organization');
    expect(res.doctorAcceptance.status).toBe('pending');
  });

  // Scenario 3: Doctor accepts invitation (Must remain PENDING for org review, NOT automatically active)
  test('Scenario 3: Doctor accepts invitation -> doctorAcceptance becomes accepted, status remains PENDING', async () => {
    jest.spyOn(doctorRepository, 'findByUserId').mockResolvedValue(verifiedDoctor);

    const pendingInvitation = {
      _id: '673aaa000000000000000002',
      doctorId: { _id: mockDoctorId },
      organizationId: { _id: mockOrgId },
      status: 'PENDING',
      initiatedBy: 'organization',
      doctorAcceptance: { status: 'pending' },
    };
    jest.spyOn(doctorAffiliationRepository, 'findById').mockResolvedValue(pendingInvitation);

    const updatedRecord = {
      ...pendingInvitation,
      status: 'PENDING',
      doctorAcceptance: { status: 'accepted', respondedAt: new Date() },
    };
    jest.spyOn(doctorAffiliationRepository, 'updateById').mockResolvedValue(updatedRecord);

    const res = await doctorAffiliationService.respondToInvitationByDoctor({
      affiliationId: '673aaa000000000000000002',
      doctorUserId: mockDoctorUserId,
      accept: true,
      notes: 'I happily accept the invitation',
    });

    expect(res.status).toBe('PENDING'); // Does NOT automatically activate!
    expect(res.doctorAcceptance.status).toBe('accepted');
  });

  // Scenario 4: Doctor declines invitation
  test('Scenario 4: Doctor declines invitation -> status becomes REJECTED', async () => {
    jest.spyOn(doctorRepository, 'findByUserId').mockResolvedValue(verifiedDoctor);

    const pendingInvitation = {
      _id: '673aaa000000000000000002',
      doctorId: { _id: mockDoctorId },
      organizationId: { _id: mockOrgId },
      status: 'PENDING',
      initiatedBy: 'organization',
      doctorAcceptance: { status: 'pending' },
    };
    jest.spyOn(doctorAffiliationRepository, 'findById').mockResolvedValue(pendingInvitation);

    const updatedRecord = {
      ...pendingInvitation,
      status: 'REJECTED',
      doctorAcceptance: { status: 'declined', respondedAt: new Date() },
      rejectionReason: 'Schedule conflict',
    };
    jest.spyOn(doctorAffiliationRepository, 'updateById').mockResolvedValue(updatedRecord);

    const res = await doctorAffiliationService.respondToInvitationByDoctor({
      affiliationId: '673aaa000000000000000002',
      doctorUserId: mockDoctorUserId,
      accept: false,
      notes: 'Schedule conflict',
    });

    expect(res.status).toBe('REJECTED');
    expect(res.doctorAcceptance.status).toBe('declined');
  });

  // Scenario 5: Organization approves affiliation
  test('Scenario 5: Organization approves affiliation -> status transitions to ACTIVE', async () => {
    jest.spyOn(organizationRepository, 'findByUserId').mockResolvedValue(verifiedOrg);
    jest.spyOn(doctorRepository, 'findById').mockResolvedValue(verifiedDoctor);

    const pendingAffiliation = {
      _id: '673aaa000000000000000001',
      doctorId: { _id: mockDoctorId },
      organizationId: { _id: mockOrgId },
      status: 'PENDING',
      initiatedBy: 'doctor',
      doctorAcceptance: { status: 'accepted' },
      organizationApproval: { status: 'pending' },
    };
    jest.spyOn(doctorAffiliationRepository, 'findById').mockResolvedValue(pendingAffiliation);

    const activeAffiliation = {
      ...pendingAffiliation,
      status: 'ACTIVE',
      organizationApproval: { status: 'approved', reviewedBy: mockOrgUserId, reviewedAt: new Date() },
    };
    jest.spyOn(doctorAffiliationRepository, 'updateById').mockResolvedValue(activeAffiliation);

    const res = await doctorAffiliationService.approveAffiliationByOrganization({
      affiliationId: '673aaa000000000000000001',
      orgUserId: mockOrgUserId,
      notes: 'Credentials verified and approved',
    });

    expect(res.status).toBe('ACTIVE');
    expect(res.organizationApproval.status).toBe('approved');
  });

  // Scenario 6: Organization rejects affiliation
  test('Scenario 6: Organization rejects affiliation -> status transitions to REJECTED', async () => {
    jest.spyOn(organizationRepository, 'findByUserId').mockResolvedValue(verifiedOrg);

    const pendingAffiliation = {
      _id: '673aaa000000000000000001',
      doctorId: { _id: mockDoctorId },
      organizationId: { _id: mockOrgId },
      status: 'PENDING',
      initiatedBy: 'doctor',
      organizationApproval: { status: 'pending' },
    };
    jest.spyOn(doctorAffiliationRepository, 'findById').mockResolvedValue(pendingAffiliation);

    const rejectedAffiliation = {
      ...pendingAffiliation,
      status: 'REJECTED',
      organizationApproval: { status: 'rejected', reviewedBy: mockOrgUserId, reviewedAt: new Date() },
      rejectionReason: 'No current OPD vacancies',
    };
    jest.spyOn(doctorAffiliationRepository, 'updateById').mockResolvedValue(rejectedAffiliation);

    const res = await doctorAffiliationService.rejectAffiliationByOrganization({
      affiliationId: '673aaa000000000000000001',
      orgUserId: mockOrgUserId,
      reason: 'No current OPD vacancies',
    });

    expect(res.status).toBe('REJECTED');
    expect(res.organizationApproval.status).toBe('rejected');
  });

  // Scenario 7: Duplicate affiliation prevention
  test('Scenario 7: Duplicate affiliation prevention -> throws error if active or pending exists', async () => {
    jest.spyOn(doctorRepository, 'findByUserId').mockResolvedValue(verifiedDoctor);
    jest.spyOn(organizationRepository, 'findById').mockResolvedValue(verifiedOrg);
    jest.spyOn(doctorAffiliationRepository, 'findActiveOrPending').mockResolvedValue({
      _id: 'existing-aff-id',
      status: 'ACTIVE',
    });

    await expect(
      doctorAffiliationService.requestAffiliationByDoctor({
        doctorUserId: mockDoctorUserId,
        organizationId: mockOrgId,
      })
    ).rejects.toThrow('An active or pending affiliation already exists');
  });

  // Scenario 8: Unverified doctor cannot be affiliated
  test('Scenario 8: Unverified doctor cannot be affiliated -> throws error', async () => {
    jest.spyOn(doctorRepository, 'findByUserId').mockResolvedValue(unverifiedDoctor);

    await expect(
      doctorAffiliationService.requestAffiliationByDoctor({
        doctorUserId: mockDoctorUserId,
        organizationId: mockOrgId,
      })
    ).rejects.toThrow('Only approved and verified doctors can request healthcare affiliations');

    jest.spyOn(organizationRepository, 'findByUserId').mockResolvedValue(verifiedOrg);
    jest.spyOn(doctorRepository, 'findById').mockResolvedValue(unverifiedDoctor);

    await expect(
      doctorAffiliationService.inviteDoctorByOrganization({
        orgUserId: mockOrgUserId,
        doctorId: mockDoctorId,
      })
    ).rejects.toThrow('Only approved and verified doctors are eligible for healthcare affiliations');
  });

  // Scenario 9: Unverified organization cannot be affiliated
  test('Scenario 9: Unverified organization cannot be affiliated -> throws error', async () => {
    jest.spyOn(doctorRepository, 'findByUserId').mockResolvedValue(verifiedDoctor);
    jest.spyOn(organizationRepository, 'findById').mockResolvedValue(unverifiedOrg);

    await expect(
      doctorAffiliationService.requestAffiliationByDoctor({
        doctorUserId: mockDoctorUserId,
        organizationId: mockOrgId,
      })
    ).rejects.toThrow('Cannot affiliate with an unverified healthcare organization');

    jest.spyOn(organizationRepository, 'findByUserId').mockResolvedValue(unverifiedOrg);

    await expect(
      doctorAffiliationService.inviteDoctorByOrganization({
        orgUserId: mockOrgUserId,
        doctorId: mockDoctorId,
      })
    ).rejects.toThrow('Only verified healthcare organizations can send affiliation invitations');
  });

  // Scenario 10: Unauthorized organization cannot approve another org request
  test('Scenario 10: Unauthorized organization cannot approve another org request -> throws Unauthorized error', async () => {
    const foreignOrg = { ...verifiedOrg, _id: mockOtherOrgId, userId: mockOtherOrgUserId };
    jest.spyOn(organizationRepository, 'findByUserId').mockResolvedValue(foreignOrg);

    const targetAffiliation = {
      _id: '673aaa000000000000000001',
      organizationId: { _id: mockOrgId }, // Belongs to mockOrgId, not foreignOrg
      status: 'PENDING',
    };
    jest.spyOn(doctorAffiliationRepository, 'findById').mockResolvedValue(targetAffiliation);

    await expect(
      doctorAffiliationService.approveAffiliationByOrganization({
        affiliationId: '673aaa000000000000000001',
        orgUserId: mockOtherOrgUserId,
      })
    ).rejects.toThrow('Unauthorized: You can only approve affiliation requests for your own organization');
  });

  // Scenario 11: Doctor cannot modify another doctor affiliation
  test('Scenario 11: Doctor cannot modify another doctor affiliation -> throws Unauthorized error', async () => {
    const foreignDoctor = { ...verifiedDoctor, _id: mockOtherDoctorId, userId: { _id: mockOtherDoctorUserId } };
    jest.spyOn(doctorRepository, 'findByUserId').mockResolvedValue(foreignDoctor);

    const targetAffiliation = {
      _id: '673aaa000000000000000002',
      doctorId: { _id: mockDoctorId }, // Belongs to mockDoctorId, not foreignDoctor
      status: 'PENDING',
      initiatedBy: 'organization',
    };
    jest.spyOn(doctorAffiliationRepository, 'findById').mockResolvedValue(targetAffiliation);

    await expect(
      doctorAffiliationService.respondToInvitationByDoctor({
        affiliationId: '673aaa000000000000000002',
        doctorUserId: mockOtherDoctorUserId,
        accept: true,
      })
    ).rejects.toThrow('Unauthorized: Doctor can only respond to invitations addressed to them');
  });

  // Scenario 12: Doctor requests termination
  test('Scenario 12: Doctor requests termination -> status transitions to TERMINATION_REQUESTED', async () => {
    jest.spyOn(doctorRepository, 'findByUserId').mockResolvedValue(verifiedDoctor);

    const activeAffiliation = {
      _id: '673aaa000000000000000001',
      doctorId: { _id: mockDoctorId },
      organizationId: { _id: mockOrgId },
      status: 'ACTIVE',
    };
    jest.spyOn(doctorAffiliationRepository, 'findById').mockResolvedValue(activeAffiliation);

    const terminationRequestedAffiliation = {
      ...activeAffiliation,
      status: 'TERMINATION_REQUESTED',
      terminationDetails: {
        initiatedBy: 'doctor',
        reason: 'Relocating to another city',
        requestedAt: new Date(),
      },
    };
    jest.spyOn(doctorAffiliationRepository, 'updateById').mockResolvedValue(terminationRequestedAffiliation);

    const res = await doctorAffiliationService.requestTermination({
      affiliationId: '673aaa000000000000000001',
      userId: mockDoctorUserId,
      userRole: 'doctor',
      reason: 'Relocating to another city',
    });

    expect(res.status).toBe('TERMINATION_REQUESTED');
    expect(res.terminationDetails.initiatedBy).toBe('doctor');
  });

  // Scenario 13: Organization requests/finalizes termination
  test('Scenario 13: Organization finalizes termination -> status transitions to INACTIVE', async () => {
    jest.spyOn(organizationRepository, 'findByUserId').mockResolvedValue(verifiedOrg);

    const termReqAffiliation = {
      _id: '673aaa000000000000000001',
      doctorId: { _id: mockDoctorId },
      organizationId: { _id: mockOrgId },
      status: 'TERMINATION_REQUESTED',
      terminationDetails: { initiatedBy: 'doctor' },
    };
    jest.spyOn(doctorAffiliationRepository, 'findById').mockResolvedValue(termReqAffiliation);

    const inactiveAffiliation = {
      ...termReqAffiliation,
      status: 'INACTIVE',
      terminationDetails: {
        ...termReqAffiliation.terminationDetails,
        finalizedAt: new Date(),
        acknowledgedBy: mockOrgUserId,
      },
    };
    jest.spyOn(doctorAffiliationRepository, 'updateById').mockResolvedValue(inactiveAffiliation);

    const res = await doctorAffiliationService.finalizeTermination({
      affiliationId: '673aaa000000000000000001',
      userId: mockOrgUserId,
      userRole: 'organization',
      reason: 'Termination acknowledged and confirmed',
    });

    expect(res.status).toBe('INACTIVE');
    expect(res.terminationDetails.finalizedAt).toBeDefined();
  });

  // Scenario 14: Inactive or missing affiliation blocks appointment booking
  test('Scenario 14: Inactive or missing affiliation blocks new appointment booking', async () => {
    jest.spyOn(doctorRepository, 'findById').mockResolvedValue(verifiedDoctor);
    jest.spyOn(organizationRepository, 'findById').mockResolvedValue(verifiedOrg);
    // Affiliation is null or inactive
    jest.spyOn(doctorAffiliationRepository, 'findActiveAffiliation').mockResolvedValue(null);

    await expect(
      appointmentService.bookAppointment({
        patientId: 'patient123',
        doctorId: mockDoctorId,
        organizationId: mockOrgId,
        slotDate: '2026-12-01',
        slotTime: '10:00 AM',
        patientNotes: 'Checkup',
      })
    ).rejects.toThrow('Doctor is not actively affiliated with this healthcare facility');
  });

  // Scenario 15: QR check-in fails without active affiliation
  test('Scenario 15: QR check-in fails if doctor is not actively affiliated', async () => {
    jest.spyOn(doctorRepository, 'findById').mockResolvedValue({
      ...verifiedDoctor,
      currentPresence: { isPresent: false },
    });
    jest.spyOn(organizationRepository, 'findByQrCode').mockResolvedValue(verifiedOrg);
    jest.spyOn(doctorAffiliationRepository, 'findActiveAffiliation').mockResolvedValue(null);

    await expect(
      doctorService.checkIn(mockDoctorId, verifiedOrg.qrCheckinCode)
    ).rejects.toThrow('Doctor does not have an active affiliation with Apex Metro Trauma & Heart Hospital. QR check-in requires an ACTIVE affiliation.');
  });

  // Scenario 16: Doctor cannot check in at a second organization while already present
  test('Scenario 16: Doctor cannot check in while already present at an organization', async () => {
    jest.spyOn(doctorRepository, 'findById').mockResolvedValue({
      ...verifiedDoctor,
      currentPresence: { isPresent: true, organizationId: mockOrgId },
    });

    await expect(
      doctorService.checkIn(mockDoctorId, 'ORG-OTHER-QR')
    ).rejects.toThrow('Doctor is already checked in at an organization. Check out first before checking in elsewhere.');
  });

  // Scenario 17: State transition consistency and non-destruction of history records
  test('Scenario 17: State transition consistency and non-destruction of history records', async () => {
    // Audit that history queries retain INACTIVE and TERMINATION_REQUESTED records rather than purging
    jest.spyOn(doctorRepository, 'findByUserId').mockResolvedValue(verifiedDoctor);

    const mockHistory = [
      {
        _id: 'aff-1',
        status: 'ACTIVE',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-05'),
      },
      {
        _id: 'aff-2',
        status: 'INACTIVE',
        createdAt: new Date('2025-06-01'),
        updatedAt: new Date('2025-12-31'),
        terminationDetails: { initiatedBy: 'doctor', finalizedAt: new Date('2025-12-31') },
      },
      {
        _id: 'aff-3',
        status: 'REJECTED',
        createdAt: new Date('2025-05-01'),
        updatedAt: new Date('2025-05-02'),
      },
    ];

    jest.spyOn(doctorAffiliationRepository, 'listByDoctor').mockImplementation((docId, filter) => {
      if (filter && filter.status && filter.status.$in) {
        return Promise.resolve(mockHistory.filter((item) => filter.status.$in.includes(item.status)));
      }
      return Promise.resolve(mockHistory);
    });

    const historyResult = await doctorAffiliationService.getDoctorAffiliations(mockDoctorUserId, 'history');

    expect(historyResult.length).toBe(2); // INACTIVE and REJECTED preserved in history
    expect(historyResult.map((r) => r.status)).toContain('INACTIVE');
    expect(historyResult.map((r) => r.status)).toContain('REJECTED');
  });
});

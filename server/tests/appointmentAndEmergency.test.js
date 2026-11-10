import { jest } from '@jest/globals';
import { appointmentController } from '../src/controllers/AppointmentController.js';
import { appointmentService } from '../src/services/AppointmentService.js';
import { appointmentRepository } from '../src/repositories/AppointmentRepository.js';
import { emergencyController } from '../src/controllers/EmergencyController.js';
import { emergencyBroadcastService } from '../src/services/EmergencyBroadcastService.js';
import { emergencyMatchingService } from '../src/services/EmergencyMatchingService.js';
import { emergencyRepository } from '../src/repositories/EmergencyRepository.js';
import { organizationRepository } from '../src/repositories/OrganizationRepository.js';
import { resourceRepository } from '../src/repositories/ResourceRepository.js';
import { Doctor } from '../src/models/Doctor.js';

describe('Issue 1: Appointment Cancellation Tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('cancelAppointment handles cancellation with reason and returns clean success response', async () => {
    const mockUpdated = {
      _id: '673123456789abcdef012345',
      appointmentNumber: 'APT-123456',
      status: 'cancelled',
      cancellationReason: 'Need to reschedule',
    };

    jest.spyOn(appointmentService, 'cancelAppointment').mockResolvedValue(mockUpdated);

    const req = {
      params: { id: '673123456789abcdef012345' },
      user: { _id: '673000000000000000000001' },
      body: { reason: 'Need to reschedule' },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await appointmentController.cancelAppointment(req, res, next);

    expect(appointmentService.cancelAppointment).toHaveBeenCalledWith(
      '673123456789abcdef012345',
      '673000000000000000000001',
      'Need to reschedule'
    );
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Appointment cancelled successfully',
      data: mockUpdated,
    });
  });

  test('cancelAppointment supplies default reason if body reason is empty', async () => {
    const mockUpdated = {
      _id: '673123456789abcdef012345',
      status: 'cancelled',
      cancellationReason: 'Cancelled by patient',
    };

    jest.spyOn(appointmentService, 'cancelAppointment').mockResolvedValue(mockUpdated);

    const req = {
      params: { id: 'APT-987654' },
      user: { _id: '673000000000000000000001' },
      body: {},
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await appointmentController.cancelAppointment(req, res, next);

    expect(appointmentService.cancelAppointment).toHaveBeenCalledWith(
      'APT-987654',
      '673000000000000000000001',
      'Cancelled by patient'
    );
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Appointment cancelled successfully',
      data: mockUpdated,
    });
  });

  test('cancelAppointment handles cancellationReason parameter as fallback', async () => {
    const mockUpdated = {
      _id: '673123456789abcdef012345',
      status: 'cancelled',
      cancellationReason: 'Patient emergency',
    };

    jest.spyOn(appointmentService, 'cancelAppointment').mockResolvedValue(mockUpdated);

    const req = {
      params: { id: '673123456789abcdef012345' },
      user: { _id: '673000000000000000000001' },
      body: { cancellationReason: 'Patient emergency' },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await appointmentController.cancelAppointment(req, res, next);

    expect(appointmentService.cancelAppointment).toHaveBeenCalledWith(
      '673123456789abcdef012345',
      '673000000000000000000001',
      'Patient emergency'
    );
  });
});

describe('Issue 2: Emergency Beep and Apex Hospital Broadcast Tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('EmergencyMatchingService finds target organization Apex Metro by name regex', async () => {
    const mockApex = {
      _id: '673000000000000000000099',
      name: 'Apex Metro Trauma & Heart Hospital',
      slug: 'apex-metro',
      emergencyCapable: true,
      isParticipating: true,
      location: { coordinates: [77.2150, 28.6200] },
    };

    jest.spyOn(emergencyMatchingService, 'findTargetOrganization').mockResolvedValue(mockApex);
    jest.spyOn(organizationRepository, 'listAll').mockResolvedValue([mockApex]);
    jest.spyOn(resourceRepository, 'findByOrg').mockResolvedValue([]);
    jest.spyOn(Doctor, 'find').mockReturnValue({
      populate: jest.fn().mockResolvedValue([]),
    });

    const results = await emergencyMatchingService.findSuitableOrganizations(
      [77.2090, 28.6139],
      'cardiac',
      50,
      'Apex Metro Trauma & Heart Hospital'
    );

    expect(results.length).toBeGreaterThan(0);
    const apexMatch = results.find((r) => r.organization.name.includes('Apex Metro'));
    expect(apexMatch).toBeDefined();
    expect(apexMatch.suitabilityScore).toBeGreaterThanOrEqual(95);
  });

  test('EmergencyController.getIncomingForOrganization returns active broadcasts for org', async () => {
    const mockOrg = { _id: '673000000000000000000099', name: 'Apex Metro' };
    const mockBroadcasts = [
      {
        _id: '673999999999999999999991',
        status: 'active',
        responseStatus: 'PENDING',
        emergencyRequestId: {
          _id: '673888888888888888888881',
          patientName: 'Alex Mercer',
          emergencyType: 'cardiac',
        },
      },
    ];

    jest.spyOn(organizationRepository, 'findByUserId').mockResolvedValue(mockOrg);
    jest.spyOn(emergencyRepository, 'listActiveBroadcastsForOrg').mockResolvedValue(mockBroadcasts);

    const req = {
      user: { _id: '673000000000000000000002', role: 'organization' },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await emergencyController.getIncomingForOrganization(req, res, next);

    expect(organizationRepository.findByUserId).toHaveBeenCalledWith('673000000000000000000002');
    expect(emergencyRepository.listActiveBroadcastsForOrg).toHaveBeenCalledWith('673000000000000000000099');
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      count: 1,
      data: mockBroadcasts,
    });
  });

  test('activateEmergencyBeep passes targetFacility to matching service', async () => {
    jest.spyOn(emergencyBroadcastService, 'activateEmergencyBeep').mockResolvedValue({
      emergencyRequest: { _id: '673888888888888888888881', status: 'BROADCASTED' },
      broadcasts: [{ _id: '673999999999999999999991', status: 'active' }],
      suitableOrganizations: [{ organization: { name: 'Apex Metro' } }],
    });

    const req = {
      user: { _id: '673000000000000000000001', name: 'Alex Mercer', phone: '+1-555-0199' },
      body: {
        emergencyType: 'cardiac',
        severity: 'critical',
        description: 'Severe chest pain',
        targetFacility: 'Apex Metro Trauma & Heart Hospital',
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await emergencyController.activateEmergencyBeep(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(emergencyBroadcastService.activateEmergencyBeep).toHaveBeenCalledWith(
      expect.objectContaining({
        targetFacility: 'Apex Metro Trauma & Heart Hospital',
        patientName: 'Alex Mercer',
        emergencyType: 'cardiac',
      })
    );
  });
});

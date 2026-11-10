import { emergencyBroadcastService } from '../services/EmergencyBroadcastService.js';
import { resourceReservationService } from '../services/ResourceReservationService.js';
import { emergencyRepository } from '../repositories/EmergencyRepository.js';
import { organizationRepository } from '../repositories/OrganizationRepository.js';

export class EmergencyController {
  async activateEmergencyBeep(req, res, next) {
    try {
      const {
        emergencyType,
        severity,
        description,
        coordinates,
        locationAddress,
        ambulanceRequirement,
        patientName,
        patientPhone,
      } = req.body;

      const result = await emergencyBroadcastService.activateEmergencyBeep({
        patientId: req.user._id,
        patientName: patientName || req.user.name,
        patientPhone: patientPhone || req.user.phone || '9999999999',
        emergencyType,
        severity,
        description,
        coordinates: coordinates || [77.2090, 28.6139],
        locationAddress,
        ambulanceRequirement,
      });

      res.status(201).json({
        success: true,
        message: 'Emergency Beep broadcast initiated in parallel',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getEmergencyDetails(req, res, next) {
    try {
      const emergency = await emergencyRepository.findRequestById(req.params.id);
      if (!emergency) {
        return res.status(404).json({ success: false, message: 'Emergency request not found' });
      }
      const broadcasts = await emergencyRepository.getBroadcastsForRequest(emergency._id);

      res.json({
        success: true,
        data: {
          emergency,
          broadcasts,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async getResponses(req, res, next) {
    try {
      const responses = await emergencyBroadcastService.getResponses(req.params.id);
      res.json({ success: true, count: responses.length, data: responses });
    } catch (err) {
      next(err);
    }
  }

  async respondToBroadcast(req, res, next) {
    try {
      const org = await organizationRepository.findByUserId(req.user._id);
      if (!org) {
        return res.status(403).json({ success: false, message: 'Only registered organizations can respond' });
      }

      const { responseStatus, offeredResources, declineReason } = req.body;
      const updated = await emergencyBroadcastService.handleOrganizationResponse({
        emergencyRequestId: req.params.id,
        organizationId: org._id,
        responseStatus,
        offeredResources,
        declineReason,
      });

      res.json({ success: true, message: `Response ${responseStatus} submitted`, data: updated });
    } catch (err) {
      next(err);
    }
  }

  async selectDestination(req, res, next) {
    try {
      const { organizationId } = req.body;
      const updated = await resourceReservationService.selectDestination(
        req.params.id,
        organizationId,
        req.user._id
      );

      res.json({
        success: true,
        message: 'Destination hospital selected successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async confirmAndReserve(req, res, next) {
    try {
      const org = await organizationRepository.findByUserId(req.user._id);
      if (!org) {
        return res.status(403).json({ success: false, message: 'Only the selected organization can confirm and reserve' });
      }

      const { resourceType } = req.body;
      const result = await resourceReservationService.confirmAndReserveResource(
        req.params.id,
        org._id,
        resourceType || 'er_bay'
      );

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async markPatientEnRoute(req, res, next) {
    try {
      const updated = await resourceReservationService.markPatientEnRoute(req.params.id, req.user._id);
      res.json({ success: true, message: 'Patient en route status updated', data: updated });
    } catch (err) {
      next(err);
    }
  }

  async markPatientArrived(req, res, next) {
    try {
      const org = await organizationRepository.findByUserId(req.user._id);
      if (!org) {
        return res.status(403).json({ success: false, message: 'Only hospital staff can mark patient arrival' });
      }

      const updated = await resourceReservationService.markPatientArrived(req.params.id, org._id);
      res.json({ success: true, message: 'Patient arrival confirmed and resource allocated', data: updated });
    } catch (err) {
      next(err);
    }
  }

  async cancelEmergency(req, res, next) {
    try {
      const { reason } = req.body;
      const updated = await resourceReservationService.cancelEmergency(req.params.id, reason);
      res.json({ success: true, message: 'Emergency cancelled and resources released', data: updated });
    } catch (err) {
      next(err);
    }
  }

  async listMyEmergencies(req, res, next) {
    try {
      let emergencies = [];
      if (req.user.role === 'patient') {
        emergencies = await emergencyRepository.listRequestsForPatient(req.user._id);
      } else if (req.user.role === 'admin') {
        emergencies = await emergencyRepository.listAllRequests();
      }

      res.json({ success: true, count: emergencies.length, data: emergencies });
    } catch (err) {
      next(err);
    }
  }
}

export const emergencyController = new EmergencyController();


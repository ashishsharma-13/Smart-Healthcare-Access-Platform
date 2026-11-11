import { emergencyBroadcastService } from '../services/EmergencyBroadcastService.js';
import { emergencyMatchingService } from '../services/EmergencyMatchingService.js';
import { resourceReservationService } from '../services/ResourceReservationService.js';
import { emergencyRepository } from '../repositories/EmergencyRepository.js';
import { organizationRepository } from '../repositories/OrganizationRepository.js';

export class EmergencyController {
  async getNearbyFacilities(req, res, next) {
    try {
      const { lat, lng, latitude, longitude, condition, emergencyType, radius } = req.query;
      const patientCoords = [
        parseFloat(lng ?? longitude ?? 77.2090),
        parseFloat(lat ?? latitude ?? 28.6139),
      ];
      const selectedCondition = condition || emergencyType || 'cardiac';
      const rad = parseFloat(radius) || 50;

      const facilities = await emergencyMatchingService.getNearbyFacilities({
        patientCoords,
        condition: selectedCondition,
        radius: rad,
      });

      res.json({
        success: true,
        count: facilities.length,
        data: facilities,
        message: facilities.length === 0
          ? 'No emergency-enabled healthcare facilities found within range.'
          : 'Nearby emergency facilities retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async dispatchEmergency(req, res, next) {
    try {
      const {
        emergencyId,
        condition,
        emergencyType,
        severity,
        description,
        coordinates,
        locationAddress,
        ambulanceRequirement,
        patientDetails,
        hospitalIds,
      } = req.body;

      const user = req.user || {};
      const result = await emergencyBroadcastService.dispatchEmergencyBeep({
        emergencyId,
        patientId: user._id,
        patientDetails: {
          name: patientDetails?.name || user.name || 'Emergency Patient',
          phone: patientDetails?.phone || user.phone || '9999999999',
          ...patientDetails,
        },
        condition: condition || emergencyType || 'cardiac',
        severity: severity || 'critical',
        description: description || '',
        coordinates: coordinates || [77.2090, 28.6139],
        locationAddress: locationAddress || 'Current GPS Location',
        ambulanceRequirement: ambulanceRequirement || 'no',
        hospitalIds: hospitalIds || [],
      });

      res.status(201).json({
        success: true,
        message: `Emergency Beep dispatched to ${result.targetedCount} hospital(s)`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

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
        targetFacility,
        targetHospital,
        organizationId,
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
        targetFacility: targetFacility || targetHospital || organizationId,
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

  async getIncomingForOrganization(req, res, next) {
    try {
      const org = await organizationRepository.findByUserId(req.user._id);
      if (!org) {
        return res.status(403).json({ success: false, message: 'Only registered organizations can fetch incoming broadcasts' });
      }

      const broadcasts = await emergencyRepository.listActiveBroadcastsForOrg(org._id);
      res.json({
        success: true,
        count: broadcasts.length,
        data: broadcasts,
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

import { emergencyBroadcastService } from '../services/EmergencyBroadcastService.js';
import { emergencyMatchingService } from '../services/EmergencyMatchingService.js';
import { resourceReservationService } from '../services/ResourceReservationService.js';
import { emergencyRepository } from '../repositories/EmergencyRepository.js';
import { organizationRepository } from '../repositories/OrganizationRepository.js';
import { emergencyRequestService } from '../services/EmergencyRequestService.js';

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

  // --- MODULE 8: EMERGENCY MODE & REQUEST CREATION METHODS ---
  async getCategories(req, res, next) {
    try {
      const categories = await emergencyRequestService.getCategories(req.query.all === 'true');
      res.json({
        success: true,
        count: categories.length,
        data: categories,
      });
    } catch (err) {
      next(err);
    }
  }

  async getGuidance(req, res, next) {
    try {
      const result = await emergencyRequestService.getGuidanceForCategory(req.params.categoryId);
      res.json({
        success: true,
        available: result.available,
        category: result.category,
        data: result.guidance,
      });
    } catch (err) {
      next(err);
    }
  }

  async createEmergencyRequest(req, res, next) {
    try {
      const {
        categoryId,
        categorySlug,
        categoryName,
        emergencyCategoryId,
        emergencyType,
        description,
        ambulanceRequirement,
        latitude,
        longitude,
        lat,
        lng,
        address,
        locationAddress,
        locationAccuracy,
        locationSource,
        locationConfirmed,
        patientDetails,
        idempotencyKey,
      } = req.body;

      const result = await emergencyRequestService.createEmergencyRequest({
        user: req.user,
        categoryId: categoryId || emergencyCategoryId,
        categorySlug: categorySlug || emergencyType,
        categoryName,
        description,
        ambulanceRequirement,
        latitude: latitude !== undefined ? latitude : lat,
        longitude: longitude !== undefined ? longitude : lng,
        address: address || locationAddress,
        locationAccuracy,
        locationSource,
        locationConfirmed,
        patientDetails,
        idempotencyKey,
      });

      const statusCode = result.isDuplicate ? 200 : 201;
      res.status(statusCode).json({
        success: true,
        message: result.message,
        isDuplicate: result.isDuplicate,
        emergencyRequestId: result.emergencyRequest.emergencyRequestId || result.emergencyRequest.requestCode,
        data: result.emergencyRequest,
      });
    } catch (err) {
      next(err);
    }
  }

  async getMyEmergencyRequests(req, res, next) {
    try {
      const requests = await emergencyRequestService.getMyRequests(req.user._id);
      res.json({
        success: true,
        count: requests.length,
        data: requests,
      });
    } catch (err) {
      next(err);
    }
  }

  async getEmergencyRequestDetails(req, res, next) {
    try {
      const result = await emergencyRequestService.getRequestById(req.params.id, req.user);
      res.json({
        success: true,
        data: result.request,
        events: result.events,
        broadcasts: result.broadcasts,
      });
    } catch (err) {
      next(err);
    }
  }

  async cancelEmergencyRequest(req, res, next) {
    try {
      const { reason } = req.body;
      const updated = await emergencyRequestService.cancelRequest(req.params.id, req.user, reason);
      res.json({
        success: true,
        message: 'Emergency request cancelled successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  // --- Admin Emergency Categories & Guidance Management ---
  async adminGetCategories(req, res, next) {
    try {
      const categories = await emergencyRequestService.adminListCategories();
      res.json({ success: true, count: categories.length, data: categories });
    } catch (err) {
      next(err);
    }
  }

  async adminCreateCategory(req, res, next) {
    try {
      const category = await emergencyRequestService.adminCreateCategory(req.user, req.body);
      res.status(201).json({ success: true, message: 'Emergency category created', data: category });
    } catch (err) {
      next(err);
    }
  }

  async adminUpdateCategory(req, res, next) {
    try {
      const category = await emergencyRequestService.adminUpdateCategory(req.user, req.params.id, req.body);
      res.json({ success: true, message: 'Emergency category updated', data: category });
    } catch (err) {
      next(err);
    }
  }

  async adminGetGuidance(req, res, next) {
    try {
      const guidance = await emergencyRequestService.adminListGuidance(req.query);
      res.json({ success: true, count: guidance.length, data: guidance });
    } catch (err) {
      next(err);
    }
  }

  async adminCreateGuidance(req, res, next) {
    try {
      const guidance = await emergencyRequestService.adminCreateGuidance(req.user, req.body);
      res.status(201).json({ success: true, message: 'Emergency guidance created', data: guidance });
    } catch (err) {
      next(err);
    }
  }

  async adminUpdateGuidance(req, res, next) {
    try {
      const guidance = await emergencyRequestService.adminUpdateGuidance(req.user, req.params.id, req.body);
      res.json({ success: true, message: 'Emergency guidance updated', data: guidance });
    } catch (err) {
      next(err);
    }
  }

  async adminApproveGuidance(req, res, next) {
    try {
      const guidance = await emergencyRequestService.adminApproveGuidance(req.user, req.params.id);
      res.json({ success: true, message: 'Emergency guidance approved and published', data: guidance });
    } catch (err) {
      next(err);
    }
  }
}

export const emergencyController = new EmergencyController();

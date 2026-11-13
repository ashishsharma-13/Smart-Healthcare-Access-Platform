import { emergencyFallbackService } from '../services/EmergencyFallbackService.js';
import { externalFacilityDiscoveryService } from '../services/ExternalFacilityDiscoveryService.js';
import { externalFacilityDirectoryService } from '../services/ExternalFacilityDirectoryService.js';
import { fallbackRecommendationService } from '../services/FallbackRecommendationService.js';
import { destinationRecoveryService } from '../services/DestinationRecoveryService.js';
import { emergencyFallbackRepository } from '../repositories/EmergencyFallbackRepository.js';
import { EmergencyRequest } from '../models/EmergencyRequest.js';

export class EmergencyFallbackController {
  // Helper to validate patient ownership or staff/admin
  async validateRequestAccess(requestId, user) {
    if (!user) return true; // Internal or service-to-service
    if (['admin', 'SYSTEM_ADMIN'].includes(user.role)) return true;

    const reqDoc = await EmergencyRequest.findById(requestId).exec();
    if (!reqDoc) {
      const err = new Error('Emergency request not found');
      err.statusCode = 404;
      throw err;
    }

    if (
      user.role === 'patient' &&
      reqDoc.patientId.toString() !== user._id.toString() &&
      reqDoc.reportedByUserId?.toString() !== user._id.toString()
    ) {
      const err = new Error('Unauthorized: You do not own this emergency request');
      err.statusCode = 403;
      throw err;
    }
    return true;
  }

  // --- INTERNAL APIS ---

  async startFallback(req, res, next) {
    try {
      const { requestId } = req.params;
      const { reason = 'NO_CANDIDATES_FOUND' } = req.body;
      const result = await emergencyFallbackService.startFallbackSession({
        emergencyRequestId: requestId,
        reason,
        actorId: req.user?._id || null,
      });
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async expandSearch(req, res, next) {
    try {
      const { requestId } = req.params;
      const result = await emergencyFallbackService.expandSearch({
        emergencyRequestId: requestId,
        actorId: req.user?._id || null,
      });
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getFallbackStatus(req, res, next) {
    try {
      const { requestId } = req.params;
      const result = await emergencyFallbackService.getFallbackStatus(requestId);
      return res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async getSearchHistory(req, res, next) {
    try {
      const { requestId } = req.params;
      const searches = await emergencyFallbackService.getSearchHistory(requestId);
      return res.status(200).json({ success: true, count: searches.length, searches });
    } catch (err) {
      next(err);
    }
  }

  async completeFallback(req, res, next) {
    try {
      const { requestId } = req.params;
      const { outcome = 'RESOLVED' } = req.body;
      const result = await emergencyFallbackService.completeFallbackSession({
        emergencyRequestId: requestId,
        outcome,
        actorId: req.user?._id || null,
      });
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  // --- PATIENT / EMERGENCY APIS ---

  async getExternalFacilities(req, res, next) {
    try {
      const { requestId } = req.params;
      const { radiusKm = 80, limit = 10 } = req.query;

      const emergencyReq = await EmergencyRequest.findById(requestId).exec();
      if (!emergencyReq) {
        return res.status(404).json({ success: false, message: 'Emergency request not found' });
      }

      const coords = (emergencyReq.location?.coordinates && (emergencyReq.location.coordinates[0] !== 0 || emergencyReq.location.coordinates[1] !== 0))
        ? emergencyReq.location.coordinates
        : (emergencyReq.locationSnapshot?.coordinates && (emergencyReq.locationSnapshot.coordinates[0] !== 0 || emergencyReq.locationSnapshot.coordinates[1] !== 0))
        ? emergencyReq.locationSnapshot.coordinates
        : (emergencyReq.longitude != null && emergencyReq.latitude != null)
        ? [emergencyReq.longitude, emergencyReq.latitude]
        : [77.2090, 28.6139];

      const facilities = await externalFacilityDiscoveryService.discoverExternalFacilities({
        coordinates: coords,
        radiusKm: Number(radiusKm) || 80,
        limit: Number(limit) || 10,
        emergencyType: emergencyReq.emergencyType,
      });

      return res.status(200).json({
        success: true,
        count: facilities.length,
        disclaimer:
          'Mandatory Notice: Live bed and specialist availability is UNCONFIRMED for external facilities. Dispatching call to Emergency Services (112/108).',
        facilities,
      });
    } catch (err) {
      next(err);
    }
  }

  async getExternalFacilityById(req, res, next) {
    try {
      const { facilityId } = req.params;
      const facility = await externalFacilityDirectoryService.getFacilityById(facilityId);
      return res.status(200).json({
        success: true,
        facility,
        disclaimer: 'Live bed availability cannot be confirmed for external healthcare centers.',
      });
    } catch (err) {
      next(err);
    }
  }

  async getFallbackOptions(req, res, next) {
    try {
      const { requestId } = req.params;
      const result = await fallbackRecommendationService.getFallbackOptions(requestId);
      return res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async selectExternalFacility(req, res, next) {
    try {
      const { requestId } = req.params;
      const { externalFacilityId } = req.body;

      if (!externalFacilityId) {
        return res.status(400).json({ success: false, message: 'externalFacilityId is required' });
      }

      if (req.user) {
        await this.validateRequestAccess(requestId, req.user);
      }

      const result = await emergencyFallbackService.selectExternalFacility({
        emergencyRequestId: requestId,
        externalFacilityId,
        patientUserId: req.user?._id || null,
      });

      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async retryMatching(req, res, next) {
    try {
      const { requestId } = req.params;
      if (req.user) {
        await this.validateRequestAccess(requestId, req.user);
      }

      const result = await emergencyFallbackService.retryMatching({
        emergencyRequestId: requestId,
        actorId: req.user?._id || null,
      });

      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async changeDestination(req, res, next) {
    try {
      const { requestId } = req.params;
      const { newOrganizationId, newExternalFacilityId, reason = 'Patient reroute' } = req.body;

      if (req.user) {
        await this.validateRequestAccess(requestId, req.user);
      }

      const result = await destinationRecoveryService.switchDestination({
        emergencyRequestId: requestId,
        newOrganizationId,
        newExternalFacilityId,
        actorId: req.user?._id || null,
        reason,
      });

      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getRecoveryStatus(req, res, next) {
    try {
      const { requestId } = req.params;
      const result = await destinationRecoveryService.getRecoveryStatus(requestId);
      return res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  // --- ADMIN GOVERNANCE APIS ---

  async listActiveSessions(req, res, next) {
    try {
      const sessions = await emergencyFallbackRepository.listActiveSessions();
      return res.status(200).json({ success: true, count: sessions.length, sessions });
    } catch (err) {
      next(err);
    }
  }

  async getMonitoringKPIs(req, res, next) {
    try {
      const kpis = await emergencyFallbackService.getMonitoringKPIs();
      return res.status(200).json({ success: true, ...kpis });
    } catch (err) {
      next(err);
    }
  }

  async listExternalFacilities(req, res, next) {
    try {
      await externalFacilityDirectoryService.seedDefaultExternalFacilities();
      const facilities = await externalFacilityDirectoryService.listFacilities();
      return res.status(200).json({ success: true, count: facilities.length, facilities });
    } catch (err) {
      next(err);
    }
  }

  async createExternalFacility(req, res, next) {
    try {
      const facility = await externalFacilityDirectoryService.registerFacility(req.body);
      return res.status(201).json({ success: true, facility });
    } catch (err) {
      next(err);
    }
  }

  async updateExternalFacility(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await externalFacilityDirectoryService.updateFacility(id, req.body);
      return res.status(200).json({ success: true, facility: updated });
    } catch (err) {
      next(err);
    }
  }
}

export const emergencyFallbackController = new EmergencyFallbackController();

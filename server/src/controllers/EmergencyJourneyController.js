import { emergencyJourneyService } from '../services/EmergencyJourneyService.js';
import { Organization } from '../models/Organization.js';
import { EmergencyRequest } from '../models/EmergencyRequest.js';

export class EmergencyJourneyController {
  /**
   * Helper to resolve organizationId for the authenticated user
   */
  async _resolveOrgId(user) {
    if (user.organizationId) {
      return user.organizationId;
    }
    const org = await Organization.findOne({ userId: user._id }).exec();
    return org ? org._id : null;
  }

  /**
   * POST /api/emergency/requests/:requestId/journey/start
   */
  async startJourney(req, res) {
    try {
      const { requestId } = req.params;
      const { initialLocation } = req.body || {};
      const result = await emergencyJourneyService.startJourney({
        emergencyRequestId: requestId,
        patientUserId: req.user._id,
        initialCoords: initialLocation,
      });

      return res.status(200).json({
        success: true,
        message: 'Patient emergency journey initiated successfully.',
        data: result,
      });
    } catch (err) {
      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message,
      });
    }
  }

  /**
   * GET /api/emergency/requests/:requestId/journey
   */
  async getJourney(req, res) {
    try {
      const { requestId } = req.params;
      const journey = await emergencyJourneyService.getJourney(requestId);
      if (!journey) {
        return res.status(404).json({
          success: false,
          message: 'No journey record found for this emergency request.',
        });
      }

      return res.status(200).json({
        success: true,
        data: journey,
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message,
      });
    }
  }

  /**
   * POST /api/emergency/requests/:requestId/journey/location
   */
  async recordLocationUpdate(req, res) {
    try {
      const { requestId } = req.params;
      const { latitude, longitude, accuracyMeters, speed, heading, isSharingLocation } = req.body;

      const result = await emergencyJourneyService.recordLocationUpdate({
        emergencyRequestId: requestId,
        userId: req.user._id,
        latitude: Number(latitude),
        longitude: Number(longitude),
        accuracyMeters: accuracyMeters != null ? Number(accuracyMeters) : null,
        speed: speed != null ? Number(speed) : null,
        heading: heading != null ? Number(heading) : null,
        isSharingLocation,
      });

      return res.status(200).json({
        success: true,
        message: 'Location telemetry updated.',
        data: result,
      });
    } catch (err) {
      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message,
      });
    }
  }

  /**
   * GET /api/emergency/requests/:requestId/journey/location
   */
  async getLatestLocation(req, res) {
    try {
      const { requestId } = req.params;
      const journey = await emergencyJourneyService.getJourney(requestId);
      if (!journey) {
        return res.status(404).json({
          success: false,
          message: 'Journey not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          isSharingLocation: journey.isSharingLocation,
          lastKnownLocation: journey.lastKnownLocation,
          destinationLocation: journey.destinationLocation,
          googleMapsUrl: journey.googleMapsUrl,
          status: journey.status,
        },
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message,
      });
    }
  }

  /**
   * POST /api/emergency/requests/:requestId/journey/stop-sharing
   */
  async stopLocationSharing(req, res) {
    try {
      const { requestId } = req.params;
      const result = await emergencyJourneyService.stopLocationSharing({
        emergencyRequestId: requestId,
        userId: req.user._id,
      });

      return res.status(200).json(result);
    } catch (err) {
      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message,
      });
    }
  }

  /**
   * POST /api/emergency/requests/:requestId/journey/confirm-arrival
   */
  async confirmPatientArrival(req, res) {
    try {
      const { requestId } = req.params;
      const { notes } = req.body || {};
      const result = await emergencyJourneyService.confirmPatientArrival({
        emergencyRequestId: requestId,
        patientUserId: req.user._id,
        notes,
      });

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
        ...result,
      });
    } catch (err) {
      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message,
      });
    }
  }

  /**
   * GET /api/emergency/requests/:requestId/history
   */
  async getEmergencyHistory(req, res) {
    try {
      const { requestId } = req.params;
      const data = await emergencyJourneyService.getEmergencyHistory(requestId);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message,
      });
    }
  }

  /**
   * GET /api/organizations/me/incoming-patients
   */
  async getIncomingPatients(req, res) {
    try {
      const orgId = await this._resolveOrgId(req.user);
      if (!orgId) {
        return res.status(403).json({
          success: false,
          message: 'User does not belong to a registered healthcare organization.',
        });
      }

      const list = await emergencyJourneyService.getIncomingPatients(orgId);
      return res.status(200).json({
        success: true,
        data: list,
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message,
      });
    }
  }

  /**
   * GET /api/organizations/me/incoming-patients/:requestId
   */
  async getIncomingPatientDetails(req, res) {
    try {
      const { requestId } = req.params;
      const orgId = await this._resolveOrgId(req.user);
      if (!orgId) {
        return res.status(403).json({
          success: false,
          message: 'User does not belong to a registered healthcare organization.',
        });
      }

      const history = await emergencyJourneyService.getEmergencyHistory(requestId);
      return res.status(200).json({
        success: true,
        data: history,
      });
    } catch (err) {
      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message,
      });
    }
  }

  /**
   * POST /api/organizations/me/emergency-requests/:requestId/verify-arrival
   */
  async verifyStaffArrival(req, res) {
    try {
      const { requestId } = req.params;
      const { verificationMethod, notes } = req.body || {};
      const orgId = await this._resolveOrgId(req.user);
      if (!orgId) {
        return res.status(403).json({
          success: false,
          message: 'User does not belong to an organization.',
        });
      }

      const result = await emergencyJourneyService.verifyStaffArrival({
        emergencyRequestId: requestId,
        organizationId: orgId,
        staffUserId: req.user._id,
        verificationMethod,
        notes,
      });

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
        ...result,
      });
    } catch (err) {
      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message,
      });
    }
  }

  /**
   * POST /api/organizations/me/reservations/:reservationId/allocate
   */
  async allocateResource(req, res) {
    try {
      const { reservationId } = req.params;
      const { reservationItemId, allocatedQuantity, allocationStatus, remarks } = req.body || {};

      const orgId = await this._resolveOrgId(req.user);
      if (!orgId) {
        return res.status(403).json({
          success: false,
          message: 'User does not belong to an organization.',
        });
      }

      const result = await emergencyJourneyService.allocateResource({
        reservationId,
        organizationId: orgId,
        staffUserId: req.user._id,
        reservationItemId,
        allocatedQuantity: allocatedQuantity != null ? Number(allocatedQuantity) : 1,
        allocationStatus: allocationStatus || 'ALLOCATED',
        remarks,
      });

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
        ...result,
      });
    } catch (err) {
      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message,
      });
    }
  }

  /**
   * GET /api/organizations/me/reservations/:reservationId/allocations
   */
  async getAllocations(req, res) {
    try {
      const { reservationId } = req.params;
      const orgId = await this._resolveOrgId(req.user);

      const allocations = await emergencyJourneyService.getAllocations(reservationId, orgId);
      return res.status(200).json({
        success: true,
        data: allocations,
      });
    } catch (err) {
      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message,
      });
    }
  }

  /**
   * POST /api/emergency/requests/:requestId/complete
   */
  async completeEmergency(req, res) {
    try {
      const { requestId } = req.params;
      const { notes } = req.body || {};
      const result = await emergencyJourneyService.completeEmergency({
        emergencyRequestId: requestId,
        actorUserId: req.user._id,
        notes,
      });

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
        ...result,
      });
    } catch (err) {
      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message,
      });
    }
  }
}

export const emergencyJourneyController = new EmergencyJourneyController();

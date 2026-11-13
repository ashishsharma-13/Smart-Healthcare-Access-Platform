import { Organization, EmergencyRequest, ResourceReservation } from '../models/index.js';
import { destinationSelectionService } from '../services/DestinationSelectionService.js';
import { destinationSelectionRepository } from '../repositories/DestinationSelectionRepository.js';
import { resourceRepository } from '../repositories/ResourceRepository.js';

export class DestinationReservationController {
  async getOrgIdForUser(req) {
    if (req.user?.organizationId) return req.user.organizationId;
    if (req.organization?._id) return req.organization._id;
    if (!req.user?._id) return null;
    const org = await Organization.findOne({ userId: req.user._id }).exec();
    if (org) return org._id;
    // Also check if req.user._id is the organization document itself
    const directOrg = await Organization.findById(req.user._id).exec();
    return directOrg?._id || null;
  }

  // ── PATIENT DESTINATION APIS ──────────────────────────────────────────────

  /**
   * GET /api/emergency/requests/:requestId/accepted-organizations
   */
  async getAcceptedOrganizations(req, res, next) {
    try {
      const { requestId } = req.params;
      const accepted = await destinationSelectionService.getAcceptedOrganizations(requestId);
      res.json({
        success: true,
        data: accepted,
        count: accepted.length,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/emergency/requests/:requestId/recommendation
   */
  async getRecommendation(req, res, next) {
    try {
      const { requestId } = req.params;
      const recommendation = await destinationSelectionService.getRecommendedDestination(requestId);
      res.json({
        success: true,
        data: recommendation,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/emergency/requests/:requestId/select-destination
   */
  async selectDestination(req, res, next) {
    try {
      const { requestId } = req.params;
      const { organizationId, selectionSource = 'USER' } = req.body;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'organizationId is required',
        });
      }

      const result = await destinationSelectionService.selectDestination({
        emergencyRequestId: requestId,
        organizationId,
        userId: req.user?._id,
        source: selectionSource,
      });

      res.status(201).json({
        success: true,
        message: 'Destination selected. Requesting final organization confirmation.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/emergency/requests/:requestId/destination
   */
  async getDestination(req, res, next) {
    try {
      const { requestId } = req.params;
      const selection = await destinationSelectionRepository.findActiveSelectionForRequest(requestId);
      const history = await destinationSelectionRepository.getSelectionHistory(requestId);

      res.json({
        success: true,
        data: {
          currentSelection: selection,
          selectionHistory: history,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/emergency/requests/:requestId/reservation
   */
  async getReservation(req, res, next) {
    try {
      const { requestId } = req.params;
      const reservation = await resourceRepository.findActiveReservationForRequest(requestId);
      let items = [];
      if (reservation) {
        items = await resourceRepository.getReservationItems(reservation._id);
      }

      res.json({
        success: true,
        data: reservation
          ? {
              ...reservation.toObject(),
              items,
            }
          : null,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/emergency/requests/:requestId/confirm-en-route
   */
  async confirmEnRoute(req, res, next) {
    try {
      const { requestId } = req.params;
      const result = await destinationSelectionService.confirmPatientEnRoute(requestId, req.user?._id);

      res.json({
        success: true,
        message: 'Patient confirmed en route to destination facility.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // ── ORGANIZATION CONFIRMATION APIS ────────────────────────────────────────

  /**
   * GET /api/organizations/me/destination-confirmations
   */
  async getOrgDestinationConfirmations(req, res, next) {
    try {
      const orgId = await this.getOrgIdForUser(req);
      if (!orgId) {
        return res.status(403).json({
          success: false,
          message: 'Authenticated user is not linked to an organization profile',
        });
      }

      const pendingList = await destinationSelectionRepository.listPendingForOrg(orgId);
      res.json({
        success: true,
        data: pendingList,
        count: pendingList.length,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/organizations/me/destination-confirmations/:selectionId
   */
  async getOrgDestinationConfirmationDetails(req, res, next) {
    try {
      const orgId = await this.getOrgIdForUser(req);
      const { selectionId } = req.params;

      const selection = await destinationSelectionRepository.findSelectionById(selectionId);
      if (!selection) {
        return res.status(404).json({
          success: false,
          message: 'Destination selection not found',
        });
      }

      if (orgId && selection.organizationId._id.toString() !== orgId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access to this destination selection',
        });
      }

      res.json({
        success: true,
        data: selection,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/organizations/me/destination-confirmations/:selectionId/confirm
   */
  async confirmDestination(req, res, next) {
    try {
      const orgId = await this.getOrgIdForUser(req);
      if (!orgId) {
        return res.status(403).json({
          success: false,
          message: 'Authenticated user is not linked to an organization',
        });
      }

      const { selectionId } = req.params;
      const { requiredResources = [] } = req.body;

      const result = await destinationSelectionService.confirmDestination({
        selectionId,
        organizationId: orgId,
        userId: req.user?._id,
        requiredResources,
      });

      res.json({
        success: true,
        message: result.message || 'Destination confirmed and resources temporarily reserved for 15 minutes.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/organizations/me/destination-confirmations/:selectionId/decline
   */
  async declineDestination(req, res, next) {
    try {
      const orgId = await this.getOrgIdForUser(req);
      if (!orgId) {
        return res.status(403).json({
          success: false,
          message: 'Authenticated user is not linked to an organization',
        });
      }

      const { selectionId } = req.params;
      const { reason } = req.body;

      const result = await destinationSelectionService.declineDestination({
        selectionId,
        organizationId: orgId,
        userId: req.user?._id,
        reason,
      });

      res.json({
        success: true,
        message: 'Destination confirmation declined.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // ── ORGANIZATION RESERVATION MANAGEMENT APIS ──────────────────────────────

  /**
   * GET /api/organizations/me/reservations
   */
  async getOrgReservations(req, res, next) {
    try {
      const orgId = await this.getOrgIdForUser(req);
      if (!orgId) {
        return res.status(403).json({
          success: false,
          message: 'Authenticated user is not linked to an organization',
        });
      }

      const { status } = req.query;
      const filters = status ? { status } : {};
      const reservations = await resourceRepository.findReservationsForOrg(orgId, filters);

      res.json({
        success: true,
        data: reservations,
        count: reservations.length,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/organizations/me/reservations/:reservationId
   */
  async getOrgReservationDetails(req, res, next) {
    try {
      const orgId = await this.getOrgIdForUser(req);
      const { reservationId } = req.params;

      const reservation = await resourceRepository.findReservationById(reservationId);
      if (!reservation) {
        return res.status(404).json({
          success: false,
          message: 'Reservation not found',
        });
      }

      if (orgId && reservation.organizationId._id.toString() !== orgId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access to this reservation',
        });
      }

      const items = await resourceRepository.getReservationItems(reservation._id);

      res.json({
        success: true,
        data: {
          ...reservation.toObject(),
          items,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/organizations/me/reservations/:reservationId/mark-arrived
   */
  async markPatientArrived(req, res, next) {
    try {
      const orgId = await this.getOrgIdForUser(req);
      if (!orgId) {
        return res.status(403).json({
          success: false,
          message: 'Authenticated user is not linked to an organization',
        });
      }

      const { reservationId } = req.params;
      const result = await destinationSelectionService.markPatientArrived({
        reservationId,
        organizationId: orgId,
        userId: req.user?._id,
      });

      res.json({
        success: true,
        message: 'Patient arrival confirmed. Ready for bed allocation.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/organizations/me/reservations/:reservationId/allocate
   */
  async allocateReservation(req, res, next) {
    try {
      const orgId = await this.getOrgIdForUser(req);
      if (!orgId) {
        return res.status(403).json({
          success: false,
          message: 'Authenticated user is not linked to an organization',
        });
      }

      const { reservationId } = req.params;
      const result = await destinationSelectionService.allocateResources({
        reservationId,
        organizationId: orgId,
        userId: req.user?._id,
      });

      res.json({
        success: true,
        message: 'Resources allocated. Emergency request marked COMPLETED.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // ── INTERNAL APIS ─────────────────────────────────────────────────────────

  /**
   * POST /api/internal/reservations/:selectionId/create
   */
  async internalCreateReservation(req, res, next) {
    try {
      const { selectionId } = req.params;
      const { organizationId, requiredResources } = req.body;

      const selection = await destinationSelectionRepository.findSelectionById(selectionId);
      if (!selection) {
        return res.status(404).json({
          success: false,
          message: 'Selection not found',
        });
      }

      const targetOrgId = organizationId || selection.organizationId._id;
      const result = await destinationSelectionService.confirmDestination({
        selectionId,
        organizationId: targetOrgId,
        userId: req.user?._id,
        requiredResources,
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/internal/reservations/:reservationId/expire
   */
  async internalExpireReservation(req, res, next) {
    try {
      const { reservationId } = req.params;
      const { reason = 'Hold time expired' } = req.body;

      const result = await destinationSelectionService.releaseReservation({
        reservationId,
        reason,
        actorId: req.user?._id,
      });

      res.json({
        success: true,
        message: 'Reservation expired and held resources released.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/internal/reservations/:reservationId/release
   */
  async internalReleaseReservation(req, res, next) {
    try {
      const { reservationId } = req.params;
      const { reason = 'Administrative cancellation' } = req.body;

      const result = await destinationSelectionService.releaseReservation({
        reservationId,
        reason,
        actorId: req.user?._id,
      });

      res.json({
        success: true,
        message: 'Reservation released.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const destinationReservationController = new DestinationReservationController();

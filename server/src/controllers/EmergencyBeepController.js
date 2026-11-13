import mongoose from 'mongoose';
import { emergencyBeepService } from '../services/EmergencyBeepService.js';
import { emergencyBroadcastRepository } from '../repositories/EmergencyBroadcastRepository.js';
import { Organization } from '../models/Organization.js';

export class EmergencyBeepController {
  /**
   * Helper to resolve organizationId for the authenticated user
   */
  async getOrgIdForUser(req) {
    if (req.user?.organizationId) return req.user.organizationId;
    if (req.organization?._id) return req.organization._id;
    const org = await Organization.findOne({ userId: req.user._id }).exec();
    return org?._id || null;
  }

  // ── Internal / Patient Orchestration Endpoints ────────────────────────────

  async broadcast(req, res, next) {
    try {
      const { requestId } = req.params;
      const { broadcastRound, responseDeadlineSeconds, targetHospitalIds } = req.body || {};

      const result = await emergencyBeepService.initiateBroadcast({
        emergencyRequestId: requestId,
        broadcastRound: broadcastRound || 1,
        responseDeadlineSeconds: responseDeadlineSeconds || 300,
        targetHospitalIds,
      });

      return res.status(200).json({
        success: true,
        message: result.message || 'Emergency Beep parallel broadcast initiated',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getStatus(req, res, next) {
    try {
      const { requestId } = req.params;
      const status = await emergencyBeepService.getBroadcastStatus(requestId);
      return res.status(200).json({
        success: true,
        data: status,
      });
    } catch (err) {
      next(err);
    }
  }

  async getRecipients(req, res, next) {
    try {
      const { requestId } = req.params;
      const recipients = await emergencyBroadcastRepository.listRecipientsForRequest(requestId);
      return res.status(200).json({
        success: true,
        data: recipients,
        count: recipients.length,
      });
    } catch (err) {
      next(err);
    }
  }

  async finalize(req, res, next) {
    try {
      const { requestId } = req.params;
      const result = await emergencyBeepService.finalizeResponseCollection(requestId);
      return res.status(200).json({
        success: true,
        message: 'Response collection finalized',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // ── Organization Endpoints ───────────────────────────────────────────────

  async getOrgIncoming(req, res, next) {
    try {
      const orgId = await this.getOrgIdForUser(req);
      if (!orgId) {
        return res.status(403).json({ success: false, message: 'Organization profile not found for user' });
      }

      const incoming = await emergencyBroadcastRepository.listIncomingForOrg(orgId);
      return res.status(200).json({
        success: true,
        data: incoming,
        count: incoming.length,
      });
    } catch (err) {
      next(err);
    }
  }

  async getOrgBeepDetail(req, res, next) {
    try {
      const { recipientId } = req.params;
      const orgId = await this.getOrgIdForUser(req);
      if (!orgId) {
        return res.status(403).json({ success: false, message: 'Organization profile not found for user' });
      }

      const recipient = await emergencyBeepService.markRecipientViewed(recipientId, orgId);
      return res.status(200).json({
        success: true,
        data: recipient,
      });
    } catch (err) {
      next(err);
    }
  }

  async acceptBeep(req, res, next) {
    try {
      const { recipientId } = req.params;
      const orgId = await this.getOrgIdForUser(req);
      if (!orgId) {
        return res.status(403).json({ success: false, message: 'Organization profile not found for user' });
      }

      const { offeredResources } = req.body || {};
      const ipAddress = req.ip || req.connection?.remoteAddress || '';

      const result = await emergencyBeepService.recordOrganizationResponse({
        recipientId,
        organizationId: orgId,
        userId: req.user._id,
        responseType: 'ACCEPT',
        offeredResources: offeredResources || { icuBed: false, erBay: true, ventilator: false },
        ipAddress,
      });

      return res.status(200).json({
        success: true,
        message: 'Emergency request accepted successfully (marked Can Receive)',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async declineBeep(req, res, next) {
    try {
      const { recipientId } = req.params;
      const orgId = await this.getOrgIdForUser(req);
      if (!orgId) {
        return res.status(403).json({ success: false, message: 'Organization profile not found for user' });
      }

      const { declineReason } = req.body || {};
      const ipAddress = req.ip || req.connection?.remoteAddress || '';

      const result = await emergencyBeepService.recordOrganizationResponse({
        recipientId,
        organizationId: orgId,
        userId: req.user._id,
        responseType: 'DECLINE',
        declineReason: declineReason || 'Facility currently at maximum surge capacity',
        ipAddress,
      });

      return res.status(200).json({
        success: true,
        message: 'Emergency request declined successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getOrgHistory(req, res, next) {
    try {
      const orgId = await this.getOrgIdForUser(req);
      if (!orgId) {
        return res.status(403).json({ success: false, message: 'Organization profile not found for user' });
      }

      const history = await emergencyBroadcastRepository.listHistoryForOrg(orgId);
      return res.status(200).json({
        success: true,
        data: history,
        count: history.length,
      });
    } catch (err) {
      next(err);
    }
  }

  // ── Patient Endpoints ────────────────────────────────────────────────────

  async getPatientResponses(req, res, next) {
    try {
      const { id } = req.params;
      const recipients = await emergencyBroadcastRepository.listRecipientsForRequest(id);
      const accepted = recipients.filter((r) => r.responseStatus === 'ACCEPTED');
      const declined = recipients.filter((r) => r.responseStatus === 'DECLINED');

      return res.status(200).json({
        success: true,
        data: {
          all: recipients,
          accepted,
          declined,
          totalResponses: accepted.length + declined.length,
          totalBroadcasted: recipients.length,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async getPatientBroadcastStatus(req, res, next) {
    try {
      const { id } = req.params;
      const status = await emergencyBeepService.getBroadcastStatus(id);
      return res.status(200).json({
        success: true,
        data: status,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const emergencyBeepController = new EmergencyBeepController();


import { doctorPresenceService } from '../services/DoctorPresenceService.js';

export class DoctorPresenceController {
  /**
   * POST /api/doctors/me/presence/check-in and POST /api/doctors/presence/check-in
   */
  async checkIn(req, res, next) {
    try {
      const code = req.body?.orgQrCheckinCode || req.body?.orgQrCode;
      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Organization QR check-in code is required',
        });
      }

      const result = await doctorPresenceService.checkIn({
        doctorUserId: req.user._id,
        orgQrCode: code,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || '',
      });

      res.status(result.isAlreadyCheckedIn ? 200 : 200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/doctors/me/presence/check-out and POST /api/doctors/presence/check-out
   */
  async checkOut(req, res, next) {
    try {
      const code = req.body?.orgQrCheckinCode || req.body?.orgQrCode;
      const result = await doctorPresenceService.checkOut({
        doctorUserId: req.user._id,
        orgQrCode: code,
      });

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/doctors/me/presence and GET /api/doctors/presence
   */
  async getCurrentPresence(req, res, next) {
    try {
      const result = await doctorPresenceService.getCurrentPresence(req.user._id);
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/doctors/me/presence/history and GET /api/doctors/presence/history
   */
  async getDoctorHistory(req, res, next) {
    try {
      const limit = parseInt(req.query.limit, 10) || 50;
      const history = await doctorPresenceService.getDoctorPresenceHistory(req.user._id, limit);
      res.json({
        success: true,
        count: history.length,
        data: history,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/organizations/me/presence-qr
   */
  async generateOrgQRCode(req, res, next) {
    try {
      const { location, facilityId, codeType, validityDays } = req.body || {};
      const qr = await doctorPresenceService.generateOrganizationQRCode({
        orgUserId: req.user._id,
        location,
        facilityId,
        codeType,
        validityDays: parseInt(validityDays, 10) || 365,
      });

      res.status(201).json({
        success: true,
        message: 'Organization Terminal QR Code generated successfully',
        data: qr,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/organizations/me/presence-qr
   */
  async listOrgQRCodes(req, res, next) {
    try {
      const qrs = await doctorPresenceService.listOrganizationQRCodes(req.user._id, req.query);
      res.json({
        success: true,
        count: qrs.length,
        data: qrs,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/organizations/me/presence-qr/:id/revoke
   */
  async revokeOrgQRCode(req, res, next) {
    try {
      const { reason } = req.body || {};
      const revoked = await doctorPresenceService.revokeOrganizationQRCode({
        orgUserId: req.user._id,
        qrId: req.params.id,
        reason,
      });

      res.json({
        success: true,
        message: 'Organization Terminal QR Code revoked successfully',
        data: revoked,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/organizations/me/doctors/presence
   */
  async getOrgLiveDoctors(req, res, next) {
    try {
      const doctors = await doctorPresenceService.getOrganizationLiveDoctors(req.user._id);
      res.json({
        success: true,
        count: doctors.length,
        data: doctors,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/organizations/me/doctors/presence/history
   */
  async getOrgPresenceHistory(req, res, next) {
    try {
      const limit = parseInt(req.query.limit, 10) || 50;
      const history = await doctorPresenceService.getOrganizationPresenceHistory(req.user._id, limit);
      res.json({
        success: true,
        count: history.length,
        data: history,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/presence
   */
  async getAdminPresenceLogs(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 50;
      const result = await doctorPresenceService.getAdminPresenceLogs(req.query, { page, limit });

      res.json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/admin/presence/:id/correct
   */
  async correctPresenceLog(req, res, next) {
    try {
      const { checkInAt, checkOutAt, reason } = req.body || {};
      const corrected = await doctorPresenceService.correctPresenceLog({
        adminUserId: req.user._id,
        presenceLogId: req.params.id,
        checkInAt,
        checkOutAt,
        reason,
      });

      res.json({
        success: true,
        message: 'Presence log corrected with audit trail',
        data: corrected,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const doctorPresenceController = new DoctorPresenceController();


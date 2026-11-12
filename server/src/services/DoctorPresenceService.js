import crypto from 'crypto';
import QRCode from 'qrcode';
import { doctorRepository } from '../repositories/DoctorRepository.js';
import { organizationRepository } from '../repositories/OrganizationRepository.js';
import { doctorAffiliationRepository } from '../repositories/DoctorAffiliationRepository.js';
import { doctorPresenceRepository } from '../repositories/DoctorPresenceRepository.js';
import { organizationQRCodeRepository } from '../repositories/OrganizationQRCodeRepository.js';
import { Doctor } from '../models/index.js';

export class DoctorPresenceService {
  /**
   * Check in a doctor using an Organization Terminal QR Code
   */
  async checkIn({ doctor: preResolvedDoctor, doctorId, doctorUserId, orgQrCode, ipAddress = '', userAgent = '' }) {
    if (!orgQrCode || typeof orgQrCode !== 'string' || !orgQrCode.trim()) {
      throw new Error('Organization QR check-in code is required');
    }
    const cleanCode = orgQrCode.trim();

    // 1. Authenticate doctor by verified user token
    let doctor = preResolvedDoctor;
    if (!doctor && doctorUserId) {
      doctor = await doctorRepository.findByUserId(doctorUserId);
    }
    if (!doctor && doctorId) {
      doctor = await doctorRepository.findById(doctorId);
    }
    if (!doctor) {
      throw new Error('Doctor profile not found');
    }
    if (doctor.verificationStatus !== 'verified') {
      throw new Error('Only verified doctors can check in');
    }

    // 2. Resolve target organization from Terminal QR code or Organization Checkin Code
    let targetOrg = null;
    let orgQrRecord = null;

    // Check dedicated OrganizationQRCode entity first
    orgQrRecord = await organizationQRCodeRepository.findByToken(cleanCode);
    if (orgQrRecord) {
      if (orgQrRecord.status === 'REVOKED') {
        throw new Error('This organization QR code has been revoked and is no longer valid.');
      }
      if (orgQrRecord.expiresAt && new Date() > new Date(orgQrRecord.expiresAt)) {
        throw new Error('This organization QR code has expired. Please scan an active terminal QR code.');
      }
      targetOrg = orgQrRecord.organizationId;
    } else {
      // Fallback to Organization.qrCheckinCode (legacy & seeded formats)
      targetOrg = await organizationRepository.findByQrCode(cleanCode);
    }

    if (!targetOrg) {
      if (doctor.currentPresence?.isPresent) {
        throw new Error(
          'Doctor is already checked in at an organization. Check out first before checking in elsewhere.'
        );
      }
      throw new Error('Invalid organization QR code or identifier');
    }

    // 3. Check Active Physical Presence Conflict
    const isCurrentlyPresent = Boolean(doctor.currentPresence?.isPresent);
    const currentOrgId = doctor.currentPresence?.organizationId?._id
      ? doctor.currentPresence.organizationId._id.toString()
      : doctor.currentPresence?.organizationId?.toString();

    if (isCurrentlyPresent && currentOrgId) {
      // Same Organization: Safe Idempotent return (Already Checked In per flowchart)
      if (currentOrgId === targetOrg._id.toString()) {
        const activeLog = await doctorPresenceRepository.findActivePresence(doctor._id);
        return {
          success: true,
          message: `Doctor is already checked in at ${targetOrg.name}`,
          isAlreadyCheckedIn: true,
          doctor,
          organization: targetOrg,
          presenceLog: activeLog,
        };
      } else {
        // Different Organization: Strict Conflict Rejection per flowchart
        throw new Error(
          'Doctor is already checked in at an organization. Check out first before checking in elsewhere.'
        );
      }
    }

    // 4. Validate Organization Verification Status
    if (targetOrg.verificationStatus !== 'verified') {
      throw new Error('Healthcare facility is not verified or active.');
    }

    // 5. Validate Active Doctor-Organization Affiliation
    const activeAffiliation = await doctorAffiliationRepository.findActiveAffiliation(
      doctor._id,
      targetOrg._id
    );
    if (!activeAffiliation) {
      throw new Error(
        `Doctor does not have an active affiliation with ${targetOrg.name || 'this organization'}. QR check-in requires an ACTIVE affiliation.`
      );
    }

    // 6. Record Check-In in DoctorPresenceLog
    const now = new Date();
    const presenceLog = await doctorPresenceRepository.logPresence({
      doctorId: doctor._id,
      organizationId: targetOrg._id,
      affiliationId: activeAffiliation._id,
      facilityId: orgQrRecord?.facilityId?._id || orgQrRecord?.facilityId || null,
      checkInAt: now,
      status: 'CHECKED_IN',
      checkInMethod: 'QR_SCAN',
      tokenUsed: cleanCode,
      action: 'CHECK_IN',
      timestamp: now,
      method: 'QR_SCAN',
      ipAddress,
      userAgent,
    });

    // 7. Update Doctor current presence
    const updatedDoctor = await doctorRepository.updateById(doctor._id, {
      'currentPresence.isPresent': true,
      'currentPresence.organizationId': targetOrg._id,
      'currentPresence.affiliationId': activeAffiliation._id,
      'currentPresence.activePresenceId': presenceLog._id,
      'currentPresence.checkedInAt': now,
    });

    return {
      success: true,
      message: `Checked in successfully at ${targetOrg.name}`,
      doctor: updatedDoctor,
      organization: targetOrg,
      presenceLog,
    };
  }

  /**
   * Check out a doctor from current active physical presence
   */
  async checkOut({ doctor: preResolvedDoctor, doctorId, doctorUserId, orgQrCode = null }) {
    let doctor = preResolvedDoctor;
    if (!doctor && doctorUserId) {
      doctor = await doctorRepository.findByUserId(doctorUserId);
    }
    if (!doctor && doctorId) {
      doctor = await doctorRepository.findById(doctorId);
    }
    if (!doctor) {
      throw new Error('Doctor profile not found');
    }

    const isCurrentlyPresent = Boolean(doctor.currentPresence?.isPresent);
    if (!isCurrentlyPresent) {
      throw new Error('Doctor is not currently checked in anywhere.');
    }

    const currentOrgId = doctor.currentPresence.organizationId?._id
      ? doctor.currentPresence.organizationId._id.toString()
      : doctor.currentPresence.organizationId?.toString();

    // If an organization QR code is provided on checkout, validate it matches the checked-in facility
    if (orgQrCode) {
      const cleanCode = orgQrCode.trim();
      let scannedOrg = null;
      const orgQrRecord = await organizationQRCodeRepository.findByToken(cleanCode);
      if (orgQrRecord) {
        scannedOrg = orgQrRecord.organizationId;
      } else {
        scannedOrg = await organizationRepository.findByQrCode(cleanCode);
      }

      if (scannedOrg && currentOrgId && scannedOrg._id.toString() !== currentOrgId) {
        throw new Error('Cannot check out using a QR code from a different organization.');
      }
    }

    const now = new Date();
    let durationMinutes = 0;

    // Retrieve active presence log
    const activeLog = await doctorPresenceRepository.findActivePresence(doctor._id);
    let updatedLog = null;

    if (activeLog) {
      const checkInTime = activeLog.checkInAt || activeLog.createdAt || doctor.currentPresence.checkedInAt || now;
      durationMinutes = Math.max(0, Math.round((now.getTime() - new Date(checkInTime).getTime()) / 60000));

      updatedLog = await doctorPresenceRepository.updateById(activeLog._id, {
        status: 'CHECKED_OUT',
        checkOutAt: now,
        durationMinutes,
        checkOutMethod: 'QR_SCAN',
        action: 'CHECK_OUT',
        timestamp: now,
      });
    } else if (currentOrgId) {
      // Fallback create checkout log if active log was created via legacy
      updatedLog = await doctorPresenceRepository.logPresence({
        doctorId: doctor._id,
        organizationId: currentOrgId,
        affiliationId: doctor.currentPresence.affiliationId,
        checkInAt: doctor.currentPresence.checkedInAt || now,
        checkOutAt: now,
        durationMinutes: 0,
        status: 'CHECKED_OUT',
        checkOutMethod: 'QR_SCAN',
        action: 'CHECK_OUT',
        timestamp: now,
        method: 'QR_SCAN',
      });
    }

    // Update Doctor current presence
    const updatedDoctor = await doctorRepository.updateById(doctor._id, {
      'currentPresence.isPresent': false,
      'currentPresence.organizationId': null,
      'currentPresence.affiliationId': null,
      'currentPresence.activePresenceId': null,
      'currentPresence.checkedInAt': null,
    });

    return {
      success: true,
      message: 'Checked out successfully',
      durationMinutes,
      doctor: updatedDoctor,
      presenceLog: updatedLog,
    };
  }

  /**
   * Get current presence state for authenticated doctor
   */
  async getCurrentPresence(doctorUserId) {
    const doctor = await doctorRepository.findByUserId(doctorUserId);
    if (!doctor) throw new Error('Doctor profile not found');

    const isPresent = Boolean(doctor.currentPresence?.isPresent);
    let activeLog = null;
    let durationMinutes = 0;

    if (isPresent) {
      activeLog = await doctorPresenceRepository.findActivePresence(doctor._id);
      const checkInTime = activeLog?.checkInAt || doctor.currentPresence?.checkedInAt;
      if (checkInTime) {
        durationMinutes = Math.max(0, Math.round((Date.now() - new Date(checkInTime).getTime()) / 60000));
      }
    }

    return {
      isPresent,
      organization: doctor.currentPresence?.organizationId || null,
      checkedInAt: doctor.currentPresence?.checkedInAt || activeLog?.checkInAt || null,
      durationMinutes,
      activeLog,
      doctorUniqueId: doctor.doctorUniqueId,
      specialization: doctor.specialization,
    };
  }

  /**
   * Get Doctor presence history
   */
  async getDoctorPresenceHistory(doctorUserId, limit = 50) {
    const doctor = await doctorRepository.findByUserId(doctorUserId);
    if (!doctor) throw new Error('Doctor profile not found');
    return await doctorPresenceRepository.getDoctorHistory(doctor._id, {}, limit);
  }

  /**
   * Organization: Generate a new Terminal QR Code
   */
  async generateOrganizationQRCode({
    orgUserId,
    location = 'Main Reception Desk',
    facilityId = null,
    codeType = 'STATIC',
    validityDays = 365,
  }) {
    const org = await organizationRepository.findByUserId(orgUserId);
    if (!org) throw new Error('Organization profile not found');

    // Generate opaque cryptographic token
    const rawToken = `ORG-TRM-${org._id.toString().slice(-6).toUpperCase()}-${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const qrPayload = JSON.stringify({
      type: 'SHAP_ORG_TERMINAL',
      orgId: org._id,
      orgCode: org.uniqueOrganizationCode,
      orgName: org.name,
      token: rawToken,
      location,
      issuedAt: new Date().toISOString(),
    });

    const qrDataUrl = await QRCode.toDataURL(rawToken, {
      errorCorrectionLevel: 'H',
      width: 400,
      margin: 2,
      color: {
        dark: '#0A2540',
        light: '#FFFFFF',
      },
    });

    const expiresAt = validityDays > 0 ? new Date(Date.now() + validityDays * 86400000) : null;

    const qrRecord = await organizationQRCodeRepository.create({
      organizationId: org._id,
      facilityId: facilityId || null,
      location,
      codeType,
      qrToken: rawToken,
      tokenHash,
      qrDataPayload: qrPayload,
      qrDataUrl,
      status: 'ACTIVE',
      expiresAt,
      createdBy: org.userId?._id || org.userId,
    });

    return qrRecord;
  }

  /**
   * Organization: List Terminal QR codes
   */
  async listOrganizationQRCodes(orgUserId, filter = {}) {
    const org = await organizationRepository.findByUserId(orgUserId);
    if (!org) throw new Error('Organization profile not found');
    return await organizationQRCodeRepository.listByOrganization(org._id, filter);
  }

  /**
   * Organization: Revoke a Terminal QR Code
   */
  async revokeOrganizationQRCode({ orgUserId, qrId, reason = 'Revoked by facility administrator' }) {
    const org = await organizationRepository.findByUserId(orgUserId);
    if (!org) throw new Error('Organization profile not found');

    const qr = await organizationQRCodeRepository.findByQrId(qrId);
    if (!qr) throw new Error('Organization QR code not found');

    const qrOrgId = qr.organizationId?._id ? qr.organizationId._id.toString() : qr.organizationId.toString();
    if (qrOrgId !== org._id.toString()) {
      throw new Error('Unauthorized: This QR code belongs to another organization');
    }

    return await organizationQRCodeRepository.revoke(qr._id, reason, org.userId?._id || org.userId);
  }

  /**
   * Organization: Get doctors currently checked in on-site
   */
  async getOrganizationLiveDoctors(orgUserId) {
    const org = await organizationRepository.findByUserId(orgUserId);
    if (!org) throw new Error('Organization profile not found');

    const presentDoctors = await Doctor.find({
      'currentPresence.organizationId': org._id,
      'currentPresence.isPresent': true,
    })
      .populate('userId', 'name email phone avatar')
      .populate('currentPresence.affiliationId', 'department designation')
      .exec();

    const liveLogs = await doctorPresenceRepository.getOrganizationPresenceLogs(
      org._id,
      { status: 'CHECKED_IN' },
      100
    );

    const logMap = new Map();
    liveLogs.forEach((log) => {
      const docIdStr = log.doctorId?._id ? log.doctorId._id.toString() : log.doctorId?.toString();
      if (docIdStr && !logMap.has(docIdStr)) {
        logMap.set(docIdStr, log);
      }
    });

    return presentDoctors.map((doc) => {
      const activeLog = logMap.get(doc._id.toString());
      const checkInTime = activeLog?.checkInAt || doc.currentPresence?.checkedInAt;
      const durationMinutes = checkInTime
        ? Math.max(0, Math.round((Date.now() - new Date(checkInTime).getTime()) / 60000))
        : 0;

      return {
        _id: doc._id,
        doctorId: doc._id,
        doctorUniqueId: doc.doctorUniqueId,
        name: doc.userId?.name || 'Dr. Unknown',
        email: doc.userId?.email,
        phone: doc.userId?.phone,
        avatar: doc.userId?.avatar,
        specialization: doc.specialization,
        department: doc.currentPresence?.affiliationId?.department || 'General OPD',
        designation: doc.currentPresence?.affiliationId?.designation || 'Consultant',
        checkedInAt: checkInTime,
        durationMinutes,
        presenceId: activeLog?.presenceId || null,
        method: activeLog?.checkInMethod || 'QR_SCAN',
      };
    });
  }

  /**
   * Organization: Get presence history
   */
  async getOrganizationPresenceHistory(orgUserId, limit = 50) {
    const org = await organizationRepository.findByUserId(orgUserId);
    if (!org) throw new Error('Organization profile not found');
    return await doctorPresenceRepository.getOrganizationPresenceLogs(org._id, {}, limit);
  }

  /**
   * Admin: List platform-wide presence records with filters
   */
  async getAdminPresenceLogs(filter = {}, pagination = { page: 1, limit: 50 }) {
    const logs = await doctorPresenceRepository.listAll(filter, pagination);
    const total = await doctorPresenceRepository.count(filter);
    const liveCount = await doctorPresenceRepository.count({ status: 'CHECKED_IN' });

    return {
      total,
      liveCount,
      page: pagination.page || 1,
      limit: pagination.limit || 50,
      logs,
    };
  }

  /**
   * Admin: Auditable manual correction of a presence log
   */
  async correctPresenceLog({
    adminUserId,
    presenceLogId,
    checkInAt = null,
    checkOutAt = null,
    reason = '',
  }) {
    if (!reason || !reason.trim()) {
      throw new Error('A valid correction reason is required for auditable presence adjustments.');
    }

    const log = await doctorPresenceRepository.findById(presenceLogId);
    if (!log) throw new Error('Presence log record not found');

    const originalCheckInAt = log.checkInAt;
    const originalCheckOutAt = log.checkOutAt;

    const newCheckIn = checkInAt ? new Date(checkInAt) : log.checkInAt;
    const newCheckOut = checkOutAt ? new Date(checkOutAt) : log.checkOutAt;

    if (newCheckIn && newCheckOut && newCheckIn > newCheckOut) {
      throw new Error('Check-in timestamp cannot be after check-out timestamp.');
    }

    let durationMinutes = log.durationMinutes;
    if (newCheckIn && newCheckOut) {
      durationMinutes = Math.max(0, Math.round((newCheckOut.getTime() - newCheckIn.getTime()) / 60000));
    }

    const updated = await doctorPresenceRepository.updateById(log._id, {
      checkInAt: newCheckIn,
      checkOutAt: newCheckOut,
      durationMinutes,
      status: 'MANUAL_CORRECTED',
      manualCorrection: {
        correctedBy: adminUserId,
        correctedAt: new Date(),
        reason: reason.trim(),
        originalCheckInAt,
        originalCheckOutAt,
      },
    });

    return updated;
  }
}

export const doctorPresenceService = new DoctorPresenceService();

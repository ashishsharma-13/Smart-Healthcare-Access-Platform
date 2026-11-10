import crypto from 'crypto';
import QRCode from 'qrcode';
import { doctorRepository } from '../repositories/DoctorRepository.js';
import { organizationRepository } from '../repositories/OrganizationRepository.js';
import { doctorPresenceRepository } from '../repositories/DoctorPresenceRepository.js';

export class DoctorService {
  async approveDoctor(doctorId, adminUserId) {
    const doctor = await doctorRepository.findById(doctorId);
    if (!doctor) throw new Error('Doctor record not found');

    const uniqueId = `DOC-${Math.floor(10000 + Math.random() * 90000)}`;
    const qrToken = `SEC-DOC-${crypto.randomBytes(16).toString('hex')}`;

    const updated = await doctorRepository.updateById(doctorId, {
      verificationStatus: 'verified',
      doctorUniqueId: uniqueId,
      qrCredentialToken: qrToken,
      verifiedAt: new Date(),
      verifiedBy: adminUserId,
    });

    return updated;
  }

  async rejectDoctor(doctorId, reason) {
    const updated = await doctorRepository.updateById(doctorId, {
      verificationStatus: 'rejected',
      bio: reason ? `Rejected: ${reason}` : 'Verification rejected by administrator',
    });
    return updated;
  }

  async getQrCredential(doctorId) {
    const doctor = await doctorRepository.findById(doctorId);
    if (!doctor || doctor.verificationStatus !== 'verified') {
      throw new Error('Only verified doctors have a secure QR credential');
    }

    const qrDataPayload = JSON.stringify({
      token: doctor.qrCredentialToken,
      id: doctor.doctorUniqueId,
      name: doctor.userId?.name,
    });

    const qrDataUrl = await QRCode.toDataURL(qrDataPayload);
    return {
      qrDataUrl,
      uniqueId: doctor.doctorUniqueId,
      token: doctor.qrCredentialToken,
    };
  }

  /**
   * QR Check-in: Doctor scans Organization QR code or provides its secure token.
   * Business rule: Prevent simultaneous presence at multiple organizations.
   */
  async checkIn(doctorId, orgQrCheckinCode) {
    const doctor = await doctorRepository.findById(doctorId);
    if (!doctor) throw new Error('Doctor not found');
    if (doctor.verificationStatus !== 'verified') {
      throw new Error('Only verified doctors can check in');
    }

    // Check if already checked in somewhere
    if (doctor.currentPresence && doctor.currentPresence.isPresent) {
      throw new Error('Doctor is already checked in at an organization. Check out first before checking in elsewhere.');
    }

    const org = await organizationRepository.findByQrCode(orgQrCheckinCode);
    if (!org) {
      throw new Error('Invalid organization QR code or identifier');
    }

    // Update doctor presence
    const updated = await doctorRepository.updateById(doctorId, {
      'currentPresence.isPresent': true,
      'currentPresence.organizationId': org._id,
      'currentPresence.checkedInAt': new Date(),
    });

    // Record presence log
    await doctorPresenceRepository.logPresence({
      doctorId: doctor._id,
      organizationId: org._id,
      action: 'CHECK_IN',
      method: 'QR_SCAN',
      tokenUsed: orgQrCheckinCode,
    });

    return {
      success: true,
      message: `Checked in successfully at ${org.name}`,
      doctor: updated,
      organization: org,
    };
  }

  async checkOut(doctorId) {
    const doctor = await doctorRepository.findById(doctorId);
    if (!doctor) throw new Error('Doctor not found');

    if (!doctor.currentPresence || !doctor.currentPresence.isPresent) {
      throw new Error('Doctor is not currently checked in anywhere.');
    }

    const orgId = doctor.currentPresence.organizationId;

    const updated = await doctorRepository.updateById(doctorId, {
      'currentPresence.isPresent': false,
      'currentPresence.organizationId': null,
      'currentPresence.checkedInAt': null,
    });

    if (orgId) {
      await doctorPresenceRepository.logPresence({
        doctorId: doctor._id,
        organizationId: orgId,
        action: 'CHECK_OUT',
        method: 'QR_SCAN',
      });
    }

    return {
      success: true,
      message: 'Checked out successfully',
      doctor: updated,
    };
  }

  async updateAvailability(doctorId, { isAvailableForAppointments, isAvailableForEmergency }) {
    const updateData = {};
    if (isAvailableForAppointments !== undefined) {
      updateData.isAvailableForAppointments = Boolean(isAvailableForAppointments);
    }
    if (isAvailableForEmergency !== undefined) {
      updateData.isAvailableForEmergency = Boolean(isAvailableForEmergency);
    }

    return await doctorRepository.updateById(doctorId, updateData);
  }

  async getPresenceHistory(doctorId) {
    return await doctorPresenceRepository.getDoctorHistory(doctorId);
  }
}

export const doctorService = new DoctorService();


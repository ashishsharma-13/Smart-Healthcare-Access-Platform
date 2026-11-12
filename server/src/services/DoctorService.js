import crypto from 'crypto';
import QRCode from 'qrcode';
import { doctorRepository } from '../repositories/DoctorRepository.js';
import { organizationRepository } from '../repositories/OrganizationRepository.js';
import { doctorPresenceRepository } from '../repositories/DoctorPresenceRepository.js';
import { doctorAffiliationRepository } from '../repositories/DoctorAffiliationRepository.js';
import { doctorPresenceService } from './DoctorPresenceService.js';
import {
  User,
  Doctor,
  DoctorQualification,
  DoctorRegistration,
  DoctorDocument,
  DoctorQrCredential,
  DoctorVerificationApplication,
} from '../models/index.js';

export class DoctorService {
  /**
   * Register a new doctor with full personal, professional, registration, and document details.
   * Enforces duplicate account and duplicate registration number checks.
   */
  async registerDoctor(data) {
    const {
      name,
      email,
      phone,
      password,
      specialization,
      qualifications = ['MBBS'],
      experienceYears = 0,
      licenseNumber,
      issuingAuthority = 'National Medical Commission',
      registrationJurisdiction = 'India',
      registrationYear = new Date().getFullYear(),
      bio = '',
      consultationFee = 500,
      documents = [],
      languages = ['English', 'Hindi'],
    } = data;

    if (!name || !password || !specialization || !licenseNumber) {
      throw new Error('Name, password, specialization, and medical registration number are required.');
    }

    if (!email && !phone) {
      throw new Error('At least one contact method (email or phone) is required.');
    }

    // Check duplicate professional license registration
    const existingDocWithLicense = await doctorRepository.findByLicenseNumber(licenseNumber);
    if (existingDocWithLicense) {
      throw new Error(`A doctor with medical license / registration number "${licenseNumber}" is already registered.`);
    }

    // Check duplicate user contact
    if (email) {
      const existingUserEmail = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingUserEmail) {
        throw new Error('An account with this email address already exists. Please sign in.');
      }
    }
    if (phone) {
      const existingUserPhone = await User.findOne({ phone: phone.trim() });
      if (existingUserPhone) {
        throw new Error('An account with this phone number already exists. Please sign in.');
      }
    }

    // Create user account with pending_verification status
    const user = await User.create({
      name: name.trim(),
      email: email ? email.toLowerCase().trim() : undefined,
      phone: phone ? phone.trim() : undefined,
      password,
      role: 'doctor',
      status: 'pending_verification',
    });

    const applicationReference = `DOC-APP-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const normalizedQuals = Array.isArray(qualifications)
      ? qualifications.map((q) => (typeof q === 'string' ? q.trim() : q.degree || 'MBBS'))
      : typeof qualifications === 'string'
      ? qualifications.split(',').map((s) => s.trim()).filter(Boolean)
      : ['MBBS'];

    // Create Doctor profile
    const doc = await doctorRepository.create({
      userId: user._id,
      specialization: specialization.trim(),
      qualifications: normalizedQuals,
      experienceYears: Number(experienceYears) || 0,
      licenseNumber: licenseNumber.trim(),
      issuingAuthority: issuingAuthority.trim(),
      registrationJurisdiction: registrationJurisdiction.trim(),
      registrationYear: Number(registrationYear) || new Date().getFullYear(),
      consultationFee: Number(consultationFee) || 500,
      bio: bio.trim(),
      languages: Array.isArray(languages) ? languages : ['English', 'Hindi'],
      verificationStatus: 'pending',
      applicationReference,
      documents: Array.isArray(documents) ? documents : [],
    });

    // Create DoctorRegistration entity record
    await DoctorRegistration.create({
      doctorId: doc._id,
      registrationNumber: licenseNumber.trim(),
      issuingAuthority: issuingAuthority.trim(),
      jurisdiction: registrationJurisdiction.trim(),
      registrationYear: Number(registrationYear) || new Date().getFullYear(),
    });

    // Create DoctorVerificationApplication tracking record
    const application = await DoctorVerificationApplication.create({
      applicationReference,
      doctorId: doc._id,
      userId: user._id,
      applicationStatus: 'PENDING_VERIFICATION',
      history: [
        {
          action: 'SUBMITTED',
          timestamp: new Date(),
          remarks: 'Application submitted and queued for administrator accreditation review.',
        },
      ],
    });

    await doctorRepository.updateById(doc._id, { verificationApplicationId: application._id });

    return {
      doctor: doc,
      user,
      applicationReference,
      status: 'PENDING_VERIFICATION',
      message: 'Application submitted successfully. Awaiting administrative review.',
    };
  }

  /**
   * Approves a doctor application:
   * 1. Validates pending state.
   * 2. Issues unique Doctor ID and secure QR credential token.
   * 3. Generates QR Data URL.
   * 4. Persists DoctorQrCredential.
   * 5. Updates DoctorVerificationApplication history and status.
   * 6. Activates underlying user account.
   */
  async approveDoctor(doctorId, adminUserId) {
    const doctor = await doctorRepository.findById(doctorId);
    if (!doctor) throw new Error('Doctor record not found');

    const currentStatus = String(doctor.verificationStatus || '').toLowerCase();
    if (currentStatus === 'verified') {
      throw new Error('Doctor application has already been verified and approved.');
    }

    const uniqueId = doctor.doctorUniqueId || `DOC-${Math.floor(10000 + Math.random() * 90000)}`;
    const qrToken = `SEC-DOC-${crypto.randomBytes(16).toString('hex')}`;

    // Payload avoids exposing sensitive passwords, personal secrets, or internal identifiers
    const qrDataPayload = JSON.stringify({
      token: qrToken,
      id: uniqueId,
      name: doctor.userId?.name || 'Verified Doctor',
      specialization: doctor.specialization,
      status: 'VERIFIED',
      type: 'DOCTOR_QR_CREDENTIAL',
    });

    const qrDataUrl = await QRCode.toDataURL(qrDataPayload);

    // Persist DoctorQrCredential
    const qrCredential = await DoctorQrCredential.create({
      doctorId: doctor._id,
      doctorUniqueId: uniqueId,
      credentialToken: qrToken,
      qrDataPayload,
      qrDataUrl,
      status: 'ACTIVE',
      issuedAt: new Date(),
      issuedBy: adminUserId,
    });

    // Update Doctor record
    const updated = await doctorRepository.updateById(doctorId, {
      verificationStatus: 'verified',
      doctorUniqueId: uniqueId,
      qrCredentialToken: qrToken,
      activeQrCredentialId: qrCredential._id,
      verifiedAt: new Date(),
      verifiedBy: adminUserId,
      rejectionReason: '',
    });

    // Update or create DoctorVerificationApplication record
    let app = await DoctorVerificationApplication.findOne({ doctorId: doctor._id });
    if (!app) {
      app = new DoctorVerificationApplication({
        applicationReference: doctor.applicationReference || `DOC-APP-${Date.now().toString(36).toUpperCase()}`,
        doctorId: doctor._id,
        userId: doctor.userId?._id || doctor.userId,
      });
    }
    app.applicationStatus = 'APPROVED';
    app.reviewedBy = adminUserId;
    app.reviewedAt = new Date();
    app.remarks = 'Accreditation verified and approved by system administrator.';
    app.history.push({
      action: 'APPROVED',
      reviewerId: adminUserId,
      timestamp: new Date(),
      remarks: 'Application approved. Unique Doctor ID and QR Credential generated.',
    });
    await app.save();

    // Activate underlying User account
    if (doctor.userId) {
      const uId = doctor.userId._id || doctor.userId;
      await User.findByIdAndUpdate(uId, { status: 'active', isActive: true });
    }

    return {
      ...updated.toObject(),
      qrCredential,
      verificationApplication: app,
    };
  }

  /**
   * Rejects a doctor application with mandatory reason and persists audit history.
   */
  async rejectDoctor(doctorId, reason, adminUserId = null) {
    if (!reason || !String(reason).trim()) {
      throw new Error('A mandatory rejection reason is required to reject a doctor application.');
    }

    const doctor = await doctorRepository.findById(doctorId);
    if (!doctor) throw new Error('Doctor record not found');

    const cleanReason = String(reason).trim();

    // Update Doctor record
    const updated = await doctorRepository.updateById(doctorId, {
      verificationStatus: 'rejected',
      rejectionReason: cleanReason,
      bio: doctor.bio ? doctor.bio : `Rejected: ${cleanReason}`,
    });

    // Update or create DoctorVerificationApplication record
    let app = await DoctorVerificationApplication.findOne({ doctorId: doctor._id });
    if (!app) {
      app = new DoctorVerificationApplication({
        applicationReference: doctor.applicationReference || `DOC-APP-${Date.now().toString(36).toUpperCase()}`,
        doctorId: doctor._id,
        userId: doctor.userId?._id || doctor.userId,
      });
    }
    app.applicationStatus = 'REJECTED';
    app.reviewedBy = adminUserId;
    app.reviewedAt = new Date();
    app.rejectionReason = cleanReason;
    app.history.push({
      action: 'REJECTED',
      reviewerId: adminUserId,
      timestamp: new Date(),
      remarks: cleanReason,
    });
    await app.save();

    return {
      ...updated.toObject(),
      verificationApplication: app,
    };
  }

  /**
   * Resubmit a rejected doctor application with updated details or documents.
   */
  async resubmitDoctorApplication(doctorId, resubmissionData) {
    const doctor = await doctorRepository.findById(doctorId);
    if (!doctor) throw new Error('Doctor record not found');

    const status = String(doctor.verificationStatus || '').toLowerCase();
    if (status !== 'rejected') {
      throw new Error('Only rejected applications can be resubmitted.');
    }

    const {
      specialization,
      qualifications,
      experienceYears,
      licenseNumber,
      issuingAuthority,
      registrationJurisdiction,
      bio,
      documents,
    } = resubmissionData;

    const update = {
      verificationStatus: 'pending',
      rejectionReason: '',
    };

    if (specialization) update.specialization = specialization;
    if (experienceYears !== undefined) update.experienceYears = Number(experienceYears);
    if (licenseNumber) update.licenseNumber = licenseNumber;
    if (issuingAuthority) update.issuingAuthority = issuingAuthority;
    if (registrationJurisdiction) update.registrationJurisdiction = registrationJurisdiction;
    if (bio) update.bio = bio;
    if (qualifications) {
      update.qualifications = Array.isArray(qualifications) ? qualifications : [qualifications];
    }
    if (documents && Array.isArray(documents)) {
      update.documents = [...(doctor.documents || []), ...documents];
    }

    const updated = await doctorRepository.updateById(doctorId, update);

    // Update DoctorVerificationApplication record
    let app = await DoctorVerificationApplication.findOne({ doctorId: doctor._id });
    if (app) {
      app.applicationStatus = 'PENDING_VERIFICATION';
      app.history.push({
        action: 'RESUBMITTED',
        timestamp: new Date(),
        remarks: 'Doctor application corrected and resubmitted for reconsideration.',
      });
      await app.save();
    }

    return {
      success: true,
      message: 'Application resubmitted successfully. Re-entered pending review queue.',
      doctor: updated,
      application: app,
    };
  }

  /**
   * Upload a supporting document for doctor verification.
   */
  async uploadDoctorDocument(doctorId, docData) {
    const doctor = await doctorRepository.findById(doctorId);
    if (!doctor) throw new Error('Doctor record not found');

    const { documentType, documentName, storageReference, fileSize = 0, mimeType = 'application/pdf' } = docData;

    if (!documentType || !documentName || !storageReference) {
      throw new Error('Document type, name, and storage reference are required.');
    }

    // Persist standalone DoctorDocument
    const docRecord = await DoctorDocument.create({
      doctorId: doctor._id,
      documentType,
      documentName,
      storageReference,
      fileSize,
      mimeType,
      verificationStatus: 'pending',
    });

    // Append to doctor.documents array
    const updated = await doctorRepository.updateById(doctorId, {
      $push: {
        documents: {
          documentType,
          documentName,
          storageReference,
          fileSize,
          mimeType,
          uploadedAt: new Date(),
          verificationStatus: 'pending',
        },
      },
    });

    return {
      success: true,
      document: docRecord,
      doctor: updated,
    };
  }

  /**
   * Get application verification status, reference, history, and resubmission eligibility.
   */
  async getDoctorVerificationStatus(doctorId) {
    const doctor = await doctorRepository.findById(doctorId);
    if (!doctor) throw new Error('Doctor record not found');

    let application = await DoctorVerificationApplication.findOne({ doctorId: doctor._id })
      .populate('reviewedBy', 'name email')
      .exec();

    const normalizedStatus = String(doctor.verificationStatus || '').toUpperCase();

    return {
      applicationReference: doctor.applicationReference || application?.applicationReference || 'PENDING_GEN',
      status: normalizedStatus,
      isVerified: normalizedStatus === 'VERIFIED',
      isPending: normalizedStatus === 'PENDING' || normalizedStatus === 'PENDING_VERIFICATION',
      isRejected: normalizedStatus === 'REJECTED',
      rejectionReason: doctor.rejectionReason || application?.rejectionReason || null,
      reviewedAt: doctor.verifiedAt || application?.reviewedAt || null,
      reviewedBy: doctor.verifiedBy || application?.reviewedBy || null,
      canResubmit: normalizedStatus === 'REJECTED',
      history: application?.history || [],
      documents: doctor.documents || [],
      licenseNumber: doctor.licenseNumber,
      issuingAuthority: doctor.issuingAuthority || 'National Medical Commission',
      registrationJurisdiction: doctor.registrationJurisdiction || 'India',
    };
  }

  /**
   * Get active QR credential and unique ID for doctor.
   */
  async getQrCredential(doctorId) {
    const doctor = await doctorRepository.findById(doctorId);
    if (!doctor) throw new Error('Doctor record not found');

    const status = String(doctor.verificationStatus || '').toLowerCase();
    if (status !== 'verified') {
      throw new Error('Only verified doctors have a secure QR credential.');
    }

    let activeCred = await DoctorQrCredential.findOne({
      doctorId: doctor._id,
      status: 'ACTIVE',
    });

    if (!activeCred) {
      // Generate and persist if not already stored
      const uniqueId = doctor.doctorUniqueId || `DOC-${Math.floor(10000 + Math.random() * 90000)}`;
      const qrToken = doctor.qrCredentialToken || `SEC-DOC-${crypto.randomBytes(16).toString('hex')}`;
      const qrDataPayload = JSON.stringify({
        token: qrToken,
        id: uniqueId,
        name: doctor.userId?.name,
        specialization: doctor.specialization,
        status: 'VERIFIED',
        type: 'DOCTOR_QR_CREDENTIAL',
      });
      const qrDataUrl = await QRCode.toDataURL(qrDataPayload);

      activeCred = await DoctorQrCredential.create({
        doctorId: doctor._id,
        doctorUniqueId: uniqueId,
        credentialToken: qrToken,
        qrDataPayload,
        qrDataUrl,
        status: 'ACTIVE',
      });

      await doctorRepository.updateById(doctorId, {
        doctorUniqueId: uniqueId,
        qrCredentialToken: qrToken,
        activeQrCredentialId: activeCred._id,
      });
    }

    return {
      qrDataUrl: activeCred.qrDataUrl,
      uniqueId: activeCred.doctorUniqueId,
      token: activeCred.credentialToken,
      issuedAt: activeCred.issuedAt,
      status: activeCred.status,
    };
  }

  /**
   * Revoke and reissue a secure QR credential.
   */
  async reissueQrCredential(doctorId, reason = 'Administrative rotation', adminUserId = null) {
    const doctor = await doctorRepository.findById(doctorId);
    if (!doctor || String(doctor.verificationStatus || '').toLowerCase() !== 'verified') {
      throw new Error('Cannot reissue credential for unverified doctor.');
    }

    // Revoke old active credentials
    await DoctorQrCredential.updateMany(
      { doctorId: doctor._id, status: 'ACTIVE' },
      { $set: { status: 'REVOKED', revokedAt: new Date(), revocationReason: reason } }
    );

    // Generate new credentials
    const uniqueId = doctor.doctorUniqueId;
    const newQrToken = `SEC-DOC-${crypto.randomBytes(16).toString('hex')}`;
    const qrDataPayload = JSON.stringify({
      token: newQrToken,
      id: uniqueId,
      name: doctor.userId?.name,
      specialization: doctor.specialization,
      status: 'VERIFIED',
      type: 'DOCTOR_QR_CREDENTIAL',
    });
    const qrDataUrl = await QRCode.toDataURL(qrDataPayload);

    const newCred = await DoctorQrCredential.create({
      doctorId: doctor._id,
      doctorUniqueId: uniqueId,
      credentialToken: newQrToken,
      qrDataPayload,
      qrDataUrl,
      status: 'ACTIVE',
      issuedAt: new Date(),
      issuedBy: adminUserId,
    });

    await doctorRepository.updateById(doctorId, {
      qrCredentialToken: newQrToken,
      activeQrCredentialId: newCred._id,
    });

    return {
      success: true,
      message: 'QR Credential successfully reissued and rotated.',
      credential: newCred,
      qrDataUrl,
      token: newQrToken,
    };
  }

  /**
   * QR Check-in: Doctor scans Organization QR code or provides its secure token.
   * Business rule: Prevent simultaneous presence at multiple organizations.
   */
  async checkIn(doctorId, orgQrCheckinCode) {
    const doctor = await doctorRepository.findById(doctorId);
    if (!doctor) throw new Error('Doctor not found');
    const doctorUserId = doctor.userId?._id || doctor.userId;
    return await doctorPresenceService.checkIn({ doctor, doctorId, doctorUserId, orgQrCode: orgQrCheckinCode });
  }

  async checkOut(doctorId, orgQrCode = null) {
    const doctor = await doctorRepository.findById(doctorId);
    if (!doctor) throw new Error('Doctor not found');
    const doctorUserId = doctor.userId?._id || doctor.userId;
    return await doctorPresenceService.checkOut({ doctor, doctorId, doctorUserId, orgQrCode });
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


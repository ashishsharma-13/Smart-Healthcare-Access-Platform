import crypto from 'crypto';
import QRCode from 'qrcode';
import { organizationRepository } from '../repositories/OrganizationRepository.js';
import { resourceRepository } from '../repositories/ResourceRepository.js';
import {
  Organization,
  OrganizationAdmin,
  OrganizationFacility,
  OrganizationDocument,
  OrganizationSpecialization,
  OrganizationVerificationApplication,
  DoctorAffiliation,
  Doctor,
  User,
} from '../models/index.js';

export class OrganizationService {
  /**
   * Register a new healthcare organization with comprehensive legal, representative, facility,
   * document, and capability metadata in PENDING_VERIFICATION state.
   */
  async registerOrganization(dto) {
    const {
      name,
      legalName,
      orgType = 'hospital',
      registrationNumber,
      officialEmail,
      contactNumber,
      website = '',
      description = '',
      registeredAddress = {},
      operatingAddress = {},
      latitude,
      longitude,
      location,
      coordinates,
      emergencyCapable = true,
      emergencyContactPhone,
      facilities = ['Emergency Care', 'ICU', 'General Ward'],
      healthcareCapabilities = ['Emergency Services', 'ICU', 'Diagnostic Imaging'],
      specializations = ['General Medicine', 'Cardiology'],
      representative = {},
      documents = [],
      userId,
      password,
    } = dto;

    if (!name || !registrationNumber) {
      throw new Error('Organization name and registration license number are required.');
    }

    // Check duplicate organization registrationNumber
    const existingOrg = await organizationRepository.findByRegistrationNumber(registrationNumber);
    if (existingOrg) {
      const err = new Error(`Organization with registration license ${registrationNumber} is already registered.`);
      err.statusCode = 400;
      throw err;
    }

    // Resolve user account
    let orgUser;
    if (userId) {
      orgUser = await User.findById(userId);
      if (!orgUser) throw new Error('Associated user not found.');
    } else {
      const regEmail = officialEmail || representative.email;
      if (!regEmail) throw new Error('Official email or representative email is required for organization account.');
      const existingUser = await User.findOne({ email: regEmail.trim().toLowerCase() });
      if (existingUser) {
        const err = new Error('An account with this email already exists.');
        err.statusCode = 400;
        throw err;
      }
      orgUser = await User.create({
        name: representative.name || name,
        email: regEmail.trim().toLowerCase(),
        phone: contactNumber || representative.phone || undefined,
        password: password || 'Hospital@123',
        role: 'organization',
        status: 'pending_verification',
      });
    }

    // Resolve operating GPS coordinates [longitude, latitude]
    let resolvedCoords = [77.2090, 28.6139];
    if (location?.coordinates && Array.isArray(location.coordinates)) {
      resolvedCoords = location.coordinates.map(Number);
    } else if (coordinates && Array.isArray(coordinates)) {
      resolvedCoords = coordinates.map(Number);
    } else if (latitude !== undefined && longitude !== undefined) {
      resolvedCoords = [parseFloat(longitude), parseFloat(latitude)];
    }

    const [lng, lat] = resolvedCoords;
    if (
      typeof lng !== 'number' ||
      typeof lat !== 'number' ||
      isNaN(lng) ||
      isNaN(lat) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      throw new Error('Invalid GPS coordinates. Latitude must be between -90 and 90, and longitude between -180 and 180.');
    }

    // Generate unique application reference
    const appRef = `ORG-APP-${Math.floor(10000 + Math.random() * 90000)}`;
    const qrCheckinCode = `ORG-QR-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 899 + 100)}`;

    // Create Organization record
    const org = await Organization.create({
      userId: orgUser._id,
      name: name.trim(),
      legalName: legalName ? legalName.trim() : name.trim(),
      orgType,
      registrationNumber: registrationNumber.trim(),
      applicationReference: appRef,
      officialEmail: officialEmail || orgUser.email || '',
      contactNumber: contactNumber || orgUser.phone || '',
      website: website.trim(),
      description: description.trim(),
      registeredAddress,
      operatingAddress: {
        ...operatingAddress,
        isSameAsRegistered: operatingAddress.isSameAsRegistered !== false,
      },
      location: {
        type: 'Point',
        coordinates: [lng, lat],
      },
      emergencyCapable: Boolean(emergencyCapable),
      emergencyContactPhone: emergencyContactPhone || contactNumber || orgUser.phone || '',
      qrCheckinCode,
      facilities,
      healthcareCapabilities,
      specializations,
      representative: {
        name: representative.name || orgUser.name,
        email: representative.email || orgUser.email,
        phone: representative.phone || orgUser.phone,
        designation: representative.designation || 'Medical Superintendent / Administrator',
      },
      documents: documents.map((d) => ({
        documentType: d.documentType || 'establishment_registration',
        documentName: d.documentName || 'Document.pdf',
        storageReference: d.storageReference || 'https://storage.shap.health/docs/' + (d.documentName || 'doc.pdf'),
        fileSize: d.fileSize || 1048576,
        mimeType: d.mimeType || 'application/pdf',
      })),
      verificationStatus: 'pending',
    });

    // Create OrganizationAdmin representative link
    await OrganizationAdmin.create({
      organizationId: org._id,
      userId: orgUser._id,
      accessRole: 'PRIMARY_ADMIN',
      representativeName: representative.name || orgUser.name,
      representativeEmail: representative.email || orgUser.email,
      representativePhone: representative.phone || orgUser.phone,
      designation: representative.designation || 'Hospital Administrator',
      authorizationLetterRef: documents.find((d) => d.documentType === 'representative_authorization')?.storageReference || '',
    });

    // Create Primary OrganizationFacility record
    const facilityRecord = await OrganizationFacility.create({
      facilityId: `FAC-${Math.floor(10000 + Math.random() * 90000)}`,
      organizationId: org._id,
      facilityName: `${org.name} - Main Campus`,
      facilityType: 'main_campus',
      isPrimary: true,
      address: org.operatingAddress,
      location: {
        type: 'Point',
        coordinates: [lng, lat],
      },
      latitude: lat,
      longitude: lng,
      capabilities: healthcareCapabilities,
      operationalStatus: 'ACTIVE',
      contactPhone: org.emergencyContactPhone || org.contactNumber,
      totalBeds: 100,
      icuBeds: 20,
      operationTheatres: 4,
    });

    // Create OrganizationDocument records
    if (Array.isArray(documents) && documents.length > 0) {
      for (const doc of documents) {
        await OrganizationDocument.create({
          documentId: `DOC-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
          organizationId: org._id,
          documentType: doc.documentType || 'establishment_registration',
          documentName: doc.documentName || 'Certificate.pdf',
          storageReference: doc.storageReference || 'https://storage.shap.health/docs/' + doc.documentName,
          mimeType: doc.mimeType || 'application/pdf',
          fileSize: doc.fileSize || 1048576,
          verificationStatus: 'PENDING',
        });
      }
    }

    // Create OrganizationSpecialization records
    if (Array.isArray(specializations) && specializations.length > 0) {
      for (const specName of specializations) {
        try {
          await OrganizationSpecialization.create({
            organizationId: org._id,
            name: specName,
            departmentName: `${specName} Department`,
            isActive: true,
          });
        } catch (specErr) {
          // ignore duplicate in initial batch
        }
      }
    }

    // Create Verification Application
    const appRecord = await OrganizationVerificationApplication.create({
      applicationReference: appRef,
      organizationId: org._id,
      userId: orgUser._id,
      applicationStatus: 'PENDING_VERIFICATION',
      history: [
        {
          action: 'SUBMITTED',
          reviewerId: null,
          timestamp: new Date(),
          remarks: 'Initial health establishment registration submitted for administrative verification.',
        },
      ],
    });

    // Link application and primary facility on Organization
    org.activeVerificationApplicationId = appRecord._id;
    org.primaryFacilityId = facilityRecord._id;
    await org.save();

    return {
      organization: org,
      applicationReference: appRef,
      user: orgUser,
    };
  }

  /**
   * Approve a healthcare organization application:
   * Generates unique Organization ID, sets status to verified, activates user account.
   */
  async approveOrganization(orgId, adminUserId = null) {
    const org = await organizationRepository.findById(orgId);
    if (!org) throw new Error('Organization not found.');

    const currentStatus = String(org.verificationStatus || '').toLowerCase();
    if (currentStatus === 'verified' || currentStatus === 'approved') {
      throw new Error('This organization has already been verified and accredited.');
    }

    // Generate globally unique Organization ID code e.g. ORG-84920
    const uniqueOrgCode = org.uniqueOrganizationCode || `ORG-${Math.floor(10000 + Math.random() * 90000)}`;

    // Activate user account
    if (org.userId) {
      const uId = org.userId._id || org.userId;
      await User.findByIdAndUpdate(uId, { status: 'active', isActive: true });
    }

    // Update organization verification status
    const updated = await organizationRepository.updateById(orgId, {
      verificationStatus: 'verified',
      uniqueOrganizationCode: uniqueOrgCode,
      verifiedAt: new Date(),
      verifiedBy: adminUserId,
      rejectionReason: null,
    });

    // Update OrganizationVerificationApplication
    let app = await OrganizationVerificationApplication.findOne({ organizationId: org._id });
    if (!app) {
      app = await OrganizationVerificationApplication.create({
        applicationReference: org.applicationReference || `ORG-APP-${Math.floor(10000 + Math.random() * 90000)}`,
        organizationId: org._id,
        userId: org.userId?._id || org.userId,
        applicationStatus: 'APPROVED',
      });
    }

    app.applicationStatus = 'APPROVED';
    app.reviewedBy = adminUserId;
    app.reviewedAt = new Date();
    app.rejectionReason = null;
    app.history.push({
      action: 'APPROVED',
      reviewerId: adminUserId,
      timestamp: new Date(),
      remarks: `Health facility approved and accredited with Unique Code ${uniqueOrgCode}. Account activated for emergency dispatch and doctor affiliations.`,
    });
    await app.save();

    // Mark documents verified
    await OrganizationDocument.updateMany(
      { organizationId: org._id },
      { $set: { verificationStatus: 'VERIFIED', verifiedBy: adminUserId, verifiedAt: new Date() } }
    );

    return updated;
  }

  /**
   * Reject an organization application:
   * Enforces mandatory rejection reason and appends to audit history.
   */
  async rejectOrganization(orgId, reason, adminUserId = null) {
    if (!reason || !String(reason).trim()) {
      const err = new Error('A mandatory rejection reason is required to reject an organization application.');
      err.statusCode = 400;
      throw err;
    }

    const org = await organizationRepository.findById(orgId);
    if (!org) throw new Error('Organization not found.');

    const cleanReason = String(reason).trim();

    // Update organization status
    const updated = await organizationRepository.updateById(orgId, {
      verificationStatus: 'rejected',
      rejectionReason: cleanReason,
    });

    // Update user status
    if (org.userId) {
      const uId = org.userId._id || org.userId;
      await User.findByIdAndUpdate(uId, { status: 'rejected' });
    }

    // Update OrganizationVerificationApplication
    let app = await OrganizationVerificationApplication.findOne({ organizationId: org._id });
    if (!app) {
      app = await OrganizationVerificationApplication.create({
        applicationReference: org.applicationReference || `ORG-APP-${Math.floor(10000 + Math.random() * 90000)}`,
        organizationId: org._id,
        userId: org.userId?._id || org.userId,
        applicationStatus: 'REJECTED',
      });
    }

    app.applicationStatus = 'REJECTED';
    app.rejectionReason = cleanReason;
    app.reviewedBy = adminUserId;
    app.reviewedAt = new Date();
    app.history.push({
      action: 'REJECTED',
      reviewerId: adminUserId,
      timestamp: new Date(),
      remarks: cleanReason,
    });
    await app.save();

    return updated;
  }

  /**
   * Resubmit organization application with updated documents / information.
   */
  async resubmitOrganizationApplication(orgId, updates = {}, orgUserId = null) {
    const org = await organizationRepository.findById(orgId);
    if (!org) throw new Error('Organization not found.');

    if (String(org.verificationStatus || '').toLowerCase() !== 'rejected') {
      throw new Error('Only rejected organization applications can be resubmitted.');
    }

    // Apply updates
    if (updates.name) org.name = updates.name.trim();
    if (updates.legalName) org.legalName = updates.legalName.trim();
    if (updates.registrationNumber) org.registrationNumber = updates.registrationNumber.trim();
    if (updates.officialEmail) org.officialEmail = updates.officialEmail.trim();
    if (updates.contactNumber) org.contactNumber = updates.contactNumber.trim();
    if (updates.registeredAddress) org.registeredAddress = { ...org.registeredAddress, ...updates.registeredAddress };
    if (updates.operatingAddress) org.operatingAddress = { ...org.operatingAddress, ...updates.operatingAddress };
    if (updates.healthcareCapabilities) org.healthcareCapabilities = updates.healthcareCapabilities;
    if (updates.specializations) org.specializations = updates.specializations;

    if (Array.isArray(updates.documents) && updates.documents.length > 0) {
      org.documents = [...org.documents, ...updates.documents];
      for (const doc of updates.documents) {
        await OrganizationDocument.create({
          documentId: `DOC-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
          organizationId: org._id,
          documentType: doc.documentType || 'establishment_registration',
          documentName: doc.documentName || 'Document.pdf',
          storageReference: doc.storageReference || 'https://storage.shap.health/docs/' + doc.documentName,
          mimeType: doc.mimeType || 'application/pdf',
          fileSize: doc.fileSize || 1048576,
          verificationStatus: 'PENDING',
        });
      }
    }

    org.verificationStatus = 'pending';
    org.rejectionReason = null;
    await org.save();

    // Update user status to pending_verification
    if (org.userId) {
      const uId = org.userId._id || org.userId;
      await User.findByIdAndUpdate(uId, { status: 'pending_verification' });
    }

    // Append history in application
    let app = await OrganizationVerificationApplication.findOne({ organizationId: org._id });
    if (app) {
      app.applicationStatus = 'PENDING_VERIFICATION';
      app.rejectionReason = null;
      app.history.push({
        action: 'RESUBMITTED',
        reviewerId: orgUserId,
        timestamp: new Date(),
        remarks: 'Organization resubmitted corrected establishment documentation for re-evaluation.',
      });
      await app.save();
    }

    return org;
  }

  /**
   * Get application verification status, audit history, documents, and representative details.
   */
  async getOrganizationVerificationStatus(orgId) {
    const org = await organizationRepository.findById(orgId);
    if (!org) throw new Error('Organization not found');

    const app = await OrganizationVerificationApplication.findOne({ organizationId: org._id })
      .populate('reviewedBy', 'name email')
      .exec();

    const facilities = await OrganizationFacility.find({ organizationId: org._id }).exec();
    const documents = await OrganizationDocument.find({ organizationId: org._id }).exec();
    const adminRep = await OrganizationAdmin.findOne({ organizationId: org._id }).exec();

    const normalizedStatus = String(org.verificationStatus || '').toUpperCase();

    return {
      applicationReference: org.applicationReference || app?.applicationReference || 'ORG-APP-PENDING',
      uniqueOrganizationCode: org.uniqueOrganizationCode || null,
      status: normalizedStatus,
      isVerified: normalizedStatus === 'VERIFIED' || normalizedStatus === 'APPROVED',
      isPending: normalizedStatus === 'PENDING' || normalizedStatus === 'PENDING_VERIFICATION',
      isRejected: normalizedStatus === 'REJECTED',
      rejectionReason: org.rejectionReason || app?.rejectionReason || null,
      reviewedAt: org.verifiedAt || app?.reviewedAt || null,
      reviewedBy: org.verifiedBy || app?.reviewedBy || null,
      canResubmit: normalizedStatus === 'REJECTED',
      history: app?.history || [],
      documents: documents.length > 0 ? documents : org.documents || [],
      facilities,
      representative: adminRep || org.representative,
      operatingAddress: org.operatingAddress,
      registeredAddress: org.registeredAddress,
      location: org.location,
      healthcareCapabilities: org.healthcareCapabilities,
      specializations: org.specializations,
    };
  }

  /**
   * Get facilities for an organization.
   */
  async getOrganizationFacilities(orgId) {
    return await OrganizationFacility.find({ organizationId: orgId }).sort({ isPrimary: -1, createdAt: 1 }).exec();
  }

  /**
   * Add a secondary branch or diagnostic facility.
   */
  async addOrganizationFacility(orgId, facilityData) {
    const org = await organizationRepository.findById(orgId);
    if (!org) throw new Error('Organization not found.');

    const {
      facilityName,
      facilityType = 'branch',
      address = {},
      latitude = 28.6139,
      longitude = 77.2090,
      capabilities = [],
      contactPhone = '',
      totalBeds = 50,
      icuBeds = 10,
      operationTheatres = 2,
    } = facilityData;

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error('Invalid facility GPS coordinates.');
    }

    return await OrganizationFacility.create({
      facilityId: `FAC-${Math.floor(10000 + Math.random() * 90000)}`,
      organizationId: org._id,
      facilityName: facilityName.trim(),
      facilityType,
      isPrimary: false,
      address,
      location: {
        type: 'Point',
        coordinates: [lng, lat],
      },
      latitude: lat,
      longitude: lng,
      capabilities,
      operationalStatus: 'ACTIVE',
      contactPhone: contactPhone || org.contactNumber,
      totalBeds: Number(totalBeds) || 50,
      icuBeds: Number(icuBeds) || 10,
      operationTheatres: Number(operationTheatres) || 2,
    });
  }

  /**
   * Retrieve high-level dashboard metrics for an organization.
   */
  async getOrganizationDashboardMetrics(orgId) {
    const org = await organizationRepository.findById(orgId);
    if (!org) throw new Error('Organization not found.');

    const [affiliationsCount, doctorsPresentCount, resources, facilitiesCount] = await Promise.all([
      DoctorAffiliation.countDocuments({
        organizationId: org._id,
        status: { $in: ['ACTIVE', 'approved'] },
      }),
      Doctor.countDocuments({
        'currentPresence.organizationId': org._id,
        'currentPresence.isPresent': true,
      }),
      resourceRepository.findByOrg(org._id),
      OrganizationFacility.countDocuments({ organizationId: org._id }),
    ]);

    return {
      organization: org,
      affiliatedDoctorsCount: affiliationsCount,
      doctorsPresentCount,
      resources,
      facilitiesCount,
      isVerified: String(org.verificationStatus || '').toLowerCase() === 'verified',
    };
  }

  async getOrganizationQrCode(orgId) {
    const org = await organizationRepository.findById(orgId);
    if (!org) throw new Error('Organization not found');

    const qrDataUrl = await QRCode.toDataURL(org.qrCheckinCode);
    return {
      qrDataUrl,
      qrCheckinCode: org.qrCheckinCode,
      organizationName: org.name,
      uniqueOrganizationCode: org.uniqueOrganizationCode,
    };
  }

  async getPresentDoctors(orgId) {
    return await Doctor.find({
      'currentPresence.organizationId': orgId,
      'currentPresence.isPresent': true,
    })
      .populate('userId', 'name email phone avatar')
      .exec();
  }

  async getResources(orgId) {
    return await resourceRepository.findByOrg(orgId);
  }

  async updateResource(orgId, resourceType, totalCapacity, availableCapacity) {
    return await resourceRepository.upsertResource(orgId, resourceType, totalCapacity, availableCapacity);
  }
}

export const organizationService = new OrganizationService();

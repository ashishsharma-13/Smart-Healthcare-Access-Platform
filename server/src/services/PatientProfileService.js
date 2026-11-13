import mongoose from 'mongoose';
import {
  User,
  Organization,
  PatientProfile,
  EmergencyContact,
  PatientMedicalCondition,
  PatientAllergy,
  PatientMedication,
  PatientMedicalHistory,
  PatientConsent,
  EmergencyMedicalSnapshot,
  EmergencyRequest,
} from '../models/index.js';

export class PatientProfileService {
  /**
   * Retrieves or initializes the patient profile for a user
   */
  async getPatientProfile(userId) {
    if (!userId) throw new Error('User ID is required.');

    const user = await User.findById(userId).select('-password -__v').lean().exec();
    if (!user) throw new Error('Patient user not found.');

    let profile = await PatientProfile.findOne({ userId }).lean().exec();
    if (!profile) {
      // Auto-initialize profile linked to User
      const newProfile = new PatientProfile({
        userId,
        dateOfBirth: user.dateOfBirth || '',
        gender: user.gender || '',
        bloodGroup: user.bloodGroup || '',
        preferredLanguage: 'English',
        address: user.address || {},
        medicalNotes: user.medicalNotes || '',
      });
      await newProfile.save();
      profile = newProfile.toObject();
    }

    // Query aggregated statistics
    const [contactCount, conditionCount, allergyCount, medicationCount, historyCount, consents] =
      await Promise.all([
        EmergencyContact.countDocuments({ userId }),
        PatientMedicalCondition.countDocuments({ userId }),
        PatientAllergy.countDocuments({ userId }),
        PatientMedication.countDocuments({ userId, status: 'ACTIVE' }),
        PatientMedicalHistory.countDocuments({ userId }),
        PatientConsent.find({ userId }).lean().exec(),
      ]);

    // Calculate completion score
    let completionChecks = 0;
    const totalChecks = 6;
    if (user.name) completionChecks++;
    if (user.phone || user.email) completionChecks++;
    if (profile.dateOfBirth) completionChecks++;
    if (profile.gender) completionChecks++;
    if (profile.bloodGroup && profile.bloodGroup !== 'UNKNOWN') completionChecks++;
    if (contactCount > 0) completionChecks++;

    const completionPercentage = Math.round((completionChecks / totalChecks) * 100);

    return {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        status: user.status,
      },
      profile: {
        ...profile,
        completionPercentage,
        counts: {
          emergencyContacts: contactCount,
          conditions: conditionCount,
          allergies: allergyCount,
          activeMedications: medicationCount,
          medicalHistory: historyCount,
        },
      },
      consents,
      disclaimers: {
        diagnosticNotice:
          'This platform does not provide automated diagnosis or prescription services. All medical entries reflect patient-submitted or provider-verified historical records.',
        emergencyAccessNotice:
          'Emergency medical summaries are strictly purpose-restricted and made available solely to responding clinical teams upon destination selection.',
      },
    };
  }

  /**
   * Updates patient profile and synchronizes core user fields
   */
  async updatePatientProfile(userId, updateData) {
    if (!userId) throw new Error('User ID is required.');

    const {
      name,
      phone,
      avatar,
      dateOfBirth,
      gender,
      bloodGroup,
      preferredLanguage,
      profilePhoto,
      alternatePhone,
      address,
      heightCm,
      weightKg,
      organDonor,
      medicalNotes,
    } = updateData;

    // 1. Update User model core identity if provided
    const userUpdates = {};
    if (name) userUpdates.name = name.trim();
    if (phone) userUpdates.phone = phone.trim();
    if (avatar || profilePhoto) userUpdates.avatar = avatar || profilePhoto;
    if (dateOfBirth) userUpdates.dateOfBirth = dateOfBirth;
    if (gender) userUpdates.gender = gender;
    if (bloodGroup) userUpdates.bloodGroup = bloodGroup;
    if (address) userUpdates.address = address;
    if (medicalNotes !== undefined) userUpdates.medicalNotes = medicalNotes;

    if (Object.keys(userUpdates).length > 0) {
      await User.findByIdAndUpdate(userId, { $set: userUpdates }, { runValidators: true });
    }

    // 2. Update or Upsert PatientProfile
    const profileUpdates = {
      dateOfBirth: dateOfBirth || '',
      gender: gender || '',
      bloodGroup: bloodGroup || '',
      preferredLanguage: preferredLanguage || 'English',
      profilePhoto: profilePhoto || avatar || '',
      alternatePhone: alternatePhone || '',
      address: address || {},
      heightCm: heightCm != null ? Number(heightCm) : null,
      weightKg: weightKg != null ? Number(weightKg) : null,
      organDonor: Boolean(organDonor),
      medicalNotes: medicalNotes || '',
      isProfileComplete: Boolean(dateOfBirth && gender && bloodGroup),
    };

    const updatedProfile = await PatientProfile.findOneAndUpdate(
      { userId },
      { $set: profileUpdates },
      { upsert: true, new: true, runValidators: true }
    )
      .lean()
      .exec();

    return updatedProfile;
  }

  // =========================================================================
  // EMERGENCY CONTACTS CRUD
  // =========================================================================

  async listEmergencyContacts(userId) {
    if (!userId) return [];
    return await EmergencyContact.find({ userId })
      .sort({ isPrimary: -1, createdAt: 1 })
      .lean()
      .exec();
  }

  async addEmergencyContact(userId, data) {
    if (!userId) throw new Error('User ID is required.');
    const { name, relationship, phone, alternatePhone, email, isPrimary, notes } = data;

    if (!name || !name.trim()) throw new Error('Contact name is required.');
    if (!relationship || !relationship.trim()) throw new Error('Relationship is required.');
    if (!phone || !phone.trim()) throw new Error('Phone number is required.');

    const existingCount = await EmergencyContact.countDocuments({ userId });
    const shouldBePrimary = isPrimary === true || existingCount === 0;

    if (shouldBePrimary) {
      await EmergencyContact.updateMany({ userId }, { $set: { isPrimary: false } });
    }

    const contact = new EmergencyContact({
      userId,
      name: name.trim(),
      relationship: relationship.trim(),
      phone: phone.trim(),
      alternatePhone: alternatePhone ? alternatePhone.trim() : '',
      email: email ? email.trim() : '',
      isPrimary: shouldBePrimary,
      notes: notes || '',
    });

    await contact.save();
    return contact;
  }

  async updateEmergencyContact(userId, contactIdOrUuid, updateData) {
    if (!userId) throw new Error('User ID is required.');
    const query = {
      userId,
      $or: [
        { contactId: contactIdOrUuid },
        ...(mongoose.Types.ObjectId.isValid(contactIdOrUuid) ? [{ _id: contactIdOrUuid }] : []),
      ],
    };

    const contact = await EmergencyContact.findOne(query);
    if (!contact) throw new Error('Emergency contact not found or unauthorized.');

    if (updateData.isPrimary === true) {
      await EmergencyContact.updateMany({ userId }, { $set: { isPrimary: false } });
      contact.isPrimary = true;
    } else if (updateData.isPrimary === false) {
      contact.isPrimary = false;
    }

    if (updateData.name) contact.name = updateData.name.trim();
    if (updateData.relationship) contact.relationship = updateData.relationship.trim();
    if (updateData.phone) contact.phone = updateData.phone.trim();
    if (updateData.alternatePhone !== undefined) contact.alternatePhone = updateData.alternatePhone.trim();
    if (updateData.email !== undefined) contact.email = updateData.email.trim();
    if (updateData.notes !== undefined) contact.notes = updateData.notes;

    await contact.save();
    return contact;
  }

  async deleteEmergencyContact(userId, contactIdOrUuid) {
    if (!userId) throw new Error('User ID is required.');
    const query = {
      userId,
      $or: [
        { contactId: contactIdOrUuid },
        ...(mongoose.Types.ObjectId.isValid(contactIdOrUuid) ? [{ _id: contactIdOrUuid }] : []),
      ],
    };

    const contact = await EmergencyContact.findOne(query);
    if (!contact) throw new Error('Emergency contact not found.');

    const wasPrimary = contact.isPrimary;
    await EmergencyContact.deleteOne({ _id: contact._id });

    // If deleted contact was primary, promote earliest remaining contact
    if (wasPrimary) {
      const remaining = await EmergencyContact.findOne({ userId }).sort({ createdAt: 1 });
      if (remaining) {
        remaining.isPrimary = true;
        await remaining.save();
      }
    }

    return { success: true, message: 'Emergency contact removed successfully.' };
  }

  // =========================================================================
  // MEDICAL CONDITIONS CRUD
  // =========================================================================

  async listConditions(userId) {
    if (!userId) return [];
    return await PatientMedicalCondition.find({ userId }).sort({ createdAt: -1 }).lean().exec();
  }

  async addCondition(userId, data) {
    if (!userId) throw new Error('User ID is required.');
    const { conditionName, diagnosisDate, status, source, notes } = data;
    if (!conditionName || !conditionName.trim()) throw new Error('Condition name is required.');

    const condition = new PatientMedicalCondition({
      userId,
      conditionName: conditionName.trim(),
      diagnosisDate: diagnosisDate ? new Date(diagnosisDate) : null,
      status: (status || 'ACTIVE').toUpperCase(),
      source: source || 'PATIENT_REPORTED',
      notes: notes || '',
    });

    await condition.save();
    return condition;
  }

  async updateCondition(userId, conditionIdOrUuid, updateData) {
    const query = {
      userId,
      $or: [
        { conditionId: conditionIdOrUuid },
        ...(mongoose.Types.ObjectId.isValid(conditionIdOrUuid) ? [{ _id: conditionIdOrUuid }] : []),
      ],
    };

    const condition = await PatientMedicalCondition.findOne(query);
    if (!condition) throw new Error('Medical condition not found.');

    if (updateData.conditionName) condition.conditionName = updateData.conditionName.trim();
    if (updateData.status) condition.status = updateData.status.toUpperCase();
    if (updateData.diagnosisDate) condition.diagnosisDate = new Date(updateData.diagnosisDate);
    if (updateData.notes !== undefined) condition.notes = updateData.notes;

    await condition.save();
    return condition;
  }

  async deleteCondition(userId, conditionIdOrUuid) {
    const query = {
      userId,
      $or: [
        { conditionId: conditionIdOrUuid },
        ...(mongoose.Types.ObjectId.isValid(conditionIdOrUuid) ? [{ _id: conditionIdOrUuid }] : []),
      ],
    };

    const res = await PatientMedicalCondition.deleteOne(query);
    if (res.deletedCount === 0) throw new Error('Condition not found.');
    return { success: true, message: 'Condition removed successfully.' };
  }

  // =========================================================================
  // ALLERGIES CRUD
  // =========================================================================

  async listAllergies(userId) {
    if (!userId) return [];
    return await PatientAllergy.find({ userId }).sort({ severity: -1, createdAt: -1 }).lean().exec();
  }

  async addAllergy(userId, data) {
    if (!userId) throw new Error('User ID is required.');
    const { allergyType, substance, reaction, severity, source, notes } = data;
    if (!substance || !substance.trim()) throw new Error('Allergenic substance is required.');

    const allergy = new PatientAllergy({
      userId,
      allergyType: (allergyType || 'DRUG').toUpperCase(),
      substance: substance.trim(),
      reaction: reaction ? reaction.trim() : '',
      severity: (severity || 'MODERATE').toUpperCase(),
      source: source || 'PATIENT_REPORTED',
      notes: notes || '',
    });

    await allergy.save();
    return allergy;
  }

  async updateAllergy(userId, allergyIdOrUuid, updateData) {
    const query = {
      userId,
      $or: [
        { allergyId: allergyIdOrUuid },
        ...(mongoose.Types.ObjectId.isValid(allergyIdOrUuid) ? [{ _id: allergyIdOrUuid }] : []),
      ],
    };

    const allergy = await PatientAllergy.findOne(query);
    if (!allergy) throw new Error('Allergy not found.');

    if (updateData.substance) allergy.substance = updateData.substance.trim();
    if (updateData.allergyType) allergy.allergyType = updateData.allergyType.toUpperCase();
    if (updateData.reaction !== undefined) allergy.reaction = updateData.reaction.trim();
    if (updateData.severity) allergy.severity = updateData.severity.toUpperCase();
    if (updateData.notes !== undefined) allergy.notes = updateData.notes;

    await allergy.save();
    return allergy;
  }

  async deleteAllergy(userId, allergyIdOrUuid) {
    const query = {
      userId,
      $or: [
        { allergyId: allergyIdOrUuid },
        ...(mongoose.Types.ObjectId.isValid(allergyIdOrUuid) ? [{ _id: allergyIdOrUuid }] : []),
      ],
    };

    const res = await PatientAllergy.deleteOne(query);
    if (res.deletedCount === 0) throw new Error('Allergy not found.');
    return { success: true, message: 'Allergy record removed successfully.' };
  }

  // =========================================================================
  // MEDICATIONS CRUD
  // =========================================================================

  async listMedications(userId) {
    if (!userId) return [];
    return await PatientMedication.find({ userId }).sort({ status: 1, createdAt: -1 }).lean().exec();
  }

  async addMedication(userId, data) {
    if (!userId) throw new Error('User ID is required.');
    const { medicationName, dosage, frequency, startDate, endDate, status, source, prescribedBy, notes } = data;
    if (!medicationName || !medicationName.trim()) throw new Error('Medication name is required.');

    const med = new PatientMedication({
      userId,
      medicationName: medicationName.trim(),
      dosage: dosage ? dosage.trim() : '',
      frequency: frequency ? frequency.trim() : '',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      status: (status || 'ACTIVE').toUpperCase(),
      source: source || 'PATIENT_REPORTED',
      prescribedBy: prescribedBy || '',
      notes: notes || '',
    });

    await med.save();
    return med;
  }

  async updateMedication(userId, medIdOrUuid, updateData) {
    const query = {
      userId,
      $or: [
        { medicationId: medIdOrUuid },
        ...(mongoose.Types.ObjectId.isValid(medIdOrUuid) ? [{ _id: medIdOrUuid }] : []),
      ],
    };

    const med = await PatientMedication.findOne(query);
    if (!med) throw new Error('Medication not found.');

    if (updateData.medicationName) med.medicationName = updateData.medicationName.trim();
    if (updateData.dosage !== undefined) med.dosage = updateData.dosage.trim();
    if (updateData.frequency !== undefined) med.frequency = updateData.frequency.trim();
    if (updateData.status) med.status = updateData.status.toUpperCase();
    if (updateData.startDate) med.startDate = new Date(updateData.startDate);
    if (updateData.endDate) med.endDate = new Date(updateData.endDate);
    if (updateData.notes !== undefined) med.notes = updateData.notes;

    await med.save();
    return med;
  }

  async deleteMedication(userId, medIdOrUuid) {
    const query = {
      userId,
      $or: [
        { medicationId: medIdOrUuid },
        ...(mongoose.Types.ObjectId.isValid(medIdOrUuid) ? [{ _id: medIdOrUuid }] : []),
      ],
    };

    const res = await PatientMedication.deleteOne(query);
    if (res.deletedCount === 0) throw new Error('Medication not found.');
    return { success: true, message: 'Medication removed successfully.' };
  }

  // =========================================================================
  // MEDICAL HISTORY CRUD
  // =========================================================================

  async listMedicalHistory(userId) {
    if (!userId) return [];
    return await PatientMedicalHistory.find({ userId }).sort({ eventDate: -1, approximateYear: -1 }).lean().exec();
  }

  async addMedicalHistory(userId, data) {
    if (!userId) throw new Error('User ID is required.');
    const { category, title, eventDate, approximateYear, facility, source, notes } = data;
    if (!category) throw new Error('Medical history category is required (SURGERY, HOSPITALIZATION, PROCEDURE, PAST_ILLNESS).');
    if (!title || !title.trim()) throw new Error('Title / procedure name is required.');

    const item = new PatientMedicalHistory({
      userId,
      category: category.toUpperCase(),
      title: title.trim(),
      eventDate: eventDate ? new Date(eventDate) : null,
      approximateYear: approximateYear ? Number(approximateYear) : null,
      facility: facility ? facility.trim() : '',
      source: source || 'PATIENT_REPORTED',
      notes: notes || '',
    });

    await item.save();
    return item;
  }

  async updateMedicalHistory(userId, historyIdOrUuid, updateData) {
    const query = {
      userId,
      $or: [
        { historyId: historyIdOrUuid },
        ...(mongoose.Types.ObjectId.isValid(historyIdOrUuid) ? [{ _id: historyIdOrUuid }] : []),
      ],
    };

    const item = await PatientMedicalHistory.findOne(query);
    if (!item) throw new Error('Medical history record not found.');

    if (updateData.category) item.category = updateData.category.toUpperCase();
    if (updateData.title) item.title = updateData.title.trim();
    if (updateData.eventDate) item.eventDate = new Date(updateData.eventDate);
    if (updateData.approximateYear) item.approximateYear = Number(updateData.approximateYear);
    if (updateData.facility !== undefined) item.facility = updateData.facility.trim();
    if (updateData.notes !== undefined) item.notes = updateData.notes;

    await item.save();
    return item;
  }

  async deleteMedicalHistory(userId, historyIdOrUuid) {
    const query = {
      userId,
      $or: [
        { historyId: historyIdOrUuid },
        ...(mongoose.Types.ObjectId.isValid(historyIdOrUuid) ? [{ _id: historyIdOrUuid }] : []),
      ],
    };

    const res = await PatientMedicalHistory.deleteOne(query);
    if (res.deletedCount === 0) throw new Error('History entry not found.');
    return { success: true, message: 'Medical history entry removed successfully.' };
  }

  // =========================================================================
  // CONSENT & PRIVACY
  // =========================================================================

  async listConsents(userId) {
    if (!userId) return [];
    const validPurposes = [
      'REGULAR_HEALTHCARE_SHARING',
      'EMERGENCY_COORDINATION',
      'MEDICAL_DOCUMENT_SHARING',
      'EMERGENCY_CONTACT_NOTIFICATION',
    ];

    const records = await PatientConsent.find({ userId }).lean().exec();
    const recordMap = new Map(records.map((r) => [r.purpose, r]));

    // Return complete array covering all 4 defined purposes
    return validPurposes.map((purpose) => {
      const existing = recordMap.get(purpose);
      if (existing) return existing;

      // Default purpose states: Emergency coordination granted by default for life safety
      return {
        purpose,
        status: purpose === 'EMERGENCY_COORDINATION' ? 'GRANTED' : 'REVOKED',
        policyVersion: '1.0',
        grantedAt: purpose === 'EMERGENCY_COORDINATION' ? new Date() : null,
        revokedAt: null,
      };
    });
  }

  async updateConsent(userId, purpose, status = 'GRANTED', ipAddress = '', userAgent = '') {
    if (!userId) throw new Error('User ID is required.');
    const validPurposes = [
      'REGULAR_HEALTHCARE_SHARING',
      'EMERGENCY_COORDINATION',
      'MEDICAL_DOCUMENT_SHARING',
      'EMERGENCY_CONTACT_NOTIFICATION',
    ];
    const purposeUpper = (purpose || '').toUpperCase();
    if (!validPurposes.includes(purposeUpper)) {
      throw new Error(`Invalid consent purpose: ${purpose}`);
    }

    const isGranted = status.toUpperCase() === 'GRANTED';

    const consent = await PatientConsent.findOneAndUpdate(
      { userId, purpose: purposeUpper },
      {
        $set: {
          status: isGranted ? 'GRANTED' : 'REVOKED',
          policyVersion: '1.0',
          grantedAt: isGranted ? new Date() : undefined,
          revokedAt: !isGranted ? new Date() : undefined,
          ipAddress: ipAddress || '',
          userAgent: userAgent || '',
        },
      },
      { upsert: true, new: true }
    );

    return consent;
  }

  async revokeConsent(userId, consentIdOrPurpose) {
    if (!userId) throw new Error('User ID is required.');
    const query = {
      userId,
      $or: [
        { consentId: consentIdOrPurpose },
        { purpose: (consentIdOrPurpose || '').toUpperCase() },
        ...(mongoose.Types.ObjectId.isValid(consentIdOrPurpose) ? [{ _id: consentIdOrPurpose }] : []),
      ],
    };

    const consent = await PatientConsent.findOne(query);
    if (!contactConsentFound(consent)) {
      // If no record exists yet, insert revoked record
      const newRevoked = new PatientConsent({
        userId,
        purpose: (consentIdOrPurpose || '').toUpperCase(),
        status: 'REVOKED',
        revokedAt: new Date(),
      });
      await newRevoked.save();
      return newRevoked;
    }

    consent.status = 'REVOKED';
    consent.revokedAt = new Date();
    await consent.save();
    return consent;

    function contactConsentFound(c) {
      return Boolean(c);
    }
  }

  // =========================================================================
  // EMERGENCY MEDICAL SNAPSHOT & SUMMARY
  // =========================================================================

  /**
   * Pre-flight emergency medical summary for display on Emergency Activation UI.
   * CRITICAL RULE: Must NEVER block emergency requests if profile or info is missing!
   */
  async getPreflightEmergencySummary(userId) {
    try {
      if (!userId) {
        return {
          hasSummary: false,
          bloodGroup: 'UNKNOWN',
          allergies: [],
          conditions: [],
          medications: [],
          primaryEmergencyContact: null,
          disclaimer: 'No registered medical information found. Emergency dispatch proceeds immediately without delay.',
        };
      }

      const [profile, primaryContact, allergies, conditions, medications] = await Promise.all([
        PatientProfile.findOne({ userId }).lean().exec(),
        EmergencyContact.findOne({ userId, isPrimary: true }).lean().exec(),
        PatientAllergy.find({ userId }).select('substance allergyType severity reaction').lean().exec(),
        PatientMedicalCondition.find({ userId, status: { $in: ['ACTIVE', 'CHRONIC', 'active', 'chronic'] } })
          .select('conditionName status notes')
          .lean()
          .exec(),
        PatientMedication.find({ userId, status: { $in: ['ACTIVE', 'active'] } })
          .select('medicationName dosage frequency')
          .lean()
          .exec(),
      ]);

      const user = await User.findById(userId).select('name phone bloodGroup').lean().exec();
      const bloodGroup = profile?.bloodGroup || user?.bloodGroup || 'UNKNOWN';

      return {
        hasSummary: true,
        patientName: user?.name || 'Patient',
        bloodGroup,
        allergies: allergies || [],
        conditions: conditions || [],
        medications: medications || [],
        primaryEmergencyContact: primaryContact
          ? {
              name: primaryContact.name,
              relationship: primaryContact.relationship,
              phone: primaryContact.phone,
            }
          : null,
        disclaimer:
          'This summary is captured for acute emergency coordination and shared exclusively with the confirmed receiving hospital.',
      };
    } catch (err) {
      // Graceful fallback: never crash or block emergency mode
      return {
        hasSummary: false,
        bloodGroup: 'UNKNOWN',
        allergies: [],
        conditions: [],
        medications: [],
        primaryEmergencyContact: null,
        disclaimer: 'Profile retrieval bypassed. Immediate emergency dispatch is priority.',
      };
    }
  }

  /**
   * Captures and stores an immutable minimum-necessary emergency medical snapshot
   * linked to an emergency request.
   */
  async createEmergencyMedicalSnapshot(emergencyRequestId, patientId, confirmedByPatient = false, criticalNotes = '') {
    if (!emergencyRequestId || !patientId) {
      throw new Error('Both emergencyRequestId and patientId are required.');
    }

    // Pull current patient records
    const [profile, user, primaryContact, allergies, conditions, medications] = await Promise.all([
      PatientProfile.findOne({ userId: patientId }).lean().exec(),
      User.findById(patientId).lean().exec(),
      EmergencyContact.findOne({ userId: patientId, isPrimary: true }).lean().exec(),
      PatientAllergy.find({ userId: patientId }).lean().exec(),
      PatientMedicalCondition.find({ userId: patientId, status: { $in: ['ACTIVE', 'CHRONIC', 'active', 'chronic'] } })
        .lean()
        .exec(),
      PatientMedication.find({ userId: patientId, status: { $in: ['ACTIVE', 'active'] } })
        .lean()
        .exec(),
    ]);

    const bloodGroup = profile?.bloodGroup || user?.bloodGroup || 'UNKNOWN';

    const snapshot = new EmergencyMedicalSnapshot({
      emergencyRequestId,
      patientId,
      confirmedByPatient: Boolean(confirmedByPatient),
      capturedAt: new Date(),
      bloodGroup,
      allergiesSummary: (allergies || []).map((a) => ({
        substance: a.substance,
        allergyType: a.allergyType,
        severity: a.severity,
        reaction: a.reaction,
      })),
      conditionsSummary: (conditions || []).map((c) => ({
        conditionName: c.conditionName,
        status: c.status,
        notes: c.notes,
      })),
      medicationsSummary: (medications || []).map((m) => ({
        medicationName: m.medicationName,
        dosage: m.dosage,
        frequency: m.frequency,
      })),
      primaryEmergencyContact: primaryContact
        ? {
            name: primaryContact.name,
            relationship: primaryContact.relationship,
            phone: primaryContact.phone,
          }
        : { name: '', relationship: '', phone: '' },
      criticalNotes: criticalNotes || '',
      consentPolicyVersion: '1.0',
    });

    await snapshot.save();
    return snapshot;
  }

  /**
   * Retrieves emergency medical summary with PURPOSE-BASED AUTHORIZATION & AUDITING.
   * Access is strictly restricted to:
   * - The patient themselves
   * - The selected destination organization / attending clinician
   */
  async getEmergencyMedicalSummary(emergencyRequestId, requestingUser) {
    if (!emergencyRequestId || !requestingUser) {
      throw new Error('Authorization required.');
    }

    const snapshot = await EmergencyMedicalSnapshot.findOne({ emergencyRequestId })
      .sort({ capturedAt: -1 })
      .exec();

    if (!snapshot) {
      throw new Error('Emergency medical snapshot not found.');
    }

    // Access authorization check
    const isPatientSelf = String(snapshot.patientId) === String(requestingUser._id);

    let isAuthorizedOrg = false;
    if (requestingUser.role === 'organization') {
      const emergencyReq = await EmergencyRequest.findById(emergencyRequestId).lean().exec();
      if (emergencyReq) {
        // Destination selection verification
        const destOrgId =
          emergencyReq.selectedDestinationId ||
          emergencyReq.destinationOrganizationId ||
          emergencyReq.selectedOrganizationId;
        if (destOrgId) {
          const org = await Organization.findById(destOrgId).lean().exec();
          const userOrg = await Organization.findOne({ userId: requestingUser._id }).lean().exec();
          if (
            (org && String(org.userId) === String(requestingUser._id)) ||
            (userOrg && String(userOrg._id) === String(destOrgId)) ||
            String(destOrgId) === String(requestingUser._id) ||
            (requestingUser.organizationId && String(destOrgId) === String(requestingUser.organizationId))
          ) {
            isAuthorizedOrg = true;
          }
        }
      }
    }

    const isAttendingDoctor = requestingUser.role === 'doctor';

    if (!isPatientSelf && !isAuthorizedOrg && !isAttendingDoctor) {
      // Standard admins do NOT have unrestricted access to raw patient medical records
      throw new Error('Unauthorized: Medical record access is restricted to the patient and authorized destination clinicians.');
    }

    // Record audit event
    snapshot.accessAudit.push({
      accessedBy: requestingUser._id,
      accessedRole: requestingUser.role,
      organizationId: requestingUser.organizationId || null,
      purpose: isPatientSelf ? 'PATIENT_REVIEW' : 'EMERGENCY_CARE_DELIVERY',
      timestamp: new Date(),
    });
    await snapshot.save();

    return {
      snapshotId: snapshot.snapshotId,
      emergencyRequestId: snapshot.emergencyRequestId,
      patientId: snapshot.patientId,
      confirmedByPatient: snapshot.confirmedByPatient,
      capturedAt: snapshot.capturedAt,
      bloodGroup: snapshot.bloodGroup,
      allergies: snapshot.allergiesSummary,
      conditions: snapshot.conditionsSummary,
      medications: snapshot.medicationsSummary,
      primaryEmergencyContact: snapshot.primaryEmergencyContact,
      criticalNotes: snapshot.criticalNotes,
      disclaimer:
        'This medical snapshot is provided solely for emergency stabilization. It does not replace clinical history taking.',
    };
  }
}

export const patientProfileService = new PatientProfileService();

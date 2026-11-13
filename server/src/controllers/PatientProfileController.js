import { patientProfileService } from '../services/PatientProfileService.js';

export class PatientProfileController {
  // 1. Patient Profile
  async getProfile(req, res, next) {
    try {
      const data = await patientProfileService.getPatientProfile(req.user._id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const updated = await patientProfileService.updatePatientProfile(req.user._id, req.body || {});
      res.json({
        success: true,
        message: 'Patient profile updated successfully.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  // 2. Emergency Contacts
  async listEmergencyContacts(req, res, next) {
    try {
      const contacts = await patientProfileService.listEmergencyContacts(req.user._id);
      res.json({ success: true, count: contacts.length, data: contacts });
    } catch (err) {
      next(err);
    }
  }

  async addEmergencyContact(req, res, next) {
    try {
      const contact = await patientProfileService.addEmergencyContact(req.user._id, req.body || {});
      res.status(201).json({
        success: true,
        message: 'Emergency contact added successfully.',
        data: contact,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateEmergencyContact(req, res, next) {
    try {
      const { id } = req.params;
      const contact = await patientProfileService.updateEmergencyContact(req.user._id, id, req.body || {});
      res.json({
        success: true,
        message: 'Emergency contact updated successfully.',
        data: contact,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteEmergencyContact(req, res, next) {
    try {
      const { id } = req.params;
      const result = await patientProfileService.deleteEmergencyContact(req.user._id, id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // 3. Medical Conditions
  async listMedicalConditions(req, res, next) {
    try {
      const conditions = await patientProfileService.listConditions(req.user._id);
      res.json({ success: true, count: conditions.length, data: conditions });
    } catch (err) {
      next(err);
    }
  }

  async addMedicalCondition(req, res, next) {
    try {
      const condition = await patientProfileService.addCondition(req.user._id, req.body || {});
      res.status(201).json({
        success: true,
        message: 'Medical condition recorded successfully.',
        data: condition,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateMedicalCondition(req, res, next) {
    try {
      const { id } = req.params;
      const condition = await patientProfileService.updateCondition(req.user._id, id, req.body || {});
      res.json({
        success: true,
        message: 'Medical condition updated successfully.',
        data: condition,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteMedicalCondition(req, res, next) {
    try {
      const { id } = req.params;
      const result = await patientProfileService.deleteCondition(req.user._id, id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // 4. Allergies
  async listAllergies(req, res, next) {
    try {
      const allergies = await patientProfileService.listAllergies(req.user._id);
      res.json({ success: true, count: allergies.length, data: allergies });
    } catch (err) {
      next(err);
    }
  }

  async addAllergy(req, res, next) {
    try {
      const allergy = await patientProfileService.addAllergy(req.user._id, req.body || {});
      res.status(201).json({
        success: true,
        message: 'Allergy recorded successfully.',
        data: allergy,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateAllergy(req, res, next) {
    try {
      const { id } = req.params;
      const allergy = await patientProfileService.updateAllergy(req.user._id, id, req.body || {});
      res.json({
        success: true,
        message: 'Allergy updated successfully.',
        data: allergy,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteAllergy(req, res, next) {
    try {
      const { id } = req.params;
      const result = await patientProfileService.deleteAllergy(req.user._id, id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // 5. Medications
  async listMedications(req, res, next) {
    try {
      const medications = await patientProfileService.listMedications(req.user._id);
      res.json({ success: true, count: medications.length, data: medications });
    } catch (err) {
      next(err);
    }
  }

  async addMedication(req, res, next) {
    try {
      const med = await patientProfileService.addMedication(req.user._id, req.body || {});
      res.status(201).json({
        success: true,
        message: 'Medication recorded successfully.',
        data: med,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateMedication(req, res, next) {
    try {
      const { id } = req.params;
      const med = await patientProfileService.updateMedication(req.user._id, id, req.body || {});
      res.json({
        success: true,
        message: 'Medication updated successfully.',
        data: med,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteMedication(req, res, next) {
    try {
      const { id } = req.params;
      const result = await patientProfileService.deleteMedication(req.user._id, id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // 6. Medical History
  async listMedicalHistory(req, res, next) {
    try {
      const history = await patientProfileService.listMedicalHistory(req.user._id);
      res.json({ success: true, count: history.length, data: history });
    } catch (err) {
      next(err);
    }
  }

  async addMedicalHistory(req, res, next) {
    try {
      const item = await patientProfileService.addMedicalHistory(req.user._id, req.body || {});
      res.status(201).json({
        success: true,
        message: 'Medical history entry added successfully.',
        data: item,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateMedicalHistory(req, res, next) {
    try {
      const { id } = req.params;
      const item = await patientProfileService.updateMedicalHistory(req.user._id, id, req.body || {});
      res.json({
        success: true,
        message: 'Medical history entry updated successfully.',
        data: item,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteMedicalHistory(req, res, next) {
    try {
      const { id } = req.params;
      const result = await patientProfileService.deleteMedicalHistory(req.user._id, id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // 7. Consent Management
  async listConsents(req, res, next) {
    try {
      const consents = await patientProfileService.listConsents(req.user._id);
      res.json({ success: true, count: consents.length, data: consents });
    } catch (err) {
      next(err);
    }
  }

  async updateConsent(req, res, next) {
    try {
      const { purpose, status } = req.body || {};
      const ip = req.ip || req.headers['x-forwarded-for'] || '';
      const ua = req.headers['user-agent'] || '';
      const consent = await patientProfileService.updateConsent(req.user._id, purpose, status, ip, ua);
      res.json({
        success: true,
        message: 'Consent policy preference saved.',
        data: consent,
      });
    } catch (err) {
      next(err);
    }
  }

  async revokeConsent(req, res, next) {
    try {
      const { id } = req.params;
      const revoked = await patientProfileService.revokeConsent(req.user._id, id);
      res.json({
        success: true,
        message: 'Consent revoked successfully.',
        data: revoked,
      });
    } catch (err) {
      next(err);
    }
  }

  // 8. Emergency Mode Integration
  async getPreflightEmergencySummary(req, res, next) {
    try {
      const summary = await patientProfileService.getPreflightEmergencySummary(req.user?._id);
      res.json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }

  async createEmergencyMedicalSnapshot(req, res, next) {
    try {
      const { id } = req.params; // emergencyRequestId
      const { confirmedByPatient, criticalNotes } = req.body || {};
      const snapshot = await patientProfileService.createEmergencyMedicalSnapshot(
        id,
        req.user._id,
        confirmedByPatient,
        criticalNotes
      );
      res.status(201).json({
        success: true,
        message: 'Emergency medical snapshot attached to request.',
        data: snapshot,
      });
    } catch (err) {
      next(err);
    }
  }

  async getEmergencyMedicalSummary(req, res, next) {
    try {
      const { id } = req.params; // emergencyRequestId
      const summary = await patientProfileService.getEmergencyMedicalSummary(id, req.user);
      res.json({ success: true, data: summary });
    } catch (err) {
      if (err.message?.includes('Unauthorized')) {
        return res.status(403).json({ success: false, message: err.message });
      }
      if (err.message?.includes('not found')) {
        return res.status(404).json({ success: false, message: err.message });
      }
      next(err);
    }
  }
}

export const patientProfileController = new PatientProfileController();


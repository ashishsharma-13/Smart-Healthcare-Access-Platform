import express from 'express';
import { patientProfileController } from '../controllers/PatientProfileController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All patient endpoints require authentication
router.use(authenticate);

// 1. Patient Profile
router.get('/me/profile', (req, res, next) => patientProfileController.getProfile(req, res, next));
router.put('/me/profile', (req, res, next) => patientProfileController.updateProfile(req, res, next));
router.get('/profile', (req, res, next) => patientProfileController.getProfile(req, res, next));
router.put('/profile', (req, res, next) => patientProfileController.updateProfile(req, res, next));

// 2. Emergency Contacts
router.get('/me/emergency-contacts', (req, res, next) =>
  patientProfileController.listEmergencyContacts(req, res, next)
);
router.post('/me/emergency-contacts', (req, res, next) =>
  patientProfileController.addEmergencyContact(req, res, next)
);
router.put('/me/emergency-contacts/:id', (req, res, next) =>
  patientProfileController.updateEmergencyContact(req, res, next)
);
router.delete('/me/emergency-contacts/:id', (req, res, next) =>
  patientProfileController.deleteEmergencyContact(req, res, next)
);

// 3. Medical Conditions
router.get('/me/medical-conditions', (req, res, next) =>
  patientProfileController.listMedicalConditions(req, res, next)
);
router.post('/me/medical-conditions', (req, res, next) =>
  patientProfileController.addMedicalCondition(req, res, next)
);
router.put('/me/medical-conditions/:id', (req, res, next) =>
  patientProfileController.updateMedicalCondition(req, res, next)
);
router.delete('/me/medical-conditions/:id', (req, res, next) =>
  patientProfileController.deleteMedicalCondition(req, res, next)
);

// 4. Allergies
router.get('/me/allergies', (req, res, next) =>
  patientProfileController.listAllergies(req, res, next)
);
router.post('/me/allergies', (req, res, next) =>
  patientProfileController.addAllergy(req, res, next)
);
router.put('/me/allergies/:id', (req, res, next) =>
  patientProfileController.updateAllergy(req, res, next)
);
router.delete('/me/allergies/:id', (req, res, next) =>
  patientProfileController.deleteAllergy(req, res, next)
);

// 5. Medications
router.get('/me/medications', (req, res, next) =>
  patientProfileController.listMedications(req, res, next)
);
router.post('/me/medications', (req, res, next) =>
  patientProfileController.addMedication(req, res, next)
);
router.put('/me/medications/:id', (req, res, next) =>
  patientProfileController.updateMedication(req, res, next)
);
router.delete('/me/medications/:id', (req, res, next) =>
  patientProfileController.deleteMedication(req, res, next)
);

// 6. Medical History
router.get('/me/medical-history', (req, res, next) =>
  patientProfileController.listMedicalHistory(req, res, next)
);
router.post('/me/medical-history', (req, res, next) =>
  patientProfileController.addMedicalHistory(req, res, next)
);
router.put('/me/medical-history/:id', (req, res, next) =>
  patientProfileController.updateMedicalHistory(req, res, next)
);
router.delete('/me/medical-history/:id', (req, res, next) =>
  patientProfileController.deleteMedicalHistory(req, res, next)
);

// 7. Consents & Privacy
router.get('/me/consents', (req, res, next) =>
  patientProfileController.listConsents(req, res, next)
);
router.post('/me/consents', (req, res, next) =>
  patientProfileController.updateConsent(req, res, next)
);
router.post('/me/consents/:id/revoke', (req, res, next) =>
  patientProfileController.revokeConsent(req, res, next)
);

export default router;


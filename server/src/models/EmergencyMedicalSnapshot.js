import mongoose from 'mongoose';

const emergencyMedicalSnapshotSchema = new mongoose.Schema(
  {
    snapshotId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      default: () => `EMS-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    },
    emergencyRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyRequest',
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    confirmedByPatient: {
      type: Boolean,
      default: false,
    },
    capturedAt: {
      type: Date,
      default: Date.now,
    },
    bloodGroup: {
      type: String,
      default: 'UNKNOWN',
    },
    allergiesSummary: [
      {
        substance: String,
        allergyType: String,
        severity: String,
        reaction: String,
      },
    ],
    conditionsSummary: [
      {
        conditionName: String,
        status: String,
        notes: String,
      },
    ],
    medicationsSummary: [
      {
        medicationName: String,
        dosage: String,
        frequency: String,
      },
    ],
    primaryEmergencyContact: {
      name: { type: String, default: '' },
      relationship: { type: String, default: '' },
      phone: { type: String, default: '' },
    },
    criticalNotes: {
      type: String,
      default: '',
    },
    consentPolicyVersion: {
      type: String,
      default: '1.0',
    },
    accessAudit: [
      {
        accessedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        accessedRole: String,
        organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
        purpose: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

emergencyMedicalSnapshotSchema.index({ emergencyRequestId: 1, capturedAt: -1 });

export const EmergencyMedicalSnapshot = mongoose.model(
  'EmergencyMedicalSnapshot',
  emergencyMedicalSnapshotSchema
);


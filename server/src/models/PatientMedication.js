import mongoose from 'mongoose';

const patientMedicationSchema = new mongoose.Schema(
  {
    medicationId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      default: () => `MED-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    medicationName: {
      type: String,
      required: true,
      trim: true,
    },
    dosage: {
      type: String,
      trim: true,
      default: '',
    },
    frequency: {
      type: String,
      trim: true,
      default: '',
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'DISCONTINUED', 'COMPLETED', 'active', 'discontinued', 'completed'],
      default: 'ACTIVE',
    },
    source: {
      type: String,
      enum: ['PATIENT_REPORTED', 'PROVIDER_CONFIRMED', 'PRESCRIBED', 'CLINICAL_DISCHARGE', 'CLINICALLY_VERIFIED'],
      default: 'PATIENT_REPORTED',
    },
    prescribedBy: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

patientMedicationSchema.index({ userId: 1, status: 1 });

export const PatientMedication = mongoose.model('PatientMedication', patientMedicationSchema);


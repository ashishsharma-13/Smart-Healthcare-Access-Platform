import mongoose from 'mongoose';

const patientMedicalConditionSchema = new mongoose.Schema(
  {
    conditionId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      default: () => `CND-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    conditionName: {
      type: String,
      required: true,
      trim: true,
    },
    diagnosisDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'MANAGED', 'RESOLVED', 'CHRONIC', 'active', 'managed', 'resolved', 'chronic'],
      default: 'ACTIVE',
    },
    source: {
      type: String,
      enum: ['PATIENT_REPORTED', 'PROVIDER_CONFIRMED', 'CLINICAL_DISCHARGE'],
      default: 'PATIENT_REPORTED',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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

patientMedicalConditionSchema.index({ userId: 1, status: 1 });

export const PatientMedicalCondition = mongoose.model(
  'PatientMedicalCondition',
  patientMedicalConditionSchema
);


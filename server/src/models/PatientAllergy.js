import mongoose from 'mongoose';

const patientAllergySchema = new mongoose.Schema(
  {
    allergyId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      default: () => `ALG-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    allergyType: {
      type: String,
      enum: ['DRUG', 'FOOD', 'ENVIRONMENTAL', 'OTHER', 'drug', 'food', 'environmental', 'other'],
      default: 'DRUG',
    },
    substance: {
      type: String,
      required: true,
      trim: true,
    },
    reaction: {
      type: String,
      trim: true,
      default: '',
    },
    severity: {
      type: String,
      enum: ['MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING', 'mild', 'moderate', 'severe', 'life_threatening'],
      default: 'MODERATE',
    },
    source: {
      type: String,
      enum: ['PATIENT_REPORTED', 'PROVIDER_CONFIRMED', 'CLINICALLY_VERIFIED', 'CLINICAL_DISCHARGE'],
      default: 'PATIENT_REPORTED',
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

patientAllergySchema.index({ userId: 1, severity: 1 });

export const PatientAllergy = mongoose.model('PatientAllergy', patientAllergySchema);


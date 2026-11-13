import mongoose from 'mongoose';

const patientMedicalHistorySchema = new mongoose.Schema(
  {
    historyId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      default: () => `MH-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: [
        'SURGERY',
        'HOSPITALIZATION',
        'PROCEDURE',
        'PAST_ILLNESS',
        'surgery',
        'hospitalization',
        'procedure',
        'past_illness',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    eventDate: {
      type: Date,
      default: null,
    },
    approximateYear: {
      type: Number,
      default: null,
    },
    facility: {
      type: String,
      default: '',
    },
    source: {
      type: String,
      enum: ['PATIENT_REPORTED', 'PROVIDER_CONFIRMED', 'CLINICALLY_CONFIRMED', 'CLINICAL_DISCHARGE', 'CLINICALLY_VERIFIED'],
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

patientMedicalHistorySchema.index({ userId: 1, category: 1 });

export const PatientMedicalHistory = mongoose.model(
  'PatientMedicalHistory',
  patientMedicalHistorySchema
);


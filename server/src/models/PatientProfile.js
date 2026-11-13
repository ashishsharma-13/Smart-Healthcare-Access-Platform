import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    buildingNumber: { type: String, trim: true, default: '' },
    street: { type: String, trim: true, default: '' },
    locality: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    district: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    pinCode: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: 'India' },
  },
  { _id: false }
);

const patientProfileSchema = new mongoose.Schema(
  {
    profileId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      default: () => `PAT-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    dateOfBirth: {
      type: String, // YYYY-MM-DD
      default: '',
    },
    gender: {
      type: String,
      enum: [
        'MALE',
        'FEMALE',
        'OTHER',
        'PREFER_NOT_TO_SAY',
        'NON_BINARY',
        'Male',
        'Female',
        'Other',
        'Non-Binary',
        'Prefer not to say',
        'male',
        'female',
        'other',
        '',
      ],
      default: '',
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'UNKNOWN', 'unknown', ''],
      default: '',
    },
    preferredLanguage: {
      type: String,
      default: 'English',
      trim: true,
    },
    profilePhoto: {
      type: String,
      default: '',
    },
    alternatePhone: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: addressSchema,
      default: () => ({}),
    },
    heightCm: {
      type: Number,
      default: null,
    },
    weightKg: {
      type: Number,
      default: null,
    },
    organDonor: {
      type: Boolean,
      default: false,
    },
    medicalNotes: {
      type: String,
      default: '',
    },
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const PatientProfile = mongoose.model('PatientProfile', patientProfileSchema);


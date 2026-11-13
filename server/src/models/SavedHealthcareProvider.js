import mongoose from 'mongoose';

const savedHealthcareProviderSchema = new mongoose.Schema(
  {
    savedId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      default: () => `SAV-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    providerType: {
      type: String,
      enum: ['DOCTOR', 'ORGANIZATION', 'doctor', 'organization'],
      required: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      default: null,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

savedHealthcareProviderSchema.index(
  { userId: 1, providerType: 1, doctorId: 1, organizationId: 1 },
  { unique: true }
);

export const SavedHealthcareProvider = mongoose.model(
  'SavedHealthcareProvider',
  savedHealthcareProviderSchema
);


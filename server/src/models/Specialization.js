import mongoose from 'mongoose';

const specializationSchema = new mongoose.Schema(
  {
    specializationId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['CLINICAL', 'SURGICAL', 'DIAGNOSTIC', 'EMERGENCY', 'ALLIED', 'PEDIATRIC'],
      default: 'CLINICAL',
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Specialization = mongoose.model('Specialization', specializationSchema);


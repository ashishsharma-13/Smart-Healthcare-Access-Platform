import mongoose from 'mongoose';

const emergencyContactSchema = new mongoose.Schema(
  {
    contactId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      default: () => `EC-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    relationship: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    alternatePhone: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      default: '',
    },
    isPrimary: {
      type: Boolean,
      default: false,
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

emergencyContactSchema.index({ userId: 1, isPrimary: 1 });

export const EmergencyContact = mongoose.model('EmergencyContact', emergencyContactSchema);


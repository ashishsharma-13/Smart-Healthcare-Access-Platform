import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    doctorUniqueId: {
      type: String,
      unique: true,
      sparse: true,
    },
    specialization: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    qualifications: [
      {
        type: String,
        trim: true,
      },
    ],
    experienceYears: {
      type: Number,
      default: 0,
    },
    licenseNumber: {
      type: String,
      required: true,
      trim: true,
    },
    licenseDocumentUrl: {
      type: String,
      default: '',
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
      index: true,
    },
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    qrCredentialToken: {
      type: String,
      unique: true,
      sparse: true,
    },
    consultationFee: {
      type: Number,
      default: 500,
    },
    bio: {
      type: String,
      default: '',
    },
    rating: {
      type: Number,
      default: 4.8,
    },
    totalReviews: {
      type: Number,
      default: 12,
    },
    isAvailableForAppointments: {
      type: Boolean,
      default: true,
    },
    isAvailableForEmergency: {
      type: Boolean,
      default: false,
    },
    currentPresence: {
      isPresent: {
        type: Boolean,
        default: false,
      },
      organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        default: null,
      },
      checkedInAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

export const Doctor = mongoose.model('Doctor', doctorSchema);


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
      index: true,
    },
    applicationReference: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    issuingAuthority: {
      type: String,
      default: 'National Medical Commission',
      trim: true,
    },
    registrationJurisdiction: {
      type: String,
      default: 'India',
      trim: true,
    },
    registrationYear: {
      type: Number,
      default: 2018,
    },
    licenseDocumentUrl: {
      type: String,
      default: '',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    documents: [
      {
        documentType: {
          type: String,
          enum: ['medical_registration', 'qualification_degree', 'identity_proof', 'experience_certificate', 'other'],
          default: 'medical_registration',
        },
        documentName: String,
        storageReference: String,
        originalFileName: String,
        fileSize: Number,
        mimeType: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
        verificationStatus: {
          type: String,
          default: 'pending',
        },
      },
    ],
    qualificationsDetailed: [
      {
        degree: String,
        institution: String,
        year: Number,
        certificateUrl: String,
      },
    ],
    activeQrCredentialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DoctorQrCredential',
    },
    verificationApplicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DoctorVerificationApplication',
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED'],
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
    languages: [
      {
        type: String,
        trim: true,
      },
    ],
    workingHours: {
      type: String,
      default: 'Mon–Fri · 9:00 AM–4:00 PM',
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


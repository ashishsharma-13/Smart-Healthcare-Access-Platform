import mongoose from 'mongoose';

const doctorAffiliationSchema = new mongoose.Schema(
  {
    affiliationId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrganizationFacility',
      index: true,
    },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AffiliationRequest',
      index: true,
    },
    department: {
      type: String,
      default: 'General Medicine',
      trim: true,
    },
    designation: {
      type: String,
      default: 'Consultant',
      trim: true,
    },
    affiliationType: {
      type: String,
      enum: ['FULL_TIME', 'PART_TIME', 'VISITING', 'CONSULTANT', 'HONORARY', 'RESIDENT'],
      default: 'VISITING',
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    acceptedAt: {
      type: Date,
    },
    terminatedAt: {
      type: Date,
    },
    terminationReason: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: [
        'PENDING',
        'ACCEPTED',
        'ACTIVE',
        'REJECTED',
        'SUSPENDED',
        'TERMINATED',
        'EXPIRED',
        'TERMINATION_REQUESTED',
        'INACTIVE',
        // Lowercase backwards compatibility
        'pending',
        'approved',
        'revoked',
      ],
      default: 'PENDING',
      index: true,
    },
    initiatedBy: {
      type: String,
      enum: ['doctor', 'organization'],
      default: 'doctor',
      required: true,
    },
    doctorAcceptance: {
      status: {
        type: String,
        enum: ['pending', 'accepted', 'declined'],
        default: 'accepted',
      },
      respondedAt: Date,
      notes: { type: String, default: '' },
    },
    organizationApproval: {
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
      },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      reviewedAt: Date,
      notes: { type: String, default: '' },
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    terminationDetails: {
      initiatedBy: {
        type: String,
        enum: ['doctor', 'organization', 'admin'],
      },
      initiatedByUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      reason: { type: String, default: '' },
      requestedAt: Date,
      finalizedAt: Date,
      acknowledgedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },
    department: {
      type: String,
      default: 'General Medicine',
      trim: true,
    },
    schedule: [
      {
        dayOfWeek: {
          type: Number, // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
          required: true,
        },
        startTime: {
          type: String, // e.g. "09:00"
          required: true,
        },
        endTime: {
          type: String, // e.g. "17:00"
          required: true,
        },
        slotDurationMinutes: {
          type: Number,
          default: 30,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Auto-populate affiliationId before validation/save if missing
doctorAffiliationSchema.pre('save', function (next) {
  if (!this.affiliationId) {
    this.affiliationId = `AFF-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  next();
});

// Indexes for fast lookup and compound constraints
doctorAffiliationSchema.index({ doctorId: 1, organizationId: 1 });
doctorAffiliationSchema.index({ doctorId: 1, status: 1 });
doctorAffiliationSchema.index({ organizationId: 1, status: 1 });

export const DoctorAffiliation = mongoose.model('DoctorAffiliation', doctorAffiliationSchema);

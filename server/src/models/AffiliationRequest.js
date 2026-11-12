import mongoose from 'mongoose';

const affiliationRequestSchema = new mongoose.Schema(
  {
    requestId: {
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
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
      default: 'General Medicine',
    },
    designation: {
      type: String,
      required: true,
      trim: true,
      default: 'Consultant',
    },
    affiliationType: {
      type: String,
      enum: ['FULL_TIME', 'PART_TIME', 'VISITING', 'CONSULTANT', 'HONORARY', 'RESIDENT'],
      default: 'VISITING',
    },
    proposedStartDate: {
      type: Date,
      default: Date.now,
    },
    proposedEndDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED'],
      default: 'PENDING',
      index: true,
    },
    message: {
      type: String,
      trim: true,
      default: '',
    },
    responseReason: {
      type: String,
      trim: true,
      default: '',
    },
    respondedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate requestId before validation if missing
affiliationRequestSchema.pre('save', function (next) {
  if (!this.requestId) {
    this.requestId = `AFF-REQ-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  next();
});

affiliationRequestSchema.index({ doctorId: 1, organizationId: 1, status: 1 });

export const AffiliationRequest = mongoose.model('AffiliationRequest', affiliationRequestSchema);


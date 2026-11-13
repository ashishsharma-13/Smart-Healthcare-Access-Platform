import mongoose from 'mongoose';

const emergencyArrivalRecordSchema = new mongoose.Schema(
  {
    arrivalId: {
      type: String,
      unique: true,
      index: true,
    },
    journeyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyJourney',
      default: null,
      index: true,
    },
    emergencyRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyRequest',
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    verificationMethod: {
      type: String,
      enum: ['PATIENT_CONFIRMATION', 'STAFF_VERIFICATION', 'QR_SCAN', 'DISPATCH_VERIFICATION'],
      required: true,
    },
    verificationStatus: {
      type: String,
      enum: ['VERIFIED', 'PENDING', 'REJECTED'],
      default: 'VERIFIED',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    verifiedAt: {
      type: Date,
      default: Date.now,
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

emergencyArrivalRecordSchema.pre('validate', function (next) {
  if (!this.arrivalId) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.arrivalId = `ARR-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;
  }
  next();
});

export const EmergencyArrivalRecord = mongoose.model(
  'EmergencyArrivalRecord',
  emergencyArrivalRecordSchema
);


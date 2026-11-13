import mongoose from 'mongoose';

const emergencyDestinationSelectionSchema = new mongoose.Schema(
  {
    selectionId: {
      type: String,
      unique: true,
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
    selectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    selectionSource: {
      type: String,
      enum: ['USER', 'SYSTEM', 'RECOVERY_ROUTING'],
      default: 'USER',
    },
    selectionStatus: {
      type: String,
      enum: ['PENDING_CONFIRMATION', 'CONFIRMED', 'FAILED', 'SUPERSEDED'],
      default: 'PENDING_CONFIRMATION',
      index: true,
    },
    selectedAt: {
      type: Date,
      default: Date.now,
    },
    finalConfirmedAt: {
      type: Date,
      default: null,
    },
    failureReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

emergencyDestinationSelectionSchema.pre('validate', function (next) {
  if (!this.selectionId) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.selectionId = `SEL-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;
  }
  next();
});

export const EmergencyDestinationSelection = mongoose.model(
  'EmergencyDestinationSelection',
  emergencyDestinationSelectionSchema
);

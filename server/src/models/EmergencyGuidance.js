import mongoose from 'mongoose';

const emergencyGuidanceSchema = new mongoose.Schema(
  {
    guidanceId: {
      type: String,
      unique: true,
      index: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyCategory',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    reviewStatus: {
      type: String,
      enum: ['APPROVED', 'DRAFT', 'PENDING', 'REJECTED'],
      default: 'APPROVED',
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

emergencyGuidanceSchema.pre('save', function (next) {
  if (!this.guidanceId) {
    this.guidanceId = `GDN-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
  }
  next();
});

export const EmergencyGuidance = mongoose.model('EmergencyGuidance', emergencyGuidanceSchema);


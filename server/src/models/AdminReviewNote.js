import mongoose from 'mongoose';

const adminReviewNoteSchema = new mongoose.Schema(
  {
    noteId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    adminUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    adminEmail: {
      type: String,
      required: true,
    },
    targetEntityType: {
      type: String,
      required: true,
      enum: ['DOCTOR_APPLICATION', 'ORGANIZATION_APPLICATION', 'USER_ACCOUNT', 'EMERGENCY_INCIDENT'],
      index: true,
    },
    targetEntityId: {
      type: String,
      required: true,
      index: true,
    },
    noteType: {
      type: String,
      enum: ['INTERNAL_NOTE', 'REJECTION_REASON', 'APPROVAL_REMARKS', 'SUSPENSION_REASON', 'AUDIT_NOTE'],
      default: 'INTERNAL_NOTE',
    },
    content: {
      type: String,
      required: [true, 'Note content is required'],
      trim: true,
    },
    isConfidential: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

adminReviewNoteSchema.index({ targetEntityType: 1, targetEntityId: 1, createdAt: -1 });

export const AdminReviewNote = mongoose.model('AdminReviewNote', adminReviewNoteSchema);


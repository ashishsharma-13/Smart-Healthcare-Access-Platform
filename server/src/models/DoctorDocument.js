import mongoose from 'mongoose';

const doctorDocumentSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true,
    },
    documentType: {
      type: String,
      enum: ['medical_registration', 'qualification_degree', 'identity_proof', 'experience_certificate', 'other'],
      required: true,
    },
    documentName: {
      type: String,
      required: true,
      trim: true,
    },
    storageReference: {
      type: String,
      required: true,
    },
    originalFileName: {
      type: String,
      default: '',
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    mimeType: {
      type: String,
      default: 'application/pdf',
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export const DoctorDocument = mongoose.model('DoctorDocument', doctorDocumentSchema);


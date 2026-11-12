import mongoose from 'mongoose';

const organizationDocumentSchema = new mongoose.Schema(
  {
    documentId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    documentType: {
      type: String,
      required: true,
      enum: [
        'establishment_registration',
        'operating_license',
        'legal_entity_doc',
        'representative_authorization',
        'pollution_control_cert',
        'clinical_establishment_cert',
        'other',
      ],
      index: true,
    },
    documentName: {
      type: String,
      required: true,
      trim: true,
    },
    storageReference: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      default: 'application/pdf',
    },
    fileSize: {
      type: Number,
      default: 1048576, // 1MB default
    },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    verificationNotes: {
      type: String,
      default: '',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const OrganizationDocument = mongoose.model('OrganizationDocument', organizationDocumentSchema);


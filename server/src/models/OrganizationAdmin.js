import mongoose from 'mongoose';

const organizationAdminSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    accessRole: {
      type: String,
      enum: ['PRIMARY_ADMIN', 'REPRESENTATIVE', 'OPERATIONS_ADMIN', 'CLINICAL_HEAD'],
      default: 'PRIMARY_ADMIN',
      index: true,
    },
    representativeName: {
      type: String,
      trim: true,
      default: '',
    },
    representativeEmail: {
      type: String,
      trim: true,
      default: '',
    },
    representativePhone: {
      type: String,
      trim: true,
      default: '',
    },
    designation: {
      type: String,
      trim: true,
      default: 'Medical Director / Hospital Administrator',
    },
    authorizationLetterRef: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const OrganizationAdmin = mongoose.model('OrganizationAdmin', organizationAdminSchema);


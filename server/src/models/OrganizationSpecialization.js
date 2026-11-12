import mongoose from 'mongoose';

const organizationSpecializationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    specializationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Specialization',
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    departmentName: {
      type: String,
      default: '',
    },
    headOfDepartment: {
      type: String,
      default: '',
    },
    bedCapacity: {
      type: Number,
      default: 0,
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

organizationSpecializationSchema.index({ organizationId: 1, name: 1 }, { unique: true });

export const OrganizationSpecialization = mongoose.model('OrganizationSpecialization', organizationSpecializationSchema);


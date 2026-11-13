import mongoose from 'mongoose';

const healthcareResourceTypeSchema = new mongoose.Schema(
  {
    resourceTypeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    typeName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['beds', 'critical_care', 'imaging', 'laboratory', 'surgical', 'blood_bank', 'specialized'],
      default: 'beds',
      index: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    unitOfMeasure: {
      type: String,
      enum: ['beds', 'machines', 'units', 'slots', 'rooms', 'bays', 'devices'],
      default: 'beds',
    },
    quantityTracked: {
      type: Boolean,
      default: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

healthcareResourceTypeSchema.index({ active: 1, category: 1, displayOrder: 1 });

export const HealthcareResourceType = mongoose.model('HealthcareResourceType', healthcareResourceTypeSchema);


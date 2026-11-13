import mongoose from 'mongoose';

const emergencyCategorySchema = new mongoose.Schema(
  {
    categoryId: {
      type: String,
      unique: true,
      index: true,
    },
    categoryName: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
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
    icon: {
      type: String,
      default: 'Activity',
    },
  },
  {
    timestamps: true,
  }
);

// Auto-populate categoryId if missing
emergencyCategorySchema.pre('save', function (next) {
  if (!this.categoryId) {
    this.categoryId = `CAT-${this.slug.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
  }
  next();
});

export const EmergencyCategory = mongoose.model('EmergencyCategory', emergencyCategorySchema);


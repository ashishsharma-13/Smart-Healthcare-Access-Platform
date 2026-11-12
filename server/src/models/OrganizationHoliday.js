import mongoose from 'mongoose';

const organizationHolidaySchema = new mongoose.Schema(
  {
    holidayId: {
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
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrganizationFacility',
    },
    holidayDate: {
      type: String, // Format YYYY-MM-DD
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

organizationHolidaySchema.pre('save', function (next) {
  if (!this.holidayId) {
    this.holidayId = `HOLIDAY-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  next();
});

organizationHolidaySchema.index({ organizationId: 1, holidayDate: 1 }, { unique: true });

export const OrganizationHoliday = mongoose.model('OrganizationHoliday', organizationHolidaySchema);


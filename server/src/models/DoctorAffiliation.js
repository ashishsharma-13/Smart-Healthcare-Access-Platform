import mongoose from 'mongoose';

const doctorAffiliationSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'revoked'],
      default: 'approved',
    },
    schedule: [
      {
        dayOfWeek: {
          type: Number, // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
          required: true,
        },
        startTime: {
          type: String, // e.g. "09:00"
          required: true,
        },
        endTime: {
          type: String, // e.g. "17:00"
          required: true,
        },
        slotDurationMinutes: {
          type: Number,
          default: 30,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

doctorAffiliationSchema.index({ doctorId: 1, organizationId: 1 }, { unique: true });

export const DoctorAffiliation = mongoose.model('DoctorAffiliation', doctorAffiliationSchema);


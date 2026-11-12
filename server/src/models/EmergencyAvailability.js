import mongoose from 'mongoose';

const emergencyAvailabilitySchema = new mongoose.Schema(
  {
    emergencyAvailabilityId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
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
    affiliationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DoctorAffiliation',
      required: true,
      index: true,
    },
    participationStatus: {
      type: Boolean,
      default: true,
      index: true,
    },
    startDatetime: {
      type: Date,
      default: Date.now,
    },
    endDatetime: {
      type: Date,
    },
    emergencyCapabilities: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'ON_DUTY', 'OFF_DUTY'],
      default: 'ACTIVE',
      index: true,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

emergencyAvailabilitySchema.pre('save', function (next) {
  if (!this.emergencyAvailabilityId) {
    this.emergencyAvailabilityId = `EMG-AVAIL-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  next();
});

emergencyAvailabilitySchema.index({ doctorId: 1, organizationId: 1, status: 1 });

export const EmergencyAvailability = mongoose.model('EmergencyAvailability', emergencyAvailabilitySchema);

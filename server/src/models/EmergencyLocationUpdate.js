import mongoose from 'mongoose';

const emergencyLocationUpdateSchema = new mongoose.Schema(
  {
    locationUpdateId: {
      type: String,
      unique: true,
      index: true,
    },
    journeyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyJourney',
      required: true,
      index: true,
    },
    emergencyRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyRequest',
      required: true,
      index: true,
    },
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    accuracyMeters: {
      type: Number,
      default: null,
    },
    speed: {
      type: Number,
      default: null,
    },
    heading: {
      type: Number,
      default: null,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

emergencyLocationUpdateSchema.pre('validate', function (next) {
  if (!this.locationUpdateId) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.locationUpdateId = `LOC-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;
  }
  next();
});

export const EmergencyLocationUpdate = mongoose.model(
  'EmergencyLocationUpdate',
  emergencyLocationUpdateSchema
);


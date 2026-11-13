import mongoose from 'mongoose';

const emergencyJourneySchema = new mongoose.Schema(
  {
    journeyId: {
      type: String,
      unique: true,
      index: true,
    },
    emergencyRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyRequest',
      required: true,
      index: true,
    },
    reservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ResourceReservation',
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
      enum: ['IN_PROGRESS', 'ARRIVED', 'COMPLETED', 'CANCELLED'],
      default: 'IN_PROGRESS',
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    arrivedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    isSharingLocation: {
      type: Boolean,
      default: false,
    },
    initialLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      address: { type: String, default: '' },
      accuracy: { type: Number, default: null },
    },
    destinationLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      address: { type: String, default: '' },
      organizationName: { type: String, default: '' },
    },
    googleMapsUrl: {
      type: String,
      default: '',
    },
    estimatedDistanceKm: {
      type: Number,
      default: null,
    },
    estimatedDurationMin: {
      type: Number,
      default: null,
    },
    lastKnownLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      accuracyMeters: { type: Number, default: null },
      speed: { type: Number, default: null },
      heading: { type: Number, default: null },
      updatedAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  }
);

emergencyJourneySchema.pre('validate', function (next) {
  if (!this.journeyId) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.journeyId = `JNY-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;
  }
  next();
});

export const EmergencyJourney = mongoose.model('EmergencyJourney', emergencyJourneySchema);


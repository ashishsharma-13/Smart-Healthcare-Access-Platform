import mongoose from 'mongoose';

const emergencyFallbackSessionSchema = new mongoose.Schema(
  {
    fallbackSessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    emergencyRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyRequest',
      required: true,
      index: true,
    },
    triggerReason: {
      type: String,
      required: true,
      enum: [
        'NO_CANDIDATES_FOUND',
        'ALL_ORGANIZATIONS_DECLINED',
        'NO_ORGANIZATIONS_RESPONDED',
        'CONFIRMATION_FAILED',
        'RESERVATION_FAILED',
        'RESOURCE_UNAVAILABLE',
        'PATIENT_REQUESTED_CHANGE',
        'MANUAL_TRIGGER',
      ],
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['ACTIVE', 'SEARCH_EXPANDED', 'EXTERNAL_DISCOVERED', 'RECOVERED', 'COMPLETED', 'FAILED'],
      default: 'ACTIVE',
      index: true,
    },
    currentSearchLevel: {
      type: Number,
      default: 1,
      min: 1,
      max: 5,
    },
    currentSearchRadiusKm: {
      type: Number,
      default: 5,
    },
    previousOrganizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    previousReservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ResourceReservation',
      default: null,
    },
    resolvedDestinationType: {
      type: String,
      enum: ['PARTICIPATING_ORGANIZATION', 'EXTERNAL_FACILITY', null],
      default: null,
    },
    resolvedOrganizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    resolvedExternalFacilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExternalHealthcareFacility',
      default: null,
    },
    recoveryNotes: {
      type: String,
      default: '',
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

emergencyFallbackSessionSchema.pre('validate', function (next) {
  if (!this.fallbackSessionId) {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    this.fallbackSessionId = `FBS-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;
  }
  next();
});

export const EmergencyFallbackSession = mongoose.model(
  'EmergencyFallbackSession',
  emergencyFallbackSessionSchema
);


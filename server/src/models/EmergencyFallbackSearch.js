import mongoose from 'mongoose';

const emergencyFallbackSearchSchema = new mongoose.Schema(
  {
    searchId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    fallbackSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyFallbackSession',
      required: true,
      index: true,
    },
    emergencyRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyRequest',
      required: true,
      index: true,
    },
    searchLevel: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    searchRadiusKm: {
      type: Number,
      required: true,
    },
    candidatesFound: {
      type: Number,
      default: 0,
      min: 0,
    },
    suitableCandidatesFound: {
      type: Number,
      default: 0,
      min: 0,
    },
    resultStatus: {
      type: String,
      required: true,
      enum: [
        'SUITABLE_FOUND',
        'NO_SUITABLE_CANDIDATES',
        'MAX_RADIUS_REACHED',
        'EXTERNAL_FALLBACK_TRIGGERED',
      ],
    },
    discoveredOrganizationIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
      },
    ],
    broadcastRoundTriggered: {
      type: Number,
      default: null,
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

emergencyFallbackSearchSchema.pre('validate', function (next) {
  if (!this.searchId) {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    this.searchId = `SRC-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;
  }
  next();
});

export const EmergencyFallbackSearch = mongoose.model(
  'EmergencyFallbackSearch',
  emergencyFallbackSearchSchema
);


import mongoose from 'mongoose';

const emergencyMatchResultSchema = new mongoose.Schema(
  {
    emergencyRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyRequest',
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    suitabilityStatus: {
      type: String,
      enum: ['SUITABLE', 'UNSUITABLE', 'FALLBACK'],
      default: 'SUITABLE',
      index: true,
    },
    // Individual dimension scores (0-100)
    capabilityScore: { type: Number, default: 0 },
    resourceScore: { type: Number, default: 0 },
    specialistScore: { type: Number, default: 0 },
    presenceScore: { type: Number, default: 0 },
    travelTimeScore: { type: Number, default: 0 },
    distanceScore: { type: Number, default: 0 },
    freshnessScore: { type: Number, default: 0 },
    // Final weighted score (0-100)
    overallScore: { type: Number, default: 0 },
    // Physical metrics
    distanceKm: { type: Number, default: 0 },
    estimatedTravelMinutes: { type: Number, default: 0 },
    // Freshness details
    freshnessStatus: {
      type: String,
      enum: ['FRESH', 'STALE', 'VERY_STALE', 'UNKNOWN'],
      default: 'UNKNOWN',
    },
    // Ranking
    rank: { type: Number, default: 0 },
    evaluatedAt: { type: Date, default: Date.now },
    // Exclusion reasons (for UNSUITABLE orgs)
    unsuitabilityReasons: [{ type: String }],
    // Radius expansion tracking
    radiusExpanded: { type: Boolean, default: false },
    searchRadiusKm: { type: Number, default: 10 },
    isFallback: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

emergencyMatchResultSchema.index({ emergencyRequestId: 1, organizationId: 1 }, { unique: true });
emergencyMatchResultSchema.index({ emergencyRequestId: 1, rank: 1 });
emergencyMatchResultSchema.index({ emergencyRequestId: 1, suitabilityStatus: 1, overallScore: -1 });

export const EmergencyMatchResult = mongoose.model('EmergencyMatchResult', emergencyMatchResultSchema);


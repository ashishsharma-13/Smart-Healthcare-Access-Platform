import mongoose from 'mongoose';

const emergencyMatchingConfigurationSchema = new mongoose.Schema(
  {
    // Ordered list of search radii in km (tried in sequence)
    searchRadii: {
      type: [Number],
      default: [10, 25, 50],
    },
    // Weight multipliers (must sum to ~1.0 or are applied proportionally)
    weights: {
      capability: { type: Number, default: 0.30 },
      resource: { type: Number, default: 0.20 },
      specialist: { type: Number, default: 0.15 },
      presence: { type: Number, default: 0.10 },
      travelTime: { type: Number, default: 0.15 },
      distance: { type: Number, default: 0.05 },
      freshness: { type: Number, default: 0.05 },
    },
    // Resource stale thresholds in minutes
    resourceStalenessThresholdMinutes: { type: Number, default: 60 },
    resourceVeryStalenessThresholdMinutes: { type: Number, default: 1440 }, // 24 hours
    // Presence log stale threshold in minutes
    presenceStalenessThresholdMinutes: { type: Number, default: 480 }, // 8 hours
    // Whether this configuration is active
    active: { type: Boolean, default: true, index: true },
    configVersion: { type: String, default: '1.0' },
  },
  {
    timestamps: true,
  }
);

export const EmergencyMatchingConfiguration = mongoose.model(
  'EmergencyMatchingConfiguration',
  emergencyMatchingConfigurationSchema
);


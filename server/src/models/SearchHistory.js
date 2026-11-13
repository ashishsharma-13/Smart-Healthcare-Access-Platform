import mongoose from 'mongoose';

const searchHistorySchema = new mongoose.Schema(
  {
    searchHistoryId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      default: () => `SRCH-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null,
    },
    searchType: {
      type: String,
      enum: ['DOCTOR', 'ORGANIZATION', 'ALL', 'doctor', 'organization', 'all'],
      default: 'ALL',
      index: true,
    },
    queryText: {
      type: String,
      trim: true,
      default: '',
    },
    filters: {
      specialization: { type: String, default: '' },
      qualification: { type: String, default: '' },
      minExperience: { type: Number, default: null },
      orgType: { type: String, default: '' },
      capability: { type: String, default: '' },
      distanceKm: { type: Number, default: null },
      availableOnly: { type: Boolean, default: false },
      emergencyOnly: { type: Boolean, default: false },
      verifiedOnly: { type: Boolean, default: true },
    },
    coordinates: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
    resultCount: {
      type: Number,
      default: 0,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

searchHistorySchema.index({ userId: 1, createdAt: -1 });

export const SearchHistory = mongoose.model('SearchHistory', searchHistorySchema);


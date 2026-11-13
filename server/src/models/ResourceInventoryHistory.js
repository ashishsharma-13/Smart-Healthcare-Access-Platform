import mongoose from 'mongoose';

const resourceInventoryHistorySchema = new mongoose.Schema(
  {
    historyId: {
      type: String,
      unique: true,
      index: true,
      trim: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HealthcareResource',
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    changedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    changeType: {
      type: String,
      enum: [
        'REGISTER',
        'CAPACITY_UPDATE',
        'STATUS_CHANGE',
        'MAINTENANCE_START',
        'MAINTENANCE_END',
        'AVAILABILITY_ADJUSTMENT',
        'RESERVATION_HOLD',
        'RESERVATION_RELEASE',
        'ALLOCATION',
        'RECONCILIATION',
      ],
      required: true,
      index: true,
    },
    previousQuantity: {
      total: { type: Number, default: 0 },
      available: { type: Number, default: 0 },
      reserved: { type: Number, default: 0 },
      allocated: { type: Number, default: 0 },
      unavailable: { type: Number, default: 0 },
    },
    newQuantity: {
      total: { type: Number, default: 0 },
      available: { type: Number, default: 0 },
      reserved: { type: Number, default: 0 },
      allocated: { type: Number, default: 0 },
      unavailable: { type: Number, default: 0 },
    },
    quantityDelta: {
      type: Number,
      default: 0,
    },
    previousStatus: {
      type: String,
      default: null,
    },
    newStatus: {
      type: String,
      default: null,
    },
    reason: {
      type: String,
      default: '',
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

resourceInventoryHistorySchema.pre('save', function (next) {
  if (!this.historyId) {
    this.historyId = `HIST-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
  }
  next();
});

resourceInventoryHistorySchema.index({ resourceId: 1, timestamp: -1 });
resourceInventoryHistorySchema.index({ organizationId: 1, timestamp: -1 });

export const ResourceInventoryHistory = mongoose.model('ResourceInventoryHistory', resourceInventoryHistorySchema);


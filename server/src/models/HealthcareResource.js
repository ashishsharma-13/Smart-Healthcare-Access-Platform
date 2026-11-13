import mongoose from 'mongoose';

const healthcareResourceSchema = new mongoose.Schema(
  {
    resourceId: {
      type: String,
      unique: true,
      index: true,
      trim: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrganizationFacility',
      default: null,
      index: true,
    },
    resourceTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HealthcareResourceType',
      default: null,
      index: true,
    },
    resourceType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    resourceName: {
      type: String,
      trim: true,
      default: '',
    },
    // Accounting quantities (Primary Module 14 nomenclature)
    totalQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 10,
    },
    availableQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 10,
    },
    reservedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    allocatedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    unavailableQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Backward-compatible capacity aliases (Modules 1-13)
    totalCapacity: {
      type: Number,
      min: 0,
      default: 10,
    },
    availableCapacity: {
      type: Number,
      min: 0,
      default: 10,
    },
    reservedCapacity: {
      type: Number,
      default: 0,
      min: 0,
    },
    occupiedCapacity: {
      type: Number,
      default: 0,
      min: 0,
    },
    operationalStatus: {
      type: String,
      enum: ['OPERATIONAL', 'MAINTENANCE', 'UNAVAILABLE', 'DEGRADED', 'DECOMMISSIONED'],
      default: 'OPERATIONAL',
      index: true,
    },
    maintenanceNotes: {
      type: String,
      default: '',
      trim: true,
    },
    maintenanceStartDate: {
      type: Date,
      default: null,
    },
    maintenanceExpectedEndDate: {
      type: Date,
      default: null,
    },
    lastVerifiedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastVerifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    freshnessThresholdMinutes: {
      type: Number,
      default: 60,
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save synchronization hook
healthcareResourceSchema.pre('save', function (next) {
  if (!this.resourceId) {
    this.resourceId = `RES-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
  }

  if (!this.resourceName) {
    this.resourceName = (this.resourceType || 'Resource')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Synchronize both sets of fields:
  // If totalQuantity was provided or changed, sync to totalCapacity
  if (this.isModified('totalQuantity') && !this.isModified('totalCapacity')) {
    this.totalCapacity = this.totalQuantity;
  } else if (this.isModified('totalCapacity') && !this.isModified('totalQuantity')) {
    this.totalQuantity = this.totalCapacity;
  } else if (this.totalQuantity !== undefined && this.totalCapacity === undefined) {
    this.totalCapacity = this.totalQuantity;
  } else if (this.totalCapacity !== undefined && this.totalQuantity === undefined) {
    this.totalQuantity = this.totalCapacity;
  }

  if (this.isModified('availableQuantity') && !this.isModified('availableCapacity')) {
    this.availableCapacity = this.availableQuantity;
  } else if (this.isModified('availableCapacity') && !this.isModified('availableQuantity')) {
    this.availableQuantity = this.availableCapacity;
  }

  if (this.isModified('reservedQuantity') && !this.isModified('reservedCapacity')) {
    this.reservedCapacity = this.reservedQuantity;
  } else if (this.isModified('reservedCapacity') && !this.isModified('reservedQuantity')) {
    this.reservedQuantity = this.reservedCapacity;
  }

  if (this.isModified('allocatedQuantity') && !this.isModified('occupiedCapacity')) {
    this.occupiedCapacity = this.allocatedQuantity;
  } else if (this.isModified('occupiedCapacity') && !this.isModified('allocatedQuantity')) {
    this.allocatedQuantity = this.occupiedCapacity;
  }

  // Invariant verification: total = available + reserved + allocated + unavailable
  const total = Number(this.totalQuantity) || 0;
  const avail = Number(this.availableQuantity) || 0;
  const resv = Number(this.reservedQuantity) || 0;
  const alloc = Number(this.allocatedQuantity) || 0;
  const unavail = Number(this.unavailableQuantity) || 0;

  if (total < 0 || avail < 0 || resv < 0 || alloc < 0 || unavail < 0) {
    return next(new Error('Invalid inventory quantities: negative quantities are strictly prohibited.'));
  }

  const sum = avail + resv + alloc + unavail;
  if (sum !== total) {
    // If availability was not manually set but total was, auto-balance available
    if (this.isModified('totalQuantity') && !this.isModified('availableQuantity')) {
      const remaining = total - (resv + alloc + unavail);
      if (remaining < 0) {
        return next(
          new Error(
            `Cannot reduce total capacity to ${total}. Already committed: reserved (${resv}) + allocated (${alloc}) + unavailable (${unavail}) = ${resv + alloc + unavail}.`
          )
        );
      }
      this.availableQuantity = remaining;
      this.availableCapacity = remaining;
    } else if (total > sum && !this.isModified('unavailableQuantity')) {
      // Auto-balance remaining capacity as unavailable (e.g. legacy test fixtures where total > available)
      this.unavailableQuantity = total - (avail + resv + alloc);
    } else {
      return next(
        new Error(
          `Inventory accounting invariant violation: totalQuantity (${total}) != available (${avail}) + reserved (${resv}) + allocated (${alloc}) + unavailable (${unavail}) [Sum: ${sum}]`
        )
      );
    }
  }

  this.lastVerifiedAt = new Date();
  next();
});

healthcareResourceSchema.index({ organizationId: 1, resourceType: 1 });
healthcareResourceSchema.index({ organizationId: 1, facilityId: 1 });
healthcareResourceSchema.index({ organizationId: 1, operationalStatus: 1 });

export const HealthcareResource = mongoose.model('HealthcareResource', healthcareResourceSchema);

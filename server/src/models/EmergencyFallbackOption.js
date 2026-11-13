import mongoose from 'mongoose';

const emergencyFallbackOptionSchema = new mongoose.Schema(
  {
    fallbackOptionId: {
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
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    externalFacilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExternalHealthcareFacility',
      default: null,
      index: true,
    },
    optionType: {
      type: String,
      required: true,
      enum: ['PARTICIPATING_ORGANIZATION', 'EXTERNAL_FACILITY'],
      index: true,
    },
    distanceKm: {
      type: Number,
      required: true,
      default: 0,
    },
    travelTimeMinutes: {
      type: Number,
      required: true,
      default: 0,
    },
    availabilityConfirmation: {
      type: String,
      required: true,
      enum: ['CONFIRMED_LIVE', 'UNCONFIRMED_EXTERNAL', 'CAPACITY_RESERVED'],
      default: 'UNCONFIRMED_EXTERNAL',
    },
    selectionStatus: {
      type: String,
      required: true,
      enum: ['AVAILABLE', 'RECOMMENDED', 'SELECTED', 'REJECTED', 'SUPERSEDED'],
      default: 'AVAILABLE',
      index: true,
    },
    disclaimer: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

emergencyFallbackOptionSchema.pre('validate', function (next) {
  if (!this.fallbackOptionId) {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    this.fallbackOptionId = `FBO-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;
  }

  // Exactly one of organizationId or externalFacilityId must be set
  const hasOrg = Boolean(this.organizationId);
  const hasExt = Boolean(this.externalFacilityId);

  if (!hasOrg && !hasExt) {
    return next(new Error('Fallback option must reference either an organizationId or an externalFacilityId'));
  }
  if (hasOrg && hasExt) {
    return next(new Error('Fallback option cannot reference both an organizationId and an externalFacilityId simultaneously'));
  }

  if (hasOrg && this.optionType !== 'PARTICIPATING_ORGANIZATION') {
    this.optionType = 'PARTICIPATING_ORGANIZATION';
  }
  if (hasExt && this.optionType !== 'EXTERNAL_FACILITY') {
    this.optionType = 'EXTERNAL_FACILITY';
  }

  next();
});

export const EmergencyFallbackOption = mongoose.model(
  'EmergencyFallbackOption',
  emergencyFallbackOptionSchema
);


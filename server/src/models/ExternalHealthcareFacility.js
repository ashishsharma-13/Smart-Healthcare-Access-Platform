import mongoose from 'mongoose';

const externalHealthcareFacilitySchema = new mongoose.Schema(
  {
    externalFacilityId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    facilityName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    facilityType: {
      type: String,
      default: 'Public Trauma & Emergency Center',
    },
    address: {
      type: String,
      default: '',
    },
    operatingAddress: {
      buildingNumber: { type: String, default: '' },
      streetName: { type: String, default: '' },
      area: { type: String, default: '' },
      city: { type: String, default: 'New Delhi' },
      pinCode: { type: String, default: '' },
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [77.2090, 28.6139] },
      },
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
    },
    contactNumber: {
      type: String,
      default: '108',
    },
    emergencyContactPhone: {
      type: String,
      default: '108',
    },
    specialties: {
      type: [String],
      default: ['Level-1 Polytrauma', 'Emergency Resuscitation'],
    },
    dataSource: {
      type: String,
      default: 'GOVERNMENT_DIRECTORY',
      enum: ['OPENSTREETMAP', 'GOVERNMENT_DIRECTORY', 'NATIONAL_HEALTH_PORTAL', 'MANUAL'],
    },
    sourceReference: {
      type: String,
      default: 'DELHI_HEALTH_MISSION',
    },
    verificationStatus: {
      type: String,
      enum: ['UNVERIFIED_EXTERNAL', 'DIRECTORY_VERIFIED'],
      default: 'DIRECTORY_VERIFIED',
    },
    lastVerifiedAt: {
      type: Date,
      default: Date.now,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

externalHealthcareFacilitySchema.index({ location: '2dsphere' });

externalHealthcareFacilitySchema.pre('validate', function (next) {
  if (!this.externalFacilityId) {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    this.externalFacilityId = `EXT-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;
  }
  // Ensure location.coordinates is aligned with [longitude, latitude]
  if (this.longitude != null && this.latitude != null) {
    if (!this.location || !this.location.coordinates || this.location.coordinates.length < 2) {
      this.location = {
        type: 'Point',
        coordinates: [this.longitude, this.latitude],
      };
    }
  }
  next();
});

export const ExternalHealthcareFacility = mongoose.model(
  'ExternalHealthcareFacility',
  externalHealthcareFacilitySchema
);


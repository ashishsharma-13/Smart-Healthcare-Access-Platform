import mongoose from 'mongoose';

const facilityAddressSchema = new mongoose.Schema(
  {
    buildingNumber: { type: String, trim: true, default: '' },
    streetName: { type: String, trim: true, default: '' },
    locality: { type: String, trim: true, default: '' },
    landmark: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    district: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    pinCode: {
      type: String,
      trim: true,
      default: '',
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^\d{6}$/.test(v);
        },
        message: 'PIN Code must be exactly 6 digits.',
      },
    },
    country: { type: String, trim: true, default: 'India' },
  },
  { _id: false }
);

const organizationFacilitySchema = new mongoose.Schema(
  {
    facilityId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    facilityName: {
      type: String,
      required: true,
      trim: true,
    },
    facilityType: {
      type: String,
      enum: ['main_campus', 'branch', 'diagnostic_center', 'outpatient_clinic', 'emergency_trauma_unit'],
      default: 'main_campus',
      index: true,
    },
    isPrimary: {
      type: Boolean,
      default: false,
      index: true,
    },
    address: {
      type: facilityAddressSchema,
      default: () => ({}),
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        default: [77.2090, 28.6139],
      },
    },
    latitude: {
      type: Number,
      default: 28.6139,
    },
    longitude: {
      type: Number,
      default: 77.2090,
    },
    capabilities: [
      {
        type: String,
      },
    ],
    operationalStatus: {
      type: String,
      enum: ['ACTIVE', 'TEMPORARILY_CLOSED', 'UNDER_MAINTENANCE', 'DECOMMISSIONED'],
      default: 'ACTIVE',
      index: true,
    },
    contactPhone: {
      type: String,
      default: '',
    },
    totalBeds: {
      type: Number,
      default: 50,
    },
    icuBeds: {
      type: Number,
      default: 10,
    },
    operationTheatres: {
      type: Number,
      default: 2,
    },
  },
  {
    timestamps: true,
  }
);

organizationFacilitySchema.index({ location: '2dsphere' });

export const OrganizationFacility = mongoose.model('OrganizationFacility', organizationFacilitySchema);


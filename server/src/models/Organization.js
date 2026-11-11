import mongoose from 'mongoose';

const addressSubSchema = new mongoose.Schema(
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

const operatingAddressSubSchema = new mongoose.Schema(
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
    isSameAsRegistered: { type: Boolean, default: true },
  },
  { _id: false }
);

const organizationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    orgType: {
      type: String,
      enum: ['hospital', 'clinic', 'specialty_center', 'fallback_facility'],
      default: 'hospital',
      index: true,
    },
    registrationNumber: {
      type: String,
      required: true,
      trim: true,
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
      index: true,
    },
    // Official Legal / Registered Address
    registeredAddress: {
      type: addressSubSchema,
      default: () => ({}),
    },
    // Actual Physical Operating Address where patients receive healthcare services
    operatingAddress: {
      type: operatingAddressSubSchema,
      default: () => ({ isSameAsRegistered: true }),
    },
    // Legacy backwards-compatible address field
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      postalCode: { type: String, default: '' },
    },
    // GeoJSON Point location for physical operating coordinates: [longitude, latitude]
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
        validate: {
          validator: function (coords) {
            if (!Array.isArray(coords) || coords.length !== 2) return false;
            const [lng, lat] = coords;
            return (
              typeof lng === 'number' &&
              typeof lat === 'number' &&
              lat >= -90 &&
              lat <= 90 &&
              lng >= -180 &&
              lng <= 180
            );
          },
          message: 'Location coordinates must be [longitude, latitude] with latitude between -90 and 90, and longitude between -180 and 180.',
        },
      },
    },
    isParticipating: {
      type: Boolean,
      default: true,
    },
    emergencyCapable: {
      type: Boolean,
      default: true,
      index: true,
    },
    emergencyContactPhone: {
      type: String,
      default: '',
    },
    qrCheckinCode: {
      type: String,
      unique: true,
      required: true,
    },
    facilities: [
      {
        type: String,
      },
    ],
    rating: {
      type: Number,
      default: 4.7,
    },
    totalReviews: {
      type: Number,
      default: 50,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save synchronization hook
organizationSchema.pre('save', function (next) {
  // If operating address is same as registered, sync values
  if (this.operatingAddress?.isSameAsRegistered && this.registeredAddress) {
    const reg = this.registeredAddress;
    this.operatingAddress.buildingNumber = reg.buildingNumber || '';
    this.operatingAddress.streetName = reg.streetName || '';
    this.operatingAddress.locality = reg.locality || '';
    this.operatingAddress.landmark = reg.landmark || '';
    this.operatingAddress.city = reg.city || '';
    this.operatingAddress.district = reg.district || '';
    this.operatingAddress.state = reg.state || '';
    this.operatingAddress.pinCode = reg.pinCode || '';
    this.operatingAddress.country = reg.country || 'India';
  }

  // Populate legacy address for backwards compatibility
  const op = this.operatingAddress || {};
  const reg = this.registeredAddress || {};
  const streetParts = [
    op.buildingNumber || reg.buildingNumber,
    op.streetName || reg.streetName,
    op.locality || reg.locality,
  ].filter(Boolean);

  this.address = {
    street: streetParts.join(', ') || this.address?.street || '',
    city: op.city || reg.city || this.address?.city || '',
    state: op.state || reg.state || this.address?.state || '',
    postalCode: op.pinCode || reg.pinCode || this.address?.postalCode || '',
  };

  next();
});

organizationSchema.index({ location: '2dsphere' });

export const Organization = mongoose.model('Organization', organizationSchema);

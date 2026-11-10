import mongoose from 'mongoose';

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
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      postalCode: { type: String, default: '' },
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
        default: [77.2090, 28.6139], // Default coords
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

organizationSchema.index({ location: '2dsphere' });

export const Organization = mongoose.model('Organization', organizationSchema);


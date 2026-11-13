import mongoose from 'mongoose';

const emergencyRequestSchema = new mongoose.Schema(
  {
    emergencyRequestId: {
      type: String,
      unique: true,
      index: true,
    },
    requestCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reportedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    patientName: {
      type: String,
      required: true,
    },
    patientPhone: {
      type: String,
      required: true,
    },
    emergencyCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyCategory',
      default: null,
      index: true,
    },
    emergencyType: {
      type: String,
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['critical', 'severe', 'moderate'],
      default: 'critical',
    },
    description: {
      type: String,
      default: '',
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
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
    address: {
      type: String,
      default: '',
    },
    locationAddress: {
      type: String,
      default: '',
    },
    locationAccuracy: {
      type: Number,
      default: null,
    },
    locationSource: {
      type: String,
      enum: ['GPS', 'MANUAL'],
      default: 'GPS',
    },
    locationConfirmed: {
      type: Boolean,
      default: true,
    },
    locationSnapshot: {
      coordinates: { type: [Number], default: [0, 0] },
      address: { type: String, default: '' },
      accuracy: { type: Number, default: null },
      source: { type: String, default: 'GPS' },
      capturedAt: { type: Date, default: Date.now },
    },
    ambulanceRequirement: {
      type: String,
      enum: ['YES', 'NO', 'ALREADY_ARRANGED', 'yes', 'no', 'already_arranged'],
      default: 'NO',
      set: (v) => (v ? v.toUpperCase() : 'NO'),
    },
    status: {
      type: String,
      enum: [
        'pending',
        'CREATED',
        'BROADCASTED',
        'RESPONSES_RECEIVED',
        'DESTINATION_SELECTED',
        'RESOURCES_RESERVED',
        'PATIENT_EN_ROUTE',
        'ARRIVED',
        'COMPLETED',
        'DECLINED',
        'NO_RESPONSE',
        'EXPIRED',
        'CANCELLED',
        'RESERVATION_RELEASED',
        'SEARCH_EXPANDED',
        'EXTERNAL_DESTINATION_SELECTED',
        'RECOVERY_PENDING',
        'RECOVERY_CONFIRMED',
        'active',
      ],
      default: 'CREATED',
      index: true,
    },
    selectedOrganizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    selectedExternalFacilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExternalHealthcareFacility',
      default: null,
    },
    isExternalDestination: {
      type: Boolean,
      default: false,
    },
    fallbackSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyFallbackSession',
      default: null,
    },
    destinationSelectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyDestinationSelection',
      default: null,
    },
    activeReservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ResourceReservation',
      default: null,
    },
    temporaryReservationExpiresAt: {
      type: Date,
      default: null,
    },
    destinationConfirmedAt: Date,
    cancellationReason: {
      type: String,
      default: '',
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    statusHistory: [
      {
        status: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        notes: String,
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

emergencyRequestSchema.pre('validate', function (next) {
  if (!this.requestCode) {
    this.requestCode = `EMG-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
  }
  if (!this.emergencyRequestId) {
    this.emergencyRequestId = this.requestCode;
  }
  if (this.location?.coordinates && this.location.coordinates.length === 2) {
    if (this.longitude === null || this.longitude === undefined) {
      this.longitude = this.location.coordinates[0];
    }
    if (this.latitude === null || this.latitude === undefined) {
      this.latitude = this.location.coordinates[1];
    }
  } else if (this.latitude !== null && this.longitude !== null && this.latitude !== undefined && this.longitude !== undefined) {
    this.location = {
      type: 'Point',
      coordinates: [this.longitude, this.latitude],
    };
  }
  if (!this.locationAddress && this.address) {
    this.locationAddress = this.address;
  }
  if (!this.address && this.locationAddress) {
    this.address = this.locationAddress;
  }
  if (!this.locationSnapshot || !this.locationSnapshot.coordinates || this.locationSnapshot.coordinates.length === 0) {
    this.locationSnapshot = {
      coordinates: this.location?.coordinates || [this.longitude || 0, this.latitude || 0],
      address: this.address || this.locationAddress || '',
      accuracy: this.locationAccuracy || 10,
      source: this.locationSource || 'GPS',
      capturedAt: new Date(),
    };
  }
  next();
});

emergencyRequestSchema.index({ location: '2dsphere' });

export const EmergencyRequest = mongoose.model('EmergencyRequest', emergencyRequestSchema);

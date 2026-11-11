import mongoose from 'mongoose';

const emergencyRequestSchema = new mongoose.Schema(
  {
    requestCode: {
      type: String,
      required: true,
      unique: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
    emergencyType: {
      type: String,
      enum: [
        'cardiac',
        'stroke',
        'trauma',
        'pregnancy',
        'burns',
        'poisoning',
        'snake_bite',
        'fracture',
        'child',
        'respiratory',
        'general',
        'other',
      ],
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
    locationAddress: {
      type: String,
      default: '',
    },
    ambulanceRequirement: {
      type: String,
      enum: ['yes', 'no', 'already_arranged'],
      default: 'no',
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
        'active',
      ],
      default: 'pending',
      index: true,
    },
    selectedOrganizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    destinationConfirmedAt: Date,
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

emergencyRequestSchema.index({ location: '2dsphere' });

export const EmergencyRequest = mongoose.model('EmergencyRequest', emergencyRequestSchema);

import mongoose from 'mongoose';

const emergencyRequestEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      unique: true,
      index: true,
    },
    emergencyRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyRequest',
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: [
        'REQUEST_CREATED',
        'LOCATION_UPDATED',
        'LOCATION_CONFIRMED',
        'GUIDANCE_VIEWED',
        'STATUS_UPDATED',
        'REQUEST_CANCELLED',
        'BROADCAST_TRIGGERED',
        'DESTINATION_SELECTED',
        'RESOURCES_RESERVED',
        'JOURNEY_STARTED',
        'LOCATION_SHARING_STARTED',
        'LOCATION_SHARING_STOPPED',
        'ARRIVAL_VERIFIED',
        'RESOURCE_ALLOCATED',
        'COORDINATION_COMPLETED',
      ],
      default: 'REQUEST_CREATED',
    },
    previousState: {
      type: String,
      default: null,
    },
    newState: {
      type: String,
      default: 'CREATED',
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

emergencyRequestEventSchema.pre('save', function (next) {
  if (!this.eventId) {
    this.eventId = `EVT-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
  }
  next();
});

export const EmergencyRequestEvent = mongoose.model('EmergencyRequestEvent', emergencyRequestEventSchema);


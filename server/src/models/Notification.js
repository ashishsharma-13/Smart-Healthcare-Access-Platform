import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    notificationId: {
      type: String,
      unique: true,
      index: true,
      default: () => `NOTIF-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    },
    recipientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    emergencyRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyRequest',
      default: null,
      index: true,
    },
    notificationType: {
      type: String,
      required: true,
      index: true,
      enum: [
        'DOCTOR_REGISTRATION',
        'DOCTOR_VERIFICATION',
        'ORGANIZATION_REGISTRATION',
        'ORGANIZATION_VERIFICATION',
        'AFFILIATION_REQUEST',
        'AFFILIATION_ACCEPTED',
        'AFFILIATION_TERMINATED',
        'APPOINTMENT_BOOKED',
        'APPOINTMENT_CANCELLED',
        'APPOINTMENT_RESCHEDULED',
        'APPOINTMENT_REMINDER',
        'EMERGENCY_REQUEST_CREATED',
        'EMERGENCY_BEEP_BROADCAST',
        'EMERGENCY_BEEP_ACCEPTED',
        'EMERGENCY_BEEP_DECLINED',
        'EMERGENCY_RESPONSES_COLLECTED',
        'EMERGENCY_DESTINATION_SELECTED',
        'EMERGENCY_ORGANIZATION_CONFIRMED',
        'EMERGENCY_RESOURCE_RESERVED',
        'EMERGENCY_RESERVATION_EXPIRING_SOON',
        'EMERGENCY_RESERVATION_EXPIRED',
        'EMERGENCY_JOURNEY_STARTED',
        'EMERGENCY_PATIENT_ARRIVED',
        'EMERGENCY_RESOURCE_ALLOCATED',
        'EMERGENCY_COORDINATION_COMPLETED',
        'EMERGENCY_FALLBACK_STARTED',
        'EMERGENCY_SEARCH_EXPANDED',
        'EMERGENCY_DESTINATION_CHANGED',
        'EMERGENCY_RECOVERY_INITIATED',
        'CRITICAL_OPERATIONAL_FAILURE',
        'GENERAL_SYSTEM',
      ],
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: ['LOW', 'NORMAL', 'HIGH', 'CRITICAL', 'EMERGENCY'],
      default: 'NORMAL',
      index: true,
    },
    status: {
      type: String,
      enum: ['CREATED', 'PENDING', 'PROCESSING', 'SENT', 'DELIVERED', 'READ', 'RETRY_PENDING', 'FAILED', 'CANCELLED'],
      default: 'CREATED',
      index: true,
    },
    actionUrl: {
      type: String,
      default: null,
    },
    readAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipientUserId: 1, status: 1, createdAt: -1 });
notificationSchema.index({ organizationId: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);

import mongoose from 'mongoose';

const appointmentNotificationSchema = new mongoose.Schema(
  {
    notificationId: {
      type: String,
      unique: true,
      index: true,
      default: () => `NOTIF-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      index: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    notificationType: {
      type: String,
      enum: [
        'BOOKING_CONFIRMATION',
        'CANCELLATION',
        'RESCHEDULE',
        'REMINDER',
        'COMPLETED',
        'NO_SHOW',
      ],
      required: true,
      index: true,
    },
    deliveryStatus: {
      type: String,
      enum: ['PENDING', 'SENT', 'FAILED'],
      default: 'SENT',
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const AppointmentNotification = mongoose.model(
  'AppointmentNotification',
  appointmentNotificationSchema
);


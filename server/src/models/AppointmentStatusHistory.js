import mongoose from 'mongoose';

const appointmentStatusHistorySchema = new mongoose.Schema(
  {
    historyId: {
      type: String,
      unique: true,
      index: true,
      default: () => `HIST-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      index: true,
    },
    previousStatus: {
      type: String,
      default: null,
    },
    newStatus: {
      type: String,
      required: true,
      index: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    reason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const AppointmentStatusHistory = mongoose.model(
  'AppointmentStatusHistory',
  appointmentStatusHistorySchema
);


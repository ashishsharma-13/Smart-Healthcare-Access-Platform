import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    appointmentNumber: {
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
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    slotDate: {
      type: String, // Format YYYY-MM-DD
      required: true,
      index: true,
    },
    slotTime: {
      type: String, // e.g. "09:30 AM"
      required: true,
    },
    status: {
      type: String,
      enum: ['booked', 'completed', 'cancelled', 'rescheduled'],
      default: 'booked',
      index: true,
    },
    patientNotes: {
      type: String,
      default: '',
    },
    qrToken: {
      type: String,
      unique: true,
      sparse: true,
    },
    cancellationReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent double booking at the same doctor, date and time unless cancelled
appointmentSchema.index(
  { doctorId: 1, slotDate: 1, slotTime: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['booked', 'rescheduled'] } },
  }
);

export const Appointment = mongoose.model('Appointment', appointmentSchema);


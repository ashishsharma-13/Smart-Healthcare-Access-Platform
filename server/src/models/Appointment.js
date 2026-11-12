import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    appointmentNumber: {
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
    affiliationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DoctorAffiliation',
      index: true,
    },
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrganizationFacility',
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
    startAt: {
      type: Date,
      index: true,
    },
    endAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: [
        'CONFIRMED',
        'CANCELLED',
        'RESCHEDULED',
        'COMPLETED',
        'NO_SHOW',
        // Lowercase backward-compatibility aliases
        'booked',
        'cancelled',
        'rescheduled',
        'completed',
        'no_show',
      ],
      default: 'CONFIRMED',
      index: true,
    },
    reason: {
      type: String,
      default: '',
    },
    patientNotes: {
      type: String,
      default: '',
    },
    clinicalNotes: {
      type: String,
      default: '',
    },
    qrToken: {
      type: String,
      unique: true,
      sparse: true,
    },
    cancelledAt: {
      type: Date,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    cancellationReason: {
      type: String,
      default: '',
    },
    rescheduledFromId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      index: true,
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

appointmentSchema.pre('save', function (next) {
  if (!this.appointmentId) {
    this.appointmentId = this.appointmentNumber || `APT-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  if (!this.appointmentNumber) {
    this.appointmentNumber = this.appointmentId;
  }
  if (!this.reason && this.patientNotes) {
    this.reason = this.patientNotes;
  } else if (!this.patientNotes && this.reason) {
    this.patientNotes = this.reason;
  }
  next();
});

// Prevent doctor double booking at the same date and time across ANY organization unless cancelled/completed/rescheduled
appointmentSchema.index(
  { doctorId: 1, slotDate: 1, slotTime: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['CONFIRMED', 'booked', 'RESCHEDULED', 'rescheduled'] },
    },
  }
);

// Prevent patient from double booking overlapping appointments at the same date and time
appointmentSchema.index(
  { patientId: 1, slotDate: 1, slotTime: 1 },
  {
    partialFilterExpression: {
      status: { $in: ['CONFIRMED', 'booked'] },
    },
  }
);

export const Appointment = mongoose.model('Appointment', appointmentSchema);

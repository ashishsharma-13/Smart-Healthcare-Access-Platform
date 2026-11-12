import mongoose from 'mongoose';

const scheduleDaySchema = new mongoose.Schema(
  {
    scheduleDayId: {
      type: String,
      default: () => `DAY-${Date.now().toString(36)}-${Math.floor(100 + Math.random() * 900)}`,
    },
    dayOfWeek: {
      type: Number, // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      required: true,
      min: 0,
      max: 6,
    },
    startTime: {
      type: String, // e.g. "09:00" (24h format HH:mm)
      required: true,
    },
    endTime: {
      type: String, // e.g. "17:00"
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const breakSchema = new mongoose.Schema(
  {
    breakId: {
      type: String,
      default: () => `BRK-${Date.now().toString(36)}-${Math.floor(100 + Math.random() * 900)}`,
    },
    title: {
      type: String,
      default: 'Break',
    },
    dayOfWeek: {
      type: Number, // Optional dayOfWeek for recurring breaks
    },
    startTime: {
      type: String, // e.g. "13:00"
      required: true,
    },
    endTime: {
      type: String, // e.g. "14:00"
      required: true,
    },
    startDatetime: Date,
    endDatetime: Date,
  },
  { _id: false }
);

const appointmentAvailabilitySchema = new mongoose.Schema(
  {
    availabilityId: {
      type: String,
      default: () => `AVAIL-${Date.now().toString(36)}-${Math.floor(100 + Math.random() * 900)}`,
    },
    startTime: {
      type: String,
      default: '09:00',
    },
    endTime: {
      type: String,
      default: '17:00',
    },
    slotDuration: {
      type: Number, // in minutes
      default: 30,
    },
    bufferDuration: {
      type: Number, // in minutes
      default: 0,
    },
    maxDailyAppointments: {
      type: Number,
      default: 20,
    },
    advanceBookingDays: {
      type: Number,
      default: 30,
    },
    cutoffHours: {
      type: Number,
      default: 2,
    },
  },
  { _id: false }
);

const doctorScheduleSchema = new mongoose.Schema(
  {
    scheduleId: {
      type: String,
      unique: true,
      sparse: true,
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
      required: true,
      index: true,
    },
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrganizationFacility',
    },
    scheduleType: {
      type: String,
      enum: ['WEEKLY_RECURRING', 'DATE_SPECIFIC'],
      default: 'WEEKLY_RECURRING',
      index: true,
    },
    specificDate: {
      type: String, // Format YYYY-MM-DD for DATE_SPECIFIC
    },
    effectiveFrom: {
      type: Date,
      default: Date.now,
    },
    effectiveUntil: {
      type: Date,
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'DRAFT'],
      default: 'ACTIVE',
      index: true,
    },
    scheduleDays: [scheduleDaySchema],
    appointmentAvailability: {
      type: appointmentAvailabilitySchema,
      default: () => ({}),
    },
    breaks: [breakSchema],
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

doctorScheduleSchema.pre('save', function (next) {
  if (!this.scheduleId) {
    this.scheduleId = `SCHED-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  next();
});

doctorScheduleSchema.index({ doctorId: 1, affiliationId: 1, status: 1 });

export const DoctorSchedule = mongoose.model('DoctorSchedule', doctorScheduleSchema);


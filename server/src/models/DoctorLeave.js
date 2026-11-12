import mongoose from 'mongoose';

const doctorLeaveSchema = new mongoose.Schema(
  {
    leaveId: {
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
    startDate: {
      type: String, // Format YYYY-MM-DD
      required: true,
      index: true,
    },
    endDate: {
      type: String, // Format YYYY-MM-DD
      required: true,
      index: true,
    },
    startDatetime: {
      type: Date,
    },
    endDatetime: {
      type: Date,
    },
    startTime: {
      type: String, // Optional for partial-day leave, e.g. "09:00"
    },
    endTime: {
      type: String, // Optional for partial-day leave, e.g. "13:00"
    },
    isFullDay: {
      type: Boolean,
      default: true,
    },
    leaveType: {
      type: String,
      enum: ['VACATION', 'SICK', 'CONFERENCE', 'PERSONAL', 'EMERGENCY'],
      default: 'VACATION',
    },
    reason: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'CANCELLED'],
      default: 'APPROVED',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

doctorLeaveSchema.pre('save', function (next) {
  if (!this.leaveId) {
    this.leaveId = `LEAVE-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  next();
});

export const DoctorLeave = mongoose.model('DoctorLeave', doctorLeaveSchema);


import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema(
  {
    feedbackId: {
      type: String,
      unique: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    feedbackType: {
      type: String,
      enum: ['APPOINTMENT', 'EMERGENCY'],
      required: true,
      index: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
      index: true,
    },
    emergencyRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyRequest',
      default: null,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      default: null,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    // Primary Overall Rating: 1 to 5 Stars
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    // Experience sub-attribute ratings (1 to 5)
    careQualityRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    waitTimeRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    staffBehaviorRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    cleanlinessRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    comments: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['SUBMITTED', 'VERIFIED', 'FLAGGED'],
      default: 'SUBMITTED',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

feedbackSchema.pre('save', function (next) {
  if (!this.feedbackId) {
    const prefix = this.feedbackType === 'EMERGENCY' ? 'FB-EMG' : 'FB-APT';
    this.feedbackId = `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  next();
});

// Compound unique indexes to prevent duplicate reviews for the same visit
feedbackSchema.index(
  { patientId: 1, appointmentId: 1 },
  {
    unique: true,
    partialFilterExpression: { appointmentId: { $type: 'objectId' } },
  }
);

feedbackSchema.index(
  { patientId: 1, emergencyRequestId: 1 },
  {
    unique: true,
    partialFilterExpression: { emergencyRequestId: { $type: 'objectId' } },
  }
);

export const Feedback = mongoose.model('Feedback', feedbackSchema);

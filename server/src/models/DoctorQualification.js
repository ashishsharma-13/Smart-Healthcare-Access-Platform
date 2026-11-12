import mongoose from 'mongoose';

const doctorQualificationSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true,
    },
    degree: {
      type: String,
      required: true,
      trim: true,
    },
    institution: {
      type: String,
      required: true,
      trim: true,
    },
    yearOfPassing: {
      type: Number,
    },
    certificateUrl: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

export const DoctorQualification = mongoose.model('DoctorQualification', doctorQualificationSchema);


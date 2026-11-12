import mongoose from 'mongoose';

const doctorRegistrationSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true,
    },
    registrationNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    issuingAuthority: {
      type: String,
      required: true,
      trim: true,
      default: 'National Medical Commission',
    },
    jurisdiction: {
      type: String,
      required: true,
      trim: true,
      default: 'India',
    },
    registrationYear: {
      type: Number,
      default: new Date().getFullYear(),
    },
    certificateDocumentUrl: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

export const DoctorRegistration = mongoose.model('DoctorRegistration', doctorRegistrationSchema);


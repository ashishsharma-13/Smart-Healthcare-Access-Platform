import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['patient', 'doctor', 'organization', 'admin'],
      default: 'patient',
    },
    phone: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
    },
    dateOfBirth: {
      type: String,
      default: '',
    },
    gender: {
      type: String,
      default: '',
    },
    bloodGroup: {
      type: String,
      default: '',
    },
    allergies: {
      type: [String],
      default: [],
    },
    chronicConditions: {
      type: [String],
      default: [],
    },
    currentMedications: {
      type: [String],
      default: [],
    },
    emergencyContact: {
      name: { type: String, default: '' },
      relationship: { type: String, default: '' },
      phone: { type: String, default: '' },
    },
    medicalNotes: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model('User', userSchema);


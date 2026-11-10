import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/UserRepository.js';
import { doctorRepository } from '../repositories/DoctorRepository.js';
import { organizationRepository } from '../repositories/OrganizationRepository.js';

export class AuthService {
  generateToken(user) {
    const payload = {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
    };
    return jwt.sign(payload, process.env.JWT_SECRET || 'shap_super_secret_jwt_key_2025_access_health', {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
  }

  async registerUser({ name, email, password, role = 'patient', phone, address, doctorDetails, orgDetails }) {
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    const user = await userRepository.create({
      name,
      email,
      password,
      role,
      phone,
      address,
    });

    let extraProfile = null;

    if (role === 'doctor' && doctorDetails) {
      extraProfile = await doctorRepository.create({
        userId: user._id,
        specialization: doctorDetails.specialization || 'General Physician',
        qualifications: doctorDetails.qualifications || ['MBBS'],
        experienceYears: doctorDetails.experienceYears || 0,
        licenseNumber: doctorDetails.licenseNumber || 'MED-PENDING',
        licenseDocumentUrl: doctorDetails.licenseDocumentUrl || '',
        consultationFee: doctorDetails.consultationFee || 500,
        bio: doctorDetails.bio || '',
        verificationStatus: 'pending',
      });
    } else if (role === 'organization' && orgDetails) {
      const code = `ORG-QR-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 899 + 100)}`;
      extraProfile = await organizationRepository.create({
        userId: user._id,
        name: orgDetails.name || name,
        orgType: orgDetails.orgType || 'hospital',
        registrationNumber: orgDetails.registrationNumber || 'REG-PENDING',
        address: orgDetails.address || address || {},
        location: orgDetails.location || {
          type: 'Point',
          coordinates: orgDetails.coordinates || [77.2090, 28.6139],
        },
        emergencyCapable: orgDetails.emergencyCapable !== undefined ? orgDetails.emergencyCapable : true,
        emergencyContactPhone: orgDetails.emergencyContactPhone || phone || '',
        qrCheckinCode: code,
        facilities: orgDetails.facilities || ['Emergency Care', 'ICU', 'General Ward'],
        verificationStatus: 'pending',
      });
    }

    const token = this.generateToken(user);
    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
      profile: extraProfile,
    };
  }

  async login(email, password) {
    const user = await userRepository.findByEmail(email, true);
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new Error('Invalid email or password.');
    }

    if (!user.isActive) {
      throw new Error('Account has been deactivated. Please contact support.');
    }

    let extraProfile = null;
    if (user.role === 'doctor') {
      extraProfile = await doctorRepository.findByUserId(user._id);
    } else if (user.role === 'organization') {
      extraProfile = await organizationRepository.findByUserId(user._id);
    }

    const token = this.generateToken(user);
    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
      },
      profile: extraProfile,
    };
  }

  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('User not found');

    let extraProfile = null;
    if (user.role === 'doctor') {
      extraProfile = await doctorRepository.findByUserId(user._id);
    } else if (user.role === 'organization') {
      extraProfile = await organizationRepository.findByUserId(user._id);
    }

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        address: user.address,
      },
      profile: extraProfile,
    };
  }
}

export const authService = new AuthService();


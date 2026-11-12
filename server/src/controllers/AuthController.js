import 'dotenv/config';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { User } from '../models/User.js';
import { Doctor } from '../models/Doctor.js';
import { Organization } from '../models/Organization.js';
import { DoctorRegistration } from '../models/DoctorRegistration.js';
import { DoctorVerificationApplication } from '../models/DoctorVerificationApplication.js';
import { OrganizationAdmin } from '../models/OrganizationAdmin.js';
import { OrganizationFacility } from '../models/OrganizationFacility.js';
import { OrganizationDocument } from '../models/OrganizationDocument.js';
import { OrganizationSpecialization } from '../models/OrganizationSpecialization.js';
import { OrganizationVerificationApplication } from '../models/OrganizationVerificationApplication.js';

const OTP_TTL_MS = 5 * 60 * 1000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

// In-memory OTP storage: key = normalized target (email or phone), value = { otp, expiresAt, verified }
const otpStore = new Map();

// Setup nodemailer transporter with Gmail using process.env.EMAIL_USER and process.env.EMAIL_PASS
export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const getTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const normalizeTarget = (target) => {
  const raw = String(target || '').trim();
  if (raw.includes('@')) {
    return raw.toLowerCase();
  }
  return raw.replace(/\s+/g, '');
};

// Active refresh tokens store & token blacklist for revocations
export const activeRefreshTokens = new Set();
export const tokenBlacklist = new Set();
export const passwordResetStore = new Map();

export const isTokenRevoked = (token) => {
  return tokenBlacklist.has(token);
};

export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id || user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status || (user.isActive ? 'active' : 'suspended'),
    },
    process.env.JWT_SECRET || 'shap_super_secret_jwt_key_2025_access_health',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

export const generateRefreshToken = (user) => {
  const refreshToken = jwt.sign(
    {
      id: user._id || user.id,
      role: user.role,
      type: 'refresh',
      jti: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random()}`,
    },
    process.env.JWT_REFRESH_SECRET || 'shap_refresh_secret_jwt_key_2025_access_health',
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
  activeRefreshTokens.add(refreshToken);
  return refreshToken;
};

// 1. Send OTP (Validates target, checks existing users, generates 6-digit OTP, stores in Map with 5-min TTL, sends email via transporter, returns devOtp in JSON)
export const sendOtp = async (req, res) => {
  try {
    const rawTarget = req.body.target || req.body.email || req.body.phone;
    let type = req.body.type;

    if (!rawTarget) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either an email or a phone number.'
      });
    }

    const targetStr = String(rawTarget).trim();
    if (!type) {
      type = targetStr.includes('@') ? 'email' : 'phone';
    }

    let cleanTarget = '';

    if (type === 'phone') {
      cleanTarget = targetStr.replace(/\s+/g, '');
      if (!PHONE_REGEX.test(cleanTarget)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone format. Please enter 8-15 digits (e.g. +919956257068 or 9956257068).'
        });
      }
    } else if (type === 'email') {
      cleanTarget = targetStr.toLowerCase();
      if (!EMAIL_REGEX.test(cleanTarget)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email address format.'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Target type must be "email" or "phone".'
      });
    }

    // Check for existing users
    const existing = await User.findOne(type === 'email' ? { email: cleanTarget } : { phone: cleanTarget });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `An account with this ${type} already exists. Please sign in.`
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + OTP_TTL_MS;

    // Store in in-memory Map with 5-minute TTL
    otpStore.set(cleanTarget, { otp, expiresAt, verified: false });

    console.log(`\n========================================`);
    console.log(`[SHAP OTP] Target: ${cleanTarget} (${type}) | OTP: ${otp}`);
    console.log(`========================================\n`);

    // Send email via transporter if type is email
    if (type === 'email') {
      const emailUser = process.env.EMAIL_USER;
      const emailPass = process.env.EMAIL_PASS;

      if (emailUser && emailPass) {
        try {
          const activeTransporter = getTransporter();
          await activeTransporter.sendMail({
            from: `"Smart Healthcare Access Platform" <${emailUser}>`,
            to: cleanTarget,
            subject: 'Your SHAP Verification Code',
            text: `Your SHAP verification code is: ${otp}. It will expire in 5 minutes.`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <h2 style="color: #2563eb; margin: 0; font-size: 22px; font-weight: 700;">Smart Healthcare Access Platform</h2>
                  <p style="color: #64748b; font-size: 13px; margin-top: 6px;">Email Verification Code</p>
                </div>
                <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">Hello,</p>
                <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                  Use the 6-digit verification code below to complete your registration. This code will expire in <strong>5 minutes</strong>.
                </p>
                <div style="background-color: #eff6ff; border: 1px dashed #3b82f6; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0;">
                  <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8; font-family: monospace;">${otp}</span>
                </div>
                <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin-top: 24px; text-align: center;">
                  If you did not request this verification code, please ignore this email.
                </p>
              </div>
            `,
          });
        } catch (mailError) {
          console.error('[Nodemailer Error] Could not send OTP email via Gmail:', mailError.message);
          if (process.env.NODE_ENV === 'production') {
            otpStore.delete(cleanTarget);
            return res.status(500).json({
              success: false,
              message: 'Failed to send verification email. Please try again later.'
            });
          }
        }
      } else {
        console.warn('[SHAP OTP] EMAIL_USER or EMAIL_PASS not configured. Skipping Gmail dispatch.');
      }
    }

    return res.status(200).json({
      success: true,
      message: type === 'email'
        ? `OTP sent to ${cleanTarget}. Valid for 5 minutes.`
        : `OTP generated for ${cleanTarget}. Valid for 5 minutes.`,
      devOtp: otp,
    });
  } catch (error) {
    console.error('Send OTP Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send OTP.' });
  }
};

// 2. Verify OTP (Checks code, expiry, and marks verified: true in the Map)
export const verifyOtp = async (req, res) => {
  try {
    const rawTarget = req.body.target || req.body.email || req.body.phone;
    const { otp } = req.body;

    if (!rawTarget || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Target (email or phone) and OTP code are required.'
      });
    }

    const cleanTarget = normalizeTarget(rawTarget);
    const record = otpStore.get(cleanTarget);

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'No OTP requested for this contact or it has expired.'
      });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanTarget);
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    if (String(record.otp) !== String(otp).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect OTP. Please check and try again.'
      });
    }

    // Mark verified: true in the Map
    record.verified = true;
    otpStore.set(cleanTarget, record);

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully.',
      verified: true,
    });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify OTP.' });
  }
};

// 3. Register (Requires name, password, and at least ONE contact method. Requires at least one verified identifier in the Map. Catches code 11000 and Mongoose validation errors returning 400 responses.)
export const register = async (req, res) => {
  try {
    let { name, email, phone, password, role = 'patient', doctorDetails, orgDetails } = req.body;

    name = name ? String(name).trim() : '';
    password = password ? String(password) : '';
    if (email) email = String(email).trim().toLowerCase();
    if (phone) phone = String(phone).trim().replace(/\s+/g, '');

    if (!name || !password) {
      return res.status(400).json({
        success: false,
        message: 'Full name and password are required.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // WEB_ADMIN / ADMIN: Controlled administrator provisioning only. Never allow public registration.
    if (role === 'admin' || role === 'web_admin') {
      return res.status(403).json({
        success: false,
        message: 'Public administrator registration is prohibited. Administrator accounts must be provisioned by system authority.'
      });
    }

    // Requires at least ONE contact method (email OR phone)
    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'At least one contact method (email or phone) is required.'
      });
    }

    if (phone && !PHONE_REGEX.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone format. Please enter 8-15 digits (e.g. +919956257068 or 9956257068).'
      });
    }

    if (email && !EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address format.'
      });
    }

    // Requires at least one provided identifier to be verified in the Map
    const emailRecord = email ? otpStore.get(email) : null;
    const phoneRecord = phone ? otpStore.get(phone) : null;

    const isEmailVerified = Boolean(emailRecord && emailRecord.verified);
    const isPhoneVerified = Boolean(phoneRecord && phoneRecord.verified);

    if (!isEmailVerified && !isPhoneVerified) {
      return res.status(400).json({
        success: false,
        message: 'Please verify the OTP for your email or phone before registering.'
      });
    }

    // Account status: Patients become active immediately; doctors & organizations start as pending_verification
    const initialStatus = role === 'patient' ? 'active' : 'pending_verification';

    const newUser = await User.create({
      name,
      email: email || undefined,
      phone: phone || undefined,
      password,
      role: role || 'patient',
      status: initialStatus,
    });

    if (email) otpStore.delete(email);
    if (phone) otpStore.delete(phone);

    let profile = null;

    if (role === 'doctor' && doctorDetails) {
      if (doctorDetails.licenseNumber) {
        const existingDocWithLicense = await Doctor.findOne({ licenseNumber: doctorDetails.licenseNumber.trim() });
        if (existingDocWithLicense) {
          await User.findByIdAndDelete(newUser._id);
          return res.status(400).json({
            success: false,
            message: `A doctor with medical license / registration number "${doctorDetails.licenseNumber}" is already registered.`,
          });
        }
      }

      const appRef = `DOC-APP-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

      profile = await Doctor.create({
        userId: newUser._id,
        specialization: doctorDetails.specialization || 'General Physician',
        qualifications: doctorDetails.qualifications || ['MBBS'],
        experienceYears: doctorDetails.experienceYears || 0,
        licenseNumber: doctorDetails.licenseNumber || 'MED-PENDING',
        issuingAuthority: doctorDetails.issuingAuthority || 'National Medical Commission',
        registrationJurisdiction: doctorDetails.registrationJurisdiction || 'India',
        registrationYear: doctorDetails.registrationYear || new Date().getFullYear(),
        licenseDocumentUrl: doctorDetails.licenseDocumentUrl || '',
        consultationFee: doctorDetails.consultationFee || 500,
        bio: doctorDetails.bio || '',
        verificationStatus: 'pending',
        applicationReference: appRef,
        documents: doctorDetails.documents || [],
      });

      await DoctorRegistration.create({
        doctorId: profile._id,
        registrationNumber: doctorDetails.licenseNumber || 'MED-PENDING',
        issuingAuthority: doctorDetails.issuingAuthority || 'National Medical Commission',
        jurisdiction: doctorDetails.registrationJurisdiction || 'India',
        registrationYear: doctorDetails.registrationYear || new Date().getFullYear(),
      });

      const appRecord = await DoctorVerificationApplication.create({
        applicationReference: appRef,
        doctorId: profile._id,
        userId: newUser._id,
        applicationStatus: 'PENDING_VERIFICATION',
        history: [{ action: 'SUBMITTED', timestamp: new Date(), remarks: 'Submitted during initial registration.' }],
      });

      profile.verificationApplicationId = appRecord._id;
      await profile.save();
    } else if (role === 'organization' && orgDetails) {
      if (orgDetails.registrationNumber) {
        const existingOrgWithReg = await Organization.findOne({
          registrationNumber: String(orgDetails.registrationNumber).trim(),
        });
        if (existingOrgWithReg) {
          await User.findByIdAndDelete(newUser._id);
          return res.status(400).json({
            success: false,
            message: `Organization with registration license '${orgDetails.registrationNumber}' already exists.`,
          });
        }
      }

      // Validate PIN code format if provided
      const regPin = orgDetails.registeredAddress?.pinCode;
      if (regPin && !/^\d{6}$/.test(String(regPin).trim())) {
        await User.findByIdAndDelete(newUser._id);
        return res.status(400).json({
          success: false,
          message: 'Registered address PIN code must be exactly 6 digits.',
        });
      }

      const isSameAsRegistered = orgDetails.operatingAddress?.isSameAsRegistered !== false;
      const opPin = orgDetails.operatingAddress?.pinCode;
      if (!isSameAsRegistered && opPin && !/^\d{6}$/.test(String(opPin).trim())) {
        await User.findByIdAndDelete(newUser._id);
        return res.status(400).json({
          success: false,
          message: 'Operating address PIN code must be exactly 6 digits.',
        });
      }

      // Resolve physical operating coordinates: [longitude, latitude]
      let coords = [77.2090, 28.6139];
      if (orgDetails.location?.coordinates && Array.isArray(orgDetails.location.coordinates)) {
        coords = orgDetails.location.coordinates.map(Number);
      } else if (orgDetails.coordinates && Array.isArray(orgDetails.coordinates)) {
        coords = orgDetails.coordinates.map(Number);
      } else if (orgDetails.latitude !== undefined && orgDetails.longitude !== undefined) {
        coords = [parseFloat(orgDetails.longitude), parseFloat(orgDetails.latitude)];
      }

      const [lng, lat] = coords;
      if (
        typeof lng !== 'number' ||
        typeof lat !== 'number' ||
        isNaN(lng) ||
        isNaN(lat) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        await User.findByIdAndDelete(newUser._id);
        return res.status(400).json({
          success: false,
          message: 'Invalid GPS coordinates. Latitude must be between -90 and 90, and longitude between -180 and 180.',
        });
      }

      const appRef = `ORG-APP-${Math.floor(10000 + Math.random() * 90000)}`;
      const code = `ORG-QR-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 899 + 100)}`;
      
      const docList = orgDetails.documents || [];
      const rep = orgDetails.representative || {
        name: name,
        email: email || '',
        phone: phone || '',
        designation: 'Hospital Administrator',
      };

      profile = await Organization.create({
        userId: newUser._id,
        name: orgDetails.name || name,
        legalName: orgDetails.legalName || orgDetails.name || name,
        orgType: orgDetails.orgType || 'hospital',
        registrationNumber: orgDetails.registrationNumber || 'REG-PENDING',
        applicationReference: appRef,
        officialEmail: orgDetails.officialEmail || email || '',
        contactNumber: orgDetails.contactNumber || phone || '',
        website: orgDetails.website || '',
        description: orgDetails.description || '',
        registeredAddress: orgDetails.registeredAddress || {},
        operatingAddress: orgDetails.operatingAddress || { isSameAsRegistered: true },
        location: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        emergencyCapable: orgDetails.emergencyCapable !== undefined ? orgDetails.emergencyCapable : true,
        emergencyContactPhone: orgDetails.emergencyContactPhone || phone || '',
        qrCheckinCode: code,
        facilities: orgDetails.facilities || ['Emergency Care', 'ICU', 'General Ward'],
        healthcareCapabilities: orgDetails.healthcareCapabilities || ['Emergency Services', 'ICU', 'Diagnostic Imaging'],
        specializations: orgDetails.specializations || ['General Medicine', 'Cardiology'],
        representative: rep,
        documents: docList,
        verificationStatus: 'pending',
      });

      // Create OrganizationAdmin representative link
      await OrganizationAdmin.create({
        organizationId: profile._id,
        userId: newUser._id,
        accessRole: 'PRIMARY_ADMIN',
        representativeName: rep.name || name,
        representativeEmail: rep.email || email || '',
        representativePhone: rep.phone || phone || '',
        designation: rep.designation || 'Hospital Administrator',
      });

      // Create primary OrganizationFacility
      const facilityRecord = await OrganizationFacility.create({
        facilityId: `FAC-${Math.floor(10000 + Math.random() * 90000)}`,
        organizationId: profile._id,
        facilityName: `${profile.name} - Main Campus`,
        facilityType: 'main_campus',
        isPrimary: true,
        address: profile.operatingAddress,
        location: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        latitude: lat,
        longitude: lng,
        capabilities: profile.healthcareCapabilities || [],
        operationalStatus: 'ACTIVE',
        contactPhone: profile.emergencyContactPhone || profile.contactNumber,
      });

      // Create OrganizationVerificationApplication
      const appRecord = await OrganizationVerificationApplication.create({
        applicationReference: appRef,
        organizationId: profile._id,
        userId: newUser._id,
        applicationStatus: 'PENDING_VERIFICATION',
        history: [{ action: 'SUBMITTED', timestamp: new Date(), remarks: 'Submitted during initial registration.' }],
      });

      profile.activeVerificationApplicationId = appRecord._id;
      profile.primaryFacilityId = facilityRecord._id;
      await profile.save();
    }

    const token = generateToken(newUser);
    const refreshToken = generateRefreshToken(newUser);
    const userResponse = {
      id: newUser._id,
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
      status: newUser.status,
    };

    return res.status(201).json({
      success: true,
      message: role === 'patient'
        ? 'Account registered successfully'
        : 'Registration submitted successfully. Account is pending administrative verification before access is granted.',
      token,
      refreshToken,
      user: userResponse,
      data: {
        token,
        refreshToken,
        user: userResponse,
        profile,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'contact';
      return res.status(400).json({
        success: false,
        message: `An account with this ${field} already exists.`
      });
    }
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors || {})
        .map((item) => item.message)
        .join(' ') || 'Validation error during registration.';
      return res.status(400).json({ success: false, message });
    }
    console.error('Registration Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during registration.' });
  }
};

// 4. Login (Supports logging in via either email or phone)
export const login = async (req, res) => {
  try {
    let { identifier, email, phone, password } = req.body;
    const loginTarget = (identifier || email || phone || '').trim();

    if (!loginTarget || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email/phone and password.'
      });
    }

    const normalizedTarget = loginTarget.replace(/\s+/g, '');
    const user = await User.findOne({
      $or: [
        { email: loginTarget.toLowerCase() },
        { phone: loginTarget },
        { phone: normalizedTarget }
      ]
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.'
      });
    }

    if (!user.isActive || user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated or suspended. Please contact support.',
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    let profile = null;
    if (user.role === 'doctor') {
      profile = await Doctor.findOne({ userId: user._id });
      if (profile) {
        const vStatus = String(profile.verificationStatus || '').toLowerCase();
        if (vStatus === 'pending' || vStatus === 'pending_verification') {
          return res.status(403).json({
            success: false,
            message: 'Your doctor account is pending verification. Administrative approval is required before logging in.',
            code: 'PENDING_VERIFICATION',
          });
        }
        if (vStatus === 'rejected') {
          return res.status(403).json({
            success: false,
            message: 'Your doctor verification request was rejected. Please contact administration.',
            code: 'VERIFICATION_REJECTED',
          });
        }
      }
    } else if (user.role === 'organization') {
      profile = await Organization.findOne({ userId: user._id });
      if (profile) {
        const vStatus = String(profile.verificationStatus || '').toLowerCase();
        if (vStatus === 'pending' || vStatus === 'pending_verification') {
          return res.status(403).json({
            success: false,
            message: 'Your healthcare facility account is pending accreditation verification. Administrative approval is required before logging in.',
            code: 'PENDING_VERIFICATION',
          });
        }
        if (vStatus === 'rejected') {
          return res.status(403).json({
            success: false,
            message: 'Your healthcare facility verification request was rejected. Please contact administration.',
            code: 'VERIFICATION_REJECTED',
          });
        }
      }
    }

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    const userResponse = {
      id: user._id,
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status || (user.isActive ? 'active' : 'suspended'),
    };

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      refreshToken,
      user: userResponse,
      data: {
        token,
        refreshToken,
        user: userResponse,
        profile,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
};

// 4b. Refresh Token (Validates active refresh token, verifies JWT, checks account status, rotates tokens)
export const refreshToken = async (req, res) => {
  try {
    const rawToken = req.body.refreshToken || req.headers['x-refresh-token'];
    if (!rawToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required.'
      });
    }

    if (!activeRefreshTokens.has(rawToken)) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is invalid or has been revoked.'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(
        rawToken,
        process.env.JWT_REFRESH_SECRET || 'shap_refresh_secret_jwt_key_2025_access_health'
      );
    } catch (err) {
      activeRefreshTokens.delete(rawToken);
      return res.status(401).json({
        success: false,
        message: 'Refresh token is expired or malformed.'
      });
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive || user.status === 'suspended') {
      activeRefreshTokens.delete(rawToken);
      return res.status(403).json({
        success: false,
        message: 'User account is inactive or suspended.'
      });
    }

    // Token Rotation: Invalidate the old refresh token, generate new access & refresh tokens
    activeRefreshTokens.delete(rawToken);
    const newAccessToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    return res.status(200).json({
      success: true,
      token: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status || (user.isActive ? 'active' : 'suspended'),
      },
    });
  } catch (error) {
    console.error('Refresh Token Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to refresh authentication token.' });
  }
};

// 4c. Logout (Invalidates access token in blacklist and revokes active refresh token)
export const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      tokenBlacklist.add(token);
    }

    const rawRefreshToken = req.body.refreshToken || req.headers['x-refresh-token'];
    if (rawRefreshToken) {
      activeRefreshTokens.delete(rawRefreshToken);
    }

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully. Authentication tokens invalidated.'
    });
  } catch (error) {
    console.error('Logout Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to log out.' });
  }
};

// 4d. Forgot Password (Generates secure OTP for registered email or phone)
export const forgotPassword = async (req, res) => {
  try {
    const rawTarget = req.body.email || req.body.phone || req.body.identifier;
    if (!rawTarget) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your registered email or phone number.'
      });
    }

    const targetStr = String(rawTarget).trim().toLowerCase();
    const user = await User.findOne({
      $or: [
        { email: targetStr },
        { phone: targetStr.replace(/\s+/g, '') }
      ]
    });

    if (!user) {
      // Respond with neutral 200 to prevent user enumeration attacks
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this credential, a password reset code has been sent.'
      });
    }

    const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    passwordResetStore.set(user._id.toString(), {
      otp: resetOtp,
      expiresAt,
      userId: user._id
    });

    console.log(`\n========================================`);
    console.log(`[SHAP Password Reset] User: ${user.email || user.phone} | Reset OTP: ${resetOtp}`);
    console.log(`========================================\n`);

    return res.status(200).json({
      success: true,
      message: 'Password reset code has been generated.',
      devOtp: resetOtp,
      resetKey: user._id.toString()
    });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process forgot password request.' });
  }
};

// 4e. Reset Password (Verifies OTP & key and updates password)
export const resetPassword = async (req, res) => {
  try {
    const { resetKey, otp, newPassword, confirmPassword } = req.body;

    if (!resetKey || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Reset key, OTP code, and new password are required.'
      });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.'
      });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const record = passwordResetStore.get(resetKey);
    if (!record || Date.now() > record.expiresAt) {
      passwordResetStore.delete(resetKey);
      return res.status(400).json({
        success: false,
        message: 'Password reset session has expired or is invalid. Please request a new one.'
      });
    }

    if (String(record.otp) !== String(otp).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset code. Please check and try again.'
      });
    }

    const user = await User.findById(record.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.password = newPassword;
    await user.save();
    passwordResetStore.delete(resetKey);

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });
  } catch (error) {
    console.error('Reset Password Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reset password.' });
  }
};

// 5. Authenticated Profile Fetch
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id || req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    let profile = null;
    if (user.role === 'doctor') {
      profile = await Doctor.findOne({ userId: user._id });
    } else if (user.role === 'organization') {
      profile = await Organization.findOne({ userId: user._id });
    }

    return res.status(200).json({
      success: true,
      user,
      data: {
        user,
        profile,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error retrieving user profile.' });
  }
};

// 6. Authenticated Profile Update (Manage Profile)
export const updateMe = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const {
      name,
      phone,
      avatar,
      address,
      dateOfBirth,
      gender,
      bloodGroup,
      allergies,
      chronicConditions,
      currentMedications,
      emergencyContact,
      medicalNotes,
    } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (avatar !== undefined) updates.avatar = avatar;
    if (address !== undefined) updates.address = address;
    if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth;
    if (gender !== undefined) updates.gender = gender;
    if (bloodGroup !== undefined) updates.bloodGroup = bloodGroup;
    if (allergies !== undefined) {
      updates.allergies = Array.isArray(allergies)
        ? allergies
        : typeof allergies === 'string'
        ? allergies.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
    }
    if (chronicConditions !== undefined) {
      updates.chronicConditions = Array.isArray(chronicConditions)
        ? chronicConditions
        : typeof chronicConditions === 'string'
        ? chronicConditions.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
    }
    if (currentMedications !== undefined) {
      updates.currentMedications = Array.isArray(currentMedications)
        ? currentMedications
        : typeof currentMedications === 'string'
        ? currentMedications.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
    }
    if (emergencyContact !== undefined) updates.emergencyContact = emergencyContact;
    if (medicalNotes !== undefined) updates.medicalNotes = medicalNotes;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser,
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error updating user profile.' });
  }
};

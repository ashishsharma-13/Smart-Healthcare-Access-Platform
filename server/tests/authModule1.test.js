import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Doctor } from '../src/models/Doctor.js';
import { Organization } from '../src/models/Organization.js';
import autoSeed from '../src/utils/autoSeed.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  await autoSeed();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('MODULE 1: AUTHENTICATION AND ROLE MANAGEMENT TEST SUITE', () => {
  let validPatientToken;
  let validRefreshToken;
  let adminToken;

  // Helper to send & verify OTP for registration
  const prepareVerifiedContact = async (email, phone) => {
    const target = email || phone;
    const type = email ? 'email' : 'phone';
    const otpRes = await request(app)
      .post('/api/auth/send-otp')
      .send({ target, type });
    const devOtp = otpRes.body.devOtp;
    await request(app)
      .post('/api/auth/verify-otp')
      .send({ target, otp: devOtp });
  };

  // Test 1: Successful patient registration
  test('1. Successful Patient Registration - creates active patient account with tokens', async () => {
    const email = 'new.patient@test.com';
    await prepareVerifiedContact(email);

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'New Test Patient',
        email,
        password: 'password123',
        role: 'patient',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.role).toBe('patient');
    expect(res.body.user.status).toBe('active');

    // Confirm in DB
    const savedUser = await User.findOne({ email });
    expect(savedUser).not.toBeNull();
    expect(savedUser.status).toBe('active');
    expect(savedUser.isActive).toBe(true);
  });

  // Test 2: Duplicate email registration rejection
  test('2. Duplicate Email Registration - returns 400 rejection', async () => {
    const email = 'duplicate@test.com';
    await prepareVerifiedContact(email);

    // First registration
    const firstRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'First User',
        email,
        password: 'password123',
        role: 'patient',
      });
    expect(firstRes.status).toBe(201);

    // Second registration attempt via sendOtp is rejected because account already exists
    const otpRes = await request(app)
      .post('/api/auth/send-otp')
      .send({ target: email, type: 'email' });
    expect(otpRes.status).toBe(400);
    expect(otpRes.body.success).toBe(false);
    expect(otpRes.body.message).toMatch(/already exists/i);
  });

  // Test 3: Invalid registration (missing fields / bad password)
  test('3. Invalid Registration Rejection - returns 400 for missing fields or short password', async () => {
    // Missing password
    const resNoPass = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Missing Pass User',
        email: 'nopass@test.com',
      });
    expect(resNoPass.status).toBe(400);

    // Short password (< 6 chars)
    const resShortPass = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Short Pass User',
        email: 'shortpass@test.com',
        password: '123',
      });
    expect(resShortPass.status).toBe(400);
    expect(resShortPass.body.message).toMatch(/at least 6 characters/i);
  });

  // Test 4: Block public administrator registration
  test('4. Admin Registration Blocked - returns 403 Forbidden for public admin registration attempt', async () => {
    const email = 'hacker.admin@test.com';
    await prepareVerifiedContact(email);

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Malicious Admin',
        email,
        password: 'password123',
        role: 'admin',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/administrator registration is prohibited/i);

    // Also verify web_admin role variant is blocked
    const resWebAdmin = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Malicious Web Admin',
        email,
        password: 'password123',
        role: 'web_admin',
      });

    expect(resWebAdmin.status).toBe(403);
    expect(resWebAdmin.body.message).toMatch(/administrator registration is prohibited/i);
  });

  // Test 5: Successful login with credentials
  test('5. Successful Login - returns access token, refresh token, and user details', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'patient@shap.com',
        password: 'password123',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.email).toBe('patient@shap.com');
    expect(res.body.user.role).toBe('patient');

    validPatientToken = res.body.token;
    validRefreshToken = res.body.refreshToken;
  });

  // Test 6: Incorrect credentials rejection
  test('6. Incorrect Credentials - returns 401 on wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'patient@shap.com',
        password: 'wrong_password_xyz',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/incorrect password/i);
  });

  // Test 7: User not found rejection
  test('7. Nonexistent User - returns 401 when account does not exist', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'ghost.user.404@shap.com',
        password: 'password123',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/user not found/i);
  });

  // Test 8: Unverified doctor login rejection
  test('8. Unverified Doctor Login - returns 403 Forbidden with PENDING_VERIFICATION message', async () => {
    // Dr. Michael Vance is seeded as pending verification
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'michael.vance@shap.com',
        password: 'password123',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('PENDING_VERIFICATION');
    expect(res.body.message).toMatch(/pending verification/i);
  });

  // Test 9: Unverified organization login rejection
  test('9. Unverified Organization Login - returns 403 Forbidden with PENDING_VERIFICATION message', async () => {
    // North District Memorial Hospital is seeded as pending verification
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'northdistrict@hospital.com',
        password: 'password123',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('PENDING_VERIFICATION');
    expect(res.body.message).toMatch(/pending accreditation verification/i);
  });

  // Test 10: Suspended account login rejection
  test('10. Suspended Account Login - returns 403 Forbidden when account is deactivated or suspended', async () => {
    // Create a suspended patient
    const suspendedUser = await User.create({
      name: 'Suspended Account User',
      email: 'suspended@shap.com',
      password: 'password123',
      role: 'patient',
      status: 'suspended',
      isActive: false,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'suspended@shap.com',
        password: 'password123',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('ACCOUNT_SUSPENDED');
    expect(res.body.message).toMatch(/deactivated or suspended/i);
  });

  // Test 11: Unauthorized role access
  test('11. Unauthorized Role Access - returns 403 when patient attempts to access admin endpoint', async () => {
    // Patient attempts to access admin stats
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${validPatientToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Forbidden/i);
  });

  // Test 12: JWT expiry / Invalid JWT rejection
  test('12. Invalid or Expired JWT - returns 401 when token is tampered or expired', async () => {
    // Tampered token
    const resTampered = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid_tampered_token_string_123');

    expect(resTampered.status).toBe(401);
    expect(resTampered.body.success).toBe(false);

    // Expired token
    const expiredToken = jwt.sign(
      { id: 'fake_id', role: 'patient' },
      process.env.JWT_SECRET || 'shap_super_secret_jwt_key_2025_access_health',
      { expiresIn: '-10s' }
    );

    const resExpired = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(resExpired.status).toBe(401);
    expect(resExpired.body.success).toBe(false);
  });

  // Test 13: Refresh Token validation and rotation
  test('13. Refresh Token Validation & Rotation - returns new tokens and invalidates old refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh-token')
      .send({ refreshToken: validRefreshToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.refreshToken).not.toBe(validRefreshToken);

    const rotatedRefreshToken = res.body.refreshToken;

    // The old refresh token should now be rejected (single-use rotation)
    const resReuse = await request(app)
      .post('/api/auth/refresh-token')
      .send({ refreshToken: validRefreshToken });

    expect(resReuse.status).toBe(401);
    expect(resReuse.body.success).toBe(false);

    // The newly rotated refresh token should work
    const resSecondRefresh = await request(app)
      .post('/api/auth/refresh-token')
      .send({ refreshToken: rotatedRefreshToken });

    expect(resSecondRefresh.status).toBe(200);
    expect(resSecondRefresh.body.token).toBeDefined();
  });

  // Test 14: Logout and token revocation
  test('14. Logout and Token Invalidation - revokes access token so it can no longer access protected routes', async () => {
    // Login to obtain fresh access token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'patient@shap.com',
        password: 'password123',
      });
    const sessionToken = loginRes.body.token;
    const sessionRefreshToken = loginRes.body.refreshToken;

    // Verify token works before logout
    const checkBefore = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${sessionToken}`);
    expect(checkBefore.status).toBe(200);

    // Call logout endpoint
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({ refreshToken: sessionRefreshToken });

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);

    // Access token is now revoked and must be rejected with 401
    const checkAfter = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${sessionToken}`);

    expect(checkAfter.status).toBe(401);
    expect(checkAfter.body.message).toMatch(/revoked/i);
  });

  // Test 15: Forgot Password & Reset Password Workflow
  test('15. Forgot Password & Password Reset Flow - issues reset code and updates password', async () => {
    // 1. Request forgot password code
    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'patient@shap.com' });

    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.success).toBe(true);
    expect(forgotRes.body.resetKey).toBeDefined();
    expect(forgotRes.body.devOtp).toBeDefined();

    const { resetKey, devOtp } = forgotRes.body;

    // 2. Reset password using valid OTP
    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        resetKey,
        otp: devOtp,
        newPassword: 'newpassword456',
        confirmPassword: 'newpassword456',
      });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    // 3. Login with old password fails
    const oldLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'patient@shap.com',
        password: 'password123',
      });
    expect(oldLoginRes.status).toBe(401);

    // 4. Login with new password succeeds
    const newLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'patient@shap.com',
        password: 'newpassword456',
      });
    expect(newLoginRes.status).toBe(200);
    expect(newLoginRes.body.success).toBe(true);

    // Revert password back for any subsequent tests
    const pUser = await User.findOne({ email: 'patient@shap.com' });
    pUser.password = 'password123';
    await pUser.save();
  });
});


import { jest } from '@jest/globals';
import { User } from '../src/models/User.js';
import { sendOtp, verifyOtp, register, login, transporter } from '../src/controllers/AuthController.js';

const mockResponse = () => {
  const res = {};
  res.statusCode = 200;
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((data) => {
    res.body = data;
    return res;
  });
  return res;
};

describe('AuthController - Real OTP Verification and Registration Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendOtp', () => {
    test('returns 400 if target is missing', async () => {
      const req = { body: {} };
      const res = mockResponse();

      await sendOtp(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('provide either an email or a phone number');
    });

    test('returns 400 for invalid phone numbers not matching /^\\+?[1-9]\\d{7,14}$/', async () => {
      const invalidPhones = ['123', 'abc', '+09956257068', '09956257068', '995'];
      for (const phone of invalidPhones) {
        const req = { body: { target: phone, type: 'phone' } };
        const res = mockResponse();
        await sendOtp(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.body.message).toContain('Invalid phone format');
      }
    });

    test('returns 400 for invalid email addresses', async () => {
      const req = { body: { target: 'invalid-email', type: 'email' } };
      const res = mockResponse();

      await sendOtp(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body.message).toContain('Invalid email address format');
    });

    test('returns 400 if user already exists with that email or phone', async () => {
      jest.spyOn(User, 'findOne').mockResolvedValueOnce({ _id: 'existing123', email: 'test@example.com' });

      const req = { body: { target: 'test@example.com', type: 'email' } };
      const res = mockResponse();

      await sendOtp(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body.message).toContain('already exists');
    });

    test('generates 6-digit OTP and returns devOtp in JSON for valid email', async () => {
      jest.spyOn(User, 'findOne').mockResolvedValueOnce(null);

      const req = { body: { target: 'newuser@example.com', type: 'email' } };
      const res = mockResponse();

      await sendOtp(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.body.success).toBe(true);
      expect(res.body.devOtp).toMatch(/^\d{6}$/);
    });

    test('generates 6-digit OTP and returns devOtp in JSON for valid phone', async () => {
      jest.spyOn(User, 'findOne').mockResolvedValueOnce(null);

      const req = { body: { target: '+919956257068', type: 'phone' } };
      const res = mockResponse();

      await sendOtp(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.body.success).toBe(true);
      expect(res.body.devOtp).toMatch(/^\d{6}$/);
    });
  });

  describe('verifyOtp', () => {
    test('returns 400 if target or otp is missing', async () => {
      const req = { body: { target: '' } };
      const res = mockResponse();

      await verifyOtp(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body.message).toContain('required');
    });

    test('returns 400 if OTP is incorrect', async () => {
      // First send OTP
      jest.spyOn(User, 'findOne').mockResolvedValueOnce(null);
      const sendReq = { body: { target: 'verifytest@example.com', type: 'email' } };
      const sendRes = mockResponse();
      await sendOtp(sendReq, sendRes);

      // Verify with wrong code
      const verifyReq = { body: { target: 'verifytest@example.com', otp: '000000' } };
      const verifyRes = mockResponse();
      await verifyOtp(verifyReq, verifyRes);

      expect(verifyRes.status).toHaveBeenCalledWith(400);
      expect(verifyRes.body.message).toContain('Incorrect OTP');
    });

    test('marks verified: true in Map when OTP is correct', async () => {
      // First send OTP
      jest.spyOn(User, 'findOne').mockResolvedValueOnce(null);
      const sendReq = { body: { target: 'successverify@example.com', type: 'email' } };
      const sendRes = mockResponse();
      await sendOtp(sendReq, sendRes);
      const code = sendRes.body.devOtp;

      // Verify with correct code
      const verifyReq = { body: { target: 'successverify@example.com', otp: code } };
      const verifyRes = mockResponse();
      await verifyOtp(verifyReq, verifyRes);

      expect(verifyRes.status).toHaveBeenCalledWith(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.verified).toBe(true);
    });
  });

  describe('register', () => {
    test('requires name and password', async () => {
      const req = { body: { email: 'user@example.com' } };
      const res = mockResponse();

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body.message).toContain('Full name and password are required');
    });

    test('requires at least ONE contact method (email OR phone)', async () => {
      const req = { body: { name: 'John Doe', password: 'password123' } };
      const res = mockResponse();

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body.message).toContain('At least one contact method (email or phone) is required');
    });

    test('requires at least one provided identifier to be verified in the Map', async () => {
      const req = { body: { name: 'John Doe', password: 'password123', email: 'unverified@example.com' } };
      const res = mockResponse();

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body.message).toContain('Please verify the OTP');
    });

    test('registers successfully when email is verified', async () => {
      // Send and verify OTP
      jest.spyOn(User, 'findOne').mockResolvedValueOnce(null);
      const sendRes = mockResponse();
      await sendOtp({ body: { target: 'verifieduser@example.com', type: 'email' } }, sendRes);
      await verifyOtp({ body: { target: 'verifieduser@example.com', otp: sendRes.body.devOtp } }, mockResponse());

      // Mock User.create
      const fakeUser = {
        _id: 'user_id_123',
        name: 'Verified User',
        email: 'verifieduser@example.com',
        phone: undefined,
        role: 'patient',
      };
      jest.spyOn(User, 'create').mockResolvedValueOnce(fakeUser);

      const regReq = {
        body: {
          name: 'Verified User',
          email: 'verifieduser@example.com',
          password: 'password123',
          role: 'patient',
        },
      };
      const regRes = mockResponse();
      await register(regReq, regRes);

      expect(regRes.status).toHaveBeenCalledWith(201);
      expect(regRes.body.success).toBe(true);
      expect(regRes.body.user.email).toBe('verifieduser@example.com');
      expect(regRes.body.token).toBeDefined();
    });

    test('registers successfully with only phone when phone is verified', async () => {
      const phone = '+919956257068';
      jest.spyOn(User, 'findOne').mockResolvedValueOnce(null);
      const sendRes = mockResponse();
      await sendOtp({ body: { target: phone, type: 'phone' } }, sendRes);
      await verifyOtp({ body: { target: phone, otp: sendRes.body.devOtp } }, mockResponse());

      const fakeUser = {
        _id: 'user_id_phone',
        name: 'Phone User',
        email: undefined,
        phone,
        role: 'patient',
      };
      jest.spyOn(User, 'create').mockResolvedValueOnce(fakeUser);

      const regReq = {
        body: {
          name: 'Phone User',
          phone,
          password: 'password123',
          role: 'patient',
        },
      };
      const regRes = mockResponse();
      await register(regReq, regRes);

      expect(regRes.status).toHaveBeenCalledWith(201);
      expect(regRes.body.success).toBe(true);
      expect(regRes.body.user.phone).toBe(phone);
    });

    test('catches duplicate key error 11000 and returns clean 400 response', async () => {
      // Pre-verify
      jest.spyOn(User, 'findOne').mockResolvedValueOnce(null);
      const sendRes = mockResponse();
      await sendOtp({ body: { target: 'dup@example.com', type: 'email' } }, sendRes);
      await verifyOtp({ body: { target: 'dup@example.com', otp: sendRes.body.devOtp } }, mockResponse());

      const dupError = new Error('E11000 duplicate key error');
      dupError.code = 11000;
      dupError.keyPattern = { email: 1 };
      jest.spyOn(User, 'create').mockRejectedValueOnce(dupError);

      const regReq = {
        body: {
          name: 'Dup User',
          email: 'dup@example.com',
          password: 'password123',
        },
      };
      const regRes = mockResponse();
      await register(regReq, regRes);

      expect(regRes.status).toHaveBeenCalledWith(400);
      expect(regRes.body.success).toBe(false);
      expect(regRes.body.message).toContain('already exists');
    });

    test('catches Mongoose ValidationError and returns clean 400 response', async () => {
      jest.spyOn(User, 'findOne').mockResolvedValueOnce(null);
      const sendRes = mockResponse();
      await sendOtp({ body: { target: 'valerror@example.com', type: 'email' } }, sendRes);
      await verifyOtp({ body: { target: 'valerror@example.com', otp: sendRes.body.devOtp } }, mockResponse());

      const valError = new Error('Validation failed');
      valError.name = 'ValidationError';
      valError.errors = {
        name: { message: 'Path `name` is invalid.' },
      };
      jest.spyOn(User, 'create').mockRejectedValueOnce(valError);

      const regReq = {
        body: {
          name: 'Bad Name',
          email: 'valerror@example.com',
          password: 'password123',
        },
      };
      const regRes = mockResponse();
      await register(regReq, regRes);

      expect(regRes.status).toHaveBeenCalledWith(400);
      expect(regRes.body.success).toBe(false);
      expect(regRes.body.message).toContain('Path `name` is invalid');
    });
  });

  describe('login', () => {
    test('supports login via email', async () => {
      const fakeUser = {
        _id: 'user_login_1',
        name: 'Login User',
        email: 'login@example.com',
        phone: '+919956257068',
        role: 'patient',
        isActive: true,
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      const mockQuery = {
        select: jest.fn().mockResolvedValue(fakeUser),
      };
      jest.spyOn(User, 'findOne').mockReturnValue(mockQuery);

      const req = {
        body: {
          email: 'login@example.com',
          password: 'password123',
        },
      };
      const res = mockResponse();
      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('login@example.com');
      expect(res.body.data.token).toBeDefined();
    });

    test('supports login via phone', async () => {
      const fakeUser = {
        _id: 'user_login_2',
        name: 'Phone Login User',
        email: 'phonelogin@example.com',
        phone: '+919956257068',
        role: 'patient',
        isActive: true,
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      const mockQuery = {
        select: jest.fn().mockResolvedValue(fakeUser),
      };
      jest.spyOn(User, 'findOne').mockReturnValue(mockQuery);

      const req = {
        body: {
          phone: '+919956257068',
          password: 'password123',
        },
      };
      const res = mockResponse();
      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.phone).toBe('+919956257068');
    });

    test('returns 401 when user is not found', async () => {
      const mockQuery = {
        select: jest.fn().mockResolvedValue(null),
      };
      jest.spyOn(User, 'findOne').mockReturnValue(mockQuery);

      const req = {
        body: {
          identifier: 'nonexistent@example.com',
          password: 'password123',
        },
      };
      const res = mockResponse();
      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.body.message).toContain('Invalid credentials');
    });

    test('returns 401 when password is incorrect', async () => {
      const fakeUser = {
        _id: 'user_login_3',
        name: 'Wrong Pass User',
        email: 'wrongpass@example.com',
        role: 'patient',
        isActive: true,
        comparePassword: jest.fn().mockResolvedValue(false),
      };

      const mockQuery = {
        select: jest.fn().mockResolvedValue(fakeUser),
      };
      jest.spyOn(User, 'findOne').mockReturnValue(mockQuery);

      const req = {
        body: {
          identifier: 'wrongpass@example.com',
          password: 'wrongpassword',
        },
      };
      const res = mockResponse();
      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.body.message).toContain('Incorrect password');
    });
  });
});

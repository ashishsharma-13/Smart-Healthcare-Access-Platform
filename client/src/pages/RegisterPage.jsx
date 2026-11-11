import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Activity,
  User,
  Stethoscope,
  Building2,
  Mail,
  Phone,
  Lock,
  ShieldCheck,
  ArrowRight,
  X,
  FileCheck,
  Building,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Toast } from '../components/ui/Toast';
import { Badge } from '../components/ui/Badge';

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  // Form Fields
  const [role, setRole] = useState('patient');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [specialization, setSpecialization] = useState('General Physician');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [orgType, setOrgType] = useState('hospital');
  const [regNumber, setRegNumber] = useState('');

  // Step 1 States
  const [error, setError] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);

  // Step 2 Modal States
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpTarget, setOtpTarget] = useState('');
  const [otpType, setOtpType] = useState('email');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [modalError, setModalError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);

  // Step 1: Validate & Send OTP -> Open Modal
  const handleContinueToVerification = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const cleanPhone = phone.trim();

    if (!trimmedName) {
      setError(role === 'organization' ? 'Please enter hospital / facility name.' : 'Please enter your full name.');
      return;
    }

    if (!trimmedEmail && !cleanPhone) {
      setError('Please provide at least one contact method (email or phone).');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (role === 'doctor' && !licenseNumber.trim()) {
      setError('Please enter your NMC doctor license / registration number.');
      return;
    }

    if (role === 'organization' && !regNumber.trim()) {
      setError('Please enter your health facility registration number.');
      return;
    }

    const targetType = trimmedEmail ? 'email' : 'phone';
    const targetVal = targetType === 'email' ? trimmedEmail : cleanPhone;

    setOtpType(targetType);
    setOtpTarget(targetVal);
    setSendingOtp(true);

    try {
      const res = await api.post('/auth/send-otp', { target: targetVal, type: targetType });
      setDevOtp(res.data.devOtp || '');
      setOtp('');
      setModalError('');
      setOtpModalOpen(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send verification code.');
    } finally {
      setSendingOtp(false);
    }
  };

  // Step 2: Verify OTP -> Register User -> Redirect
  const handleVerifyAndRegister = async (e) => {
    if (e) e.preventDefault();

    if (otp.length !== 6) {
      setModalError('Please enter the 6-digit verification code.');
      return;
    }

    setModalError('');
    setVerifying(true);

    try {
      // 1. Verify OTP
      await api.post('/auth/verify-otp', { target: otpTarget, otp });

      // 2. Register Account
      const payload = {
        name: name.trim(),
        password,
        role,
      };
      if (email.trim()) payload.email = email.trim();
      if (phone.trim()) payload.phone = phone.trim();

      if (role === 'doctor') {
        payload.doctorDetails = {
          specialization,
          licenseNumber: licenseNumber.trim(),
          qualifications: ['MBBS'],
          experienceYears: 5,
        };
      } else if (role === 'organization') {
        payload.orgDetails = {
          name: name.trim(),
          orgType,
          registrationNumber: regNumber.trim(),
        };
      }

      await register(payload);

      // 3. Close modal & redirect
      setOtpModalOpen(false);
      navigate('/dashboard');
    } catch (err) {
      setModalError(err.response?.data?.message || err.message || 'Verification or registration failed.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setModalError('');
    setResendingOtp(true);
    try {
      const res = await api.post('/auth/send-otp', { target: otpTarget, type: otpType });
      setDevOtp(res.data.devOtp || '');
      setOtp('');
    } catch (err) {
      setModalError(err.response?.data?.message || 'Could not resend verification code.');
    } finally {
      setResendingOtp(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full bg-white border border-slate-200 p-6 sm:p-8 rounded-xl shadow-card space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-11 h-11 rounded-lg bg-brand-950 text-white flex items-center justify-center mx-auto shadow-xs">
            <Activity className="w-6 h-6 text-brand-400 stroke-[2.25]" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Create your SHAP Account
          </h2>
          <p className="text-xs text-slate-500">
            Select your clinical role to initiate credentialed onboarding
          </p>
        </div>

        {/* 3-Tab Segmented Role Selector */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setRole('patient')}
            className={`py-2 px-3 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              role === 'patient'
                ? 'bg-white text-brand-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Patient</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('doctor')}
            className={`py-2 px-3 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              role === 'doctor'
                ? 'bg-white text-brand-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Doctor</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('organization')}
            className={`py-2 px-3 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              role === 'organization'
                ? 'bg-white text-brand-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Hospital</span>
          </button>
        </div>

        {error && (
          <Toast type="error" message={error} onClose={() => setError('')} />
        )}

        {/* Registration Form */}
        <form onSubmit={handleContinueToVerification} className="space-y-4">
          <div>
            <label htmlFor="reg-name" className="block text-xs font-medium text-slate-700 mb-1">
              {role === 'organization' ? 'Hospital / Facility Legal Name' : 'Full Name'}
            </label>
            <input
              id="reg-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={role === 'organization' ? 'e.g. Apollo Multi-Speciality Hospital' : 'e.g. Dr. Rajesh Kumar or Priya Sharma'}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="reg-email" className="block text-xs font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@domain.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-phone" className="block text-xs font-medium text-slate-700 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="reg-phone"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+919956257068"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="reg-password" className="block text-xs font-medium text-slate-700 mb-1">
              Password (min. 6 characters)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="reg-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
              />
            </div>
          </div>

          {/* Role Conditioned Fields */}
          {role === 'doctor' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label htmlFor="reg-spec" className="block text-xs font-medium text-slate-700 mb-1">
                  Primary Specialization
                </label>
                <select
                  id="reg-spec"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
                >
                  <option value="General Physician">General Physician</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Orthopedics">Orthopedics</option>
                  <option value="Ophthalmology">Ophthalmology</option>
                  <option value="Emergency Medicine">Emergency Medicine</option>
                </select>
              </div>

              <div>
                <label htmlFor="reg-license" className="block text-xs font-medium text-slate-700 mb-1">
                  NMC Registration / License #
                </label>
                <input
                  id="reg-license"
                  type="text"
                  required
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="e.g. MCI-2019-84729"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white font-mono"
                />
              </div>
            </div>
          )}

          {role === 'organization' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label htmlFor="reg-orgtype" className="block text-xs font-medium text-slate-700 mb-1">
                  Facility Classification
                </label>
                <select
                  id="reg-orgtype"
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
                >
                  <option value="hospital">Multi-Speciality Hospital</option>
                  <option value="trauma_center">Dedicated Trauma Center</option>
                  <option value="clinic">Outpatient Day Clinic</option>
                </select>
              </div>

              <div>
                <label htmlFor="reg-orgreg" className="block text-xs font-medium text-slate-700 mb-1">
                  Health Facility License #
                </label>
                <input
                  id="reg-orgreg"
                  type="text"
                  required
                  value={regNumber}
                  onChange={(e) => setRegNumber(e.target.value)}
                  placeholder="e.g. HOSP-DEL-2024-001"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white font-mono"
                />
              </div>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={sendingOtp}
            className="w-full"
            icon={ArrowRight}
            iconPosition="right"
          >
            Continue to Verification (OTP)
          </Button>
        </form>

        {/* Footer info */}
        <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
          Already registered on SHAP?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Sign In Instead
          </Link>
        </div>

      </div>

      {/* Step 2: 2-Step OTP Modal */}
      {otpModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
        >
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4 shadow-modal border border-slate-200 relative">
            <button
              onClick={() => setOtpModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-2 border border-brand-200">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Verify Your Contact
              </h3>
              <p className="text-xs text-slate-500">
                We sent a 6-digit code to <br />
                <span className="font-semibold text-slate-900">{otpTarget}</span>
              </p>
            </div>

            {devOtp && (
              <div className="p-2 bg-amber-50 border border-amber-200 text-amber-800 rounded text-center text-xs font-mono">
                Evaluation Test Code: <span className="font-bold tracking-widest">{devOtp}</span>
              </div>
            )}

            {modalError && (
              <Toast type="error" message={modalError} onClose={() => setModalError('')} />
            )}

            <form onSubmit={handleVerifyAndRegister} className="space-y-4">
              <div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full py-2.5 text-center font-mono text-xl tracking-widest bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={verifying}
                className="w-full"
              >
                Verify & Create Account
              </Button>
            </form>

            <div className="text-center text-xs text-slate-500 pt-1">
              Didn't receive the code?{' '}
              <button
                type="button"
                disabled={resendingOtp}
                onClick={handleResendOtp}
                className="font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-50"
              >
                {resendingOtp ? 'Sending...' : 'Resend Code'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterPage;

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
} from 'lucide-react';

const sanitizePhone = (value) => {
  const compact = value.replace(/\s+/g, '');
  const digits = compact.replace(/\D/g, '');
  return compact.startsWith('+') ? `+${digits}` : digits;
};

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
      setError(role === 'organization' ? 'Please enter hospital / organization name.' : 'Please enter your full name.');
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
      setError('Please enter your doctor license / registration number.');
      return;
    }

    if (role === 'organization' && !regNumber.trim()) {
      setError('Please enter your facility registration number.');
      return;
    }

    // Determine target for OTP verification (prioritizes email if provided)
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

  // Step 2: Verify OTP -> Register User -> Redirect to Dashboard
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

      // 3. Close modal & redirect to /dashboard
      setOtpModalOpen(false);
      navigate('/dashboard');
    } catch (err) {
      setModalError(err.response?.data?.message || err.message || 'Verification or registration failed.');
    } finally {
      setVerifying(false);
    }
  };

  // Step 2: Resend OTP
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
    <div className="relative min-h-[90vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Ambient blurred gradient shapes in the background for depth */}
      <div className="absolute top-10 -left-20 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 -right-20 w-88 h-88 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[34rem] bg-cyan-200/20 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Main Registration Card */}
      <div className="max-w-xl w-full bg-white/70 backdrop-blur-xl border border-white/80 p-8 sm:p-12 rounded-3xl shadow-2xl space-y-6 relative z-10">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/25 mb-4">
            <Activity className="w-7 h-7" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Create your SHAP Account</h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">Smart Healthcare Access & Emergency Coordination</p>
        </div>

        {/* 3-Tab Segmented Role Selector */}
        <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100/80 backdrop-blur-md rounded-2xl border border-slate-200/50">
          <button
            type="button"
            onClick={() => setRole('patient')}
            className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center space-x-2 ${
              role === 'patient'
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Patient</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('doctor')}
            className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center space-x-2 ${
              role === 'doctor'
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Doctor</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('organization')}
            className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center space-x-2 ${
              role === 'organization'
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Hospital</span>
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3.5 bg-red-50/90 border border-red-200 text-red-700 text-xs sm:text-sm rounded-2xl font-medium">
            {error}
          </div>
        )}

        {/* Step 1 Form */}
        <form onSubmit={handleContinueToVerification} className="space-y-6">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              {role === 'organization' ? 'Organization / Hospital Name' : 'Full Name'}
            </label>
            <div className="relative">
              {role === 'organization' ? (
                <Building2 className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              ) : (
                <User className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              )}
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={role === 'doctor' ? 'Dr. John Doe' : role === 'organization' ? 'Central Medical Hospital' : 'John Doe'}
                className="w-full py-3.5 pl-12 pr-4 rounded-2xl bg-white/60 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-xs"
              />
            </div>
          </div>

          {/* Email & Phone Responsive Grid (Clean inputs without inline buttons) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="w-full py-3.5 pl-12 pr-4 rounded-2xl bg-white/60 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(sanitizePhone(e.target.value))}
                  placeholder="+919956257068"
                  className="w-full py-3.5 pl-12 pr-4 rounded-2xl bg-white/60 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full py-3.5 pl-12 pr-4 rounded-2xl bg-white/60 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-xs"
              />
            </div>
          </div>

          {/* Doctor Professional Fields */}
          {role === 'doctor' && (
            <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200/70 space-y-3">
              <p className="text-xs font-bold text-blue-900 uppercase tracking-wider">Doctor Professional Credentials</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Specialization</label>
                  <select
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="w-full py-2.5 px-3 bg-white/80 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Cardiology">Cardiology</option>
                    <option value="Emergency Medicine">Emergency Medicine</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="General Physician">General Physician</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">License / Reg #</label>
                  <input
                    type="text"
                    required
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="MED-REG-XXXX"
                    className="w-full py-2.5 px-3 bg-white/80 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <p className="text-[11px] text-blue-700">
                *Doctor credentials will enter Pending Verification for Web Administrator review.
              </p>
            </div>
          )}

          {role === 'organization' && (
            <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200/70 space-y-3">
              <p className="text-xs font-bold text-blue-900 uppercase tracking-wider">Facility Registration Info</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Facility Type</label>
                  <select
                    value={orgType}
                    onChange={(e) => setOrgType(e.target.value)}
                    className="w-full py-2.5 px-3 bg-white/80 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="hospital">Hospital / Medical Center</option>
                    <option value="clinic">Outpatient Clinic</option>
                    <option value="specialty_center">Specialty Center</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Registration #</label>
                  <input
                    type="text"
                    required
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                    placeholder="HOSP-REG-XXXX"
                    className="w-full py-2.5 px-3 bg-white/80 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 1 Action Button */}
          <button
            type="submit"
            disabled={sendingOtp}
            className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center space-x-2 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>{sendingOtp ? 'Sending Verification Code...' : 'Continue to Verification →'}</span>
          </button>
        </form>

        {/* Footer Link */}
        <div className="text-center pt-2 border-t border-slate-200/60 text-xs sm:text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-blue-600 hover:text-blue-700 transition-colors">
            Sign In
          </Link>
        </div>

      </div>

      {/* Step 2: Centered Glass OTP Modal */}
      {otpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-white/90 backdrop-blur-2xl border border-white rounded-3xl p-8 shadow-2xl space-y-6">
            
            {/* Top-Right Close Button */}
            <button
              type="button"
              onClick={() => {
                setOtpModalOpen(false);
                setModalError('');
              }}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100/70 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="text-center space-y-2 pt-2">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-sm mb-3">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Enter Verification Code</h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-xs mx-auto">
                We've sent a 6-digit one-time code to{' '}
                <span className="font-semibold text-slate-800 break-all">{otpTarget}</span>
              </p>
            </div>

            {/* OTP Input & Status */}
            <form onSubmit={handleVerifyAndRegister} className="space-y-4">
              <div className="space-y-3">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                    setModalError('');
                  }}
                  placeholder="••••••"
                  aria-label="6-digit verification code"
                  autoFocus
                  className="w-full py-3.5 px-4 text-center tracking-[12px] text-2xl font-bold text-slate-900 bg-white/80 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-inner font-mono placeholder:tracking-[8px] placeholder:text-slate-300"
                />

                {/* Subtle Dev Badge */}
                {devOtp && (
                  <div className="flex items-center justify-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      Dev Code: <strong className="font-mono">{devOtp}</strong>
                    </span>
                  </div>
                )}

                {modalError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium text-center">
                    {modalError}
                  </div>
                )}
              </div>

              {/* Action Button: Verify & Create Account */}
              <button
                type="submit"
                disabled={verifying || otp.length !== 6}
                className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm sm:text-base cursor-pointer"
              >
                <span>{verifying ? 'Verifying & Creating Account...' : 'Verify & Create Account'}</span>
                {!verifying && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            {/* Resend OTP Button */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendingOtp}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {resendingOtp ? 'Sending new code...' : "Didn't receive the code? Resend OTP"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

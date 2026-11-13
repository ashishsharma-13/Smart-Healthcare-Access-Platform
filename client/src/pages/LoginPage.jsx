import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Plus, Lock, Mail, ArrowRight, UserCheck, KeyRound, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Toast } from '../components/ui/Toast';
import { Badge } from '../components/ui/Badge';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot password modal states
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotTarget, setForgotTarget] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1: request, 2: reset
  const [resetKey, setResetKey] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [devResetOtp, setDevResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  const isPendingVerificationParam = searchParams.get('status') === 'pending_verification' || searchParams.get('registered') === 'pending';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(identifier, password);
      redirectByRole(user.role);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const redirectByRole = (role) => {
    const normalizedRole = String(role || '').toLowerCase();
    if (normalizedRole === 'doctor') navigate('/doctor/dashboard');
    else if (normalizedRole === 'organization') navigate('/organization/dashboard');
    else if (normalizedRole === 'admin' || normalizedRole === 'web_admin') navigate('/admin/dashboard');
    else navigate('/patient/dashboard');
  };

  const quickDemoLogin = (demoIdentifier, demoPassword) => {
    setIdentifier(demoIdentifier);
    setPassword(demoPassword);
    setError('');
  };

  // Forgot password step 1: Request OTP
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    if (!forgotTarget.trim()) {
      setForgotError('Please enter your registered email or phone.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { identifier: forgotTarget.trim() });
      if (res.data?.resetKey) {
        setResetKey(res.data.resetKey);
        setDevResetOtp(res.data.devOtp || '');
        setForgotStep(2);
        setForgotSuccess(res.data.message || 'Verification code sent.');
      } else {
        setForgotSuccess(res.data.message || 'If an account exists, a verification code was sent.');
      }
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Failed to request password reset code.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Forgot password step 2: Reset with OTP
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setForgotError('');
    if (!resetOtp.trim() || !newPassword) {
      setForgotError('Verification code and new password are required.');
      return;
    }
    if (newPassword.length < 6) {
      setForgotError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        resetKey,
        otp: resetOtp.trim(),
        newPassword,
        confirmPassword,
      });
      setForgotSuccess(res.data.message || 'Password updated successfully!');
      setTimeout(() => {
        setForgotModalOpen(false);
        setForgotStep(1);
        setForgotTarget('');
        setResetKey('');
        setResetOtp('');
        setNewPassword('');
        setConfirmPassword('');
      }, 1500);
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Password reset failed. Invalid or expired OTP.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-7 sm:p-8 rounded-xl shadow-card border border-slate-200">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-[#0B4F9C] text-white flex items-center justify-center mx-auto shadow-xs">
            <Plus className="w-6 h-6 stroke-[3]" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Sign in to SHAP
          </h2>
          <p className="text-xs text-slate-500">
            Connected Care, Clearer Access
          </p>
        </div>

        {/* Pending Verification Notice */}
        {isPendingVerificationParam && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Registration Submitted</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-700">
              Your credentials are under administrator review. You will receive access once accreditation is verified.
            </p>
          </div>
        )}

        {/* Demo Fast Login Selector */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-brand-600" />
              <span>Select Evaluation Role:</span>
            </span>
            <span className="text-[10px] text-slate-400 font-normal">1-Click autofill</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => quickDemoLogin('patient@shap.com', 'password123')}
              className="p-2 bg-white hover:bg-brand-50 hover:border-brand-300 text-slate-800 font-medium rounded-md border border-slate-200 text-left transition-colors truncate"
            >
              Patient (Aarav)
            </button>
            <button
              type="button"
              onClick={() => quickDemoLogin('sarah.jenkins@shap.com', 'password123')}
              className="p-2 bg-white hover:bg-brand-50 hover:border-brand-300 text-slate-800 font-medium rounded-md border border-slate-200 text-left transition-colors truncate"
            >
              Doctor (Dr. Sneha Sen)
            </button>
            <button
              type="button"
              onClick={() => quickDemoLogin('apex@hospital.com', 'password123')}
              className="p-2 bg-white hover:bg-brand-50 hover:border-brand-300 text-slate-800 font-medium rounded-md border border-slate-200 text-left transition-colors truncate"
            >
              Hospital (Apex Metro)
            </button>
            <button
              type="button"
              onClick={() => quickDemoLogin('admin@shap.com', 'password123')}
              className="p-2 bg-white hover:bg-brand-50 hover:border-brand-300 text-slate-800 font-medium rounded-md border border-slate-200 text-left transition-colors truncate"
            >
              System Admin
            </button>
          </div>
        </div>

        {error && (
          <Toast type="error" message={error} onClose={() => setError('')} />
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-identifier" className="block text-xs font-medium text-slate-700 mb-1">
              Email or Phone Number
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="login-identifier"
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@domain.com or +919956257068"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="login-password" className="block text-xs font-medium text-slate-700">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotModalOpen(true);
                  setForgotStep(1);
                  setForgotError('');
                  setForgotSuccess('');
                }}
                className="text-[11px] font-medium text-brand-600 hover:text-brand-700"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            className="w-full"
            icon={ArrowRight}
            iconPosition="right"
          >
            Sign In to Clinical Portal
          </Button>
        </form>

        {/* Footer info */}
        <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
          Don't have a SHAP account yet?{' '}
          <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
            Create an Account
          </Link>
        </div>

      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Reset Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setForgotModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {forgotError && (
              <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-md border border-red-200">
                {forgotError}
              </div>
            )}
            {forgotSuccess && (
              <div className="p-2.5 bg-emerald-50 text-emerald-800 text-xs rounded-md border border-emerald-200">
                {forgotSuccess}
              </div>
            )}

            {forgotStep === 1 ? (
              <form onSubmit={handleForgotSubmit} className="space-y-3">
                <p className="text-xs text-slate-600">
                  Enter your registered email address or phone number. We will provide a 6-digit verification code.
                </p>
                <div>
                  <input
                    type="text"
                    required
                    value={forgotTarget}
                    onChange={(e) => setForgotTarget(e.target.value)}
                    placeholder="you@domain.com or +919956257068"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setForgotModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" loading={forgotLoading}>
                    Send Reset Code
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetSubmit} className="space-y-3">
                <p className="text-xs text-slate-600">
                  Enter the 6-digit code and your new secure password.
                </p>
                {devResetOtp && (
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded text-[11px] text-blue-800 font-mono">
                    Development OTP: <strong>{devResetOtp}</strong>
                  </div>
                )}
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">6-Digit Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value)}
                    placeholder="123456"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600 font-mono tracking-widest text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setForgotStep(1)}>
                    Back
                  </Button>
                  <Button type="submit" variant="primary" size="sm" loading={forgotLoading}>
                    Update Password
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;

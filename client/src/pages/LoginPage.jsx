import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, ShieldCheck, Lock, Mail, ArrowRight, UserCheck } from 'lucide-react';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      redirectByRole(user.role);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const redirectByRole = (role) => {
    if (role === 'doctor') navigate('/doctor/dashboard');
    else if (role === 'organization') navigate('/organization/dashboard');
    else if (role === 'admin') navigate('/admin/dashboard');
    else navigate('/patient/dashboard');
  };

  const quickDemoLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
        
        {/* Header */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-md shadow-blue-500/20 mb-3">
            <Activity className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Sign in to SHAP</h2>
          <p className="text-xs text-slate-500 mt-1">Smart Healthcare Access & Emergency Coordination</p>
        </div>

        {/* Demo Fast Login Pills */}
        <div className="bg-blue-50/70 border border-blue-200/80 p-3.5 rounded-2xl space-y-2">
          <div className="flex items-center space-x-1.5 text-blue-900 text-xs font-bold">
            <UserCheck className="w-4 h-4 text-blue-600" />
            <span>Fast Evaluation Demo Logins (1-Click):</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => quickDemoLogin('patient@shap.com', 'password123')}
              className="px-2.5 py-1.5 bg-white hover:bg-blue-100/60 text-slate-800 font-semibold rounded-lg border border-slate-200 text-left transition-colors"
            >
              👤 Patient (Alex)
            </button>
            <button
              type="button"
              onClick={() => quickDemoLogin('sarah.jenkins@shap.com', 'password123')}
              className="px-2.5 py-1.5 bg-white hover:bg-blue-100/60 text-slate-800 font-semibold rounded-lg border border-slate-200 text-left transition-colors"
            >
              🩺 Doctor (Dr. Jenkins)
            </button>
            <button
              type="button"
              onClick={() => quickDemoLogin('apex@hospital.com', 'password123')}
              className="px-2.5 py-1.5 bg-white hover:bg-blue-100/60 text-slate-800 font-semibold rounded-lg border border-slate-200 text-left transition-colors"
            >
              🏥 Hospital (Apex Metro)
            </button>
            <button
              type="button"
              onClick={() => quickDemoLogin('admin@shap.com', 'password123')}
              className="px-2.5 py-1.5 bg-white hover:bg-blue-100/60 text-slate-800 font-semibold rounded-lg border border-slate-200 text-left transition-colors"
            >
              🛡️ System Admin
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100 text-xs text-slate-500">
          Don't have an account yet?{' '}
          <Link to="/register" className="font-bold text-blue-600 hover:text-blue-700">
            Create an Account
          </Link>
        </div>

      </div>
    </div>
  );
};


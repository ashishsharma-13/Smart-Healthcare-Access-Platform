import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, Lock, Mail, ArrowRight, UserCheck, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Toast } from '../components/ui/Toast';
import { Badge } from '../components/ui/Badge';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    if (role === 'doctor') navigate('/doctor/dashboard');
    else if (role === 'organization') navigate('/organization/dashboard');
    else if (role === 'admin') navigate('/admin/dashboard');
    else navigate('/patient/dashboard');
  };

  const quickDemoLogin = (demoIdentifier, demoPassword) => {
    setIdentifier(demoIdentifier);
    setPassword(demoPassword);
    setError('');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-7 sm:p-8 rounded-xl shadow-card border border-slate-200">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-11 h-11 rounded-lg bg-brand-950 text-white flex items-center justify-center mx-auto shadow-xs">
            <Activity className="w-6 h-6 text-brand-400 stroke-[2.25]" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Sign in to SHAP
          </h2>
          <p className="text-xs text-slate-500">
            Smart Healthcare Access & Parallel Emergency Dispatch
          </p>
        </div>

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
              Patient (Alex)
            </button>
            <button
              type="button"
              onClick={() => quickDemoLogin('sarah.jenkins@shap.com', 'password123')}
              className="p-2 bg-white hover:bg-brand-50 hover:border-brand-300 text-slate-800 font-medium rounded-md border border-slate-200 text-left transition-colors truncate"
            >
              Doctor (Dr. Jenkins)
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
            <label htmlFor="login-password" className="block text-xs font-medium text-slate-700 mb-1">
              Password
            </label>
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
    </div>
  );
};

export default LoginPage;

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Activity, ShieldAlert, LogOut, User, Calendar, PlusCircle, AlertCircle } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardRoute = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'doctor':
        return '/doctor/dashboard';
      case 'organization':
        return '/organization/dashboard';
      case 'admin':
        return '/admin/dashboard';
      default:
        return '/patient/dashboard';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center shadow-md shadow-blue-500/20 text-white">
              <Activity className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900">SHAP</span>
              <span className="hidden sm:inline-block ml-1.5 text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                Healthcare Access
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600">
            <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
            <Link to="/doctors" className="hover:text-blue-600 transition-colors">Find Doctors</Link>
            <Link to="/hospitals" className="hover:text-blue-600 transition-colors">Hospitals & Clinics</Link>
            {user && (
              <Link to={getDashboardRoute()} className="hover:text-blue-600 transition-colors">
                Portal
              </Link>
            )}
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center space-x-3">
            {/* Quick Emergency Beep Button */}
            <Link
              to="/emergency/activate"
              className="relative inline-flex items-center space-x-1.5 px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm shadow-red-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <ShieldAlert className="w-4 h-4 animate-pulse" />
              <span>Emergency Beep</span>
            </Link>

            {/* Auth actions */}
            {user ? (
              <div className="flex items-center space-x-3 pl-2 border-l border-slate-200">
                <Link
                  to={getDashboardRoute()}
                  className="flex items-center space-x-2 text-xs font-medium text-slate-700 hover:text-blue-600"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    {user.name.charAt(0)}
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className="text-xs font-semibold leading-tight text-slate-900">{user.name}</p>
                    <span className="text-[10px] uppercase font-bold text-blue-600">{user.role}</span>
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-sm font-semibold text-slate-700 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="hidden sm:inline-flex px-3.5 py-1.5 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};


import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import {
  Activity,
  LogOut,
  Menu,
  X,
  ShieldAlert,
  ChevronDown,
  User,
  Stethoscope,
  Building2,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { Badge } from '../ui/Badge';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const { toggleMobileSidebar } = useUI();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isDashboardRoute = location.pathname.startsWith('/patient') ||
    location.pathname.startsWith('/doctor') ||
    location.pathname.startsWith('/organization') ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/emergency');

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
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

  const roleLabels = {
    patient: 'Patient Access',
    doctor: 'Verified Practitioner',
    organization: 'Facility Command',
    admin: 'System Oversight',
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left: Brand Identity & Mobile Hamburger */}
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => {
                if (isDashboardRoute) {
                  toggleMobileSidebar();
                } else {
                  setMobileMenuOpen((prev) => !prev);
                }
              }}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
              aria-label={isDashboardRoute ? "Toggle portal navigation drawer" : "Toggle site navigation menu"}
            >
              {mobileMenuOpen && !isDashboardRoute ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-brand-950 flex items-center justify-center text-white shadow-xs group-hover:bg-brand-900 transition-colors">
                <Activity className="w-5 h-5 text-brand-400 stroke-[2.25]" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold text-slate-950 tracking-tight leading-none font-sans">
                    SHAP
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200/60 hidden sm:inline-block">
                    Clinical Network
                  </span>
                </div>
                <span className="text-[11px] font-medium text-slate-500 leading-tight hidden lg:block">
                  Smart Healthcare Access Platform
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-600">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-md transition-colors ${
                location.pathname === '/'
                  ? 'text-brand-700 font-semibold bg-brand-50/60'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Home
            </Link>
            <Link
              to="/doctors"
              className={`px-3 py-1.5 rounded-md transition-colors ${
                location.pathname === '/doctors'
                  ? 'text-brand-700 font-semibold bg-brand-50/60'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Find Doctors
            </Link>
            <Link
              to="/hospitals"
              className={`px-3 py-1.5 rounded-md transition-colors ${
                location.pathname === '/hospitals'
                  ? 'text-brand-700 font-semibold bg-brand-50/60'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Hospitals & Clinics
            </Link>
            {user && (
              <Link
                to={getDashboardRoute()}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  isDashboardRoute
                    ? 'text-brand-700 font-semibold bg-brand-50/60'
                    : 'hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Clinical Portal
              </Link>
            )}
          </nav>

          {/* Right: Emergency Beep Button & Auth Actions */}
          <div className="flex items-center gap-2.5">
            {/* Direct Emergency Access Button */}
            <Link
              to="/emergency/activate"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-urgent-700 bg-urgent-50 border border-urgent-200 hover:bg-urgent-100 hover:border-urgent-300 transition-colors shadow-xs"
              title="Activate Parallel Emergency Beep broadcast to nearest facilities"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-urgent-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-urgent-600" />
              </span>
              <span className="hidden sm:inline">Emergency Beep</span>
              <span className="sm:hidden font-bold">112</span>
            </Link>

            {/* Auth Actions */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <Link
                  to={getDashboardRoute()}
                  className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-semibold text-xs flex items-center justify-center">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className="text-xs font-semibold text-slate-900 leading-tight truncate max-w-[120px]">
                      {user.name}
                    </p>
                    <p className="text-[10px] font-medium text-slate-500 leading-none">
                      {roleLabels[user.role] || user.role}
                    </p>
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  title="Sign out of SHAP"
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors shadow-xs"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Dropdown for Public Routes */}
        {mobileMenuOpen && !isDashboardRoute && (
          <div className="md:hidden py-3 border-t border-slate-100 space-y-1">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
            >
              Home
            </Link>
            <Link
              to="/doctors"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
            >
              Find Doctors
            </Link>
            <Link
              to="/hospitals"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
            >
              Hospitals & Clinics Directory
            </Link>
            {user ? (
              <Link
                to={getDashboardRoute()}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 rounded-lg"
              >
                Access Portal ({roleLabels[user.role]})
              </Link>
            ) : (
              <div className="pt-2 border-t border-slate-100 flex gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-2 text-xs font-semibold text-white bg-brand-600 rounded-lg"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;

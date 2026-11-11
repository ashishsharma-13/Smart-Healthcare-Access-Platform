import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import {
  Plus,
  Bell,
  Menu,
  X,
  User,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const { toggleMobileSidebar } = useUI();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const isDashboardRoute =
    location.pathname.startsWith('/patient') ||
    location.pathname.startsWith('/doctor') ||
    location.pathname.startsWith('/organization') ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/emergency');

  const handleLogout = () => {
    logout();
    setProfileDropdownOpen(false);
    navigate('/login');
  };

  // Format today's date like "Mon, 09 Nov 2026"
  const formattedDate = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  // Generate breadcrumb from path
  const getBreadcrumb = () => {
    if (location.pathname.includes('/patient/dashboard')) return 'Overview';
    if (location.pathname.includes('/doctors')) return 'Find doctors';
    if (location.pathname.includes('/hospitals')) return 'Find hospitals';
    if (location.pathname.includes('/patient/appointments')) return 'Appointments';
    if (location.pathname.includes('/emergency/activate')) return 'Emergency Beep';
    if (location.pathname.includes('/patient/activity')) return 'Care activity';
    if (location.pathname.includes('/patient/profile')) return 'Settings & privacy';
    if (location.pathname.includes('/doctor')) return 'Doctor Portal';
    if (location.pathname.includes('/organization')) return 'Facility Portal';
    if (location.pathname.includes('/admin')) return 'Admin Portal';
    return 'Portal';
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="bg-white border-b border-slate-200/90 sticky top-0 z-40 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand Identity & Breadcrumb */}
          <div className="flex items-center space-x-3">
            {/* Mobile Sidebar Hamburger (on dashboard routes) */}
            {isDashboardRoute && (
              <button
                onClick={toggleMobileSidebar}
                className="lg:hidden p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
                aria-label="Toggle navigation drawer"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {/* Brand Logo strictly per Reference Image 2 */}
            <Link to="/" className="flex items-center space-x-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-[#0B4F9C] flex items-center justify-center text-white shadow-xs group-hover:bg-blue-800 transition-colors">
                <Plus className="w-5 h-5 stroke-[3]" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-black text-slate-900 tracking-tight leading-none">
                  SHAP
                </span>
                <span className="text-[8.5px] font-bold text-slate-400 tracking-widest uppercase mt-0.5">
                  CONNECTED CARE, CLEARER ACCESS.
                </span>
              </div>
            </Link>

            {/* Portal Breadcrumb */}
            {isDashboardRoute && user && (
              <div className="hidden md:flex items-center pl-4 ml-3 border-l border-slate-200 text-xs text-slate-500 font-medium space-x-1.5">
                <span className="capitalize">{user.role} portal</span>
                <span>/</span>
                <span className="text-slate-900 font-bold">{getBreadcrumb()}</span>
              </div>
            )}
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
              to="/map"
              className={`px-3 py-1.5 rounded-md transition-colors ${
                location.pathname === '/map'
                  ? 'text-brand-700 font-semibold bg-brand-50/60'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Healthcare Map
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

          {/* Right: Emergency Beep Button, Date, Notifications & User Avatar Pill */}
          <div className="flex items-center space-x-3">
            {/* Top-Level Emergency Beep Button */}
            <Link
              to="/emergency/activate"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl text-white bg-red-600 hover:bg-red-700 transition-all shadow-xs"
              title="Activate Emergency Beep broadcast to nearest facilities"
            >
              <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
              <span>Emergency Beep</span>
            </Link>

            {/* Date Display */}
            <div className="hidden lg:block text-xs font-medium text-slate-500">
              {formattedDate}
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition relative cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 space-y-2 z-50 animate-fade-in text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 font-bold text-slate-900">
                    <span>Notifications</span>
                    <span className="text-[10px] text-blue-600 font-bold">Mark all read</span>
                  </div>
                  <div className="space-y-2 py-1">
                    <div className="p-2 rounded-xl bg-blue-50/60 border border-blue-100/60 space-y-0.5">
                      <p className="font-bold text-slate-900 text-[11px]">Appointment Confirmed</p>
                      <p className="text-[10px] text-slate-500">Dr. Mira Patel has confirmed your consultation.</p>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 space-y-0.5">
                      <p className="font-bold text-slate-800 text-[11px]">Profile Health</p>
                      <p className="text-[10px] text-slate-500">Review and update clinical allergy records.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Pill strictly per Reference Image 2 */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center space-x-2.5 p-1 pr-2 rounded-full hover:bg-slate-50 transition cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-[#EBF3FE] text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200/60">
                    {getInitials(user.name)}
                  </div>
                  <div className="text-left hidden md:block">
                    <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[120px]">
                      {user.name}
                    </div>
                    <div className="text-[10px] text-slate-400 capitalize leading-tight">
                      {user.role === 'patient' ? 'Personal account' : `${user.role} account`}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
                </button>

                {/* Dropdown Menu */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-fade-in text-xs">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="font-bold text-slate-900 truncate">{user.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{user.email || user.phone}</p>
                    </div>

                    <Link
                      to="/patient/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center space-x-2 px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>Manage Profile</span>
                    </Link>

                    <Link
                      to="/patient/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center space-x-2 px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>Settings & Privacy</span>
                    </Link>

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 font-bold text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 text-xs font-bold bg-[#0B4F9C] text-white rounded-xl hover:bg-blue-800 shadow-xs"
                >
                  Create Account
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
              to="/map"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
            >
              Healthcare Map
            </Link>
            <Link
              to="/hospitals"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
            >
              Hospitals & Clinics Directory
            </Link>
            <Link
              to="/emergency/activate"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg"
            >
              Emergency Beep
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

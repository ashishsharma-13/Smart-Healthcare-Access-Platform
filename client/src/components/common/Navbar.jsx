import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { useSocket } from '../../context/SocketContext';
import {
  Plus,
  Bell,
  Menu,
  X,
  User,
  Settings,
  LogOut,
  ChevronDown,
  ShieldAlert,
} from 'lucide-react';

const ROLE_NOTIFICATIONS = {
  patient: [
    {
      id: 'p1',
      title: 'Appointment Confirmed',
      message: 'Dr. Mira Patel has confirmed your in-person consultation for tomorrow at 10:30 AM.',
      time: '15m ago',
      unread: true,
      link: '/patient/appointments',
    },
    {
      id: 'p2',
      title: 'Pre-visit Checklist',
      message: 'Please remember to bring photo ID and previous ECG reports to Riverside Medical Center.',
      time: '2h ago',
      unread: true,
      link: '/patient/appointments',
    },
    {
      id: 'p3',
      title: 'Care Summary Ready',
      message: 'Riverside Cardiology published an updated clinical care summary for your records.',
      time: '1d ago',
      unread: false,
      link: '/patient/activity',
    },
  ],
  doctor: [
    {
      id: 'd1',
      title: 'Next Patient: Avery James',
      message: 'Scheduled at 2:30 PM (In-person, Room C-02) for Initial Cardiology Consultation.',
      time: '10m ago',
      unread: true,
      link: '/doctor/appointments',
    },
    {
      id: 'd2',
      title: 'Reschedule Review Requested',
      message: 'Elena Carter requested a routine reschedule for Tue, 10 Nov · 2:30 PM.',
      time: '1h ago',
      unread: true,
      link: '/doctor/schedule',
    },
    {
      id: 'd3',
      title: 'Facility Privileges Confirmed',
      message: 'Riverside Medical Center approved your cardiology clinical affiliations.',
      time: '2d ago',
      unread: false,
      link: '/doctor/affiliations',
    },
  ],
  organization: [
    {
      id: 'o1',
      title: 'Critical Bed Capacity',
      message: 'Monitored bed availability reported at 3 beds remaining in Cardiology Wing.',
      time: '5m ago',
      unread: true,
      link: '/organization/resources',
    },
    {
      id: 'o2',
      title: 'Doctor QR Presence Verified',
      message: 'Dr. Mira Patel scanned badge QR at Main Reception / Cardiology Wing.',
      time: '35m ago',
      unread: true,
      link: '/organization/doctors',
    },
    {
      id: 'o3',
      title: 'Emergency Beep Network Active',
      message: 'Facility listening on 10 km regional perimeter dispatch channel.',
      time: '2h ago',
      unread: false,
      link: '/organization/dashboard',
    },
  ],
  admin: [
    {
      id: 'a1',
      title: 'Practitioner Credentials Pending',
      message: '2 doctor medical licenses awaiting state medical council verification.',
      time: '20m ago',
      unread: true,
      link: '/admin/dashboard',
    },
    {
      id: 'a2',
      title: 'Accreditation Renewal Submitted',
      message: 'Lakeside Specialty Clinic submitted clinical renewal compliance docs.',
      time: '2h ago',
      unread: true,
      link: '/admin/dashboard',
    },
    {
      id: 'a3',
      title: 'Audit Stream Operational',
      message: 'All real-time Socket.io and emergency dispatch nodes verified healthy.',
      time: '1d ago',
      unread: false,
      link: '/admin/dashboard',
    },
  ],
};

export const Navbar = () => {
  const { user, logout } = useAuth();
  const { toggleMobileSidebar } = useUI();
  const socketContext = useSocket();
  const incomingEmergency = socketContext?.incomingEmergency || null;
  const navigate = useNavigate();
  const location = useLocation();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const notificationsRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    if (user?.role && ROLE_NOTIFICATIONS[user.role]) {
      setNotifications(ROLE_NOTIFICATIONS[user.role]);
    } else {
      setNotifications(ROLE_NOTIFICATIONS.patient);
    }
  }, [user?.role]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;
  const hasUnread = unreadCount > 0 || !!incomingEmergency;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const handleNotificationClick = (item) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n))
    );
    setNotificationsOpen(false);
    if (item.link) {
      navigate(item.link);
    }
  };

  const roleLabels = {
    patient: 'Patient Portal',
    doctor: 'Doctor Portal',
    organization: 'Hospital Portal',
    admin: 'Administrator',
  };

  const getDashboardRoute = () => {
    if (user?.role === 'doctor') return '/doctor/dashboard';
    if (user?.role === 'organization') return '/organization/dashboard';
    if (user?.role === 'admin') return '/admin/dashboard';
    return '/patient/dashboard';
  };

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

  // Format today's date like "Mon, 09 Nov 2026" / "Wed, 11 Nov 2026"
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
    if (location.pathname.includes('/map')) return 'Healthcare map';
    if (location.pathname.includes('/patient/appointments')) return 'Appointments';
    if (location.pathname.includes('/emergency/activate')) return 'Emergency Beep';
    if (location.pathname.includes('/patient/activity')) return 'Care activity';
    if (location.pathname.includes('/patient/profile')) return 'Settings & privacy';
    if (location.pathname.includes('/doctor/dashboard')) return 'Overview';
    if (location.pathname.includes('/doctor/schedule')) return 'Schedule';
    if (location.pathname.includes('/doctor/appointments')) return 'Appointments';
    if (location.pathname.includes('/doctor/availability')) return 'Availability';
    if (location.pathname.includes('/doctor/profile')) return 'Profile';
    if (location.pathname.includes('/doctor/presence')) return 'Presence & Badge';
    if (location.pathname.includes('/doctor/affiliations')) return 'Affiliations';
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

            {/* Mobile Menu Toggle (on public routes) */}
            {!isDashboardRoute && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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

          {/* Right: Date, Notifications & User Avatar Pill strictly per Reference Designs */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* Date Display (Only visible after login) */}
                <div className="hidden sm:block text-xs font-medium text-slate-500">
                  {formattedDate}
                </div>

                {/* Notification Bell (Only visible after login with role-specific notifications) */}
                <div className="relative" ref={notificationsRef}>
                  <button
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition relative cursor-pointer"
                    aria-label="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {hasUnread && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
                    )}
                  </button>

                  {/* Notification Dropdown */}
                  {notificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 space-y-2.5 z-50 animate-fade-in text-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 font-bold text-slate-900">
                        <div className="flex items-center space-x-1.5">
                          <span>Notifications</span>
                          {unreadCount > 0 && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 ? (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-[10px] text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                          >
                            Mark all read
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-normal">All caught up</span>
                        )}
                      </div>

                      {/* Live Emergency socket alert if any */}
                      {incomingEmergency && (
                        <div
                          onClick={() => {
                            setNotificationsOpen(false);
                            navigate(
                              user?.role === 'organization' ? '/organization/dashboard' : '/map'
                            );
                          }}
                          className="p-2.5 rounded-xl border border-red-200 bg-red-50/90 text-red-900 cursor-pointer hover:bg-red-100/80 transition"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-black text-[10px] uppercase tracking-wider text-red-600 flex items-center gap-1">
                              <ShieldAlert className="w-3.5 h-3.5" /> Emergency Beep
                            </span>
                            <span className="text-[9.5px] text-red-500 font-bold">Live Alert</span>
                          </div>
                          <p className="text-[10.5px] font-semibold text-red-800 mt-1">
                            Incoming dispatch broadcast in your regional coverage zone.
                          </p>
                        </div>
                      )}

                      <div className="space-y-2 py-0.5 max-h-80 overflow-y-auto">
                        {notifications.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleNotificationClick(item)}
                            className={`p-2.5 rounded-xl border transition cursor-pointer ${
                              item.unread
                                ? 'bg-blue-50/60 border-blue-100/70 hover:bg-blue-50'
                                : 'bg-slate-50/60 border-slate-100 hover:bg-slate-100/70'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-bold text-slate-900 text-[11px] leading-snug">
                                {item.title}
                              </p>
                              <span className="text-[9.5px] text-slate-400 whitespace-nowrap mt-0.5">
                                {item.time}
                              </span>
                            </div>
                            <p className="text-[10.5px] text-slate-600 mt-1 leading-relaxed">
                              {item.message}
                            </p>
                            {item.unread && (
                              <div className="flex items-center justify-end mt-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Profile Pill strictly per Reference Image 2 */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center space-x-2.5 p-1 pr-2 rounded-full hover:bg-slate-50 transition cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#EBF3FE] text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200/60">
                      {getInitials(user.name)}
                    </div>
                    <div className="text-left hidden md:block">
                      <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[120px]">
                        {user.role === 'doctor' && !user.name.startsWith('Dr.') ? `Dr. ${user.name}` : user.name}
                      </div>
                      <div className="text-[10px] text-slate-400 capitalize leading-tight">
                        {user.role === 'patient'
                          ? 'Personal account'
                          : user.role === 'doctor'
                          ? 'Cardiology'
                          : `${user.role} account`}
                      </div>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
                  </button>

                  {/* Dropdown Menu */}
                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-fade-in text-xs">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="font-bold text-slate-900 truncate">
                          {user.role === 'doctor' && !user.name.startsWith('Dr.') ? `Dr. ${user.name}` : user.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{user.email || user.phone}</p>
                      </div>

                      <Link
                        to={user.role === 'doctor' ? '/doctor/profile' : '/patient/profile'}
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center space-x-2 px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                      >
                        <User className="w-4 h-4 text-slate-400" />
                        <span>Manage Profile</span>
                      </Link>

                      <Link
                        to={user.role === 'doctor' ? '/doctor/profile' : '/patient/profile'}
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
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/"
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-colors ${
                    location.pathname === '/'
                      ? 'text-[#0B4F9C] bg-blue-50 font-bold'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Home
                </Link>
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
          <div className="md:hidden py-3 border-t border-slate-100 space-y-2">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl"
            >
              Home
            </Link>
            <div className="flex gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-xl"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2 text-xs font-semibold text-white bg-[#0B4F9C] rounded-xl"
              >
                Create Account
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;

import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import {
  LayoutGrid,
  Search,
  Stethoscope,
  Building2,
  Calendar,
  Siren,
  ClipboardList,
  MessageCircle,
  ChevronDown,
  LayoutDashboard,
  Clock,
  QrCode,
  Users,
  BedDouble,
  FileCheck,
  Activity,
  X,
  ChevronRight,
  ShieldCheck,
  MapPin,
  Ambulance,
} from 'lucide-react';
import { HelpCenterModal } from './HelpCenterModal';

export const Sidebar = () => {
  const { user, profile } = useAuth();
  const { mobileSidebarOpen, closeMobileSidebar } = useUI();
  const location = useLocation();
  const [helpOpen, setHelpOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    closeMobileSidebar();
  }, [location.pathname]);

  // Handle ESC key to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeMobileSidebar();
    };
    if (mobileSidebarOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileSidebarOpen]);

  if (!user) return null;

  // 1. Patient Portal Sidebar
  const patientNavContent = (
    <div className="flex flex-col h-full justify-between p-4 space-y-6 select-none">
      <div className="space-y-5">
        {/* Workspace Dropdown */}
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 px-1">
            WORKSPACE
          </span>
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200/90 bg-white shadow-2xs text-slate-900 font-semibold text-xs">
            <span>Patient portal</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        {/* Primary Patient Links */}
        <div className="space-y-0.5">
          {/* 1. Overview */}
          <NavLink
            to="/patient/dashboard"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-lg text-xs transition-all ${
                isActive
                  ? 'bg-brand-50 text-brand-700 font-bold border-l-2 border-brand-600 rounded-l-none'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
              }`
            }
          >
            <LayoutGrid className="w-4 h-4 shrink-0" />
            <span>Overview</span>
          </NavLink>

          {/* Search & Discover */}
          <NavLink
            to="/search"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-lg text-xs transition-all ${
                isActive
                  ? 'bg-brand-50 text-brand-700 font-bold border-l-2 border-brand-600 rounded-l-none'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
              }`
            }
          >
            <Search className="w-4 h-4 shrink-0" />
            <span>Search & Discover</span>
          </NavLink>

          {/* 2. Find doctors */}
          <NavLink
            to="/doctors"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-lg text-xs transition-all ${
                isActive
                  ? 'bg-brand-50 text-brand-700 font-bold border-l-2 border-brand-600 rounded-l-none'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
              }`
            }
          >
            <Stethoscope className="w-4 h-4 shrink-0" />
            <span>Find doctors</span>
          </NavLink>

          {/* 3. Find hospitals */}
          <NavLink
            to="/hospitals"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-lg text-xs transition-all ${
                isActive
                  ? 'bg-brand-50 text-brand-700 font-bold border-l-2 border-brand-600 rounded-l-none'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
              }`
            }
          >
            <Building2 className="w-4 h-4 shrink-0" />
            <span>Find hospitals</span>
          </NavLink>

          {/* 4. Healthcare map */}
          <NavLink
            to="/map"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-lg text-xs transition-all ${
                isActive
                  ? 'bg-brand-50 text-brand-700 font-bold border-l-2 border-brand-600 rounded-l-none'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
              }`
            }
          >
            <MapPin className="w-4 h-4 shrink-0" />
            <span>Healthcare map</span>
          </NavLink>

          {/* 5. Appointments */}
          <NavLink
            to="/patient/appointments"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-lg text-xs transition-all ${
                isActive
                  ? 'bg-brand-50 text-brand-700 font-bold border-l-2 border-brand-600 rounded-l-none'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
              }`
            }
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span>Appointments</span>
          </NavLink>

          {/* 6. Emergency Beep */}
          <NavLink
            to="/emergency/activate"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-lg text-xs transition-all ${
                isActive
                  ? 'bg-urgent-50 text-urgent-700 font-bold border-l-2 border-urgent-600 rounded-l-none'
                  : 'text-slate-600 hover:text-urgent-700 hover:bg-urgent-50/50 font-medium'
              }`
            }
          >
            <Siren className="w-4 h-4 text-urgent-600 shrink-0" />
            <span>Emergency Beep</span>
          </NavLink>

          {/* 7. Care activity */}
          <NavLink
            to="/patient/activity"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-lg text-xs transition-all ${
                isActive
                  ? 'bg-brand-50 text-brand-700 font-bold border-l-2 border-brand-600 rounded-l-none'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
              }`
            }
          >
            <ClipboardList className="w-4 h-4 shrink-0" />
            <span>Care activity</span>
          </NavLink>
        </div>
      </div>

      {/* Support Callout Box */}
      <div className="space-y-3">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1.5">
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-4 h-4 text-brand-600" />
            <h4 className="text-xs font-bold text-slate-900">Here to help</h4>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Find answers, clinical protocols, and platform support.
          </p>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="text-[11px] font-bold text-brand-600 hover:underline flex items-center space-x-1 cursor-pointer pt-0.5"
          >
            <span>Visit help center</span>
            <span>&rarr;</span>
          </button>
        </div>
      </div>
    </div>
  );

  // 2. Doctor Portal Sidebar (Strictly matches Doctor reference image)
  const doctorNavContent = (
    <div className="flex flex-col h-full justify-between p-4 space-y-6 select-none">
      <div className="space-y-5">
        {/* Workspace Dropdown */}
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 px-1">
            WORKSPACE
          </span>
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200/90 bg-white shadow-2xs text-slate-900 font-semibold text-xs">
            <span>Doctor portal</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        {/* Primary Doctor Links */}
        <div className="space-y-0.5">
          {/* 1. Overview */}
          <NavLink
            to="/doctor/dashboard"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-lg text-xs transition-all ${
                isActive
                  ? 'bg-brand-50 text-brand-700 font-bold border-l-2 border-brand-600 rounded-l-none'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
              }`
            }
          >
            <LayoutGrid className="w-4 h-4 shrink-0" />
            <span>Overview</span>
          </NavLink>

          {/* 2. Schedule */}
          <NavLink
            to="/doctor/schedule"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-lg text-xs transition-all ${
                isActive
                  ? 'bg-brand-50 text-brand-700 font-bold border-l-2 border-brand-600 rounded-l-none'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
              }`
            }
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span>Schedule</span>
          </NavLink>

          {/* 3. Appointments */}
          <NavLink
            to="/doctor/appointments"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-lg text-xs transition-all ${
                isActive
                  ? 'bg-brand-50 text-brand-700 font-bold border-l-2 border-brand-600 rounded-l-none'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
              }`
            }
          >
            <ClipboardList className="w-4 h-4 shrink-0" />
            <span>Appointments</span>
          </NavLink>

          {/* 4. Availability */}
          <NavLink
            to="/doctor/availability"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-lg text-xs transition-all ${
                isActive
                  ? 'bg-brand-50 text-brand-700 font-bold border-l-2 border-brand-600 rounded-l-none'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
              }`
            }
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span>Availability</span>
          </NavLink>
        </div>

        {/* Facility & Affiliations strictly per media_1794416780094_69267bc6.png */}
        <div className="pt-3 border-t border-slate-100 space-y-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 px-3">
            FACILITY & AFFILIATIONS
          </span>
          <NavLink
            to="/doctor/affiliations"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-lg text-xs transition-all ${
                isActive
                  ? 'bg-brand-50 text-brand-700 font-bold border-l-2 border-brand-600 rounded-l-none'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
              }`
            }
          >
            <Building2 className="w-4 h-4 shrink-0 text-slate-500" />
            <span>Manage Affiliations</span>
          </NavLink>

          <NavLink
            to="/doctor/presence"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-lg text-xs transition-all ${
                isActive
                  ? 'bg-brand-50 text-brand-700 font-bold border-l-2 border-brand-600 rounded-l-none'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
              }`
            }
          >
            <QrCode className="w-4 h-4 shrink-0 text-slate-500" />
            <span>QR Presence & Badge</span>
          </NavLink>
        </div>
      </div>

      {/* Support Callout Box */}
      <div className="space-y-3">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1.5">
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-4 h-4 text-brand-600" />
            <h4 className="text-xs font-bold text-slate-900">Here to help</h4>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Find answers, clinical protocols, and platform support.
          </p>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="text-[11px] font-bold text-brand-600 hover:underline flex items-center space-x-1 cursor-pointer pt-0.5"
          >
            <span>Visit help center</span>
            <span>&rarr;</span>
          </button>
        </div>
      </div>
    </div>
  );

  // 3. Organization / Admin Nav Content
  const doctorSections = [
    {
      title: 'Practitioner Desk',
      links: [
        { to: '/doctor/dashboard', label: 'Doctor Portal', icon: LayoutDashboard },
        { to: '/doctor/schedule', label: 'Schedule & Slots', icon: Clock },
      ],
    },
    {
      title: 'Facility & Affiliations',
      links: [
        { to: '/doctor/affiliations', label: 'Manage Affiliations', icon: Building2 },
        { to: '/doctor/presence', label: 'QR Presence & Badge', icon: QrCode },
      ],
    },
  ];

  const orgSections = [
    {
      title: 'Hospital Command',
      links: [
        { to: '/organization/dashboard', label: 'Emergency Reception', icon: Siren },
        { to: '/organization/resources', label: 'Bed & ICU Capacity', icon: BedDouble },
      ],
    },
    {
      title: 'Facility Management',
      links: [
        { to: '/organization/doctors', label: 'Manage Doctors', icon: Users },
        { to: '/organization/qr-code', label: 'Facility QR Code', icon: QrCode },
        { to: '/organization/profile', label: 'Facility Profile', icon: Building2 },
      ],
    },
  ];

  const adminSections = [
    {
      title: 'Governance Oversight',
      links: [
        { to: '/admin/dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
        { to: '/admin/emergencies', label: 'Emergency Audit Stream', icon: Activity },
      ],
    },
    {
      title: 'Verification Queues',
      links: [
        { to: '/admin/doctors', label: 'Doctor License Verification', icon: FileCheck },
        { to: '/admin/organizations', label: 'Hospital Verification', icon: Building2 },
      ],
    },
  ];

  let otherSections = doctorSections;
  if (user.role === 'organization') otherSections = orgSections;
  else if (user.role === 'admin') otherSections = adminSections;

  const defaultNavContent = (
    <div className="flex flex-col h-full justify-between p-4 space-y-6">
      <div className="space-y-6">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
          <h4 className="text-xs font-semibold text-slate-900 truncate">{user.name}</h4>
          <p className="text-[11px] text-slate-500 truncate">{user.email || user.phone}</p>
        </div>

        <div className="space-y-5">
          {otherSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.links.map((link) => {
                  const Icon = link.icon;
                  return (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className={({ isActive }) =>
                        `flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          isActive
                            ? 'bg-brand-50 text-brand-700 font-bold border-l-2 border-brand-600 rounded-l-none'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4" />
                      <span>{link.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  let activeContent = defaultNavContent;
  if (user.role === 'patient') activeContent = patientNavContent;
  else if (user.role === 'doctor') activeContent = doctorNavContent;

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col flex-shrink-0 min-h-[calc(100vh-4rem)]">
        {activeContent}
      </aside>

      {/* Mobile Slide-over Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={closeMobileSidebar}
            aria-hidden="true"
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-xl z-10 animate-slide-right">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Navigation</span>
              <button
                type="button"
                onClick={closeMobileSidebar}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{activeContent}</div>
          </div>
        </div>
      )}

      {/* Help Center Modal */}
      <HelpCenterModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
};

export default Sidebar;

import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import {
  LayoutGrid,
  Stethoscope,
  Building2,
  Calendar,
  Siren,
  ClipboardList,
  MessageCircle,
  Settings,
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
          <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 bg-white shadow-xs text-slate-900 font-bold text-xs">
            <span>Patient portal</span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        {/* Primary Patient Links */}
        <div className="space-y-1">
          {/* 1. Patient Overview */}
          <NavLink
            to="/patient/dashboard"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs transition-all ${
                isActive
                  ? 'bg-[#EBF3FE] text-blue-600 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
              }`
            }
          >
            <LayoutGrid className="w-4 h-4 shrink-0" />
            <span>Patient Overview</span>
          </NavLink>

          {/* 2. Healthcare Map */}
          <NavLink
            to="/map"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs transition-all ${
                isActive
                  ? 'bg-[#EBF3FE] text-blue-600 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
              }`
            }
          >
            <MapPin className="w-4 h-4 shrink-0 text-blue-600" />
            <span>Healthcare Map</span>
          </NavLink>

          {/* 3. Find Verified Doctors */}
          <NavLink
            to="/doctors"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs transition-all ${
                isActive
                  ? 'bg-[#EBF3FE] text-blue-600 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
              }`
            }
          >
            <Stethoscope className="w-4 h-4 shrink-0" />
            <span>Find Verified Doctors</span>
          </NavLink>

          {/* 4. Hospitals & Clinics */}
          <NavLink
            to="/hospitals"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs transition-all ${
                isActive
                  ? 'bg-[#EBF3FE] text-blue-600 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
              }`
            }
          >
            <Building2 className="w-4 h-4 shrink-0" />
            <span>Hospitals & Clinics</span>
          </NavLink>

          {/* 5. My Appointments */}
          <NavLink
            to="/patient/appointments"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs transition-all ${
                isActive
                  ? 'bg-[#EBF3FE] text-blue-600 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
              }`
            }
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span>My Appointments</span>
          </NavLink>

          {/* 6. Care Activity */}
          <NavLink
            to="/patient/care-activity"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs transition-all ${
                isActive
                  ? 'bg-[#EBF3FE] text-blue-600 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
              }`
            }
          >
            <ClipboardList className="w-4 h-4 shrink-0" />
            <span>Care Activity</span>
          </NavLink>

          {/* 7. Emergency Beep (Prominent Protocol) */}
          <NavLink
            to="/emergency/activate"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs transition-all ${
                isActive
                  ? 'bg-rose-50 text-rose-600 font-bold'
                  : 'text-slate-600 hover:text-rose-600 hover:bg-rose-50/60 font-medium'
              }`
            }
          >
            <Siren className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="font-bold text-rose-600">Emergency Beep</span>
          </NavLink>

          {/* 8. Emergency Logs */}
          <NavLink
            to="/emergency/history"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs transition-all ${
                isActive
                  ? 'bg-[#EBF3FE] text-blue-600 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
              }`
            }
          >
            <Activity className="w-4 h-4 shrink-0" />
            <span>Emergency Logs</span>
          </NavLink>
        </div>
      </div>

      {/* Support Callout Box */}
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-[#F0F6FE] border border-blue-100/70 space-y-2">
          <MessageCircle className="w-5 h-5 text-blue-600" />
          <h4 className="text-xs font-bold text-slate-900">Here to help</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Find answers and support for using SHAP.
          </p>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="text-[11px] font-bold text-blue-600 hover:underline flex items-center space-x-1 cursor-pointer pt-0.5"
          >
            <span>Visit help center</span>
            <span>&rarr;</span>
          </button>
        </div>

        {/* Bottom Settings Link */}
        <div className="pt-2 border-t border-slate-100">
          <NavLink
            to="/patient/profile"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs transition-all ${
                isActive
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
              }`
            }
          >
            <Settings className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Settings & privacy</span>
          </NavLink>
        </div>
      </div>
    </div>
  );

  // 2. Doctor / Organization / Admin Nav Content
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
                        `flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 font-bold'
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

  const activeContent = user.role === 'patient' ? patientNavContent : defaultNavContent;

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
